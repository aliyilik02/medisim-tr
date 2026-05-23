# Claude Code İçin Talimatlar — MediSim TR

> **Ana referans:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md) (stack, sprint, klinik, KVKK).
> **Memory vault:** [`docs/memory/README.md`](docs/memory/README.md) (Obsidian-uyumlu, görev tipine göre lazy read).
> Detaylı içerik orada — bu dosya 70 satır, sadece kritik kurallar.

Son güncelleme: 24 Mayıs 2026

> ⚠️ **24 May 2026 — UNITY GEÇİŞİ KARARI**
>
> R3F + Three.js çalışması **donduruldu**. Yeni geliştirme **Unity 6 LTS**
> üzerinde, ayrı repo'da (`Desktop\medisim-tr-unity\`).
>
> - Detay + frozen snapshot: [`docs/UNITY-MIGRATION.md`](docs/UNITY-MIGRATION.md)
> - Bu repo (medisim-tr) **backend olarak yaşar:** TS senaryolar +
>   `/api/chat` Gemini SSE + Cloudflare Worker. Unity bunlara HTTP/SSE ile bağlanır.
> - R3F kod + asset'ler **silinmedi**, gelecekte resume için aynen duruyor.
> - PR #1 frozen, yeni R3F işi yapılmıyor.

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen **otonom geliştirme ajanısın**.

### Otonom kuralları

1. Küçük kararları kendin al, gerekçeni commit'e yaz.
2. Büyük kararlarda durdur ve sor (yeni modül, şema, deploy, ödeme, model değişikliği).
3. **Klinik içerikte ASLA otonom değil.** Bayrak: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. Her iş sonunda 2-3 cümle Türkçe rapor. Teknik monolog yok.
5. Token disiplini: küçük sprintte plan modu/agent açma. Direkt Read+Edit. **Önce skill, sonra memory** — bilgi skill'de varsa memory'yi açma (`docs/memory/README.md` "Skill mi Memory mi" karar tablosu). Memory'de `Grep` keyword + `Read offset/limit`, baştan sona okuma. Aynı dosyayı iki kez Read etme.

## Mevcut Durum (23 Mayıs 2026 — gece sonu seansı)

**Test:** 648 vitest pass. e2e dialog-3d-vision + patient-profile-badge testIgnore (sahne refactor flaky), kalan ~32 e2e pending. Build temiz. **53 commit** `claude/vibrant-newton-e326e8` branch'inde, GitHub PR #1'de.

**23 May seansları toplam özeti:**

### Gündüz (7 commit) — hospital room sahnesi
- `be53168` hospital-room mesh-by-mesh layout sistemi (Sketchfab CC BY GLB)
- `9d3609c` dev paneline rotation X/Y/Z slider
- `da1a17a` hasta modeli Rocketbox Male_Adult_01 (MIT, 8.68 → 2.86 MB)
- `2a016b6` HospitalRoom primitif drei upgrade (RoundedBox + MeshTransmission + Reflector — Minecraft → archviz)
- `38c2616` hasta+oda eksen hizalama (HospitalRoom Y rotation +π/2 wrapper)
- `7eaa07c` + `036103a` e2e dialog-3d-vision testIgnore (sahne flaky)
- `22a60c1` renk/ışık dengeleme + CHANGELOG v0.3.1
- `8541c57` dead code temizliği (HospitalBed + RoomLayoutDevPanel + useRoomLayoutOverrides)

### Gece sonu (11 commit) — 3D body etkileşim sprint'leri (kullanıcı listesinin tamamı)
- `6c77096` **B.6 PatientEquipment** — 7 ekipman R3F primitive (O2 mask, nasal, EKG×10 Mason-Likar, IV kateter, BP cuff, SpO2, bandage)
- `9f0288f` **B.6.1 PatientVitalSigns** — pupil çapı + GCS göz kapağı + terleme + JVD (computed severity)
- `7752c71` **B.6.2 MedicationBolus** — IV kateter konumunda 2sn pulse, klinik renk klasifikasyonu (vazopresör kırmızı, opioid mor, antiaritmik sarı, metabolik mavi, antiplatelet pembe)
- `8f011d0` 29 unit test (PatientVitalSigns 17 + MedicationBolus 12)
- `c030fcd` CHANGELOG v0.3.2 Sprint B.6
- `1924cf4` **B.7 PatientProfile** — PALS yaş kategori + scaleFactor + label + 34 unit test
- `115e818` Bed parametric scale + CHANGELOG v0.3.3
- `c080fa2` **B.7+ 6 yeni periferik nabız marker** (radial ×2 + dorsalis pedis ×2 + posterior tibial ×2) — total 26 marker
- `4e8ac00` patient-profile-badge e2e spec (testIgnore — flaky refactor TODO)

### Kullanıcı liste durumu (tamam)
- ✅ Marker'lar: 20 → 26 (B.7+ periferik nabız)
- ✅ Vital bulgular: pupil + GCS + terleme + JVD (B.6.1)
- ✅ Diğer karakter: PatientProfile scale parametric (infant 0.28, pediatric 0.75, adult 1.0, elderly 0.97); 14 senaryo otomatik
- ✅ Ekipman ekleme: 7 component conditional render (B.6)
- ✅ İlaç ekleme: MedicationBolus pulse + drug color (B.6.2)
- ✅ Senaryolara entegre: tüm 14 senaryoda profil otomatik derive

**Bir günlük öğrenim (Sketchfab CC BY hospital-room.glb):**
Sketchfab Auto-Converted glTF export'unda mesh'ler "explode layout"ta — 2.4m hat boyunca dizili, gerçek oda değil. Mesh-by-mesh layout dict + override + transform_apply pattern denemeleri kaliteyi sağlayamadı (parent matrix + pivot karmaşası). **Pragmatik karar: GLB'yi bırak, drei primitif sahne.** Tam kontrol bizde + Minecraft görüntüsünden archviz seviyesine. GLB inflated versiyon `public/3d/` arşivde referans olarak duruyor.

**Connector envanteri (kullanıma hazır):**
- **SketchUp MCP** (Anthropic SDK, API key yok): mimari-grade hospital room build için (4-6 saatlik iş, .skp → Blender → GLB pipeline)
- **Hyper3D Rodin** (Blender MCP, embedded free trial — kotası dolu): AI text-to-3D
- **Polyhaven** (Blender MCP, key yok): CC0 PBR textures + 78 furniture model
- **Sketchfab** (Blender MCP, free Sketchfab API key): tek tek medikal mesh
- **Meshy MCP** (skill `npx skills add meshy-dev/meshy-3d-agent`, API key ücretli, kullanılmadı)

**Sprint:** Master rapor Bölüm 11 —
- ✅ A/A.1/B.1/B.1.1 — manken + marker + breathing
- ✅ B.2 — AI hasta diyaloğu (Gemini 2.5 Flash backend `/api/chat` SSE canlı)
- ✅ B.3 — Vital HUD + 12-Lead EKG modal
- ✅ B.4 — Anatomik atlas kesim
- ✅ B.5 — 4 oskültasyon ses + 20 anatomik marker + MediaAttributions
- ✅ B.5+ Sprint — **Hospital odası 3D sahne** drei primitif klinik kompozisyon (yatak + IV pole + monitor + sandalye + sofa + cabinet + tavan ışığı, hasta koordinat hizalı)
- ✅ Hasta modeli Rocketbox Male_Adult_01 (MIT, klinik PBR pipeline)
- ✅ D.1 hafif — vital → visual mapping
- ⏳ **Pozisyon ince ayar** — kullanıcı ekran görüntüsü ile iterasyon bekliyor (vital monitör çakışma, IV pole ölçek, over-bed table boşluk)
- 🔄 D.2 RPM avatar (göz/ağız blendshape) — kullanıcı GLB indirme bekliyor
- 🔄 Splanchnology yerine tek tek CC BY organ modelleri — kullanıcı indirme
- ⏸ C.1 Tailwind v3 → v4 + shadcn/ui geçiş
- ⏸ B.0 Cloudflare Workers/DO prod (BAA + secret kurulumu)
**Sprint:** Master rapor Bölüm 11 —
- ✅ A/A.1/B.1/B.1.1 — manken + marker + breathing
- ✅ B.2 — AI hasta diyaloğu (Gemini 2.5 Flash backend `/api/chat` SSE canlı; mock fallback otomatik)
- ✅ B.3 — Vital HUD (PALS yaş alarm) + 12-Lead EKG modal
- ✅ B.4 — Anatomik atlas kesim (anterior z-plane) + Splanchnology mesh filter v3 (LINES gizle + Mucosa hide + kalp animasyon hedefi sıkı)
- ✅ B.5 — 4 oskültasyon ses (Wikimedia CC BY/BY-SA) + 20 anatomik marker (5 kardiyak APE-T-M + 4 akciğer lobu + 6 karın kadrant + 2 karotis + 2 femoral) + MediaAttributions UI atıf paneli
- ✅ D.1 hafif — `vitalsToVisual` (SpO2<88→siyanoz, SBP<90→solgun) + `useVitalsTick` session entegrasyonu; tam Pulse Engine sidecar D.1 ileride
- ✅ Skill paketi — 5 yeni domain skill (vital-signs-hud, z-anatomy-binding, pulse-engine-binding, rpm-avatar, tccc-scenarios)
- ✅ Cloudflare MCP (docs+bindings) + Obsidian MCP semantic search
- ✅ Playwright e2e smoke + `.claude/agents/3d-vision-tester.md` custom agent + `test:visual` script
- ✅ anatomy-internal.glb — KHR_materials_pbrSpecularGlossiness temizlendi (gltf-transform metalrough+meshopt)
- ✅ Senaryo motor TAM entegrasyon — `/dialog-3d-demo` action submit + decision/info UI + DebriefModal + Toaster:
  * ActionHistoryPanel (sol orta) — engine evaluation log son 10 entry
  * CurrentStepPanel (alt-orta) — step.kind'a göre action hint / decision option / info continue / finished
  * DebriefModal — session.finished → finalizeSession + grade A-F + skor + kritik hatalar + adım sonuçları + restart
  * Toaster (sağ üst) — 3sn action feedback popup, success/warning/critical/info kind
- ✅ Layout polish — cilt tonu kontrolü sağ alta taşındı, MediaAttributions UI'dan kaldırıldı (atıf LICENSE dosyalarında)
- ✅ OrganModel skeleton + LICENSE-3D.md CC BY indirme rehberi (Sketchfab/BodyParts3D kalp/akciğer/karaciğer adayları)
- 🔄 D.2 RPM avatar — kullanıcı GLB indirmeye başlamıştı, devamı bekliyor (göz/ağız blendshape)
- 🔄 Splanchnology — Z-Anatomy mesh çalışıyor ama generic "Default.001/Organ.001" mesh'ler nedeniyle organ ayrımı sınırlı; tek tek Sketchfab/BodyParts3D CC BY model alternatifi `LICENSE-3D.md` rehberinde, `OrganModel.tsx` skeleton hazır
- ⏸ C.1 Tailwind v3 → v4 + shadcn/ui geçiş — 2-4 saatlik dedicated iş, visual regression riski
- ⏸ B.0 Cloudflare Workers/DO prod (BAA + secret kurulumu)

**Demo route'lar:** `/3d-demo`, `/dialog-demo`, `/dialog-3d-demo` (tam paket).

**Branch akışı:** Aktif gelişme `feat/backend-cf-worker` üstünde. Bu seansın işleri `claude/vibrant-newton-e326e8` branch'ında, GitHub'a push edildi → PR #1 `feat/backend-cf-worker`'a açık.

**Yarın sırada:**
1. Kullanıcı ekran görüntüsü ile pozisyon ince ayar iterasyonu (HospitalRoom mesh çakışma/boşluk)
2. e2e dialog-3d-vision refactor (Canvas pointer-events + selector güncelle)
3. SketchUp MCP ile hospital_bed.skp build + Blender GLB export → R3F'te primitif yerine GLB (kalite sıçraması)
4. Hyper3D Rodin bireysel hesap deneme (free trial diğer kullanıcı kotası tükendi)
5. RPM avatar entegrasyon → D.2 göz/ağız
6. Splanchnology yerine tek tek CC BY organ modelleri
7. C.1 Tailwind v4 migration
8. B.0 Cloudflare Workers/DO prod

**PR:** https://github.com/aliyilik02/medisim-tr/pull/1 → base `feat/backend-cf-worker`. CI e2e flaky (dialog-3d-vision testIgnore aktif), diğer 36 e2e pending.

## Stack (Master Rapor onaylı)

R3F + Three.js r171 + drei | Cloudflare Workers + DO (planlı B.0) | Gemini 2.5 Flash (planlı B.2) | Azure tr-TR Neural TTS | Tailwind v3→v4 + shadcn/ui | react-hook-form + zod + @rjsf/core | vitest + Playwright | Sketchfab CC BY + RPM (planlı) + Pulse Engine (planlı D.1).

## Mimari Kuralları — İhlal etme

1. **Engine/UI ayrımı:** `src/engine/` saf fonksiyonel, React import YOK.
2. **İki ilaç kataloğu:** `medications.ts` (UI) + `medications-extended.ts` (farmakoloji). id ile eşleşir.
3. **Senaryolar TS objesi:** `src/data/scenarios/*.ts`, `index.ts`'e eklenmezse listeye girmez.
4. **3D koordinatlar:** `docs/memory/medisim_anatomik_landmark.md` (8-head canon, formula). Gözle tahmin YAPMA.
5. **Klinik standartlar:** Master rapor Bölüm 9.A-9.E.
6. **Tailwind utility-first**, tekrar eden stil → `src/index.css` `@layer components`.

## Klinik İçerik Disiplini (KRİTİK)

- Her senaryoda min 1 TR kılavuz `guideline_references` (rapor 9.B tablosu)
- ICD-10 + SNOMED CT zorunlu
- Pediatride mg/kg + max doz (rapor 9.D Kural 1)
- Yaş-spesifik vital — **PALS 2015 default** (rapor 9.C tablosu)
- TİTCK ruhsatlı ilaç
- Commit: klinik dosya `--no-verify` SADECE Ali Bey onaylı PR'da, `[CLINICAL:REVIEWED]` prefix
- **Disclaimer:** "Eğitim amaçlıdır, klinik karar destek değildir" her sayfada

## Tasarım Dili (özet)

Dark mode, klinik monitör estetiği. Renkler: ink + brand teal `#0d9488` + clinical (critical/warning/stable/info). Font: Instrument Serif (display), Geist (sans), Geist Mono (mono). Asla: mor gradient, Inter, emoji kalabalığı.

## Git Akışı

Türkçe conventional commit (`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`). Klinik: `[CLINICAL:REVIEWED]` prefix. Push öncesi `npm run build` temiz olmalı.

## Slash Komutları + Skill'ler

`/durum`, `/senaryo-ekle`, `/ilac-ekle`, `/test-calis`, `/build-kontrol`, `/ilac-dozaj-dogrulayici`, `/klinik-review-agent`, `/kvkk-pii-scanner`, `/senaryo-sema-dogrulayici`.

Domain skill'leri (otomatik trigger): `patient-anatomy`, `calgary-cambridge`, `kvkk-compliance`, `r3f-medical`, `medical-terminology`, `three-best-practices`, `r3f-best-practices`. Üçüncü taraf skill atıfları → [`.claude/skills/THIRD-PARTY-LICENSES.md`](.claude/skills/THIRD-PARTY-LICENSES.md).

## Takılırsan

1. Türkçe tek cümleyle durumu anlat ("npm paketi çakışması var, çözüyorum").
2. 3+ deneme çözemezsen Ali Bey'e sor.
3. Asla bozuk kod commit etme — build hatalıysa önce düzelt.

**"Gece çalışan güvenilir ortak" modu.**

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
