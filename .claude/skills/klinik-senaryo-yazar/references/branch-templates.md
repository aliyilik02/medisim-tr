# Branş Şablonları — dallanma iskeletleri

> Her şablon: tanı → karar(dallanma) → müdahale → 2 ayrı sonuç (iyi/komplikasyon).
> Klinik sayısal değerler `TODO_KLINIK`. Vital değerleri yaşa uygun (`vital-signs-hud`).

## Genel dallanma iskeleti (her branş)

```
start: degerlendirme (action: examine/order_test)
  → tani-karar (decision: doğru tanı / çeldirici)
      doğru → mudahale (action)
          doğru aksiyon  → unlocks: stabilizasyon  (İYİ SON)
          eksik/geç      → unlocks: komplikasyon    (KÖTÜ SON — deterioration ilerler)
deterioration: tedavisiz trend; halted_by = doğru müdahale aksiyonu
```

## Toksikoloji (opioid overdoz — PİLOT örneği)
- chief_complaint: bilinç bulanıklığı, yüzeyel solunum
- initial_vitals: RR↓ (6), SpO2↓ (78), pupil miyotik (pupil_left_mm 2), GCS↓
- deterioration: SpO2↓ + RR↓ → apne/arrest (halted_by: `naloksan` VEYA `ambu`)
- karar dallanması: "antidot mu, entübasyon mu, gözlem mi?"
  - doğru: `naloksan` (+ havayolu desteği) → uyanma
  - erken entübasyon: `entubasyon_seti` → unlocks komplikasyon (gereksiz invaziv)
  - gözlem: hiç → arrest
- ekipman: `ambu`, `oksijen_maske`, `monitor`, `iv_kateter_18g` (mapper) + `use_central_equipment_effects`
- TODO_KLINIK: naloksan dozu/yolu, RR-SpO2 trend hızı, naloksan yanıt süresi/yarı ömür (re-narcotization)

## Nöroloji (status epileptikus)
- deterioration: nöbet süresi → hipoksi/asidoz; halted_by: `midazolam` (1. basamak)
- dallanma: 1. basamak benzo → durmazsa 2. basamak (`levetirasetam`/`valproat`/`fenitoin`)
- ekipman: `oksijen_maske`, `monitor`, `iv_kateter_18g`
- TODO_KLINIK: benzo dozu (IM/IV/IN), 2. basamak yükleme dozu, refrakter eşiği

## Endokrin (tiroid fırtınası / addison krizi)
- deterioration: taşikardi+hipertermi (fırtına) VEYA hipotansiyon (addison)
- dallanma: tanı (klinik+lab) → spesifik tedavi
- TODO_KLINIK: propranolol/hidrokortizon dozları

## Psikiyatri (akut ajitasyon / NMS / serotonin sendromu)
- deterioration: ajitasyon→kendine/başkasına zarar VEYA NMS hipertermi-rijidite
- dallanma: sözel sakinleştirme → farmakolojik (`midazolam`/`haloperidol`* )
- *haloperidol katalogda YOK → bildir
- TODO_KLINIK: sakinleştirme dozları, NMS'de destekleyici tedavi

## Çevresel (hipotermi / sıcak çarpması)
- deterioration: core sıcaklık trend → aritmi (hipotermi) / organ hasarı (hipertermi)
- ekipman: `sicak_battaniye` / `sogutma_battaniye` (mapper'da DEĞİL → elle vitals_change)
- TODO_KLINIK: ısıtma/soğutma hızı, aritmi eşiği

## GİS (üst GİS kanama)
- deterioration: hipovolemi → şok; halted_by: sıvı + kan
- dallanma: resüsitasyon → endoskopi vs medikal (`oktreotid`/PPI*)
- TODO_KLINIK: transfüzyon eşiği, oktreotid dozu

> Şablon başlangıç — gerçek vaka detayını/dozları Claude.ai klinik turu doğrular.
> Her senaryo `npm run scenario:validate <slug>` ile 0 ERROR olmalı.
