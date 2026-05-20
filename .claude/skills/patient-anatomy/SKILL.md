---
name: patient-anatomy
description: MediSim TR 3D mankenin world koordinatlarında anatomik landmark, kardiyak APE-T-M auskültasyon noktaları, karın bölgeleri, palpasyon noktaları. Marker eklerken/ayarlarken, senaryo bölge tanımı yazarken bu skill'i kullan — gözle tahmin YAPMA.
---

# Patient Anatomy — 3D Landmark Referansı

## Ne zaman kullan

- Yeni `PatientRegion` eklerken (`src/components/patient-3d/regions.ts`)
- Stetoskop / palpasyon / IV noktası koordinatı hesaplarken
- Senaryoda `physical_exam.cardiovascular.auscultation` veya `abdominal.palpation` field doldururken
- Solunum shader chest center'ı ayarlarken
- 3D model bbox değişirse koordinatları yeniden hesaplarken

## Birincil veri kaynağı

⭐ **Memory:** `memory/medisim_anatomik_landmark.md` — 3D world koordinat tablosu (8-head Vitruvian canon × model bbox).
**Tamamlayıcı:** `memory/medisim_anatomi_klinik.md` — karın 9 bölge + organ projeksiyonları + vasküler.
**Master:** `docs/MASTER-REPORT-v3.md` Bölüm 9.A.

## Model bbox (patient-v2.glb wrapper-transformed)

```
y_min = -0.243  (topuk)   y_max = 0.778  (kafa tepe)
height = 1.021            x_range = [-0.20, +0.20]
```

**Formula:** `world_y = -0.243 + ratio × 1.021`

## Kritik landmark Y oranları

| Landmark | Ratio | World Y |
|---|---|---|
| Mouth | 0.89 | 0.666 |
| Sternum orta | 0.77 | 0.543 |
| Nipple / 4. ICS | 0.75 | 0.523 |
| Xiphoid | 0.70 | 0.472 |
| Umbilicus | 0.625 | 0.395 |
| Suprapubic | 0.56 | 0.329 |
| Pubic symphysis | 0.50 | 0.268 |

## Kardiyak APE-T-M auskültasyon (5 nokta)

| Nokta | ICS | x | y |
|---|---|---|---|
| Aortic | 2. sağ | +0.02 | 0.574 |
| Pulmonic | 2. sol | -0.02 | 0.574 |
| Erb | 3. sol | -0.02 | 0.553 |
| Tricuspid | 4. sol alt | -0.025 | 0.523 |
| Mitral (apeks) | 5. sol MCL | -0.085 | 0.495 |

## Gotchas

- ❌ **GÖZLE TAHMİN YAPMA.** Önceden bu yüzden marker'lar yanlış yerlere düştü, fix 3 turn aldı.
- ❌ **"Pulmoner = sağ"** YANLIŞ. Pulmonik **SOL** sternumda. Sağda sadece Aortik var.
- ❌ Model değişirse bbox değişir, **tüm koordinatlar rehesaplanmalı** — formula `world_y = y_min + ratio × height` her zaman geçerli, oranlar sabit.
- ✅ Marker z koordinatı: deri yüzeyi (z=0.085) + marker yarıçapı (0.018) → z=0.10-0.115 önerilir.
- ✅ Shader chest center: midline x=0, y=0.523 (4. ICS), z=0.085.

## Validator kontrolleri (yeni region eklerken)

- [ ] y bbox içinde (-0.25 / 0.78)
- [ ] x bbox içinde (-0.20 / 0.20)
- [ ] z marker yüzey üstünde (≥ 0.10)
- [ ] Anatomik adlandırma TR + TA2 uyumlu (örn. "Sol Apex (Mitral)" değil "Sol Göğüs")
- [ ] `auscultationSoundId` (varsa) public/sounds/auscultation/ altında

## Referans dosyalar

- `src/components/patient-3d/regions.ts`
- `src/components/patient-3d/AnatomicPatientModel.tsx`
- `memory/medisim_anatomik_landmark.md` (TAM tablo)
