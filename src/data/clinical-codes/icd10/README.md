# ICD-10 Kodları

`relevant-codes.json` — 14 senaryomuzu kapsayan WHO ICD-10 alt kümesi.

**Kaynak:** WHO ICD-10 (https://icd.who.int/browse10/2019/en)
**Versiyon:** ICD-10-2024-subset
**Durum:** İlk başlangıç verisi, kullanıcı reviewi bekliyor.

## Genişletme

Yeni kod eklemek için:
1. WHO browser'dan kodu doğrula
2. JSON'a ekle (display_en, display_tr, status)
3. `tests/clinical-codes/codes.test.ts` çalıştır

## Otomatik çekim

```bash
npx tsx scripts/fetch-clinical-codes.ts icd10
```

ICD-10 için WHO API anahtarı gerekir; şu an manuel curation kullanıyoruz.
