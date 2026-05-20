# Claude Code İçin Talimatlar — MediSim TR

> **Ana referans:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md) (stack, sprint, klinik, KVKK).
> **Memory vault:** [`docs/memory/README.md`](docs/memory/README.md) (Obsidian-uyumlu, görev tipine göre lazy read).
> Detaylı içerik orada — bu dosya 70 satır, sadece kritik kurallar.

Son güncelleme: 20 Mayıs 2026

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen **otonom geliştirme ajanısın**.

### Otonom kuralları

1. Küçük kararları kendin al, gerekçeni commit'e yaz.
2. Büyük kararlarda durdur ve sor (yeni modül, şema, deploy, ödeme, model değişikliği).
3. **Klinik içerikte ASLA otonom değil.** Bayrak: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. Her iş sonunda 2-3 cümle Türkçe rapor. Teknik monolog yok.
5. Token disiplini: küçük sprintte plan modu/agent açma. Direkt Read+Edit. Memory dosyalarını **sadece görev için gerekirse** Read et (her seansta otomatik yükleme yok).

## Mevcut Durum (20 Mayıs 2026)

**Test:** 415 vitest + 9 Playwright E2E pass. Build temiz.
**Sprint:** Master rapor Bölüm 11 — A/A.1/B.1/B.1.1 ✅, B.5 🔄 (ses dosyaları manuel), D.2 🔄 (cilt+solunum tamam, göz/ağız RPM bekliyor), **🎯 B.2 AI hasta diyaloğu** (mock backend canlı, Gemini bağlanacak).
**Demo route'lar:** `/3d-demo`, `/dialog-demo`, `/dialog-3d-demo`.

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
