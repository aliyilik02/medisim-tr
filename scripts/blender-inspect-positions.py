"""
Blender CLI: modelin TÜM mesh'lerinin world position + bbox center + size.
Hedef: yatağın gerçek koordinatlarını çıkarıp hastayı oraya hizalama için.
"""
import bpy
import sys
import os

argv = sys.argv
argv = argv[argv.index("--") + 1:] if "--" in argv else []
if len(argv) < 1:
    print("ERROR: input gerekli")
    sys.exit(1)

inp = os.path.abspath(argv[0])
bpy.ops.wm.read_homefile(use_empty=True)
ext = os.path.splitext(inp)[1].lower()
if ext == ".gltf" or ext == ".glb":
    bpy.ops.import_scene.gltf(filepath=inp)
else:
    print(f"ERROR: format desteklenmiyor {ext}")
    sys.exit(1)

bpy.context.view_layer.update()

# Tüm mesh'leri tara — world bbox center
all_mesh = [o for o in bpy.context.scene.objects if o.type == "MESH"]
print(f"\n[summary] total mesh count: {len(all_mesh)}")
print(f"{'NAME':<35} {'WX':>8} {'WY':>8} {'WZ':>8} {'SX':>6} {'SY':>6} {'SZ':>6}")
print("-" * 90)

# Scene bbox toplama
scene_min = [9e9, 9e9, 9e9]
scene_max = [-9e9, -9e9, -9e9]

for o in sorted(all_mesh, key=lambda x: x.name):
    # World bbox
    world_corners = [o.matrix_world @ v.co for v in o.data.vertices[:1]]
    if not o.data.vertices:
        continue
    # Daha verimli: bbox 8 köşesi
    bbox_local = [o.matrix_world @ v for v in [
        type(o.matrix_world @ o.data.vertices[0].co)(c) for c in o.bound_box
    ]] if False else None  # fallback to direct vertex sample
    # Direkt: tüm vertex'leri world'e dönüştür (yavaş ama doğru)
    sx, sy, sz = 0, 0, 0
    cx, cy, cz = 0, 0, 0
    mn = [9e9, 9e9, 9e9]
    mx = [-9e9, -9e9, -9e9]
    for v in o.data.vertices:
        w = o.matrix_world @ v.co
        for i in range(3):
            if w[i] < mn[i]: mn[i] = w[i]
            if w[i] > mx[i]: mx[i] = w[i]
    cx, cy, cz = (mn[0]+mx[0])/2, (mn[1]+mx[1])/2, (mn[2]+mx[2])/2
    sx, sy, sz = mx[0]-mn[0], mx[1]-mn[1], mx[2]-mn[2]
    print(f"{o.name:<35} {cx:>8.2f} {cy:>8.2f} {cz:>8.2f} {sx:>6.2f} {sy:>6.2f} {sz:>6.2f}")
    for i in range(3):
        if mn[i] < scene_min[i]: scene_min[i] = mn[i]
        if mx[i] > scene_max[i]: scene_max[i] = mx[i]

print("-" * 90)
print(f"{'SCENE BBOX':<35} min=({scene_min[0]:.2f},{scene_min[1]:.2f},{scene_min[2]:.2f}) max=({scene_max[0]:.2f},{scene_max[1]:.2f},{scene_max[2]:.2f})")
print(f"{'SCENE SIZE':<35} x={scene_max[0]-scene_min[0]:.2f} y={scene_max[1]-scene_min[1]:.2f} z={scene_max[2]-scene_min[2]:.2f}")
print(f"{'SCENE CENTER':<35} ({(scene_min[0]+scene_max[0])/2:.2f},{(scene_min[1]+scene_max[1])/2:.2f},{(scene_min[2]+scene_max[2])/2:.2f})")
