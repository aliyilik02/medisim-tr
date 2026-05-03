# SNOMED CT Kodları

`relevant-codes.json` — 14 senaryomuzu kapsayan SNOMED CT alt kümesi.

**Kaynak:** SNOMED CT International Edition (https://browser.ihtsdotools.org)
**Versiyon:** SNOMED-CT-2024-subset
**Durum:** İlk başlangıç verisi, kullanıcı reviewi bekliyor.

## Lisans notu

SNOMED CT lisanslı bir terminoloji. Türkiye'de kullanım için IHTSDO üyeliği veya
yerel anlaşma gerekir. Bu dosya **eğitim amaçlı** kod referansları içerir;
ticari kullanım için lisans kontrol edilmeli.

## Genişletme

```bash
npx tsx scripts/fetch-clinical-codes.ts snomed
```

SNOMED browser API rate-limited; manuel curation tercih edilir.
