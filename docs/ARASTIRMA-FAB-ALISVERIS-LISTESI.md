# Araştırma: FAB (Epic Birleşik Pazar) → MediSim TR Alışveriş Listesi

> **Durum:** Kurtarıldı. 14 Haz 2026 deep-research çalışması (109 ajan, 6 açı, 26 kaynak, 103 iddia, 25 doğrulama) session limitine (20:20 İstanbul) takılıp **sentez adımı yarım kaldı** — ham doğrulamalı veri sağlamdı, sentez sonradan elle tamamlandı.
> **Soru:** FAB üzerinde hangi kategorilerden indirme yapılmalı; R3F/Three.js web hattına gerçekten taşınır mı; tıp simülasyonuna faydası; ticari tıp-eğitim ürününde lisans uygun mu.
> **Stack bağlamı:** R3F + Three.js r171 + drei, web tarayıcı. Unity hattı "park"lı. Fizyoloji motoru = Pulse (rigid-body fizik DEĞİL). Ürün ticari → lisans KRİTİK.

---

## 1. Lisans — Önce Bu (KRİTİK, hepsi doğrulandı)

| Bulgu | Oy | Kaynak |
|---|---|---|
| FAB **Standard License = 2 katman**: Personal (son 12 ayda <100.000 USD brüt gelir) / Professional (>100.000 USD). Ayrım **sadece gelir eşiği** — oyun-vs-web veya tıp ayrımı YOK. | 3-0 ✓ | [Epic Fab Licenses](https://dev.epicgames.com/documentation/fab/licenses-and-pricing-in-fab?lang=en-US) |
| **Ticari kullanım her iki katmanda da serbest**; katman alıcının kendi gelirine göre, uygulama/platform kısıtı değil. | 2-1 ✓ | aynı |
| Megascans **2024 sonuna kadar** Standard License ile ücretsiz claim edilebiliyordu; **2025'te ücretli katalog** başladı (bir kısmı hâlâ ücretsiz). | 3-0 ✓ | [Fab Transition FAQ](https://support.fab.com/s/article/Fab-Transition-FAQs?language=en_US) |
| Megascans varlıkları **CC0 DEĞİL** — Standard License (EULA kısıtlı) ama "tüm motor ve araçlarda, ticari projelerde dahil" izinli. | 3-0 ✓ | aynı |

**Sonuç:** MediSim TR ticari tıp-eğitim ürünü olarak FAB Standard License kapsamında varlık kullanabilir. Gelir <100k iken Personal katman yeterli. **CC0 sanılmamalı** — atıf/EULA kuralları geçerli, varlıklar yeniden-dağıtılamaz (sadece son üründe gömülü). KVKK/lisans dosyasına EULA şartı not düşülmeli.

> ⚠️ Çürütülen iddia: "FAB'da CC-BY ve Standard diye iki kategori var, CC-BY ücretsiz+atıflı" — **1-2 ✗** doğrulanamadı. CC-BY varlıkların varlığına güvenmeden, her varlığın kendi lisans rozetine tek tek bakılmalı.

---

## 2. Format Taşınabilirliği — Neyi Three.js'e Getirebiliriz

| Bulgu | Oy | Kaynak |
|---|---|---|
| FAB **motor-bağımsız 3D formatları** kabul ediyor: GLB, GLTF, FBX, OBJ, USD, USDZ → çoğu doğrudan yüklenebilir (GLB/GLTF) veya dönüştürülebilir (FBX→glTF). | 3-0 ✓ | [Fab Format Reqs](https://dev.epicgames.com/documentation/fab/asset-file-format-and-structure-requirements-in-fab?lang=en-US) |
| FAB ayrıca **Unreal (.uproject) ve Unity proje** dağıtımı da sunuyor — bunlar **web/R3F'e taşınmaz**, engine-locked alt küme ATLA. | 3-0 ✓ | aynı |
| **glTF Transform** = JS/TS glTF 2.0 SDK (Web+Node), hem API hem CLI → R3F pipeline'a doğrudan uygun. | 3-0 ✓ | [gltf-transform.dev](https://gltf-transform.dev/) |
| glTF Transform **KTX2 + Basis Universal** (UASTC + ETC1S) destekler — Three.js'in `KTX2Loader` ile yüklediği GPU-dostu, bundle-küçülten format. | 3-0 ✓ | aynı |

**Pipeline (zaten projede kurulu):** FAB GLB/FBX → (FBX ise glTF'e) → `gltf-transform` meshopt + KTX2 (ETC1S diffuse, UASTC normal) → R3F. Mevcut `scripts/validate-glb.mjs` boyut+morph kapısından geçir.

> ⚠️ **Karakter/animasyon tuzağı (primary kaynak, limit yüzünden çekimser kaldı ama Unreal resmi dokümanı):** Unreal glTF Exporter mesh/animasyon/ışık verir AMA **morph target ve mesh-clothing'i EXPORT ETMEZ**. MediSim hasta modeli **ARKit blendshape** (siyanoz/mimik) üstüne kurulu → Unreal üzerinden gelen karakter varlıkları blendshape'i kaybeder. Karakter/yüz animasyonu için Unreal-route ATLA; MPFB2/RPM hattında kal. ([Unreal glTF Exporter](https://dev.epicgames.com/documentation/en-us/unreal-engine/how-the-gltf-exporter-handles-unreal-engine-content))
> Aynı kaynak: material baking sadece basit node desenleri; dinamik node'lar (Time, Camera Position) export'ta statikleşir → karmaşık Megascans shader graph'ları ve animasyonlu materyaller web'e tam taşınmaz.

---

## 3. Kategori Kategori Alışveriş Listesi

FAB kategorileri (parantezde varlık sayısı) → R3F-web taşınırlık + tıbbi fayda + öncelik.

### ✅ İNDİR — Yüksek Öncelik (web'e temiz taşınır, klinik fayda net)

| Kategori | Taşınır mı? | Tıbbi fayda | Not |
|---|---|---|---|
| **Material & Textures (708)** | ✓ KTX2 pipeline ile | Hasta cilt PBR, acil-servis oda dokuları (zemin, duvar, yatak metal/kumaş) | ETC1S diffuse + UASTC normal. Megascans surface'leri en değerli. Klinik realizmin omurgası. |
| **HDRI (2)** | ⚠️ dönüşüm şart | Klinik aydınlatma ortam haritası (hastane ışığı) | EXR/HDR **doğrudan web'e gönderilemez** — boyut/çözünürlük tradeoff'u (three.js demosu bile düşük çözünürlük kullanıyor). KTX2'ye dönüştür. Sadece 2 varlık var → düşük hacim, yine de al. |
| **Audio (190)** | ✓ OGG/WAV | Ambient hastane sesi, monitör bip, ortam | Oskültasyon sesleri zaten projede (4 ogg). FAB'dan ambient/UI ses al. Lisans rozetine bak. |

### 🟡 İNDİR — Seçici / Koşullu

| Kategori | Taşınır mı? | Tıbbi fayda | Not |
|---|---|---|---|
| **Decals (201)** | ✓ ama gerek olmayabilir | Yara/morarma/siyanoz lekesi | Three.js'in **yerleşik `DecalGeometry`** sınıfı var → decal'i runtime'da hasta mesh'ine projekte edebilirsin, FAB decal varlığına gerek YOK. FAB decal sadece doku kaynağı olarak (texture) işe yarar, geometri olarak değil. ([DecalGeometry](https://threejs.org/docs/pages/DecalGeometry.html)) |
| **Animations (131)** | ⚠️ riskli | Hasta hareket klipleri (nefes, ağrı, konvülsiyon) | FBX→glTF (Mixamo deseni) mümkün ama retarget zahmetli + **blendshape taşınmaz**. İskelet animasyonu (vücut) alınabilir, yüz/morph için DEĞİL. Forum kaynakları retarget sorunlarına işaret ediyor. |
| **Sprites & Flipbooks (50)** | ⚠️ kısmen | Az; UI ikon/efekt | 2D — web'de kullanılabilir ama klinik fayda düşük. Atlanabilir. |
| **Brushes (35)** | ✗ tıbbi fayda yok | — | DCC (Substance/Photoshop) fırçaları, runtime varlık değil. Sadece doku üretiminde yardımcı. Genelde ATLA. |

### ❌ ATLA — Sadece Oyun-Motoru / Fayda Yok

| Kategori | Neden atla |
|---|---|
| **VFX (95)** | Çoğu **Niagara/Cascade** (Unreal) veya Unity particle — web'e taşınmaz. Web'de DoF/Bloom için **`@react-three/postprocessing`** native var (DepthOfField/Bloom/Noise/Vignette) → FAB VFX'e gerek YOK. ([react-postprocessing](https://github.com/pmndrs/react-postprocessing)) |
| **Game Systems (224)** | Blueprint/C# oyun mantığı — tıp sim ile alakasız, engine-locked. |
| **Game Templates (47)** | Tam oyun iskeletleri — alakasız. |
| **Tools & Plugins (1.1K)** | Unreal/Unity editör eklentileri — web hattında çalışmaz. |
| **UI (67)** | UMG (Unreal) / Unity UI prefab — projenin Tailwind+shadcn hattına taşınmaz. |
| **Tutorials & Examples (131)** | Öğrenme materyali, varlık değil; gerekirse oku, "indirme" listesine girmez. |

> 🔴 **Fizik gerçeklik-kontrolü:** MediSim fizyolojik motor (Pulse) kullanıyor, **rigid-body fizik değil**. FAB'daki fizik-tabanlı VFX/Game System varlıkları (çarpışma, particle, ragdoll) tıbbi simülasyona **HİÇBİR şey katmaz** — bunlar oyun mekaniği. Yanıltıcı "fizik motoru" çerçevesine kapılma.

---

## 4. Kıyas: R3F-Web Hattı vs Unity Hattı Açılırsa

**(1) Şimdi (R3F-web) FAB'dan taşınan:** Material & Textures (KTX2), HDRI (dönüşümlü), Audio, Decal *dokuları*. Entegrasyon: `gltf-transform` meshopt+KTX2 → R3F. Postprocessing/decal/animasyon zaten Three.js native, FAB'a bağımlı değil.

**(2) Unity hattı açılırsa ek kazanç:** Unity-proje paketli VFX (particle), Game Systems, UI prefab, Tools & Plugins **doğrudan** kullanılabilir hale gelir. Ama bunlar oyun-odaklı; tıp sim için marjinal. Unity açmanın FAB-kaynaklı net kazancı **düşük** — asıl kazanç varlık değil, editör/runtime ekosistemi. Park'ta kalması mantıklı.

---

## 5. Net Eylem Listesi

1. **AL:** Megascans surface dokuları (cilt/oda/ekipman PBR) → KTX2 pipeline. En yüksek getiri.
2. **AL:** Ambient/UI ses (Audio kategorisi) — lisans rozeti kontrollü. Alternatif CC0: [Freesound](https://freesound.org/) (primary kaynak doğrulandı).
3. **AL (dönüşümle):** 2 HDRI → KTX2 ortam haritası.
4. **GEREKİRSE:** Vücut animasyon klibi (FBX→glTF), ama **blendshape için MPFB2/RPM hattında kal**.
5. **ALMA:** VFX, Game Systems/Templates, Tools & Plugins, UI, Brushes — web'e taşınmaz veya native çözüm var.
6. **Lisans dosyası:** Her indirilen varlığın FAB Standard License + EULA şartını projeye not et (CC0 değil; gömülü kullanım OK, yeniden dağıtım YOK).

---

## Ek: Doğrulama Kalitesi Notu

Sentez session limitine takıldığı an verify aşaması 25 iddiadan 8'ini kesin onaylamış, 17'sini "killed" işaretlemişti. Ancak bu 17'nin **çoğu gerçekten çürütülmedi** — limit yüzünden 3 doğrulayıcı ajan da "abstain" (0-0) kaldı. Bu iddialar **primary kaynaklı** (three.js docs, Khronos, Unreal docs, react-postprocessing repo) olduğundan yukarıdaki sentezde temkinli kullanıldı ve kaynak işaretlendi. Gerçekten oyla çürütülenler (1-2/2-1): FAB CC-BY kategorisi iddiası ve FastHDR hız iddiası — bunlar rapora güçlü dayanak olarak alınmadı.

**Tam ham çıktı:** önceki oturum `tasks/wtmmb4zmq.output` (109 ajan log + 8 confirmed + 17 refuted/abstain + 26 kaynak).
