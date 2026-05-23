"""
Blender CLI: Reallusion CC3 custom shader group'larını Principled BSDF'in
düz slot'larına flatten et + supine pose + GLB export.

Kök sorun: CC3 shader group'ları (rl_pbr/rl_hair/rl_cornea/rl_eye_shader)
glTF exporter tarafından traverse edilemiyor → group içindeki Diffuse Map
asıl albedo iken, en son ulaşılan texture (genelde SSS mask) baseColor
slot'una konuyor. Three.js bunu albedo sanıp koyu/silik render ediyor.

Bu script CC group'un içinden gerçek texture node'larını bulur, Principled
BSDF'in DOĞRU input'larına direkt bağlar. Group node bırakılır (compatibility)
ama Principled BSDF artık external link kullanır → glTF exporter doğru
texture'ları tespit eder.

Pipeline: pose + rig cleanup + CC flatten + GLB export.

Kullanım:
  blender --background --python scripts/blender-cc-flatten-export.py \
    -- <input.blend> <output.glb>
"""
import bpy
import sys
import os
import re
from mathutils import Euler

DEG = 3.14159265 / 180.0

# Supine pose bone rotations (mevcut pose script'ten)
POSE_BONES = {
    "DEF-upper_arm.L": ("Y",  50 * DEG),
    "DEF-upper_arm.R": ("Y", -50 * DEG),
    "DEF-forearm.L":   ("Y",  12 * DEG),
    "DEF-forearm.R":   ("Y", -12 * DEG),
    "DEF-thigh.L":     ("Y",   3 * DEG),
    "DEF-thigh.R":     ("Y",  -3 * DEG),
    "DEF-spine.005":   ("X",   5 * DEG),  # head: hafif chin tuck
}

# Her CC shader group için: PBR slot adı → CC group input adı mapping
# (group inputs.<input_name> ↔ Principled BSDF inputs.<bsdf_input>)
SHADER_SLOT_MAP = {
    # rl_pbr_shader (cilt + giysi + tırnak)
    "rl_pbr_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Metallic":       "Metallic Map",
        "Normal":         "Normal Map",
        "Specular IOR Level": "Specular Map",
    },
    # rl_hair_shader (saç + sakal)
    "rl_hair_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Metallic":       "Metallic Map",
        "Normal":         "Normal Map",
        "Alpha":          "Alpha Map",
        "Specular IOR Level": "Specular Map",
    },
    # rl_cornea_shader (göz mercek)
    "rl_cornea_shader": {
        "Base Color":     "Cornea Diffuse Map",
        "Normal":         "Sclera Normal Map",
    },
    # rl_eye_shader (göz iris)
    "rl_eye_shader": {
        "Base Color":     "Cornea Diffuse Map",
        "Normal":         "Sclera Normal Map",
    },
    # rl_skin_shader (cilt — Skin_Arm/Body/Leg/Nails)
    "rl_skin_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Normal":         "Normal Map",
        "Specular IOR Level": "Specular Map",
    },
    # rl_head_shader (yüz / kafa cildi — Skin_Head)
    "rl_head_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Normal":         "Normal Map",
        "Specular IOR Level": "Specular Map",
    },
    # rl_tongue_shader, rl_teeth_shader (ağız iç)
    "rl_tongue_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Normal":         "Normal Map",
    },
    "rl_teeth_shader": {
        "Base Color":     "Diffuse Map",
        "Roughness":      "Roughness Map",
        "Normal":         "Normal Map",
    },
}


def find_cc_group_name(group_node):
    """CC group node tespit — HEM node.name HEM node.node_tree.name bak."""
    candidates = []
    candidates.append(group_node.name or "")
    if group_node.node_tree:
        candidates.append(group_node.node_tree.name or "")
    for s in candidates:
        m = re.search(r"\(rl_([a-z_]+)_shader", s)
        if m:
            return f"rl_{m.group(1)}_shader"
    return None


def find_texture_node_in_group(group_node, target_input_name):
    """CC group node içinde 'Diffuse Map' input'una bağlı IMAGE node'u bul."""
    if not group_node.node_tree:
        return None
    # Group içindeki node'ları tara — IMAGE_TEXTURE node'una bağlı input bul
    for inner_node in group_node.node_tree.nodes:
        if inner_node.type != "TEX_IMAGE":
            continue
        if not inner_node.image:
            continue
        # Texture node'unun bağlandığı socket'i tespit — group içinde aynı isimli input?
        # CC node naming: cc3iid_(DIFFUSE), cc3iid_(NORMAL), vb.
        # Daha basit: socket label match
        for out_link in inner_node.outputs:
            for link in out_link.links:
                target = link.to_socket
                # Target node label kontrol veya direct named input
                if target_input_name.lower() in (target.name or "").lower():
                    return inner_node
                # Veya yakın target — group node input name match
                target_node = target.node
                if hasattr(target_node, "label") and target_input_name.lower() in (target_node.label or "").lower():
                    return inner_node
    # Fallback: image name eşleşmesi (örn 'Diffuse Map' input için image adında 'Diffuse')
    name_lower = target_input_name.lower().replace(" map", "")
    for inner_node in group_node.node_tree.nodes:
        if inner_node.type != "TEX_IMAGE" or not inner_node.image:
            continue
        if name_lower in (inner_node.image.name or "").lower():
            return inner_node
    return None


def flatten_material(mat):
    """Material'ın CC shader group'unu Principled BSDF'in slot'larına bağla."""
    if not mat.use_nodes:
        return False, "no_nodes"
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links

    # Surface'den DOĞRUDAN BSDF'i bul (ilk principled değil, asıl output BSDF)
    output_node = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None)
    if not output_node:
        return False, "no_output"
    surf = output_node.inputs.get("Surface")
    if not surf or not surf.is_linked:
        return False, "surf_unlinked"
    bsdf = surf.links[0].from_node
    if bsdf.type != "BSDF_PRINCIPLED":
        return False, f"surf_not_principled:{bsdf.type}"

    # BSDF'in tüm input'larını tara — herhangi birinde CC group var mı
    cc_group = None
    cc_kind = None
    linked_summary = []
    for inp in bsdf.inputs:
        if not inp.is_linked:
            continue
        src = inp.links[0].from_node
        linked_summary.append(f"{inp.name}={src.type}")
        if src.type != "GROUP" or not src.node_tree:
            continue
        kind = find_cc_group_name(src)
        if kind:
            cc_group = src
            cc_kind = kind
            break

    if not cc_group or not cc_kind:
        return False, f"no_cc_group [{' '.join(linked_summary)}]"

    slot_map = SHADER_SLOT_MAP.get(cc_kind)
    if not slot_map:
        return False, f"unknown_cc_kind:{cc_kind}"

    # Group içinde image referansları topla — image.name + node.name + node.label
    # birlikte kullanarak token tespit (daha güvenli)
    inner_images_by_input = {}

    def token_for_image(img, node_name="", node_label=""):
        # Pattern 1: node name "cc3iid_(DIFFUSE)" tarzı
        m = re.search(r"\(([A-Z]+)\)", node_name)
        if m:
            return m.group(1).lower()
        # Pattern 2: image name içinde token (Briefs_Diffuse, Beard_Transparency_Diffuse)
        n = (img.name or "").lower()
        # Sclera/SCLERANORMAL özel kontrol önce (compound token)
        if "scleranormal" in n or ("sclera" in n and "normal" in n):
            return "scleranormal"
        if "sclera" in n:
            return "sclera"
        if "eyeblend" in n or "bcbmap" in n:
            return "eyeblend"
        if "diffuse" in n:
            return "diffuse"
        if "basecolor" in n or "base_color" in n:
            return "diffuse"
        if "normal" in n and "micro" not in n:
            return "normal"
        if "micronormal" in n or ("micro" in n and "normal" in n):
            return "micronormal"
        if "roughness" in n:
            return "roughness"
        if "metallic" in n:
            return "metallic"
        if "specular" in n:
            return "specular"
        if "opacity" in n or n.endswith("_alpha") or "_alpha" in n:
            return "alpha"
        if "_ao" in n or n.endswith("ao") or "_mnao" in n:
            return "ao"
        if "cavity" in n:
            return "cavity"
        if "sss" in n:
            return "sss"
        if "id_map" in n or "_hair_id" in n:
            return "id"
        if "root" in n:
            return "root"
        if "flow" in n:
            return "flow"
        return ""

    if cc_group.node_tree:
        for inner_node in cc_group.node_tree.nodes:
            if inner_node.type != "TEX_IMAGE" or not inner_node.image:
                continue
            token = token_for_image(
                inner_node.image,
                inner_node.name,
                getattr(inner_node, "label", "") or "",
            )
            if token:
                inner_images_by_input[token] = inner_node.image

    # CC shader input slot adından → token map
    INPUT_TOKEN = {
        "Diffuse Map": "diffuse",
        "Roughness Map": "roughness",
        "Metallic Map": "metallic",
        "Normal Map": "normal",
        "Alpha Map": "alpha",
        "Specular Map": "specular",
        "Cornea Diffuse Map": "diffuse",  # Eye/Cornea için
        "Sclera Normal Map": "scleranormal",
    }

    applied = []

    for bsdf_input_name, cc_input_name in slot_map.items():
        # Token bulup material'ın node tree'sine yeni IMAGE node kopyala
        token = INPUT_TOKEN.get(cc_input_name)
        if not token or token not in inner_images_by_input:
            continue
        img = inner_images_by_input[token]

        # Material node tree'sinde yeni IMAGE node oluştur
        new_tex = nodes.new("ShaderNodeTexImage")
        new_tex.image = img
        new_tex.location = (-600, -200 - len(applied) * 250)
        new_tex.name = f"CC_Flatten_{bsdf_input_name}"
        new_tex.label = f"{bsdf_input_name} ← {cc_input_name}"

        # Color space: Diffuse / Base Color = sRGB; diğerleri = Non-Color
        if "Base Color" in bsdf_input_name or "Diffuse" in bsdf_input_name:
            new_tex.image.colorspace_settings.name = "sRGB"
        else:
            new_tex.image.colorspace_settings.name = "Non-Color"

        # Normal için NormalMap node ekle
        if bsdf_input_name == "Normal":
            normal_map_node = nodes.new("ShaderNodeNormalMap")
            normal_map_node.location = (-300, -200 - len(applied) * 250)
            links.new(new_tex.outputs["Color"], normal_map_node.inputs["Color"])
            # BSDF normal input'una mevcut bağlantıyı kes (group → BSDF.Normal)
            target_inp = bsdf.inputs.get("Normal")
            if target_inp and target_inp.is_linked:
                for link in list(target_inp.links):
                    links.remove(link)
            if target_inp:
                links.new(normal_map_node.outputs["Normal"], target_inp)
        else:
            target_inp = bsdf.inputs.get(bsdf_input_name)
            if not target_inp:
                continue
            # Mevcut group bağlantısını kes
            if target_inp.is_linked:
                for link in list(target_inp.links):
                    links.remove(link)
            links.new(new_tex.outputs["Color"], target_inp)

        applied.append(bsdf_input_name)

    # Alpha için clip mode (hair için kritik)
    if "Alpha" in applied:
        mat.blend_method = "CLIP"
        mat.alpha_threshold = 0.5

    return True, f"flattened:{cc_kind}:{','.join(applied)}"


def apply_pose(armature):
    """Supine pose bone rotation + apply as rest."""
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")
    pose = armature.pose

    # Mute all bone constraints (rigify IK bağlamaları rotation'ı override eder)
    muted = 0
    for pb in pose.bones:
        for c in pb.constraints:
            if not c.mute:
                c.mute = True
                muted += 1
    print(f"[rig] muted {muted} bone constraints")

    applied = 0
    for bone_name, (axis, rot) in POSE_BONES.items():
        pb = pose.bones.get(bone_name)
        if not pb:
            continue
        pb.rotation_mode = "XYZ"
        e = list(pb.rotation_euler)
        idx = {"X": 0, "Y": 1, "Z": 2}[axis]
        e[idx] = rot
        pb.rotation_euler = Euler(e, "XYZ")
        applied += 1
    print(f"[pose] applied to {applied} bones")

    # Apply pose as rest pose
    bpy.ops.pose.select_all(action="SELECT")
    bpy.ops.pose.armature_apply()
    bpy.ops.object.mode_set(mode="OBJECT")
    print("[pose] applied as rest pose")


def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    if len(argv) < 2:
        print("ERROR: input.blend output.glb gerekli")
        sys.exit(1)

    blend = os.path.abspath(argv[0])
    out = os.path.abspath(argv[1])

    print(f"[open] {blend}")
    bpy.ops.wm.open_mainfile(filepath=blend)

    # 1) CC flatten her material için
    print(f"\n[flatten] processing {len(bpy.data.materials)} materials...")
    flattened = 0
    for mat in bpy.data.materials:
        ok, info = flatten_material(mat)
        status = "✓" if ok else "·"
        print(f"  {status} {mat.name}: {info}")
        if ok:
            flattened += 1
    print(f"[flatten] {flattened}/{len(bpy.data.materials)} materials flattened")

    # 2) Pose apply (mevcut armature)
    armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if armatures:
        print(f"\n[rig] applying pose to armature '{armatures[0].name}'")
        apply_pose(armatures[0])

    # 3) Rig widget cleanup
    widget_removed = 0
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and obj.name.startswith("WGT-"):
            bpy.data.objects.remove(obj, do_unlink=True)
            widget_removed += 1
    print(f"[clean] removed {widget_removed} rig widget objects")

    # 4) GLB export
    print(f"\n[export] {out}")
    out_dir = os.path.dirname(out)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=out,
        export_format="GLB",
        use_selection=False,
        use_visible=True,
        export_apply=True,
        export_skins=True,
        export_morph=True,
        export_morph_normal=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
        export_yup=True,
        export_image_format="AUTO",  # texture'lar GLB'ye gömülü
    )

    if os.path.exists(out):
        size_mb = os.path.getsize(out) / (1024 * 1024)
        print(f"[done] {out} ({size_mb:.2f} MB)")
    else:
        print(f"[done] FAIL", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
