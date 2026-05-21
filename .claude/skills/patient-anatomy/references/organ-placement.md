# Organ Placement — anatomik pozisyon, rotation, scale

Bu dosya `IndividualOrgans.tsx` `DEFAULT_ORGAN_CONFIGS` ve `OrganModel` prop'larıyla doğrudan eşleşir. Her organ için: **(a)** anatomik konum kuralı **(b)** Sketchfab model orientation normalizasyonu **(c)** rotation pivot ipuçları **(d)** scale tahmin aralığı.

## Genel kural — koordinattan ÖNCE düşün

1. Organın anatomik tarafı (sağ / sol / orta / retroperitoneal)?
2. Hangi düzlemde? (mediastinum / RUQ / LUQ / pelvis)
3. Hangi y seviyesinde? (ICS hizası, kostal kenar, umbilicus ref)
4. Anterior mı, derin mi, posterior mı? → z
5. Sketchfab model "naked" indirildiğinde nasıl çıkıyor? → rotation normalization

## Kalp (heart.glb)

### Anatomik konum
- **Mediastinum'da, sternumun arkasında, orta hattın hafif solunda.**
- Apex (sivri uç) **sol-anterior-aşağı** doğru bakar.
- Base (taban) sağ-posterior-yukarı.
- Hizalama: 2-5. ICS arasında, vertikal merkez ≈ 4. ICS = y 0.50–0.52.

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x | **−0.02 ile −0.04** | Orta hattın hafif solu. Negatif olmalı (apex sol için pozitif değer kayar) |
| y | 0.48 ile 0.55 | 4-5. ICS merkez |
| z | 0.04 ile 0.10 | Sternum arkası, anterior orta |

**Dextrocardia istisnası:** Eğer senaryo dextrocardia ise (`senaryo.id` kontrolü) x > 0 doğrudur. Default değil!

### Rotation
- Anatomik orientation: apex sol-aşağı-anterior
- Sketchfab model "natural" pozisyonda gelir (kalp apex aşağı, anterior bakış)
- Çoğu zaman `rotation = [0, 0, 0]` çalışır
- Apex eğimi için: `rotation_z ≈ −15° ila −30°` (sol tarafa yatık)

### Scale
- Gerçek kalp ≈ 12 cm yükseklik, 8 cm en
- Sketchfab "1 unit = 1 m" modelinde scale ≈ 0.05–0.08
- Sketchfab "1 unit = 10 cm" modelinde scale ≈ 0.6 (lungs.glb ile aynı raw birim)

### Animation
- `animationKind: "pulse"` → tüm grup-level scale, HR/60 Hz, ±%8

### Kullanıcı export örneği (referans)
```ts
heart: {
  ...DEFAULT_ORGAN_CONFIGS.heart,
  scale: 0.051,
  position: [-0.025, 0.515, 0.07],  // x NEGATIF! (sol mediastinum)
  rotation: [0, 0, -0.26],           // ~15° sol eğim (radyan)
  visible: true
}
```

⚠ Eğer pozisyon x > 0 ise YANLIŞ — dextrocardia haricinde reddet.

## Akciğer (lungs.glb — çift mesh tek dosya)

### Anatomik konum
- İki akciğer + trakea/larynx tek mesh halinde. Sol akciğer kalp notch nedeniyle sağdan ufak.
- Mediastinum yan tarafları, kalbi kuşatır.
- Apex clavicula seviyesi (y ≈ 0.62), base diafragma (y ≈ 0.45).

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x | **0 (orta)** | Çift-akciğer tek mesh → orta yerleştir |
| y | 0.42 ile 0.55 | Akciğer merkez (apex 0.60, base 0.42) |
| z | 0.02 ile 0.10 | Anterior + lateral chest |

### Rotation
- Sketchfab akciğer modelleri genelde "anterior dik" hazırlanır
- Trakea üstte (lokal Y+) — modelin "üst" kısmı

### Secondary rotation (trakea/larynx ayrı)

⭐ **`OrganModel.secondaryRotation` + `splitRatio: 0.80`** kullan. Üst %20 (trakea + larynx) ayrı rotate edilir, pivot lokal AABB cutoff Y'sinde.

- Trakea anatomik olarak vertikal (boyuna doğru) ve hafifçe sağa eğilir (sağ ana bronş daha dik, sol daha yatay)
- `secondaryRotation` ile trakea posteriora doğru hafif eğilebilir (vertebra hizası)
- Default: `[0, 0, 0]` (modelin orijinal trakea yönü)
- Anatomik düzeltme: tipik olarak `rotation_x ≈ −5° ila +10°` küçük

### Scale
- Sketchfab modeli "boylu" olabilir — gerçek akciğer ~25 cm
- Kullanıcı testinde scale 0.6–0.71 civarı çalışıyor (lungs.glb için)

### Animation
- `animationKind: "breathe"` → MESH-level scale, alt %80 (parenkima) RR/60 Hz, ±%6
- Trakea/larynx (üst %20) sabit kalır (anatomik olarak hava yolu pulsate etmez)

### Kullanıcı export örneği
```ts
lungs: {
  ...DEFAULT_ORGAN_CONFIGS.lungs,
  scale: 0.705,
  position: [0.0, 0.45, 0.115],
  rotation: [0, 0, 0],
  secondaryRotation: [0, 0, 0],     // trakea düz
  visible: true
}
```

⚠ Eğer trakea boyun seviyesini aşıp baş hizasına çıkıyorsa `scale` çok büyük veya `splitRatio` ayarlanmalı.

## Karaciğer (liver.glb)

### Anatomik konum — **RUQ (sağ üst karın)** sıkı kuralı
- Diafragma altı, **sağ** hemiabdomen
- Büyük lobe (lobus dexter) sağda, küçük lobe (lobus sinister) ortayı geçip hafif sola uzanır
- Üst sınır: 5. ICS hizası diafragma kubbesi
- Alt sınır: kostal kenar (RUQ palpasyonda hassas)

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x | **+0.05 ile +0.12** | RUQ — anatomik SAĞ — **KESİNLİKLE POZİTİF** |
| y | 0.36 ile 0.48 | Xiphoid altından umbilicus üzerine |
| z | 0.02 ile 0.07 | Anterior + biraz derin |

⚠ **x < 0 = mide veya dalak pozisyonu (LUQ). Karaciğer ASLA orada değil.** Bu en sık hata.

### Rotation
- Karaciğer anatomik olarak sağ subdiafragmatik yatay (kostal kenara paralel)
- Sketchfab modelleri genelde "frontal" hazırlanmış — direkt yerleştirildiğinde **yan yatık** görünebilir
- Karakteristik karaciğer orientation için `rotation_y ≈ −90° ila −60°` deneyin (kullanıcı testinde [-0.297, -1.484, -0.593] = (-17°, -85°, -34°) çalışıyor)
- Y ekseni etrafında ~90° dönüş + hafif X/Z fine-tune

### Scale
- Gerçek karaciğer ~22 cm en, 15 cm derinlik
- Sketchfab modelinde scale ≈ 0.10–0.50 (modele bağlı)

### Animation
- `animationKind: "none"` (karaciğer pulsate etmez)

### Kullanıcı export örneği
```ts
liver: {
  ...DEFAULT_ORGAN_CONFIGS.liver,
  scale: 0.475,
  position: [+0.080, 0.420, 0.050],  // x POZITIF! (RUQ)
  rotation: [-0.297, -1.484, -0.593],
  visible: true
}
```

⚠ Eğer position x negatifse YANLIŞ TARAF — düzelt.

## Mide (stomach.glb — planlı)

### Anatomik konum
- **LUQ (sol üst karın)**, epigastrium altı, sol diafragma altı
- Curvatura major (büyük eğri) aşağı-sola
- Pylorus → duodenum sağ tarafa, midline'ı geçer

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x | **−0.04 ile −0.08** | LUQ — anatomik SOL |
| y | 0.38 ile 0.45 | Xiphoid altı |
| z | 0.03 ile 0.06 | Karın anterior orta |

### Rotation
- Modelde mide genelde "frontal yatay" — anatomik yerleşim için Z ekseni etrafında küçük dönüş

## Dalak (spleen.glb — planlı)

### Anatomik konum
- **LUQ lateral**, sol kostal kenar altı (9-11. kosta)
- Diyaframa altı, midaxillary hatta yakın

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x | **−0.10 ile −0.14** | LUQ lateral — anatomik SOL |
| y | 0.40 ile 0.48 | Sol kostal kenar |
| z | 0.02 ile 0.06 | Karın anterolateral |

## Böbrekler (kidneys.glb — planlı)

### Anatomik konum
- **Retroperitoneal** — vertebra hizasında, anterior değil
- Sağ böbrek (x ≈ +0.06) hafif aşağı (karaciğer baskısı)
- Sol böbrek (x ≈ −0.06) hafif yukarı
- Üst sınır 11-12. kosta, alt sınır L3 vertebra

### World koordinat aralığı

| Eksen | Aralık | Not |
|---|---|---|
| x_right | +0.05 ile +0.08 | Sağ böbrek |
| x_left | −0.05 ile −0.08 | Sol böbrek |
| y | 0.38 ile 0.48 | Lumbar lateral |
| z | **−0.03 ile +0.02** | **Retroperitoneal — Z DÜŞÜK!** Anterior değil |

⚠ Böbrekler için z = 0.05+ vermek anatomik olarak YANLIŞ — onlar arkada (retroperitoneal).

## Sketchfab indirme → MediSim entegrasyon pipeline

İndirilen `<organ>.glb`'yi `OrganDevPanel` ile ayarlama akışı:

1. `public/3d/organs/<organ>.glb`'ye koy
2. `IndividualOrgans.tsx` `DEFAULT_ORGAN_CONFIGS`'a ekle: ilk değer için yukarıdaki anatomik aralık ortasından bir tahmin
3. Tarayıcıda `/dialog-3d-demo?dev=1` aç, OrganDevPanel'i kullan:
   - Cilt kesim slider ≤ 0.45 → organ tam görünür
   - Scale slider'la model boyut tahminini düzelt
   - X/Y/Z position slider'la anatomik konuma kaydır
   - Rotation slider'la modelin yan-yatıklığını düzelt
4. **6-view sanity:** A/P/R/L/S/I butonları ile her açıdan bak — sol-sağ tutarlı mı?
5. JSON Export → `DEFAULT_ORGAN_CONFIGS`'a yapıştır → override sıfırla

## Hangi Sketchfab modeli orientation'da gelir?

Genel olarak Sketchfab anatomik modeller +Y up, anterior bakış konvansiyonunda export edilir. Ama:

- **Eski modeller** (2017 öncesi) Z-up olabilir — `rotation = [-π/2, 0, 0]` (=−90° X) gerek
- **Karaciğer / dalak** gibi yatay organlar genelde "yatık" indirilir — Y etrafında 60-90° dönüş gerek
- **Tek mesh çift akciğer** modellerde trakea boyuna doğru yukarı uzanır (model +Y) — bu doğru
- Pozitif kontrol: model üst sınırı (lokal Y_max) anatomik üste mi denk geliyor?

`OrganDevPanel`'in rotation slider'larıyla bunu kalibre etmek 1-2 dakika sürer; tahmin yapma, slider kullan.
