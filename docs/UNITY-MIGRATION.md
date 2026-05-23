# Unity Geçişi — Frozen R3F Snapshot

> **Tarih:** 24 Mayıs 2026
> **Karar veren:** Ali Bey (kullanıcı)
> **Durum:** R3F çalışması **donduruldu**, Unity 6 LTS ile yeni baştan başlıyoruz.

---

## Neden Unity?

R3F + Three.js ile 53 commit'lik yoğun çalışma sonrası, son render testinde (24 May
ekran görüntüsü) üç temel görsel sorun çıktı:

1. **Hasta giyik** — Rocketbox Male_Adult_01 default outfit (yeşil tişört + kahverengi
   şort + ayakkabı). Klinik simülasyon için kabul edilemez: EKG/bandage/auskültasyon
   noktası kıyafetin üstünde sallanıyor.
2. **Yüz overlay'lerinin scale çakışması** — `PatientVitalSigns` (pupil, JVD, sweat) +
   `PatientFaceExpression` (cheek flush, eyebrow furrow, mouth) primitive'leri Rocketbox
   kafa scale'inde üst üste binip büyük renkli noktalar gibi görünüyor.
3. **Marker spam** — 32 anatomik landmark hep aktif (askültasyon + nabız + DTR refleks),
   sahnede yeşil küre kalabalığı oluşturuyor.

R3F'te bunlar çözülebilir ama dört yol birden gerekli:
- Mesh dispatch (Rocketbox material'larından kıyafet gizleme + body göster)
- Scale-aware overlay sistemi (face scale invariant)
- Marker visibility state machine (hover/select/exam)
- Multi-character pipeline (Female + Child + Elderly mesh'leri)

Toplam 2-3 hafta polish iş — sonunda hâlâ React + WebGL kompromisi. **Unity** ise:
- URP shader graph ile klinik renk bilim kontrolü
- Animator/blendshape pipeline endüstri standardı
- 4 platform (Mac/Win/Android/iOS) tek codebase
- Asset Store + Rocketbox/Mixamo entegrasyonu olgun
- Tıbbi simülasyon endüstrisi (Touch Surgery, Body Interact) Unity tabanlı

---

## Mimari Karar (kullanıcı onaylı)

```
┌──────────────────────────────────────────────────┐
│  Backend (mevcut React/TS — KORUNUR)             │
│  ├─ AI Dialogue /api/chat (Gemini SSE)           │
│  ├─ Cloudflare Worker + DO (planlı B.0)          │
│  ├─ KVKK proxy + secret koruma                   │
│  └─ Senaryo TS dosyaları (src/data/scenarios/*)  │
│                                                  │
│  → REST/SSE API expose                           │
└──────────────────────────────────────────────────┘
                      ↕ HTTP/SSE (JSON)
┌──────────────────────────────────────────────────┐
│  Frontend (Unity 6 LTS — YENİ)                   │
│  ├─ Mac/Win Standalone (.app/.exe)               │
│  ├─ Android APK + iOS IPA                        │
│  ├─ 3D sanal hasta (URP shader pipeline)         │
│  ├─ Equipment / vital / bleeding render          │
│  ├─ Hospital sahne                               │
│  ├─ UI (vitals HUD, action panel, debrief)       │
│  └─ Engine C# (TS engine 1:1 port)               │
└──────────────────────────────────────────────────┘
```

**Karma TS+C# stratejisi:**
- **Senaryolar TS'de kalsın** (klinik pre-commit hook + Türkçe + Markdown stil)
- **Build-time TS→JSON serializer** (Vite plugin veya `tsx` script): senaryo .ts
  dosyaları → `unity-build/scenarios/*.json` → Unity `StreamingAssets/scenarios/`
- **Engine C#'a port:** Unity runtime'da C# çalışır (offline mobile için zorunlu),
  ama kaynak doğru senaryo dosyalarından beslenir
- **AI Dialogue** Unity HttpClient → Cloudflare Worker `/api/chat` SSE
  (Unity Gemini'ye direkt gitmez, KVKK + secret koruma)

---

## Frozen R3F Çalışmasının Mevcut Durumu (snapshot)

**Branch:** `claude/vibrant-newton-e326e8`
**GitHub PR:** [#1](https://github.com/aliyilik02/medisim-tr/pull/1) → base `feat/backend-cf-worker`
**Commit count:** 53
**Test:** vitest **681 pass**, e2e **6 fail** (engine-flow 5 + patient-3d-demo glTF
URL 1) — fix denmedi, frozen
**Build:** ✅ temiz

### Korunan asset'ler (silinmedi, gelecekte referans için)

```
public/3d/
├── patient-rocketbox.glb (2.86 MB) — Rocketbox Male_Adult_01, MIT
├── patient-v1.glb (1.07 MB) — Sketchfab Male Torso, CC BY
├── patient-v2.glb (1.33 MB) — Sketchfab Male anatomy, CC BY
├── patient-v3.glb (15.1 MB) — ?? Belirsiz (RPM avatar olabilir)
├── hospital-room.glb (3.83 MB) — Sketchfab Hospital Room, CC BY (kullanılmıyor)
├── anatomy-internal.glb (3.55 MB) — Z-Anatomy Splanchnology, CC BY-SA
└── organs/
    ├── heart.glb (144 KB)
    ├── lungs.glb (371 KB)
    └── liver.glb (365 KB)
```

**Unity'ye taşınacak asset'ler (Faz 3 öncesi):**
- `patient-rocketbox.glb` → Unity'de Rocketbox FBX olarak yeniden import (Microsoft
  Rocketbox repo'sundan direkt FBX) — daha temiz animator pipeline
- `organs/*.glb` → URP shader ile yeniden material
- `anatomy-internal.glb` Splanchnology → Z-Anatomy CC BY-SA viral, alternatif
  BodyParts3D CC BY 4.0 mesh'leri tercih edilmeli

### Korunan R3F kod katmanları (silinmedi)

```
src/
├── components/patient-3d/
│   ├── AnatomicPatientModel.tsx (Rocketbox + breathing + skin tint shader)
│   ├── PatientBody3D.tsx (komposit)
│   ├── PatientEquipment.tsx (11 ekipman)
│   ├── PatientVitalSigns.tsx (pupil + JVD + sweat)
│   ├── PatientFaceExpression.tsx (cheek + eyebrow + mouth)
│   ├── PatientBleed.tsx (arterial/venous/capillary)
│   ├── PatientRash.tsx (6 rash tipi)
│   ├── PatientProfile (yaş kategori scale)
│   ├── MedicationBolus.tsx (IV pulse)
│   ├── HospitalRoom.tsx (primitif sahne)
│   ├── regions.ts (32 anatomik marker)
│   └── LICENSE-3D.md (atıf belgesi)
├── clinical/
│   ├── patient-profile.ts (PALS yaş kategori)
│   └── scenario-visual-state.ts (13 senaryo → initial equipment + bleed)
├── pages/
│   ├── Patient3DDemoPage.tsx
│   ├── DialogDemoPage.tsx
│   └── PatientDialog3DPage.tsx (743 satır, full senaryo + 3D + dialogue)
└── engine/ (saf TS — Unity C# port hedefi)
```

**Unity'ye port etmeyecek (yalnızca arşiv):**
- React component'leri (Unity karşılığı GameObject + MonoBehaviour)
- Tailwind/shadcn UI (Unity karşılığı UI Toolkit)
- R3F-specific hooks (Unity karşılığı Animator + URP shader)

**Unity'ye port edilecek (1:1):**
- `src/engine/` saf TS logic → C# namespace `MedisimTR.Engine`
- `src/data/scenarios/*.ts` → build-time JSON serializer ile aynı kalır
- `src/clinical/medications.ts` + `medications-extended.ts` → C# `MedicationCatalog`
- `src/clinical/patient-profile.ts` → C# `PatientProfile` static helpers
- Tüm vitest test case'leri → xUnit C# karşılığı

---

## Yarım Kalan İşler (Unity sonrası referans için, R3F'te düzeltilmeyecek)

- ❌ Hasta kıyafetli sorunu (Rocketbox default outfit)
- ❌ Face overlay scale çakışması
- ❌ 32 marker visibility state machine
- ❌ Multi-character pipeline (Female / Child / Elderly Rocketbox indirme)
- ❌ patient-v3.glb içeriğinin tespiti (15 MB belirsiz dosya)
- ❌ e2e fix: `patient-3d-demo.spec.ts:40` regex `/patient-v\d\.glb/` → `patient-rocketbox`
- ❌ e2e fix: `engine-flow.spec.ts` 5 timeout — pointer-events overlay sorunu
- ❌ Tailwind v3 → v4 migration
- ❌ Cloudflare Worker + DO prod deployment

---

## Unity Yol Haritası (6 faz, ~12 hafta)

| Faz | Süre | İçerik |
|---|---|---|
| **1 — Skeleton** | 1 hafta | Unity 6 LTS + URP + 4 platform build profile + Git LFS + bed/patient/breathing |
| **2 — Engine port** | 2 hafta | TS engine → C# 1:1 port + xUnit testler + senaryo TS→JSON pipeline |
| **3 — 3D body + vital + ekipman** | 3 hafta | 11 ekipman prefab + cyanosis/pallor URP shader + 32 marker + face blendshape + bleeding particle + rash |
| **4 — UI + dialogue + scoring** | 2 hafta | Vital HUD UI Toolkit + action panel + Cloudflare Worker SSE → Unity HttpClient + debrief |
| **5 — 4 platform build** | 2 hafta | Mac (Apple Silicon + Intel) + Windows + Android APK + iOS IPA build + per-platform optim |
| **6 — Polish + klinik validasyon** | 2 hafta | Hekim review + KVKK disclaimer + final pass |

### Unity proje yeri

```
C:\Users\Mehmet Ali Yılık\Desktop\medisim-tr-unity\   ← AYRI repo
```

- Mevcut `medisim-tr` repo (R3F + TS backend) ayrı kalır
- Unity Library/ Temp/ ~5 GB → mevcut repo'yu kirletmez
- Git LFS gerekli (FBX, texture, audio)

### Otonom kararlar

- **Unity 6 LTS (6000.0.x)** — 2026 itibariyle URP/HDRP olgun, .NET 9 IL2CPP
- **URP (Universal Render Pipeline)** — Mac+Win+Android+iOS dört platform tutarlı
- **TS→JSON exporter:** `tsx` script (Vite plugin değil — daha basit, debuggable)
- **C# code style:** Microsoft StyleCop + .editorconfig + xUnit
- **Asset Store ücretli paket YOK** — sadece MIT/CC BY karakter + asset

---

## Resume Senaryosu

Unity tarafında sorun çıkar, R3F'e geri dönmek istenirse:

```bash
git checkout claude/vibrant-newton-e326e8
npm install
npm run dev  # localhost:5173/dialog-3d-demo
```

Tüm component'ler + senaryolar + asset'ler aynen çalışır. Sadece yarım kalan
işler (yukarıdaki liste) tekrar başlanır.

---

**Son not:** Bu karar 24 May 2026 akşamı ekran görüntüsü → kullanıcı "yıkıldım"
geri bildirimi → engine geçişi kararı zincirinde verildi. R3F yatırımı boşa
gitmedi — engine + senaryolar + AI dialogue + klinik kütüphane Unity tarafında
%70 yaşayacak.
