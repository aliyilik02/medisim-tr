# 3D Model Lisans ve Atıf

Bu dosya `public/3d/` altındaki 3D varlıkların kaynağını ve lisansını belgeler.
Yeni model eklerken bu dosyaya da bir bölüm ekleyin.

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
