# ============================================================
# Faz A — MPFB insan + CC0 varlıklar (göz/kaş/kirpik/saç/tunik) + doku
# ============================================================
# Çıktı: assets/3d-src/patient-v2-stageA.blend + 2 test render (yüz, boy).
# Skill kuralı: prosedürel ENHANCED cilt YASAK (glTF çıkmaz) → GAMEENGINE.
# ============================================================
import bpy, addon_utils, sys, os

sys.stdout.reconfigure(encoding="utf-8")
addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True, persistent=True)
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService

DATA = LocationService.get_user_data()
OUT = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src"
SHOT = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src\renders"
os.makedirs(OUT, exist_ok=True)
os.makedirs(SHOT, exist_ok=True)

# Boş sahne
bpy.ops.wm.read_factory_settings(use_empty=True)

# 1) İnsan — 62y erkek (macro sözlüğü MPFB anahtarları)
macro = {
    "gender": 1.0, "age": 0.75, "muscle": 0.45, "weight": 0.55,
    "height": 0.55, "proportions": 0.5, "cupsize": 0.5, "firmness": 0.5,
    "race": {"asian": 0.1, "caucasian": 0.8, "african": 0.1},
}
basemesh = HumanService.create_human(
    mask_helpers=True, detailed_helpers=False, extra_vertex_groups=True,
    feet_on_ground=True, scale=0.1, macro_detail_dict=macro,
)
print("BASEMESH:", basemesh.name, "dim:", tuple(round(d, 3) for d in basemesh.dimensions))

# 2) Cilt — GAMEENGINE (texture PBR, glTF-dostu)
skin = os.path.join(DATA, "skins", "old_caucasian_male", "old_caucasian_male.mhmat")
if not os.path.isfile(skin):
    import glob
    cands = glob.glob(os.path.join(DATA, "skins", "old_caucasian_male", "*.mhmat"))
    skin = cands[0]
HumanService.set_character_skin(skin, basemesh, skin_type="GAMEENGINE", material_instances=False)
print("SKIN OK:", os.path.basename(skin))

def add(relpath, atype, mat="MAKESKIN"):
    p = os.path.join(DATA, relpath)
    obj = HumanService.add_mhclo_asset(p, basemesh, asset_type=atype, material_type=mat)
    print("ASSET:", atype, "→", obj.name if obj else "NONE", os.path.basename(p))
    return obj

# 3) Varlıklar
eyes = add(r"eyes\low-poly\low-poly.mhclo", "Eyes")
brows = add(r"eyebrows\eyebrow006\eyebrow006.mhclo", "Eyebrows")
lashes = add(r"eyelashes\eyelashes01\eyelashes01.mhclo", "Eyelashes")
hair = add(r"hair\short01\short01.mhclo", "Hair")
tunic = add(r"clothes\wdg_mycenaean_tunic\wdg_mycenaean_tunic.mhclo", "Clothes")

# 4) Tunik → hastane önlüğü rengi (soluk teal #9fc6c0)
if tunic:
    for slot in tunic.material_slots:
        m = slot.material
        if m and m.use_nodes:
            for n in m.node_tree.nodes:
                if n.type == "BSDF_PRINCIPLED":
                    n.inputs["Base Color"].default_value = (0.42, 0.62, 0.58, 1.0)
                    n.inputs["Roughness"].default_value = 0.85

# 5) Kaydet
blend = os.path.join(OUT, "patient-v2-stageA.blend")
bpy.ops.wm.save_as_mainfile(filepath=blend)
print("BLEND:", blend)

# 6) Test render (Eevee) — yüz + boy
scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"  # 5.1 enum: EEVEE/WORKBENCH/CYCLES
scene.render.resolution_x = 720
scene.render.resolution_y = 900

sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
sun.data.energy = 3.0
sun.rotation_euler = (0.8, 0.2, 0.6)
bpy.context.collection.objects.link(sun)
fill = bpy.data.objects.new("Fill", bpy.data.lights.new("Fill", "AREA"))
fill.data.energy = 220
fill.location = (-1.2, -1.6, 1.4)
bpy.context.collection.objects.link(fill)

cam = bpy.data.objects.new("Cam", bpy.data.cameras.new("Cam"))
bpy.context.collection.objects.link(cam)
scene.camera = cam
H = basemesh.dimensions.z

def shot(name, loc, rot):
    cam.location = loc
    cam.rotation_euler = rot
    scene.render.filepath = os.path.join(SHOT, name)
    bpy.ops.render.render(write_still=True)
    print("RENDER:", name)

import math
# boy — önden
shot("stageA_full.png", (0, -3.2, H * 0.55), (math.radians(88), 0, 0))
# yüz yakın
shot("stageA_face.png", (0, -0.75, H * 0.92), (math.radians(86), 0, 0))
print("FAZ A TAMAM")
