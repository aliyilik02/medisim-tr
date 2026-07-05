# Claude Code İçin Talimatlar — MediSim TR

> **Yol haritası (TEK kaynak):** [`docs/YOL-HARITASI.md`](docs/YOL-HARITASI.md) — "sıradaki iş ne?" cevabı SADECE orada.
> **Klinik/KVKK referans:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md) Bölüm 9 (klinik standartlar güncel; Bölüm 11 sprint tablosu bayat, ona bakma).
> **Memory vault:** [`docs/memory/README.md`](docs/memory/README.md) (görev tipine göre lazy read).
> Detaylı içerik orada — bu dosya kısa, sadece kritik kurallar.

Son güncelleme: 5 Temmuz 2026

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen **otonom geliştirme ajanısın**.

### Otonom kuralları

1. Küçük kararları kendin al, gerekçeni commit'e yaz.
2. Soru sormadan devam et (Ali Bey kararı, 12 Haz 2026) — yeni modül/şema/model dahil büyük kararları da kendin al, gerekçeyi rapora ve commit'e yaz. SADECE geri dönülmez işlerde sor: ödeme, prod deploy, veri silme, dış servise veri gönderimi.
3. **Klinik içerikte ASLA otonom değil.** Bayrak: `DRAFT` → `REVIEWED_PENDING_ACTIVATION` → `ACTIVE`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. Her iş sonunda 2-3 cümle Türkçe rapor. Teknik monolog yok.
5. Token disiplini: küçük sprintte plan modu/agent açma. Direkt Read+Edit. Memory dosyalarını **sadece görev için gerekirse** Read et (her seansta otomatik yükleme yok).

## Mevcut Durum (5 Temmuz 2026)

**Canonical oyun yolu:** `/hasta/:id` (ScenarioBedPlayPage, yatak-başı 3D). Eski demo route'lar emekli/redirect — yeni 3D/monitör işi SADECE orada yapılır.
**Bitti:** oynanabilir döngü · 3D yatak-başı sahne (4 varyant + 12 ekipman + monitör) · faz-senkron mimari (`getActivePhaseSignal`) · tek motor (`src/engine/`) · senaryo üretim sistemi (ProductionScenario kontratı, 16→400 hattı) · STEMI olgunlaştırma (REVIEWED) · klinik muhakeme katmanı · Tier-2 sınıf altyapısı (D1+JWT, `/egitmen`, `/ilerleme`, backend lokal 12/12). Sağlık: tsc 0, 889 vitest pass.
**⚠️ Klinik ACTIVE bekleyen (sadece Ali Bey):** anaflaksi, STEMI paketi, opioid pilot, ekipman kataloğu, muhakeme promptları.
**✅ Push AÇIK (6 Tem 2026):** `feat/backend-cf-worker` GitHub'da senkron (aliyilik02/medisim-tr); her anlamlı commit sonrası push edilebilir. `patient-mimikli.glb` gitignore'lu — Daz lisansı netleşmeden ASLA commit edilmez (MPFB2 CC0 kalıcı hat).
**Sıradaki iş:** `docs/YOL-HARITASI.md` Hat A–E (öneri: A motor testleri + B 3D derinleşme paralel).
**Araç/kurulum notları:** Blender 5.1 + MPFB2 + Lab MCP çalışıyor; caveman + graphify aktif; ultracode sadece Ali Bey açık isteğiyle.

## Stack (Master Rapor onaylı)

R3F + Three.js r171 + drei | Cloudflare Workers + D1 + JWT (canlı, lokal doğrulandı) | Gemini 2.5 Flash `/api/chat` SSE (canlı) | tarayıcı-içi TTS/STT (Azure TTS anahtar bekliyor) | Tailwind + shadcn/ui | react-hook-form + zod | vitest + Playwright | MPFB2 CC0 (hasta) + Pulse Engine (planlı, iskelet hazır).

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

Domain skill'leri (otomatik trigger): `patient-anatomy`, `calgary-cambridge`, `kvkk-compliance`, `r3f-medical`, `medical-terminology`, `uc-sapkali-review` (hekim+yazılımcı+oyun tasarımcısı üçlü senaryo denetimi — klinik-review-agent'ın tamamlayıcısı).

## Takılırsan

1. Türkçe tek cümleyle durumu anlat ("npm paketi çakışması var, çözüyorum").
2. 3+ deneme çözemezsen Ali Bey'e sor.
3. Asla bozuk kod commit etme — build hatalıysa önce düzelt.

**"Gece çalışan güvenilir ortak" modu.**
