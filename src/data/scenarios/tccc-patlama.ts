// ============================================================
// MediSim TR — TCCC Patlama Yaralanması v2.0.0 (Askeri / TCCC)
// ============================================================
// Klinik referans: TCCC Guidelines CoTCCC 2024,
// JTS Clinical Practice Guidelines 2018-2020,
// PHTLS 9. Baskı (2020), NATO Emergency War Surgery 4. Baskı,
// CRASH-2 (Lancet 2010) + CRASH-3 (2019), NATO STANAG 2087,
// TSK Sağlık Komutanlığı Saha Tıbbı Eğitim Modülü 2022.
// Ana öğretim hedefi: TCCC 3 faz (CUF→TFC→TACEVAC),
// POC lab (HemoCue + i-STAT) + POCUS eFAST, MARCH-PAWS, DCR.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_tccc_patlama: Scenario = {
  id: "askeri_tccc-patlama-001",
  version: "2.0.0",
  title: "24 Yaş Asker — Terör Patlaması, Masif Kanama + Gerilimli PTX",
  description:
    "Sivil-askeri kombo terör patlaması, MCI bağlamı. Sağ bacak yüksek debili kanama + açık göğüs yarası (sucking chest wound) + gerilimli PTX. POC lab (HemoCue + i-STAT), POCUS eFAST ve MARCH-PAWS protokolüyle saha kararı. TCCC 2024 güncel önerileri.",
  specialty: "askeri_tccc",
  tags: [
    "tccc",
    "tourniquet",
    "patlama",
    "ptx",
    "masif kanama",
    "saha tıbbı",
    "mci",
    "dcr",
    "poc lab",
    "pocus",
    "march-paws",
  ],
  difficulty: 3,
  supported_difficulties: [2, 3, 4, 5],
  estimated_minutes: 18,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by:
    "TCCC CoTCCC 2024, JTS CPG 2020, NATO STANAG 2087, TSK Saha Tıbbı 2022 uyumlu",
  last_updated: "2026-04-27",

  // ICD-10 (REVIEWED_PENDING_ACTIVATION — kullanıcı onayı 2026-05-04)
  // SNOMED CT yok: T07 'Multiple injuries, unspecified' için stabil SNOMED eşleşmesi yok.
  clinical_codes: { icd10: "T07" },

  patient: {
    age: 24,
    sex: "M",
    weight_kg: 82,
    height_cm: 180,
    chief_complaint:
      "Terör patlaması, sağ bacakta şarapnel kanalı — aktif arteriyel kanama, göğüs ön duvarda açık yara, nefes alırken ıslık sesi. Bilinç açık ama korkmuş ve ağrılı.",
    history_items: [
      "Aktif muharebe personeli, terör patlaması MCI ortamı",
      "Patlama: yaklaşık 3 dakika önce (primer + sekonder + tersiyer blast)",
      "Bilinç açık, GKS 14 (konuşuyor, ağrılı)",
      "Sağ bacak: uyluk orta 1/3 şarapnel — fışkıran arteriyel kanama",
      "Göğüs sağ ön: açık yara, nefes alırken ıslık sesi (sucking chest wound?)",
      "Sekonder: sol akciğerde potansiyel blast akciğer hasarı (izlem gerekli)",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 128,
    bp_systolic: 90,
    bp_diastolic: 54,
    spo2: 89,
    temp: 36.2,
    rr: 28,
    pain: 9,
    gcs: 14,
  },

  available_medications: [
    "ketamin",
    "morfin",
    "fentanil_nazal",
    "traneksamik_asit",
    "seftriakson",
    "amoksisilin_klavulanat",
    "serum_fizyolojik",
    "ringer_laktat",
    "plazma",
    "kalsiyum_glukonat",
    "tam_kan",
  ],

  available_equipment: [
    "tourniquet_cat",
    "hemostaz_gazi",
    "combat_gauze",
    "vented_chest_seal",
    "oclusive_pansuman",
    "igne_dekompresyon",
    "igne_dekompresyon_14g",
    "gog_tüpü",
    "nasopharengeal_airway",
    "nazofaringeal",
    "ambu",
    "oksijen_maske",
    "iv_kateter_18g",
    "io_ig",
    "io_seti",
    "kompresyon_bandi",
    "tansiyon_aleti",
    "pulse_oksimetre",
    "ultrason",
    "kan_gazi_cihazi",
    "istat_cg8",
    "hemocue",
    "lactate_pro",
    "hpmk_kit",
    "sicak_battaniye",
    "whole_blood",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  start_step_id: "s1_care_under_fire",

  lab_panels: {
    "tccc-poc-hgb-lactate": {
      id: "tccc-poc-hgb-lactate",
      name_tr: "POC — HemoCue Hgb + Lactate Pro",
      collected_at_min: 5,
      comment:
        "Saha POC cihazı: HemoCue 301 hemoglobinometre + Lactate Pro 2. Sonuç ~60 saniyede.",
      results: [
        {
          parameter: "Hemoglobin (HemoCue)",
          value: 8.4,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          flag: "LL",
          interpretation:
            "Anlamlı akut kanama. Sınıf III hemoraji (30-40% kan kaybı tahmini). Transfüzyon eşiği aşıldı.",
        },
        {
          parameter: "Laktat (POC)",
          value: 5.8,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation:
            "Ciddi hipoperfüzyon — Sınıf III şok doku asidozu. Masif Transfüzyon Protokolü (MTP) endikasyonu.",
        },
      ],
    },
    "tccc-istat-cg8": {
      id: "tccc-istat-cg8",
      name_tr: "i-STAT CG8+ Kan Gazı + Elektrolit",
      collected_at_min: 8,
      comment:
        "i-STAT CG8+ kartuşu: kapsamlı saha kan gazı + elektrolitler. ~3 dakika.",
      results: [
        {
          parameter: "pH",
          value: 7.22,
          unit: "",
          reference_range: "7.35-7.45",
          flag: "LL",
          interpretation:
            "Asidemi — Lethal Triad bileşeni. Asidoz koagülopatiye zemin hazırlar.",
        },
        {
          parameter: "pCO2",
          value: 38,
          unit: "mmHg",
          reference_range: "35-45",
        },
        {
          parameter: "pO2",
          value: 78,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "L",
          interpretation:
            "Hafif hipoksemi. Açık pnömotoraks + blast akciğer etkisi.",
        },
        {
          parameter: "HCO3",
          value: 18,
          unit: "mEq/L",
          reference_range: "22-26",
          flag: "L",
        },
        {
          parameter: "Base Excess",
          value: -9,
          unit: "mEq/L",
          reference_range: "-2 / +2",
          flag: "LL",
          interpretation:
            "Ciddi base deficit. Şok derinliğini gösterir (Sınıf III-IV).",
        },
        {
          parameter: "Na",
          value: 138,
          unit: "mEq/L",
          reference_range: "136-145",
        },
        {
          parameter: "K",
          value: 4.2,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
        },
        {
          parameter: "iCa (iyonize)",
          value: 0.95,
          unit: "mmol/L",
          reference_range: "1.12-1.32",
          flag: "L",
          interpretation:
            "Hipokalsemi — transfüzyon öncesi düzelt! Sitrat antikoagülan iCa bağlar → kardiyak depresyon riski. Kalsiyum glukonat 1g IV ver.",
        },
        {
          parameter: "Glukoz",
          value: 142,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
          interpretation:
            "Hafif stres hiperglisemisi — şu an tedavi gerekmez.",
        },
        {
          parameter: "Hct",
          value: 28,
          unit: "%",
          reference_range: "41-53",
          flag: "L",
          interpretation: "Hematokrit düşük — Hgb 8.4 ile uyumlu.",
        },
      ],
    },
    "tccc-role2-bloodwork": {
      id: "tccc-role2-bloodwork",
      name_tr: "Role 2 Hospital Lab (Transfer Sonrası)",
      collected_at_min: 45,
      comment:
        "⚠️ Bu panel SAHADA MEVCUT DEĞİL. Yalnızca Role 2/3 ulaşımında (~t=45dk) erişilebilir. Sahada bu sonuçları beklemek = ölüm.",
      results: [
        {
          parameter: "Hemoglobin",
          value: 7.8,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          flag: "LL",
          interpretation:
            "Transfüzyon devam ediyor — dilüsyon + devam eden kanama etkisi.",
        },
        {
          parameter: "INR",
          value: 1.6,
          unit: "",
          reference_range: "0.8-1.2",
          flag: "H",
          interpretation:
            "Travma-İndüklenmiş Koagülopati (TIC) doğrulandı. FFP endikasyonu — MTP 1:1:1.",
        },
        {
          parameter: "Fibrinojen",
          value: 180,
          unit: "mg/dL",
          reference_range: "200-400",
          flag: "L",
          interpretation:
            "Fibrinojen <200 → Kriyopresipitat endikasyonu. FFP tek başına yetersiz.",
        },
        {
          parameter: "aPTT",
          value: 52,
          unit: "saniye",
          reference_range: "25-36",
          flag: "H",
        },
        {
          parameter: "Trombosit",
          value: 138000,
          unit: "/μL",
          reference_range: "150.000-400.000",
          flag: "L",
          interpretation:
            "Hafif düşük — aktif tüketim devam ediyor.",
        },
        {
          parameter: "Troponin I",
          value: 0.04,
          unit: "ng/mL",
          reference_range: "<0.04",
          interpretation:
            "Normal sınırda — primer blast kardiyak hasarı yok.",
        },
        {
          parameter: "AST",
          value: 220,
          unit: "U/L",
          reference_range: "10-40",
          flag: "H",
          interpretation:
            "Yükselmiş — şiddetli yumuşak doku hasarı, yağ embolizmi monitörize et.",
        },
      ],
    },
  },

  result_delay_seconds: {
    "tccc-poc-hgb-lactate": 60,
    "tccc-istat-cg8": 180,
    "tccc-role2-bloodwork": 1800,
  },

  lab_timeline: [
    {
      at_minute: 10,
      panel_id: "tccc-poc-hgb-lactate",
      results: [
        {
          parameter: "Hemoglobin (HemoCue)",
          value: 7.6,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          flag: "LL",
          interpretation:
            "Sıvı dilüsyonu etkisi — tourniket + müdahale sonrası kontrol. Transfüzyon başlandıysa erken yanıt.",
        },
        {
          parameter: "Laktat (POC)",
          value: 4.2,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation:
            "Tourniket + iğne dekompresyon + TXA müdahalesine kısmi yanıt. Hedefe henüz ulaşılmadı (<2.0). Transfer ivedi.",
        },
      ],
    },
    {
      at_minute: 30,
      panel_id: "tccc-istat-cg8",
      results: [
        {
          parameter: "pH",
          value: 7.28,
          unit: "",
          reference_range: "7.35-7.45",
          flag: "L",
          interpretation:
            "Asidoz devam ediyor ama hafif düzelme. Transfüzyon + TXA etkisi.",
        },
        {
          parameter: "Base Excess",
          value: -6,
          unit: "mEq/L",
          reference_range: "-2 / +2",
          flag: "L",
          interpretation:
            "Kısmi düzelme — resüsitasyon yanıtı.",
        },
        {
          parameter: "iCa (iyonize)",
          value: 1.05,
          unit: "mmol/L",
          reference_range: "1.12-1.32",
          flag: "L",
          interpretation:
            "Kalsiyum glukonat sonrası kısmi düzelme — tam normale henüz ulaşılmadı.",
        },
        {
          parameter: "pO2",
          value: 112,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "H",
          interpretation:
            "İğne dekompresyon + chest seal sonrası oksijenasyon düzeldi.",
        },
      ],
    },
    {
      at_minute: 45,
      panel_id: "tccc-role2-bloodwork",
      results: [
        {
          parameter: "Hemoglobin",
          value: 7.8,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          flag: "LL",
          interpretation:
            "Devam eden transfüzyon — MTP yanıtı izleniyor.",
        },
        {
          parameter: "INR",
          value: 1.6,
          unit: "",
          reference_range: "0.8-1.2",
          flag: "H",
          interpretation:
            "TIC (Travma-indüklenmiş koagülopati) doğrulandı — kriyopresipitat + FFP.",
        },
        {
          parameter: "Fibrinojen",
          value: 180,
          unit: "mg/dL",
          reference_range: "200-400",
          flag: "L",
          interpretation:
            "Kriyopresipitat endikasyonu — FFP tek başına fibrinojenı yerine koymaz.",
        },
      ],
    },
  ],

  imaging_results: {
    "tccc-pocus-efas": {
      id: "tccc-pocus-efas",
      name_tr: "POCUS eFAST — Saha Ultrason",
      modality: "us",
      view: "eFAST — Toraks bilateral + Abdomen (Morrison) + Perikard",
      interpretation:
        "SAĞ AKCIĞER: Lung sliding ABSENT (yok) — M-mode: Barcode sign (+). Gerilimli pnömotoraks ile uyumlu. SOL AKCİĞER: Lung sliding mevcut, B-hat paterni yok. Morrison boşluğu: Serbest sıvı NEGATİF. Perikard: Sıvı yok. SONUÇ: Sağ gerilimli PTX — acil iğne dekompresyon endikasyonu.",
      findings: [
        "Sağ akciğer: Lung sliding ABSENT — M-mode barcode sign (+)",
        "Gerilimli pnömotoraks — klinik bulgularla (azalmış SBS, JVD, BP↓) uyumlu",
        "Sol akciğer: Lung sliding mevcut, B-hat yok",
        "Morrison boşluğu: Serbest sıvı negatif — masif hemoperitone yok",
        "Perikard: Sıvı yok — kardiyak tamponat dışlandı",
      ],
      timestamp_min: 8,
    },
    "tccc-role2-cxr-bt": {
      id: "tccc-role2-cxr-bt",
      name_tr: "PA Grafi + Şarapnel BT (Role 2/3 Hospital)",
      modality: "xray",
      view: "PA Akciğer Grafisi + BT toraks (transfer sonrası)",
      interpretation:
        "PA GRAFİ: Sağ apikalde gög tüpü drenajı sonrası PTX rezolüsyonu, tüp pozisyon uygun. Sol alt zonda patchy infiltrasyon (primer blast akciğer hasarı). BT (gerekirse): Şarapnel fragmanları sağ aksilla ve sol uyluk medialinde. Abdominal serbest hava yok. Aorta intakt görünüm.",
      findings: [
        "Sağ akciğer: PTX drenaj sonrası rezolüsyon, gög tüpü pozisyon uygun",
        "Sol alt zon: Patchy infiltrasyon (primer blast akciğer hasarı, izlem gerekli)",
        "Şarapnel fragmanları: Sağ aksilla + sol uyluk mediali",
        "Abdominal serbest hava yok",
        "Aorta: İntakt görünüm",
      ],
      timestamp_min: 50,
    },
  },

  steps: [
    // ====================================================
    // ADIM 1 — Care Under Fire (Ateş Altında Bakım)
    // ====================================================
    {
      id: "s1_care_under_fire",
      kind: "decision",
      title: "Care Under Fire — Ateş Altında İlk Müdahale",
      prompt:
        "Terör patlaması! MCI sahası, ateş devam ediyor. Sağ uylukta fışkıran kanamayla yerde bir asker var. İlk müdahaleniz?",
      narrative:
        "TCCC Faz 1 — Care Under Fire: Ateş altında yalnızca hayatı tehdit eden kanamayı durdur. Kendi güvenliğin önce.",
      options: [
        {
          id: "opt_tourniquet_ilk",
          text: "Tourniquet (CAT) yüksek uyluktan tak, hastayı korumaya al, emniyetli noktaya çek",
          correct: true,
          points: 35,
          feedback:
            "Doğru — CUF prensibi: Masif kanama → Tourniquet, sonra hareket. Uygulama saatini YAZ. MCI'da tourniquet en fazla hayat kurtaran tek saha müdahalesidir.",
        },
        {
          id: "opt_degerlendir_ilk",
          text: "Hastanın yanına git, ABC değerlendirmesi ve IV erişim başla",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — CUF'ta kapsamlı değerlendirme yapılmaz. Kendi güvenliğin önce; ateş altında IV erişim değil tourniquet.",
        },
        {
          id: "opt_sivi",
          text: "IV sıvı ile resüsitasyona başla",
          correct: false,
          points: -20,
          feedback:
            "Yanlış öncelik — CUF: Kanama kontrolü ilk. Sıvı/resüsitasyon TFC fazında, güvenli bölgede.",
        },
        {
          id: "opt_tum_hastalar",
          text: "MCI triajı yap, tüm yaralıları değerlendir, sonra müdahale",
          correct: false,
          points: -10,
          feedback:
            "Ateş altında triaj yapılmaz. TCCC'de önce ateş baskıla/kayan, sonra TFC'de triaj. Bu senaryo tek hasta odaklı ancak MCI farkındalığı gerekli.",
        },
      ],
    },

    // ====================================================
    // ADIM 2 — Tactical Field Care (MARCH-PAWS)
    // ====================================================
    {
      id: "s2_tactical_field_care",
      kind: "action",
      title: "Tactical Field Care — MARCH-PAWS Sistematik Değerlendirme",
      prompt:
        "Güvenli noktaya taşındınız. Tourniquet uygulandı, kanama kontrol altında. MARCH-PAWS ile sistematik değerlendirmeye başlayın.",
      narrative:
        "TFC Fazı: MARCH-PAWS — Massive hemorrhage → Airway → Respiration → Circulation → Hypothermia/Head → Pain → Antibiotics → Wounds → Splinting.",
      min_actions: 4,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "tourniquet_cat" },
          points: 18,
          feedback:
            "M (Massive Hemorrhage): Tourniquet doğrulama — kastın 5 cm üstü, distal nabız yok, saat yazılmış. Etkin tourniquet kritik.",
        },
        {
          action: { type: "examine", target_id: "solunum_muayenesi" },
          points: 20,
          feedback:
            "R (Respiration): Göğüs muayenesi — sağda azalmış solunum sesi + trakeal deviasyon → Gerilimli PTX şüphesi. POCUS eFAST planla. s2b ve s2c adımlarına devam.",
        },
        {
          action: { type: "use_equipment", target_id: "combat_gauze" },
          points: 12,
          feedback:
            "M: Combat Gauze (QuikClot) + direkt bası — tourniket uygulanamayan kanamalar için hemostaz. TCCC Class I.",
        },
        {
          action: { type: "give_medication", target_id: "traneksamik_asit" },
          points: 22,
          feedback:
            "C (Circulation): TXA 1 g IV, 10 dakikada — yaralanmadan <3 saat! CRASH-2/MATTERs: Masif kanamalı travmada mortaliteyi azaltır. TCCC Class I.",
        },
        {
          action: { type: "give_medication", target_id: "ketamin" },
          points: 10,
          feedback:
            "P (Pain): Ketamin 0.5 mg/kg IV veya 1 mg/kg IM — hemodinamiyi korur, instabilitede güvenli. TCCC analjezi seçeneği.",
        },
        {
          action: { type: "order_test", target_id: "tccc-poc-hgb-lactate" },
          points: 14,
          feedback:
            "POC lab başlatıldı — HemoCue Hgb + Lactate Pro 2. ~60 saniyede sonuç. Şok derinliği + transfüzyon kararı için kritik.",
        },
        {
          action: { type: "order_test", target_id: "tccc-istat-cg8" },
          points: 11,
          feedback:
            "i-STAT CG8+ başlatıldı — kan gazı + iCa + elektrolitler. ~3 dakika. Asidoz derinliği + iCa ölçümü MTP kararını bilgilendirir.",
        },
      ],
      default_wrong_penalty: -8,
      default_wrong_feedback: "MARCH-PAWS protokolünde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 3 (YENİ) — Sucking Chest Wound Yönetimi
    // ====================================================
    {
      id: "s2b_sucking_chest_wound",
      kind: "decision",
      title: "Açık Göğüs Yarası — Sucking Chest Wound Yönetimi",
      prompt:
        "TFC değerlendirme: Göğüs ön duvarda 3 cm açık yara, her nefeste ıslık sesi + hava girişi görülüyor. SpO₂ 92%. Gerilimli PTX henüz gelişmemiş ama risk yüksek. Yaklaşımınız?",
      narrative:
        "Açık pnömotoraks (sucking chest wound): Atmosferik hava plevral alana giriyor → akciğer kollapsı. TCCC 2024 yönetim önerileri güncellenmiştir.",
      options: [
        {
          id: "opt_vented_seal",
          text: "Vented chest seal (Hyfin / Asherman) — tek yönlü valfl ile kapat",
          correct: true,
          points: 30,
          feedback:
            "Doğru — TCCC 2024 Class I: Vented (tek yönlü valfl) chest seal tercih. Hava girişini engeller, gerilimli PTX gelişiminde otomatik dekompresyona izin verir. Barcode sign varsa ek iğne dekompresyon planla.",
        },
        {
          id: "opt_nonvented_seal",
          text: "Non-vented chest seal (4 köşeden tam yapıştır)",
          correct: false,
          points: 10,
          feedback:
            "Kabul edilebilir ama eski TCCC pratiği — Non-vented seal gerilimli PTX gelişimini önleyemez. 'Burp' açma manevrası gerektirebilir. Vented seal güncel standart (TCCC 2024).",
        },
        {
          id: "opt_gazli_bez",
          text: "Gazlı bez ve bandaj ile kapat",
          correct: false,
          points: -15,
          feedback:
            "Yetersiz — Hava sızdırması engellenemez, gerilimli PTX gelişebilir. Saha spesifik chest seal ürünü kullan.",
        },
        {
          id: "opt_hicbir_sey",
          text: "Kapatma gerekmiyor — transfer sırasında kapanır",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA — Açık pnömotoraks sürekli akciğer kollapsı → kardiyovasküler çöküş. Saha anında kapatma zorunlu. TCCC Class I.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 (YENİ) — Gerilimli PTX İğne Dekompresyon
    // ====================================================
    {
      id: "s2c_tension_pneumothorax_decompression",
      kind: "decision",
      title: "Gerilimli Pnömotoraks — İğne Dekompresyon Lokasyonu",
      prompt:
        "Chest seal uygulandı ama vital bozuluyor: BP 80/50, SpO₂ 86%, JVD belirginleşti, sağ akciğer solunum sesi yok. POCUS eFAST: Lung sliding ABSENT + Barcode sign sağda. Gerilimli PTX tanısı. Yaklaşımınız?",
      narrative:
        "Gerilimli pnömotoraks — dekomprese edilmezse dakikalar içinde kardiyak arrest. POCUS barcode sign tanıyı doğruladı. TCCC 2024 lokasyon önerisi güncellenmiştir.",
      options: [
        {
          id: "opt_igne_5ics_mal",
          text: "İğne torakostomi — 5. IKA midaksiller hat, 8 cm/14G kateter (TCCC 2024 tercih)",
          correct: true,
          points: 30,
          feedback:
            "Doğru — TCCC 2024 + JTS 2018: 5. IKA midaksiller hat tercih. Başarı oranı ~%94 vs 2. ICS MCL ~%46. Göğüs duvarı daha ince, doğru pozisyon daha güvenilir. İğneden ıslık sesi çıkar → BP ve SpO₂ düzelir.",
        },
        {
          id: "opt_igne_2ics_mcl",
          text: "İğne torakostomi — 2. IKA midklaviküler hat (eski standart lokasyon)",
          correct: false,
          points: 15,
          feedback:
            "Kabul edilebilir, hâlâ TCCC'de alternatif — Eski standart 2. ICS MCL. Modern TCCC 2024 önerisi 5. ICS midaksiller. İki lokasyon da kabul görür; tercih 5. ICS. Yanlış değil, güncel değil.",
        },
        {
          id: "opt_tup_torakostomi",
          text: "Tüp torakostomi sahasında başlat",
          correct: false,
          points: -10,
          feedback:
            "Saha koşullarında uygun değil — Tüp torakostomi Role 2/3 işlemi. Sahada iğne dekompresyon hızlı, yeterli. Tüp Role 2'de uygulanır.",
        },
        {
          id: "opt_oksijen_bekle",
          text: "Yüksek akış oksijen ver, transfer bekle",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA — Gerilimli PTX oksijen verilmesiyle düzelmez. Intraplevral basınç artışı → mediastinal baskı → kardiyak arrest. Anında iğne dekompresyon zorunlu. Transfer beklemek ölüm.",
        },
      ],
    },

    // ====================================================
    // ADIM 5 — Tourniquet Doğrulama + Konversiyon Kararı
    // ====================================================
    {
      id: "s3_tourniquet_dogrulama",
      kind: "decision",
      title: "Tourniquet Doğrulama ve Konversiyon Kararı",
      prompt:
        "İğne dekompresyon sonrası vitaller: BP 85/55, SpO₂ 94%. Tourniket sağ uylukta, uygulama üzerinden 25 dakika geçti. Tourniket yönetimi için kararınız?",
      options: [
        {
          id: "opt_dogru_tk",
          text: "Kanama durdu, distal nabız yok, saat yazılmış — olduğu gibi bırak, Role 2 transferi bekle",
          correct: true,
          points: 20,
          feedback:
            "Doğru — Etkin tourniket: kanama durdu + distal nabız yok + YAZILI saat. Saha koşullarında <6 saat güvenli. Konversiyon Role 2/3'te uzman değerlendirmesiyle yapılır.",
        },
        {
          id: "opt_konvert",
          text: "25 dakika geçti, tourniqueti basınç pansumanına konvert et",
          correct: false,
          points: -15,
          feedback:
            "Yanlış — Aktif şok + transfer ortamında tourniket konversiyonu önerilmez. Kanama kontrolü kesin olduğunda ve TFC'de yeterli zaman varsa değerlendirilir. Şu koşulda tourniket güvenli.",
        },
        {
          id: "opt_gevset",
          text: "1 saatten kısa da olsa tourniqueti 5 dakika gevşet, reperfüzyona izin ver",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — TCCC: Saha koşullarında tourniket GEVŞETİLMEZ. Reperfüzyon şoku + kanama yeniden başlayabilir. Hastane ortamında uzmanca kaldırılır.",
        },
        {
          id: "opt_ek_tourniket",
          text: "Kanama devam ediyor sanki — ikinci tourniket proksimale ekle",
          correct: false,
          points: -5,
          feedback:
            "Tourniket zaten etkin görünüyor (kanama durdu, distal nabız yok). İkinci tourniket gereksiz. Kanama gerçekten devam etseydi evet, proksimale ekle.",
        },
      ],
    },

    // ====================================================
    // ADIM 6 (YENİ) — POC Lab Yorumlama + DCR/MTP Kararı
    // ====================================================
    {
      id: "s3b_poc_lab_decision",
      kind: "decision",
      allow_multiple: true,
      partial_credit: false,
      title: "POC Lab Yorumlama — DCR / Masif Transfüzyon Kararı",
      prompt:
        "POC lab sonuçları: Hgb 8.4 g/dL, Laktat 5.8 mmol/L, pH 7.22, BE -9, iCa 0.95 mmol/L. Tanı: Sınıf III hemoraji + asidemi + hipokalsemi. Resüsitasyon stratejiniz?",
      narrative:
        "Lethal Triad (Genişletilmiş): Hipotermi + Asidoz + Koagülopati + Hipokalsemi (sitrat). DCR (Damage Control Resuscitation) tüm bileşenleri eş zamanlı hedefler.",
      min_difficulty: 2,
      options: [
        {
          id: "opt_dcr_mtp",
          text: "MTP aktivasyonu: 1:1:1 (PRBC:FFP:Plt) + Kalsiyum glukonat 1g IV (iCa düzelt) + TXA 2. doz planla + ısıtmalı sıvı + permisif hipotansiyon (SBP 80-90 hedef)",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — DCR tam uygulama. iCa 0.95 → Kalsiyum glukonat zorunlu (sitrat iCa bağlar, kardiyak depresyon önle). Permisif hipotansiyon aktif kanama kontrolüne kadar. Hipotermi prevansiyon. TCCC + JTS 2020 Class I.",
        },
        {
          id: "opt_whole_blood",
          text: "Whole blood (tam kan) mevcutsa MTP'ye önce ver — PRBC+FFP+Plt ayrı ayrı değil",
          correct: true,
          points: 35,
          feedback:
            "Doğru — TCCC 2024: Tam kan komponent terapiye üstündür. Trombosit işlevi korunmuş, soğuk zincir daha kolay. TSK sahasında PWB (Pre-donated Whole Blood) protokolü kullanılır. Altın standart.",
        },
        {
          id: "opt_kristaloid",
          text: "Serum fizyolojik 2L bolus başla, kan bekleniyor",
          correct: false,
          points: -10,
          feedback:
            "Yetersiz — Büyük hacim kristaloid dilüsyonal koagülopati + asidoz yapar. Sınıf III şokta kan ürünü önce. 250-500 mL köprü kabul edilebilir, 2L aşırı.",
        },
        {
          id: "opt_txa_izle",
          text: "Sadece TXA 2. doz ver, vital izle, kan ürünü transferde",
          correct: false,
          points: -15,
          feedback:
            "Yetersiz — TXA hemostazis içindir, hipovolemi tedavi etmez. BE -9 + Laktat 5.8 aktif resüsitasyon gerektiriyor. Transfer bekleme.",
        },
        {
          id: "opt_bekle_role2",
          text: "Role 2 lab sonuçlarını bekle (INR/fibrinojen/TEG), sonra MTP karar ver",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA — Role 2 lab SAHADA MEVCUT DEĞİL (~45 dk sonra). POC verileri (Hgb 8.4 + Laktat 5.8 + pH 7.22 + BE -9) MTP başlatmak için yeterli kanıt. Sahada lab beklemek = doku ölümü = ölüm.",
        },
      ],
    },

    // ====================================================
    // ADIM 7 — TACEVAC Hazırlığı
    // ====================================================
    {
      id: "s4_tacevac",
      kind: "action",
      title: "TACEVAC — Tahliye Hazırlığı",
      prompt:
        "MEDEVAC çağrıldı, helikopter 10 dakika uzakta. Hastayı tahliyeye hazırlayın ve transfer yönetimini planlayın.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "hipotermi_kontrolu" },
          points: 18,
          feedback:
            "H (Hypothermia): Lethal Triad'ın 1. bileşeni. Islak giysilerden çıkar, HPMK kit sar. Hipotermi → koagülopati kısır döngüsü.",
        },
        {
          action: { type: "use_equipment", target_id: "sicak_battaniye" },
          points: 15,
          feedback:
            "Hipotermi prevansiyonu — Isı battaniyesi / space blanket. Saha donuk koşulda ısı kaybı hızlı. Transfer süresince korunmalı.",
        },
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 14,
          feedback:
            "A (Antibiotics): Açık yara → Seftriakson 2g IV/IM. Saha antibiyotiği ertelenmez. TCCC protokolü: A (Antibiotics) MARCH-PAWS içinde yer alır.",
        },
        {
          action: { type: "give_medication", target_id: "traneksamik_asit" },
          points: 14,
          feedback:
            "TXA 2. doz — ilk dozdan >1 saat sonra veya >250 mL aktif kan kaybı devam ediyorsa. CRASH-2 2-doz protokolü. Zamanla etkinlik azalır, geciktirme.",
        },
        {
          action: { type: "use_equipment", target_id: "io_seti" },
          points: 12,
          feedback:
            "IO erişim — Zor IV durumunda intraosseöz. Sternum/tibial. Kan ürünü dahil her şey uygulanabilir. Hızlı ve güvenilir.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "TACEVAC hazırlığında bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 8 (YENİ) — 9-Liner MEDEVAC İletişimi
    // ====================================================
    {
      id: "s4b_medevac_9liner",
      kind: "decision",
      title: "9-Liner MEDEVAC — Tahliye İletişimi",
      prompt:
        "Helikopter geliyor. Telsizle 9-liner MEDEVAC raporu yapmanız gerekiyor. Doğru format hangisi?",
      narrative:
        "NATO STANAG 2087 — 9-liner standart MEDEVAC formatı. Eksik bilgi helikopter ekibini tehlikeye atar, tıbbi hazırlığı engeller.",
      options: [
        {
          id: "opt_tam_9liner",
          text: "1) Konum (grid) / 2) Frekans+callsign / 3) Hasta sayısı+öncelik (URGENT) / 4) Özel ekipman (yok) / 5) Hasta türü (litter x1) / 6) Güvenlik (düşman mümkün) / 7) Marking (mor duman) / 8) Milliyet+statü (Türk askeri) / 9) NBC (yok)",
          correct: true,
          points: 30,
          feedback:
            "Tam 9-liner — NATO STANAG 2087 standart. URGENT öncelik: hayati tehlike, <2 saat tahliye. Eksiksiz bilgi helikopterin güvenli inişi + tıbbi ekipman hazırlığını sağlar. TSK saha iletişim standardı.",
        },
        {
          id: "opt_kisa_rapor",
          text: "Konum + '1 yaralı var, bacak kanaması ve göğüs problemi, hızlı gelin'",
          correct: false,
          points: -10,
          feedback:
            "Eksik — Öncelik seviyesi, güvenlik durumu, özel ekipman ihtiyacı, işaret yöntemi eksik. Helikopter ekibi doğru hazırlık yapamaz.",
        },
        {
          id: "opt_serbest_format",
          text: "Durumu anlat: 'Patlama yaralısı, kan kaybı var, SpO₂ düşük, çabuk'",
          correct: false,
          points: -25,
          feedback:
            "Savaş alanı iletişim disiplini ihlali — Standart format zorunlu. Serbest konuşma frekanste gizliliği bozar, eksik bilgi operasyonel risk yaratır.",
        },
        {
          id: "opt_telefon",
          text: "Cep telefonu ile ara, telsiz protokolü atla",
          correct: false,
          points: -20,
          feedback:
            "Saha güvenlik protokolü ihlali — Cep telefonu sinyal takibi + şifresiz iletişim güvenlik açığı oluşturur. Taktik telsiz kullan.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 287,
    passing_score: 205,
    grade_bands: { A: 306, B: 255, C: 205, D: 153 },
  },

  debrief: {
    key_learnings: [
      "TCCC 3 Faz: Care Under Fire (CUF) → Tactical Field Care (TFC) → TACEVAC. Her fazın öncelik sırası farklı. CUF'ta yalnızca masif kanama kontrolü + kendi güvenlik.",
      "MARCH-PAWS: Massive hemorrhage → Airway → Respiration → Circulation → Hypothermia/Head → Pain → Antibiotics → Wounds → Splinting. Sırayla uygulanır.",
      "Vented chest seal (TCCC 2024): Açık pnömotoraks için tek yönlü valflı seal tercih. Non-vented eski standart — gerilimli PTX gelişimine engel olmaz.",
      "İğne dekompresyon lokasyonu: TCCC 2024 + JTS 2018 → 5. IKA midaksiller hat tercih (~%94 başarı). 2. ICS MCL hâlâ kabul edilir (~%46 başarı). Klinik dogmatizm yok.",
      "Lethal Triad (Genişletilmiş): Hipotermi + Asidoz + Koagülopati + Hipokalsemi (sitrat-iCa). Tümü eş zamanlı önlenmezse kısır döngü. DCR tüm bileşenleri hedefler.",
      "DCR (Damage Control Resuscitation): Permisif hipotansiyon (SBP 80-90 aktif kanama kontrolüne kadar) + Hemostaz resüsitasyonu (1:1:1 veya tam kan) + Erken TXA (<3h) + Hipotermi prevansiyonu.",
      "Whole blood (TCCC 2024 altın standart): Komponent terapiden üstün — trombosit işlevi korunmuş. TSK PWB protokolü.",
      "TXA zamanlaması kritik: <3h mortaliteyi azaltır (CRASH-2). >3h kanama riski artabilir. İki doz protokolü.",
      "9-liner MEDEVAC: NATO STANAG 2087 standart. URGENT = hayati tehlike, <2 saat tahliye. Eksik bilgi helikopter güvenliği ve tıbbi hazırlık sorununa yol açar.",
      "POC lab saha kararı için yeterli: HemoCue Hgb + Lactate Pro + i-STAT CG8+. Role 2 lab (INR/fibrinojen) beklemek sahada ölüm. POC verileri MTP başlatmak için yeterli.",
      "Tourniquet saha koşullarında gevşetilmez. <6 saat güvenli. Uygulama saati yazılmalı. Konversiyon Role 2/3'te uzman değerlendirmesiyle.",
    ],
    references: [
      "TCCC Guidelines CoTCCC 2024 (Committee on Tactical Combat Casualty Care, DoD)",
      "JTS Clinical Practice Guidelines 2018-2020 (Joint Trauma System) — DCR + Coagulopathy + MTP",
      "CRASH-2 Trial (Lancet 2010) + CRASH-3 (2019) — Traneksamik asit travmada",
      "NATO STANAG 2087 — MEDEVAC Procedures",
      "PHTLS Prehospital Trauma Life Support 9. Baskı (2020)",
      "ATLS 11. Baskı 2022",
      "TSK Sağlık Komutanlığı Saha Tıbbı Eğitim Modülü 2022",
      "Eastridge BJ et al. 'Death on the battlefield (2001-2011).' J Trauma 2012.",
      "Kotwal RS et al. 'The effect of a golden hour policy.' JAMA Surg 2016.",
    ],
    red_flags: [
      "Chest seal uygulanmadıysa → açık pnömotoraks → kardiyovasküler çöküş dakikalar içinde",
      "İğne dekompresyon gecikirse gerilimli PTX → kardiyak arrest",
      "TXA >3 saat verilmesi — kanama artışı riski (CRASH-2)",
      "Role 2 lab bekleyerek MTP ertelenmesi → laktat yükselir, BE düşer, TIC ilerler",
      "iCa düşüklüğü ile masif transfüzyon → kardiyak depresyon, arrest riski",
      "Tourniket sahada gevşetilmesi → reperfüzyon şoku + aktif kanama yeniden",
      "Hipotermi kontrolsüz → koagülopati + asidoz → Lethal Triad kısır döngüsü",
    ],
    next_scenarios: [],
  },
};
