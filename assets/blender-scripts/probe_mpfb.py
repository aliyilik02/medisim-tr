import bpy, addon_utils, sys
try:
    addon_utils.enable("bl_ext.blender_org.mpfb", default_set=True, persistent=True)
except Exception as e:
    print("MPFB enable:", e)
try:
    from bl_ext.blender_org.mpfb.services.locationservice import LocationService
    print("MPFB_USER_DATA:", LocationService.get_user_data())
    print("MPFB_USER_CONFIG:", LocationService.get_user_config())
except Exception as e:
    print("LocationService FAIL:", repr(e))
    # alternatif import yolları dene
    import importlib, pkgutil
    try:
        import bl_ext.blender_org.mpfb as m
        print("mpfb modül kökü:", m.__file__)
        print("altmodüller:", [x.name for x in pkgutil.iter_modules(m.__path__)][:20])
    except Exception as e2:
        print("mpfb import FAIL:", repr(e2))
print("BLENDER:", bpy.app.version_string)
