# Oda dokuları — kaynak + lisans

`scripts/build_er_room.py` bu CC0 PBR dokularını `public/3d/er-room.glb`'ye gömer.

| Materyal | Kaynak | Asset | Lisans |
|---|---|---|---|
| Zemin (fayans) | ambientCG | [Tiles107](https://ambientcg.com/view?id=Tiles107) | **CC0 1.0** |
| Duvar (boyalı sıva) | ambientCG | [PaintedPlaster017](https://ambientcg.com/view?id=PaintedPlaster017) | **CC0 1.0** |

CC0 = kamu malı; ticari kullanım serbest, atıf gerekmez (yine de kaynak burada kayıtlı). Her materyalden 3 harita tutulur: `_Color`, `_NormalGL`, `_Roughness` (1K JPG). Diğer haritalar (AO/Displacement/NormalDX) + .zip + .blend silindi — gerekirse ambientCG'den yeniden indirilir.

Yeniden üretim:
```
"C:\Program Files\Blender Foundation\Blender 5.1\blender.exe" -b -P scripts/build_er_room.py -- "$(pwd)/_room_raw.glb"
npx gltf-transform meshopt _room_raw.glb public/3d/er-room.glb
```
