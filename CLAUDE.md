# Claude Code İçin Talimatlar

Bu dosyayı Claude Code projeye girdiğinde otomatik okur.
Son güncelleme: 5 Mayıs 2026

---

## Ajanın görevi

**Kullanıcı sahada çalışan sağlık profesyoneli.** Gün içinde kodlama zamanı yok, akşam eve geldiğinde gelişmeleri görmek istiyor. Sen onun **otonom geliştirme ajanısın** — aktif müdahale beklemeden görevleri tamamla.

### Otonom çalışma kuralları

1. **Küçük kararları kendin al.** Değişken adı, dosya yapısı, refactor, test yazımı, kütüphane seçimi → sor değil, yap. Gerekçeni commit mesajına yaz.
2. **Büyük kararlarda durdur ve sor.** Yeni bir modül (backend, 3D, auth), şema değişikliği, tıbbi içerik kararı, deploy, ödeme entegrasyonu → kullanıcıya onay.
3. **Klinik içerikte asla doğaçlama yapma.** Bir ilaç dozu, kontrendikasyon veya algoritma konusunda emin değilsen → kaynak ara, emin olamıyorsan işareti koy (`// TODO klinik review`) ve kullanıcıya bildir.
4. **Her iş sonunda raporla.** Bitirince kısa Türkçe özet: ne yaptın, ne değişti, sıradaki adım ne olabilir.
5. **Ekran başında olmadığını varsay.** Terminal sorusu sormak yerine "çalıştır, sonuca bak, ilerle" mantığı.

### İletişim tonu

- Türkçe. Kısa. Sadece "ne yaptım, ne değişti, ne sıra" bilgisini ver.
- Teknik monolog yok. Uzun markdown raporu yok.
- Bug bulunca uzun "analiz yaptım" özeti yazma — bul, düzelt, bir cümleyle bildir.

---

## Proje özeti

**MediSim TR** — Türkiye'ye özel, web tabanlı sanal hasta simülasyon platformu. Tıp eğitimi, hemşirelik, acil sağlık, ATT, saha sağlıkçıları için senaryo tabanlı serious game.

Hedef pazar: **Türkiye birincil.** TKD + ESC + AHA kılavuzlarına uyumlu senaryolar. Türkiye yerel bağlamı (ilaç markası, 112 protokolü, SGK, SUT) her senaryoda dikkate alınır.

Referans ürünler: Body Interact, Dimedus, MVR/Nasco.

---

## Mevcut durum — 5 Mayıs 2026

**Test:** 388 vitest pass / 0 fail / 0 skip (19 dosya) + 5 Playwright E2E pass. Build temiz.

**Senaryo sayısı:** 14 (Body Interact uyumlu skorlama, hepsi `clinical_codes` ICD-10/SNOMED enjekte edilmiş).

**İlaç kataloğu:** ~79 entry (Hafta 1 kardiyovasküler 30 + Hafta 2 kardiyo-dışı 30 + Faz 2 ek 17). `medications.ts` + `medications-extended.ts` senkron.

**Ekipman:** v2 — 40+ ekipman (havayolu, solunum, lab, görüntüleme, termoregülasyon).

**Export:** `src/utils/export/` altında PDF + Excel pipeline tam (sections, primitives donut/gradeBar, fontlar, DebriefScreen entegre).

### Tamamlanan fazlar

| Faz | Konu | Durum |
|---|---|---|
| Faz 1 H1 | Farmakoloji motoru, 30 kardiyo ilaç, STEMI yeni motor | ✅ |
| Faz 1 H2 | Kardiyo-dışı 30 ilaç, ekipman v2, PDF/Excel export | ✅ |
| Faz 1 H3 | Tasarım kimliği — Tailwind + specialty theme | ✅ (UI denetimi Faz 15'e ertelendi) |
| Faz 2-7 | B sözleşmesi gece paketi: senaryo bug fix, test altyapısı, ICD/SNOMED/RxNorm yerel db, Türk klinik kural motoru iskeleti | ✅ |
| Faz 8 | Engine clinical-rule validator (DRAFT-aware, advisory) — `b851660` | ✅ |
| Faz 9 | 14 senaryoya `clinical_codes` enjeksiyonu — `a8408dc` | ✅ |
| Faz 10 | 4 component birim testi (PatientCard, DifficultySelector, ScenarioCard, StepDisplay), 29 test — `3d2d784` | ✅ |
| Faz 11 | Playwright E2E altyapısı, 5 smoke test, CI workflow — `20a1578` | ✅ |
| Faz 12-14 | Equipment / kardiyo-dışı 30 / PDF-Excel — zaten H1-H2'de yapılmıştı, faz numaralandırması güncel değildi | ✅ |
| Faz 15 | UI denetimi | ⏸ Kullanıcıyla birlikte ayrı oturum |

### Klinik kural sistemi (Faz 8'den)

`src/data/clinical-rules/turkiye-2024-draft.json` — AI önerisi 10 kural, kaynak: TARD, BDHD, ACOG-MFTP-TR, ESC, WAO, WSES, WALLS.

**Bayrak hiyerarşisi** (validator severity eşlemesi — `scenario-validator.ts:42-46`):

- `DRAFT_NEEDS_REVIEW` → `info` (AI önerdi, klinik review bekliyor)
- `REVIEWED_PENDING_ACTIVATION` → `warning` (insan review etti, manuel aktivasyon)
- `ACTIVE` → `error` (canlı; engine + testler zorunlu kılar, CI fail edebilir)

Mevcut durum: 10/10 kural REVIEWED_PENDING_ACTIVATION (commit `e432128`). Hiçbiri ACTIVE değil → engine flow'una etkisi yok, validator sadece rapor üretir.

**Kural değişikliği için disiplin:** Klinik dosyalar (`clinical-rules/`, `scenario-mappings.json`, ilaç dozları, kontrendikasyonlar) için **otonom karar yok** — kullanıcı onayı + spec → tek komut. Klinik dosya commit'lerinde `--no-verify` (pre-commit hook bayrak değişikliklerini lint hatası olarak göstermesin).

### Sonraki adımlar (5 Mayıs 2026)

1. **DRAFT/REVIEWED → ACTIVE klinik review** — kural-bazlı, kullanıcı her birini onaylar; ayrı PR, validator severity error'a yükselir
2. **Engine'e validator enforce entegrasyonu** — şu an validator var ama engine runtime'da çağrılmıyor; advisory/blocking/CI-only modlardan hangisi seçileceği karar bekliyor
3. **CLAUDE.md davranışsal kurallar revizyonu** — "otonom çalışma" çerçevesi gece paketi sonrası daha sıkı (klinik dosya disiplini); kullanıcı onayıyla yapılacak
4. **Bundle size optimizasyonu** — main 829kB, route-based veya vendor-split (recharts/lucide) seçimi
5. **Faz 15 UI denetimi** — kullanıcıyla birlikte
6. **5 senaryo bonus outcome incelemesi** (DKA, PE, iskemik inme, preeklampsi, TCCC-patlama) — `structure.test.ts` uyarısı: `max_points` auto-play optimumundan 20+ puan yüksek

Detaylı kararlar: `docs/TASARIM-KARARLARI.md`. Herhangi bir büyük iş öncesi **orayı oku.**

---

## Teknik yığın

- **Framework:** React 18 + TypeScript + Vite
- **Routing:** React Router v6
- **Styling:** Tailwind CSS (özel palet: `ink-*`, `clinical-*`, `brand`)
- **Fontlar:** Instrument Serif (display), Geist (sans), Geist Mono (mono)
- **State:** useState (karmaşık olursa Zustand)
- **Icon:** lucide-react

**Henüz yok:** Backend (Node.js + Fastify + Postgres + Prisma), 3D (Three.js + R3F), Auth (Lucia/BetterAuth), Ödeme (iyzico).

---

## Mimari kuralları — ihlal etme

1. **Engine/UI ayrımı kutsaldır.** `src/engine/` içinde asla React import etme. Motor saf fonksiyonel.
2. **İki ilaç kataloğu var:**
   - `src/data/medications.ts` — UI için kimlik bilgisi (Medication tipi)
   - `src/data/medications-extended.ts` — farmakoloji motoru verisi (ExtendedMedication)
   - İkisi `id` üzerinden eşleşir. Yeni ilaç eklerken ikisine de ekle.
3. **Senaryolar TS objesi.** `src/data/scenarios/` altında her biri bir dosya. `index.ts`'e eklenmezse listeye girmez.
4. **Zorluk filtresi her Step/Outcome/Option'da opsiyonel `min_difficulty` / `max_difficulty`.** `evaluateAction`, `evaluateDecision`, `pickNextStep` seçili zorluğa göre filtreler.
5. **Kontrendikasyon motoru** `pharmacology/engine.ts` içinde. Yeni tetik türü eklemek için `ContraindicationTrigger` union'ını genişlet.
6. **Tailwind utility-first.** Tekrar eden stil → `src/index.css` `@layer components`.

---

## Tasarım dili

- **Dark mode,** klinik monitör estetiği
- Ana renkler: ink (siyah tonları) + brand yeşili (#7cb342) + clinical (critical/warning/stable/info)
- Typography: display için Instrument Serif italic, body Geist, rakam/etiket Geist Mono
- **Asla:** mor gradient, Inter/Roboto, emoji kalabalığı, cookie-cutter AI-dashboard görünümü
- Kalıcı motifler: tabular-num rakamlar, pulse-dot, uppercase tracking-wider etiketler

---

## Sık yapılacak işler — adım adım

### Yeni senaryo ekle

1. Kullanıcıdan markdown taslak bekle (format: `docs/SENARYO-YAZIM-REHBERI.md`)
2. `src/data/scenarios/<isim>.ts` oluştur
3. **Zorluk seviyelerini planla** — `supported_difficulties` ve her adımdaki `min_difficulty` ayarı
4. Gerekli ilaçları `medications.ts` **ve** `medications-extended.ts`'de tanımla
5. `index.ts`'e ekle
6. `npm run dev` ile test et, tüm seviyelerde oynanabiliyor mu doğrula

### Yeni ilaç ekle

1. `medications.ts`'e temel kimlik (id, ad, kategori, default_dose)
2. `medications-extended.ts`'e farmakoloji verisi:
   - Preset seç (varsa) — `pharmacology/presets.ts`'den
   - Doz band (80-120% tipik)
   - Modifier (beta_blocker, karaciger, bobrek, gebelik, yaş)
   - Kontrendikasyon listesi
3. Klinik doğruluk kritik — emin değilsen UpToDate / ESC / AHA kılavuzu referansıyla doğrula
4. Referansı commit mesajında belirt

### Yeni senaryo komplikasyonu / dinamik unlock

1. Komplikasyon adımını normal `steps` listesine ekle
2. `min_difficulty` ile hangi seviyeden itibaren aktifleşeceğini ayarla
3. Tetikleyici koşul (örn. aspirin verilmedi → VT) için senaryoda `unlocks` alanı kullan veya motor tarafına özel kontrol ekle

### Backend kurulum

Kullanıcıya sor — önce şunlar netleşmeli:
- Veritabanı hosting (Supabase / Railway / Neon)
- Auth yöntemi
- API sözleşmesi (REST / tRPC)

Bunlar olmadan kod yazma.

---

## Klinik içerik standardı

- **Birincil kaynaklar:** ESC 2023, TKD 2022, AHA/ACC 2022, UpToDate, Katzung
- **Türkiye yerel:** SUT, SGK ödeme kuralları, 112 protokolü, ATT yetki sınırları
- Her senaryonun `debrief.references` alanında kaynaklar belirtilmeli
- Emin olmadığın ilaç dozu veya kılavuz kararı için → kullanıcıya sor, doğaçlama yapma
- Yeni bir kılavuz güncellemesi olmuş olabilir — bilgi cutoff tarihinden sonra web search kullan

---

## Git akışı

- Her anlamlı değişiklik sonrası commit at
- Mesajlar Türkçe, conventional commit formatı:
  ```
  feat: DKA senaryosu eklendi (5 adım, dahiliye, seviye 2-4)
  fix: zorluk filtresi pickNextStep'te atlanan adımları düzeltti
  docs: tasarım kararları güncellendi
  refactor: farmakoloji motoru modifier hesabı sadeleştirildi
  chore: bağımlılıklar güncellendi
  ```
- Büyük özellik bitince branch değil, main'e commit (tek kişi projesi)
- Push etmeden önce `npm run build` ile prod build başarılı mı kontrol et

---

## Kurulum kontrolü (ilk oturumda)

```bash
node --version           # >=18
ls node_modules || npm install
npm run dev              # 5173'te açılmalı
npm run build            # prod build temiz mi
```

Bir şey bozulmuşsa kullanıcıya bildir, çözümü sun.

---

## Slash komutları

Projenin `.claude/commands/` klasöründe custom komutlar var. Kullanıcı `/komut` yazdığında onlar çalışır:

- `/senaryo-ekle <isim>` — yeni senaryo iskeleti
- `/ilac-ekle <id>` — ilaç kataloğuna ekleme
- `/test-calis` — tüm testleri çalıştır
- `/durum` — projenin güncel yapılacaklar listesi

Yeni komut önerisi geldiyse `.claude/commands/<isim>.md` olarak yaz.

---

## Takılırsan yapılacaklar

1. **Türkçe tek cümleyle durumu anlat:** "npm paketi çakışması var, çözüyorum"
2. **Çözemezsen durdur, sor** — 3+ deneme yapıp ilerleyemiyorsan kullanıcıya soru bırak
3. **Asla bozuk kod commit etme** — build hatalıysa önce düzelt

---

## Proje dokümanları — ezbere bil

- `docs/TASARIM-KARARLARI.md` — **en önemlisi.** Tüm mimari ve klinik kararlar.
- `docs/SENARYO-YAZIM-REHBERI.md` — yeni senaryo formatı
- `docs/MIMARI.md` — teknik mimari
- `docs/YOL-HARITASI.md` — fazlar, öncelikler
- `docs/GITHUB-REHBERI.md` — git iş akışı

Yeni görev gelince önce bu dokümanları tarayıp güncel mi kontrol et.

---

## Kullanıcıya söz

Sabır, kalite, iletişim — kod hızından değerli. Kullanıcı yorgun saha dönüşü uygulamaya bakacak; ilerleme görmek istiyor ama bozuk kod değil. **"Gece çalışan güvenilir ortak" modu.**
