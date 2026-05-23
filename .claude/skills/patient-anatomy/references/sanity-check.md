# Sanity Check — 6-view doğrulama protokolü + tipik yanılgılar

Pozisyon önermeden önce bu checklist'i koş. Görsel paylaşılmışsa, ekrandan ne göründüğü ile beklentinin eşleştiğini doğrula.

## Önce koordinat checklist (her marker/organ için)

```
[ ] Anatomik tarafı belirledim mi? (sağ / sol / orta)
[ ] x işareti tarafa uygun mu? (sağ → +, sol → −, orta → 0)
[ ] y bbox içinde mi? [-0.243, 0.778]
[ ] Gövde landmark'ı ise torsoY() uygulandı mı?
[ ] z bölge tipine uygun mu? (anterior göğüs 0.13, boyun 0.09, sırt -0.08)
[ ] Bbox sınırını aşmıyor mu? x ∈ [-0.20, 0.20]
[ ] Çakışan başka marker/organ var mı?
```

## 6-view sanity — koordinat hesaplandıktan sonra zihinde simüle et

Her organ/marker için en az 3 view'de "ne görünmeli?" diye sor:

### View A — Anterior
- Ekran SAĞ = anatomik sol (−X). Kalp, dalak, mide BURADA görünmeli.
- Ekran SOL = anatomik sağ (+X). Karaciğer, sağ akciğer, sağ böbrek BURADA.
- Orta hat (x=0) ortada — sternum, ağız, umbilicus, suprapubic.

### View P — Posterior
- Ekran SAĞ = **anatomik sağ (+X)**. Karaciğer BURADA görünmeli (anterior'a göre AYNA).
- Ekran SOL = anatomik sol (−X). Kalp BURADA.
- Anterior organlar/marker'lar gövde içinden seçilebilir (transparency).

### View R — Right lateral
- Ekran SAĞ = posterior (−Z). Sırt tarafı.
- Ekran SOL = anterior (+Z). Göğüs.
- Kameraya yakın = anatomik sağ (+X). Sağ organlar BURADA önde.

### View L — Left lateral
- Ekran SAĞ = anterior (+Z).
- Ekran SOL = posterior (−Z).
- Kameraya yakın = anatomik sol (−X). Kalp, sol akciğer önde.

### View S — Superior (üstten)
- Ekran SAĞ = anatomik sağ (+X). Tepedeen bakış.
- Ekran YUKARI = posterior (−Z).
- Anterior + sol = ekran sol-alt.

### View I — Inferior (alttan)
- Ekran SAĞ = anatomik sağ (+X) (tersine, ayaktan bakış)
- Ekran YUKARI = anterior (+Z).

## Tipik yanılgı pattern'leri — görsel screenshot okuma

Kullanıcı screenshot paylaşırsa veya "yanlış görünüyor" derse, bu pattern'leri kontrol et:

### 1. Karaciğer yanlış tarafta

**Belirti:** Karaciğer mid-line'da veya solda görünüyor. Anterior view'de ekranın SAĞ yarısında belirtiyor.

**Sebep:** `position[0]` (x) negatif veya küçük. Anatomik olarak RUQ → x > +0.05 olmalı.

**Düzeltme:** `DEFAULT_ORGAN_CONFIGS.liver.position[0]` pozitif yap (+0.05 ile +0.12 arası).

### 2. Kalp sağ tarafta görünüyor

**Belirti:** Anterior view'de kalp ekranın SOL yarısında, ya da posterior view'de ekranın SAĞ yarısında.

**Sebep:** `position[0]` pozitif (anatomik sağ tarafa kaymış).

**Düzeltme:** `position[0]` negatif olmalı (−0.02 ile −0.04). Dextrocardia istisnası varsa senaryoyu kontrol et.

### 3. Akciğer trakeası boyna kadar uzanıyor

**Belirti:** Yan veya anterior view'de trakea modeli baş seviyesine kadar çıkmış, inhalasyonda yukarı-aşağı şişiyor.

**Sebep:**
- Scale çok büyük → tüm akciğer modeli baş seviyesine ulaşıyor
- VEYA `secondaryRotation` kullanılmıyor → tüm scene breathe animasyonunda şişiyor

**Düzeltme:**
- `OrganModel`'a `secondaryRotation` parametresi eklenmiş mi? (alt %80 parenkima scale, üst %20 trakea sabit)
- Scale küçült (örn. 0.7 → 0.6)
- `position[1]` hafif aşağı kaydır
- Anatomik referans: trakea üst sınırı boyun ortası (y ≈ 0.62), akciğer apex clavicula (y ≈ 0.60), parenkima merkez (y ≈ 0.50)

### 4. Marker boyun veya yüzde havada uçuyor

**Belirti:** Karotis veya yüz marker'ı yan view'de gövde yüzeyinden 3-5 cm uzakta görünüyor.

**Sebep:** Z değeri göğüs/karın surface (z=0.135) için ayarlanmış ama boyun surface daha geride (z ≈ 0.06).

**Düzeltme:** Boyun marker'ı için z = 0.08–0.10. Yüz için z = 0.11.

### 5. Marker gövdenin içinde / sırt marker'ı görünmüyor

**Belirti:** Posterior view'de sırt marker'ı görünmüyor; anterior view'de gövde yüzeyinin altında bir yerde.

**Sebep:** Posterior marker için z pozitif kalmış (anterior tarafa düşmüş).

**Düzeltme:** Sırt için z = −0.10 ile −0.08 (negatif), `side: "posterior"` flag.

### 6. Organ pivot yanlış (rotation aplikasyonu yan tarafa savuruyor)

**Belirti:** Rotation slider'ı kıpırdattığında organ döner ama dönüş merkezi modelin uzağında — organ yan tarafa savruluyor.

**Sebep:** `OrganModel` `rotation` prop'u group orijinden döndürür. Model orijini (lokal 0,0,0) anatomik pivot değilse uzağa savrulur.

**Düzeltme:**
- Model gltf-transform ile re-pivot edilebilir (yorucu)
- Veya position'ı rotation sonrası adjust et — slider'la ince ayar
- `secondaryRotation` kullanıyorsan üst grup pivot lokal AABB cutoff Y'sinde; bu zaten doğru pivot

### 7. Yan view'de marker gövdeden uzakta görünüyor

**Belirti:** Sağ lateral view'de göğüs marker'ı ("aortic" gibi) gövdenin önünde havada görünüyor.

**Sebep:** Bu beklenen bir görünüm — markerlar anterior z = 0.13'te sabit. Yan view'de bu pozisyon gövdenin "ön" tarafında çıkıyor.

**Doğrulama:** Eğer marker z = 0.13 ve gövde anterior yüzeyi z = 0.085 ise marker 4.5 cm önde — bu doğru. Eğer z = 0.20+ ise gerçekten fazla uzak; düzelt.

### 8. Posterior view'de kalp net görünüyor

**Belirti:** Posterior butonuna tıklandığında kalp arka taraftan tam görünüyor (transparency üzerinden).

**Sebep:**
- `AnatomicPatientModel` `transparent: true` + `opacity 0.92` (skin clip aktifken). Bu beklenen.
- Kalp posterior view'de ortada görünüyorsa muhtemelen pozisyon DOĞRU. Sorun yok.
- Ama kalp POSTERIOR'da BÜYÜK görünüyorsa scale çok büyük olabilir.

**Doğrulama:** Kalp tam ekran kaplıyorsa scale küçük; orta üst gövdede şeftali boyu görünüyorsa OK.

## Posterior view'de sol-sağ ayna — pratik test

Kullanıcı "şu sayı yanlış görünüyor" derse:

1. Hangi view? (A/P/R/L)
2. Ekrandaki konum ne? (sağ üst, sol alt vs.)
3. Yukarıdaki view-by-view tabloyu (world-axes.md) uygula
4. **Posterior view ekran sağ → +X** olduğunu HATIRLA — anterior view'in tersine

## Visual regression — sayı + screenshot teyidi

Önemli pozisyon değişiklikleri sonrası `medisim-3d-vision-test` skill'i ile preview MCP üzerinden:

```
1. Preview server reload
2. /dialog-3d-demo?dev=1 aç
3. Cilt kesim slider'ını 0.30 yap
4. Her A/P/R/L view butonuna tıkla
5. Sahnenin readPixels/getImageData ile renk-örneği al
6. Kullanıcıya öneri ile birlikte sayısal eşik bildir
```

Test detayı için `medisim-3d-vision-test/SKILL.md` referansı.

## Quick lookup — sol mu sağ mı?

Bir organın hangi tarafta olduğunu unuttuysan:

| Organ | Taraf | x |
|---|---|---|
| Kalp | Sol (ortadan hafif sol) | − |
| Karaciğer | **SAĞ** | **+** |
| Dalak | Sol | − |
| Mide | Sol | − |
| Pankreas | Orta (hafif sol uzanır) | 0 / hafif − |
| Apendiks | **SAĞ** (RLQ) | **+** |
| Sigmoid kolon | Sol (LLQ) | − |
| Sağ böbrek | Sağ | + |
| Sol böbrek | Sol | − |
| Safra kesesi | Sağ (karaciğer altı) | + |

Eğer hala emin değilsen `docs/memory/medisim_anatomik_landmark.md` aç ve tablodan teyit et.
