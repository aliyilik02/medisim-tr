"""
Blender headless — Fab Library .blend (T-pose) → klinik supine pose .glb export.

Pipeline:
1. .blend aç
2. Armature'i bul, pose mode'a geç
3. Rigify FK bone'larını rotate:
   - upper_arm_fk.L/R: kolu yana indir (local Z ~ -75°)
   - forearm_fk.L/R: hafif dirsek bükümü (~10°)
   - thigh_fk.L/R: hafif dış rotasyon (~5°)
   - head: hafif chin tuck (~5° X)
4. Pose → Apply Pose as Rest Pose (mesh deformation kalır, rig nötrlenir)
5. Rig widget mesh'leri sil
6. GLB export (apply modifiers + skins + morph)

Kullanım:
  blender --background --python scripts/blender-pose-supine-export.py -- <input.blend> <output.glb>
"""
import bpy
import sys
import os
import re
import math


WIDGET_PATTERN = re.compile(r"^WGT-")

# Rigify FK kontrol bone'ları + rotation (radyan).
# Rigify konvansiyonu: bone local Y = bone uzun ekseni (head → tail).
# Kol T-pose'da yatay uzanıyor (omuzdan parmağa doğru +X ekseni). Yana indirmek
# için local Z etrafında negatif (sağ kol) / pozitif (sol kol) açı. Aslında
# Rigify rig'in kol-uçları yatay X-axis boyunca, Z bone-up. Kolu aşağıya
# indirmek = local Z rotasyonu yerine local X rotasyonu (omuzu mafsal olarak
# kullanıp bone'u "öne-aşağı" döndürmek değil, "aşağı" döndürmek). Test ettim:
# `upper_arm_fk.L` için Euler (X=0, Y=0, Z=-1.30) → sol kol yanına iniyor.
# .R için aynı eksen pozitif: Z=+1.30 (mirror).
#
# Açıklama: pose_bone.rotation_mode = 'XYZ' iken Euler (X,Y,Z).
# rotation_euler.x = bone local X ekseni etrafında (humeri ön/arka kaldırma)
# rotation_euler.y = bone local Y (humerus ekseni — twist)
# rotation_euler.z = bone local Z (kol yan kaldırma / abdüksiyon — flexion)

# Açı değerleri radyan:
DEG = math.pi / 180.0

# World-axis rotation strategy — bone local frame asymmetry'sini bypass et.
# Local Z L ve R için world -Y olsa da, "Pose → Apply as Rest" sırasında bone
# roll farkları nedeniyle L/R simetrik etki vermedi (testte). World axis
# rotation simetrik kalır: L için pozitif Y axis = R için negatif Y axis.
#
# World convention: +X sağa, +Y yukarı (Blender Z-up'a göre +Y=arka, +Z=yukarı).
# Bekle — Blender DEFAULT Z-up. Yani +Z = yukarı, +Y = arkadan.
# Kolu aşağı indirmek için pivot ekseni = world Y (vücut ön-arka ekseni).
#
# World Y axis rotation 55° L için pozitif → bone'un X+ tarafı -Z'ye iner = ✓
# World Y axis rotation -55° R için → bone'un X- tarafı -Z'ye iner = ✓

POSE_ROTATIONS_WORLD = {
    # Kollar — world Y axis (vücut ön-arka). Pozitif = L kolu aşağı, negatif = R kolu aşağı.
    "DEF-upper_arm.L": ("Y",  55 * DEG),
    "DEF-upper_arm.R": ("Y", -55 * DEG),

    # Forearm hafif dirsek bükümü (~12°).
    "DEF-forearm.L":   ("Y",  12 * DEG),
    "DEF-forearm.R":   ("Y", -12 * DEG),

    # Bacaklar — hafif dış rotasyon (~5°), femur uzun ekseni (world Z) etrafında twist.
    "DEF-thigh.L":     ("Z",   5 * DEG),
    "DEF-thigh.R":     ("Z",  -5 * DEG),

    # Baş — hafif chin tuck (~5°). World X axis = sol-sağ ekseni etrafında öne eğilim.
    "DEF-spine.006":   ("X",   5 * DEG),
}


def find_armature():
    armatures = [o for o in bpy.data.objects if o.type == "ARMATURE"]
    if not armatures:
        return None
    # Birden fazlaysa en çok bone'a sahip olanı seç (asıl karakter rig'i)
    armatures.sort(key=lambda a: len(a.data.bones), reverse=True)
    return armatures[0]


def disable_all_bone_constraints(armature):
    """Tüm pose bone constraint'lerini mute et. Rigify rig'inde DEF bone'lar
    constraint chain'inin sonunda — bu mute olunca rotation doğrudan deform
    eder ve armature_apply güvenle çalışır."""
    n_muted = 0
    for pb in armature.pose.bones:
        for c in pb.constraints:
            if not c.mute:
                c.mute = True
                n_muted += 1
    print(f"[rig] muted {n_muted} bone constraints")


def apply_pose_rotations(armature):
    """Pose mode'da DEF bone'lara WORLD-SPACE rotation uygula.

    Local frame karışıklığı (bone roll, L/R asymmetric local Z) yerine
    her bone için world-space Y/X/Z axis rotation kullanıyoruz. World axis
    rotation hem L hem R'de simetrik etki yapar. Bunu bone'un pose matrix'e
    pre-multiplikasyon ile uygularız.

    POSE_ROTATIONS_WORLD dict: bone_name → (axis_str, angle_radians).
    axis_str: 'X', 'Y', 'Z' (world space).
    """
    import mathutils

    # Active object olarak armature'i set et
    bpy.context.view_layer.objects.active = armature
    armature.hide_viewport = False
    armature.hide_set(False)

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)

    # Constraint'leri mute
    disable_all_bone_constraints(armature)

    # Pose mode
    bpy.ops.object.mode_set(mode="POSE")

    applied = []
    missing = []
    for bone_name, (axis_str, angle) in POSE_ROTATIONS_WORLD.items():
        pbone = armature.pose.bones.get(bone_name)
        if pbone is None:
            missing.append(bone_name)
            continue
        # World axis quaternion
        world_axis = mathutils.Vector({"X": (1, 0, 0), "Y": (0, 1, 0), "Z": (0, 0, 1)}[axis_str])
        world_rot = mathutils.Quaternion(world_axis, angle).to_matrix().to_4x4()

        # Bone'un mevcut world matrix'i (armature space, identity pose'da rest matrix)
        # pose_bone.matrix = world transform of bone in armature object space.
        # Rotation around world axis going through bone HEAD: T(head) * R * T(-head) * M
        head_world = pbone.head.copy()
        T_pos = mathutils.Matrix.Translation(head_world)
        T_neg = mathutils.Matrix.Translation(-head_world)
        new_matrix = T_pos @ world_rot @ T_neg @ pbone.matrix
        pbone.matrix = new_matrix

        applied.append(f"{bone_name} = world-{axis_str} {math.degrees(angle):+.1f}°")

    print(f"[pose] applied world-axis rotations to {len(applied)} bones:")
    for line in applied:
        print(f"  - {line}")
    if missing:
        print(f"[pose] WARNING: missing bones: {missing}")

    bpy.ops.pose.select_all(action="SELECT")
    bpy.context.view_layer.update()


def bake_armature_to_meshes_keep_shapekeys(armature):
    """Shape key'leri muhafaza ederek armature deformasyonunu mesh vertex'lere
    bake et. Workflow:
    1) Her mesh için evaluated pose-deformed vertex pozisyonlarını al.
    2) Bu pozisyonları mesh'in Basis shape key data'sına yaz.
    3) Diğer shape key'ler (Basis'e relative) için aynı delta'yı koruyacak
       şekilde rebake et (deltas absolute → original Basis'e delta → yeni
       Basis'e absolute → yeni delta).
    """
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()

    mesh_objs = [o for o in bpy.data.objects if o.type == "MESH"]
    n_baked = 0
    for mesh_obj in mesh_objs:
        if mesh_obj.hide_viewport:
            continue
        arm_mods = [m for m in mesh_obj.modifiers if m.type == "ARMATURE" and m.object == armature]
        if not arm_mods:
            continue

        # Evaluated mesh (pose-deformed vertex'ler dahil)
        eval_obj = mesh_obj.evaluated_get(depsgraph)
        eval_mesh = eval_obj.to_mesh()
        n_verts = len(eval_mesh.vertices)
        if n_verts != len(mesh_obj.data.vertices):
            print(f"[bake] WARNING: vertex count mismatch on {mesh_obj.name}: {n_verts} vs {len(mesh_obj.data.vertices)}")
            eval_obj.to_mesh_clear()
            continue

        # Pose-deformed vertex pozisyonlarını topla
        deformed = [v.co.copy() for v in eval_mesh.vertices]
        eval_obj.to_mesh_clear()

        # Shape key'leri var mı?
        sk = mesh_obj.data.shape_keys
        if sk and sk.key_blocks:
            # Basis shape key'i bul ve her shape key için:
            # - Original Basis pozisyonunu hatırla
            # - Shape key delta'sını koru (sk_pos - orig_basis_pos)
            # - Yeni Basis = deformed
            # - Yeni shape key pos = deformed + delta
            basis = sk.key_blocks[0]  # genelde "Basis"
            orig_basis = [d.co.copy() for d in basis.data]

            # Her shape key (Basis dahil) için yeni pozisyonları hesapla
            for kb in sk.key_blocks:
                if kb.name == basis.name:
                    # Basis = deformed
                    for i, d in enumerate(kb.data):
                        d.co = deformed[i]
                else:
                    # delta = kb.data[i].co - orig_basis[i]
                    # new = deformed[i] + delta
                    for i, d in enumerate(kb.data):
                        delta = d.co - orig_basis[i]
                        d.co = deformed[i] + delta
        else:
            # Shape key yoksa direkt vertex'leri update et
            for i, v in enumerate(mesh_obj.data.vertices):
                v.co = deformed[i]

        n_baked += 1

    print(f"[bake] baked pose deformation onto {n_baked} mesh(es), shape keys preserved")
    return mesh_objs


def apply_pose_as_rest(armature):
    """Doğru sıra:
    1) Mesh'in pose-deformed vertex pozisyonlarını al + shape key'leri muhafaza
       ederek mesh data'sına yaz (custom bake — modifier_apply shape keys'le
       çalışmıyor).
    2) Pose → Apply Pose as Rest Pose (armature bone matrix'leri yeni rest pose).
    Mesh'in armature modifier'ı dokunulmaz — mesh artık yeni rest pose'da bind,
    pose nötr (Identity), sonuç: model yeni pose'da görünür.
    """
    # Object mode garanti
    if bpy.context.mode != "OBJECT":
        try:
            bpy.ops.object.mode_set(mode="OBJECT")
        except RuntimeError:
            pass

    # 1) Mesh'leri custom bake et
    bake_armature_to_meshes_keep_shapekeys(armature)

    # 2) Armature'i select + active
    bpy.ops.object.select_all(action="DESELECT")
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    bpy.ops.object.mode_set(mode="POSE")

    # 3) Pose → Apply as Rest Pose
    try:
        bpy.ops.pose.armature_apply(selected=False)
        print("[pose] applied pose as rest pose")
    except TypeError:
        bpy.ops.pose.armature_apply()

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()


def cleanup_rig_widgets():
    widget_removed = 0
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and WIDGET_PATTERN.match(obj.name):
            bpy.data.objects.remove(obj, do_unlink=True)
            widget_removed += 1
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0 or WIDGET_PATTERN.match(mesh.name):
            bpy.data.meshes.remove(mesh)
    print(f"[clean] removed {widget_removed} rig widget objects")


def render_preview(output_dir):
    """Pose'u doğrulamak için 2-view orthographic preview render."""
    try:
        scene = bpy.context.scene
        # Available engines vary by Blender build; pick first that works.
        for engine_id in ("BLENDER_EEVEE_NEXT", "BLENDER_EEVEE", "BLENDER_WORKBENCH"):
            try:
                scene.render.engine = engine_id
                break
            except TypeError:
                continue
        scene.render.resolution_x = 500
        scene.render.resolution_y = 900
        # Background
        if scene.world is None:
            scene.world = bpy.data.worlds.new("BG")
        scene.world.use_nodes = True
        bg = scene.world.node_tree.nodes.get("Background")
        if bg:
            bg.inputs[0].default_value = (0.12, 0.14, 0.17, 1.0)
            bg.inputs[1].default_value = 1.0

        # Lighting
        bpy.ops.object.light_add(type="SUN", location=(2, -2, 3))
        bpy.context.object.data.energy = 4.0
        bpy.ops.object.light_add(type="AREA", location=(-2, -2, 2))
        bpy.context.object.data.energy = 150
        bpy.ops.object.light_add(type="AREA", location=(0, 2, 2))
        bpy.context.object.data.energy = 80

        for view_name, location in [
            ("front", (0, -3, 0.9)),
            ("side",  (3, 0, 0.9)),
        ]:
            cam_data = bpy.data.cameras.new(f"Cam_{view_name}")
            cam_data.type = "ORTHO"
            cam_data.ortho_scale = 2.4
            cam_obj = bpy.data.objects.new(f"Cam_{view_name}", cam_data)
            scene.collection.objects.link(cam_obj)
            scene.camera = cam_obj
            cam_obj.location = location

            bpy.ops.object.empty_add(location=(0, 0, 0.9))
            target = bpy.context.object
            constraint = cam_obj.constraints.new(type="TRACK_TO")
            constraint.target = target
            constraint.track_axis = "TRACK_NEGATIVE_Z"
            constraint.up_axis = "UP_Y"

            output_path = os.path.join(output_dir, f"pose-preview-{view_name}.png")
            scene.render.filepath = output_path
            bpy.ops.render.render(write_still=True)
            print(f"[render] {output_path}")

            bpy.data.objects.remove(cam_obj, do_unlink=True)
            bpy.data.objects.remove(target, do_unlink=True)
    except Exception as e:
        print(f"[render] WARNING: preview render failed: {e}")


def export_glb(output_glb):
    output_dir = os.path.dirname(output_glb)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f"[export] writing {output_glb}")
    bpy.ops.export_scene.gltf(
        filepath=output_glb,
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
    )

    if os.path.exists(output_glb):
        size_mb = os.path.getsize(output_glb) / (1024 * 1024)
        print(f"[done] {output_glb} ({size_mb:.2f} MB)")
    else:
        print(f"[done] FAIL — output yok", file=sys.stderr)
        sys.exit(1)


def main():
    argv = sys.argv
    if "--" not in argv:
        print("ERROR: '--' separator gerekli", file=sys.stderr)
        sys.exit(1)
    argv = argv[argv.index("--") + 1:]
    if len(argv) < 2:
        print("ERROR: input.blend ve output.glb argümanları gerekli", file=sys.stderr)
        sys.exit(1)

    input_blend = os.path.abspath(argv[0])
    output_glb = os.path.abspath(argv[1])

    print(f"[open] {input_blend}")
    bpy.ops.wm.open_mainfile(filepath=input_blend)

    # 1) Object mode garantisi
    if bpy.context.object and bpy.context.object.mode != "OBJECT":
        bpy.ops.object.mode_set(mode="OBJECT")

    # 2) Armature'i bul
    armature = find_armature()
    if armature is None:
        print("ERROR: armature bulunamadı", file=sys.stderr)
        sys.exit(1)
    print(f"[rig] armature: '{armature.name}' (bones: {len(armature.data.bones)})")

    # 3) Pose rotation'ları uygula
    apply_pose_rotations(armature)

    # 4) Pose'u rest pose olarak apply
    apply_pose_as_rest(armature)

    # 5) Rig widget'larını sil
    cleanup_rig_widgets()

    # 6) Hidden mesh kontrol (Fab modelde explicit cloth yok ama emin ol)
    n_hidden = sum(1 for o in bpy.data.objects if o.type == "MESH" and o.hide_viewport)
    print(f"[info] hidden mesh count: {n_hidden}")

    # 7) Pose preview render (debug)
    if os.environ.get("POSE_PREVIEW", "0") == "1":
        preview_dir = os.path.dirname(output_glb)
        render_preview(preview_dir)

    # 8) Export
    export_glb(output_glb)


if __name__ == "__main__":
    main()
