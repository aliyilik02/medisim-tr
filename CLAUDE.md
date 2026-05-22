# Claude Code İçin Talimatlar — MediSim TR

> **Ana referans:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md) (stack, sprint, klinik, KVKK).
> **Memory vault:** [`docs/memory/README.md`](docs/memory/README.md) (Obsidian-uyumlu, görev tipine göre lazy read).
> Detaylı içerik orada — bu dosya 70 satır, sadece kritik kurallar.

Son güncelleme: 21 Mayıs 2026

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen **otonom geliştirme ajanısın**.

### Otonom kuralları

1. Küçük kararları kendin al, gerekçeni commit'e yaz.
2. Büyük kararlarda durdur ve sor (yeni modül, şema, deploy, ödeme, model değişikliği).
3. **Klinik içerikte ASLA otonom değil.** Bayrak: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. Her iş sonunda 2-3 cümle Türkçe rapor. Teknik monolog yok.
5. Token disiplini: küçük sprintte plan modu/agent açma. Direkt Read+Edit. **Önce skill, sonra memory** — bilgi skill'de varsa memory'yi açma (`docs/memory/README.md` "Skill mi Memory mi" karar tablosu). Memory'de `Grep` keyword + `Read offset/limit`, baştan sona okuma. Aynı dosyayı iki kez Read etme.

## Mevcut Durum (21 Mayıs 2026 — gece seansı)

**Test:** 504 vitest + 42 Playwright E2E pass. Build temiz. 35 commit `claude/vibrant-newton-e326e8` branch'inde, GitHub'a push edildi.
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

**Branch akışı:** Aktif gelişme `feat/backend-cf-worker` üstünde. Bu seansın işleri `claude/vibrant-newton-e326e8` branch'ında, GitHub'a push edildi → PR'ı `feat/backend-cf-worker`'a aç.

**Yarın sırada:** (1) RPM avatar entegrasyon → D.2 göz/ağız (Ali Bey manuel GLB indirme), (2) Splanchnology yerine tek tek CC BY organ modelleri (`OrganModel` ile entegre — Ali Bey indirme), (3) C.1 Tailwind v4 migration (büyük scope, dedicated tur), (4) Cloudflare BAA prod kurulum (B.0, Ali Bey hesap + secret).

**PR açma:** https://github.com/aliyilik02/medisim-tr/pull/new/claude/vibrant-newton-e326e8 → base `feat/backend-cf-worker` (Ali Bey 1 tık).

**Bu seansın özet (35 commit):** `CHANGELOG.md` v0.3.0 başlığı altında detaylı — 20 marker + ses + atıf + engine UI tam akış (Action submit + Decision/Info + Debrief + Toast + Sparkline + MarkerDevPanel) + /hakkinda + HomePage 3D demo bölümü + 156 yeni vitest + 17 yeni e2e + Vite manualChunks + React.memo perf + CI workflow genişletme.

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
