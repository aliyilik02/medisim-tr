import bpy, addon_utils, sys
sys.stdout.reconfigure(encoding='utf-8')
addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True, persistent=True)
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.clothesservice import ClothesService
print("HumanService:", [m for m in dir(HumanService) if not m.startswith("_")])
print("ClothesService:", [m for m in dir(ClothesService) if not m.startswith("_")])
try:
    from bl_ext.blender_org.mpfb.services.materialservice import MaterialService
    print("MaterialService:", [m for m in dir(MaterialService) if not m.startswith("_")][:25])
except Exception as e: print("mat fail", e)
import inspect
print("create_human sig:", inspect.signature(HumanService.create_human))
for name in ["add_mhclo_asset","add_asset","set_character_skin","load_mhclo"]:
    fn=getattr(HumanService,name,None) or getattr(ClothesService,name,None)
    if fn: print(name,"sig:",inspect.signature(fn))
