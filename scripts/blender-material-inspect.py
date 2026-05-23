"""
Blender CLI: Reallusion CC model material node + texture analizi.

Çıktı:
- Her material için: shader type (Principled BSDF / CC Master / custom)
- Bağlı texture'lar: path, format, resolution, node sokket adı
- SSS, BaseColor, Normal, Metallic, Roughness, Cavity slot'ları ne var

Bake stratejisi için temel bilgi.
"""
import bpy
import sys
import os

argv = sys.argv
if "--" in argv:
    argv = argv[argv.index("--") + 1:]
else:
    argv = []

if len(argv) < 1:
    print("ERROR: input.blend gerekli")
    sys.exit(1)

blend = os.path.abspath(argv[0])
print(f"[open] {blend}")
bpy.ops.wm.open_mainfile(filepath=blend)

print(f"\n[materials] total: {len(bpy.data.materials)}")
print("=" * 80)

for mat in bpy.data.materials:
    if not mat.use_nodes:
        print(f"\n--- {mat.name} (no nodes) ---")
        continue

    print(f"\n--- {mat.name} ---")
    nodes = mat.node_tree.nodes
    output_node = next((n for n in nodes if n.type == "OUTPUT_MATERIAL"), None)
    if not output_node:
        print("  (no output node)")
        continue

    # Surface input
    surface = output_node.inputs.get("Surface")
    if not surface or not surface.is_linked:
        print("  (surface unlinked)")
        continue

    main_shader = surface.links[0].from_node
    print(f"  shader: {main_shader.type} ({main_shader.bl_idname}) name='{main_shader.name}'")

    # Texture/image inputs scan
    def scan_node_inputs(node, depth=0, visited=None):
        if visited is None:
            visited = set()
        if node.name in visited:
            return
        visited.add(node.name)
        prefix = "  " + "  " * depth
        for inp in node.inputs:
            if inp.is_linked:
                src = inp.links[0].from_node
                if src.type == "TEX_IMAGE" and src.image:
                    img = src.image
                    w, h = img.size
                    fmt = (img.file_format or "?").lower()
                    src_path = bpy.path.abspath(img.filepath) if img.filepath else "(embedded)"
                    packed = " [packed]" if img.packed_file else ""
                    print(f"{prefix}<- {inp.name}: {src.name} → {img.name} {w}x{h} {fmt}{packed}")
                    print(f"{prefix}   path: {src_path}")
                elif src.type in ("GROUP", "MIX_RGB", "NORMAL_MAP", "BUMP", "SEPARATE_RGB", "SEPARATE_COLOR"):
                    print(f"{prefix}<- {inp.name}: {src.type} '{src.name}'")
                    scan_node_inputs(src, depth + 1, visited)

    scan_node_inputs(main_shader)

print("\n" + "=" * 80)
print(f"[images] total: {len(bpy.data.images)}")
packed = sum(1 for img in bpy.data.images if img.packed_file)
external = sum(1 for img in bpy.data.images if not img.packed_file and img.filepath)
print(f"  packed (in .blend): {packed}")
print(f"  external reference: {external}")
