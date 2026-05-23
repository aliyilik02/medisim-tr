"""
Blender headless GLB export — Fab Library .blend → glTF 2.0 .glb

Kullanım:
  blender --background --python scripts/blender-export-glb.py -- <input.blend> <output.glb>

Davranış:
- Modifier'ları apply (subsurf, mirror vb.) — render-ready geometri
- Skin (armature/rig) korur
- Shape key / morph target (blendshape) korur — yüz mimiği için kritik
- Animasyon clip'lerini export ETMEZ — base pose statik
- Cloth/hair gibi simulasyon yapıları skip
- Draco/meshopt sıkıştırma yok — sonra gltf-transform ile optimize edilir
"""
import bpy
import sys
import os


def main():
    argv = sys.argv
    if "--" not in argv:
        print("ERROR: Bash 'blender --background --python script.py -- input.blend output.glb' formatı bekleniyor.")
        sys.exit(1)
    argv = argv[argv.index("--") + 1:]
    if len(argv) < 2:
        print("ERROR: input.blend ve output.glb argümanları gerekli.")
        sys.exit(1)

    input_blend = os.path.abspath(argv[0])
    output_glb = os.path.abspath(argv[1])

    print(f"[export] input  : {input_blend}")
    print(f"[export] output : {output_glb}")

    # Open blend
    bpy.ops.wm.open_mainfile(filepath=input_blend)

    # Summary
    obj_count = len(bpy.data.objects)
    mesh_count = len(bpy.data.meshes)
    arm_count = len(bpy.data.armatures)
    mat_count = len(bpy.data.materials)
    shape_key_meshes = [m for m in bpy.data.meshes if m.shape_keys]
    total_shape_keys = sum(
        len(m.shape_keys.key_blocks) - 1 for m in shape_key_meshes  # -1 for Basis
    )
    total_verts = sum(len(m.vertices) for m in bpy.data.meshes)
    total_polys = sum(len(m.polygons) for m in bpy.data.meshes)

    print(f"[summary] objects={obj_count} meshes={mesh_count} armatures={arm_count}")
    print(f"[summary] materials={mat_count}")
    print(f"[summary] meshes with shape keys: {len(shape_key_meshes)}")
    print(f"[summary] total shape keys (morphs): {total_shape_keys}")
    print(f"[summary] total verts={total_verts:,} total polys={total_polys:,}")

    # Çoklu mesh varsa shape key dağılımı
    for m in shape_key_meshes[:10]:
        keys = [kb.name for kb in m.shape_keys.key_blocks[1:]]  # skip Basis
        print(f"[shape] {m.name}: {len(keys)} keys (sample: {keys[:5]}...)")

    # Export glTF 2.0
    output_dir = os.path.dirname(output_glb)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=output_glb,
        export_format="GLB",
        use_selection=False,
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
        print(f"[export] OK — {output_glb} ({size_mb:.2f} MB)")
    else:
        print(f"[export] FAIL — output dosyası yok")
        sys.exit(1)


if __name__ == "__main__":
    main()
