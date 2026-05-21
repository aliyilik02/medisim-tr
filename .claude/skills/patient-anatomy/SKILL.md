---
name: patient-anatomy
description: MediSim TR 3D mankenin world koordinatları + anatomik landmark + organ pozisyon/rotation/scale + view-by-view doğrulama. Marker EKLERKEN, OrganDevPanel/MarkerDevPanel'den JSON export YAPIŞTIRIRKEN, IndividualOrgans DEFAULT_ORGAN_CONFIGS DEĞİŞTİRİRKEN, regions.ts'e yeni bölge eklerken, scale/rotation/position SAYISI önerirken, anterior/posterior/lateral view'lerde organ veya marker'ın doğru tarafta olup olmadığını DOĞRULARKEN bu skill'i mutlaka kullan. Gözle tahmin asla doğru sonuç vermez; özellikle sol-sağ konvansiyonu (anatomik sağ = ekran sol, anterior view'de) ve karaciğer RUQ, kalp sol mediastinum kuralları sürekli karıştırılır. Kullanıcı görsel paylaşıp "yanlış" dediğinde de bu skill ile sanity check yap.
---

# Patient Anatomy — 3D Anatomik Yerleştirme Rehberi

## Ne zaman bu skill'e mecbursun

- Yeni `PatientRegion` veya organ pozisyon değeri önermeden ÖNCE
- `OrganDevPanel` JSON Export çıktısını `DEFAULT_ORGAN_CONFIGS`'e yapıştırmadan önce kontrol
- `regions.ts`'de marker x/y/z değiştirirken
- `IndividualOrgans.tsx` scale/position/rotation değerlerine sayı önerirken
- Kullanıcı "kalp/akciğer/karaciğer/marker yanlış yerde" dediğinde — önce hangi view'de baktığını ve hangi koordinatın yanlış olduğunu bul
- 3D model değişirse (yeni patient-vN.glb): tüm world bbox + landmark Y oranları rehesapla
- Senaryo `physical_exam` koordinatı yazarken

## Birincil veri kaynağı

⭐ **Memory:** [`docs/memory/medisim_anatomik_landmark.md`](../../../docs/memory/medisim_anatomik_landmark.md) — TAM world koordinat tablosu (8-head Vitruvian canon × model bbox)
**Master:** [`docs/MASTER-REPORT-v3.md`](../../../docs/MASTER-REPORT-v3.md) Bölüm 9.A

## Model bbox (patient-v2.glb wrapper-transformed)

```
y_min = -0.243  (topuk)        y_max = 0.778  (kafa tepe)        height = 1.021
x_range = [-0.20, +0.20]       z_range = [-0.08, +0.09]
```

**Formula:** `world_y = -0.243 + ratio × 1.021`

## Axis convention — EN ÇOK KARIŞTIRILAN KURAL

| Eksen | Pozitif yön | Anatomik anlam | Anterior view'de ekran |
|---|---|---|---|
| **+X** | Anatomik **SAĞ** (hastanın sağ kolu) | Sağ akciğer, karaciğer, sağ böbrek | **EKRAN SOL** |
| **−X** | Anatomik **SOL** | Kalp, dalak, sol akciğer, sol böbrek | **EKRAN SAĞ** |
| +Y | Yukarı (kafa) | – | Yukarı |
| −Y | Aşağı (ayak) | – | Aşağı |
| **+Z** | **Anterior** (göğüs ön) | Sternum tarafı | Ön (kameraya yakın) |
| **−Z** | **Posterior** (sırt) | Vertebra tarafı | Arka (kamerdan uzak) |

⚠ **Anatomik sağ ≠ ekran sağ**, çünkü hastayla karşılıklıyız. Bu 3D anatomi konvansiyonunun #1 hata kaynağıdır. Bir koordinat önermeden önce **şunu düşün:** "anatomik olarak hangi tarafta? → world x işareti ne?"

## View-by-view ekran haritası

Kullanıcı görsel paylaştığında hangi view'de olduğuna göre koordinatları nasıl yorumlayacağını bil. Detay: [`references/world-axes.md`](references/world-axes.md).

| View (header butonu) | Ekran SAĞ tarafı = world | Ekran SOL tarafı = world | Kamera bakıyor |
|---|---|---|---|
| **A**nterior | −X (anatomik sol) | +X (anatomik sağ) | −Z yönünde |
| **P**osterior | +X (anatomik sağ) | −X (anatomik sol) | +Z yönünde |
| **R**ight lateral | −Z (posterior) | +Z (anterior) | −X yönünde |
| **L**eft lateral | +Z (anterior) | −Z (posterior) | +X yönünde |
| **S**uperior | −X (sol) | +X (sağ) | −Y yönünde |
| **I**nferior | +X (sağ) | −X (sol) | +Y yönünde |

## Kritik landmark Y oranları (özet)

| Landmark | Ratio | World Y |
|---|---|---|
| Ağız | 0.89 | 0.666 |
| Suprasternal notch | 0.85 | 0.625 |
| 2. ICS (manubrium) | 0.80 | 0.574 |
| Sternum orta (3. ICS) | 0.77 | 0.543 |
| 4. ICS / nipple line | 0.75 | 0.523 |
| Xiphoid | 0.70 | 0.472 |
| Umbilicus | 0.625 | 0.395 |
| Suprapubic | 0.56 | 0.329 |

`regions.ts` chuma6oy modelinde kafa+boyun büyük olduğu için **`TORSO_Y_OFFSET = -0.020`** uygulanır gövde landmark'larına (`torsoY()` helper). Yeni model gelirse offset rehesaplanır.

## Kardiyak APE-T-M (5 oskültasyon noktası)

| Nokta | ICS | World x | World y (torsoY uygulanmış) | Yan |
|---|---|---|---|---|
| **A**ortic | 2. sağ | **+0.020** | 0.554 | Anatomik sağ |
| **P**ulmonic | 2. sol | **−0.020** | 0.554 | Anatomik sol |
| **E**rb | 3. sol | −0.020 | 0.533 | Sol |
| **T**ricuspid | 4. sol alt | −0.025 | 0.503 | Sol |
| **M**itral (apeks) | 5. sol MCL | **−0.085** | 0.475 | Sol — apex |

⚠ "Pulmoner sağda" = YANLIŞ. Sağda sadece Aortik var; Pulmoner SOL sternal kenardadır.

## Karın 4 kadran + organ projeksiyon

| Bölge | x | y | Organ projeksiyon |
|---|---|---|---|
| Epigastrium | 0 | 0.431 | Mide körpüsü, pankreas |
| Umbilical | 0 | 0.395 | İnce bağırsak |
| **RUQ** | **+0.08** | 0.450 | **Karaciğer**, safra kesesi, sağ böbrek üst pol |
| **LUQ** | **−0.08** | 0.450 | Mide, dalak, sol böbrek üst pol |
| **RLQ** | +0.08 | 0.360 | Sekum, apendiks |
| **LLQ** | −0.08 | 0.360 | Sigmoid kolon |

## Organ pozisyon kuralı (KRİTİK — sol-sağ konvansiyonu)

Detay (Sketchfab model orientation, rotation, scale) → [`references/organ-placement.md`](references/organ-placement.md).

| Organ | x işareti | y aralığı | z aralığı | Not |
|---|---|---|---|---|
| **Kalp** | **x < 0** (sol mediastinum, ortadan hafif sol) | 0.48–0.55 | 0.04–0.10 | Apex sol-anterior-aşağı. x > 0 sadece dextrocardia! |
| **Sol akciğer** | x ≈ −0.06 ila −0.10 | 0.45–0.58 | 0.02–0.06 | Kalp notch nedeniyle sağdan küçük |
| **Sağ akciğer** | x ≈ +0.06 ila +0.10 | 0.45–0.58 | 0.02–0.06 | 3 lobe |
| **Çift-akciğer tek mesh** (Sketchfab) | x ≈ 0 (orta) | 0.45–0.55 | 0.02–0.06 | Trakea + iki lob tek dosyada |
| **Karaciğer** | **x > +0.05** (RUQ, kesinlikle sağ) | 0.36–0.48 | 0.02–0.07 | Diafragma altı. x < 0 = YANLIŞ TARAF! |
| **Mide** | x ≈ −0.04 ila −0.08 (LUQ) | 0.36–0.45 | 0.03–0.06 | Sol üst karın |
| **Dalak** | x ≈ −0.10 ila −0.14 | 0.40–0.48 | 0.02–0.06 | LUQ lateral, kosta altı |
| **Sağ böbrek** | x ≈ +0.06 | 0.38–0.46 | **−0.03 ila +0.02** | Retroperitoneal — Z DÜŞÜK |
| **Sol böbrek** | x ≈ −0.06 | 0.40–0.48 | **−0.03 ila +0.02** | Soldan biraz yukarı |

**Hangi tarafta?** kuralını koordinattan önce sor: karaciğer → sağ → x > 0. Kalp → sol → x < 0. Dalak → sol → x < 0.

## Marker Z (anterior-posterior) — bölgeye göre

⚠ **EN SIK MARKER HATASI:** Tüm marker'lara z = 0.13 ya da 0.135 vermek. Bu sadece göğüs/karın anterior için doğrudur — boyun yüzeyi farklı, sırt negatif, yan farklı.

| Bölge tipi | Yüzey z | Marker önerilen z | Örnek |
|---|---|---|---|
| Göğüs anterior (sternum hizası) | 0.085 | **0.130–0.140** | APE-T-M oskültasyon |
| Karın anterior | 0.085 | **0.130–0.140** | Kadran palpasyon |
| Boyun ön (karotis) | ~0.060 | **0.080–0.105** | Boyun yüzeyi ince |
| Yan / lateral (axilla, brachial) | x≈±0.16, **z≈0** | bölgeye göre düşük | Brakiyal nabız |
| Antecubital fossa | x≈±0.21, z varies | x mesafesi büyük, z küçük | Median cubital ven |
| Sırt / posterior thorax | yüzey **z ≈ −0.06** | **−0.10 ila −0.08** | Sırt akciğer dinleme |
| Bilek / radial | x≈±0.22, z≈0 | – | Radial nabız |
| Ayak üstü / pedis | x≈±0.04, y≈−0.20, z≈0 | – | Dorsalis pedis |

Detay (her marker'ın anatomik tanımı + world koordinatı) → [`references/marker-zones.md`](references/marker-zones.md).

## Sanity check protokolü — koordinat önermeden ÖNCE çalıştır

1. **Hangi anatomik yapı?** (organ adı, marker adı)
2. **Anatomik sağ mı, sol mı, midline mı?** → x işareti
3. **Hangi vertikal seviye?** (ICS, kadran) → y oranı × bbox formula
4. **Anterior mu, posterior mu, lateral mı?** → z aralığı
5. **Mevcut benzer marker/organ var mı?** → `regions.ts` veya `IndividualOrgans.tsx` `DEFAULT_ORGAN_CONFIGS` aç, koordinat tutarlılığı kontrol et
6. **6-view sanity** — Kullanıcı görsel paylaşmadan önce sen kendin zihinde:
   - Anterior: x > 0 olan organ ekranın sol tarafında mı görünmeli?
   - Posterior: aynı organ ekranın sağ tarafında mı?
   - Sağ lateral: organ kameraya yakın mı uzakta mı?
7. **Sıra kontrol** (varsa) → kullanıcıdan ilgili view'in screenshot'ını iste, veya `medisim-3d-vision-test` skill'i ile preview MCP üzerinden test çek

Tam checklist + tipik yanılgı pattern'leri → [`references/sanity-check.md`](references/sanity-check.md).

## Tipik yanılgı pattern'leri (kullanıcı görsel paylaşırsa hemen düşün)

- **Karaciğer mid-line'da veya sol tarafta görünüyor** → x işareti yanlış (negatif). Hemen kontrol et: `DEFAULT_ORGAN_CONFIGS.liver.position[0]` pozitif mi? Doğru aralık +0.05 ila +0.12.
- **Kalp posterior view'den net görünüyor + ekranın sağ tarafında** → x pozitif olmuş (sağ mediastinum'a kaymış). Doğrusu x < 0.
- **Marker boyun veya başta havada uçuyor** → Z fazla. Boyun marker'ı için z = 0.08–0.10, gövde için z = 0.13–0.14.
- **Marker sırtta görünmüyor / gövde içinde** → Z pozitif yerine negatif olmalı (z = −0.10 civarı sırt için).
- **Akciğer trakeası boyun seviyesine kadar uzanıyor** → Tek-mesh modelde model üst sınırı yüksek. `OrganModel.secondaryRotation` ile üst %20'yi ayrı rotate et, ya da scale küçült + position aşağı al.
- **Yan view'de marker gövdeden 5+ cm uzakta** → Anterior z (0.13+) yan view'de "uçuş" gibi görünür ama beklenen davranıştır; sorun değil. Ama z 0.20+ ise marker fazla ileride.
- **Posterior view'de anterior marker'lar gövde üzerinden parlıyor** → AnatomicPatientModel transparent (clipping aktif). Bu beklenen.

## Validator kontrolleri (yeni region / organ eklerken)

```
[ ] x bbox içinde (-0.20 / 0.20)
[ ] y bbox içinde (-0.25 / 0.78) — torsoY offset uygulandı mı?
[ ] z surface üstünde veya posterior için negatif
[ ] Anatomik tarafta mı? (kalp x<0, karaciğer x>+0.05, dalak x<0, sağ böbrek x>0)
[ ] TR + TA2 uyumlu adlandırma (bkz. medical-terminology skill)
[ ] auscultationSoundId varsa public/sounds/auscultation/ altında
[ ] 6-view sanity (en az anterior + posterior + 1 lateral)
```

## İlgili skill'ler ve referanslar

- **`medisim-3d-vision-test`** — Preview MCP ile sahne screenshot + visual regression. Pozisyon değişikliği sonrası bunu çağır.
- **`r3f-medical`** — Three.js / R3F pattern'leri (shader, clipping, animation).
- **`z-anatomy-binding`** — Z-Anatomy Splanchnology mesh entegrasyon notları.
- **`medical-terminology`** — TR/TA2 anatomik adlandırma standardı.
- Memory: [`docs/memory/medisim_anatomik_landmark.md`](../../../docs/memory/medisim_anatomik_landmark.md) (TAM tablo)
- Kod: `src/components/patient-3d/regions.ts`, `src/components/patient-3d/IndividualOrgans.tsx`, `src/components/patient-3d/AnatomicPatientModel.tsx`
