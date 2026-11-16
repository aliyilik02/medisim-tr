# -*- coding: utf-8 -*-
"""MetaHuman -> glTF disa aktarim (Unreal tarafi, adim 2/3).

Amac:
  mh_bake_arkit.py'nin urettigi bake animini (onizleme mesh'i = yuz, bake LOD'u = 0, deri + morph
  target'lar + kemik animasyonu), hedef LOD'daki yuz mesh'ini (web topolojisi, bind pozu, deri)
  ve govde mesh'ini ayri GLB'ler olarak disa aktarir.
  NOT: MetaHuman morph target'lari YALNIZ LOD0'da veri tasir (LOD1 disa aktariminda 0 target olculdu),
  bu yuzden pozlar LOD0'da degerlendirilir, Blender'da hedef LOD'a yuzeyden aktarilir.
  Morph AGIRLIK animasyonu glTF'e yazilmaz (exporter sinirlamasi) -> agirliklar
  <name>_arkit_frames.json'da (mh_bake_arkit.py ciktisi).

Girdi (MH_ARGS ile degistirilebilir):
  baked_anim  (/Game/MediSim/ARKitBake/<Name>/AS_<Name>_ARKitBaked)
  face_mesh, body_mesh, face_lod (bake, 0), target_lod (web, 1), body_lod, out_dir, bake_materials
Cikti (out_dir):
  <name>_face_baked.glb   yuz mesh'i (LOD face_lod) + deri + morph'lar + bake animasyonu
  <name>_face_lod<N>.glb  yuz mesh'i (LOD target_lod) + deri (animasyonsuz)
  <name>_body.glb         govde mesh'i (LOD body_lod) + deri
  <name>_lod_report.json  LOD basina ucgen/kose sayilari
  <name>_face_morph_order.json  glTF target indeksi -> UE morph adi

Calistirma (editor acik):
  python scripts/ue/ue_py.py -f scripts/ue/mh_export_gltf.py
"""
import json
import os
import time

import unreal

DEFAULTS = {
    "name": "Taro",
    "baked_anim": "/Game/MediSim/ARKitBake/Taro/AS_Taro_ARKitBaked",
    "face_mesh": "/Game/MetaHumans/Taro/Face/Taro_FaceMesh",
    "body_mesh": "/Game/MetaHumans/Taro/Body/m_med_nrw_body",
    "face_lod": 0,     # bake/morph LOD'u (mh_bake_arkit lod ile ayni olmali)
    "target_lod": 1,   # web icin hedef yuz LOD'u (-1 = ayrica aktarma)
    "body_lod": 0,
    "out_dir": r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src\metahuman\taro-test",
    "bake_materials": False,  # USE_MESH_DATA bake editoru cokertti (MaterialBaking IsValid assert)
}
ARGS = dict(DEFAULTS)
ARGS.update(globals().get("MH_ARGS", {}) or {})


def log(*a):
    print("[mh_export]", *a)


def options(lod, anim):
    o = unreal.GLTFExportOptions()
    o.set_editor_property("default_level_of_detail", lod)
    o.set_editor_property("export_vertex_skin_weights", True)
    o.set_editor_property("export_morph_targets", True)
    o.set_editor_property("export_animation_sequences", anim)
    o.set_editor_property("export_preview_mesh", True)
    o.set_editor_property("export_source_model", False)
    o.set_editor_property("export_uniform_scale", 0.01)
    o.set_editor_property("make_skinned_meshes_root", True)
    o.set_editor_property("export_vertex_colors", False)
    o.set_editor_property("texture_image_format", unreal.GLTFTextureImageFormat.PNG)
    if ARGS["bake_materials"]:
        o.set_editor_property("bake_material_inputs", unreal.GLTFMaterialBakeMode.USE_MESH_DATA)
        o.set_editor_property("default_material_bake_size", unreal.GLTFMaterialBakeSize(2048, 2048, False))
    else:
        o.set_editor_property("bake_material_inputs", unreal.GLTFMaterialBakeMode.DISABLED)
    return o


def export(obj, path, opts):
    t = time.time()
    if os.path.exists(path):
        os.remove(path)
    ok = unreal.GLTFExporter.export_to_gltf(obj, path, opts, set())
    sz = os.path.getsize(path) / 1e6 if os.path.exists(path) else -1
    log("%s -> %s ok=%s %.1f MB %.1fs" % (obj.get_name(), path, ok, sz, time.time() - t))
    return ok


def lod_report():
    sub = unreal.get_editor_subsystem(unreal.SkeletalMeshEditorSubsystem)
    rep = {}
    for key in ("face_mesh", "body_mesh"):
        m = unreal.load_asset(ARGS[key])
        rows = []
        for lod in range(sub.get_lod_count(m)):
            dm = unreal.DynamicMesh()
            unreal.GeometryScript_AssetUtils.copy_mesh_from_skeletal_mesh(
                m, dm, unreal.GeometryScriptCopyMeshFromAssetOptions(),
                unreal.GeometryScriptMeshReadLOD(lod_type=unreal.GeometryScriptLODType.RENDER_DATA, lod_index=lod))
            rows.append({"lod": lod, "render_verts": sub.get_num_verts(m, lod),
                         "tris": unreal.GeometryScript_MeshQueries.get_num_triangle_i_ds(dm)})
        rep[ARGS[key]] = rows
    return rep


def main():
    os.makedirs(ARGS["out_dir"], exist_ok=True)
    n = ARGS["name"].lower()
    anim = unreal.load_asset(ARGS["baked_anim"])
    face = unreal.load_asset(ARGS["face_mesh"])
    body = unreal.load_asset(ARGS["body_mesh"])
    anim.set_preview_skeletal_mesh(face)
    export(anim, os.path.join(ARGS["out_dir"], n + "_face_baked.glb"), options(ARGS["face_lod"], True))
    if ARGS["target_lod"] >= 0 and ARGS["target_lod"] != ARGS["face_lod"]:
        export(face, os.path.join(ARGS["out_dir"], "%s_face_lod%d.glb" % (n, ARGS["target_lod"])), options(ARGS["target_lod"], False))
    export(body, os.path.join(ARGS["out_dir"], n + "_body.glb"), options(ARGS["body_lod"], False))
    # glTF target'lari ad tasimaz: indeks -> UE morph adi (GetMorphTargets sirasi)
    order = [str(m.get_name()) for m in face.get_editor_property("morph_targets")]
    with open(os.path.join(ARGS["out_dir"], n + "_face_morph_order.json"), "w", encoding="utf-8") as fh:
        json.dump({"face_mesh": ARGS["face_mesh"], "morph_targets": order}, fh, indent=0)
    log("morph sirasi: %d ad" % len(order))
    rep = lod_report()
    with open(os.path.join(ARGS["out_dir"], n + "_lod_report.json"), "w", encoding="utf-8") as fh:
        json.dump(rep, fh, indent=1)
    log("LOD raporu yazildi")


main()
