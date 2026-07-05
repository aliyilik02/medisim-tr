# ============================================================
# Faz C — kemik/materyal rename + GLB export (skill kurallarıyla)
# ============================================================
# - mixamorig:Head → mixamorigHead (R3F kodu ':'siz adlara bağlı;
#   Blender rename fcurve path'lerini otomatik günceller — doğrulanır)
# - Human.body → Skin_Body (R3F SKIN_MATERIAL_NAMES tespiti)
# - export_apply=False (morph koruması) + animations (10 klip)
# ============================================================
import bpy, sys, os

sys.stdout.reconfigure(encoding="utf-8")
SRC = r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src"
bpy.ops.wm.open_mainfile(filepath=os.path.join(SRC, "patient-v2-stageB.blend"))

arm = bpy.data.objects["PatientRig"]
body = bpy.data.objects["PatientBody"]

# 1) Kemik rename YAPILMIYOR (v2 dersi): Blender 5.1 layered-action API'sinde
# rename→fcurve senkronu doğrulanamadı; rename'li ilk export'ta klipler bozuk
# çıktı (hasta dik durdu). ':' korunur — R3F tarafı findBone fallback'iyle
# iki adı da arar (mixamorigHead | mixamorig:Head).
print("KEMIK RENAME: atlandi (':' korunuyor)")
# fcurve doğrulaması — örnek path
# Blender 5.1: Action.fcurves API kalktı (layered actions) — path doğrulaması
# export sonrası GLB üzerinde yapılır (three kanal hedef adları).
try:
    act = bpy.data.actions.get("laying_idle")
    fcs = getattr(act, "fcurves", None)
    if fcs is not None and len(fcs):
        print("FCURVE ORNEK:", fcs[0].data_path)
except Exception as e:
    print("fcurve dogrulama atlandi:", e)

# 2) Materyal adları
mat = body.active_material
if mat:
    mat.name = "Skin_Body"
    print("BODY MAT:", mat.name)
for oname, mname in [
    ("Human.low-poly", "Eyes_LowPoly"),
    ("Human.eyebrow006", "Face_Eyebrows"),
    ("Human.eyelashes01", "Face_Eyelashes"),
    ("Human.short01", "Hair_Short"),
    ("Human.wdg_mycenaean_tunic", "Gown_Cloth"),
]:
    o = bpy.data.objects.get(oname)
    if o:
        for slot in o.material_slots:
            if slot.material:
                slot.material.name = mname if len(o.material_slots) == 1 else f"{mname}_{slot.material.name[:12]}"
        print("MAT:", oname, "→", [s.material.name for s in o.material_slots if s.material])

# 3) Obje adları (R3F node erişimi)
body.name = "PatientBody"
for old, new in [
    ("Human.low-poly", "PatientEyes"),
    ("Human.eyebrow006", "PatientEyebrows"),
    ("Human.eyelashes01", "PatientEyelashes"),
    ("Human.short01", "PatientHair"),
    ("Human.wdg_mycenaean_tunic", "PatientGown"),
]:
    o = bpy.data.objects.get(old)
    if o:
        o.name = new

# 4) Işık/kamera temizliği — sadece rig+meshler export edilecek
keep = {arm.name, "PatientBody", "PatientEyes", "PatientEyebrows", "PatientEyelashes", "PatientHair", "PatientGown"}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
print("EXPORT SETI:", sorted(o.name for o in bpy.data.objects))

# 5) Doku paketle (mutlak MPFB path bağımlılığı kalksın) + kaydet
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC, "patient-v2-master.blend"))
print("MASTER BLEND kaydedildi")

# 6) GLB export — skill kuralları
for o in bpy.data.objects:
    o.select_set(True)
out = os.path.join(SRC, "patient-v2-male-master.glb")
bpy.ops.export_scene.gltf(
    filepath=out,
    export_format="GLB",
    export_morph=True,
    export_morph_normal=True,
    export_skins=True,
    export_animations=True,          # 10 klinik klip korunmalı
    export_animation_mode="ACTIONS", # her action ayrı klip
    export_apply=False,              # AÇIK: morph varken modifier bake ETME
    use_selection=True,
    export_yup=True,
)
print("GLB EXPORT:", out, round(os.path.getsize(out) / 1048576, 2), "MB")
print("FAZ C TAMAM")
