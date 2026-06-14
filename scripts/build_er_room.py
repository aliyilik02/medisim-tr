# ============================================================
# MediSim TR — Acil Servis Odası prosedürel üretim (headless Blender)
# ============================================================
# Çalıştırma:
#   "blender.exe" -b -P scripts/build_er_room.py -- <cikti.glb>
# Üretir: gerçek geometri oda (zemin/duvar/tavan ayrı düzlemler, normaller İÇERİ,
# tek-taraflı), CC0 PBR dokulu (ambientCG Tiles107 zemin + PaintedPlaster017 duvar),
# süpürgelik, brand-teal aksan şerit, 2 emissive tavan ışık paneli.
# bbox (glTF Y-up): X[-2.5,2.5] Y[0,2.6] Z[-2,2] — mevcut er-room.glb ile birebir.
# Dokular GLB'ye gömülü (JPG 1K). KTX2 sonraki optimizasyon.
# Lisans: ambientCG CC0 — ticari kullanım serbest, atıfsız.
# ============================================================
import bpy, bmesh, sys, os
from mathutils import Vector

argv = sys.argv
out_path = argv[argv.index("--") + 1] if "--" in argv else "//er-room-raw.glb"
TEX = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tex")

bpy.ops.wm.read_factory_settings(use_empty=True)

HW, HD, H = 2.5, 2.0, 2.6  # yarı-genişlik(X), yarı-derinlik(Y), yükseklik(Z)

# ---- materyal yardımcıları ----
def _img(path, non_color=False):
    img = bpy.data.images.load(path, check_existing=True)
    if non_color:
        img.colorspace_settings.name = "Non-Color"
    return img

def mat_flat(name, color, rough=0.8, metal=0.0, emit=None, emit_strength=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.use_backface_culling = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if emit is not None:
        b.inputs["Emission Color"].default_value = (*emit, 1.0)
        b.inputs["Emission Strength"].default_value = emit_strength
    return m

def mat_pbr(name, prefix, color_f, normal_f, rough_f):
    """ambientCG doku setinden PBR materyal (Color+NormalGL+Roughness)."""
    m = bpy.data.materials.new(name); m.use_nodes = True
    m.use_backface_culling = True
    nt = m.node_tree; b = nt.nodes.get("Principled BSDF")
    d = os.path.join(TEX, prefix)
    # base color
    c = nt.nodes.new("ShaderNodeTexImage"); c.image = _img(os.path.join(d, color_f))
    nt.links.new(c.outputs["Color"], b.inputs["Base Color"])
    # roughness
    r = nt.nodes.new("ShaderNodeTexImage"); r.image = _img(os.path.join(d, rough_f), non_color=True)
    nt.links.new(r.outputs["Color"], b.inputs["Roughness"])
    # normal (GL)
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = _img(os.path.join(d, normal_f), non_color=True)
    nm = nt.nodes.new("ShaderNodeNormalMap")
    nt.links.new(n.outputs["Color"], nm.inputs["Color"])
    nt.links.new(nm.outputs["Normal"], b.inputs["Normal"])
    return m

mat_floor   = mat_pbr("Floor_Tiles", "Tiles107",
                      "Tiles107_1K-JPG_Color.jpg", "Tiles107_1K-JPG_NormalGL.jpg", "Tiles107_1K-JPG_Roughness.jpg")
mat_wall    = mat_pbr("Wall_Plaster", "PaintedPlaster017",
                      "PaintedPlaster017_1K-JPG_Color.jpg", "PaintedPlaster017_1K-JPG_NormalGL.jpg", "PaintedPlaster017_1K-JPG_Roughness.jpg")
mat_ceiling = mat_flat("Ceiling", (0.88, 0.91, 0.93), rough=0.95)
mat_base    = mat_flat("Baseboard", (0.20, 0.23, 0.25), rough=0.5, metal=0.15)
mat_accent  = mat_flat("Accent_Teal", (0.05, 0.40, 0.38), rough=0.6)
mat_panel   = mat_flat("LightPanel", (0.95, 0.97, 1.0), rough=0.3, emit=(0.95, 0.97, 1.0), emit_strength=4.0)

# ---- tek quad düzlem (UV tiling, normal winding ile içeri) ----
def quad(name, p0, p1, p2, p3, uvx, uvy, mat):
    me = bpy.data.meshes.new(name); o = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(o)
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in (p0, p1, p2, p3)]
    f = bm.faces.new(vs)
    bm.normal_update()
    uv = bm.loops.layers.uv.new("UVMap")
    uvs = [(0, 0), (uvx, 0), (uvx, uvy), (0, uvy)]
    for i, loop in enumerate(f.loops):
        loop[uv].uv = uvs[i]
    bm.to_mesh(me); bm.free()
    o.data.materials.append(mat)
    return o

# Floor (normal +Z)
quad("Floor", (-HW,-HD,0),(HW,-HD,0),(HW,HD,0),(-HW,HD,0), 4.0, 3.2, mat_floor)
# Ceiling (normal -Z) — ters winding
quad("Ceiling", (-HW,-HD,H),(-HW,HD,H),(HW,HD,H),(HW,-HD,H), 4.0, 3.2, mat_ceiling)
# Back wall -Y (normal +Y)
quad("Wall_back", (-HW,-HD,0),(-HW,-HD,H),(HW,-HD,H),(HW,-HD,0), 2.6, 1.4, mat_wall)
# Front wall +Y (normal -Y)
quad("Wall_front", (HW,HD,0),(HW,HD,H),(-HW,HD,H),(-HW,HD,0), 2.6, 1.4, mat_wall)
# Left wall -X (normal +X)
quad("Wall_left", (-HW,HD,0),(-HW,HD,H),(-HW,-HD,H),(-HW,-HD,0), 2.1, 1.4, mat_wall)
# Right wall +X (normal -X)
quad("Wall_right", (HW,-HD,0),(HW,-HD,H),(HW,HD,H),(HW,HD,0), 2.1, 1.4, mat_wall)

# ---- kutu yardımcı (süpürgelik/şerit) ----
def box(name, cx, cy, cz, sx, sy, sz, mat):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(cx, cy, cz))
    o = bpy.context.active_object; o.name = name
    o.scale = (sx, sy, sz)
    bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat)
    return o

# süpürgelik
bh, bt = 0.12, 0.03
box("Base_-Y", 0, -HD+bt/2, bh/2, 2*HW, bt, bh, mat_base)
box("Base_+Y", 0,  HD-bt/2, bh/2, 2*HW, bt, bh, mat_base)
box("Base_-X", -HW+bt/2, 0, bh/2, bt, 2*HD, bh, mat_base)
box("Base_+X",  HW-bt/2, 0, bh/2, bt, 2*HD, bh, mat_base)

# brand-teal aksan şerit (z~1.35)
az, ah, at = 1.35, 0.10, 0.015
box("Accent_-Y", 0, -HD+at/2, az, 2*HW, at, ah, mat_accent)
box("Accent_-X", -HW+at/2, 0, az, at, 2*HD, ah, mat_accent)
box("Accent_+X",  HW-at/2, 0, az, at, 2*HD, ah, mat_accent)

# ---- tavan ışık panelleri (emissive, normal aşağı) ----
def panel(name, cx, cy):
    pw, pd = 1.4, 0.7; z = H - 0.02
    # winding normal -Z (aşağı, odadan görünsün)
    quad(name, (cx-pw/2,cy-pd/2,z),(cx-pw/2,cy+pd/2,z),(cx+pw/2,cy+pd/2,z),(cx+pw/2,cy-pd/2,z), 1, 1, mat_panel)
panel("Light_L", -1.2, 0)
panel("Light_R",  1.2, 0)

# ---- export ----
bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=out_path, export_format="GLB", export_apply=True,
    export_yup=True, use_selection=True, export_materials="EXPORT",
)
print("ER_ROOM_EXPORT_OK", out_path)
