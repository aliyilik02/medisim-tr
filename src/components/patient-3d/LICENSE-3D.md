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
