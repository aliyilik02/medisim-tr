# ============================================================
# Faz B — MPFB parçalarını mixamorig'li GLB hastasına transfer
# ============================================================
# Bizim gövde KALIR (ARKit morph + 10 animasyon klibi korunur);
# üstüne: MPFB cilt dokusu (UV uyum testi), gözler/kaş/kirpik/saç
# (mixamorigHead'e rijit), tunik (weight transfer + armature).
# Çıktı: patient-v2-stageB.blend + doğrulama renderları.
# ============================================================
import bpy, sys, os, math
from mathutils import Vector

sys.stdout.reconfigure(encoding="utf-8")
ROOT = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master"
SRC = os.path.join(ROOT, "assets", "3d-src")
SHOT = os.path.join(SRC, "renders")
GLB = os.path.join(ROOT, "assets", "3d-src", "patient-animated-male-raw.glb")  # meshopt çözülmüş kopya

bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC, "patient-v2-stageA.blend"))

# MPFB nesnelerini etiketle
mpfb_objs = {o.name: o for o in bpy.data.objects}
basemesh = bpy.data.objects.get("Human")
parts = {
    "eyes": bpy.data.objects.get("Human.low-poly"),
    "brows": bpy.data.objects.get("Human.eyebrow006"),
    "lashes": bpy.data.objects.get("Human.eyelashes01"),
    "hair": bpy.data.objects.get("Human.short01"),
    "tunic": bpy.data.objects.get("Human.wdg_mycenaean_tunic"),
}
print("PARCALAR:", {k: (v.name if v else None) for k, v in parts.items()})

# GLB import
pre = set(bpy.data.objects)
bpy.ops.import_scene.gltf(filepath=GLB)
new = [o for o in bpy.data.objects if o not in pre]
glb_arm = next(o for o in new if o.type == "ARMATURE")
# birden çok mesh olabilir (gizli Icosphere debug kalıntısı) → shapekey'li/en büyük gövdeyi seç
meshes = [o for o in new if o.type == "MESH"]
glb_body = max(meshes, key=lambda o: (1 if o.data.shape_keys else 0, len(o.data.vertices)))
for m in meshes:
    if m is not glb_body:
        print("EKSTRA MESH SILINDI:", m.name, len(m.data.vertices))
        bpy.data.objects.remove(m, do_unlink=True)
print("GLB:", glb_arm.name, glb_body.name, "armscale:", tuple(round(s, 4) for s in glb_arm.scale))

# Rest pozda değerlendir
glb_arm.data.pose_position = "REST"
bpy.context.view_layer.update()

def world_bbox(obj):
    deps = bpy.context.evaluated_depsgraph_get()
    ev = obj.evaluated_get(deps)
    m = ev.matrix_world
    pts = [m @ Vector(c) for c in ev.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return mn, mx

bmn, bmx = world_bbox(glb_body)
hmn, hmx = world_bbox(basemesh)
print("GLB body bbox z:", round(bmn.z, 3), round(bmx.z, 3), "h:", round(bmx.z - bmn.z, 3))
print("MPFB bbox z:", round(hmn.z, 3), round(hmx.z, 3), "h:", round(hmx.z - hmn.z, 3))

# MPFB grubunu GLB gövdesine hizala (ölçek + z-taban + yatay merkez)
s = (bmx.z - bmn.z) / (hmx.z - hmn.z)
mpfb_root_objs = [basemesh] + [p for p in parts.values() if p]
# hepsi basemesh'in çocuğu mu? değilse tek tek dönüştür
for o in mpfb_root_objs:
    o.matrix_world = o.matrix_world  # touch
# ortak dönüşüm: önce ölçek (dünya orijinine göre), sonra taban/merkez çakıştır
import mathutils
S = mathutils.Matrix.Scale(s, 4)
for o in mpfb_root_objs:
    if o.parent in mpfb_root_objs:
        continue  # ebeveyn dönüşümü çocuğu taşır
    o.matrix_world = S @ o.matrix_world
bpy.context.view_layer.update()
hmn2, hmx2 = world_bbox(basemesh)
bc = ((bmn.x + bmx.x) / 2, (bmn.y + bmx.y) / 2)
hc = ((hmn2.x + hmx2.x) / 2, (hmn2.y + hmx2.y) / 2)
T = mathutils.Matrix.Translation(Vector((bc[0] - hc[0], bc[1] - hc[1], bmn.z - hmn2.z)))
for o in mpfb_root_objs:
    if o.parent in mpfb_root_objs:
        continue
    o.matrix_world = T @ o.matrix_world
bpy.context.view_layer.update()
hmn3, hmx3 = world_bbox(basemesh)
print("HIZA sonrasi MPFB z:", round(hmn3.z, 3), round(hmx3.z, 3))

# ── Cilt dokusu UV testi: MPFB skin materyalini GLB gövdesine ata ──
skin_mat = None
for slot in basemesh.material_slots:
    if slot.material:
        skin_mat = slot.material
        break
if skin_mat:
    glb_body.data.materials.clear()
    glb_body.data.materials.append(skin_mat)
    print("SKIN MAT GLB gövdesine atandı:", skin_mat.name)

# ── UV kurtarma: Mixamo hattı UV'yi bozmuş olabilir → MakeHuman UV'sini
# basemesh'ten LOOP DataTransfer ile geri getir (şekiller çakışık) ──
bpy.ops.object.select_all(action="DESELECT")
glb_body.select_set(True)
bpy.context.view_layer.objects.active = glb_body
uvdt = glb_body.modifiers.new("UVFromBase", "DATA_TRANSFER")
uvdt.object = basemesh
uvdt.use_loop_data = True
uvdt.data_types_loops = {"UV"}
uvdt.loop_mapping = "POLYINTERP_NEAREST"
bpy.ops.object.datalayout_transfer(modifier=uvdt.name)
bpy.ops.object.modifier_apply(modifier=uvdt.name)
print("UV TRANSFER OK — katmanlar:", [u.name for u in glb_body.data.uv_layers])

# ── Parçaları mixamorig'e bağla ──
def apply_all_transform(obj):
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

head_bone = "mixamorig:Head"  # Blender importu ':' korur; export öncesi rename edilecek
for key in ["eyes", "brows", "lashes", "hair"]:
    o = parts[key]
    if not o:
        continue
    # dünyadaki yeri KORUYARAK kemiğe rijit bağla (Blender deseni:
    # world'ü sakla → parent ata → world'ü geri yaz; matrix_basis çözülür)
    keep = o.matrix_world.copy()
    o.parent = glb_arm
    o.parent_type = "BONE"
    o.parent_bone = head_bone
    o.matrix_world = keep
    print("BONE-PARENT:", key, "loc:", tuple(round(v, 3) for v in o.matrix_world.translation))

# tunik: armature deform + weight transfer
tunic = parts["tunic"]
if tunic:
    # eski MPFB rig vertex gruplarını temizle
    tunic.vertex_groups.clear()
    bpy.ops.object.select_all(action="DESELECT")
    tunic.select_set(True)
    bpy.context.view_layer.objects.active = tunic
    dt = tunic.modifiers.new("WeightsFromBody", "DATA_TRANSFER")
    dt.object = glb_body
    dt.use_vert_data = True
    dt.data_types_verts = {"VGROUP_WEIGHTS"}
    dt.vert_mapping = "POLYINTERP_NEAREST"
    bpy.ops.object.datalayout_transfer(modifier=dt.name)
    bpy.ops.object.modifier_apply(modifier=dt.name)
    arm_mod = tunic.modifiers.new("Armature", "ARMATURE")
    arm_mod.object = glb_arm
    # parent YOK — skinned mesh için gereksiz; 0.01 ölçekli rig parent'ı matrisi bozuyordu
    print("TUNIK: weight transfer + armature OK, gruplar:", len(tunic.vertex_groups))

# MPFB iskeleti + gövdesi + kalıntıları sil
for o in list(bpy.data.objects):
    if o in (glb_arm, glb_body) or o in parts.values():
        continue
    if o.type in ("MESH", "ARMATURE", "EMPTY") and (o.name.startswith("Human") or "rig" in o.name.lower()):
        bpy.data.objects.remove(o, do_unlink=True)
print("MPFB kalintilari temizlendi; kalan:", [o.name for o in bpy.data.objects if o.type in ("MESH", "ARMATURE")])

blend = os.path.join(SRC, "patient-v2-stageB.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("BLEND:", blend)

# ── Render doğrulama: rest yüz + laying_idle pozu ──
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 900
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN")); sun.data.energy = 3
sun.rotation_euler = (0.9, 0.2, 0.4); bpy.context.collection.objects.link(sun)
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "AREA")); fill.data.energy = 300
fill.location = (0.6, -1.8, 1.5); bpy.context.collection.objects.link(fill)
cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam")); bpy.context.collection.objects.link(cam)
scene.camera = cam
bmn4, bmx4 = world_bbox(glb_body)
H = bmx4.z - bmn4.z

def shot(name, loc, rot):
    cam.location = loc; cam.rotation_euler = rot
    scene.render.filepath = os.path.join(SHOT, name)
    bpy.ops.render.render(write_still=True)
    print("RENDER:", name)

shot("stageB_full.png", (0, -3.4, bmn4.z + H * 0.55), (math.radians(88), 0, 0))
shot("stageB_face.png", (0, -0.8, bmn4.z + H * 0.93), (math.radians(86), 0, 0))

# laying_idle pozu — tunik deformasyon testi
glb_arm.data.pose_position = "POSE"
act = bpy.data.actions.get("laying_idle")
if act:
    glb_arm.animation_data_create()
    glb_arm.animation_data.action = act
    scene.frame_set(30)
    shot("stageB_laying.png", (0, -3.2, 1.4), (math.radians(70), 0, 0))
print("FAZ B TAMAM")
