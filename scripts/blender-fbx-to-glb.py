"""
Blender CLI: FBX import → texture pack → glTF (.glb) export.
Microsoft Rocketbox karakterleri için: standart PBR + TGA texture.

Kullanım:
  blender --background --python scripts/blender-fbx-to-glb.py \
    -- <input.fbx> <output.glb>
"""
import bpy
import sys
import os


def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    if len(argv) < 2:
        print("ERROR: input.fbx output.glb gerekli")
        sys.exit(1)

    fbx_in = os.path.abspath(argv[0])
    glb_out = os.path.abspath(argv[1])

    # Sahneyi temizle
    bpy.ops.wm.read_homefile(use_empty=True)

    # FBX import — Rocketbox modeli +Z up (Maya/3ds Max convention)
    print(f"[import] {fbx_in}")
    bpy.ops.import_scene.fbx(
        filepath=fbx_in,
        automatic_bone_orientation=True,
        use_anim=False,  # animation export'a almıyoruz
    )

    # Initial summary
    n_obj = len(bpy.data.objects)
    n_mesh = len([o for o in bpy.data.objects if o.type == "MESH"])
    n_arm = len([o for o in bpy.data.objects if o.type == "ARMATURE"])
    n_img = len(bpy.data.images)
    print(f"[loaded] objects={n_obj} meshes={n_mesh} armatures={n_arm} images={n_img}")

    # Texture path düzeltme — Microsoft FBX'leri build server path'i içerir
    # (D:\temp\Humans\...). Lokal Textures klasörüne yönlendir.
    fbx_dir = os.path.dirname(fbx_in)
    # Rocketbox yapısı: Export/<fbx>, kardeş Textures/ klasörü
    textures_dir = os.path.join(os.path.dirname(fbx_dir), "Textures")
    if not os.path.exists(textures_dir):
        textures_dir = os.path.join(fbx_dir, "Textures")
    print(f"[texture-resolve] looking in: {textures_dir}")

    relinked = 0
    missing = []
    for img in bpy.data.images:
        if img.source != "FILE":
            continue
        # Image.name "Bitmaptexture/Map #1" 3ds Max default — kullanma.
        # Orijinal filepath'ten (D:\temp\...\m002_body_specular.tga) basename çıkar.
        orig_path = img.filepath_raw or img.filepath or ""
        # Windows \ veya Unix / olabilir
        orig_basename = orig_path.replace("\\", "/").split("/")[-1]
        if not orig_basename:
            missing.append(f"{img.name}(no_path)")
            continue
        candidate = os.path.join(textures_dir, orig_basename)
        if os.path.exists(candidate):
            img.filepath = candidate
            img.filepath_raw = candidate
            try:
                img.reload()
            except Exception as e:
                print(f"  reload fail {orig_basename}: {e}")
            relinked += 1
        else:
            missing.append(orig_basename)
    print(f"[texture-resolve] relinked={relinked} missing={missing}")

    # Texture'ları .blend'e pack et (external TGA → embedded)
    print(f"[pack] packing images into blend")
    bpy.ops.file.pack_all()

    # Image color space ayarla — Blender FBX import default Non-Color verir,
    # color/diffuse map'leri sRGB'ye almalı.
    for img in bpy.data.images:
        n_lower = (img.name or "").lower()
        if "color" in n_lower and "normal" not in n_lower and "specular" not in n_lower:
            img.colorspace_settings.name = "sRGB"
        elif "normal" in n_lower or "specular" in n_lower:
            img.colorspace_settings.name = "Non-Color"

    # glTF export
    out_dir = os.path.dirname(glb_out)
    if out_dir and not os.path.exists(out_dir):
        os.makedirs(out_dir, exist_ok=True)

    print(f"[export] {glb_out}")
    bpy.ops.export_scene.gltf(
        filepath=glb_out,
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
        export_image_format="AUTO",
    )

    if os.path.exists(glb_out):
        size_mb = os.path.getsize(glb_out) / (1024 * 1024)
        print(f"[done] {glb_out} ({size_mb:.2f} MB)")
    else:
        print("[done] FAIL", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
