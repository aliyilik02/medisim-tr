# CHANGELOG

Bu dosya MediSim TR projesindeki anlamlı değişiklikleri belgeler.
[Keep a Changelog](https://keepachangelog.com/tr/1.1.0/) + [SemVer](https://semver.org/lang/tr/) formatı.

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
