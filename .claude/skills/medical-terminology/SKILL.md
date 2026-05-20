---
name: medical-terminology
description: Türkçe medikal terminoloji standartları — TDK Tıp Terimleri Sözlüğü, TAKAD anatomi sözlüğü, TA2-2019 Latince anatomik terimler. Senaryo metin yazımı, UI etiketleri, debrief içeriği üretirken bu skill'i kullan — keyfi/jenerik tercüme yapma.
---

# Medical Terminology — Türkçe Standart Referans

## Ne zaman kullan

- Senaryo başlık + açıklama yazımı
- UI etiket / buton metni (örn. "Stetoskop ile dinle", "Oksijen maskesi tak")
- Anatomik bölge adlandırması (`PatientRegion.label`)
- Debrief açıklamaları
- AI hasta diyaloğu prompt — hasta günlük dil, hekim klinik terim
- Çift dil etiket: `i18n.tr` ve `i18n.en` field'ları

## Birincil kaynaklar

| Kaynak | Konu | URL |
|---|---|---|
| **TDK Tıp Terimleri Sözlüğü** | Genel tıbbi terim TR | katalog.tdk.gov.tr |
| **TAKAD** (Türk Anatomi ve Klinik Anatomi Derneği, 1991) | Anatomik terim TR + Latin | anatomidernegi.org.tr |
| **Sekiz Dilde Anatomi Terimleri Sözlüğü** (Nobel Tıp, 2020) | TR + 7 dil çapraz | ISBN 9789754208542 |
| **TA2-2019** (Terminologia Anatomica 2nd ed., FIPAT/IFAA) | Latince anatomik standart | fipat.library.dal.ca/TA2/ |
| **Latince-Türkçe-Osmanlıca Anatomi Sözlüğü** (Z. Zeren, 1946) | Tarihsel referans | 1229 terim |

**Master:** `docs/MASTER-REPORT-v3.md` Bölüm 8 (TR medikal terminoloji) + 9.A (anatomik standartlar).

## Standart kısaltma tablosu (UI'da kullan)

| Kısaltma | Açılım TR | EN | Birim |
|---|---|---|---|
| **TA** | Tansiyon arteriyel | BP | mmHg |
| **NB** | Nabız | HR | /dk |
| **SS** | Solunum sayısı | RR | /dk |
| **SpO₂** | Periferik oksijen satürasyonu | SpO2 | % |
| **DSS** | Derin solunum sesleri | (clear lungs) | — |
| **KTA** | Kalp tepe atımı | PMI | — |
| **CRT** | Kapiller dolum zamanı | Capillary refill | sn |
| **GCS** | Glasgow Koma Skoru | Glasgow Coma Scale | 3-15 |
| **EtCO₂** | Soluk sonu CO₂ | EtCO2 | mmHg |
| **MAP** | Ortalama arter basıncı | Mean arterial pressure | mmHg |
| **CVP** | Santral venöz basınç | Central venous pressure | cmH₂O |
| **JVP** | Juguler venöz basınç | Jugular venous pressure | cm |

→ UI'da tercih: **TR + EN parantez** (örn. "Tansiyon (BP): 120/80").

## Türkçe-Latince anatomik bölge eşlemesi (sık kullanılanlar)

| TR | Latin (TA2) | İngilizce |
|---|---|---|
| Sternum (göğüs kemiği) | Sternum | Sternum / breastbone |
| Klavikula (köprücük kemiği) | Clavicula | Clavicle |
| Sternal açı | Angulus sterni | Sternal angle (of Louis) |
| Ksifoid | Processus xiphoideus | Xiphoid process |
| Göbek | Umbilicus | Umbilicus / navel |
| Kasık | Inguen / regio inguinalis | Groin |
| Kanat (iliak çıkıntı) | Spina iliaca anterior superior | ASIS |
| Diz kapağı | Patella | Patella / kneecap |
| Bilek | Carpus / articulatio radiocarpalis | Wrist |
| Atardamar | Arteria | Artery |
| Toplardamar | Vena | Vein |

→ Latin terim **bilim metni** (skill referansı, dokümantasyon), TR **UI** + **hasta diyaloğu**.

## Hasta ↔ Hekim dil katmanı

Aynı kavramı hasta günlük dilde, hekim klinik dilde söyler:

| Hekim klinik | Hasta günlük |
|---|---|
| "Dispnezi" | "Nefes alamıyorum / nefesim daralıyor" |
| "Sinkop" | "Bayıldım" |
| "Vertigo" | "Başım dönüyor" |
| "Diyaforez" | "Çok terliyorum" |
| "Hematemez" | "Kan kustum" |
| "Hemoptizi" | "Kanlı balgam" |
| "Hematokezya" | "Dışkımda kan" |
| "Melena" | "Siyah cıvık dışkı" |
| "Polidipsi" | "Çok su içiyorum" |
| "Poliüri" | "Sürekli işiyorum" |
| "Pirozis" | "Göğsümde yanma" |
| "Disfaji" | "Yutkunamıyorum" |
| "Konstipasyon" | "Kabızlık" |
| "Diyare" | "İshal" |
| "Pruritus" | "Kaşıntı" |
| "Anhedoni" | "Hiçbir şeyden zevk almıyorum" |

→ AI hasta diyalog prompt'unda: "tıp jargonu kullanma" + bu tabloyu kullanan örnekler.

## Senaryo metni dil kuralları

- **Senaryo başlık**: Hastayı (yaş + cinsiyet) + ana yakınmayı belirt. Örn. "24 Yaş Kadın — Kusma, Karın Ağrısı, Polipne (DKA)"
- **chief_complaint**: hasta günlük dilinde, max 1-2 cümle. Örn. "1 gündür kusuyorum, derin nefes alıyorum"
- **history_items**: klinik dilde + günlük açıklama karışık. Örn. "Tip 1 DM (10 yıl, insülin detemir + aspart)"
- **placeholderNote** (region): klinik dilde, "klinik review" sentinel eski (kaldırıldı)

## Gotchas

- ❌ Google Translate ile çevirme — TDK / TAKAD onaylı terim kullan
- ❌ "Heart attack" → "kalp krizi" (✅) ama "myocardial infarction" → "miyokard enfarktüsü" (klinik), kalp krizi yerine kullanma resmi metinlerde
- ❌ Anglicism ekleme: "abdomen" yerine "karın", "thorax" yerine "göğüs kafesi"
- ❌ Latince çoğul + TR ek: "venalar" YANLIŞ, "venler" YANLIŞ → "venalar" (Latin çoğul + TR çoğul kullanma)
- ❌ Karışık dilli kısaltma: "Acil Department" YANLIŞ → "Acil Servis" (TR) veya "ED" (EN tam)
- ✅ İlk geçişte TR + parantez içinde Latin/EN: "Sternal açı (angulus sterni)"
- ✅ Sonraki geçişlerde kısaltma: TA, NB, SS, SpO₂...
- ✅ Anatomik isim Latince çekim TA2'ye uygun (n. plural, e/i singular vs)

## Slash komut / linter entegrasyonu

Gelecek: `medical-terminology` skill'e otomatik linter (yanlış terim → öneri). Şimdilik manuel kontrol.

## Referans dosyalar

- `memory/medisim_anatomi_klinik.md` — anatomik bölge + organ listesi
- `docs/MASTER-REPORT-v3.md` Bölüm 8 + 9.A
- Senaryo örnekleri: `src/data/scenarios/dka.ts` (iyi TR dili örneği)
