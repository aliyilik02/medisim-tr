---
name: blender-medical-modeling
description: MediSim TR 3D üretim hattı — MPFB2 ile hasta (CC0, ARKit blendshape, çocuk/yaşlı) + prosedürel acil odası → Rigify rig → Cycles AO bake → glTF export → gltf-transform meshopt optimize → R3F yükleme → doğrulama kapıları. Blender'da model üretirken, GLB export ederken, 161MB GLB'yi optimize ederken, patient-mimikli.glb yeniden üretirken kullan. Morph target (blendshape) varsa Draco YASAK, meshopt zorunlu. Gözle tahmin YOK — landmark için patient-anatomy, R3F yükleme/shader için r3f-medical, anatomik regresyon için medisim-3d-vision-test skill'leri.
---

# Blender Medical Modeling — MediSim TR Üretim Hattı

> Landmark/koordinat → `patient-anatomy` skill. R3F yükleme/shader → `r3f-medical`.
> Anatomik regresyon → `medisim-3d-vision-test`. **Asla gözle tahmin etme.**
> Ortam doğrulandı (13 Haz 2026): Blender **5.1.1**, MPFB2 + Rigify + Node Wrangler etkin,
> three **0.170** / drei **9.122** / fiber **8.18** (r171 DEĞİL), `@gltf-transform/cli` **4.3.0** devDep.

## NE ZAMAN
Hasta/oda 3D üretimi, GLB export, 161MB GLB optimize, `patient-mimikli.glb` yeniden üretim.

## ADDON'LAR (hepsi bundled/ücretsiz)
Blender 5.1.1'de doğrulandı: `rigify` + `node_wrangler` legacy modül adıyla etkinleşiyor (try/except sar — 5.x'te bazıları `bl_ext.*` namespace'ine geçebilir, sabit string'e güvenme):
```python
import bpy, addon_utils
for m in ["io_scene_gltf2", "node_wrangler", "rigify", "io_import_images_as_planes"]:
    try: addon_utils.enable(m, default_set=True, persistent=True)
    except Exception as e: print("enable fail", m, e)
bpy.ops.wm.save_userpref()
# MPFB zaten kurulu: bl_ext.blender_org.mpfb | Geometry Nodes / Decimate / Cycles Bake yerleşik
```
KUR (extensions.blender.org, Faz 2 oda için opsiyonel): **Poly Haven** `bl_ext.user_default.polyhavenassets` (CC0, atıf gerekmez — **öncelik, en temiz lisans**).
ÜCRETLİ / Ali Bey kararı (hepsi ÖNERİLMEZ — bundled yeterli): Human Generator ($135, CC0 değil), Auto-Rig Pro ($40). **BlenderKit kullanma** — CC-BY varlıkları atıf zorunlu, otomatik atıf yakalama yok → lisans riski; sadece Poly Haven CC0.

## HASTA (MPFB2 — CC0)
- N-panel → MPFB → `New Human` → `Create human`. Makrolar: Gender (0=K, 1=E). **Age**: alt uç = çocuk (baby/child morph), üst uç = yaşlı (old morph), ~25 orta nokta. Etnisite African+Asian+Caucasian **toplam = 1**.
- Cilt: **MakeSkin veya GameEngine material** (texture-tabanlı PBR). Prosedürel **Enhanced/Multilayered KULLANMA** — glTF'e çıkmaz (sadece Blender shader).
- **Blendshape (ARKit):** Face operations → `faceunits01` yükle → kullanılacak ~12-16'yı tut, gerisini sil: `jawOpen, mouthClose, mouthFunnel, mouthSmileLeft/Right, mouthFrownLeft/Right, eyeBlinkLeft/Right, browDownLeft/Right, noseSneerLeft/Right, tongueOut`.
  - **Sayı/köken (kritik düzeltme):** Apple ARKit = **52** blendshape (54 DEĞİL — eski memory notu hatalı). MPFB `faceunits01` seti **FACS tabanlı**, ARKit'in birebir 52'si değil — ad eşlemesi elle yapılır. Azure tr-TR TTS viseme dizisi = **55** (52 ARKit + 3 ekstra göz/baş), 52'si ARKit ile örtüşür, **1:1 değil**.
  - Blendshape adlarını ARKit konvansiyonunda tut (lipsync eşlemesi bu ada dayanır).
- **Rig:** Rigify metarig (Human) → Generate. Export'ta **sadece DEF- + ORG- hiyerarşisi** çıkar; WGT-/MCH- widget'ları `use_visible=True`/`use_selection=True` ile dışarıda bırak (mevcut 161MB'daki çöpün kaynağı bu widget'lar + animasyon). Deform kemik 50-80'e indir (parmakları birleştir/sil — hasta el oynatmaz). Supine poz (kol ~15° abd). Weight Paint → **Limit Total = 4** (glTF vertex başına max 4 weight). Apply Rotation & Scale.
  - GameRig / "Game Rig Tools" 3rd-party addon'una **hard bağ kurma** (bundled değil, operatör doğrulanmadı). Rigify DEF + use_visible yeter.

## ODA (prosedürel — Faz 2)
- Low-poly blockout: zemin + 4 duvar + tavan tek box; yatak, monitör direği, IV askısı elle. Tekrarlananlar Geometry Nodes `Instance on Points` veya Alt-D linked-dup. **Subsurf YOK** — yuvarlak köşe normal map'e bake edilir.
- UV1 (albedo trim/atlas) + UV2 (lightmap, çakışmasız, margin 8-16px). Cycles bake: **Ambient Occlusion** veya Combined (full GI), samples AO 128-256 / lightmap 512-1024 + Denoise. AO → ORM dokusunun R kanalına pack. Materyal 2-3, ORM packed.

## EXPORT (glTF GLB) — KRİTİK KURALLAR
- **Apply Modifiers + Shape Keys ASLA birlikte açık olmaz** → modifier shapekey'leri siler → 0 morph (EN SIK HATA). `export_apply=False`'u **açıkça yaz** (savunmacı), yorumda bırakma.
- Hasta + oda aynı sahnedeyse `use_selection=True` ile ayrı ayrı export et (path'i argümandan al — tek hardcoded path kullanma).
```python
bpy.ops.export_scene.gltf(
    filepath=output_path, export_format='GLB',
    export_morph=True, export_morph_normal=True,   # blendshape + shading normalleri
    export_skins=True,                              # deform armature
    export_animations=False,                        # idle three.js'te prosedürel sürülür
    export_apply=False,                             # AÇIK yaz — morph varsa modifier bake ETME
    use_visible=True, use_selection=True,           # widget'ları (WGT/MCH) DIŞARDA bırak
)
# Draco KAPALI — sıkıştırma gltf-transform'da (meshopt). Parametre adından emin değilsen: search_api_docs("export_scene.gltf")
```

## OPTIMIZE (gltf-transform 4.3.0) — MORPH VARSA DRACO YASAK
**npm script'leri hazır** (`package.json`): `glb:inspect`, `glb:validate`, `glb:patient`, `glb:room`, `glb:check`, `glb:gate`. Masterlar `assets/3d-src/` altında (gitignore); sadece optimize çıktı commit'lenir.
```bash
# Bayraklar v4.3.0'da DEĞER alır (--simplify false geçerli; --no-simplify YOK bu sürümde).
# HASTA (morph var → meshopt; simplify/join KAPALI):
npx gltf-transform optimize assets/3d-src/patient-master.glb public/3d/patient-mimikli.glb \
  --compress meshopt --texture-compress webp --texture-size 2048 \
  --simplify false --join false --weld true --prune true --instance false
# ODA (morph yok → agresif):
npx gltf-transform optimize assets/3d-src/room-master.glb public/3d/room.glb \
  --compress meshopt --texture-compress webp --texture-size 1024 \
  --simplify true --simplify-error 0.001 --join true --instance true
```
- **meshopt** geometri + morph + skin'i sıkıştırır; **Draco morph'u sıkıştıramaz** → hasta için meshopt zorunlu.
- `--simplify false` morph vertex eşleşmesini, `--join false` R3F `nodes.*` per-region (siyanoz/clipping) erişimini korur.
- **Doku:** `webp` araçsız çalışır (sharp bundled). **KTX2** (GPU VRAM için daha iyi) `toktx`/KTX-Software kurulumu ister → varsa `--texture-compress ktx2`'ye geç; o zaman `public/basis/` transcoder'ını vendor et (KVKK — gstatic CDN'e bağlanma).
- **161MB teşhisi (mevcut `patient-mimikli.glb`):** bloat geometride değil **dokuda** — 47 sıkıştırılmamış doku, tek 4096² kafa normal map'i ~89MB GPU; geometri <60k vertex sağlıklı. `npm run glb:inspect -- public/3d/patient-mimikli.glb` ile ölç, en büyük dokuya saldır. Bu dosya **Ali Bey'in migrasyonu** — optimize yeni isme yazılır, orijinale dokunulmaz.

## DOĞRULAMA (commit kapısı — geçmeden commit yok)
```bash
npm run glb:inspect  -- public/3d/patient-mimikli.glb      # vertex/doku/bbox/morph sayımı
npm run glb:validate -- public/3d/patient-mimikli.glb --format md   # glTF-Validator error=0
node scripts/validate-glb.mjs public/3d/patient-mimikli.glb --max-mb=25 --min-morph=6  # boyut + morph gate
npm run dev          # /dialog-3d-demo gerçek motor
npm run test:visual  # Playwright + medisim-3d-vision-test (landmark regresyon)
```
- **HARD GATE:** `gltf-transform validate` error = 0 **VE** `validate-glb.mjs` geçer. Dikkat: validate error=0 **morph kaybını yakalamaz** (morph silinmiş GLB de geçerli) — bu yüzden `--min-morph` ile morph sayısı before/after assert'i şart (gltf-transform inspect ile ham master morph sayısını oku, gate'e geç).
- **Bütçe:** hasta ideal **<12MB**, hard **<25MB** (208k vertex + skin + 52 morph + 2048² doku ile meshopt sonrası tipik 8-15MB; "<5MB" hasta için gerçekçi değil). Oda **<5MB** (low-poly + lightmap). **>100MB ASLA commit'lenmez** (GitHub hard limit).
- **bbox kalibrasyon:** ham bbox y∈[0, ~1.84] → wrapper `scale ≈ TARGET_HEIGHT/(y_max−y_min)`, `yOffset`, `world_y = yOffset + ratio × TARGET_HEIGHT`. Wrapper scale/offset değişirse `docs/memory/medisim_anatomik_landmark.md` ile çapraz kontrol (gözle tahmin YOK).

## R3F YÜKLEME (three 0.170 / drei 9.122 / fiber 8.18)
- **Decoder vendor et** (KVKK — gstatic CDN YOK): webp default'ta transcoder gerekmez (tarayıcı native). KTX2 kullanırsan `public/basis/` (kurulu `three`'ye pinli). meshopt decoder three'de JS olarak bundled.
- drei 9 `useGLTF` imzasını **kullanmadan önce doğrula** (context7/kaynak) — sürümler arası arg sırası değişir; KTX2 kullanılıyorsa `ktx2Loader.detectSupport(gl)` parse'tan ÖNCE `useEffect`'te `gl` ile çağrılmalı (callback scope'unda `gl` yok). Loader singleton'ları module-scope.

## LİSANS (commit kapısı)
- MPFB2 asset **CC0** → temiz hat. Mevcut `Std_Skin_*` dokular Character Creator/Reallusion kökenli → **CC0 değilse kullanılamaz, Ali Bey onayı şart**; kalıcı çözüm MPFB2 (CC0) ile yeniden üret.
- `public/3d/LICENSE-3D.md`'ye atıf ekle (z-anatomy-binding formatı). **161MB master ASLA commit'lenmez** — `.gitignore` (`assets/3d-src/`) + push öncesi boyut gate; LFS/R2 kararı Ali Bey'in.

## SIK HATALAR
1. **Apply Modifiers + Shape Keys birlikte → 0 morph** (en sık). `export_apply=False` açık yaz.
2. **Rigify widget (WGT/MCH) ham export → şişme/çöp** (mevcut 161MB sebebi). `use_visible=True`/`use_selection=True` ile dışla.
3. **Morph'ta Draco → morph kaybı.** meshopt zorunlu.
4. **>4 weight/vertex → deformasyon bozulur.** Limit Total = 4.
5. **Shape Key Normals kapalı → ağız açılınca shading kırılır.** `export_morph_normal=True`.
6. **Normal map Y-flip** (Blender yeşil kanal ↔ glTF konvansiyonu) → export'ta glTF (Y+) konvansiyonuna bake et veya optimize sonrası yeşil kanalı kontrol et.
7. **gstatic CDN decoder → KVKK ihlali.** Vendor et.
8. **gltf-transform bayrak sürümü:** v4.3.0 `--simplify false` (değerli); başka sürümde `--help` ile teyit et.
