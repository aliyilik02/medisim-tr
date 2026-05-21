# Marker Zones — bölge bazlı koordinat + Z surface tablosu

Bu dosya `regions.ts` `DEFAULT_REGIONS` ile birebir eşleşir. Her marker bölgesi için: anatomik tanım, world koordinatı, doğru Z surface, en sık yapılan hata.

`torsoY(y) = y + TORSO_Y_OFFSET` (TORSO_Y_OFFSET = -0.020, chuma6oy modeli kalibrasyonu).

## Marker Z surface — bölgeye göre değişir

Anatomik manken anterior surface z'si bölgeye göre değişir. **Tüm marker'a aynı z = 0.135 vermek YANLIŞ.**

| Bölge tipi | Yüzey z (anatomik) | Marker önerilen z | Sebep |
|---|---|---|---|
| Yüz (ağız) | ~0.080 | 0.110 | Yüz hizası anterior, ama burun çıkıntısı |
| Boyun (karotis, EJV) | ~0.060 | 0.080–0.105 | Boyun ince, anterior çıkıntı az |
| Göğüs anterior (sternum, ICS) | 0.085 | 0.130–0.140 | Standart gövde anterior |
| Karın anterior | 0.080 | 0.130–0.140 | Standart abdomen anterior |
| Aksilla / yan (axillary line) | x≈±0.12, z≈0 | düşük z | Lateral, anterior değil |
| Antecubital fossa | x≈±0.21, z varies | ufak | Kol pozisyonuna bağlı |
| Önkol / radial | x≈±0.22, y≈0.32, z≈0 | düşük | Kol yan |
| El üstü | x≈±0.24, y≈0.30, z≈0 | düşük | Kol distal |
| Sırt (posterior thorax) | z ≈ −0.06 | **−0.10 ila −0.08** | Posterior! Z negatif |
| Bel (lomber) | z ≈ −0.06 | −0.10 ila −0.08 | Posterior |
| Femoral (kasık) | x≈±0.06, y≈0.20 | 0.08–0.10 | Anterolateral kalça |
| Ayak üstü (dorsalis pedis) | y≈−0.20 | düşük | Ayak distal |

⚠ Yeni marker eklerken: önce surface z'sini tahmin et, sonra marker yarıçapı (~0.015–0.020) eklediğinden emin ol.

## Marker bölgeleri — anatomik tablo (mevcut DEFAULT_REGIONS)

### Baş / Boyun (3 marker)

| ID | Anatomik tanım | World (x, y, z) | Side | Tipik hata |
|---|---|---|---|---|
| `face-mouth` | Yüz / ağız (hava yolu) | (0, 0.666, 0.110) | anterior | – |
| `carotid-right` | Sağ a. carotis (SCM medial, suprasternal notch hizası) | (+0.030, 0.620, 0.105) | anterior | Z fazla → çene altında uçar; x işareti yanlış (anatomik sağ → +) |
| `carotid-left` | Sol a. carotis | (−0.030, 0.620, 0.105) | anterior | "Sol = +x" yanılgısı |

### Kardiyak APE-T-M (5 oskültasyon noktası)

| ID | ICS + lokalizasyon | World (x, y, z) | Side | Hata |
|---|---|---|---|---|
| `chest-aortic` | 2. ICS sağ sternal kenar | (+0.020, torsoY(0.574)=0.554, 0.135) | anterior | "Sağ" = +x; pulmoner sağda DEĞİL |
| `chest-pulmonic` | 2. ICS sol sternal kenar | (−0.020, 0.554, 0.135) | anterior | Pulmoner SOL'dadır |
| `chest-erb` | 3. ICS sol sternal kenar | (−0.020, 0.533, 0.135) | anterior | S1+S2 ikisi de duyulur |
| `chest-tricuspid` | 4. ICS sol alt sternal | (−0.025, 0.503, 0.135) | anterior | – |
| `chest-mitral` | 5. ICS sol midklavikular (apex) | (−0.085, 0.475, 0.135) | anterior | Apex SOL ve LATERAL — x büyük negatif |

### Akciğer dinleme (4 lob projeksiyonu — anterior)

| ID | Lob | World (x, y, z) | Side | Not |
|---|---|---|---|---|
| `lung-rul` | Sağ üst lob (RUL) | (+0.090, 0.560, 0.130) | anterior | 2-3. ICS midklavikular sağ |
| `lung-rml` | Sağ orta lob (RML) | (+0.090, 0.510, 0.130) | anterior | 4-5. ICS sağ (sadece sağda var, solda yok) |
| `lung-lul` | Sol üst lob (LUL) | (−0.090, 0.560, 0.130) | anterior | Sol akciğer üst lobu |
| `lung-lll` | Sol alt lob (LLL anterior projeksiyon) | (−0.090, 0.490, 0.130) | anterior | 5-6. ICS sol; posterior view'de y daha düşük |

⚠ **Lower lob'lar gerçekte posterior** — anterior view'den dinleme klinik olarak alt loba kısıtlı erişim verir. Senaryoda detay önemliyse `side: "posterior"` ve z < 0 ekstra marker'lar eklenebilir.

### Karın kadran palpasyonu (6 marker)

| ID | Kadran | World (x, y, z) | Side | Not |
|---|---|---|---|---|
| `abd-epigastric` | Epigastrium (orta üst) | (0, 0.431−0.020, 0.135) | anterior | Mide körpüsü, pankreas projeksiyon |
| `abd-umbilical` | Umbilikus | (0, 0.375, 0.135) | anterior | İnce bağırsak |
| `abd-ruq` | Sağ üst kadran (karaciğer) | (+0.080, 0.430, 0.135) | anterior | Karaciğer + safra kesesi palpasyon |
| `abd-luq` | Sol üst kadran (mide/dalak) | (−0.080, 0.430, 0.135) | anterior | Mide + dalak |
| `abd-rlq` | Sağ alt kadran (sekum/apendiks) | (+0.080, 0.340, 0.135) | anterior | McBurney noktası ≈ RLQ |
| `abd-llq` | Sol alt kadran (sigmoid) | (−0.080, 0.340, 0.135) | anterior | Sigmoid kolon |

### Periferik nabız (femoral, ayak)

| ID | Nabız | World (x, y, z) | Side | Not |
|---|---|---|---|---|
| `pulse-femoral-right` | Sağ femoral (kasık) | (+0.060, 0.200, 0.090) | anterior | A. femoralis, fossa iliaca |
| `pulse-femoral-left` | Sol femoral | (−0.060, 0.200, 0.090) | anterior | – |

### IV / vasküler erişim

| ID | Damar | World (x, y, z) | Side | Not |
|---|---|---|---|---|
| `iv-antecubital-right` | Sağ median cubital ven | (+0.21, 0.45, 0.05) | lateral | Kol pozisyonuna bağlı |
| `iv-antecubital-left` | Sol median cubital ven | (−0.21, 0.45, 0.05) | lateral | – |

## Marker side flag

`PatientRegion.side` üç değer alır: `"anterior" | "lateral" | "posterior"`.

- **anterior**: anterior view'den görünür, z > 0
- **lateral**: yan view'den iyi görünür, |x| büyük
- **posterior**: posterior view'den görünür, z < 0

`InspectionPanel` ve `RegionMarker` bu flag'i kullanır.

## Yeni marker eklerken zorunlu adımlar

1. Anatomik adı belirle (TR + TA2 Latince) — `medical-terminology` skill referansı
2. Anatomik sağ/sol/orta belirle → x işareti
3. Y oranını 8-head canon'dan al → `torsoY()` uygulanmalı mı? (gövde landmark için EVET)
4. Surface z'sini yukarıdaki tabloya bak
5. `side` flag'i ata
6. Auskültasyon noktasıysa `auscultationSoundId` ekle, ses dosyasını `public/sounds/auscultation/` altına koy
7. `regions.ts`'e ekle, `regions.test.ts` snapshot güncelle
8. Tarayıcıda `?dev=1` ile MarkerDevPanel aç, ince ayar yap
9. 6-view sanity (anterior + posterior + 1 lateral en az)
10. JSON Export → regions.ts'e sabitle, override sıfırla

## Çakışan marker tespiti

İki marker world koordinatı `|Δx|+|Δy|+|Δz| < 0.025` ise çakışır (~2.5cm), tıklama ayırt edilemez. Bu durumda:
- ID'leri ayır
- Veya pozisyonu hafif kaydır
- Veya bunlardan birini `side` farklı yap
