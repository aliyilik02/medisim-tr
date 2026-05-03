# Türk Klinik Kural Motoru

⚠️ **DİKKAT** — Bu dosyalardaki kurallar **DRAFT** durumdadır. Hiçbir kural otomatik olarak engine'e uygulanmaz, hiçbir test bu kuralları zorunlu kılmaz.

## Bayrak hiyerarşisi

```
DRAFT_NEEDS_REVIEW          → AI tarafından önerildi, klinik review bekliyor
REVIEWED_PENDING_ACTIVATION → İnsan review etti, manuel aktivasyon bekliyor
ACTIVE                      → Canlı; engine ve testler bunu zorunlu kılar
```

## Bir kuralı aktifleştirmek

1. JSON dosyasını aç, ilgili kuralı bul
2. `status` alanını `DRAFT_NEEDS_REVIEW` → `REVIEWED_PENDING_ACTIVATION` yap
3. `reviewed_by` ve `reviewed_at` doldur
4. **Kılavuz PDF'ini kontrol et** — kural metni doğru mu?
5. Senaryo davranışını test et — `validation.description` doğru mu?
6. `status` → `ACTIVE` yap
7. Engine entegrasyonu **ayrı bir PR** olarak hazırla

## Kural ekleme

Yeni kural eklemek için JSON'a manuel yaz veya AI'a "şu kuralı ekle" de — **otomatik aktifleştirme yok**. Gece mega paketi (2026-05-04) 10 kural ile sınırlı kaldı.

## AI tarafından önerilen 10 kural (2026-05-03 oturumu)

| ID | Kaynak | Konu |
|---|---|---|
| `tr-rsi-001` | TARD 2021 | RSI indüksiyon: Etomidat primer |
| `tr-rsi-002` | WALLS 2024 | Süks akut travmada güvenli |
| `tr-anaflaksi-001` | WAO 2020 | Refrakter glukagon BB öyküsünde |
| `tr-iskemik-inme-001` | BDHD 2024 | Tromboliz: Alteplaz/TNK eşit |
| `tr-preeklampsi-001` | ACOG-MFTP-TR 2024 | Antihipertansif: 3 ajan eşit |
| `tr-preeklampsi-002` | ACOG-MFTP-TR 2024 | Doğum: ≥34 hf endikasyon |
| `tr-stemi-001` | ESC 2017 | Ek derivasyon: V4R + V7-V9 |
| `tr-stemi-002` | ESC 2023 | Post-PCI şok: mekanik destek S4+ |
| `tr-apandisit-001` | WSES 2020 | Görüntüleme: USG + BT eşit |
| `tr-apandisit-002` | WSES 2020 | Komplike: laparoskopi devam |

Her biri 2026-05-03 oturumunda kullanıcı ile birlikte alındı; kılavuz referansı + senaryo davranışı belgelendi.

## Engine entegrasyonu (gelecek)

Bu kurallar şu an **veri**. Engine'e bağlanacaksa:
1. `src/engine/clinical-rule-validator.ts` (yeni) — kural enforcement logic
2. Senaryo testleri kuralları zorunlu kılacak şekilde güncellenir
3. `status: "ACTIVE"` olan kurallar otomatik enforcement
4. Bu PR ayrı olmalı — bu dosya sadece şema + DRAFT veri içerir.

## Ek bir not — kural sayısı

Mega paket sözleşmesi (2026-05-04): **maksimum 10 DRAFT kural**. Bu sınır kasıtlı — AI tarafından üretilen kuralların önceden kullanıcıyla doğrulanmış olanları kullanılır, yeni klinik karar uydurulmaz.
