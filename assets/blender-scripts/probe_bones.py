import bpy, sys
sys.stdout.reconfigure(encoding="utf-8")
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src\patient-animated-male-raw.glb")
arm = next(o for o in bpy.data.objects if o.type=="ARMATURE")
names=[b.name for b in arm.data.bones]
print("KEMIK SAYISI:", len(names))
print("HEAD adaylar:", [n for n in names if "ead" in n])
print("ILK 8:", names[:8])
mesh = next(o for o in bpy.data.objects if o.type=="MESH")
print("MESH:", mesh.name, "shapekeys:", len(mesh.data.shape_keys.key_blocks) if mesh.data.shape_keys else 0)
print("UV katmanlari:", [u.name for u in mesh.data.uv_layers])
print("ACTIONS:", [a.name for a in bpy.data.actions])
