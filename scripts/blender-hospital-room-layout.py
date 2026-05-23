"""
Blender CLI: hospital-room.glb modelin mesh'lerini analiz et + klinik
oda layout'una göre yeniden konumlandır + glb export.

Sorun: Sketchfab glTF Auto-converted export'ta tüm mesh'ler origin'de
(0,0,0) yan yana dizilmiş ("explode layout"). Sahnede gerçek hastane
odası görünmüyor.

Çözüm: Her root mesh için:
1. Mevcut name + bbox + position oku
2. İsme göre klinik oda layout pozisyonuna yerleştir (yatak ortada,
   monitor başucu, IV yan tarafta, dolaplar duvarda)
3. Gereksiz mesh'leri (eğer varsa) sil
4. Yeni glb export

Kullanım:
  blender --background --python scripts/blender-hospital-room-layout.py \
    -- <input.glb> <output.glb>
"""
import bpy
import sys
import os
import re

# Klinik oda layout — yatak merkez (0,0,0), diğer ekipman yatağın etrafında
# (Standart 4×3m hastane odası, yatak ortada, başucu +X yönüne)
LAYOUT = {
    # Yatak ve mobilya
    "bed":          (0.0,    0.0,    0.0),   # merkez
    "pillow":       (0.6,    0.5,    0.0),   # yatak başucu üstü
    "mattress":     (0.0,    0.4,    0.0),   # yatağın üstünde
    # Hasta tedavi ekipmanı
    "monitor":      (0.8,    1.6,   -0.5),   # yatak başucu sağ üstte
    "ivstand":      (0.6,    0.0,   -0.7),   # yatak sağında ayakta
    "iv":           (0.6,    0.0,   -0.7),
    "drip":         (0.6,    0.0,   -0.7),
    # Mobilya — yatak çevresinde
    "chair":        (-0.5,   0.0,   -1.2),   # yatak ayak ucu yanı
    "commode":      (1.5,    0.0,    1.2),   # köşe komodin
    "foodtable":    (0.5,    0.7,    1.0),   # hasta sağ yanı yemek masası
    "cabinet1":     (-2.0,   0.0,   -1.5),   # duvar köşesi dolap 1
    "cabinet1door": (-2.0,   0.0,   -1.5),
    "cabinet1doorglass": (-2.0, 0.0, -1.5),
    "cabinet2":     (-2.0,   0.0,    1.5),   # duvar köşesi dolap 2
    # Yapı elemanları — uzak duvarlarda
    "curtain":      (1.8,    1.5,    1.8),   # arka köşe perde
    "doorwall":     (-1.5,   0.0,   -2.0),   # giriş duvarı
    "door":         (-1.5,   0.0,   -2.0),
    "wall":         (0.0,    1.5,   -2.5),   # arka duvar
    "floor":        (0.0,   -0.5,    0.0),   # zemin
    "ceiling":      (0.0,    3.0,    0.0),   # tavan
    "heater":       (-2.0,   0.0,    2.0),   # köşe radyatör
    "electricsystm":(-1.0,   2.0,   -2.0),   # duvar elektrik panel
    "switch":       (-1.5,   1.5,   -2.0),
    "frame":        (-2.0,   1.5,    0.0),   # duvar resmi
    "lamp":         (0.0,    3.0,    0.0),   # tavan lambası
    "light":        (0.0,    3.0,    0.0),
    "bin":          (-1.8,   0.0,    1.8),   # köşe çöp kovası
    "trash":        (-1.8,   0.0,    1.8),
    "computer":     (1.2,    1.0,   -2.0),   # bilgisayar
    "tv":           (1.5,    2.0,   -2.0),   # duvar TV
    "wcgrub":       (-2.0,   0.5,    1.5),   # şube/ekstra
    # Default fallback: orijinal pozisyon korunur
}


def match_layout(name):
    """Mesh adından layout key çıkar (fuzzy match)."""
    name_lower = (name or "").lower()
    # Önce tam isim, sonra alt-string match
    for key in sorted(LAYOUT.keys(), key=len, reverse=True):
        if key in name_lower:
            return LAYOUT[key], key
    return None, None


def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:] if "--" in argv else []
    if len(argv) < 2:
        print("ERROR: input.glb output.glb gerekli")
        sys.exit(1)

    glb_in = os.path.abspath(argv[0])
    glb_out = os.path.abspath(argv[1])

    bpy.ops.wm.read_homefile(use_empty=True)
    print(f"[import] {glb_in}")
    bpy.ops.import_scene.gltf(filepath=glb_in)

    # Root mesh objelerini topla (top-level Empty/Mesh node'lar)
    root_objects = [o for o in bpy.context.scene.objects if o.parent is None]
    print(f"[loaded] root objects: {len(root_objects)}")

    matched = 0
    fallback = []
    for obj in root_objects:
        if obj.type not in ("MESH", "EMPTY"):
            continue
        layout, key = match_layout(obj.name)
        if layout:
            x, y, z = layout
            obj.location = (x, y, z)
            print(f"  ✓ {obj.name} → ({x}, {y}, {z}) [{key}]")
            matched += 1
        else:
            # Children mesh isimlerine bak — group/empty node ise
            child_names = []
            if obj.type == "EMPTY":
                for c in obj.children:
                    child_names.append(c.name)
                # Children'da ismi olan bir layout key var mı
                for cname in child_names:
                    layout2, key2 = match_layout(cname)
                    if layout2:
                        x, y, z = layout2
                        obj.location = (x, y, z)
                        print(f"  ✓ {obj.name} (via child {cname}) → ({x}, {y}, {z}) [{key2}]")
                        matched += 1
                        break
                else:
                    fallback.append(obj.name)
            else:
                fallback.append(obj.name)

    print(f"[layout] matched={matched} fallback={len(fallback)}")
    if fallback:
        print(f"  fallback (origin'de kaldı): {fallback[:10]}")

    # Export
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
        export_yup=True,
        export_animations=False,
        export_lights=False,
        export_cameras=False,
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
