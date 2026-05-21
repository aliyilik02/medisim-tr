# World Axes — 3D koordinat sistemi tam referansı

Bu dosya `patient-anatomy` skill'inin axis convention bölümünü genişletir. Sol-sağ ya da view yorumu konusunda emin değilsen burayı oku.

## Model uzayı: patient-v2.glb (chuma6oy)

Wrapper transform (`AnatomicPatientModel.tsx`): `scale = 0.107`, `position = [0, 0.49, 0]`. Sonuç world bbox:

```
x_range = [-0.20, +0.20]    width  ≈ 40 cm
y_range = [-0.243, 0.778]   height ≈ 102 cm  (yetişkin erkek)
z_range = [-0.08, +0.09]    depth  ≈ 17 cm
```

**Hasta orientation:**
- Ayakta duruyor, kafa +Y, ayak −Y
- Yüzü +Z yönünde bakıyor (anterior)
- Sırtı −Z yönünde
- Sağ kolu +X yönünde, sol kolu −X yönünde

## Standart anatomik düzlemler

| Düzlem | Tanım | Normal vektör |
|---|---|---|
| Sagittal | Sol-sağ ayıran | ±X |
| Frontal (coronal) | Ön-arka ayıran | ±Z |
| Transvers (axial) | Üst-alt ayıran | ±Y |

Midsagittal = x = 0 düzlemi (orta hat).
Midaxillary = x = ±0.10 civarı, koltuk altı dikey.

## Anatomik yön → world işareti tablosu

| Anatomik terim | World eksen | İşaret |
|---|---|---|
| Anterior (ön) | Z | + |
| Posterior (arka) | Z | − |
| Superior (yukarı, kraniyal) | Y | + |
| Inferior (aşağı, kaudal) | Y | − |
| **Dexter / sağ (hasta sağı)** | **X** | **+** |
| **Sinister / sol (hasta solu)** | **X** | **−** |
| Medial (orta hatta yakın) | – | \|x\| küçük |
| Lateral (orta hattan uzak) | – | \|x\| büyük |
| Proximal (gövdeye yakın) | – | bağlamsal |
| Distal (gövdeden uzak) | – | bağlamsal |

## Anatomik sağ = ekran solu (anterior view'de) — neden?

Hastayla **karşılıklı** dururuz (klinik konvansiyon, EKG, akciğer grafisi, fizik muayene). Hastanın sağ kolu bizim sol tarafımızda. Bu yüzden:

- Hasta için: "Sağım" = +X
- Bizim için: o +X taraf "ekranın solunda"

Bu durum **sadece anterior view'de** geçerli. Diğer view'lerde eşleştirme farklıdır (aşağıdaki tablo).

## 6 view × ekran ekseni eşleştirme tam tablosu

`PatientDialog3DPage` header'ındaki butonlar (A/P/R/L/S/I) `CAMERA_PRESETS` ile şu pozisyonları kullanır:

```
anterior:  position [0, 0.27, 2.73]    bakış yönü: -Z
posterior: position [0, 0.27, -2.73]   bakış yönü: +Z
right:     position [2.73, 0.27, 0]    bakış yönü: -X
left:      position [-2.73, 0.27, 0]   bakış yönü: +X
superior:  position [0, 3.2, 0.05]     bakış yönü: -Y
inferior:  position [0, -2.6, 0.05]    bakış yönü: +Y
```

| View | Kamera bakıyor | Ekran SAĞ = | Ekran SOL = | Ekran YUKARI = |
|---|---|---|---|---|
| Anterior (A) | −Z | −X (anatomik sol) | +X (anatomik **sağ**) | +Y |
| Posterior (P) | +Z | **+X (anatomik sağ)** | −X (anatomik sol) | +Y |
| Right lateral (R) | −X | −Z (posterior, sırt) | +Z (anterior, göğüs) | +Y |
| Left lateral (L) | +X | +Z (anterior, göğüs) | −Z (posterior, sırt) | +Y |
| Superior (S) | −Y | −X (anatomik sol) | +X (anatomik sağ) | −Z (posterior) |
| Inferior (I) | +Y | +X (anatomik sağ) | −X (anatomik sol) | +Z (anterior) |

## Pratik kullanım: koordinattan görsele

**Örnek 1.** Karaciğer pozisyonu `(+0.08, 0.45, 0.05)`. Anatomik sağ + 4-5 ICS hizası + anterior.
- Anterior view'de: ekran **sol** tarafında, sternumun ortasından sağa, orta yükseklikte
- Posterior view'de: ekran **sağ** tarafında (anatomik sağ → ekran sağı, çünkü posterior'da ayna)
- Right lateral view'de: kameraya yakın, ekran orta yatay, hafif öne (z=+0.05)
- Inferior view'de (aşağıdan bakış): ekran sağ üstte (anatomik sağ + anterior)

**Örnek 2.** Kalp `(−0.02, 0.523, 0.06)`. Anatomik sol (hafif) + 4. ICS + anterior orta.
- Anterior view'de: ekran **sağ** tarafına çok yakın, orta yükseklikte
- Posterior view'de: ekran **sol** tarafında

**Bu şekilde HER pozisyondan önce kafanda 2 view simüle et.**

## Görsel paylaşıldığında çıkarım

Kullanıcı bir screenshot gönderirse:

1. View butonunun aktif olanını (A/P/R/L/S/I) screenshot'tan veya konuşma context'inden tespit et
2. Ekrandaki sağ-sol-yukarı-aşağı'yı yukarıdaki tabloyla world eksen işaretine çevir
3. Hangi anatomik yapının nerede görünmesi gerektiğini hesapla
4. Görsel ile zihindeki beklentiyi karşılaştır → tutarsızlık varsa hangi eksenin yanlış olduğunu söyle

## Sketchfab / glTF organ modelleri için eksenler

İndirilen `.glb` organ dosyalarında genelde:
- glTF spec: **+Y up, right-handed, −Z forward**
- Sketchfab modelleri çoğu zaman bu konvansiyondadır
- Bazı modeler eski Maya/3ds Max convention (Z up) — bu durumda model 90° döndürülmesi gerek
- Modeli ilk yerleştirdiğinde scale = 1, position = (0, 0.4, 0), rotation = (0,0,0) ile dene → yan yatık çıkıyorsa rotation X = −90° (Z-up → Y-up dönüşümü)

## Sıkça karıştırılan terimler (TR/EN/Lat)

| TR | EN | Latin | Yön |
|---|---|---|---|
| Sağ | Right | Dexter | +X |
| Sol | Left | Sinister | −X |
| Üst | Upper, Superior | Superior, Cranialis | +Y |
| Alt | Lower, Inferior | Inferior, Caudalis | −Y |
| Ön | Front, Anterior | Anterior, Ventralis | +Z |
| Arka | Back, Posterior | Posterior, Dorsalis | −Z |
| Orta hat | Midline | Linea mediana | x = 0 |
| Sternal kenar | Parasternal | – | \|x\| ≈ 0.02 |
| Midklavikular | Mid-clavicular line | – | \|x\| ≈ 0.085 |
| Aksiller | Mid-axillary | – | \|x\| ≈ 0.12 |

Medical terminoloji detayı için `medical-terminology` skill'ine bak.
