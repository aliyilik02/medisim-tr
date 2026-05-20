# Claude Code İçin Talimatlar — MediSim TR

> **ANA REFERANS:** [`docs/MASTER-REPORT-v3.md`](docs/MASTER-REPORT-v3.md). Stack kararları, sprint yol haritası, klinik standartlar, KVKK çerçevesi orada. Klinik karar veya senaryo eklemeden önce mutlaka **Bölüm 9.A-9.E** re-read et.

Son güncelleme: 20 Mayıs 2026

---

## Ajanın görevi

Kullanıcı (Ali Bey) sahada çalışan sağlık profesyoneli + ürün sahibi. Akşam evde gelişme görmek ister. Sen onun **otonom geliştirme ajanısın** — aktif müdahale beklemeden görevleri tamamla.

### Otonom çalışma kuralları

1. **Küçük kararları kendin al.** Değişken adı, dosya yapısı, refactor, test → sor değil, yap. Gerekçeni commit'e yaz.
2. **Büyük kararlarda durdur ve sor.** Yeni modül, şema, deploy, ödeme, model değişikliği.
3. **Klinik içerikte ASLA otonom değil.** Bayrak hiyerarşisi: `DRAFT` (Claude) → `REVIEWED_PENDING_ACTIVATION` (Ali Bey onayı bekliyor) → `ACTIVE` → `ARCHIVED`. ACTIVE'e geçişi sadece Ali Bey yapar.
4. **Her iş sonunda 2-3 cümle Türkçe rapor.** Teknik monolog yok.
5. **Ekran başında olmadığını varsay.** Çalıştır-gör-ilerle.

### İletişim tonu

Türkçe, sade, kısa. Memory: `feedback_sade_dil.md` (TR teknik terim → sade karşılık tablosu), `feedback_token_tasarrufu.md` (küçük sprintlerde plan modu/agent açma).

---

## Mevcut Durum (20 Mayıs 2026)

**Test:** 415 vitest pass / 0 fail (22 dosya) + 9 Playwright E2E pass. Build temiz.

**Senaryo sayısı:** 14 (`clinical_codes` ICD-10/SNOMED enjekte). İlaç katalog: ~79 entry. Ekipman v2: 40+.

**Sprint durumu (master rapor Bölüm 11 adlandırması):**
- ✅ A — procedural mannequin + marker + breathing
- ✅ A.1 — anatomik orantı düzeltme
- ✅ B.1 — Sketchfab chuma6oy `patient-v2.glb` (CC BY 4.0, wrapper scale 0.107 + y+0.49)
- ✅ B.1.1 — marker yüzey + shader breathing
- 🔄 B.5 — auskültasyon ses altyapısı (kod hazır: `auscultationAudio.ts`; ses dosyaları manuel indirme bekliyor)
- 🔄 D.2 — fizyolojik animasyon (cilt tonu shader 4 preset + çift center solunum tamamlandı; göz blink + ağız + pupil RPM avatar bekliyor)
- 🎯 **SIRADAKİ: B.2 — AI hasta diyaloğu UI** (Gemini 2.5 Flash + Calgary-Cambridge backbone) — backend B.0 ile birlikte

**Önceki seansta yapıldı:** Stetoskop + O2 maskesi prosedür altyapısı (procedure overlay + animation hook + 5 region marker). Bu raporun B.5/D.2 erken parçası.

### Klinik kural sistemi (Faz 8'den)

`src/data/clinical-rules/turkiye-2024-draft.json` — 10 kural, tümü `REVIEWED_PENDING_ACTIVATION` (commit `e432128`). Validator advisory mode'da (engine flow'a etki yok, sadece rapor). ACTIVE'e geçiş Ali Bey onayıyla.

### Sıradaki adımlar (rapor B.2-D.2)

1. **B.2 AI diyalog UI** — Cloudflare Workers + Gemini 2.5 Flash + Calgary-Cambridge process. Bu adım için backend (B.0) önce kurulmalı.
2. **B.5 ses dosyaları indirme** + entegrasyon test (kullanıcı manuel adım)
3. **D.2 RPM avatar** entegrasyonu (göz blink + ağız + pupil)
4. **DRAFT→ACTIVE klinik review** — 10 kural Ali Bey ile gözden geçirilir
5. **Bundle size optimizasyonu** — main 829kB → route-based split

Detaylı kararlar: `docs/MASTER-REPORT-v3.md` ve `docs/TASARIM-KARARLARI.md`.

---

## Stack (Master Rapor Onaylı)

- **3D:** React 18 + TypeScript + Vite + R3F + Three.js r171+ + @react-three/drei
- **Backend (planlı B.0):** Cloudflare Workers + Durable Objects + Vectorize + R2 + D1
- **AI (planlı B.2):** Gemini 2.5 Flash birincil + Pro fallback
- **TTS (planlı):** Azure tr-TR Neural birincil + ElevenLabs A/B
- **UI:** Tailwind v3 (mevcut) → v4 (planlı C.1) + shadcn/ui + Framer Motion
- **Form:** react-hook-form + zod + @rjsf/core (senaryo authoring için)
- **Test:** vitest + Playwright
- **Asset:** Sketchfab chuma6oy CC BY (mevcut), Z-Anatomy CC BY-SA + AnatomyTOOL (planlı), Ready Player Me (planlı D.2)
- **Fizyoloji (planlı D.1):** Pulse Physiology Engine (Apache 2.0, Node sidecar)

---

## Mimari Kuralları — İhlal etme

1. **Engine/UI ayrımı kutsaldır.** `src/engine/` saf fonksiyonel, React import YOK.
2. **İki ilaç kataloğu var:** `src/data/medications.ts` (UI kimlik) + `src/data/medications-extended.ts` (farmakoloji). id ile eşleşir, yeni ilaç ikisine de.
3. **Senaryolar TS objesi.** `src/data/scenarios/`'de her biri ayrı dosya. `index.ts`'e eklenmezse listeye girmez.
4. **Zorluk filtresi** her Step/Outcome/Option'da opsiyonel `min_difficulty` / `max_difficulty`.
5. **3D koordinat referansı:** `memory/medisim_anatomik_landmark.md` — gözle tahmin YAPMA, tabloya bak.
6. **Klinik standartlar:** `docs/MASTER-REPORT-v3.md` Bölüm 9. Senaryo yapısı 9.C, kurallar 9.D.
7. **Tailwind utility-first**, tekrar eden stil → `src/index.css` `@layer components`.
8. **Kontrendikasyon motoru** `src/engine/pharmacology/engine.ts`. Yeni tetik türü için `ContraindicationTrigger` union genişlet.

---

## Klinik İçerik Disiplini (KRİTİK)

**Her senaryoda:**
- En az 1 TR kılavuz `guideline_references` zorunlu (rapor 9.B tablosu)
- ICD-10 + SNOMED CT kodlaması (rapor 9.C interface)
- Pediatride mg/kg + max doz zorunlu (rapor 9.D Kural 1)
- Yaş-spesifik vital aralık — **PALS 2015 default** (rapor 9.C tablosu)
- TİTCK ruhsatlı ilaç (rapor 9.D Kural 3)

**Commit kuralları:**
- Klinik dosya `git commit --no-verify` SADECE Ali Bey onaylı PR'da
- Commit mesajı `[CLINICAL:REVIEWED]` prefix

**Disclaimer:** Her sayfa altında "Eğitim amaçlıdır, klinik karar destek değildir".

---

## Tasarım Dili

- **Dark mode**, klinik monitör estetiği
- **Renkler:** ink (siyah tonları) + brand teal `#0d9488` + clinical (critical/warning/stable/info)
- **Font:** Instrument Serif (display), Geist (sans), Geist Mono (mono)
- **Asla:** mor gradient, Inter, emoji kalabalığı, AI-dashboard cookie-cutter görünümü
- **Marka v3 (planlı):** koyu mavi/gri arkaplan + neon turkuaz/yeşil accent, IBM Plex Sans veya Geist, nabız dalgası + tablet/kalp silueti logo

---

## Sık Yapılacak İşler

### Yeni senaryo ekle (rapor 9.C interface'i kullan)
1. Markdown taslak bekle, **`status: 'DRAFT'`** ile başla
2. `src/data/scenarios/<isim>.ts` oluştur (rapor 9.C şablonu)
3. `ucep_codes`, `icd10_codes`, `snomed_ct_codes`, `guideline_references` doldur
4. Pediatri ise yaş-spesifik vital (PALS), ilaç mg/kg + max
5. `index.ts`'e ekle
6. Test (`npm run test`), Ali Bey review'a ver (`REVIEWED_PENDING_ACTIVATION`)

### Yeni ilaç ekle
1. `medications.ts` temel kimlik
2. `medications-extended.ts` farmakoloji (preset, doz band, modifier, kontrendikasyon)
3. **TİTCK ruhsatlı doğrula**, ATC kodu ekle
4. Klinik doğruluk — emin değilsen UpToDate/ESC/TKD referansı, commit mesajına yaz

### Yeni marker / 3D koordinat
Gözle tahmin yapma. `memory/medisim_anatomik_landmark.md` 8-head canon tablosuna bak. Formula: `world_y = -0.243 + ratio × 1.021`.

---

## Git Akışı

- Anlamlı değişiklik sonrası commit
- Türkçe conventional commit: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`
- Klinik commit: `[CLINICAL:REVIEWED]` prefix (Ali Bey onaylı PR)
- Push öncesi `npm run build` temiz olmalı
- Klinik dosyada `--no-verify` SADECE onaylı PR

---

## Memory Dosyaları (öncelik sırasıyla)

1. ⭐ `medisim_master_referans.md` — Master rapora pointer (en önemli)
2. `medisim_anatomik_landmark.md` — 3D world koordinat tablosu
3. `medisim_anatomi_klinik.md` — Kadran/vasküler/deri/yanık
4. `medisim_saglik_standartlari.md` — ICD/SNOMED/FHIR + Türkiye
5. `medisim_rakip_analiz.md` — Body Interact + Gaumard + Laerdal
6. `medisim_animasyon_teknikleri.md` — R3F morph/breathing/eye/audio
7. `feedback_sade_dil.md`, `feedback_token_tasarrufu.md` — davranış

---

## Slash Komutları

- `/durum` — proje durumu özet
- `/senaryo-ekle <isim>` — yeni senaryo iskeleti
- `/ilac-ekle <id>` — ilaç kataloğuna ekleme
- `/test-calis` — tüm testler
- `/build-kontrol` — prod build temiz mi
- `/ilac-dozaj-dogrulayici` — ESC/AHA/TKD doz kontrol
- `/klinik-review-agent` — senaryo klinik denetim
- `/kvkk-pii-scanner` — KVKK PII tarama (commit öncesi)
- `/senaryo-sema-dogrulayici` — TS şema uyumu

---

## Takılırsan

1. Türkçe tek cümleyle durumu anlat ("npm paketi çakışması var, çözüyorum")
2. 3+ deneme çözemezsen Ali Bey'e sor
3. Asla bozuk kod commit etme — build hatalıysa önce düzelt

---

## Kullanıcıya Söz

Sabır, kalite, iletişim — kod hızından değerli. Ali Bey yorgun saha dönüşü uygulamaya bakacak; ilerleme görmek istiyor ama bozuk kod değil. **"Gece çalışan güvenilir ortak" modu.**
