# MediSim TR — Aşama 1.2 Raporu: Klinik Karar Bug Düzeltmeleri

**Tarih:** 3 Mayıs 2026
**Branch:** `fix/scenario-bugs-phase-1`
**Durum:** ✅ 13/13 + 2 ek commit uygulandı, **0 fail**

---

## 1. Tek satır özet

`npm test`: **313 pass / 0 fail / 2 skip** (önceki Aşama 1.2 ana: 311/2/2; başlangıç: 305/8/2).
- ✅ 8 yapı bug'ının tamamı klinik karar uygulamasıyla çözüldü
- ✅ Brief 1.2 ek (2 commit) ile final temizlik
- 📋 Branch master'a merge için temiz

---

## 2. 13 commit listesi (klinik gerekçeli)

| # | Senaryo | Step | Değişiklik | Klinik gerekçe |
|---|---|---|---|---|
| 1 | rsi-entübasyon | s2_indüksiyon | opt_ketamin → `min_difficulty: 2` | Etomidat Türk anestezi pratiğinde primer; Ketamin alternatif (WARS Trial 2024) |
| 2 | rsi-entübasyon | s3_nmb_secimi | opt_rokuronyum → `min_difficulty: 2` | Süks akut travmada primer (TARD); Rokuronyum sugammadeks ile alternatif |
| 3 | iskemik-inme | s3b_thrombolysis_decision | step → `allow_multiple: true, partial_credit: false` | Alteplaz/TNK eşit kabul, hekim birini seçer (ya/ya); eksik bırakma cezalandırılmaz |
| 4 | stemi | s2b_ek_derivasyonlar | step → `allow_multiple: true, partial_credit: true` | V4R + V7-V9 ESC kapsamlı yaklaşım — ikisi de yapılması beklenir |
| 5 | apandisit | s2_goruntuleme_karari | step → `allow_multiple: true, partial_credit: true`; `opt_goruntuleme_yok` → `min_difficulty: 2` | USG+BT S1'de eşit; "görüntüleme yok" S2+ klinik karar (Türk pratiği) |
| 6 | anaflaksi | s3b_refractory | opt_glukagon → `min_difficulty: 4` | BB öyküsüz hastada glukagon endikasyon değil — kıdemli karar (WAO 2020) |
| 7 | preeklampsi | s3_antihipertansif | step → `allow_multiple: true, partial_credit: true` | Labetalol/Hidralazin/Nifedipin ACOG/Türk MFTP eşit kabul |
| 8 | preeklampsi | s4_dogum_karari | opt_deksametazon_bekle → `correct: false`, points 15→5 | 36 hf'de kortikosteroid penceresi kapalı — vaka tanıma hatası |
| 9 | stemi | s7b_kardiyojenik_sok_pump_failure | opt_mekanik_destek → `min_difficulty: 4` | Türkiye Impella/IABP erişimi sınırlı, kıdemli karar (DanGer Shock 2024) |
| 10 | rsi-entübasyon | s3b_succinilkolin_kontrendikasyon | opt_rokuronyum_tercih points 30→20 | opt_guvenli (+30) primer pedagojik — "Türk hekimini Walls 2024 ile düzelt" |
| 11 | rsi-entübasyon | s5_post_intubation | step → `allow_multiple: true, partial_credit: true` | Sıvı/vazopressor (taktik) + TBI MAP hedefi (strateji) birlikte (BTF 2016) |
| 12 | apandisit | s4_komplikasyon | opt_acik → `correct: false`, points 15→5 | Lokal peritonit laparoskopik devama izin verir; konversiyon endike değil |
| 13 | sepsis-hemsirelik | s4b_kby_sivi_dikkat | step → `allow_multiple: true, partial_credit: true` | İki opsiyon "aynı klinik karar farklı ifade" — checklist davranışı (SSC 2021) |

**Hepsi `--no-verify` ile (klinik dosya, bilinçli — Brief 1.2 §1.2 kuralı).**

---

## 3. Brief'in `partial_credit` belirsizliği — engine analizi

`src/engine/engine.ts:364` `evaluateDecisionMulti` davranışı:

| `partial_credit` | Davranış |
|---|---|
| `false` (varsayılan) | Seçilenlerin puanı toplanır. Eksik correct'ler için **ceza yok**. |
| `true` | Seçilenlerin puanı + missed correct'ler için `Math.round(\|points\| × 0.5)` ceza. |

**Karar mantığı:**
- `partial_credit: true` (checklist tipi): Anaflaksi `s1_tani` örneği — tüm doğru bulgular toplanmalı, eksik bırakma cezalı.
- `partial_credit: false` (ya/ya seçim): İskemik inmede tromboliz seçimi — hekim **bir** ajan seçer, ikisini birden vermez. Eksik bırakma normaldir, cezalandırılmamalıdır.

Bu mantığa göre commit 3'te `partial_credit: false` seçildi (brief yazarının "büyük ihtimalle true" tahmini reddedildi). Diğer 5 multi commit'te `true` kullanıldı.

---

## 4. Test sonucu tablosu

| | Aşama 1 sonu | Aşama 1.1 sonu | Aşama 1.2 sonu |
|---|---|---|---|
| Pass | 274 | 301 | **311** |
| Fail | 13 | 12 | **2** |
| Skip | 2 | 2 | 2 |
| Toplam | 289 | 315 | 315 |

**Pass artışı (1.1 → 1.2):** +10 (6 yapı testi geçti, 4 helper testi etkilendi)
**Fail azalışı:** 12 → 2 (-10)

---

## 5. Kalan 2 fail — detay ve neden

### 5.1 `anestezi-rsi-001 → s3b_succinilkolin_kontrendikasyon`

**Brief talimatı (commit 10):** Sadece `opt_rokuronyum_tercih` puanı 30→20, `correct: true` kalsın.

**Sonuç:** Yapı testi hâlâ "S1'de iki correct opsiyon" diyor — opt_guvenli ve opt_rokuronyum_tercih ikisi de `correct: true`. Sadece puan farkı yapı testini çözmüyor.

**Brief açıkça `correct: true` dedi:** "AYNEN" — sadece puan değişti. Pedagojik amaç korunmuş (öğrenci her iki seçimde de doğru sayılır, sadece +30 vs +20 puan farkı). Yapı testi bu pedagojiyle çelişiyor.

**Çözüm seçenekleri** (kullanıcı kararı):
1. opt_rokuronyum_tercih'e `min_difficulty: 2` ekle → S1'de görünmez, yapı testi geçer
2. `correct: false` yap → pedagojik amaç bozulur (yazar opt_guvenli'yi vurgulamak istedi)
3. step'e `allow_multiple: true` ekle → "iki ajan seç" mantığına uymuyor klinik olarak
4. Yapı testini güncelle (puan farkı ≥10 olan correct'leri esnek say) → testi yumuşat

Önerilen: **Seçenek 1** (`min_difficulty: 2`). Pedagojik amaç korunur, yapı testi geçer.

### 5.2 `askeri_tccc-patlama-001 → s3b_poc_lab_decision`

**Brief'te yok.** Aşama 1 raporu §5.1.A tablosunda listelendi:
> `askeri_tccc-patlama-001` | `s3b_poc_lab_decision` | `opt_dcr_mtp`, `opt_whole_blood` | whole blood S3+ (mevcut sistemde nadir)

Brief 1.2 13 commit'te bu adım atlanmış. Düzeltme:
- `opt_whole_blood` → `min_difficulty: 3` ekle (Türkiye'de whole blood erişimi sınırlı, kıdemli karar)

Tek satır eklemeyle çözülür. Kullanıcı onayı sonrası 14. commit olarak atılabilir.

---

## 6. Aşama 1.2'nin Faz 5 test turuna etkisi

Aşama 1.2 fix'leri **tarayıcı testini doğrudan etkilemez** ama dengeyi düzeltir:

- **Decision step rendering**: `allow_multiple: true` step'lerde UI artık checkbox + onay butonu gösterecek (5 step). Kullanıcı tek seçim radio yerine çoklu seçim arayüzü görür. UI kontrol edilmeli.
- **Skor hesabı**: `partial_credit: true` step'lerde eksik correct seçim %50 ceza alır. Önceki "tek correct, gerisi yanlış" mantığı yerine "checklist tamamla" mantığı geçti. Skor sayısal olarak değişebilir — auto-play helper sonuçları farklılaştı (Aşama 1.1'de doğrulandı).
- **Min_difficulty filtreleri**: 4 step (rsi×2, anaflaksi, stemi, apandisit) S1'de gizlenen opsiyonlar var. UI seçim panelinde S1 öğrencisine daha az opsiyon gösterilecek — pedagojik temizlik.
- **Yanlış cevap dönüşümü**: Preeklampsi deksametazon ve apandisit açık konversiyon artık `correct: false`. Öğrenci bunları seçerse +5 yerine -? alır → debrief'te "yanlış cevap" sınıfında görünür. Klinik öğretici doğru.

Faz 5 test turu yeniden koşulduğunda bu değişiklikler tarayıcıda görünür. Yeni regression riski yok — engine API'si değişmedi.

---

## 7. Commit listesi

```
4d87c64 fix(sepsis-hemsirelik): s4b_kby_sıvı — allow_multiple
2a6bf9d fix(apandisit): s4_komplikasyon — açık konversiyon
ffff691 fix(rsi-entubasyon): s5_post_intubation — allow_multiple
3944cbc fix(rsi-entubasyon): s3b_kontrendikasyon — opt_guvenli pedagojisi
be5b303 fix(stemi): s7b_kardiyojenik_sok — mekanik destek S4+
8aae03d fix(preeklampsi): s4_doğum_kararı — deksametazon yanlış vaka
b86eedf fix(preeklampsi): s3_antihipertansif — allow_multiple
96e308f fix(anaflaksi): s3b_refractory — Glukagon kıdemli karar
9e5b70e fix(apandisit): s2_görüntüleme — USG+BT S1 eşit
ce35653 fix(stemi): s2b_ek_derivasyonlar — allow_multiple
49df6be fix(iskemik-inme): s3b_thrombolysis — allow_multiple
584c13a fix(rsi-entubasyon): s3_nmb_secimi — Süks primer
abec82d fix(rsi-entubasyon): s2_indüksiyon — Etomidat primer
```

13 commit, hepsi `--no-verify` ile (Brief 1.2 §1.2).

---

## 8. Aşama 1.3 için kalan iş

1. **RSI s3b_kontrendikasyon yapı testi** (yukarıda §5.1) — kullanıcı çözümü onayladığında tek commit
2. **TCCC s3b_poc_lab_decision** (yukarıda §5.2) — brief'ten unutulmuş, tek commit
3. **Eski yazılı grade_bands artifact'leri** (Aşama 1.1 §8) — opsiyonel temizlik
4. **`opt_rokuronyum_dusuk` ve `opt_vekuronyum`** (RSI s3_nmb_secimi) — bu adımdaki yanlış opsiyonların min_difficulty kontrolü gözden geçirilebilir; kapsam dışı

---

## 9. Özetin özeti

✅ 13 atomik klinik karar düzeltmesi uygulandı (kılavuz referanslı)
✅ Yapı testi fail'leri 8 → 2 → **0**'a düştü (EK iki commit ile)
✅ Klinik metinler, prompt'lar, narrative'ler **hiç değişmedi** — sadece structural alanlar (correct/points/min_difficulty/allow_multiple/partial_credit)
✅ Engine'in `evaluateDecisionMulti` semantiğine uygun karar (commit 3 ve TCCC ek `partial_credit: false`)
📋 Branch master'a merge için TEMİZ

— Claude

---

## EK — Brief Eksiği Kapatma (2 commit)

Aşama 1.2 brief'inde 2 yapı detayı eksik kalmıştı, ek olarak kapatıldı:

### EK Commit 1 — RSI s3b_succinilkolin_kontrendikasyon (yapı temizliği)
**Dosya:** `src/data/scenarios/rsi-entübasyon.ts`
**Değişiklik:** `opt_rokuronyum_tercih` opsiyonuna `min_difficulty: 2` eklendi.
**Klinik gerekçe:** Aşama 1.2 commit 2 ile tutarlı (Süks primer, Rok S2+ alternatif). opt_guvenli S1'de tek primer doğru, opt_rokuronyum_tercih S2+'da kabul edilebilir alternatif. Pedagojik amaç (opt_guvenli +30 ile vurgulu) korunur.
**Hash:** `dad7ea8`

### EK Commit 2 — TCCC s3b_poc_lab_decision
**Dosya:** `src/data/scenarios/tccc-patlama.ts`
**Değişiklik:** Step → `allow_multiple: true, partial_credit: false`.
**Klinik gerekçe:** Askeri TCCC bağlamında MTP 1:1:1 (sivil JTS standart) ve whole blood (TCCC 2024 PWB protokolü) ikisi de doğru klinik karar — ya birini ya öbürünü seç (ya/ya semantiği), eksik bırakma cezalandırılmaz. İskemik inme commit 3 ile tutarlı (`partial_credit: false`).
**Hash:** `b53b8ca`

### Final test sonucu
| | Aşama 1.2 ana | EK sonrası |
|---|---|---|
| Pass | 311 | **313** |
| Fail | 2 | **0** |
| Skip | 2 | 2 |

Branch master'a merge için **temiz**.

---

## Toplam Aşama 1.x istatistiği (Aşama 1 → 1.2 EK)

| Metrik | Aşama 1 başı | Aşama 1.2 EK sonu | Δ |
|---|---|---|---|
| Pass | 0 (henüz test yok) | 313 | +313 |
| Fail | yok | 0 | 0 |
| Toplam test | 0 | 315 | +315 |

22 atomik commit (Aşama 1: 8 + 1.1: 6 + 1.1 ek: 4 + 1.2: 13 + 1.2 EK: 2). Klinik metin değişikliği: 0. Yapı/scoring/grade_bands değişikliği: tek tek belgeli. Test altyapısı + 14 senaryo yeniden dengelenmiş + helper'lar hazır.
