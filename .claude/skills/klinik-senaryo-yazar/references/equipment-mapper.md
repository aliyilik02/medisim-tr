# Ekipman-Etki Mapper Kataloğu (Blok 2) — üretim referansı

> Kaynak: `src/engine/equipment/catalog.ts`. Senaryo `use_central_equipment_effects: true`
> derse bu ekipmanlar koşula bağlı merkezi fizyoloji uygular. ⚠️ Değerler DRAFT.

## Mapper'da TANIMLI ekipmanlar (14 — koşullu etki)

| equipment_id | sistem | koşul | etki (DRAFT) | flag |
|--------------|--------|-------|--------------|------|
| `entubasyon_seti` | havayolu | SpO2<92 | SpO2↑→98 | airway_secured |
| `lma` | havayolu | SpO2<92 | SpO2↑→96 | airway_secured |
| `ambu` | havayolu | SpO2<92 | SpO2↑→96 | — (geçici) |
| `nazofaringeal` | havayolu | SpO2<94 | SpO2↑→95 | — |
| `oksijen_maske` | solunum | SpO2<94 | SpO2↑→97 | — |
| `nazal_kanul` | solunum | SpO2<94 | SpO2↑→95 | — |
| `hfnc` | solunum | SpO2<93 | SpO2↑→97, RR↓ | — |
| `ventilator_mekanik` | solunum | SpO2<92 | SpO2↑→98, EtCO2→40 | — |
| `defibrilator` | dolaşım | ritim VF/VT | HR→80, SBP↑ | — |
| `iv_kateter_18g` | dolaşım | her zaman | yol açar | opens_iv_route |
| `iv_kateter_20g` | dolaşım | her zaman | yol açar | opens_iv_route |
| `io_seti` | dolaşım | her zaman | yol açar | opens_iv_route |
| `monitor` | izlem | — | etki yok (ölçüm) | — |
| `ekg_12` | izlem | — | etki yok (tanı) | — |
| `pulse_oksimetre` | izlem | — | etki yok | — |

## Kullanım kuralı

- Mapper'daki ekipmanı `available_equipment`'a koy + `use_central_equipment_effects: true`.
- Outcome'da **elle vitals_change YAZMA** — mapper uygular (çift etki olur).
  Sadece `points` / `feedback` / `unlocks` ver.
- Koşul önemli: O2 maskesi normoksemik hastada SpO2 yükseltmez (gerçekçi).
  defib sadece VF/VT'de döndürür — bunun için senaryo deterioration fazına
  `signal.ekg: "vfib"` koy (faz sinyali ritmi mapper'a verir).

## Mapper'da OLMAYAN ekipman (~50)

Cerrahi (turnike, torasentez, krikotirotomi), lab (TKS, troponin, laktat),
görüntüleme (BT, US, EKO), termoregülasyon (ısıtıcı/soğutucu battaniye).
Bunlar için: ya elle `vitals_change` kullan, ya lab/imaging sistemiyle
(`lab_panels`/`imaging_results`) sonuç döndür. Mapper'a eklenecekse sonraki tur.
