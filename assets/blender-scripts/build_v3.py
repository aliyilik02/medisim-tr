# ============================================================
# build_v3 — Hasta v3 (B yolu: MPFB2 yenileme) parça üretimi
# ============================================================
# Kullanım:
#   blender --background --python build_v3.py -- <raw_glb> <out_prefix> <hair> <eyebrow> <eye_color> <skin>
# Çıktı: <out_prefix>-vmaster.glb (gövde + parçalar, animasyonsuz)
#        <out_prefix>-master.blend
#        <out_prefix>-face.png (Eevee yüz yakın çekim — gövdeye oturma kontrolü)
# Sonrası (node): scripts/inject-v3.mjs → optimize.
#
# v2'den farkı (10 Kas 2026, Ali Bey "insana benzemiyor"):
#  - göz: low-poly (96 vertex, BLEND) → high-poly, OPAK
#  - YENİ: diş (teeth_base) + dil (tongue01) — ağız açılınca kara boşluk yerine
#  - saç: normal haritalı aday (short02)
#  - parça yerleşimi: bbox hizasına EK olarak yüz bölgesi yer-değiştirme alanı
#    (MPFB taban ↔ ham gövde en-yakın-yüzey farkı, kNN yumuşatma) → göz/diş
#    gövdenin GERÇEK göz çukuruna/ağzına oturur.
# Gövde/iskelet/morph ham GLB'den AYNEN gelir (Mixamo rig korunur).
# ============================================================
import bpy, addon_utils, sys, os, glob, math
from mathutils import Vector, Matrix
from mathutils.bvhtree import BVHTree
from mathutils.kdtree import KDTree

sys.stdout.reconfigure(encoding="utf-8")
argv = sys.argv[sys.argv.index("--") + 1:]
RAW, OUT, HAIR, BROW, EYECOL, SKIN = argv[0], argv[1], argv[2], argv[3], argv[4], argv[5]

addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True, persistent=True)
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.locationservice import LocationService
DATA = LocationService.get_user_data()

bpy.ops.wm.read_factory_settings(use_empty=True)

# ── A: MPFB insan (build_a_human ile AYNI makrolar — 62y erkek) ──
macro = {"gender": 1.0, "age": 0.75, "muscle": 0.45, "weight": 0.55,
         "height": 0.55, "proportions": 0.5, "cupsize": 0.5, "firmness": 0.5,
         "race": {"asian": 0.1, "caucasian": 0.8, "african": 0.1}}
basemesh = HumanService.create_human(mask_helpers=True, detailed_helpers=False,
    extra_vertex_groups=True, feet_on_ground=True, scale=0.1, macro_detail_dict=macro)
skin_mhmat = (glob.glob(os.path.join(DATA, "skins", SKIN, "*.mhmat")) or [None])[0]
HumanService.set_character_skin(skin_mhmat, basemesh, skin_type="GAMEENGINE", material_instances=False)
print("SKIN:", SKIN)


def add(rel, atype):
    p = os.path.join(DATA, rel)
    o = HumanService.add_mhclo_asset(p, basemesh, asset_type=atype, material_type="MAKESKIN",
                                     subdiv_levels=0)
    print("ASSET:", atype, rel, o.name if o else "NONE", len(o.data.vertices) if o else 0)
    return o


parts = {
    "PatientEyes": add(r"eyes\high-poly\high-poly.mhclo", "Eyes"),
    "PatientEyebrows": add(os.path.join("eyebrows", BROW, BROW + ".mhclo"), "Eyebrows"),
    "PatientEyelashes": add(r"eyelashes\eyelashes01\eyelashes01.mhclo", "Eyelashes"),
    "PatientHair": add(os.path.join("hair", HAIR, HAIR + ".mhclo"), "Hair"),
    "PatientTeeth": add(r"teeth\teeth_base\teeth_base.mhclo", "Teeth"),
    "PatientTongue": add(r"tongue\tongue01\tongue01.mhclo", "Tongue"),
    "PatientGown": add(r"clothes\wdg_mycenaean_tunic\wdg_mycenaean_tunic.mhclo", "Clothes"),
}

# Göz rengi: MakeSkin materyalindeki göz dokusunu seçilen renkle değiştir.
eye_png = os.path.join(DATA, "eyes", "materials", f"{EYECOL}_eye.png")
if parts["PatientEyes"] and os.path.exists(eye_png):
    img = bpy.data.images.load(eye_png)
    for sl in parts["PatientEyes"].material_slots:
        if sl.material and sl.material.node_tree:
            for n in sl.material.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image and "eye" in n.image.name.lower():
                    n.image = img
            sl.material.blend_method = "OPAQUE" if hasattr(sl.material, "blend_method") else None
    print("EYE COLOR:", EYECOL)

# ── B: ham GLB + bbox hizası (v2 ile aynı) ──
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


def wbox(o):
    deps = bpy.context.evaluated_depsgraph_get()
    ev = o.evaluated_get(deps)
    pts = [ev.matrix_world @ Vector(c) for c in ev.bound_box]
    return (Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts))),
            Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts))))


bmn, bmx = wbox(body)
hmn, hmx = wbox(basemesh)
s = (bmx.z - bmn.z) / (hmx.z - hmn.z)
roots = [basemesh] + [p for p in parts.values() if p]
for o in roots:
    if o.parent in roots:
        continue
    o.matrix_world = Matrix.Scale(s, 4) @ o.matrix_world
bpy.context.view_layer.update()
hmn2, hmx2 = wbox(basemesh)
T = Matrix.Translation(Vector(((bmn.x + bmx.x) / 2 - (hmn2.x + hmx2.x) / 2,
                               (bmn.y + bmx.y) / 2 - (hmn2.y + hmx2.y) / 2,
                               bmn.z - hmn2.z)))
for o in roots:
    if o.parent in roots:
        continue
    o.matrix_world = T @ o.matrix_world
bpy.context.view_layer.update()
print("HIZA s:", round(s, 4))

# ── B2: yüz bölgesi yer-değiştirme alanı (MPFB taban → ham gövde) ──
# Değerlendirilmiş (deform sonrası) dünya koordinatları.
deps = bpy.context.evaluated_depsgraph_get()


def world_verts(o):
    ev = o.evaluated_get(deps)
    me = ev.to_mesh()
    vs = [ev.matrix_world @ v.co for v in me.vertices]
    ev.to_mesh_clear()
    return vs


body_ev = body.evaluated_get(deps)
bme = body_ev.to_mesh()
bverts = [body_ev.matrix_world @ v.co for v in bme.vertices]
bpolys = [tuple(p.vertices) for p in bme.polygons]
body_ev.to_mesh_clear()
bvh = BVHTree.FromPolygons(bverts, bpolys)

base_w = world_verts(basemesh)
height = bmx.z - bmn.z
neck_z = bmn.z + height * 0.80  # boyun üstü (yalnız baş bölgesi alanı)
field_pts, field_disp = [], []
for v in base_w:
    if v.z < neck_z:
        continue
    loc, nrm, idx, dist = bvh.find_nearest(v)
    if loc is None or dist > height * 0.03:  # 3% boydan uzak eşleşme = gürültü
        continue
    field_pts.append(v)
    field_disp.append(loc - v)
kd = KDTree(len(field_pts))
for i, p in enumerate(field_pts):
    kd.insert(p, i)
kd.balance()
print("ALAN noktası:", len(field_pts), "ort. |d| mm:",
      round(sum(d.length for d in field_disp) / max(1, len(field_disp)) * 1000 / s * 0.1, 2) if field_disp else 0)


def field_at(p, k=16):
    acc, wsum = Vector((0, 0, 0)), 0.0
    for (co, i, d) in kd.find_n(p, k):
        w = 1.0 / (d + 1e-4) ** 2
        acc += field_disp[i] * w
        wsum += w
    return acc / wsum if wsum else acc


RIGID = {"PatientEyes", "PatientTeeth", "PatientTongue"}  # şekli bozulmasın → ortalama öteleme
for name, o in parts.items():
    if not o or name == "PatientGown":
        continue
    ev = o.evaluated_get(deps)
    mw = o.matrix_world.copy()
    inv = mw.inverted()
    pts = [mw @ v.co for v in o.data.vertices]
    if name in RIGID:
        # Gözler: sol/sağ ayrı öteleme (x işaretine göre)
        groups = {}
        for i, p in enumerate(pts):
            key = (1 if p.x > (bmn.x + bmx.x) / 2 else -1) if name == "PatientEyes" else 0
            groups.setdefault(key, []).append(i)
        for key, ids in groups.items():
            c = sum((pts[i] for i in ids), Vector()) / len(ids)
            d = field_at(c, 24)
            for i in ids:
                o.data.vertices[i].co = inv @ (pts[i] + d)
            print("RIJIT", name, key, "öteleme mm:", [round(x * 1000 / s * 0.1, 1) for x in d])
    else:
        for i, p in enumerate(pts):
            o.data.vertices[i].co = inv @ (p + field_at(p))
        print("ALAN", name, "uygulandı")
bpy.context.view_layer.update()

# ── UV aktarımı: ADA-TUTARLI (v2'nin DataTransfer'ı yerine) ──
# Ham ağın yüzleri MakeHuman yüzleriyle birebir örtüşmüyor; POLYINTERP_NEAREST
# ada sınırındaki yüzlerin köşelerini İKİ adadan örnekliyordu → üçgen dokuda
# baş adasından gövde adasına uzanıp aradakini boyuyordu (koyu boyun halkası,
# 10 Kas 2026). Burada: her ham yüz, merkezine en yakın taban yüzünün UV
# ADASINA atanır; köşelerin UV'si YALNIZ o adanın üçgenlerinden barisentrik
# örneklenir. Ada değişen kenarlar doğal UV dikişi olur (glTF köşeyi böler).
from bpy_extras.mesh_utils import mesh_linked_uv_islands
from mathutils.geometry import barycentric_transform

deps = bpy.context.evaluated_depsgraph_get()
b_ev = basemesh.evaluated_get(deps)
b_me = b_ev.to_mesh()
b_me.calc_loop_triangles()
b_uv = b_me.uv_layers.active.data
b_mw = b_ev.matrix_world
b_co = [b_mw @ v.co for v in b_me.vertices]
poly_island = {}
for isl_i, faces in enumerate(mesh_linked_uv_islands(b_me)):
    for f in faces:
        poly_island[f] = isl_i
tris_by_island = {}
for t in b_me.loop_triangles:
    tris_by_island.setdefault(poly_island.get(t.polygon_index, -1), []).append(t)
all_tris = list(b_me.loop_triangles)
glob_bvh = BVHTree.FromPolygons(b_co, [tuple(t.vertices) for t in all_tris])
isl_bvh = {}
for isl, ts in tris_by_island.items():
    isl_bvh[isl] = (BVHTree.FromPolygons(b_co, [tuple(t.vertices) for t in ts]), ts)
print("taban UV adası:", len(isl_bvh))


def uv_from(tri, p):
    a, b, c = (b_co[v] for v in tri.vertices)
    ua, ub, uc = (Vector((b_uv[l].uv[0], b_uv[l].uv[1], 0.0)) for l in tri.loops)
    r = barycentric_transform(p, a, b, c, ua, ub, uc)
    return (r.x, r.y)


r_me = body.data
r_mw = body.matrix_world
r_co = [r_mw @ v.co for v in r_me.vertices]
uvl = r_me.uv_layers.active or r_me.uv_layers.new(name="UVMap")
used = {}
for poly in r_me.polygons:
    center = sum((r_co[v] for v in poly.vertices), Vector()) / len(poly.vertices)
    _, _, ti, _ = glob_bvh.find_nearest(center)
    isl = poly_island.get(all_tris[ti].polygon_index, -1)
    used[isl] = used.get(isl, 0) + 1
    bvh, ts = isl_bvh[isl]
    for li, vi in zip(poly.loop_indices, poly.vertices):
        loc, _, tj, _ = bvh.find_nearest(r_co[vi])
        uvl.data[li].uv = uv_from(ts[tj], loc)
b_ev.to_mesh_clear()
print("UV ada-tutarlı aktarım OK — kullanılan ada:", len(used))

# ── D: parçalar armature-uzayına; yüz parçaları Head'e rijit, önlük weight transfer ──
HEADB = next(b.name for b in arm.data.bones if b.name.endswith("Head") or b.name.endswith(":Head"))
inv = arm.matrix_world.inverted()
for newname, o in parts.items():
    if not o:
        continue
    for m in list(o.modifiers):
        o.modifiers.remove(m)
    o.data.transform(inv @ o.matrix_world)
    o.parent = arm
    o.parent_type = "OBJECT"
    o.matrix_parent_inverse.identity()
    o.matrix_basis = Matrix.Identity(4)
    o.vertex_groups.clear()
    if newname == "PatientGown":
        bpy.ops.object.select_all(action="DESELECT")
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        dt = o.modifiers.new("W", "DATA_TRANSFER")
        dt.object = body
        dt.use_vert_data = True
        dt.data_types_verts = {"VGROUP_WEIGHTS"}
        dt.vert_mapping = "POLYINTERP_NEAREST"
        bpy.ops.object.datalayout_transfer(modifier=dt.name)
        bpy.ops.object.modifier_apply(modifier=dt.name)
    else:
        vg = o.vertex_groups.new(name=HEADB)
        vg.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")
    am = o.modifiers.new("Armature", "ARMATURE")
    am.object = arm
    for sl in o.material_slots:
        if sl.material:
            sl.material.name = newname.replace("Patient", "") + "_Mat"
    o.name = newname
    print("PART OK:", newname, len(o.data.vertices))

# Gövde materyali (doku inject aşamasında değiştirilebilir — UV aynı)
skin_mat = next((sl.material for sl in basemesh.material_slots if sl.material), None)
body.data.materials.clear()
body.data.materials.append(skin_mat)
skin_mat.name = "Skin_Body"
body.name = "PatientBody"

keep = {arm.name, "PatientBody", *parts.keys()}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)

bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=OUT + "-master.blend")
for o in bpy.data.objects:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT + "-vmaster.glb", export_format="GLB", export_morph=True,
                          export_morph_normal=True, export_skins=True, export_animations=False,
                          export_apply=False, use_selection=True, export_yup=True)
print("EXPORT:", round(os.path.getsize(OUT + "-vmaster.glb") / 1048576, 2), "MB")

# (Kontrol render kaldırıldı: karar oyun içi /dev/hasta-aday ekran görüntüsüyle verilir.)
