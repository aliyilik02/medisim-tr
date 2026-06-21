# SENARYO ÜRETİM KONTRATI (v1)

> **Amaç:** 16 → 400 senaryo. Üretilen HER senaryonun uyacağı tek standart.
> **Kapsam:** Bu kontrat YENİ üretilen senaryolar içindir. Mevcut 14 senaryo
> geriye uyumlu kalır (`Scenario` tipinde; bu kontrata zorlanmaz).
> **Derleme kapısı:** `ProductionScenario` tipi + `defineScenario()` (src/engine/types.ts).
> **İçerik kapısı:** `scripts` → `validate.mjs` (Blok 3).
> **Klinik kapısı:** `clinical_review.status` DRAFT → REVIEWED → ACTIVE (sadece Ali Bey).

Son güncelleme: 21 Haziran 2026 (Blok 1)

---

## 0. Üç katmanlı kapı

Üretilen senaryo **üç** kapıdan geçer. Hiçbiri atlanamaz:

| Kapı | Ne kontrol eder | Araç | Bloklar |
|------|-----------------|------|---------|
| **Derleme** | Zorunlu ALAN var mı | `ProductionScenario` + `tsc` | Blok 1 |
| **İçerik** | Alan İÇERİĞİ yeterli mi (boş değil, id geçerli, skor tutarlı, dallanma var) | `validate.mjs` | Blok 3 |
| **Klinik** | Tıbbi değer doğru mu | İnsan (Ali Bey + Claude.ai) | DRAFT→ACTIVE |

Derleme + İçerik kapısı **otomatik** ve doktor gerektirmez. Klinik kapı insan işi.
Bir senaryo derleme+içerik kapısından geçse bile **ACTIVE değildir** — `DRAFT` doğar.

---

## 1. ZORUNLU alanlar (her üretilen senaryo)

`defineScenario({...})` ile yazılır. Eksikse **derlenmez**.

### 1.1 Meta
- `id` — slug (`toksikoloji-opioid-overdoz-001`)
- `version` — `"1.0.0"`
- `title`, `description` — Türkçe, açık
- `specialty` — `Specialty` enum (kardiyoloji|dahiliye|acil|pediatri|cerrahi|anestezi|kadin_dogum|hemsirelik|askeri_tccc)
- `tags` — en az 2 (arama/filtre)
- `difficulty` — 1-5 varsayılan seviye
- `supported_difficulties` — **en az 3 seviye** (validate kontrol eder)
- `estimated_minutes`, `modes`, `language: "tr"`, `last_updated` (ISO)

### 1.2 Hasta + başlangıç
- `patient` — age/sex/weight_kg/chief_complaint/history_items/allergies (hepsi dolu)
- `initial_vitals` — hr/bp_systolic/bp_diastolic/spo2/temp/rr **klinik tutarlı aralıkta**
  (yaşa göre PALS/erişkin normları — bkz. `vital-signs-hud` skill)
  - Pediatride yetişkin değeri KOYMA (validate uyarır).

### 1.3 İçerik (cansız senaryo YASAK)
- `steps[]` + `start_step_id` (steps içinde olmalı)
- **EN AZ 1 `deterioration` fazı** — tedavisiz hasta kötüleşir.
  Statik senaryo (deterioration yok) ÜRETİLEMEZ. `trends[]` + `halted_by[]` dolu.
- **EN AZ 1 gerçek dallanma** — bir `decision` veya `action` `unlocks` ile
  AYRI bir adım/yol açmalı. Öğrenci kararı yolu DEĞİŞTİRMELİ (tek-yol senaryo zayıf).

### 1.4 Envanter (GEÇERLİ katalog-id)
- `available_medications[]` — hepsi `src/data/medications.ts`'te var olmalı
- `available_equipment[]` — hepsi `src/data/equipment.ts`'te var olmalı
- (validate her id'yi katalogla çapraz kontrol eder — uydurma id = FAIL)

### 1.5 Ekipman etkisi (Blok 2)
- `use_central_equipment_effects: true` — ekipman→fizyoloji merkezi mapper'dan.
  Ekipman kullanan üretim senaryosu bunu açar (eski elle vitals_change yerine).
  Saf-karar senaryosu (ekipman yok) açmayabilir.

### 1.6 Puanlama (tutarlı)
- `scoring.max_points` — **ulaşılabilir optimal skor** = tüm doğru outcome
  puanlarının erişilebilir toplamı. Şişik max_points YASAK (validate bonus audit eder).
- `scoring.passing_score` ≈ max_points × 0.6
- `grade_bands` A≥B≥C≥D (auto modda otomatik türetilir — `grading_mode: "auto"` öner)
- `scoring.score_floor: 0` (negatif skor öğrenci motivasyonunu bozar)

### 1.7 Klinik + debrief
- `clinical_review` — **ZORUNLU**, `status: "DRAFT"` ile doğar.
  `draft_areas: [...]` review bekleyen alanları listeler (örn. `["deterioration","doz"]`).
- `debrief.key_learnings[]` — en az 2 madde
- `debrief.references[]` — **en az 1 TR/uluslararası kılavuz** (ESC/AHA/TKD/TARD/UÇEP...)

---

## 2. KLİNİK DEĞER DİSİPLİNİ (kritik)

> Otomatik üretim **klinik değer UYDURMAZ.**

- İlaç dozu, deterioration trend hızı, ekipman etki miktarı, antidot yanıtı gibi
  **klinik sayısal değerler** üretimde MAKUL başlangıç + zorunlu etiket alır:

```ts
spo2: 78,  // TODO_KLINIK: opioid solunum depresyonu hipoksemi derecesi — Claude.ai kaynaklı doğrulayacak
```

- Etiket formatı: `// TODO_KLINIK: <ne doğrulanacak> — <beklenen kaynak>`
- `clinical_review.status` = **DRAFT** (ASLA ACTIVE).
- Gerçek değerler **Claude.ai turunda** kaynaklı doldurulur → sonra **Ali Bey** ACTIVE'e alır.
- validate.mjs `TODO_KLINIK` etiketlerini sayar ve "klinik-kaynak-eşleştirme" raporu üretir.

---

## 3. ÇEŞİTLİLİK hedefi (16→400)

Mevcut 14 senaryo dar: ağırlık kardiyoloji/acil. 400 hedefi GENİŞ yelpaze ister.
Üretim branştan bağımsız çalışmalı:

- **Sıfır/az kapsama branşlar öncelik:** toksikoloji (overdoz/antidot), psikiyatri
  (ajitasyon/intihar/deliryum), nöroloji (status epileptikus/menenjit), endokrin
  (tiroid krizi/addison), nefroloji, gastroenteroloji (GİS kanama), enfeksiyon,
  geriatri, yenidoğan, çevresel (hipotermi/boğulma/zehirlenme).
- Varyant değil **yeni vaka** üret — aynı hastalığın 5 kopyası değil, geniş tablo.

---

## 4. GERİYE UYUMLULUK (ihlal etme)

- Mevcut 14 senaryo `Scenario` tipinde, elle `vitals_change` kullanır — **DOKUNMA**.
- Yeni sistemler **EK KATMAN** (opt-in): flag yoksa eski davranış aynen.
- 828+ vitest + 23 e2e geçmeye devam etmeli.
- `src/engine/` saf fonksiyonel kalır (React import yok).
- `setSession` her zaman functional form (`s => ...`).

---

## 5. Üretim checklist (skill bunu izler — Blok 4)

```
[ ] defineScenario({...}) ile yazıldı (derleme kapısı)
[ ] meta tam + supported_difficulties ≥3
[ ] patient + initial_vitals klinik-tutarlı (yaşa göre)
[ ] deterioration ≥1 faz (trends + halted_by)
[ ] ≥1 gerçek dallanma (unlocks ayrı yol açıyor)
[ ] available_medications/equipment hepsi katalogda
[ ] use_central_equipment_effects (ekipman varsa) true
[ ] max_points = ulaşılabilir optimal (şişik değil)
[ ] clinical_review.status = "DRAFT" + draft_areas dolu
[ ] debrief.references ≥1 kılavuz
[ ] klinik sayısal değerler TODO_KLINIK etiketli
[ ] node validate.mjs <isim> → PASS
[ ] index.ts'e eklendi (DRAFT görünür)
```
