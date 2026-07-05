# ============================================================
# build_variant — TEK GEÇİŞ varlık-ekleme (A+B+D birleşik, parametrik)
# ============================================================
# Kullanım:
#   blender --background --python build_variant.py -- <variant> <raw_glb> <skin> <hair> <gender> <age>
# Çıktı: assets/3d-src/patient-v2-<variant>-vmaster.glb (animasyonsuz)
# Sonrası (node): merge-animations → inject-parts → optimize (orkestra bash).
# Erkek v2 hattının damıtılmış dersleriyle: UV DataTransfer, armature-uzayı,
# Head-skinned parçalar, animasyon exportu YOK.
# ============================================================
import bpy, addon_utils, sys, os
from mathutils import Vector, Matrix

sys.stdout.reconfigure(encoding="utf-8")
argv = sys.argv[sys.argv.index("--") + 1:]
VARIANT, RAW, SKIN, HAIR, GENDER, AGE = argv[0], argv[1], argv[2], argv[3], float(argv[4]), float(argv[5])
ROOT = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master"
SRC = os.path.join(ROOT, "assets", "3d-src")

addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True, persistent=True)
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService
DATA = LocationService.get_user_data()

bpy.ops.wm.read_factory_settings(use_empty=True)

# ── A: MPFB insan + varlıklar ──
macro = {"gender": GENDER, "age": AGE, "muscle": 0.45, "weight": 0.5,
         "height": 0.5, "proportions": 0.5, "cupsize": 0.5, "firmness": 0.5,
         "race": {"asian": 0.1, "caucasian": 0.8, "african": 0.1}}
basemesh = HumanService.create_human(mask_helpers=True, detailed_helpers=False,
    extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
import glob
skin_mhmat = (glob.glob(os.path.join(DATA, "skins", SKIN, "*.mhmat")) or [None])[0]
HumanService.set_character_skin(skin_mhmat, basemesh, skin_type="GAMEENGINE", material_instances=False)
print("SKIN:", SKIN)

def add(rel, atype):
    p = os.path.join(DATA, rel)
    o = HumanService.add_mhclo_asset(p, basemesh, asset_type=atype, material_type="MAKESKIN")
    print("ASSET:", atype, o.name if o else "NONE")
    return o

parts = {
    "PatientEyes": add(r"eyes\low-poly\low-poly.mhclo", "Eyes"),
    "PatientEyebrows": add(r"eyebrows\eyebrow006\eyebrow006.mhclo", "Eyebrows"),
    "PatientEyelashes": add(r"eyelashes\eyelashes01\eyelashes01.mhclo", "Eyelashes"),
    "PatientHair": add(os.path.join("hair", HAIR, HAIR + ".mhclo"), "Hair"),
    "PatientGown": add(r"clothes\wdg_mycenaean_tunic\wdg_mycenaean_tunic.mhclo", "Clothes"),
}

# ── B: raw GLB + hizalama + UV kurtarma ──
pre = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=RAW)
new = [o for o in bpy.data.objects if o not in pre]
arm = next(o for o in new if o.type == "ARMATURE")
meshes = [o for o in new if o.type == "MESH"]
body = max(meshes, key=lambda o: (1 if o.data.shape_keys else 0, len(o.data.vertices)))
for m in meshes:
    if m is not body:
        bpy.data.objects.remove(m, do_unlink=True)
arm.data.pose_position = "REST"
bpy.context.view_layer.update()
print("RAW:", arm.name, body.name, "morph:", len(body.data.shape_keys.key_blocks) if body.data.shape_keys else 0)

def wbox(o):
    deps = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(deps)
    pts = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

bmn, bmx = wbox(body)
hmn, hmx = wbox(basemesh)
s = (bmx.z - bmn.z) / (hmx.z - hmn.z)
S = Matrix.Scale(s, 4)
roots = [basemesh] + [p for p in parts.values() if p]
for o in roots:
    if o.parent in roots: continue
    o.matrix_world = S @ o.matrix_world
bpy.context.view_layer.update()
hmn2, hmx2 = wbox(basemesh)
T = Matrix.Translation(Vector(((bmn.x+bmx.x)/2 - (hmn2.x+hmx2.x)/2,
                               (bmn.y+bmx.y)/2 - (hmn2.y+hmx2.y)/2,
                               bmn.z - hmn2.z)))
for o in roots:
    if o.parent in roots: continue
    o.matrix_world = T @ o.matrix_world
bpy.context.view_layer.update()
print("HIZA s:", round(s,3))

# UV kurtarma
bpy.ops.object.select_all(action="DESELECT")
body.select_set(True); bpy.context.view_layer.objects.active = body
uvdt = body.modifiers.new("UVFromBase", "DATA_TRANSFER")
uvdt.object = basemesh; uvdt.use_loop_data = True
uvdt.data_types_loops = {"UV"}; uvdt.loop_mapping = "POLYINTERP_NEAREST"
bpy.ops.object.datalayout_transfer(modifier=uvdt.name)
bpy.ops.object.modifier_apply(modifier=uvdt.name)
print("UV OK")

# Gövde materyali
skin_mat = next((sl.material for sl in basemesh.material_slots if sl.material), None)
body.data.materials.clear(); body.data.materials.append(skin_mat)
skin_mat.name = "Skin_Body"

# ── D: parçalar armature-uzayına + Head-skin / weight transfer ──
HEADB = next(b.name for b in arm.data.bones if "Head" in b.name and "Top" not in b.name)
inv = arm.matrix_world.inverted()
for newname, o in parts.items():
    if not o: continue
    o.data.transform(inv @ o.matrix_world)
    o.parent = arm; o.parent_type = "OBJECT"
    o.matrix_parent_inverse.identity(); o.matrix_basis = Matrix.Identity(4)
    o.vertex_groups.clear()
    for m in list(o.modifiers): o.modifiers.remove(m)
    if newname == "PatientGown":
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True); bpy.context.view_layer.objects.active = o
        dt = o.modifiers.new("W", "DATA_TRANSFER")
        dt.object = body; dt.use_vert_data = True
        dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
        bpy.ops.object.datalayout_transfer(modifier=dt.name)
        bpy.ops.object.modifier_apply(modifier=dt.name)
    else:
        vg = o.vertex_groups.new(name=HEADB)
        vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    am = o.modifiers.new("Armature", "ARMATURE"); am.object = arm
    # materyal/obje adı
    for sl in o.material_slots:
        if sl.material: sl.material.name = newname.replace("Patient", "") + "_Mat"
    o.name = newname
    print("PART OK:", newname)

body.name = "PatientBody"
keep = {arm.name, "PatientBody", *parts.keys()}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.file.pack_all()
blend = os.path.join(SRC, f"patient-v2-{VARIANT}-master.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
for o in bpy.data.objects: o.select_set(True)
out = os.path.join(SRC, f"patient-v2-{VARIANT}-vmaster.glb")
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_morph=True,
    export_morph_normal=True, export_skins=True, export_animations=False,
    export_apply=False, use_selection=True, export_yup=True)
print("VARIANT EXPORT:", VARIANT, round(os.path.getsize(out)/1048576, 2), "MB")
