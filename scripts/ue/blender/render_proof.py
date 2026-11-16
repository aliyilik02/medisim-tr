# -*- coding: utf-8 -*-
"""ARKit GLB kanit render'lari (Blender headless, Workbench).

Amac: final GLB'yi yeniden import edip yuzun on gorunusunu belirli ARKit sekil anahtari
kombinasyonlariyla ve tam boy on gorunusu PNG olarak cizer (gozle dogrulama icin).

Girdi:  --glb final.glb  --out-dir proof/  [--res 900]
Cikti:  proof/<ad>.png  (neutral, jawOpen, eyeBlink, mouthSmile, browInnerUp, mouthFunnel,
        jawOpen_34 (3/4 aci), body_front)
Calistirma:
  "C:/Program Files/Blender Foundation/Blender 5.1/blender.exe" -b -P scripts/ue/blender/render_proof.py -- --glb X.glb --out-dir proof
"""
import argparse
import math
import os
import sys

import bpy
from mathutils import Vector

POSES = [
    ("neutral", {}),
    ("jawOpen", {"jawOpen": 1.0}),
    ("eyeBlink", {"eyeBlinkLeft": 1.0, "eyeBlinkRight": 1.0}),
    ("mouthSmile", {"mouthSmileLeft": 1.0, "mouthSmileRight": 1.0}),
    ("browInnerUp", {"browInnerUp": 1.0}),
    ("mouthFunnel", {"mouthFunnel": 1.0}),
]


def args():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--glb", required=True)
    ap.add_argument("--out-dir", required=True)
    ap.add_argument("--res", type=int, default=900)
    ap.add_argument("--extra", default="", help="ek pozlar: ad=key:val+key:val;...")
    return ap.parse_args(argv)


def world_verts(ob, mat_filter=None):
    dg = bpy.context.evaluated_depsgraph_get()
    ev = ob.evaluated_get(dg)
    me = ev.to_mesh()
    pts = []
    if mat_filter is None:
        pts = [ob.matrix_world @ v.co for v in me.vertices]
    else:
        idx = [i for i, m in enumerate(me.materials) if m and mat_filter(m.name)]
        vs = set()
        for p in me.polygons:
            if p.material_index in idx:
                vs.update(p.vertices)
        pts = [ob.matrix_world @ me.vertices[i].co for i in vs]
    ev.to_mesh_clear()
    return pts


def center(pts):
    s = Vector((0, 0, 0))
    for p in pts:
        s += p
    return s / max(1, len(pts))


def look_at(cam, target):
    d = target - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def main():
    a = args()
    os.makedirs(a.out_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=a.glb)
    face = next(o for o in bpy.data.objects if o.type == "MESH" and o.data.shape_keys)
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if arm and arm.animation_data:
        arm.animation_data_clear()
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sh = sc.display.shading
    sh.light = "STUDIO"
    sh.color_type = "SINGLE"
    sh.single_color = (0.80, 0.62, 0.52)
    sh.show_cavity = True
    sh.cavity_type = "WORLD"
    sh.show_specular_highlight = True
    sc.render.film_transparent = False
    sc.world = bpy.data.worlds.new("w") if not sc.world else sc.world
    sh.background_type = "VIEWPORT"
    sh.background_color = (0.12, 0.13, 0.14)

    # yuz yonu: goz merkezi - bas kemigi
    eyes = world_verts(face, lambda n: "eyerefractive" in n.lower())
    eye_c = center(eyes)
    if arm and "head" in arm.data.bones:
        head_c = arm.matrix_world @ arm.data.bones["head"].head_local
    else:
        head_c = center(world_verts(face))
    fwd = eye_c - head_c
    fwd.z = 0
    fwd.normalize()
    face_c = eye_c + Vector((0, 0, -0.035))

    cam_data = bpy.data.cameras.new("cam")
    cam = bpy.data.objects.new("cam", cam_data)
    sc.collection.objects.link(cam)
    sc.camera = cam
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = 0.30
    sc.render.resolution_x = a.res
    sc.render.resolution_y = a.res

    keys = face.data.shape_keys.key_blocks
    poses = list(POSES)
    for item in filter(None, a.extra.split(";")):
        name, spec = item.split("=")
        poses.append((name, {kv.split(":")[0]: float(kv.split(":")[1]) for kv in spec.split("+")}))

    def shoot(name, vals, direction, target, scale):
        for k in keys[1:]:
            k.value = vals.get(k.name, 0.0)
        cam.location = target + direction * 1.5
        cam_data.ortho_scale = scale
        look_at(cam, target)
        sc.render.filepath = os.path.join(a.out_dir, name + ".png")
        bpy.ops.render.render(write_still=True)
        print("[proof] yazildi", sc.render.filepath, flush=True)

    for name, vals in poses:
        shoot(name, vals, fwd, face_c, 0.30)
    side = Vector((fwd.y, -fwd.x, 0))
    d34 = (fwd + side * 0.9).normalized()
    shoot("jawOpen_34", {"jawOpen": 1.0}, d34, face_c, 0.30)
    shoot("mouth_close_up_jawOpen", {"jawOpen": 1.0}, fwd, face_c + Vector((0, 0, -0.04)), 0.12)
    shoot("eyes_close_up_blink", {"eyeBlinkLeft": 1.0, "eyeBlinkRight": 1.0}, fwd, eye_c, 0.12)
    # tam boy
    allp = []
    for o in bpy.data.objects:
        if o.type == "MESH":
            allp += world_verts(o)
    zs = [p.z for p in allp]
    body_c = Vector((center(allp).x, center(allp).y, (max(zs) + min(zs)) / 2))
    sc.render.resolution_x = int(a.res * 0.6)
    sc.render.resolution_y = int(a.res * 1.2)
    shoot("body_front", {}, fwd, body_c, (max(zs) - min(zs)) * 1.08)


main()
