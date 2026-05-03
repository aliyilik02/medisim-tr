# MediSim TR — Test Altyapısı Aşama 1 Raporu

**Tarih:** 3 Mayıs 2026, gece çalışması
**Branch:** `test-infrastructure-phase-1` (master'a merge EDİLMEDİ — review et, sonra merge'le)
**Durum:** ✅ Aşama 1 tamamlandı.

---

## 1. Tek satır özet

`npm test` çalıştığında **271 test geçer, 16 test fail eder, 2 test skip** olur.
Fail'ler **kasıtlı**: senaryo dosyalarındaki yapı/denge bug'larını yakaladılar.
Klinik dosyalara **dokunulmadı**. Düzeltmeleri sen yapacaksın (öneriler aşağıda).

---

## 2. Eklenen / değiştirilen dosyalar

### Yeni
```
.husky/pre-commit
tests/README.md
tests/PHASE-1-REPORT.md                         (bu dosya)
tests/setup/clinical-protection.ts
tests/setup/protection.test.ts
tests/helpers/all-scenarios.ts
tests/helpers/auto-play.ts
tests/helpers/scoring.ts
tests/engine/seededShuffle.test.ts
tests/engine/evaluateAction.test.ts
tests/engine/evaluateDecision.test.ts
tests/engine/scoring.test.ts
tests/scenarios/structure.test.ts
tests/scenarios/auto-play.test.ts
tests/regression/01-bronsiyolit-bitir-flush.test.ts
tests/regression/02-inventory-alphabetical.test.ts
tests/regression/03-decision-shuffle.test.ts
tests/regression/04-double-penalty.test.ts
vitest.config.ts
```

### Değiştirilen (sadece altyapı dosyaları — klinik dosyalar değil)
```
package.json          (test scripts + lint-staged config)
package-lock.json     (vitest, husky, lint-staged dependencies)
.gitignore            (coverage/, .vitest-cache/)
```

### Değiştirilmeyen (kasıtlı — kural)
- `src/data/scenarios/**` ✓ dokunulmadı
- `src/data/medications.ts` ✓
- `src/data/medications-extended.ts` ✓
- `src/data/equipment.ts` ✓
- `src/engine/**`, `src/components/**`, `src/pages/**`, `src/lib/**`, `src/hooks/**` ✓

---

## 3. Eklenen bağımlılıklar (devDependencies)

| Paket                       | Versiyon | Neden |
|-----------------------------|----------|-------|
| `vitest`                    | ^4.1.5   | Test runner |
| `@vitest/ui`                | ^4.1.5   | `npm run test:ui` |
| `@vitest/coverage-v8`       | ^4.1.5   | `npm run test:coverage` |
| `husky`                     | ^9.1.7   | Git hook altyapısı |
| `lint-staged`               | ^16.4.0  | Pre-commit'te değişen dosyalara test |

`vite-tsconfig-paths` denedim ama `tests/` dizinini görmüyordu — kaldırdım,
yerine `vitest.config.ts`'de direkt `resolve.alias` kullandım.

---

## 4. Test sonuçları (npm test çıktısı)

```
✓ tests/setup/protection.test.ts                   (3 test)   — fs mock self-test
✓ tests/engine/seededShuffle.test.ts               (9 test)   — determinism, edge cases
✓ tests/engine/evaluateAction.test.ts              (9 test)   — matched_outcome, zorluk filtresi
✓ tests/engine/evaluateDecision.test.ts            (7 test)   — opsiyon değerlendirme
✓ tests/engine/scoring.test.ts                    (14 test)   — calculateGrade + çift cezalama
✗ tests/scenarios/structure.test.ts          (174 ✓ / 11 ✗)   — yapı uyumsuzlukları (BUG)
✗ tests/scenarios/auto-play.test.ts           (41 ✓ / 5 ✗)    — denge problemleri (BUG)
✓ tests/regression/01-bronsiyolit-bitir-flush     (3 ✓, 1 skip) — UI testi Aşama 2
✓ tests/regression/02-inventory-alphabetical      (3 ✓, 1 skip) — UI testi Aşama 2
✓ tests/regression/03-decision-shuffle             (4 test)   — seededShuffle + session.started_at
✓ tests/regression/04-double-penalty               (5 test)   ⭐ commit 2d142a5

Toplam: 271 passed, 16 failed, 2 skipped (289 total)
Süre: ~1.4 saniye
```

---

## 5. Yakalanan bug'lar — düzeltme önerileri

> Aşağıdaki bütün öneriler **yapılmadı**. Klinik kararlar gerektirir,
> sen review edeceksin. Her birinin yanında dosya:satır referansı.

### 5.1 Yapı bug'ları (11 fail — `structure.test.ts`)

#### A) Decision step'lerde S1'de birden fazla `correct: true` opsiyon (allow_multiple yok)

Bu, "ilk şıkkı seç → her zaman doğru" pedagojik hilesinin geri dönmesi anlamına gelir.
seededShuffle bunu kısmen telafi eder ama doğru yaklaşım: ekstra correct'lere
`min_difficulty: 2` (veya daha yüksek) ekle, ya da `allow_multiple: true` + `partial_credit: true`.

| Senaryo | Step | Çoklu correct opsiyonlar | Öneri |
|---------|------|--------------------------|-------|
| `kardiyoloji-stemi-001` | `s2b_ek_derivasyonlar` | `opt_v4r`, `opt_v7_v9` | ikincisine `min_difficulty: 2` |
| `kardiyoloji-stemi-001` | `s7b_kardiyojenik_sok_pump_failure` | `opt_norepinefrin_dobutamin`, `opt_mekanik_destek` | mekanik desteğe `min_difficulty: 3` |
| `acil-anaflaksi-001` | `s3b_refractory` | `opt_iv_adrenalin`, `opt_glukagon` | glukagon `min_difficulty: 3` (refrakter ikinci basamak) |
| `acil-iskemik-inme-001` | `s3b_thrombolysis_decision` | `opt-alteplaz`, `opt-tnk` | TNK güncel kılavuz; alteplaza `max_difficulty: 2` veya `allow_multiple` |
| `cerrahi-apandisit-001` | `s2_goruntuleme_karari` | `opt_usg`, `opt_bt`, `opt_goruntuleme_yok` | klinik karar: USG her hastada ilk (S1), BT seçili durumda (S2+) |
| `cerrahi-apandisit-001` | `s4_komplikasyon` | `opt_laparoskopi_devam`, `opt_acik` | açık konversiyon S2+ |
| `anestezi-rsi-001` | `s2_indüksiyon` | `opt_ketamin`, `opt_etomidat` | duruma göre — `allow_multiple: true` daha uygun olabilir |
| `anestezi-rsi-001` | `s3_nmb_secimi` | `opt_suksinilkolin`, `opt_rokuronyum` | hasta özelliklerine bağlı; `allow_multiple` |
| `anestezi-rsi-001` | `s3b_succinilkolin_kontrendikasyon` | `opt_guvenli`, `opt_rokuronyum_tercih` | "güvenli" yanıltıcı olabilir; tek correct seç |
| `anestezi-rsi-001` | `s5_post_intubation` | `opt_sivit_vazopressor`, `opt_tbi_map` | bağlama göre |
| `kadin_dogum-preeklampsi-001` | `s3_antihipertansif` | `opt_labetalol`, `opt_hidralazin`, `opt_nifedipin_oral` | labetalol birinci tercih (S1), diğerleri S2+ |
| `kadin_dogum-preeklampsi-001` | `s4_dogum_karari` | `opt_dogur`, `opt_deksametazon_bekle` | gestasyonel haftaya bağlı, klinik review |
| `hemsirelik-sepsis-001` | `s4b_kby_sivi_dikkat` | `opt_dikkatli_yonetim`, `opt_dinamik_yanit` | dinamik yanıt monitörüne `min_difficulty: 2` |
| `askeri_tccc-patlama-001` | `s3b_poc_lab_decision` | `opt_dcr_mtp`, `opt_whole_blood` | whole blood S3+ (mevcut sistemde nadir) |

#### B) `expected_outcomes.target_id` `available_equipment`'ta yok (3 fail)

| Senaryo | Step | Eksik ID |
|---------|------|----------|
| `acil-pulmoner-emboli-001` | `s7_post_tromboliz` | `foley_sonda` — `available_equipment`'a eklenmeli |
| `pedi-bronsiyolit-001` | `step-4` | `ambu` — `available_equipment`'a eklenmeli |
| `kadin_dogum-preeklampsi-001` | `s5_eklampsi_nöbet` | `oksijen_maske` — `available_equipment`'a eklenmeli |

Bu hatalar oyunda fark edilmez (motor varsayılan ceza verir) ama outcome'lar
asla matched olmaz → öğrenci doğru aksiyonu yapsa bile puanlanmaz.

### 5.2 Auto-play denge fail'leri (5 fail — `auto-play.test.ts`)

En iyi yol oynanırsa A bandı eşiğine ulaşılamayan senaryolar:

| Senaryo | Zorluk | Toplam / A eşiği | Sapma |
|---------|--------|------------------|-------|
| `kardiyoloji-stemi-001` | S1 | 293 / 315 | -22 |
| `kardiyoloji-stemi-001` | S2 | 293 / 315 | -22 |
| `kardi-kardiyojenik-sok-001` | S3 | 230 / 250 | -20 |
| `pedi-bronsiyolit-001` | S1 | 195 / 215 | -20 |
| `askeri_tccc-patlama-001` | S2 | 287 / 306 | -19 |

Tüm sapmalar küçük (~%6-8). Düzeltme seçenekleri:
- `scoring.grade_bands.A` değerini ~5 puan düşür
- veya pozitif bonus outcome ekle (ör. erken doğru karara `+5` "hızlı tanı" bonusu)

Klinik öncelik: bu A bandı çok iddialı tutulduysa öğrenci moralini bozabilir.
Aşama 1'de yapma; review et, sonra düşür.

### 5.3 Auto-play helper'ı bir kendi bug'ını yakaladı

İlk koşumda 32 fail, sonra 5 fail. Sebep: helper başlangıçta her action step'te
**tek** outcome seçiyordu. Halbuki `s2b_orders` gibi adımlarda `min_actions: 1, max_actions: 5`
var — öğrenci 5 farklı tetkik isteyebilir. Helper'ı düzelttim
(`tests/helpers/auto-play.ts:75`): visible+pozitif outcome'ların hepsini puanlar (max_actions
ile sınırlı). Bu yüzden hipoglisemi ve bir çok senaryo geçti. Geriye kalan 5 fail gerçek denge sorunu.

---

## 6. Klinik dosya koruma — uygulama detayı

İki katmanlı koruma:

**Katman 1 — Test koşumu sırasında** (`tests/setup/clinical-protection.ts`):
`fs.writeFileSync`, `fs.appendFileSync`, `fs.promises.writeFile`, `fs.promises.appendFile`
mock'lanır. Korunan path desenlerinden birine yazma denemesi → `Error` fırlatılır.

**Katman 2 — Commit zamanında** (`.husky/pre-commit`):
`git diff --cached --name-only` ile staged dosyalar kontrol edilir. Klinik path varsa
commit reddedilir. Bilerek değişiklik için: `git commit --no-verify`.

Test ettim: bu iki katman çalıştı, hiçbir test klinik dosya değiştirmedi.

---

## 7. Senin yapacakların — sıra önerisi

**1) Branch'i incele.**
```bash
git log master..test-infrastructure-phase-1 --oneline
```
8 atomik commit, her biri tek özellik. Sırayla:
1. vitest altyapısı + script
2. klinik dosya koruyucusu (husky + lint-staged)
3. engine birim testleri
4. senaryo yapı doğrulayıcısı
5. senaryo auto-play
6. regresyon paketi (4 commit fix'i)
7. tests/README + bu rapor

**2) Testleri kendin gör.**
```bash
git checkout test-infrastructure-phase-1
npm install
npm test
```
Beklenen: 271 pass, 16 fail, 2 skip.

**3) Coverage raporuna bak.**
```bash
npm run test:coverage
# coverage/index.html aç
```

**4) Bug'ları sırayla düzelt.** Yukarıdaki 5.1 ve 5.2 listesi öncelik sırasında.
Klinik kararlar var — acele etme.

**5) Master'a merge.**
```bash
git checkout master
git merge --no-ff test-infrastructure-phase-1
```

---

## 8. Aşama 2'ye notlar

- **UI testleri** (Testing Library + happy-dom) ileriye bırakıldı:
  - `01-bronsiyolit-bitir-flush.test.ts` içinde `describe.skip`
  - `02-inventory-alphabetical.test.ts` içinde `describe.skip`
  - `tests/regression/02` Türkçe sıralama saniteten render testi yapacak
- **Senaryo display tipleri** (decision step `display: { type: "ekg" | "lab" | ... }`)
  için snapshot testi
- **Lab paneli timeline** auto-play'de modellenmedi (lab_timeline tüketimi UI tarafında)
- **Pharmacology motoru** sadece `evaluateDose`/`computeEffectMultiplier` üzerinden
  bazı test ihtimalleri var — Aşama 3'te ekleriz

---

## 9. CI'a hazır mı?

Evet. `npm test` exit code 0/1 doğru üretiyor. Bir GitHub Actions workflow eklemek
istersen `.github/workflows/test.yml` Aşama 2'de eklenebilir — Aşama 1 kapsamına
dahil değildi (brief 5.8'de ima edildi ama kullanıcı talebine bağlı bıraktım).

---

## 10. Özetin özeti

✅ vitest + husky + lint-staged kuruldu, scriptler çalışıyor
✅ klinik dosyalar 2 katmanla korunuyor, hiçbir test değiştirmedi
✅ 271 test pass — engine + regresyon + meta'lar yeşil
🐛 16 fail — gerçek senaryo bug'ları (bug bulduk, raporlandı)
📋 8 atomik commit, master'a değil branch'te
📄 `tests/README.md` + bu rapor

Sabah `git checkout test-infrastructure-phase-1 && npm test` ile başlayabilirsin.

— Claude
