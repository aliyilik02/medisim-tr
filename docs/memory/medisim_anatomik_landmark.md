---
name: MediSim 3D — Anatomik Landmark Referansı
description: 3D manken (patient-v2.glb wrapper-transformed) world koordinatlarında standart yetişkin erkek anatomik landmark'ları. Marker / auskültasyon / IV noktası eklerken/ayarlarken bu tabloya bak — gözle tahmin yapma.
type: reference
originSessionId: 0bba8189-fb17-45da-90c4-0cbc0bc9f4a3
---
## Model bbox (world space)

```
y_min = -0.243  (topuk/taban)   y_max = 0.778  (vertex/kafa tepe)
height = 1.021                  x_range = [-0.20, +0.20]
```

**Formula:** `world_y = -0.243 + ratio × 1.021`

## 8-Head Canon Y oranları

| Landmark | Ratio | World Y |
|---|---|---|
| Vertex (kafa tepe) | 1.00 | 0.778 |
| Eyes | 0.93 | 0.706 |
| Mouth | 0.89 | 0.666 |
| Chin | 0.875 | 0.650 |
| Suprasternal notch (boyun çukuru) | 0.85 | 0.625 |
| Manubrium / 2. ICS | 0.80 | 0.574 |
| Sternum orta | 0.77 | 0.543 |
| Nipple / 4. ICS | 0.75 | 0.523 |
| Xiphoid (sternum alt) | 0.70 | 0.472 |
| Epigastrium | 0.66 | 0.431 |
| Umbilicus (göbek) | 0.625 | 0.395 |
| Suprapubic | 0.56 | 0.329 |
| Pubic symphysis (vücudun yarısı) | 0.50 | 0.268 |
| Mid-thigh | 0.375 | 0.140 |
| Knee (patella) | 0.25 | 0.012 |
| Mid-calf | 0.125 | -0.115 |
| Heel | 0.00 | -0.243 |

## Kardiyak auskültasyon 5 noktası (APE To Man mnemoniği)

Midline x=0; midclavicular line ≈ x=±0.085; sternal kenar ≈ x=±0.02.

| Nokta | ICS | Lokasyon | World (x, y) |
|---|---|---|---|
| **A**ortic | 2. | Sağ sternal kenar | (+0.02, 0.574) |
| **P**ulmonic | 2. | Sol sternal kenar | (-0.02, 0.574) |
| **E**rb's | 3. | Sol sternal kenar (S2) | (-0.02, 0.553) |
| **T**ricuspid | 4. | Sol sternal alt kenar | (-0.025, 0.523) |
| **M**itral (apex) | 5. | Sol midclavicular | (-0.085, 0.495) |

⚠️ Pulmonik **SOL** sternumdadır. Sağ tarafta sadece **Aortic** vardır. "Sağ göğüs = Pulmoner" yanlış adlandırma; ya Aortic yaz ya 2 ayrı marker.

## Karın 4 kadran + midline

| Bölge | World (x, y) |
|---|---|
| Epigastrium (üst karın) | (0, 0.431) |
| Umbilical (göbek) | (0, 0.395) |
| RUQ (karaciğer) | (+0.08, 0.450) |
| LUQ (mide) | (-0.08, 0.450) |
| RLQ (sekum/apendiks) | (+0.08, 0.360) |
| LLQ (sigmoid) | (-0.08, 0.360) |
| Suprapubic (alt karın) | (0, 0.329) |

## IV / vasküler erişim (öncelik sırası: antecubital → el üstü → femoral → EJV)

| Bölge | Vena | World (x, y) yaklaşık |
|---|---|---|
| Antecubital fossa sol | Median cubital | (-0.21, 0.45)* |
| Antecubital fossa sağ | Median cubital | (+0.21, 0.45)* |
| El üstü sol/sağ | Cephalic dorsal | (±0.24, 0.30)* |
| Femoral sol/sağ | Femoral vein | (±0.06, 0.20) |
| External jugular sol/sağ | EJV | (±0.04, 0.62) |

*Kol pozisyonuna bağlı; v2 modelde kollar vücudun yanında, doğrulama gerek.

## Periferik nabız noktaları

| Nokta | World (x, y) |
|---|---|
| Karotis (boyun yan) | (±0.05, 0.62) |
| Brakiyal (iç kol) | (±0.16, 0.48) |
| Radial (bilek) | (±0.22, 0.32)* |
| Femoral (kasık) | (±0.06, 0.20) |
| Dorsalis pedis (ayak üstü) | (±0.04, -0.20) |

## Solunum hareket merkezi

Sakin nefes ana hareket: göğüs anterior duvarı (sternum + alt kosta) AP genişleme + diafragma aşağı iniş (görsel'de göbek hafif öne).
- **Chest center:** midsternum, y=0.523 (4. ICS / nipple hizası)
- **Falloff radius:** ~0.06 birim (kosta sınırları içinde)
- **AP amplitude:** 0.5-1 cm world (fizyolojik sakin solunum)

## Kaynaklar

- [Body proportions / 8-head canon (Wikipedia)](https://en.wikipedia.org/wiki/Body_proportions)
- [Cardiac auscultation areas (Osmosis)](https://www.osmosis.org/answers/auscultation)
- [Cardiac landmarks (Stethoscope.com)](https://www.stethoscope.com/blog/the-five-critical-auscultation-points-or-cardiac-landmarks/)
- [IV access sites (Nursing Advanced Skills)](https://wtcs.pressbooks.pub/nursingadvancedskills/chapter/1-3-iv-access/)
