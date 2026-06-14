# Araştırma: Blender→R3F Üretim Hattına Ne Ekleyelim?

> **Amaç:** Blender'da ürettiğimiz şeyleri (hasta cildi, acil servis odası, ekipman, gelecekteki **taktik/saha alanı**) daha gerçekçi yapmak — daha iyi **texture, animasyon, fizik**. Öncelik: **bedava/CC0/permissive lisans** + **web (R3F) taşınır**.
> **Durum:** 14 Haz 2026 çok-ajanlı araştırma (9 açı, 111 iddia, 73 doğrulama oyu → 68 onay/2 ret). Sentez adımı kullanıcı isteğiyle durdurulmadan önce 9 arama ajanı + 73 doğrulama tamamlanmıştı → veri kurtarıldı, sentez elle yazıldı.
> **Mevcut hat:** Blender 5.1.1 (MPFB2 + ARKit 52 blendshape + Rigify + Cycles AO bake) → glTF → gltf-transform meshopt+KTX2 (morph varken **Draco YASAK**) → R3F + Three.js r171 → validate-glb kapısı. Fizyoloji = **Pulse** (rigid-body fizik değil).

---

## 1. Hasta Cildi (Skin & Subsurface)

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Fake-SSS shader** (mattdesl gist — `thickness` uniform'larıyla MeshStandardMaterial'a translucency, ikinci render pass YOK) | Cilde ucuz derinlik/ışık geçişi, tam vücut 60fps | ✓ | belirsiz (gist kodu) |
| **Runtime renk uniform** (siyanoz/solgunluk/sarılık) | Zaten projede `skinTint` var — Blender-bake diffuse üstüne katman | ✓ | — |
| **Blender Principled BSDF SSS (Random Walk)** + Subsurface Radius (kırmızı en uzak saçılır) | Cildi Blender'da gerçekçi shade/bake et | bake gerek | GPL (Blender) |
| **KTX2 kanal ayrımı:** normal/ORM → UASTC, base color → ETC1S | ETC1S normal map'i bozar; doğru sıkıştırma | ✓ | — |
| Three.js **r171→r172+ bump** | `transmissionResolutionScale` — gerçek transmission SSS kullanılırsa perf kolu açılır | ✓ | MIT |

**Karar:** Gerçek hacimsel SSS (MeshPhysicalMaterial transmission) web GPU bütçesinde **pahalı** (resmi three.js uyarısı + ikinci render pass). Pratik yol: **fake-SSS shader + runtime renk uniform + Blender-bake diffuse/normal/roughness**. Bake için normal'i **Non-Color + Tangent Space** (glTF'in desteklediği tek uzay), PBR'ı **ORM** paketle.

---

## 2. Material & Textures

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Node Wrangler** (bundled) — `Ctrl+Shift+T` dosya adından otomatik PBR node | Manuel node bağlama biter (cilt/zemin/metal) | bake | GPL |
| **Poly Haven** (polyhaven.com) — PBR doku/HDRI/model, 8K'ya kadar | Oda yüzeyleri (linolyum/fayans/çelik), HDRI | convert | **CC0** |
| **ambientCG** (ambientcg.com) — 2000+ PBR/HDRI + **Decal kategorisi** | Oda + taktik kir/çamur/kamuflaj + decal | convert | **CC0** |
| **BlenderKit** addon — Blender içi 48.000+ ücretsiz | Hızlı oda/ekipman kitbash | convert | **CC0** (filtre!) / RF |
| **KTX2Loader** (three.js) + WASM transcoder `examples/jsm/libs/basis` | KTX2 dokuları R3F'te yükle | ✓ | MIT |

ETC1S color, **UASTC normal/ORM** (maintainer teyitli: ETC1S normal'i bozar). KTX2 GPU belleğini ~%80 düşürür (Duck: 1.5MB PNG→277KB GPU).

---

## 3. Decals (yara / morarma / kan / kir)

> 🔑 **Kritik bulgu:** Animasyonlu/blendshape'li (nefes alan) hastada **runtime `THREE.DecalGeometry` YANLIŞ** — decal geometrisi bir kez üretilir, kemik/morph deformasyonunu **takip etmez**; göğse konan morarma nefeste **havada kayar**. Doğru yol: **Blender'da cilt UV texture'ına BAKE** (UV uzayında olduğu için deformasyonla birlikte hareket eder).

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Baked decal** (Blender'da cilt albedo/normal'a flatten, tek GLB) | Hasta yarası/morarması — deform-güvenli | bake | — |
| **Runtime `DecalGeometry`** (three/addons) | SADECE statik: oda duvarı, ekipman, taktik arazi, kısa-ömürlü vuruş | ✓ | MIT |
| **ambientCG Decal** (Fingerprints/Smear/Scratches/Rust) | Kan/kir/hasar decal kaynağı | ✓ | **CC0** |
| **Slap It!** (GitHub, knife-project) + **Ucupaint** + texture-paint stencil | Bedava decal yerleştirme/boyama (DecalMachine paralı alternatifi) | bake | belirsiz/free |

⚠️ **KTX2 alpha tuzağı:** Blender'da alpha, Principled BSDF'in alpha girişine **bağlı değilse** glTF export'ta sessizce düşer → kesik (cut-out) kan/yara decal'ı kırılır. Export ÖNCESİ bağlantıyı doğrula. Runtime decal material: `depthWrite:false, polygonOffset:true, polygonOffsetFactor:-4` (z-fighting önler).

---

## 4. HDRI & Aydınlatma

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Poly Haven HDRI** (2k web ışık / 8k görünür arka plan) | Klinik iç + taktik dış aydınlatma | convert | **CC0** |
| **FastHDR** (KTX2 UASTC HDR PMREM) — `basisu -hdr_4x4 pmrem.exr` | EXR ~10x hızlı yüklenir, ~%95 az GPU bellek, runtime PMREM yok | ✓ | Apache-2.0 (basisu) |
| **drei `<Environment files=...>`** (yerel harita) | R3F'te ortam ışığı/yansıma | ✓ | MIT |
| gainmap `.webp` (drei native, en küçük) | KTX2 fazla geliyorsa hafif alternatif | ✓ | — |

⚠️ **EXR/HDR ham haliyle web'e GÖNDERİLEMEZ** (boyut/çözünürlük). ⚠️ drei `<Environment preset=...>` **CDN'den çeker — production'da kullanma**, `files` ile yerel harita ver. Blender tarafı: World > Environment Texture node → Background, Strength ile şiddet.

---

## 5. Animasyonlar

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Mixamo** | Yüzlerce insansı animasyon (nefes/ağrı/CPR/asker hareketi) | convert | **ücretsiz-ticari** ¹ |
| **Quaternius Universal Animation Library** (120+) | Locomotion/idle, medikal poz tabanı | convert | **CC0** |
| **CMU mocap** (cgspeed BVH) | Gerçek-insan hareketi (kazazede sürükleme/CPR tabanı) | convert | permissive ² |
| **mixaify-retarget** (Blender 5 addon) | Mixamo/CMU FBX → Rigify retarget (Auto-Rig Pro'ya gerek yok) | bake | free |
| **Cascadeur Indie** ($8/ay, glTF export) | Fizik-tabanlı özel hareket (konvülsiyon/düşme/kollaps) | ✓ | ücretli |

¹ Tek yasak: **ham FBX'i yeniden dağıtmak** (biz baked GLB gömüyoruz → sorun yok) + **ML eğitimi yasak** (lipsync/AI eğitimine kullanma, sadece oynatma).
² Ticari ürüne gömülebilir, veriyi doğrudan yeniden satamazsın.

**Kritik:** **meshopt** geometri + **morph target** + animasyonu sıkıştırır; **Draco morph sıkıştıramaz** → ARKit 52 blendshape'li hastada meshopt zorunlu (mevcut kural doğru). Blender export: **Skinning ON + Shape Keys ON** (armature + morph birlikte). Aşırı quantize morph delta'yı bozabilir → export sonrası yüz blendshape'i **görsel doğrula**. AnimationMixer kemik + morph track'i aynı klipten oynatır.

---

## 6. Ses (Audio)

| Ne | Ne işe yarar | Web | Lisans |
|---|---|---|---|
| **Freesound** (`filter=license:"Creative Commons 0"`) | Oskültasyon/monitör/saha sesi | ✓ | **CC0** ³ |
| **Pixabay** ses | Bip/alarm/ambiyans, atıfsız | ✓ | royalty-free |
| **ambientCG** ses + impulse response | Oda convolution-reverb (kuru klipleri odaya oturt) | ✓ | **CC0** |
| **three.js `PositionalAudio`** (Web Audio) — HRTF, distanceModel, cone | Monitör/ventilatör sesini ekipman mesh'ine 3D bağla, uzakta kıs | ✓ | MIT |

³ CC0 atıfsız + satılabilir. CC-BY ticari ama **atıf zorunlu**. Freesound ham indirme **OAuth2** ister. ❌ **BBC SFX (RemArc) = non-commercial → ticari üründe KULLANILAMAZ.**

---

## 🎯 Taktik / Saha Alanı Hazırlığı (gelecek TCCC)

Şimdiden hazır olan, taktik alanı kapsadığında kullanılacak:

- **Arazi:** **A.N.T. Landscape** (Blender'da bundled — `Shift+A > Mesh > Landscape`), GPL. Prosedürel saha tabanı, sıfır maliyet.
- **Bitki/enkaz/moloz scatter:** Geometry Nodes — `Distribute Points on Faces → Instance on Points → Object Info` (Sapling gerekmez, built-in).
- **Instancing (binlerce çalı/taş):** `EXT_mesh_gpu_instancing` — Blender exporter "Export Geometry nodes instances" veya **gltfpack `-mi`** (MIT). Web çizim çağrısını düşürür.
- **Kamuflaj/kir/zemin texture:** ambientCG + Poly Haven CC0.
- **Dış HDRI:** Poly Haven gün-ışığı saha haritası (CC0).
- **Kazazede animasyonu:** Mixamo + CMU mocap (sürükleme/taşıma).
- **Duman/toz/muzzle-flash/kan-sıçraması:** **three.quarks** (MIT, web-side — aşağı bak).
- **Saha sesi:** Freesound CC0 (telsiz/uzak gürültü), PositionalAudio.
- **Düşük-poli dolgu:** Quaternius CC0 (web bütçesine uygun).

---

## 🔴 Fizik Gerçeklik-Kontrolü (önemli)

Pulse **fizyoloji** motoru var — rigid-body fizik **değil**. "Fizik motoru" hype'ına kapılma. Net ayrım:

| Blender fizik | glTF'e taşınır mı? | Çözüm |
|---|---|---|
| **Cloth / soft-body** (örtü, giysi, doku) | ✅ **EVET** — Shape Keys'e bake → glTF morph → R3F mixer | Tek taşınan sim. Export: "Shape Keys" + "Animations" |
| **Mantaflow sıvı/duman/yangın** | ❌ HAYIR (hacimsel, mesh değil) | Web-side yap |
| **Particle sistemleri** | ❌ HAYIR | Web-side yap |

**Web-side fizik/VFX:**
- **three.quarks** (MIT) — GPU-batch particle: duman/toz/patlama/muzzle-flash/kan-sıçraması. `npm i three.quarks`. Stretched Billboard + Trail modları muzzle/kan için.
- **@react-three/rapier** (MIT) — rigid-body: ekipman devrilmesi, enkaz, örtü-temas. **Cloth/soft-body YOK** → deforme doku morph-bake'te kalır. Pulse fizyolojide kalır, rapier sadece sahne dekoru dinamiği.
- **@react-three/postprocessing** (MIT) — Bloom/DepthOfField/Noise/Vignette. Klinik monitör odak derinliği + taktik grit. **Kurulması gereken tek yeni paket** (şu an YOK).

---

## ⚡ Net Eylem Listesi (öncelikli)

1. **Render cilası (bu sprint, onaylandı):** drei `<Environment>` yerel HDRI (Poly Haven CC0) + `<ContactShadows>` + ACES ton eşleme + **`@react-three/postprocessing` kur** (SSAO/bloom/vignette). Siyanozu vision-test ile doğrula. → mevcut asset'i bile çok güzelleştirir.
2. **`er-room.glb` yeniden üret (Blender):** 6KB low-poly placeholder yerine modüler oda + Poly Haven/ambientCG CC0 PBR + bevel + Cycles AO bake → gltf-transform meshopt + KTX2 (ETC1S color / UASTC normal) → validate-glb.
3. **Hasta cildi:** fake-SSS shader + Blender-bake PBR (Node Wrangler), KTX2 kanal ayrımı.
4. **Decal hattı:** yaraları cilt texture'ına BAKE (runtime DecalGeometry'yi sadece duvar/ekipman/arazide kullan); ambientCG CC0 decal.
5. **Pipeline:** `gltfpack -mi -tc -cc` veya gltf-transform per-slot KTX2'yi validate-glb'ye ekle; FastHDR (basisu -hdr_4x4) env-map adımı.
6. **HDRI uyarısı:** `<Environment preset>` ASLA (CDN) — `files` ile yerel.

---

## ⚠️ Lisans Özeti (ticari tıp-eğitim ürünü)

| Kaynak | Lisans | Ürüne gömme | Not |
|---|---|---|---|
| Poly Haven, ambientCG, Quaternius | **CC0** | ✅ atıfsız | En temiz |
| Freesound (CC0 filtre), Pixabay | **CC0/RF** | ✅ atıfsız | Freesound CC-BY = atıf zorunlu |
| Mixamo | ücretsiz-ticari | ✅ (baked GLB) | Ham FBX dağıtma, ML eğitme |
| BlenderKit | CC0 / Royalty-Free | ✅ | RF = aynı biçimde yeniden satılamaz → **CC0 filtresi** |
| Sketchfab CC-BY | CC-BY | ✅ + atıf | Görünür atıf ekranı gerek |
| three.quarks, rapier, postprocessing, gltfpack | **MIT** | ✅ | Risk yok |
| basisu | Apache-2.0 | ✅ | — |
| Node Wrangler, A.N.T., Geometry Nodes | GPL (Blender) | ✅ (çıktı senin) | Araç GPL, ürettiğin asset değil |
| DecalMachine, Cascadeur, Auto-Rig Pro | ücretli | ✅ (çıktı senin) | Opsiyonel |
| **BBC SFX (RemArc)** | non-commercial | ❌ | **KULLANMA** |

---

## Kaynaklar (seçme, primary)

- Poly Haven lisans/HDRI: polyhaven.com/license · /hdris
- ambientCG lisans: docs.ambientcg.com/license · /list?type=Decal
- gltf-transform: gltf-transform.dev (meshopt, KHRTextureBasisu, CLI)
- Khronos KTX Artist Guide (per-slot UASTC/ETC1S komutları)
- three.js: KTX2Loader, DecalGeometry, PositionalAudio, AnimationMixer, MeshPhysicalMaterial
- FastHDR: cloud.needle.tools/articles/fasthdr-environment-maps · BinomialLLC/basis_universal
- drei Environment: drei.docs.pmnd.rs/staging/environment
- Mixamo lisans: helpx.adobe.com/.../mixamo-faq · community.adobe.com (EULA)
- Quaternius CC0 · CMU mocap (mocap.cs.cmu.edu) · mixaify-retarget (GitHub) · Cascadeur
- three.quarks (docs.quarks.art, GitHub Alchemist0823) · @react-three/rapier (pmndrs)
- Blender: A.N.T. Landscape, Geometry Nodes scatter, Node Wrangler, glTF exporter manual
- gltfpack (meshoptimizer.org/gltf, MIT)

> Ham doğrulanmış veri: önceki oturum workflow `wf_67db379f-02c` (9 arama ajanı + 73 doğrulama oyu).
