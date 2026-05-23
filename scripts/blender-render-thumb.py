"""
Diagnostic — GLB import + 2-view orthographic thumbnail render (ön + yan).

Kullanım:
  blender --background --python scripts/blender-render-thumb.py -- <input.glb> <output-prefix>
"""
import bpy
import sys
import os
import math


def setup_scene_clean():
    # Default scene'i sil
    bpy.ops.wm.read_homefile(use_empty=True)


def add_lighting():
    # Sun light (3-point lite)
    bpy.ops.object.light_add(type="SUN", location=(2, -2, 3))
    bpy.context.object.data.energy = 3.0
    bpy.ops.object.light_add(type="AREA", location=(-2, -2, 2))
    bpy.context.object.data.energy = 100
    bpy.ops.object.light_add(type="AREA", location=(0, 2, 2))
    bpy.context.object.data.energy = 50


def setup_render():
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT" if hasattr(bpy.types, "RenderSettingsEEVEE") else "BLENDER_EEVEE"
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except Exception:
        try:
            scene.render.engine = "BLENDER_EEVEE"
        except Exception:
            scene.render.engine = "CYCLES"
            scene.cycles.samples = 32
    scene.render.resolution_x = 600
    scene.render.resolution_y = 1000
    scene.render.film_transparent = False
    scene.world = bpy.data.worlds.new("BG") if "BG" not in bpy.data.worlds else bpy.data.worlds["BG"]
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.1, 0.12, 0.15, 1.0)
        bg.inputs[1].default_value = 1.0


def render_view(output_path, location, look_at=(0, 0, 0.9), ortho_scale=2.2):
    # Kamerayı kur
    cam_data = bpy.data.cameras.new("Cam")
    cam_data.type = "ORTHO"
    cam_data.ortho_scale = ortho_scale
    cam_obj = bpy.data.objects.new("Cam", cam_data)
    bpy.context.scene.collection.objects.link(cam_obj)
    bpy.context.scene.camera = cam_obj
    cam_obj.location = location
    # Look at: track_to constraint
    constraint = cam_obj.constraints.new(type="TRACK_TO")
    # Track-to needs a target empty
    bpy.ops.object.empty_add(location=look_at)
    target = bpy.context.object
    constraint.target = target
    constraint.track_axis = "TRACK_NEGATIVE_Z"
    constraint.up_axis = "UP_Y"

    bpy.context.scene.render.filepath = output_path
    bpy.ops.render.render(write_still=True)
    print(f"[render] saved {output_path}")

    # Cleanup
    bpy.data.objects.remove(cam_obj, do_unlink=True)
    bpy.data.objects.remove(target, do_unlink=True)


def main():
    argv = sys.argv
    argv = argv[argv.index("--") + 1:]
    input_glb = os.path.abspath(argv[0])
    output_prefix = os.path.abspath(argv[1])

    setup_scene_clean()
    setup_render()

    # GLB import
    print(f"[import] {input_glb}")
    bpy.ops.import_scene.gltf(filepath=input_glb)

    # Boundsları bul
    min_z = float("inf")
    max_z = float("-inf")
    for obj in bpy.data.objects:
        if obj.type == "MESH":
            for v in obj.bound_box:
                wv = obj.matrix_world @ bpy.types.Object.bl_rna.properties["location"].keywords if False else None  # noqa
    # Daha basit: scene bbox via depsgraph
    bpy.context.view_layer.update()
    center_z = 0.9  # heuristic for ~1.8m human

    add_lighting()

    # Ön görünüm (Y- yönü → +Y'den bak)
    render_view(output_prefix + "_front.png", location=(0, -3, center_z), look_at=(0, 0, center_z))
    # Yan görünüm (X+ yönü)
    render_view(output_prefix + "_side.png", location=(3, 0, center_z), look_at=(0, 0, center_z))


if __name__ == "__main__":
    main()
