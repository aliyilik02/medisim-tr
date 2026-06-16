# Oskültasyon Ses Dosyaları — Lisans ve Atıf

Bu klasördeki ses dosyalarının kaynak ve lisans bilgileri.
Yeni ses eklerken bu dosyaya da bir bölüm ekleyin.

---

## lung_wheeze.ogg

**Eser:** "Wheeze respirations"
**Kaynak:** https://commons.wikimedia.org/wiki/File:Wheeze2O.ogg
**Yazar:** James Heilman, MD (Jmh649)
**Lisans:** Dual: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) + GFDL v1.2+
**Format:** Ogg Vorbis, 8.5 saniye, 51 KB
**İçerik:** Wheeze (hışıltı) tipi solunum sesi

**Atıf metni:**
> This work is based on "Wheeze2O" by James Heilman, MD (https://commons.wikimedia.org/wiki/File:Wheeze2O.ogg), licensed under CC BY-SA 3.0.

---

## lung_crackles.ogg

**Eser:** "Crackles in pneumonia"
**Kaynak:** https://commons.wikimedia.org/wiki/File:Crackles_pneumoniaO.ogg
**Yazar:** James Heilman, MD (Jmh649)
**Lisans:** Dual: [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/) + GFDL v1.2+
**Format:** Ogg Vorbis, 14 saniye, 79 KB
**İçerik:** Pnömonide raller (crackles), stetoskop ile dinleme

**Atıf metni:**
> This work is based on "Crackles pneumoniaO" by James Heilman, MD (https://commons.wikimedia.org/wiki/File:Crackles_pneumoniaO.ogg), licensed under CC BY-SA 3.0.

---

## heart_normal.ogg

**Eser:** "Heartbeat"
**Kaynak:** https://commons.wikimedia.org/wiki/File:Heartbeat.ogg
**Lisans:** Creative Commons (lisans dosya sayfasında belirtilir; tipik olarak CC BY-SA veya CC0)
**Format:** Ogg Vorbis, 22 saniye
**İçerik:** Normal kalp atışı (S1+S2)

**Atıf metni:**
> Heart sound from Wikimedia Commons "Heartbeat.ogg" (https://commons.wikimedia.org/wiki/File:Heartbeat.ogg).

---

## heart_61bpm.ogg

**Eser:** "Human heart beating at 61 bpm"
**Kaynak:** https://commons.wikimedia.org/wiki/File:Human_heart_beating_at_61_bpm_(Cc-by-3.0).ogg
**Lisans:** [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/)
**Format:** Ogg Vorbis, 14 saniye
**İçerik:** Dinlenme nabız hızında normal kalp atışı (S1+S2, 61 bpm)

**Atıf metni:**
> Heart sound "Human heart beating at 61 bpm" from Wikimedia Commons (https://commons.wikimedia.org/wiki/File:Human_heart_beating_at_61_bpm_(Cc-by-3.0).ogg), licensed under CC BY 3.0.

---

## Genel Notlar

- Tüm sesler **eğitim amaçlı** kullanılır, gerçek hasta verisi DEĞİL.
- Uygulamanın görünür bir yerinde (debrief, hakkında veya `/3d-demo` sayfası altında) atıf metni gösterilmeli (CC BY-SA gereği).
- Yeni ses eklerken **CC BY veya CC BY-SA tercih edilir**; NC (NonCommercial) lisanslı seslerden uzak durun (ticari kullanım engellenir).
- Format tercihi: **.ogg** (Wikimedia standart, browser yaygın destek). MP3/WAV fallback opsiyonel.

## Kategoriler

- **Solunum (lung):** wheeze, crackles, raller, ronkus, normal, stridor (eklenecek)
- **Kalp (heart):** S1, S2, S3, S4, sistolik üfürüm, diyastolik üfürüm, normal sinus (eklenecek)
- **Bağırsak (bowel):** hiperaktif, hipoaktif, normal (eklenecek)

## Faz-senkron kalp sesi — bekleyen dosyalar (16 Haz 2026)

STEMI faz-senkron sistemi `HeartSound` tipini `.ogg`'a eşler
(`auscultationAudio.ts` → `HEART_SOUND_FILE`). Eksik sesler şimdilik mevcut
`heart_61bpm.ogg`'a (placeholder) düşürülür — sessiz fail değil, ama klinik
olarak doğru değil. Eklenecek (lisanslı CC BY/BY-SA kaynak, AYRI iş):

- **heart_s3_gallop.ogg** — S3 gallop (pompa yetmezliği, kardiyojenik şok fazı)
- **heart_muffled.ogg** — köreltilmiş/derinden kalp sesi (düşük debi, kötüleşen şok)

Dosyalar eklendiğinde `HEART_SOUND_FILE` tablosundaki `s3_gallop`/`muffled`
değerlerini güncelle. `silent` (arrest) bilinçli ses çalmaz.
