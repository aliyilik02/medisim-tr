---
name: tccc-scenarios
description: TCCC (Tactical Combat Casualty Care) 3 fazı + MARCH-PAWS algoritması + TR askeri eşdeğer protokoller (TSK saha tıbbı). TCCC senaryosu yazarken, askeri/TCCC vakası eklerken bu skill'i kullan. UÇEP-2020 acil tıp + askeri uyumu.
---

# TCCC Scenarios — Saha Tıbbı Protokol Referansı

## Ne zaman kullan

- Yeni TCCC / askeri / saha senaryosu yazımı (örn. `tccc-patlama.ts`)
- Tactical casualty senaryolarında MARCH-PAWS adım sıralaması doğrulama
- UMKE / 112 acil ekipte savaş alanı + sivil terör vakaları
- Master rapor 9.B TCCC bölümüne referans

## Birincil veri kaynağı

⭐ **Master rapor:** `docs/MASTER-REPORT-v3.md` Bölüm 9.B (TCCC alt bölümü).
**Memory tamamlayıcı:** `docs/memory/medisim_anatomi_klinik.md` (vasküler sistem — turnike noktaları).
**Mevcut senaryo:** `src/data/scenarios/tccc-patlama.ts`.

## TCCC 3 Fazı

| Faz | Tam ad | Anahtar mesaj |
|---|---|---|
| **CUF** | Care Under Fire | **Tehdit altında**. Sadece **massif kanama** (turnike) müdahalesi. Hasta tahliye değil, kendini koruma + asgari müdahale. |
| **TFC** | Tactical Field Care | **Tehdit azaldı**. MARCH-PAWS tam uygulanır. Hasta tedavisi başlar. |
| **TACEVAC** | Tactical Evacuation Care | **Tahliye sürecinde** (araç/yol/helikopter). İleri müdahaleler (airway, IV, ilaç) — civilian ED bridge. |

## MARCH-PAWS Algoritması

Sıralama **kritik** — basamak atlanmaz. Senaryoda öğrenci sırayı bozarsa kritik hata.

| Harf | Adım | Müdahale |
|---|---|---|
| **M** | **M**assive hemorrhage | Turnike (CoTCCC-onaylı — CAT, SOFTT-W, SAM), hemostatik gaz (QuikClot Combat Gauze, ChitoGauze), direkt basınç |
| **A** | **A**irway | Recovery position, NPA (nazofarengeal airway), king/iGel, krikotirotomi (cerrahi airway) |
| **R** | **R**espiration | Göğüs dekompresyonu (tension pnömotoraks — 4-5. ICS midaksiller veya 2. ICS midklavikular), oklüzif flaster (chest seal) açık göğüs yarası için |
| **C** | **C**irculation | IV/IO erişim (proksimal tibia IO öncelik), **TXA** (tranexamic acid) 1g IV ilk 3 saatte, **kan ürünleri** (whole blood > LP, RBC), kristaloid kısıtlı (permissive hypotension SBP 80-90) |
| **H** | **H**ypothermia / **H**ead injury | Hipo-pak (HPMK Hypothermia Prevention/Management Kit), warm IV, kafa travması için ABCDE re-eval |
| **P** | **P**ain | **Triple-Option Analgesia** (TCCC standardı): (1) **Meloksikam** 15 mg PO + **asetaminofen** 1000 mg PO (mild), (2) **OTFC** (oral transmucosal fentanil sitrat) 800 mcg (moderate), (3) **Ketamin** 50 mg IM / 20 mg IN / IV titrate (severe + altered mental status) |
| **A** | **A**ntibiotic | **Moksifloksasin** 400 mg PO (open wound, PO tolerate), **ertapenem** 1 g IV/IM (PO yok / mantar yarası) |
| **W** | **W**ounds | Pansuman, gözenekli yara için chest seal, immobilizasyon |
| **S** | **S**plinting | Kırık immobilizasyon, SAM splint, pelvic binder |

## TR Türkiye Spesifik Notlar

### Askeri (TSK / GATA)

- TCCC TSK eşdeğer protokoller **klasifiye**, doğrudan referans verilemez
- **Açık kaynak eşdeğer:** ABD JTS (Joint Trauma System), TCCC.org.ua (Ukrayna saha eğitim)
- Senaryo: ATT (acil tıp teknisyeni) / UMKE perspektifi → askeri detaydan uzak, sivil saha tıbbı dili

### 112 / UMKE Yetki Sınırları

| Eylem | ATT yetkisi | Doktor onayı |
|---|---|---|
| Turnike | ✅ | — |
| NPA | ✅ | — |
| IV erişim | ✅ | — |
| TXA uygulama | ✅ (UMKE) | — |
| Krikotirotomi | ❌ (doktor) | Şart |
| Kan ürünü transfüzyonu | ❌ | Şart |
| Ketamin | ❌ (UMKE düzeyi farklı) | Genelde şart |
| Fentanil | ❌ | Şart |
| Moksifloksasin/ertapenem | ❌ | Şart |

→ TCCC senaryosunda **target_audience: ["military_tccc"]** veya **emergency_medic** + yetki disclaimer.

### TİTCK İlaç Karşılıkları

| TCCC ilaç | TR muadil | Status |
|---|---|---|
| TXA | Transamin (Roche) | ✅ TİTCK |
| Moksifloksasin | Avelox (Bayer), muadil | ✅ TİTCK |
| Ertapenem | Invanz (MSD) | ✅ TİTCK |
| Ketamin | Ketalar (Pfizer) | ✅ TİTCK, **yeşil reçete** |
| Fentanil | Durogesic, IV fentanil | ✅ TİTCK, **kırmızı reçete** (narkotik) |
| OTFC | Türkiye'de yok | ❌ — alternatif buccal/sublingual fentanil |

## Senaryo Yapısı (TCCC için extra alanlar)

```typescript
const tcccScenario: Scenario = {
  // ... standart alanlar
  target_audience: ["military_tccc", "emergency_medic"],
  tags: ["tccc", "march-paws", "askeri", "saha"],

  // Faz belirleme: senaryo başlangıcı CUF mu TFC mi?
  // metadata olarak tags veya custom field
  initial_phase: "CUF",  // veya "TFC", "TACEVAC"

  // Step sıralaması MARCH-PAWS sırasına saygı duymalı:
  steps: [
    { id: "cuf-massive-bleeding", kind: "action", title: "Massif kanama kontrolü", /* turnike uygulama */ },
    { id: "tfc-airway", kind: "action", title: "Hava yolu", /* NPA */ },
    { id: "tfc-respiration", kind: "action", title: "Solunum", /* dekompresyon */ },
    // ...
  ],

  // Triple-Option Analgesia ilaç listesi
  available_medications: ["meloksikam", "asetaminofen", "fentanil_otfc", "ketamin", "txa", "moksifloksasin"],
};
```

## Gotchas

- ❌ **CUF'ta IV / airway YAPMA** — sadece massif kanama. Sırayı bozarsan kritik hata.
- ❌ **Kristaloid bolus** — TCCC permissive hypotension (SBP 80-90 hedef), aşırı kristaloid dilüsyon koagülopati yapar.
- ❌ **Turnike gevşetme** — bir kez sıkıldı, **2 saat sonrası** hospital'da gevşetilir (genelde). Saha ortamında gevşetme yok.
- ❌ **Yetki dışı eylem** — ATT senaryosunda ketamin verirse, kritik puan kaybı + debrief uyarısı.
- ❌ **Eski TCCC sürümü** — algoritma 2014→2024 arasında güncellendi (TXA dose, OTFC yerine ketamin tercihi). En güncel sürüm referans al (TCCC.mil veya tccc.org.ua).
- ✅ **MARCH-PAWS sıralı** — paralel müdahale (örn. turnike + IV) gerçekçi ama eğitim için sıra disiplini önemli.
- ✅ **TR senaryosunda askeri detay az** — sivil saha (terör, kaza, doğal afet) odağı, TSK protokol klasifiye.

## Kaynaklar

- TCCC Handbook v5 (US Army) — api.army.mil/.../17-13-tactical-casualty-combat-care-handbook-v5-may-17-distro-a.pdf
- TCCC.org.ua (açık eğitim kaynağı) — tccc.org.ua/en
- Stop the Bleed / Rescue Essentials 2024 — turnike effektivite verisi (4596 combat death post 9/11 > %90 hemoraj)
- CoTCCC (Committee on TCCC) — protokol komitesi, jts.health.mil
- TR askeri saha tıbbı klasifiye — kullanıcı (Ali Bey) onayı ile referans verilmez

## Referans dosyalar

- `src/data/scenarios/tccc-patlama.ts` — mevcut TCCC senaryo örneği
- `docs/MASTER-REPORT-v3.md` Bölüm 9.B (TCCC alt bölüm)
- `memory/medisim_anatomi_klinik.md` (vasküler — turnike noktaları, IV erişim hiyerarşisi)
