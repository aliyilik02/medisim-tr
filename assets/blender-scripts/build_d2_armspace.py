# Faz D2 — parça vertexlerini ARMATURE uzayına al (gövdeyle aynı desen)
# v2c dersi: dünya-uzaylı vertex + 0.01 armature → üçte bind uyuşmazlığı,
# 100x ölçek patlaması. Çözüm: mesh.transform(armWorld^-1 @ objWorld),
# obje armature'ün transformsuz çocuğu olur.
import bpy, sys, os
sys.stdout.reconfigure(encoding="utf-8")
SRC = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src"
bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC, "patient-v2-master.blend"))
arm = bpy.data.objects["PatientRig"]
inv = arm.matrix_world.inverted()
for name in ["PatientEyes","PatientEyebrows","PatientEyelashes","PatientHair","PatientGown"]:
    o = bpy.data.objects.get(name)
    if not o: continue
    M = inv @ o.matrix_world
    o.data.transform(M)
    o.parent = arm
    o.parent_type = "OBJECT"
    o.matrix_parent_inverse.identity()
    from mathutils import Matrix
    o.matrix_basis = Matrix.Identity(4)
    print("ARMSPACE:", name, "dim(local):", tuple(round(d,2) for d in o.dimensions))
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, "patient-v2-master.blend"))
for o in bpy.data.objects: o.select_set(True)
out = os.path.join(SRC, "patient-v2-male-master.glb")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_morph=True,
    export_morph_normal=True, export_skins=True, export_animations=False,
    export_apply=False, use_selection=True, export_yup=True)
print("EXPORT:", round(os.path.getsize(out)/1048576,2), "MB")
