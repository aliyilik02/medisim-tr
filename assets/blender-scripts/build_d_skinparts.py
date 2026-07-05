# ============================================================
# Faz D — parçaları SKINNED yap + animasyonsuz export
# ============================================================
# Bone-parent üçte ölçek sorunlu çıktı; standart yol: her parçaya
# 'mixamorig:Head' vertex grubu (1.0) + Armature modifier → glTF'te
# skinned mesh. Animasyon EXPORT EDİLMEZ — eski GLB'den gltf-transform
# ile taşınır (Blender 5.1 action-export'u üçte işlemiyor).
# ============================================================
import bpy, sys, os

sys.stdout.reconfigure(encoding="utf-8")
SRC = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src"
bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC, "patient-v2-master.blend"))

arm = bpy.data.objects["PatientRig"]
HEAD = "mixamorig:Head"
head_parts = ["PatientEyes", "PatientEyebrows", "PatientEyelashes", "PatientHair"]

for name in head_parts:
    o = bpy.data.objects.get(name)
    if not o:
        print("YOK:", name)
        continue
    keep = o.matrix_world.copy()
    o.parent = None
    o.matrix_world = keep
    o.vertex_groups.clear()
    vg = o.vertex_groups.new(name=HEAD)
    vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    am = o.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    print("SKINNED:", name, "verts:", len(o.data.vertices))

# Tunikte armature modifier zaten var; parent'ı yoksa dokunma
gown = bpy.data.objects.get("PatientGown")
if gown:
    print("GOWN modifiers:", [m.type for m in gown.modifiers], "parent:", gown.parent.name if gown.parent else None)

bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, "patient-v2-master.blend"))

for o in bpy.data.objects:
    o.select_set(True)
out = os.path.join(SRC, "patient-v2-male-master.glb")
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    export_morph=True,
    export_morph_normal=True,
    export_skins=True,
    export_animations=False,  # klipler eski GLB'den gltf-transform ile gelecek
    export_apply=False,
    use_selection=True,
    export_yup=True,
)
print("GLB EXPORT (animasyonsuz):", round(os.path.getsize(out) / 1048576, 2), "MB")
print("FAZ D TAMAM")
