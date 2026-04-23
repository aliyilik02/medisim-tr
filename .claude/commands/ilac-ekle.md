---
description: İlaç kataloğuna yeni ilaç ekler (iki dosyaya da)
argument-hint: <ilac-id>
---

Yeni ilaç ekle: **$ARGUMENTS**

## Kritik kural — İKİ DOSYAYA DA EKLE

İlaç kataloğu iki dosyaya bölünmüş:
- `src/data/medications.ts` — UI kimliği (Medication tipi)
- `src/data/medications-extended.ts` — farmakoloji motoru verisi (ExtendedMedication)

Eşleşme `id` alanı üzerinden. Birine ekleyip diğerine eklemezsen motor çöker.

## Adımlar

1. **Klinik veriyi doğrula** — güvenilir kaynak (ESC, AHA, TKD, UpToDate, Katzung). Özellikle:
   - Doz aralığı (default + alt/üst sınır)
   - Kontrendikasyonlar (mutlak + göreceli)
   - Etkileşimler
   - Gebelik kategorisi
   - Böbrek/karaciğer yetmezliğinde doz ayarı

2. **`medications.ts`'e temel kayıt ekle:**
   - id, ad, kategori, default_dose, dose_unit, route

3. **`medications-extended.ts`'e farmakoloji verisi ekle:**
   - **Preset seç** — `src/engine/pharmacology/presets.ts`'den uygun olan varsa kullan (`sempatomimetik-guclu`, `beta-bloker`, `nitrat` vb.). Yoksa manuel tanımla.
   - **Doz band** — varsayılan %80-120, ilaca özel dar band gerekliyse ayarla (örn. digoksin %90-110)
   - **Modifier'lar** — beta_blocker, karaciger_yetm, bobrek_yetm, gebelik, yaşlı için çarpanlar
   - **Kontrendikasyon listesi** — severity seç: `uyari` / `orta` / `kritik`
     - Kritik için `grace_sec` ve varsa antidot öner

4. **Commit mesajına referans kaynağı yaz:**
   ```
   feat: $ARGUMENTS ilaç kataloğuna eklendi (ESC 2023 ref.)
   ```

5. **Emin değilsen DURMA-SOR** — doğaçlama yapma, kullanıcıya danış.

Son olarak Türkçe 2 cümleyle raporla: hangi preset kullandın, hangi kritik kontrendikasyonlar var.
