---
name: vital-signs-hud
description: Hasta vitalleri için PALS 2015 yaş normları, alarm eşik tabloları, EKG/SpO2/EtCO2/MAP/CVP/pupil referansı. Vital signs HUD komponent eklerken, senaryo `initial_vitals` doğrularken, monitör alarm logic yazarken bu skill'i kullan — yaş grupları çok kritik, çocukta yetişkin değer kullanma.
---

# Vital Signs HUD — PALS 2015 Yaş Spesifik Norm Referansı

## Ne zaman kullan

- Sprint B.3 — Vital signs HUD komponenti tasarımı
- Senaryo `initial_vitals` field doğrulama (yaş ile uyumlu mu)
- `monitor_config.alarm_thresholds` ayarlama
- 12-derivasyon EKG component (V1-V6 göğüs lead, klasik 4 ekstremite)
- Vital değişim → 3D cilt tonu mapping (SpO2 < 90 → siyanoz preset)

## Birincil veri kaynağı

⭐ **Master rapor:** `docs/MASTER-REPORT-v3.md` Bölüm 9.C tablosu (kanonik).
**Memory tamamlayıcı:** `docs/memory/medisim_anatomik_landmark.md` (EKG lead pozisyonları), `docs/memory/medisim_anatomi_klinik.md` (toraks projeksiyonları).

## PALS 2015 Yaş Spesifik Aralıklar (kanonik tablo)

| Yaş grubu | HR uyanık | HR uyku | RR | SBP sistolik | Hipotansiyon eşiği |
|---|---|---|---|---|---|
| Yenidoğan (<28 gün) | 100–205 | 90–160 | 30–53 | 67–84 | <60 |
| Bebek (1–12 ay) | 100–190 | 90–160 | 30–53 | 72–104 | <70 |
| Toddler (1–2 y) | 98–140 | 80–120 | 22–37 | 86–106 | <70+(yaş×2) |
| Okul öncesi (3–5 y) | 80–120 | 65–100 | 20–28 | 89–112 | <70+(yaş×2) |
| Okul (6–11 y) | 75–118 | 58–90 | 18–25 | 97–115 | <70+(yaş×2) |
| Adolesan (12–15 y) | 60–100 | 50–90 | 12–20 | 110–131 | <90 |
| Erişkin (>18 y) | 60–100 | — | 12–20 | 90–120 | <90 |
| Geriatrik (>65 y) | 60–100 | — | 12–20 | hedef 130/80 | <90 |

## Diğer Vitaller (yaş bağımsız)

| Parametre | Normal | Anormal eşik | Birim |
|---|---|---|---|
| SpO2 | 95–100 | <90 kritik, <92 alarm | % |
| Vücut ısısı (rektal) | 36–38 | <35 hipo, >38 ateş | °C |
| Vücut ısısı (oral) | 35–37 | <35.5 / >37.5 | °C |
| EtCO2 | 35–45 | <30 hipoventilasyon, >50 hipervent | mmHg |
| MAP | 70–105 | <65 sepsis, >110 HT acil | mmHg |
| CVP | 2–8 | <2 hipovolemi, >12 yüklenme | cmH₂O |
| GCS | 15 | ≤8 entübasyon | 3-15 |
| Glukoz | 70–140 | <70 hipoglisemi, >200 DM | mg/dL |
| Pupil çapı | 2–4 (gündüz) | <2 mioz (opioid), >6 midriyaz (atropin/hipoksi) | mm |
| Saatlik idrar | 0.5–1 mL/kg/saat erişkin, 1–2 ml/kg/saat ped | <0.5 oligüri | mL/kg/saat |

## 12-Derivasyon EKG Lead Pozisyonları

| Lead | Konum | Anatomik referans |
|---|---|---|
| V1 | 4. ICS sağ sternal kenar | Sağ atrium, septum |
| V2 | 4. ICS sol sternal kenar | Sağ ventrikül, septum |
| V3 | V2-V4 arası orta | Septum, anterior LV |
| V4 | 5. ICS sol midklavikular | Apex (LV) |
| V5 | V4 hizası, anterior aksiller hat | Lateral LV |
| V6 | V4 hizası, midaksiller hat | Lateral LV |
| RA | Sağ kol (omuz altı) | — |
| LA | Sol kol (omuz altı) | — |
| RL | Sağ bacak (ground) | — |
| LL | Sol bacak | — |

→ World koordinatları: `docs/memory/medisim_anatomik_landmark.md` — V1-V6 için 4-5. ICS hattı + x sırasıyla +0.02, -0.02, -0.045, -0.085, -0.13, -0.165.

## EKG Pattern Tipleri (`scenario.ekg_pattern`)

| Pattern | Senaryolar |
|---|---|
| `normal_sinus` | Sağlıklı baseline |
| `sinus_tachycardia` | Anksiyete, ateş, dehidratasyon |
| `sinus_bradycardia` | Atlet, ilaç (BB), hipotermi |
| `afib` | Atriyel fibrilasyon (düzensiz, P yok) |
| `vt_monomorphic` | Ventriküler taşikardi |
| `vf` | Ventriküler fibrilasyon (defib) |
| `asystole` | Düz çizgi |
| `stemi_anterior` | ST elevasyon V1-V4 |
| `stemi_inferior` | ST elevasyon II/III/aVF |
| `nstemi` | ST depresyon / T negatif |
| `heart_block_3` | P-QRS dissosiyasyon |
| `torsades` | Polimorf VT |

## Alarm Eşik Default'ları (MonitorConfig)

```ts
const defaultThresholds: AlarmThresholds = {
  hr_low: 50, hr_high: 130,
  spo2_low: 92,
  bp_systolic_low: 90, bp_systolic_high: 180,
  rr_low: 10, rr_high: 28,
  etco2_low: 30, etco2_high: 50,
  glucose_low: 70, glucose_high: 250,
  urine_output_low: 0.5,  // mL/kg/saat
};
```

⚠️ Pediatride alarm eşik default değil — yaş grubuna göre hesaplanmalı. `getAlarmThresholds(age, weight_kg)` helper'ı gerekli.

## Vital → 3D Görsel Mapping

| Vital koşul | 3D efekt | Shader uniform |
|---|---|---|
| SpO2 < 90 | Cilt → siyanoz | `uSkinTint = [0.65, 0.75, 0.95]` |
| Bilirubin yüksek | Cilt → ikter | `uSkinTint = [1.15, 1.05, 0.55]` |
| Şok (SBP < 90) | Cilt → solgun | `uSkinTint = [0.85, 0.80, 0.78]` |
| HR | Breathing freq + EKG | `uBreathRate` (rr) |
| Pupil reactive | Iris/pupil scale | `uPupilSize = 0.1-0.4` |

→ Bu mapping `src/clinical/visual-mapping.ts` (henüz oluşmadı, master rapor 4.10 öneriyor).

## Gotchas

- ❌ **Çocuğa yetişkin değer**: Toddler HR 130 normal, erişkin 130 taşikardi. Senaryo yaşına göre normalleştir.
- ❌ **SpO2 < 90 kritik DEĞİL bazı KOAH'larda** — kronik hipoksemi baseline'ı 88-92 olabilir. Senaryo `patient.modifiers` ile kontrol.
- ❌ Pediatri SBP formülü: hipotansiyon eşiği `70 + (yaş × 2)` 1-10 yaş arası, sonrası <90.
- ❌ Gebelikte HR +10-15, SBP -5-10 (1. trimester), CO +%30-50. Trimester-spesifik.
- ✅ `score_floor: 0` yeni senaryolarda — negatif puan motivasyon bozucu.
- ✅ Default `grading_mode: "auto"` — max_points × %85/%70/%55/%40.

## Türkçe Kısaltma (UI)

`docs/memory/...` medical-terminology skill'inde de var:
TA (BP), NB (HR), SS (RR), SpO₂, KTA (PMI), CRT, GCS, EtCO₂, MAP, CVP, JVP

UI: "Nabız (HR): 120/dk" (TR + EN parantez).

## Referans dosyalar

- `src/engine/types.ts` — `PatientVitals`, `AlarmThresholds`, `MonitorConfig`
- `src/data/scenarios/*.ts` — örnekler
- `docs/MASTER-REPORT-v3.md` Bölüm 9.C (kanonik PALS tablosu)
