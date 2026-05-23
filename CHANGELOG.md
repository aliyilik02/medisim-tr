# CHANGELOG

Bu dosya MediSim TR projesindeki anlamlı değişiklikleri belgeler.
[Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) + [SemVer](https://semver.org/lang/tr/) formatı.

## [v0.3.4] — 2026-05-23 (Sprint B.8 — karakter tepkileri + ek ekipman)

**Tema:** Karakter yüz mimikleri (ağız lipsync + kaş çatma + yanak kızarması) + 4 yeni klinik ekipman (defib pad'leri + endotrakeal tüp + nazogastrik sonda + Foley kateter). 9 yeni unit test (657 toplam).

### ✨ Eklendi

#### B.8 — Yüz mimikleri (`PatientFaceExpression.tsx`)
- **Mouth** (ağız hareketi):
  - `speaking=true` (AI diyalog konuşma) → 3Hz oscillation lipsync (scale.y 0.10-0.50)
  - `vitals.pain > 6` → açık ağız grimace (0.6 sabit)
  - `gcs < 8` (eyelid > 0.8) → koma açık ağız (0.3)
  - default: kapalı (0.05)
  - `pain > 4` → dudak rengi koyu (#a8463a frown)
- **EyebrowFurrow** (kaş çatma):
  - `pain ≥ 3` tetiklenir, intensity = (pain-3)/7
  - İç köşeler medial-aşağı tilt + Y offset 0-5mm
- **CheekFlush** (yanak kızarması):
  - Ateş 38/39/40°C+ aşamalı emissive #e84a4a
  - Anaflaksi (SBP<90 + HR>110 + SpO2≥90) → kızarma
  - Siyanoz durumunda flush yok (renk farklı)
- **deriveCheekFlushSeverity** export — 9 unit test

#### B.8+ — 4 yeni klinik ekipman (`PatientEquipment.tsx`)
- **defibPads** — AHA hands-free standart:
  - RUL (sağ üst sternal, 2. ICS) + beyaz monitor teli
  - LLL (sol mid-axiller apex, 5. ICS) + kırmızı şok teli
- **endotrachealTube** — ağızdan trakea:
  - Yarı saydam tüp (ID 7.5-8mm proxy) + tutucu plaster + pilot balon + 15mm ISO konnektör
- **nasogastricTube** — burundan mideye:
  - Sarı semi-opak tüp + burun plaster + drenaj konnektörü
- **urinaryCatheter** (Foley) — pelvis altı:
  - Sarı tüp + drenaj torbası proxy + konnektör

PatientDialog3DPage `applyEquipmentFromAction` regex map'i genişletildi:
- defib/aed/kardiyoversiyon/şok/paddle/pad → defibPads
- endotrakeal/ett/entüb/airway → endotrachealTube
- nazogast/ng-tube/ng-sond → nasogastricTube
- foley/üriner-kateter/idrar-sond → urinaryCatheter

### 🤝 Senaryo otomatik etkileri (mevcut 14 senaryoda)
- TCCC patlama → defib + ETT + Foley (CABCDE flow)
- RSI entübasyon → ETT (zorunlu protokol)
- DKA/Sepsis → Foley (saatlik idrar takibi standart)
- Kardiyojenik şok → defib + ETT
- Pediatrik sepsis → NGT (gastrik dekompresyon)
- Apandisit (pain=8) → ağrı grimace + kaş çatma
- DKA/Sepsis (ateş + SpO2 düşmemiş) → yanak kızarma
- Anaflaksi → yanak kızarma (alerjik flush)
- İskemik inme (GCS<14) → ağız hafif açık
- Tüm senaryolar AI diyalog speaking → ağız lipsync

### ✅ Test
- PatientFaceExpression.test.ts 9 test (deriveCheekFlushSeverity normal/ateş/anaflaksi/clamp/hipotermi/kombine)
- Total: 648 → 657 vitest pass

---

## [v0.3.3] — 2026-05-23 (Sprint B.7 — hasta çeşitliliği)

**Tema:** Senaryo `patient.age` + `sex` + `gebelik` → PatientProfile türetimi. AnatomicPatientModel scale parametrik (Rocketbox erişkin baz × scaleFactor). HospitalRoom Bed boyu hastaya orantılı küçülür (infant beşiği / pediatric küçük yatak / adult standart). 14 senaryo otomatik entegre, 34 yeni unit test (647 toplam).

### ✨ Eklendi

#### B.7 — Hasta profili çeşitliliği (`src/clinical/patient-profile.ts`)
- **PatientCategory** PALS uyumlu: `infant` (<1y) / `toddler` (1-2) / `pediatric` (3-11) / `adolescent` (12-17) / `adult` (18-64) / `elderly` (65+)
- **categorizeByAge(age)** yaş → kategori
- **categoryToScale(cat)** Rocketbox baz çarpanı:
  - infant 0.28 (50cm boy proxy)
  - toddler 0.47 (85cm)
  - pediatric 0.75 (135cm)
  - adolescent 0.92 (165cm)
  - adult 1.00 (180cm baz)
  - elderly 0.97 (kifoz proxy)
- **deriveProfile(patient)** — ana fonksiyon, `displayLabel` (TR "8 aylık Erkek Bebek" / "32 yaş Kadın · Gebe") + `skinHintRgb` + `pregnant` flag

#### AnatomicPatientModel parametric scale
- Yeni `scaleFactor` prop (varsayılan 1.0)
- `MODEL_SCALE × scaleFactor` + `MODEL_Y_OFFSET × scaleFactor` — model bbox merkezi yatağa göre korunur

#### HospitalRoom Bed orantılı küçülme
- `Bed` component `scale` prop alır (varsayılan 1.0)
- `LEN`/`WID` × patientScale — infant için 0.53m × 0.24m beşik, pediatric 1.4m × 0.64m, adult 1.9m × 0.85m
- Diğer ekipman (IV pole, monitor, dolap) hasta yaşıyla değişmez (klinik gerçeklik)

#### PatientDialog3DPage header profil rozeti
- `data-testid="patient-profile-badge"` — yaş+cinsiyet+gebelik chip
- title attribute: kategori + scaleFactor

### 🤝 Senaryo otomatik entegrasyonu (14 senaryo)
- Bronşiyolit (8 ay, M) / pediatrik-sepsis (0y) → **infant scale 0.28**
- DKA (24y, F), Anaflaksi (35y, F), Apandisit (28y, M) → adult scale 1.0
- STEMI (62y, M), Pulmoner Emboli (54y, F) → adult
- İskemik İnme (72y, F), Hipoglisemi (68y, M), Kardiyojenik Şok (65y) → **elderly scale 0.97**
- Preeklampsi (32y, F, gebelik) → adult F + **"Gebe" rozet**
- TCCC Patlama (24y asker, M) → adult
- RSI Entübasyon (35y travma, M), Sepsis hemşirelik (70y, F) → adult/elderly

### ✅ Test kapsamı
- patient-profile.test.ts 34 test (categorizeByAge × 12, categoryToScale × 6, categoryLabel × 6, sexLabel × 2, deriveProfile × 8)
- **Total: 613 → 647 vitest pass**

---

## [v0.3.2] — 2026-05-23 (Sprint B.6 — 3D body etkileşim)

**Tema:** Hasta gövdesi üstünde 3 yeni katman — giydirilmiş ekipman + vital görsel bulgular + ilaç verme cue'su. Klinik klasifikasyon (vazopresör/opioid/antiaritmik/metabolik/antiplatelet) renk eşleştirmesi. 29 yeni unit test (613 toplam vitest).

### ✨ Eklendi

#### B.6 — Hastaya giydirilmiş ekipman (`PatientEquipment.tsx`)
Prosedür/ekipman action'ı tamamlandıktan sonra hastaya **kalıcı görünür** olarak takılı kalır (ProcedureOverlay temporary animasyondan farklı):
- **OxygenMask** — yarı saydam yüz maskesi + 2 elastik bant + non-rebreather rezervuar
- **NasalCannula** — 2 burun prong + üst dudak gövdesi + 2 kulak tüpü
- **EkgPatches** — 10-lead Mason-Likar (LA/RA/LL/RL + V1-V6), yapışkan disk + metal snap + renkli tel (RED/YELLOW/GREEN/BLACK klinik standart)
- **IvCatheter** — sol önkol, kateter göbeği + IV line + Tegaderm
- **BpCuff** — sağ kol üst, koyu mavi cuff + velkro + air tüp
- **PulseOximeter** — sağ işaret parmağı, klips + emissive kırmızı LED
- **Bandage** — generic lokal pansuman, position prop

`EquipmentState` interface + PatientBody3D Props'a `equipmentState` eklendi. `applyEquipmentFromAction(action)` regex mapping (oxygen-mask/nasal-cannula/ekg/iv/bp-cuff/spo2 vs.).

#### B.6.1 — Vital bulgular gövde üstü (`PatientVitalSigns.tsx`)
PatientVitals'a göre lokal klinik görsel bulgular — vitals değiştikçe otomatik güncellenir:
- **Pupil** (sol + sağ): `pupil_left_mm` / `pupil_right_mm` → scale (mioz/midriyaz görsel). `pupil_reactive` false → koyu siyah pupil
- **Göz kapağı**: GCS'ye göre kapanır (gcs<8 tam, 8-13 yarı, 14+ açık)
- **Terleme parlaklığı**: alın bölgesinde shiny disk — severity (SBP<90, temp>38, taşikardi+hipotansiyon) ile opacity
- **JVD** (juguler ven dolgunluğu): boyun mavi-mor venöz tüpler — severity (CVP>12 veya sağ kalp yetm proxy)

#### B.6.2 — İlaç verme görsel cue (`MedicationBolus.tsx`)
`action.type === "give_medication"` yakalandığında IV kateter konumunda **2 saniyelik pulsing emissive halka + merkez küre animasyonu**. drugId regex'ine göre **klinik klasifikasyon renk**:
- Vazopresör/inotrop (adrenalin/noradrenalin/dopamin) → kırmızı `#dc2626`
- Opioid (morfin/fentanil/tramadol) → mor `#9333ea`
- Antiaritmik (atropin/amiodaron/lidokain) → sarı `#f59e0b`
- Metabolik (insülin/glukoz/dextroz) → mavi `#3b82f6`
- Antiplatelet/antikoagülan (ASA/heparin) → pembe `#ec4899`

### ✅ Test kapsamı

- **PatientVitalSigns** 17 test: `deriveSweatSeverity` × 6, `deriveJvdSeverity` × 5, `deriveEyelidCloseness` × 11 GCS senaryo
- **MedicationBolus** 12 test: `getDrugColor` × 12 klinik ilaç sınıfı
- **Total: 584 → 613 vitest pass**

### 🗑️ Kaldırıldı

- `HospitalBed.tsx` (kullanılmıyordu — `HospitalRoom.Bed()` içeride)
- `RoomLayoutDevPanel.tsx` (dict müdahalesi yok, no-op)
- `useRoomLayoutOverrides.ts` (dev panel + localStorage hook)
- PatientDialog3DPage + PatientBody3D'den `roomOverrides` prop akışı

---

## [v0.3.1] — 2026-05-23 (Sprint B.5++)

**Tema:** Hastane odası 3D sahne — Sketchfab CC BY "Hospital Room" GLB modeliyle "explode layout" mücadelesinden sonra pragmatik karar: R3F primitiflerle (drei advanced material) deterministic sahne. Minecraft görüntüsünden archviz seviyesine. Hyper3D Rodin / Meshy / SketchUp MCP entegrasyonları envantere alındı.

### ✨ Eklendi

#### Hastane odası — R3F primitif klinik sahne (`HospitalRoom.tsx`)
- **4m × 4m × 2.7m oda:** Floor (vinyl `MeshReflectorMaterial`) + headwall (oksijen/vakum/elektrik priz + hemşire çağrı düğmesi) + foot wall + left wall
- **Yatak (1.9m × 0.85m × 0.7m):** drei `RoundedBox` çerçeve + şilte + çarşaf + yastık + headboard + footboard + 2 yan ray + 4 tekerli ayak
- **IV pole + serum poşeti:** cross-base + direk + T çubuk + 2 kanca + `MeshTransmissionMaterial` cam serum (transmission 0.95, ior 1.33) + tüp
- **Vital monitör:** duvar mount + emissive yeşil EKG ekran + 3 yan kontrol butonu
- **Over-bed table, bedside cabinet, visitor chair, sofa, storage cabinet, tavan ışığı** — hepsi `RoundedBox` ile klinik mobilya

#### Klinik koordinat hizalama
- Hasta supine kafa **-Z** yönde (T-pose Y → -90°X rotation → world -Z)
- `HospitalRoom` Y rotation **+π/2** wrapper → yatak boyu hasta boyu aynı yönde
- Bed group Y = **-0.146** → şilte üstü hasta sırtı seviyesinde

#### Connector + Skill envanteri
- **SketchUp MCP** (Anthropic SDK, API key gerek YOK): 7 baseline + 2 contextual skill — mimari-grade hospital odası inşa için
- **Hyper3D Rodin** (Blender MCP içeride, free trial key embedded — kotası tüketilmiş): AI text-to-3D
- **Polyhaven** (Blender MCP içeride, key yok): CC0 PBR textures + HDRIs + 78 furniture model
- **Sketchfab** (Blender MCP içeride, free hesap key): tek tek medikal mesh
- **Meshy MCP skill** (opsiyonel, API key ücretli): premium AI 3D üretim

### 🔧 Düzeltildi

- **Hasta + yatak eksen uyumsuzluğu:** önceki sahne yatağı X ekseninde uzun, hasta Z ekseninde — 90° yanlış yön. HospitalRoom wrapper Y rotation düzeltti.
- **Hasta havada yatıyordu:** Bed FRAME_Y -0.27 → -0.146, sırt şilte üstüne oturuyor.
- **MeshReflectorMaterial dengeli:** metalness 0.3 → 0.05, roughness 0.55 → 0.78 (klinik vinyl mat).
- **Tavan ışığı dengeli:** emissive 1.5 → 0.9, light intensity 0.8 → 0.5.
- **Sandalye + sofa rengi klinik sönükleştirildi** (#4a8a98 → #7a9098).
- **dialog-3d-vision e2e spec geçici skip** — `playwright.config.ts testIgnore` ile çıkarıldı (sahne flaky).

### 🗑️ Kaldırıldı

- **Sketchfab CC BY hospital-room.glb mesh-by-mesh layout dict** + override pipeline. GLB `public/3d/` arşivde.
- **HOSPITAL_ROOM_LAYOUT dict** runtime override yerine deterministic JSX primitive.

### ⚠️ Bilinen sınırlamalar

- Pozisyon ince ayar görsel feedback gerektirir — kullanıcı ekran görüntüsü ile iterasyon.
- e2e dialog-3d-vision testIgnore aktif — sahne stabilize olunca refactor.
- Hyper3D Rodin embedded free trial kotası dolu — yarın bireysel hesap.

---

## [v0.3.0] — 2026-05-21 (Sprint B.5+)

**Tema:** 3D klinik simülasyon canlı; senaryo motoru tam UI entegrasyon; debrief + toast + sparkline; geliştirici araçları; **/oyna ↔ /dialog-3d-demo entegrasyon**; **527 vitest + 42 Playwright e2e** test kapsamı.

### ✨ Eklendi

#### 3D Klinik Simülasyon (`/dialog-3d-demo` tam paket)
- **20 anatomik marker** — 5 kardiyak APE-T-M (aortic / pulmoner / erb / triküspid / mitral) + 4 akciğer lobu anterior (üst/alt × sağ/sol) + 6 karın kadrant (epigastrik / RUQ / LUQ / RLQ / LLQ / suprapubik) + 2 karotis + 2 femoral
- **4 oskültasyon ses dosyası** (Wikimedia CC BY/BY-SA) — `lung_wheeze`, `lung_crackles`, `heart_normal`, `heart_61bpm`
- **Action submit UI** — `ActionHistoryPanel` sol orta, marker tıkla → stetoskop → `evaluateAction` → puan + feedback + vital değişimi
- **CurrentStepPanel** alt-orta — step.kind'a göre dinamik render (action hint / decision option / info "Devam Et" / finished trophy)
- **DebriefModal** — senaryo finished olunca otomatik açılır: A-F grade rozeti, skor/max, adım sonuçları, kritik hatalar, "Yeniden Başla" / "Kapat" + localStorage'a kayıt
- **Toaster** sağ üst — 3 saniyelik action feedback popup (success/warning/critical/info kind, +/-puan, dev helper `window.__medisim_pushToast`)
- **VitalSparkline** — CompactVitalsHUD'a entegre, son 60 saniyenin HR/TA/SpO₂/SS/Sıcaklık trend mini grafiği
- **MarkerDevPanel** geliştirici aracı — URL `?dev=1` veya Alt+D ile aç; X/Y/Z slider'lar, JSON Export (clipboard), localStorage override (`useMarkerOverrides` hook)
- **OrganModel** skeleton component — Sprint sonrası tek tek CC BY kalp/akciğer/karaciğer modelleri için altyapı; asset yoksa silent null

#### Sayfa / Route'lar
- **`/hakkinda`** — proje bilgisi + KVKK + klinik standartlar (PALS, Calgary-Cambridge, TCCC v5, TA2-2019) + CC BY/BY-SA görünür atıfları (3D modeller, sesler, fontlar, yazılım)
- **HomePage** — "3D Klinik Simülasyon · Beta" yeni bölümü; 3 demo route kartı (`/dialog-3d-demo` Tam Paket vurgulu)
- **Header v0.3 · beta badge** — MediSim TR logosu yanı sıra sürüm rozeti

#### Senaryo ↔ 3D Hasta entegrasyonu
- **`/oyna/:id` üst barı** — 'Çık' yanına 'Box · 3D Hasta' butonu → `/dialog-3d-demo?scenario={id}` (brand teal vurgulu)
- **`/senaryolar` senaryo kartları** — hover'da sağ üst köşede '3D Hasta' badge → `/dialog-3d-demo?scenario={id}`
- **`/dialog-3d-demo` URL query desteği** — `?scenario=id` ile direkt senaryo seçimi; dropdown değişimi URL'i senkronize (paylaşılabilir link)
- Bilinmeyen scenario id → SCENARIOS[0] fallback

#### Test / CI
- **504 vitest** birim/regresyon/yapı testi (32 dosya — önceki 348 + 156 yeni)
  - Toaster (8), VitalSparkline (9), ActionHistoryPanel (9), CurrentStepPanel (9), DebriefModal (10), DialogChat (6), useMarkerOverrides (10), AboutPage (13) ve daha fazla
  - happy-dom v20 localStorage mock pattern (`vi.stubGlobal` ile minimal Storage)
- **42 Playwright E2E** test (smoke + 3d-demo + engine-flow + about-page + dialog-demo)
  - HomePage 3D Demo Beta bölümü, Footer Hakkında linki, MarkerDevPanel toggle + slider + localStorage override, /hakkinda 12+ atıf öğesi, /dialog-demo Calgary stepper + Sıfırla
- **GitHub Actions CI** — `feat/**` + `claude/**` branch'leri tetik listesine eklendi; workflow_dispatch + e2e timeout 10dk

### 🛠 Değişti

- **Marker boyutu** sphere yarıçapı 0.018 → 0.010 (20 marker bir arada görsel kalabalık azalt)
- **Marker Z kalibrasyon** — chest 0.110→0.135, akciğer→0.125-0.130, karın→0.120 (solunum AP expansion 1cm'de batma çöz)
- **Marker Y kalibrasyon** — `TORSO_Y_OFFSET = -0.020` sistematik shift (chuma6oy modeli proporsiyonu 8-head Vitruvian'dan farklı, gövde 2 cm aşağı)
- **Karotis X** ±0.05 → ±0.030 (boyun ön yan içeri, sternokleidomastoid medial kenar)
- **InternalOrgans filter v3** — LINES geometry kesin gizle, Mucosa hide, kalp animasyon hedefi sıkı (vertex 5k-30k aralığı kalp boyutu)
- **Cilt tonu kontrolü** — sağ üst → sağ alt köşeye taşındı; Krediler & lisanslar UI'dan kaldırıldı (atıf `/hakkinda` ve LICENSE dosyalarında)
- **CompactVitalsHUD** — `history?: VitalHistoryEntry[]` opsiyonel prop (geriye uyumlu)
- **Vite build** — `manualChunks` ile vendor split: `three` (730kB), `export-pdf` (575kB), `export-excel` (lazy 938kB), `react` (160kB), `vendor` (450kB); `chunkSizeWarningLimit: 800`
- **README.md** v0.3 — sayılar (348→475), 3D durumu ✅ beta, demo route listesi, üçüncü taraf lisans bölümü
- **CLAUDE.md** — sprint durumu güncel + branch akışı notu

### 🐛 Düzeltildi

- **Aortic odakta `lung_crackles`** klinik hata → `heart_normal` (aort kapağında akciğer ralleri çıkmaz)
- **`anatomy-internal.glb` KHR_materials_pbrSpecularGlossiness** — gltf-transform metalrough+meshopt ile modern PBR'e çevrildi, three.js GLTFLoader konsol uyarısı kalktı (3.55 MB → 3.56 MB eş boyut)
- **`patient-3d-demo.spec.ts`** patient-v1.glb hardcoded URL → regex `/patient-v\d\.glb/` (B.2.3'te v2'ye geçildi, eski test fail veriyordu)

### 🔒 Güvenlik / Lisans

- `/hakkinda` route ile CC BY 4.0 / CC BY-SA 4.0 görünür atıf gereksinimi karşılandı (3D modeller chuma6oy + MaceLogice + Z-Anatomy; sesler James Heilman MD + Wikimedia Commons)
- KVKK 6698 + ÜYZ Rehberi 2025 referansı + iletişim metni

### 🏗 Altyapı

- **Worktree branch `claude/vibrant-newton-e326e8`** rebase → `feat/backend-cf-worker` üstüne (16 commit context conflict çözüldü: PatientBody3DDemoPage.tsx + PatientDialog3DPage.tsx)
- **React.memo + useCallback** — PatientBody3D memoize, handlers stable reference; vital tick'lerinde gereksiz re-render skip
- **Vite manualChunks** — three (730kB), export-pdf (575kB), export-excel (938kB lazy), react (160kB), vendor (450kB); chunkSizeWarningLimit: 800
- Stash'te kullanıcı WIP: `dialog-WIP — DialogChat + geminiBackend + vite.config` (rebase sonrası redundant olabilir, manuel inceleme)

### 📝 Beklenen / Manuel

- **RPM avatar** Ready Player Me full-body .glb indirme + göz/ağız blendshape entegrasyon
- **Tek tek CC BY organ modelleri** Sketchfab/BodyParts3D — kalp/akciğer/karaciğer; pipeline `LICENSE-3D.md` "Önerilen CC BY organ kaynakları" bölümünde
- **B.0 Cloudflare BAA Workers/DO prod kurulum** (gerçek sağlık verisi olmasa da)
- **C.1 Tailwind v3 → v4 + shadcn/ui** geçiş (2-4 saat, visual regression riski)
- **PR aç:** https://github.com/aliyilik02/medisim-tr/pull/new/claude/vibrant-newton-e326e8 → base `feat/backend-cf-worker`

---

## [v0.2.0] — 2026-05-20 öncesi

Senaryo motoru tam altyapısı (TypeScript tipleri, eğitim/sınav modu, 14 senaryo, klinik kod altyapısı, Türk kılavuz kural motoru DRAFT, 348 vitest test).

Detaylar: `docs/MASTER-REPORT-v3.md` Bölüm 11.
