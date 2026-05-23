"""
Blender headless — Fab Library .blend → temizlenmiş + decimated + texture-küçültülmüş .glb

Pipeline:
1. .blend aç
2. Rig widget mesh'lerini sil (boş `WGT-rig_*` adlı yardımcılar)
3. Cloth/giysi mesh'lerini gizle (klinik için çıplak vücut; mesh adına göre)
4. Body mesh'lerine Decimate modifier (ratio 0.5) — kalite hissedilir kayıp olmadan ~%50 poly
5. Texture image'larını 2K → 1K resize (varsa)
6. GLB export — apply modifiers, draco YOK (post-process @gltf-transform ile sıkıştırılır)

Kullanım:
  blender --background --python scripts/blender-optimize-export-glb.py -- <input.blend> <output.glb>

Çıktı: optimize edilmiş .glb (~10-30 MB beklenir). Sonra gltf-transform ile <5 MB'a inilir.
"""
import bpy
import sys
import os
import re


# Klinik için çıplak vücut — Fab modelinde varsa giysi mesh adları
CLOTHING_PATTERNS = [
    r"(?i)cloth", r"(?i)shirt", r"(?i)pants", r"(?i)shoe", r"(?i)hat",
    r"(?i)cap", r"(?i)hair", r"(?i)beard", r"(?i)belt", r"(?i)glove",
    r"(?i)sock", r"(?i)boot", r"(?i)jacket", r"(?i)trouser",
]

# Rig widget pattern
WIDGET_PATTERN = re.compile(r"^WGT-")

# Decimate ratio — kalite/boyut dengesi
DECIMATE_RATIO = 0.5

# Texture max boyutu
TEXTURE_MAX_DIM = 1024


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

    # 1) Initial summary
    n_obj_before = len(bpy.data.objects)
    n_mesh_before = len(bpy.data.meshes)
    n_img_before = len(bpy.data.images)
    poly_before = sum(len(m.polygons) for m in bpy.data.meshes)
    print(f"[before] objects={n_obj_before} meshes={n_mesh_before} polys={poly_before:,} images={n_img_before}")

    # 2) Rig widget mesh'leri sil
    widget_removed = 0
    for obj in list(bpy.data.objects):
        if obj.type == "MESH" and WIDGET_PATTERN.match(obj.name):
            bpy.data.objects.remove(obj, do_unlink=True)
            widget_removed += 1
    # Orphan mesh data'yı temizle
    for mesh in list(bpy.data.meshes):
        if mesh.users == 0 or WIDGET_PATTERN.match(mesh.name):
            bpy.data.meshes.remove(mesh)
    print(f"[clean] removed {widget_removed} rig widget objects")

    # 3) Cloth / giysi mesh'lerini gizle (sil değil, ihtiyaç olursa geri açılır)
    cloth_hidden = []
    cloth_re_list = [re.compile(p) for p in CLOTHING_PATTERNS]
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        for r in cloth_re_list:
            if r.search(obj.name):
                obj.hide_viewport = True
                obj.hide_render = True
                cloth_hidden.append(obj.name)
                break
    print(f"[clean] hidden {len(cloth_hidden)} clothing meshes: {cloth_hidden[:5]}...")

    # 4) Body mesh'lere Decimate modifier (ratio 0.5)
    # Sadece anatomi vücut mesh'lerini etkile — giysi/saç hariç (zaten gizli)
    decimate_applied = 0
    for obj in bpy.data.objects:
        if obj.type != "MESH":
            continue
        if obj.hide_viewport:
            continue
        if WIDGET_PATTERN.match(obj.name):
            continue
        # Çok düşük poly'liyse atla (zaten optimize)
        if obj.data and len(obj.data.polygons) < 1000:
            continue
        mod = obj.modifiers.new(name="GraphifyDecimate", type="DECIMATE")
        mod.ratio = DECIMATE_RATIO
        mod.use_collapse_triangulate = True
        decimate_applied += 1
    print(f"[opt] decimate applied to {decimate_applied} meshes (ratio={DECIMATE_RATIO})")

    # 5) Texture'ları küçült (2K+ → 1K)
    tex_resized = 0
    for img in bpy.data.images:
        if img.source == "GENERATED":
            continue
        if not img.has_data:
            continue
        w, h = img.size
        if w <= 0 or h <= 0:
            continue
        max_dim = max(w, h)
        if max_dim > TEXTURE_MAX_DIM:
            new_w = w * TEXTURE_MAX_DIM // max_dim
            new_h = h * TEXTURE_MAX_DIM // max_dim
            img.scale(new_w, new_h)
            tex_resized += 1
            print(f"[opt] resized image '{img.name}': {w}x{h} → {new_w}x{new_h}")
    print(f"[opt] {tex_resized} textures resized to max {TEXTURE_MAX_DIM}px")

    # 6) Export GLB
    output_dir = os.path.dirname(output_glb)
    if output_dir and not os.path.exists(output_dir):
        os.makedirs(output_dir, exist_ok=True)

    print(f"[export] writing {output_glb}")
    bpy.ops.export_scene.gltf(
        filepath=output_glb,
        export_format="GLB",
        use_selection=False,
        use_visible=True,                # hide_viewport olanlar export edilmez
        export_apply=True,               # modifier'lar apply (Decimate dahil)
        export_skins=True,               # rig korunur
        export_morph=True,               # shape keys (blendshape) korunur
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


if __name__ == "__main__":
    main()
