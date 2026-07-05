import bpy, sys
sys.stdout.reconfigure(encoding="utf-8")
bpy.ops.wm.open_mainfile(filepath=r"C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-master\assets\3d-src\patient-v2-stageB.blend")
for name in ["PatientBody","Human.low-poly","Human.short01","Human.wdg_mycenaean_tunic"]:
    o=bpy.data.objects.get(name)
    if not o: print(name,"YOK"); continue
    print(name,"loc:",tuple(round(v,2) for v in o.matrix_world.translation),"scale:",tuple(round(v,3) for v in o.matrix_world.to_scale()))
body=bpy.data.objects["PatientBody"]
mat=body.active_material
print("BODY MAT:",mat.name if mat else None)
if mat and mat.use_nodes:
    for n in mat.node_tree.nodes:
        if n.type=="TEX_IMAGE":
            img=n.image
            print("  TEX:",img.name if img else None,"packed:",bool(img.packed_file) if img else None,"size:",tuple(img.size) if img else None,"path:",img.filepath[-60:] if img else None)
        if n.type=="BSDF_PRINCIPLED":
            bc=n.inputs["Base Color"]
            print("  BSDF BaseColor linked:",bc.is_linked)
