# İlaç Kataloğu (geçerli id'ler) — üretim referansı

> Tam liste + farmakoloji: `src/data/medications.ts` + `src/data/medications-extended.ts`.
> `available_medications` SADECE bu id'leri kullanabilir. Katalogda yoksa UYDURMA —
> kullanıcıya "eklenmeli" de. validate.mjs her id'yi çapraz kontrol eder.

## Tam id listesi (79 — 21 Haz 2026)

```
adenozin adrenalin alteplase amiodaron asiklovir aspirin atropin bikarbonat
bivalirudin dalteparin deksametazon dekstroz_50 difenhidramin digoksin diltiazem
dobutamin dopamin enoksaparin esmolol etomidate feniramin fenitoin fentanil
flumazenil fondaparinuks furosemid glukagon heparin hidrokortizon insulin_regular
ipratropium kalsiyum_glukonat kcl ketamin klindamisin klopidogrel labetalol
levetirasetam levofloksasin lidokain magnezyum_sulfat mannitol meropenem
metoklopramid metoprolol metronidazol midazolam morfin n_asetilsistein naloksan
nikardipin nitrogliserin nitrogliserin_iv noradrenalin oktreotid ondansetron
oseltamivir parasetamol piperasilin_tazobaktam prasugrel prednisolon propofol
protamin ringer_laktat salbutamol salin_09 sefepim seftazidim seftriakson
siprofloksasin sodyum_nitroprussid tdp tenecteplase tiamin tikagrelor tramadol
valproat vankomisin verapamil
```

## Antidotlar (toksikoloji senaryoları için — sıfır kapsama branş)

| Zehir/durum | Antidot id | Not |
|-------------|-----------|-----|
| Opioid overdoz | `naloksan` | solunum depresyonu geri döndürür |
| Benzodiazepin | `flumazenil` | dikkat: nöbet riski |
| Parasetamol | `n_asetilsistein` | NAC, geç başlanırsa az etkili |
| Organofosfat | `atropin` (+pralidoksim katalogda YOK→bildir) | muskarinik |
| β-bloker/Ca-blokör | `glukagon`, `kalsiyum_glukonat` | bradikardi/hipotansiyon |
| Hipoglisemi | `dekstroz_50`, `glukagon` | |
| Wernicke/alkol | `tiamin` | dekstrozdan ÖNCE |
| Hiperkalemi | `kalsiyum_glukonat`, `insulin_regular`+`dekstroz_50`, `salbutamol` | |
| Digoksin tox | (DigiFab katalogda YOK→bildir) | |
| Heparin | `protamin` | |

## Kategori bazlı (sık kullanım)
- **Kardiyak:** adrenalin, amiodaron, atropin, adenozin, noradrenalin, dobutamin, dopamin
- **Nöbet:** midazolam, levetirasetam, fenitoin, valproat, magnezyum_sulfat
- **Sıvı:** salin_09, ringer_laktat, dekstroz_50
- **Sedasyon/RSI:** etomidate, ketamin, propofol, midazolam, fentanil
- **Antibiyotik:** seftriakson, piperasilin_tazobaktam, meropenem, vankomisin, sefepim

> Eksik gördüğün ilaç (pralidoksim, DigiFab, idarusizumab vb.) → kullanıcıya bildir,
> `/ilac-ekle` ile iki katalog dosyasına da eklensin. Uydurma id YAZMA.
