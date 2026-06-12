# Claude Code İçin Talimatlar — MediSim TR

> **Ana referans:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md) (stack, sprint, klinik, KVKK).
> **Memory vault:** [`docs/memory/README.md`](docs/memory/README.md) (Obsidian-uyumlu, görev tipine göre lazy read).
> Detaylı içerik orada — bu dosya 70 satır, sadece kritik kurallar.

Son güncelleme: 12 Haziran 2026

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen **otonom geliştirme ajanısın**.

### Otonom kuralları

1. Küçük kararları kendin al, gerekçeni commit'e yaz.
2. Soru sormadan devam et (Ali Bey kararı, 12 Haz 2026) — yeni modül/şema/model dahil büyük kararları da kendin al, gerekçeyi rapora ve commit'e yaz. SADECE geri dönülmez işlerde sor: ödeme, prod deploy, veri silme, dış servise veri gönderimi.
3. **Klinik içerikte ASLA otonom değil.** Bayrak: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. Her iş sonunda 2-3 cümle Türkçe rapor. Teknik monolog yok.
5. Token disiplini: küçük sprintte plan modu/agent açma. Direkt Read+Edit. Memory dosyalarını **sadece görev için gerekirse** Read et (her seansta otomatik yükleme yok).

## Mevcut Durum (12 Haziran 2026)

**Sanal Hasta Planı:** `docs/PLAN-SANAL-HASTA-V1.md` (DRAFT, Ali Bey sözlü onayladı, 3 faz).
**✅ Faz 1 — oynanabilir döngü TAMAMLANDI (13 Haz gece):** `/dialog-3d-demo` uçtan uca oynanıyor — action UI (sağ panel "Vaka Akışı" sekmesi: StepDisplay+InventoryPanel), gerçek zamanlı kötüleşme (`src/engine/physiology.ts` — `PhysiologyProvider` arayüzü + `SimplePhysiologyProvider`, Faz 3 Pulse swap'ine hazır), tetkik (lab countdown+sonuç modalları), oskültasyon senaryo override (`scenarioRegions.ts`, wheeze→adrenalin sonrası normal), debrief (DebriefScreen). Orkestrasyon `src/hooks/useScenarioRunner.ts` (ScenarioPlayPage'e bilinçli DOKUNULMADI — sonraki sprintte o da bu hook'a geçebilir).
**⚠️ Klinik review bekliyor:** anaflaksi `deterioration`+`auscultation` alanları DRAFT (commit mesajında gerekçe + WAO 2020). Ali Bey onayı olmadan ACTIVE sayılmaz.
**⚠️ Yarım model migrasyonu (Ali Bey'in işi, dokunulmadı):** worktree'de `patient-mimikli.glb` (161MB!) + shader refactor uncommitted. `InternalOrgans` silinen `anatomy-internal.glb`'ye bakıyordu → graceful error boundary eklendi (organ katmanı sessiz kapanır). `e2e/patient-3d-demo.spec.ts` 2 testi bu migrasyon yüzünden lokal kırık (patient-v1.glb silinmiş + 161MB yavaş yük). 161MB GLB GitHub 100MB limitini aşar — push öncesi draco/gltf-transform şart.
**Araç kararları:** Blender MCP çekirdek (sahne üretimi Faz 2), Higgsfield yan rol (intro videoları), Unity park.
**Yeni kurulumlar (12 Haz):** caveman plugin (restart sonrası aktif), graphify (`/graphify .`), `defaultMode: bypassPermissions` + CLAUDE.md kural 2 gevşetildi (soru sormadan devam). Ultracode: Ali Bey `/effort ultracode` veya `ultracode:` prefix ile açar.

### Önceki sprint durumu (20 Mayıs gece sonu)

**Test:** 429 vitest + 8 Playwright E2E pass. Build temiz.
**Sprint:** Master rapor Bölüm 11 —
- ✅ A/A.1/B.1/B.1.1 — manken + marker + breathing
- ✅ B.2 — AI hasta diyaloğu (Gemini 2.5 Flash backend `/api/chat` SSE canlı; mock fallback otomatik)
- ✅ B.3 — Vital HUD (PALS yaş alarm) + 12-Lead EKG modal
- ✅ B.4 — Anatomik atlas kesim (anterior z-plane) + Splanchnology mesh **filter çalışıyor ama Splanchnology asset ham** (Default.001/Organ.001 generic, organ ayırma net değil — yarın Sketchfab tek tek CC BY model)
- ✅ D.1 hafif — `vitalsToVisual` (SpO2<88→siyanoz, SBP<90→solgun) + `useVitalsTick` session entegrasyonu; tam Pulse Engine sidecar D.1 ileride
- ✅ Skill paketi — 5 yeni domain skill (vital-signs-hud, z-anatomy-binding, pulse-engine-binding, rpm-avatar, tccc-scenarios)
- ✅ Cloudflare MCP (docs+bindings) + Obsidian MCP semantic search
- ✅ Playwright e2e smoke + `.claude/agents/3d-vision-tester.md` custom agent + `test:visual` script
- 🔄 B.5 — oskültasyon ses dosyaları **indi** (4 ogg `public/sounds/auscultation/`) — UI bağlama Faz 1.4'te
- 🔄 D.2 RPM avatar — kullanıcı GLB indirmeye başlamıştı, devamı bekliyor (göz/ağız blendshape)
- ⏸ Senaryo motor TAM entegrasyon — action UI (`/dialog-3d-demo` step engine + action submit) bekliyor

**Demo route'lar:** `/3d-demo`, `/dialog-demo`, `/dialog-3d-demo` (tam paket).

**Sıradaki seans:** Faz 1 — oynanabilir döngü (plan: `docs/PLAN-SANAL-HASTA-V1.md` Bölüm 4). RPM avatar (D.2) ve Sketchfab organ modelleri Faz 2-3'e kaydı.

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

Domain skill'leri (otomatik trigger): `patient-anatomy`, `calgary-cambridge`, `kvkk-compliance`, `r3f-medical`, `medical-terminology`.

## Takılırsan

1. Türkçe tek cümleyle durumu anlat ("npm paketi çakışması var, çözüyorum").
2. 3+ deneme çözemezsen Ali Bey'e sor.
3. Asla bozuk kod commit etme — build hatalıysa önce düzelt.

**"Gece çalışan güvenilir ortak" modu.**
