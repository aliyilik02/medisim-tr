# -*- coding: utf-8 -*-
"""Bake edilmis MetaHuman yuz animi -> ARKit-52 sekil anahtarli tek iskeletli GLB (adim 3/3).

Amac:
  mh_bake_arkit.py + mh_export_gltf.py ciktilarini alir; her ARKit karesinde (kemik pozu +
  RigLogic morph agirliklari) LOD0 yuzunu degerlendirip deforme olmus sonucu bir sekil anahtari
  olarak kaydeder, istenirse hedef LOD'a (web topolojisi) yuzeyden aktarir, yuz eklemlerini
  siler (agirliklari en yakin korunan ataya, genelde `head`), govde iskeletine baglar, GLB yazar.

Girdi:
  --face-baked   <name>_face_baked.glb   (LOD0: deri + MetaHuman morph'lari + bake animasyonu)
  --frames-json  <name>_arkit_frames.json (kare etiketleri + kare basina morph agirliklari)
  --morph-order  <name>_face_morph_order.json (glTF target indeksi -> UE morph adi)
  --face-target  <name>_face_lod1.glb    (opsiyonel; yoksa LOD0 kullanilir)
  --body         <name>_body.glb         (opsiyonel; govde + govde iskeleti)
  --out          cikti .glb
  --drop         dusurulecek malzeme anahtarlari (varsayilan: eyeocclusion,lacrimal)
  --save-blend   opsiyonel .blend (hata ayiklama)
Cikti:
  --out GLB (52 ARKit morph, tek armature) + yaninda <out>.report.json (olcumler)

Calistirma:
  "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P scripts/ue/blender/arkit_from_baked_anim.py -- \
     --face-baked X_face_baked.glb --frames-json X_arkit_frames.json --morph-order X_face_morph_order.json \
     --face-target X_face_lod1.glb --body X_body.glb --out X_arkit_raw.glb
"""
import argparse
import json
import os
import re
import sys
import time

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree

T0 = time.time()


def log(*a):
    print("[arkit %6.1fs]" % (time.time() - T0), *a, flush=True)


def parse_args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--face-baked", required=True)
    ap.add_argument("--frames-json", required=True)
    ap.add_argument("--morph-order", required=True)
    ap.add_argument("--face-target")
    ap.add_argument("--body")
    ap.add_argument("--out", required=True)
    ap.add_argument("--drop", default="eyeocclusion,lacrimal")
    ap.add_argument("--save-blend")
    ap.add_argument("--normal-dot", type=float, default=0.3, help="aktarimda kaynak yuz normali ile hedef normal uyumu esigi")
    return ap.parse_args(argv)


# ---------------------------------------------------------------- yardimcilar

def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path, import_shading="NORMALS", guess_original_bind_pose=True,
                              bone_heuristic="TEMPERANCE")
    new = [o for o in bpy.data.objects if o not in before]
    arm = [o for o in new if o.type == "ARMATURE"]
    meshes = [o for o in new if o.type == "MESH"]
    return new, (arm[0] if arm else None), meshes


def material_class(name):
    """UE malzeme adi -> bolum sinifi (LOD'lar arasi eslesme icin)."""
    n = name.lower()
    for key, cls in (("eyeocclusion", "eyeocclusion"), ("lacrimal", "lacrimal"), ("eyerefractive_inst_l", "eyeL"),
                     ("eyerefractive_inst_r", "eyeR"), ("eyelash", "lashes"), ("teeth", "teeth"),
                     ("cartilage", "cartilage"), ("head", "head")):
        if key in n:
            return cls
    return n


def poly_classes(me):
    mats = [material_class(m.name if m else "") for m in me.materials]
    pc = np.zeros(len(me.polygons), dtype=np.int32)
    me.polygons.foreach_get("material_index", pc)
    return [mats[i] for i in pc], mats


def vertex_classes(me):
    pcls, _ = poly_classes(me)
    vc = [None] * len(me.vertices)
    for p, c in zip(me.polygons, pcls):
        for v in p.vertices:
            vc[v] = c
    return vc


def coords(me):
    a = np.empty(len(me.vertices) * 3, dtype=np.float64)
    me.vertices.foreach_get("co", a)
    return a.reshape(-1, 3)


def keyframe_times(arm):
    ad = arm.animation_data
    act = ad.action if ad else None
    if act is None and ad and ad.nla_tracks:
        act = ad.nla_tracks[0].strips[0].action
        ad.action = act
    if act is None:
        raise RuntimeError("armature'da animasyon yok")
    if ad.action_slot is None and len(act.slots):
        ad.action_slot = act.slots[0]
    for t in ad.nla_tracks:
        t.mute = True
    xs = set()
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in cb.fcurves[:60]:
                    xs.update(round(k.co.x, 3) for k in fc.keyframe_points)
    return sorted(xs), act


def evaluate(ob):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    c = coords(me)
    ev.to_mesh_clear()
    return c


def ancestors_map(arm, keep):
    """Silinecek her kemik -> en yakin korunan ata."""
    out = {}
    for b in arm.data.bones:
        if b.name in keep:
            continue
        p = b.parent
        while p is not None and p.name not in keep:
            p = p.parent
        out[b.name] = p.name if p else None
    return out


def remap_weights(ob, arm, keep):
    """Korunmayan eklem gruplarinin agirligini korunan ataya tasir, grubu siler."""
    amap = ancestors_map(arm, keep)
    groups = {g.index: g.name for g in ob.vertex_groups}
    nv = len(ob.data.vertices)
    acc = {}
    for v in ob.data.vertices:
        for ge in v.groups:
            gname = groups[ge.group]
            tgt = gname if gname in keep else amap.get(gname)
            if tgt is None:
                tgt = "head"
            acc.setdefault(tgt, np.zeros(nv))[v.index] += ge.weight
    for g in list(ob.vertex_groups):
        ob.vertex_groups.remove(g)
    total = np.zeros(nv)
    for w in acc.values():
        total += w
    total[total == 0] = 1.0
    for name, w in acc.items():
        g = ob.vertex_groups.new(name=name)
        w = w / total
        for i in np.nonzero(w > 1e-4)[0]:
            g.add([int(i)], float(w[i]), "REPLACE")
    return sorted(acc), amap


# ---------------------------------------------------------------- ana akis

def main():
    a = parse_args()
    report = {"inputs": vars(a)}
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.context.scene.render.fps = 30
    frames = json.load(open(a.frames_json, encoding="utf-8"))
    order = json.load(open(a.morph_order, encoding="utf-8"))["morph_targets"]
    labels = frames["frame_labels"]
    arkit = frames["arkit_52"]

    # 1) kaynak (LOD0) yuz + bake animi
    t = time.time()
    _, src_arm, src_meshes = import_glb(a.face_baked)
    src = max(src_meshes, key=lambda o: len(o.data.vertices))
    keys = src.data.shape_keys.key_blocks if src.data.shape_keys else []
    log("kaynak import: %d kose, %d sekil anahtari, %d kemik (%.1fs)" % (
        len(src.data.vertices), max(0, len(keys) - 1), len(src_arm.data.bones), time.time() - t))
    report["source"] = {"verts": len(src.data.vertices), "tris": sum(len(p.vertices) - 2 for p in src.data.polygons),
                        "shape_keys": max(0, len(keys) - 1), "bones": len(src_arm.data.bones), "import_s": round(time.time() - t, 1)}
    if len(keys) - 1 != len(order):
        raise RuntimeError("glTF target sayisi (%d) != UE morph sayisi (%d): ad eslemesi guvenilmez" % (len(keys) - 1, len(order)))
    kmap = {}
    for i, kb in enumerate(list(keys)[1:]):
        kb.name = order[i]
        kb.slider_max = 2.0
        kb.value = 0.0
        kmap[order[i].lower()] = kb
    xs, act = keyframe_times(src_arm)
    log("animasyon kareleri: %d (ilk %s son %s)" % (len(xs), xs[:2], xs[-1:]))
    if len(xs) < len(labels):
        raise RuntimeError("bake animi beklenenden kisa: %d < %d" % (len(xs), len(labels)))

    # 2) her kareyi degerlendir
    t = time.time()
    rest = coords(src.data)
    E = []
    missing = set()
    for i, lbl in enumerate(labels):
        bpy.context.scene.frame_set(int(round(xs[i])), subframe=xs[i] - int(round(xs[i])))
        w = frames["morph_weights"][i]
        for kb in kmap.values():
            kb.value = 0.0
        for n, val in w.items():
            kb = kmap.get(n.lower())
            if kb is None:
                missing.add(n)
                continue
            kb.value = float(val)
        E.append(evaluate(src))
    for kb in kmap.values():
        kb.value = 0.0
    E = np.stack(E)
    log("%d kare degerlendirildi (%.1fs), eslesmeyen egri: %s" % (len(labels), time.time() - t, sorted(missing)[:5]))
    report["eval_s"] = round(time.time() - t, 1)
    report["unmatched_curves"] = sorted(missing)
    fi = {lbl: i for i, lbl in enumerate(labels)}
    D0 = E[0] - rest
    report["neutral_vs_rest_max_mm"] = round(float(np.linalg.norm(D0, axis=1).max() * 1000), 3)
    report["raw_frame0_vs_neutral_max_mm"] = round(float(np.linalg.norm(E[fi["_raw_frame0"]] - E[0], axis=1).max() * 1000), 3)
    log("notr-dinlenme max fark %.2f mm; ham kare0-notr max fark %.3f mm" % (
        report["neutral_vs_rest_max_mm"], report["raw_frame0_vs_neutral_max_mm"]))

    # ARKit deltalari (kaynak uzayinda, notre gore)
    deltas = {}
    for name in arkit:
        if name == "mouthClose":
            d = E[fi["_jawOpen_lipsTogether"]] - E[fi["jawOpen"]]
        else:
            d = E[fi[name]] - E[0]
        deltas[name] = d
    report["delta_max_mm"] = {k: round(float(np.linalg.norm(v, axis=1).max() * 1000), 2) for k, v in deltas.items()}

    # 3) hedef mesh (LOD aktarimi)
    if a.face_target:
        t = time.time()
        _, tgt_arm, tgt_meshes = import_glb(a.face_target)
        tgt = max(tgt_meshes, key=lambda o: len(o.data.vertices))
        tme = tgt.data
        trest = coords(tme)
        tvc = vertex_classes(tme)
        tnorm = np.empty(len(tme.vertices) * 3)
        tme.vertices.foreach_get("normal", tnorm)
        tnorm = tnorm.reshape(-1, 3)
        # kaynak: sinif basina BVH (dinlenme pozunda, ucgenlenmis)
        sme = src.data
        sme.calc_loop_triangles()
        spc, _ = poly_classes(sme)
        tri_cls = {}
        for lt in sme.loop_triangles:
            tri_cls.setdefault(spc[lt.polygon_index], []).append(tuple(lt.vertices))
        bvh = {}
        for c, tris in tri_cls.items():
            bvh[c] = (BVHTree.FromPolygons([Vector(v) for v in rest], tris, all_triangles=True), tris)
        idx = np.zeros((len(tme.vertices), 3), dtype=np.int64)
        wts = np.zeros((len(tme.vertices), 3))
        far = 0
        fallback = 0
        for vi in range(len(tme.vertices)):
            c = tvc[vi]
            if c not in bvh:
                c = "head"
            tree, tris = bvh[c]
            p = Vector(trest[vi])
            n = Vector(tnorm[vi])
            hit = None
            for co, fn, ti, dist in sorted(tree.find_nearest_range(p, 0.004), key=lambda h: h[3]):
                if fn.dot(n) > a.normal_dot:
                    hit = (co, ti, dist)
                    break
            if hit is None:
                co, fn, ti, dist = tree.find_nearest(p)
                hit = (co, ti, dist)
                fallback += 1
            co, ti, dist = hit
            if dist > 0.002:
                far += 1
            tv = tris[ti]
            A, B, C = (Vector(rest[j]) for j in tv)
            # barisentrik
            v0, v1, v2 = B - A, C - A, co - A
            d00, d01, d11 = v0.dot(v0), v0.dot(v1), v1.dot(v1)
            d20, d21 = v2.dot(v0), v2.dot(v1)
            den = d00 * d11 - d01 * d01
            if abs(den) < 1e-18:
                bw = (1.0, 0.0, 0.0)
            else:
                vv = (d11 * d20 - d01 * d21) / den
                ww = (d00 * d21 - d01 * d20) / den
                bw = (1.0 - vv - ww, vv, ww)
            idx[vi] = tv
            wts[vi] = bw
        log("LOD aktarimi: %d hedef kose, normal-uyumsuz fallback %d, >2mm uzak %d (%.1fs)" % (
            len(tme.vertices), fallback, far, time.time() - t))
        report["transfer"] = {"target_verts": len(tme.vertices), "normal_fallback": fallback, "far_over_2mm": far,
                              "s": round(time.time() - t, 1)}

        def xfer(d):
            return (d[idx] * wts[..., None]).sum(axis=1)

        final, final_arm, base = tgt, tgt_arm, trest + xfer(D0)
        fdeltas = {k: xfer(v) for k, v in deltas.items()}
    else:
        final, final_arm, base = src, src_arm, E[0]
        fdeltas = deltas

    # 4) final yuz: sekil anahtarlari
    fme = final.data
    if fme.shape_keys:
        final.shape_key_clear()
    fme.vertices.foreach_set("co", base.astype(np.float32).ravel())
    fme.update()
    final.shape_key_add(name="Basis", from_mix=False)
    for name in arkit:
        kb = final.shape_key_add(name=name, from_mix=False)
        kb.data.foreach_set("co", (base + fdeltas[name]).astype(np.float32).ravel())
    log("52 ARKit sekil anahtari yazildi")

    # 5) malzeme bolumlerini dusur (saydam goz kabugu / gozyasi)
    drop = [s.strip() for s in a.drop.split(",") if s.strip()]
    if drop:
        bpy.ops.object.select_all(action="DESELECT")
        bpy.context.view_layer.objects.active = final
        final.select_set(True)
        pcls, _ = poly_classes(fme)
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.select_all(action="DESELECT")
        bpy.ops.object.mode_set(mode="OBJECT")
        for p, c in zip(fme.polygons, pcls):
            p.select = c in drop
        bpy.ops.object.mode_set(mode="EDIT")
        bpy.ops.mesh.delete(type="VERT")
        bpy.ops.object.mode_set(mode="OBJECT")
        # kullanilmayan malzeme slotlari
        used = set(p.material_index for p in fme.polygons)
        for i in reversed(range(len(fme.materials))):
            if i not in used:
                final.active_material_index = i
                bpy.ops.object.material_slot_remove()
        report["dropped_classes"] = drop

    # 6) iskelet: govde varsa ona bagla, yuz eklemlerini sil
    body_arm = None
    body_meshes = []
    if a.body:
        _, body_arm, body_meshes = import_glb(a.body)
        keep = set(b.name for b in body_arm.data.bones)
        # ortak kemik konum kontrolu
        diffs = {}
        for b in final_arm.data.bones:
            if b.name in keep:
                pw = final_arm.matrix_world @ b.head_local
                pb = body_arm.matrix_world @ body_arm.data.bones[b.name].head_local
                diffs[b.name] = (pw - pb).length * 1000
        report["shared_bone_offset_mm_max"] = round(max(diffs.values()), 3) if diffs else None
        report["shared_bones"] = sorted(diffs)
        log("ortak kemik: %d, max konum farki %.3f mm" % (len(diffs), report["shared_bone_offset_mm_max"] or -1))
    else:
        keep = set(b.name for b in final_arm.data.bones if not b.name.startswith("FACIAL_"))
    face_groups, _ = remap_weights(final, final_arm, keep)
    report["face_skin_groups_after"] = face_groups
    log("yuz deri gruplari (sonra):", face_groups)

    if body_arm is not None:
        mw = final.matrix_world.copy()
        final.parent = body_arm
        final.matrix_world = mw
        for m in final.modifiers:
            if m.type == "ARMATURE":
                m.object = body_arm
        target_arm = body_arm
    else:
        target_arm = final_arm
        bpy.context.view_layer.objects.active = final_arm
        bpy.ops.object.mode_set(mode="EDIT")
        for eb in list(final_arm.data.edit_bones):
            if eb.name not in keep:
                final_arm.data.edit_bones.remove(eb)
        bpy.ops.object.mode_set(mode="OBJECT")

    # gereksiz nesneleri sil
    keep_objs = {final, target_arm} | set(body_meshes)
    for o in list(bpy.data.objects):
        if o not in keep_objs:
            bpy.data.objects.remove(o, do_unlink=True)
    for ac in list(bpy.data.actions):
        bpy.data.actions.remove(ac)
    target_arm.animation_data_clear()
    final.name = "face"
    for bm in body_meshes:
        bm.name = "body"
    target_arm.name = "skeleton"
    report["final"] = {
        "face_verts": len(final.data.vertices),
        "face_tris": sum(len(p.vertices) - 2 for p in final.data.polygons),
        "body_tris": sum(sum(len(p.vertices) - 2 for p in bm.data.polygons) for bm in body_meshes),
        "bones": len(target_arm.data.bones),
        "shape_keys": [k.name for k in final.data.shape_keys.key_blocks[1:]],
    }
    report["final"]["total_tris"] = report["final"]["face_tris"] + report["final"]["body_tris"]
    log("final: yuz %d ucgen + govde %d = %d, %d kemik" % (
        report["final"]["face_tris"], report["final"]["body_tris"], report["final"]["total_tris"], report["final"]["bones"]))

    if a.save_blend:
        bpy.ops.wm.save_as_mainfile(filepath=a.save_blend)
    t = time.time()
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=a.out, export_format="GLB", export_animations=False, export_morph=True,
                              export_morph_normal=True, export_skins=True, export_yup=True,
                              export_try_sparse_sk=True, export_apply=False)
    log("GLB yazildi: %s (%.1f MB, %.1fs)" % (a.out, os.path.getsize(a.out) / 1e6, time.time() - t))
    report["total_s"] = round(time.time() - T0, 1)
    with open(os.path.splitext(a.out)[0] + ".report.json", "w", encoding="utf-8") as fh:
        json.dump(report, fh, indent=1)


main()
