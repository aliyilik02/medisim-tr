# Klinik Kaynaklar — kabul edilen kılavuzlar

> `debrief.references` ≥1, `clinical_review` ve `TODO_KLINIK` notları bu kaynaklara
> referans vermeli. Klinik değer DOĞRULAMASI (Claude.ai turu) bunlardan yapılacak.

## Türkiye öncelikli
- **TKD** — Türk Kardiyoloji Derneği (kardiyak)
- **TARD** — Türk Anesteziyoloji ve Reanimasyon Derneği (havayolu, sedasyon, mekanik vent.)
- **UÇEP-2020** — Ulusal Çekirdek Eğitim Programı (acil tıp)
- **TİTCK** — ruhsatlı ilaç / doz (Türkiye pratiği, SUT/SGK)
- **Türk Toraks Derneği** (solunum), **Türk Nöroloji Derneği** (nöroloji)
- **TPOG / Türk Pediatri Kurumu** (pediatri)

## Uluslararası (branşa göre)
| Branş | Kılavuz |
|-------|---------|
| ACS/STEMI | ESC 2023 ACS, AHA/ACC |
| Kardiyak arrest | AHA ACLS 2020, ERC 2021 |
| Pediatri acil | PALS 2020, APLS |
| Sepsis | Surviving Sepsis Campaign 2021 |
| İnme | AHA/ASA 2019, ESO |
| Anaflaksi | WAO 2020, EAACI |
| Toksikoloji | Goldfrank's, EXTRIP, UpToDate tox |
| Status epileptikus | NCS 2016, ILAE |
| Havayolu | DAS 2015, TARD Zor Havayolu |
| DKA | ISPAD 2022 (ped), ADA |
| Travma/askeri | ATLS 10, TCCC (CoTCCC) |

## TODO_KLINIK kaynak formatı
```ts
// TODO_KLINIK: naloksan başlangıç dozu (IV/IM/IN) — kaynak: Goldfrank's / UpToDate opioid tox
```
- Hangi DEĞER doğrulanacak + hangi KAYNAKTAN net yaz.
- Pediatride mg/kg + max doz ZORUNLU (CLAUDE.md klinik disiplin).
