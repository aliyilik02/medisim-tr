# 3D Model Lisans ve Atıf

Bu dosya `public/3d/` altındaki 3D varlıkların kaynağını ve lisansını belgeler.
Yeni model eklerken bu dosyaya da bir bölüm ekleyin.

---

## Önerilen CC BY tek tek organ kaynakları (planlı)

Z-Anatomy Splanchnology mesh'i generic ("Default", "Organ" gibi) — kalp/karaciğer/mide ayrımı belirsiz. Yarın yerine geçecek tek tek model adayları (her biri CC BY, ticari kullanım izinli, atıf yeterli):

### Kalp (heart.glb)
- **Sketchfab — "Anatomy of the Heart" by Nicolae Berbece** (CC BY 4.0)  
  https://sketchfab.com/3d-models/anatomy-of-the-heart-c8d75f31fdfc4ada925ab14d3ea3fb14
- **BodyParts3D — FMA7088 Heart** (CC BY-SA 2.1 JP)  
  https://lifesciencedb.jp/bp3d/?lng=en

### Akciğer (lungs.glb)
- **Sketchfab — "Lungs" by Hassan Tahir** (CC BY 4.0)  
  https://sketchfab.com/3d-models/lungs-2cb98d3eeaff48e2b6f8f5e8c2ec9f8e
- **BodyParts3D — FMA7195 Lung** + **FMA7393 Bronchial tree**

### Karaciğer (liver.glb)
- **Sketchfab — "Liver" by Anatomy 3D** (CC BY 4.0)
- **BodyParts3D — FMA7197 Liver**

### Mide (stomach.glb)
- **BodyParts3D — FMA7148 Stomach**

### Böbrek (kidneys.glb)
- **BodyParts3D — FMA7203 Kidney**

### Pipeline (asset hazır olunca)
1. İndir `.glb` veya `.gltf+bin` paketi → `@gltf-transform/cli optimize` ile sıkıştır
2. `public/3d/organs/<organ>.glb` altına koy
3. `OrganModel` component'ini `<OrganModel url="/3d/organs/heart.glb" ... />` şeklinde kullan
4. Bu dosyaya ayrı bir bölüm ekleyip atıf metnini yaz
5. `MediaAttributions.tsx` ATTRIBUTIONS dizisine eklemeyi unutma

**Lisans tercihi:** CC BY 4.0 > CC BY 3.0 > CC BY-SA 4.0 (ShareAlike viral, dikkat). CC BY-NC asla kullanma — ticari kullanım engellenir.

---

## anatomy-internal.glb (Sprint B.4 — iç organlar)

**Eser:** "Splanchnology" (iç organ sistemi — TA2-2019 etiketli)
**Kaynak:** https://sketchfab.com/3d-models/splanchnology-5cfafb312f504815aa3fec55735607a6
**Yazar:** Z-Anatomy — https://sketchfab.com/Z-Anatomy
**Lisans:** [CC BY-SA 4.0](http://creativecommons.org/licenses/by-sa/4.0/) (**Attribution-ShareAlike** — viral!)
**Köken:** BodyParts3D (Kousaku Okubo, Database Center for Life Science, Japan)
**Eklenme tarihi:** 2026-05-20 (Sprint B.4)

### Atıf metni (uygulamada görünür yere ekle)

> This work is based on "Splanchnology" (https://sketchfab.com/3d-models/splanchnology-5cfafb312f504815aa3fec55735607a6) by Z-Anatomy (https://sketchfab.com/Z-Anatomy) licensed under CC BY-SA 4.0. Derivative based on BodyParts3D (DBCLS Japan).

### ⚠️ CC BY-SA viral lisans uyarısı

- Türetilmiş eserler **aynı CC BY-SA 4.0 lisansla** dağıtılmalı.
- **SaaS hizmet "yayın" sayılırsa** türetilmiş model paylaşım yükümlülüğü doğar.
- **Hukuki gri alan** — ürün lansmanı öncesi hukuk danışmanı onayı şart.
- Master rapor Bölüm 10 (Telif/IP) referansı.

### Teknik bilgi

- Format: glTF 2.0 binary (`.glb`)
- Boyut: **3.55 MB** (optimize sonrası)
- Orijinal: 49.93 MB scene.gltf + scene.bin (1M unique vertex, 2M triangle)
- Optimize: `gltf-transform optimize --simplify-ratio 0.05` (95% azaltma) +
  `dedup + weld + meshopt compress` → **~100k vertex**
- Raw bbox: x[-0.33, 0.33], y[0.009, 1.705], z[-0.11, 0.14]
- Wrapper transform (`InternalOrgans.tsx`): scale 0.602 + yOffset -0.249 →
  patient-v2 world bbox y[-0.243, 0.778] ile aligned
- Material'lar (specular-glossiness extension): Lung, Bronchi, Heart (Default),
  Intestine, Liver, Stomach, Spleen, Cartilage, Ductus, Gland, Ligament,
  Mucosa, Muscles, Bone

### Animasyonlar

- **Kalp pulsate:** HR/60 Hz, ±%8 scale (`material.name` "Heart"/"Default" + vertex>30k)
- **Akciğer breathing:** RR/60 Hz, ±%5 scale (`material.name` "Lung")
- D.1 Pulse Engine sonrası gerçek BPM/RR'a bağlanacak.

### Kaynak klasör

`public/3d/splanchnology-source/` (gitignore'da — repo'ya commit edilmez).

---

## patient-v1.glb

**Eser:** "Male Torso"
**Kaynak:** https://sketchfab.com/3d-models/male-torso-985d5535b408409f987841da4eba32ad
**Yazar:** MaceLogice — https://sketchfab.com/MaceLogice
**Lisans:** [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
**Atıf gereksinimi:** Yazar kredilendirilmeli. Ticari kullanım izinlidir.
**Eklenme tarihi:** 2026-05-16 (Sprint B.1)

### Atıf metni

> This work is based on "Male Torso" (https://sketchfab.com/3d-models/male-torso-985d5535b408409f987841da4eba32ad) by MaceLogice (https://sketchfab.com/MaceLogice) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

Bu metin uygulamanın görünür bir yerinde (debrief, hakkında veya 3D demo sayfası
altında) gösterilmelidir.

### Teknik bilgi

- Format: glTF 2.0 binary (`.glb`)
- Boyut: 1.07 MB
- Vertex: 22.879
- Triangle: 45.754
- Material: tek `MeshStandardMaterial` (runtime'da uniform ten tonuna ayarlanıyor —
  bkz. `AnatomicPatientModel.tsx`)
- Animation/skeleton: yok
- Bounding box: x[-0.319, 0.319], y[-0.240, 0.780], z[-0.222, 0.096]

### Değişiklikler

- Sketchfab indirme klasöründeki `scene.gltf` + `scene.bin` `@gltf-transform/cli copy`
  ile tek `.glb` dosyasına birleştirildi.
- Runtime'da `MeshStandardMaterial` ile yeniden materyallendirildi (orijinal
  `KHR_materials_specular` extension'ı parlak görünüyordu). Geometri değiştirilmedi.

---

## patient-v2.glb

**Eser:** "Male full body anatomy"
**Kaynak:** https://sketchfab.com/3d-models/male-full-body-anatomy-1688cedcfb3b4f3ea7a03e3a3e34bdd8
**Yazar:** chuma6oy — https://sketchfab.com/chuma6oy
**Lisans:** [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
**Atıf gereksinimi:** Yazar kredilendirilmeli. Ticari kullanım izinlidir.
**Eklenme tarihi:** 2026-05-17 (Sprint B.2.3)

### Atıf metni

> This work is based on "Male full body anatomy" (https://sketchfab.com/3d-models/male-full-body-anatomy-1688cedcfb3b4f3ea7a03e3a3e34bdd8) by chuma6oy (https://sketchfab.com/chuma6oy) licensed under CC-BY-4.0 (http://creativecommons.org/licenses/by/4.0/)

### Teknik bilgi

- Format: glTF 2.0 binary (`.glb`)
- Boyut: 1.33 MB
- Vertex: ~154.431 (orijinal 966.4k'dan @gltf-transform `simplify --ratio 0.15` ile %85 azaltıldı)
- Triangle: ~290k
- Material: tek `material_0` → runtime'da `MeshStandardMaterial` ile yeniden uygulanıyor
- Animation/skeleton: yok
- Raw bounding box: x[-1.88, 1.88], y[-6.84, 2.69], z[-0.76, 0.79]
- Wrapper transform (AnatomicPatientModel.tsx): scale 0.107 + y+0.49 → world bbox ≈ v1 ile aynı

### Değişiklikler

- `@gltf-transform/cli optimize` pipeline: dedup → instance → palette → flatten → join → weld → simplify (ratio 0.15) → resample → prune → sparse → meshopt compress.
- 68.86 MB scene.gltf+bin → 1.33 MB tek `.glb` (EXT_meshopt_compression).
- Wrapper group transform ile v1 koordinat alanına çekildi (regions.ts ve breathing shader chest center uyumlu kalsın diye).
