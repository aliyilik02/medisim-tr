# RxNorm İlaç Eşlemeleri

`medication-mappings.json` — MediSim ilaç ID → RxNorm CUI eşlemesi.

**Kaynak:** NIH RxNav REST API (https://rxnav.nlm.nih.gov/REST/)
**Versiyon:** RxNorm-2024-subset
**Durum:** `DRAFT_NEEDS_REVIEW` — CUI'lar otomatik çekildi, klinik review gerekli.

## Otomatik yenileme

```bash
npx tsx scripts/fetch-clinical-codes.ts rxnorm
```

Her ilaç için RxNorm `approximateTerm` API'sinden en yakın CUI alınır,
`_raw/fetch-result.json` dosyasına yazılır. Manuel inceleme sonrası
`medication-mappings.json` güncellenir.

## ATC kodu

Mümkün olduğunda ATC (Anatomical Therapeutic Chemical) kodu da eklendi —
WHO ATC sınıflandırması ilaç sınıfı analizi için faydalı.
