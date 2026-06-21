# VALIDATE RAPORU — mevcut 14 senaryo taraması (Blok 3)

> Üretildi: `node .claude/skills/senaryo-sema-dogrulayici/scripts/validate.mjs`
> Tarih: 21 Haziran 2026. Bu rapor SİSTEMİN çalıştığını kanıtlar — gerçek bulgular.

```
Katalog: 79 ilaç id, 71 ekipman id yüklendi. 

── anaflaksi [legacy] (7 step) ────────────────────
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── apandisit [legacy] (6 step) ────────────────────
  ✗ available_medications: "ampisilin_sulbaktam" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "omeprazol" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "bilgisayarli_tomografi" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── bronsiyolit [legacy] (6 step) ────────────────────
  ✗ available_medications: "nazal_salin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "parasetamol_pediatrik" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "salbutamol_nebul" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "adrenalin_nebul" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "amoksisilin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "hipertonik_salin_3" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "nazal_aspirator" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "infant_tartisi" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ passing_score (150) > max_points×0.66 (129)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── dka [legacy] (8 step) ────────────────────
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── hipoglisemi [legacy] (6 step) ────────────────────
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── iskemik-inme [legacy] (8 step) ────────────────────
  ✗ available_medications: "alteplaz" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "tenekteplaz" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "labetolol" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "bt_anjiyografi" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "bt_perfuzyon" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "nihss_formu" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── kardiyojenik-sok [legacy] (7 step) ────────────────────
  ✗ available_medications: "milrinon" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "vazopressin" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "hemodinamik_monitor" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "iabp" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "impella" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "ecmo_va" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ passing_score (175) > max_points×0.66 (152)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── pediatrik-sepsis [legacy] (8 step) ────────────────────
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)
  ⚠ supported_difficulties < 3 seviye (1 var)

── preeklampsi [legacy] (6 step) ────────────────────
  ✗ available_medications: "hidralazin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "nifedipin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "betametazon" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "oksitosin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "diazepam" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "fetal_kalp_monitoru" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "reflex_çekici" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── pulmoner-emboli [legacy] (12 step) ────────────────────
  ✗ available_medications: "oksijen" ilaç katalogunda YOK (medications.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── rsi-entübasyon [legacy] (8 step) ────────────────────
  ✗ available_medications: "etomidat" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "süksinilkolin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "rokuronyum" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "sugammadeks" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "endotrakeal_tup" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "servikal_yaka" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "aspirator" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── sepsis-hemsirelik [legacy] (6 step) ────────────────────
  ✗ available_medications: "serum_fizyolojik_500ml" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "oksijen" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "kan_kültürü_kiti" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

── stemi [legacy] (10 step) ────────────────────
  ✗ available_medications: "norepinefrin" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "de kötü)
    " ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: ",         // Pulmoner ödem
    " ilaç katalogunda YOK (medications.ts)
  ⚠ passing_score (220) > max_points×0.66 (193)

── tccc-patlama [legacy] (8 step) ────────────────────
  ✗ available_medications: "fentanil_nazal" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "traneksamik_asit" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "amoksisilin_klavulanat" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "serum_fizyolojik" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "plazma" ilaç katalogunda YOK (medications.ts)
  ✗ available_medications: "tam_kan" ilaç katalogunda YOK (medications.ts)
  ✗ available_equipment: "tourniquet_cat" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "hemostaz_gazi" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "vented_chest_seal" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "oclusive_pansuman" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "igne_dekompresyon" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "igne_dekompresyon_14g" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "gog_tüpü" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "nasopharengeal_airway" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "io_ig" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "kompresyon_bandi" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "istat_cg8" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "hemocue" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "lactate_pro" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "hpmk_kit" ekipman katalogunda YOK (equipment.ts)
  ✗ available_equipment: "whole_blood" ekipman katalogunda YOK (equipment.ts)
  ⚠ gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)
  ⚠ deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)
  ⚠ passing_score (205) > max_points×0.66 (189)
  ⚠ clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)

═══ KLİNİK-KAYNAK RAPORU (Claude.ai dolduracak boşluklar) ═══
senaryo                       durum    TODO_KLINIK  dallanma  detr.  ref  ekip/ilaç
  anaflaksi                    ?          0           0      var    5  12/7
  apandisit                    ?          0           0     yok     4  7/8
  bronsiyolit                  ?          0           0     yok     4  9/8
  dka                          ?          0           4     yok     5  18/10
  hipoglisemi                  ?          0           1     yok     4  6/7
  iskemik-inme                 ?          0           0     yok     5  11/9
  kardiyojenik-sok             ?          0           0     yok     6  13/13
  pediatrik-sepsis             ?          0           0     yok     5  12/8
  preeklampsi                  ?          0           0     yok     4  9/9
  pulmoner-emboli              ?          0           0     yok     5  11/10
  rsi-entübasyon               ?          0           0     yok     7  15/12
  sepsis-hemsirelik            ?          0           0     yok     6  9/8
  stemi                        DRAFT      0           1      var    8  11/20
  tccc-patlama                 ?          0           0     yok    11  26/11

═══ ÖNCELİKLİ İNSAN REVIEW (kritik/DRAFT/pediatrik) ═══
  ⚑ bronsiyolit — pediatrik+kritik
  ⚑ dka — pediatrik+kritik
  ⚑ pediatrik-sepsis — pediatrik+kritik
  ⚑ stemi — DRAFT

═══ ÖRNEKLEME (manuel inceleme için) ═══
  Toplam 14 senaryo. Üretim: 1. Detaylı klinik review: yukarıdaki ⚑ listesi.

────────────────────────────────────────────────────────────
65 hata, 41 uyarı — 14 dosyada
```
