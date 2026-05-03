import type { Scenario } from "@/engine";

// ============================================================
// STEMI Senaryosu — Anterior STEMI, 62y Erkek
// ============================================================
// Zorluk seviyeleri 1-5 destekli.
// S1-2: Temel tanı ve ABCDE, ASA+P2Y12+heparin+PCI
// S3:   + Aort diseksiyonu ekartasyonu, kapı-balon hesabı, EKG nüansları
// S4-5: + Tikagrelor/prasugrel seçimi, sağ ventrikül/posterior MI kontrolü,
//         PCI sonrası yönetim (DAPT, statin, ACEi), komplikasyon dalı
// ============================================================

export const scenario_stemi: Scenario = {
  id: "kardiyoloji-stemi-001",
  version: "0.3.0",
  title: "62 Yaş Erkek — Akut Göğüs Ağrısı (STEMI)",
  description:
    "2 saattir süren retrosternal göğüs ağrısı, sol kola yayılan. STEMI yönetimi ve reperfüzyon kararı. Lab paralel akış, troponin kinetik, yatak başı EKO ve kardiyojenik şok yönetimi.",
  specialty: "kardiyoloji",
  tags: ["stemi", "acil", "kardiyak", "ekg", "reperfüzyon"],
  difficulty: 3,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 18,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2023, AHA/ACC 2022, TKD 2022 uyumlu",
  last_updated: "2026-04-23",

  patient: {
    age: 62,
    sex: "M",
    weight_kg: 84,
    height_cm: 174,
    chief_complaint:
      "2 saat önce başlayan, sol kola yayılan, sıkıştırıcı göğüs ağrısı. İstirahatte geçmiyor.",
    history_items: [
      "HT (20 yıl, düzensiz ilaç kullanımı)",
      "DM Tip 2 (8 yıl, metformin)",
      "30 paket-yıl sigara",
      "Babası 58 yaşında MI'dan ex",
    ],
    allergies: [],
    current_medications: ["Metformin 1000 mg 2x1", "Ramipril 5 mg 1x1"],
    modifiers: {
      // Farmakoloji motoru için: hasta herhangi bir özel çarpan durumunda değil.
      // (ACEi kullanımı klasik modifier'a girmez)
    },
  },

  initial_vitals: {
    hr: 104,
    bp_systolic: 148,
    bp_diastolic: 92,
    spo2: 94,
    temp: 36.7,
    rr: 22,
    pain: 8,
    glucose: 186,
    gcs: 15,
  },

  available_medications: [
    "aspirin",
    "klopidogrel",
    "tikagrelor",        // S4-5
    "prasugrel",         // S4-5
    "heparin",
    "enoksaparin",       // S3+
    "nitrogliserin",
    "metoprolol",
    "morfin",
    "fentanil",
    "tenecteplase",
    "atropin",
    "adrenalin",
    "amiodaron",         // VT/VF dalı için
    "lidokain",          // VT alternatifi
    "norepinefrin",      // Kardiyojenik şok: 1. tercih vazopressör (SOAP-II)
    "dobutamin",         // Kardiyojenik şok: inotropik destek
    "dopamin",           // Kardiyojenik şok: eski seçenek (SOAP-II'de kötü)
    "furosemid",         // Pulmoner ödem
    "atorvastatin",      // Yüksek doz statin (80 mg) — sekonder profilaksi
  ],

  available_equipment: [
    "ekg_12",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "monitor",
    "oksijen_maske",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "defibrilator",
    "stetoskop",
    "ekokardiyografi",
    "kan_gazi_cihazi",
  ],

  ekg_pattern: "stemi",

  lab_panels: {
    "stemi-troponin-hs": {
      id: "stemi-troponin-hs",
      name_tr: "Troponin I hs + CK-MB (Kardiyak Belirteçler)",
      collected_at_min: 15,
      comment:
        "⚠️ STEMI tanısı klinik + EKG ile konur — troponin BEKLENMEZ. Paralel istenir, risk stratifikasyonu + infarkt boyutu için.",
      results: [
        {
          parameter: "Troponin I hs (Baseline)",
          value: 0.45,
          unit: "ng/mL",
          reference_range: "<0.04",
          flag: "HH",
          interpretation:
            "Yüksek baseline — STEMI'de beklenen erken yükseliş. Klinik+EKG tanısını destekler. Kinetik değerlendirme için 3. saatte tekrar.",
        },
        {
          parameter: "CK-MB",
          value: 78,
          unit: "U/L",
          reference_range: "<25",
          flag: "HH",
          interpretation:
            "Yükselmiş — miyokard hasarı ile uyumlu. İnfarkt boyutu ve kinetik için seri ölçüm.",
        },
      ],
    },
    "stemi-cbc-bmp": {
      id: "stemi-cbc-bmp",
      name_tr: "CBC + BMP — Kontrast Öncesi Değerlendirme",
      collected_at_min: 10,
      comment: "Hızlı acil lab — 10dk. Kontrast güvenliği + elektrolit için kritik.",
      results: [
        {
          parameter: "Hemoglobin",
          value: 13.8,
          unit: "g/dL",
          reference_range: "13.5-17.5",
          interpretation: "Normal — PCI öncesi baseline.",
        },
        {
          parameter: "WBC",
          value: 11200,
          unit: "/μL",
          reference_range: "4500-11000",
          flag: "H",
          interpretation: "Hafif yüksek — stres/inflamasyon.",
        },
        {
          parameter: "Trombosit",
          value: 218000,
          unit: "/μL",
          reference_range: "150.000-400.000",
        },
        {
          parameter: "Kreatinin (Cr)",
          value: 1.0,
          unit: "mg/dL",
          reference_range: "0.7-1.3",
          interpretation:
            "Normal — eGFR >60. Kontrast güvenli. Cr <1.5 → kontrast nefropatisi riski düşük.",
        },
        {
          parameter: "BUN",
          value: 18,
          unit: "mg/dL",
          reference_range: "7-20",
        },
        {
          parameter: "Glukoz",
          value: 165,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
          interpretation:
            "Stres hiperglisemisi — DM Tip 2 hastada beklenen. Akut faz hedefi <180 mg/dL.",
        },
        {
          parameter: "Potasyum (K)",
          value: 4.3,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
          interpretation:
            "Normal — aritmik aralık içinde güvenli. Hipokalemi (<3.5) VT/VF riskini artırır.",
        },
        {
          parameter: "Sodyum (Na)",
          value: 139,
          unit: "mEq/L",
          reference_range: "136-145",
        },
      ],
    },
    "stemi-coag-lipid": {
      id: "stemi-coag-lipid",
      name_tr: "Koagülasyon + Lipid Profili",
      collected_at_min: 30,
      comment:
        "Heparin öncesi baseline + sekonder profilaksi planlama. Sonuç geç (30dk) — akut PCI kararını etkilemez.",
      results: [
        {
          parameter: "PT/INR",
          value: 1.0,
          unit: "",
          reference_range: "0.8-1.2",
          interpretation: "Normal — heparin öncesi baseline.",
        },
        {
          parameter: "aPTT",
          value: 28,
          unit: "saniye",
          reference_range: "25-36",
          interpretation: "Normal — antikoagülan naif.",
        },
        {
          parameter: "Fibrinojen",
          value: 310,
          unit: "mg/dL",
          reference_range: "200-400",
          interpretation: "Normal sınır — akut faz reaktanı olarak hafif yüksek beklenir.",
        },
        {
          parameter: "LDL Kolesterol",
          value: 138,
          unit: "mg/dL",
          reference_range: "<100 (genel), <55 (ACS)",
          flag: "HH",
          interpretation:
            "Yüksek risk profili. ACS sonrası ESC 2023 hedef <55 mg/dL (Class I). Atorvastatin 80mg veya rosuvastatin 40mg başla.",
        },
        {
          parameter: "HDL Kolesterol",
          value: 38,
          unit: "mg/dL",
          reference_range: ">40",
          flag: "L",
          interpretation: "Düşük koruyucu HDL — kardiyovasküler risk artışı.",
        },
        {
          parameter: "Trigliserid",
          value: 180,
          unit: "mg/dL",
          reference_range: "<150",
          flag: "H",
          interpretation: "Hafif yüksek — DM + sigara ile uyumlu metabolik profil.",
        },
      ],
    },
    "stemi-abg-lactate": {
      id: "stemi-abg-lactate",
      name_tr: "Kan Gazı + Laktat (Pompa Fonksiyon Değerlendirmesi)",
      collected_at_min: 10,
      comment:
        "Hafif pompa yetmezliği bulguları — kardiyojenik şok eşiğinde değil ama yakın izlem gerekli.",
      results: [
        {
          parameter: "pH",
          value: 7.36,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "Normal sınır — hafif kompanze.",
        },
        {
          parameter: "pCO2",
          value: 36,
          unit: "mmHg",
          reference_range: "35-45",
        },
        {
          parameter: "pO2",
          value: 88,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "L",
          interpretation:
            "Hafif hipoksemi oda havasında — SpO2 %94 ile uyumlu. Destekleyici O2 tartışmalı.",
        },
        {
          parameter: "HCO3",
          value: 22,
          unit: "mEq/L",
          reference_range: "22-26",
        },
        {
          parameter: "Laktat",
          value: 2.4,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "H",
          interpretation:
            "Sınırda yüksek — kardiyojenik şok eşiğinde değil (>2.0 hafif, >4.0 şok). Yakın izlem zorunlu. PCI sonrası trend kritik.",
        },
      ],
    },
  },

  result_delay_seconds: {
    "stemi-troponin-hs": 900,
    "stemi-cbc-bmp": 600,
    "stemi-coag-lipid": 1800,
    "stemi-abg-lactate": 600,
  },

  lab_timeline: [
    {
      at_minute: 10,
      panel_id: "stemi-cbc-bmp",
      results: [
        {
          parameter: "Kreatinin (Cr)",
          value: 1.0,
          unit: "mg/dL",
          reference_range: "0.7-1.3",
          interpretation:
            "Doğrulandı: Cr 1.0 — kontrast güvenli. eGFR >60. PCI öncesi yeşil ışık.",
        },
        {
          parameter: "Potasyum (K)",
          value: 4.3,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
          interpretation:
            "Aritmik risk düşük — K normal. Hipokalemi yoksa antiaritmik ek önlem gerekmez.",
        },
      ],
    },
    {
      at_minute: 180,
      panel_id: "stemi-troponin-hs",
      results: [
        {
          parameter: "Troponin I hs (3. Saat Tekrar)",
          value: 3.8,
          unit: "ng/mL",
          reference_range: "<0.04",
          flag: "HH",
          interpretation:
            "Kinetik artış: 0.45 → 3.8 ng/mL (8x). Anlamlı yükseliş — STEMI doğrulandı. İnfarkt boyutu göstergesi, EF düşüklüğü ile korelasyon.",
        },
        {
          parameter: "CK-MB (3. Saat)",
          value: 210,
          unit: "U/L",
          reference_range: "<25",
          flag: "HH",
          interpretation:
            "Pik yükseliş — miyokard hasarı devam ediyor. CK-MB/CK oranı reinfarkt tespitinde değerli.",
        },
      ],
    },
    {
      at_minute: 240,
      panel_id: "stemi-abg-lactate",
      results: [
        {
          parameter: "pH",
          value: 7.28,
          unit: "",
          reference_range: "7.35-7.45",
          flag: "L",
          interpretation:
            "Asidoz gelişiyor — kardiyojenik şok ilerliyor. Acil vazopressör + inotropik destek.",
        },
        {
          parameter: "Laktat",
          value: 4.5,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation:
            "KRİTİK — Laktat >4.0: Kardiyojenik şok eşiği aşıldı. s7b adımı: norepinefrin + dobutamin + IABP/Impella konsültasyonu.",
        },
        {
          parameter: "pO2",
          value: 72,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "L",
          interpretation:
            "Hipoksemi artıyor — pulmoner ödem. Oksijen destek, CPAP veya entübasyon hazırlığı.",
        },
      ],
    },
  ],

  medication_timing_overrides: {
    aspirin:       { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    klopidogrel:   { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    tikagrelor:    { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    prasugrel:     { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    heparin:       { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    enoksaparin:   { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    nitrogliserin: { onset_sec: 2, peak_min: 0.133, duration_min: 0.5  },
    metoprolol:    { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    morfin:        { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    fentanil:      { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    tenecteplase:  { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    atropin:       { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    adrenalin:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    amiodaron:     { onset_sec: 2, peak_min: 0.133, duration_min: 0.5  },
    lidokain:      { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
  },

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ========================================================
    // ADIM 1 — İlk değerlendirme (tüm seviyelerde)
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "62 yaş erkek, 2 saat önce başlayan göğüs ağrısı. Acile yeni geldi. İlk 5 dakikada ne yapacaksın?",
      narrative:
        "Hasta soluk, terli ve ağrılı görünüyor. Taşikardik. Sağ kolda tansiyon ölçülüyor.",
      min_actions: 3,
      max_actions: 8,
      expected_outcomes: [
        // ── Yüksek öncelik (monitörizasyon, EKG, damar yolu) ──────────
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "✓ Kardiyak monitörizasyon — sürekli ritim ve aritmi takibi şart.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback: "✓ SpO₂ sürekli ölçümü açıldı.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 20,
          feedback:
            "✓ ESC 2023 Class I — ilk 10 dakikada 12 derivasyonlu EKG zorunlu.",
          unlocks: ["s2_ekg_yorumu"],
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "✓ Geniş lümenli IV yol — ilaç ve sıvı için.",
        },
        // SpO2 %94 — seviyeye göre iki ayrı outcome
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 5,
          feedback:
            "O₂ verildi. SpO₂ sınırda, başlangıç seviyesinde kabul edilebilir refleks.",
          max_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 0,
          feedback:
            "SpO₂ %94 — rutin O₂ endike değil (AVOID trial, ESC 2023). Hipoksi (<90%) yoksa gereksiz, hatta zararlı olabilir.",
          min_difficulty: 3,
        },
        // Aort diseksiyonu ekartasyonu (S3+)
        {
          action: { type: "examine", target_id: "bilateral_kol_tansiyon" },
          points: 10,
          feedback:
            "✓ Aort diseksiyonu ekartasyonu için iki kolda TA farkı (>20 mmHg) değerlendirilmeli.",
          min_difficulty: 3,
        },
        {
          action: { type: "examine", target_id: "nabiz_muayenesi" },
          points: 8,
          feedback:
            "✓ Nabız asimetrisi ve radyofemoral gecikme diseksiyon için önemli ipucu.",
          min_difficulty: 4,
        },
        // ── Klinik olarak doğru ama ana adım değil (antiplatelet/antikoagülan) ──
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: 10,
          feedback:
            "✓ ESC 2023 Class I — aspirin 150-300 mg çiğneme STEMI şüphesinde ilk temasta verilir. Erken ama doğru.",
        },
        {
          action: { type: "give_medication", target_id: "klopidogrel" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil. (S3-4'te tikagrelor/prasugrel tercih edilir.)",
        },
        {
          action: { type: "give_medication", target_id: "tikagrelor" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil.",
        },
        {
          action: { type: "give_medication", target_id: "prasugrel" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil. DİKKAT: İnme öyküsü ve 75+ yaşta kontrendike.",
        },
        {
          action: { type: "give_medication", target_id: "heparin" },
          points: 5,
          feedback:
            "✓ Antikoagülan reperfüzyon öncesi standart. Bu adımda erken ama klinik olarak makul.",
        },
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: 5,
          feedback:
            "✓ Antikoagülan reperfüzyon öncesi standart. Bu adımda erken ama klinik olarak makul.",
        },
        // ── Klinik olarak yanlış veya zararlı ─────────────────────────
        {
          action: { type: "give_medication", target_id: "lidokain" },
          points: -10,
          feedback:
            "✗ STEMI'de profilaktik lidokain ÖNERİLMEZ (ESC 2023). Sadece sürekli VT/VF varlığında — hasta şu an stabil.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback:
            "✗ Morfin rutin değil — CRUSADE: mortalite artışı. Nitrata dirençli ağrıda düşünülür. Henüz nitrat denenmeden erken.",
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -5,
          feedback:
            "✗ Erken IV beta-bloker ilk değerlendirmede öncelik değil. COMMIT: kardiyojenik şok riski. Hemodinamik stabilizasyon sonrası oral form düşünülür.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -3,
          feedback:
            "Erken IV beta-bloker tartışmalı. COMMIT: kardiyojenik şok riskini artırır. İlk değerlendirmede öncelik değil.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "Bu adımda klinik öncelik değil. Sıralama önemli — önce monitör, EKG, damar yolu.",
    },

    // ========================================================
    // ADIM 2 — EKG yorumu (tüm seviyelerde, nüanslar seviyeye göre)
    // ========================================================
    {
      id: "s2_ekg_yorumu",
      kind: "decision",
      title: "EKG Yorumu",
      prompt: "EKG çıktısını değerlendirin.",
      narrative: "V1-V4 derivasyonlarında belirgin ST elevasyonu mevcut.",
      display: {
        type: "ecg",
        asset: "ecg_anterior_stemi.png",
        caption: "12 derivasyonlu EKG (25 mm/sn, 10 mm/mV)",
      },
      options: [
        {
          id: "opt_anterior_stemi",
          text: "Anterior STEMI (V1-V4 ST elevasyonu)",
          correct: true,
          points: 30,
          feedback:
            "Doğru tanı. Anterior STEMI — LAD oklüzyonu muhtemel. Acil reperfüzyon endikasyonu.",
        },
        {
          id: "opt_anterior_stemi_lad_proksimal",
          text:
            "Anterior STEMI — proksimal LAD (V1-V4 + aVR ST elevasyonu, I/II resiprok)",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — proksimal LAD oklüzyonu daha agresif yaklaşım gerektirir, mortalite yüksek.",
          min_difficulty: 4,
        },
        {
          id: "opt_nstemi",
          text: "NSTEMI",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — ST elevasyonu açıkça var, bu STEMI'dir. NSTEMI'de ST elevasyonu olmaz.",
        },
        {
          id: "opt_perikardit",
          text: "Akut perikardit",
          correct: false,
          points: -10,
          feedback:
            "Perikarditte ST elevasyonu diffüz ve konkav olur. Burada lokalize (anterior), konveks — STEMI.",
        },
        {
          id: "opt_erken_repolarizasyon",
          text: "Erken repolarizasyon varyantı",
          correct: false,
          points: -20,
          feedback:
            "Klinik tablo (ağrı + risk faktörleri) ile uyumsuz. Asla STEMI'yi erken repolarizasyona bağlama.",
        },
      ],
    },

    // ========================================================
    // ADIM 2b — Ek derivasyon kontrolü (S3+)
    // ========================================================
    {
      id: "s2b_ek_derivasyonlar",
      kind: "decision",
      allow_multiple: true,
      partial_credit: true,
      title: "Ek Derivasyon Kontrolü",
      prompt:
        "Anterior STEMI tanısı için ek derivasyonlardan hangisini incelersiniz?",
      narrative:
        "Anterior STEMI'de sağ ventrikül ve posterior duvar tutulumu mortalite/tedavi stratejisini değiştirir.",
      min_difficulty: 3,
      options: [
        {
          id: "opt_v4r",
          text:
            "V4R (sağ prekordiyal) — sağ ventrikül MI ekartasyonu için",
          correct: true,
          points: 15,
          feedback:
            "Doğru — özellikle inferior MI + hipotansiyon varsa V4R ST elevasyonu sağ ventrikül tutulumunu gösterir. Anterior MI'da da proksimal LAD'de görülebilir.",
        },
        {
          id: "opt_v7_v9",
          text: "V7-V9 (posterior) — posterior duvar tutulumu için",
          correct: true,
          points: 12,
          feedback:
            "Doğru — V1-V3'te ST depresyonu varsa posterior MI şüphesi. V7-V9'da ST elevasyonu tanıyı koyar.",
        },
        {
          id: "opt_hic",
          text: "Ek derivasyon gerekli değil, tanı net",
          correct: false,
          points: -8,
          feedback:
            "Yetersiz — tedavi kararı ek derivasyonlara göre değişebilir (sağ ventrikül MI'da nitrat dikkatli, inferior pattern'de RCA/LCX ayrımı için).",
        },
      ],
    },

    // ========================================================
    // ADIM 3 — İlk tıbbi tedavi
    // ========================================================
    {
      id: "s3_ilk_tedavi",
      kind: "action",
      title: "İlk Tıbbi Tedavi",
      prompt:
        "STEMI tanısı kondu. Reperfüzyon öncesi verilecek ilaçları seçin.",
      min_actions: 3,
      expected_outcomes: [
        // ASA — her seviyede
        {
          action: {
            type: "give_medication",
            target_id: "aspirin",
            dose: "300 mg",
          },
          points: 20,
          feedback:
            "Doğru — 300 mg ASA çiğnetilerek, class I endikasyon (tüm kılavuzlar).",
        },
        // P2Y12 — Klopidogrel (her seviye) vs tikagrelor/prasugrel (S4-5)
        {
          action: {
            type: "give_medication",
            target_id: "klopidogrel",
            dose: "600 mg",
          },
          points: 15,
          feedback:
            "Doğru — P2Y12 inhibitörü. Yükleme 600 mg PCI planlıysa. Seviye 4-5'te tikagrelor/prasugrel de seçenek.",
          max_difficulty: 3,
        },
        {
          action: {
            type: "give_medication",
            target_id: "klopidogrel",
            dose: "600 mg",
          },
          points: 10, // Düşürüldü: S4-5'te tikagrelor/prasugrel tercih edilmeli
          feedback:
            "Kabul edilebilir ama ESC 2023'te ACS'de tikagrelor veya prasugrel klopidogrele tercih edilir (class I). Klopidogrel: tikagrelor/prasugrel mevcut değilse veya kontrendike ise.",
          min_difficulty: 4,
        },
        {
          action: {
            type: "give_medication",
            target_id: "tikagrelor",
            dose: "180 mg",
          },
          points: 20,
          feedback:
            "Doğru — ESC 2023 class I, ACS'de klopidogrele üstün (PLATO). Yükleme 180 mg.",
          min_difficulty: 4,
        },
        {
          action: {
            type: "give_medication",
            target_id: "prasugrel",
            dose: "60 mg",
          },
          points: 20,
          feedback:
            "Doğru — primer PCI planlanan STEMI'de tikagrelor ile eşdeğer (class I). DİKKAT: İnme öyküsü veya 75+ yaş → kontrendike/dikkatli.",
          min_difficulty: 4,
        },
        // Antikoagülan
        {
          action: {
            type: "give_medication",
            target_id: "heparin",
            dose: "5000 IU",
          },
          points: 15,
          feedback:
            "Doğru — reperfüzyon öncesi antikoagülasyon. 60 IU/kg bolus (bu hastada 84×60=5040, max 4000 IU; yaklaşık 5000 IU klinik kabul).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "enoksaparin",
          },
          points: 12,
          feedback:
            "Kabul — özellikle tromboliz planlanıyorsa tercih edilebilir. Primer PCI'de heparin daha yaygın.",
          min_difficulty: 3,
        },
        // Nitrogliserin — konteks-bağımlı
        {
          action: { type: "give_medication", target_id: "nitrogliserin" },
          points: 5,
          feedback:
            "Ağrı için sublingual verilebilir. Hasta normotansif (SBP 148), güvenli. Sağ ventrikül MI ekarte edilmişse daha güvenli.",
        },
        // Morfin — koşullu (nitrattan önce: -5; sonrası dirençli ağrı: +5)
        // Basit versiyon: şimdi -5 (dirençli ağrı kontrolü sonraki adımda)
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback:
            "Önce nitrat denenmeli. Rutin morfin önerilmiyor (CRUSADE, mortalite↑). Nitrata dirençli ağrıda ek olarak düşünülür.",
        },
        // Metoprolol — erken IV beta-bloker
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -5, // Eskiden -15, kritik değil
          feedback:
            "Tartışmalı — hasta stabil (HR 104, SBP 148), mutlak kontrendike değil ama öncelik yok (COMMIT). PCI sonrası oral beta-bloker rutin, erken IV sadece refrakter iskemi/hipertansiyonda.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -3,
          feedback:
            "Tartışmalı ve zamanlaması önemli. COMMIT: erken IV beta-bloker kardiyojenik şok riskini artırır. Hemodinamik stabilse oral form gün içinde düşünülebilir. Seviye 3+ için: klinik yargı.",
          min_difficulty: 3,
        },
        // Lab paralel akış — PCI'yi geciktirmeden
        {
          action: { type: "order_test", target_id: "stemi-troponin-hs" },
          points: 10,
          feedback:
            "✓ Troponin paralel istendi — doğru. STEMI tanısı klinik+EKG'ye dayanır, troponin beklenmez. Paralel akış, PCI'yi geciktirmez.",
        },
        {
          action: { type: "order_test", target_id: "stemi-cbc-bmp" },
          points: 10,
          feedback:
            "✓ CBC+BMP paralel istendi — kontrast öncesi Cr değerlendirmesi için kritik. 10 dakikada sonuç, PCI hazırlığını geciktirmez.",
        },
        {
          action: { type: "order_test", target_id: "stemi-abg-lactate" },
          points: 8,
          feedback:
            "✓ Kan gazı + laktat — pompa fonksiyonu baseline için. Laktat 2.4 (sınırda), kardiyojenik şok riski izlemine ekle.",
        },
        {
          action: { type: "examine", target_id: "troponin_sonucu_bekle" },
          points: -15,
          feedback:
            "✗ Troponin için PCI'yi bekleme — 'Time is myocardium'. STEMI tanısı EKG ile konur, troponin destekleyici. Beklersen kapı-balon hedefi kaçar.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Reperfüzyon öncesi standart tedavide yer almıyor.",
    },

    // ========================================================
    // ADIM 3b (YENİ) — Lab paralel akış + kontrast değerlendirme
    // ========================================================
    {
      id: "s3b_lab_review",
      kind: "decision",
      title: "Lab Paralel Akış — Kontrast + Lipid + Risk Değerlendirmesi",
      prompt:
        "Lab sonuçları geliyor (CBC+BMP erken, troponin takip): Troponin I hs 0.45 ng/mL (yüksek), Cr 1.0 mg/dL, LDL 138 mg/dL, K 4.3 mEq/L, Laktat 2.4 mmol/L (sınırda). Lab bulgularına göre yaklaşımınız?",
      narrative:
        "Paralel akış: Lab PCI'yi geciktirmez ama bilgileri akut ve uzun vadeli kararları şekillendirir.",
      options: [
        {
          id: "opt_tam_degerl",
          text: "Cr 1.0 → kontrast güvenli (onay), troponin kinetik 3h tekrar planla, atorvastatin 80mg hemen başla (LDL hedef <55, ESC 2023), laktat izleme defterine ekle",
          correct: true,
          points: 30,
          feedback:
            "Mükemmel — tam paralel akış değerlendirmesi. Cr 1.0: kontrast güvenli (eGFR >60). Troponin kinetik: tanıyı destekler, infarkt boyutunu gösterir. Yüksek doz statin akut fazda başlanır (ESC 2023 Class I). Laktat 2.4: sınır değer, kardiyojenik şok erken sinyali.",
        },
        {
          id: "opt_sadece_troponin",
          text: "Troponin'e bak, yüksek — STEMI doğrulandı, devam et",
          correct: false,
          points: 10,
          feedback:
            "Yetersiz — troponin zaten PCI kararını değiştirmez (EKG tanısı). LDL sekonder profilaksi fırsatı kaçırıldı, kontrast güvenliği atlandı, laktat izlemi eksik.",
        },
        {
          id: "opt_kontrast_cr_siz",
          text: "Cr sonucu gelmeden kontrast ver, zaman kaybetme",
          correct: false,
          points: -25,
          feedback:
            "Hatalı — bilinmeyen renal fonksiyon → kontrast nefropatisi riski. Cr 10 dakikada gelir, PCI'yi geciktirmez. Akut renal yetmezlik STEMI mortalitesini artırır.",
        },
        {
          id: "opt_statin_gec",
          text: "Statin taburculuğa bırak, şimdi öncelik değil",
          correct: false,
          points: -15,
          feedback:
            "ESC 2023 Class I ihlali — Yüksek doz statin akut fazda başlanır. Taburculuğa bırakmak uyumu azaltır. LDL 138 → hedef <55: agresif sekonder profilaksi acilen.",
        },
      ],
    },

    // ========================================================
    // ADIM 4 — Reperfüzyon kararı (tüm seviyelerde)
    // ========================================================
    {
      id: "s4_reperfuzyon_karari",
      kind: "decision",
      title: "Reperfüzyon Stratejisi",
      prompt:
        "Hastaneniz PCI merkezine 45 dakika uzakta. Ağrı başlangıcından 2 saat geçti. Ne yaparsınız?",
      options: [
        {
          id: "opt_pci_transfer",
          text:
            "Primer PCI için transfer — kapı-balon < 120 dk hedefiyle acil sevk",
          correct: true,
          points: 30,
          feedback:
            "Doğru — ilk tıbbi temastan PCI'ye <120 dk sağlanabiliyorsa primer PCI tercih edilir (ESC 2023).",
        },
        {
          id: "opt_pci_hesapla",
          text:
            "Kapı-balon süresini hesapla: 45 dk yol + ~30 dk hastane işlemi = 75 dk. <120 dk uygun, PCI için transfer.",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — klinik muhakeme doğru. İlk tıbbi temas-balon süresi hedef <120 dk (primer PCI), <180 dk (tromboliz sonrası kurtarma PCI).",
          min_difficulty: 3,
        },
        {
          id: "opt_tromboliz",
          text: "Hemen tromboliz (tenekteplaz) yap",
          correct: false,
          points: 10,
          feedback:
            "Geçerli bir seçenek — ancak PCI <120 dk sağlanabilirse PCI önceliklidir. PCI mümkün değilse (120+ dk) tromboliz.",
        },
        {
          id: "opt_bekle",
          text: "Medikal tedaviyle izle, ağrı geçerse taburcu et",
          correct: false,
          points: -40,
          feedback:
            "KRİTİK HATA — STEMI'de reperfüzyon yapılmadan hasta izlenemez. Mortalite riski çok yüksek.",
        },
        {
          id: "opt_koroner_yogun",
          text:
            "Koroner yoğun bakıma yatış, sabah kateter laboratuvarına gönder",
          correct: false,
          points: -35,
          feedback:
            "Hatalı — STEMI zaman kritik. 'Time is muscle.' Sabaha ertelenemez.",
        },
      ],
    },

    // ========================================================
    // ADIM 5 — Transfer öncesi stabilizasyon
    // ========================================================
    {
      id: "s5_transfer_oncesi",
      kind: "action",
      title: "Transfer Öncesi Stabilizasyon",
      prompt: "PCI transferi başlamadan önce son kontrol.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "defibrilator" },
          points: 15,
          feedback:
            "Doğru — VT/VF riski yüksek. Defibrilatör hazır olmalı, pedler yapıştırılmalı.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — transfer boyunca monitörizasyon sürsün.",
        },
        {
          action: { type: "examine", target_id: "vitaller" },
          points: 10,
          feedback: "Doğru — transfer öncesi son vital kontrolü şart.",
        },
        {
          action: { type: "consult", target_id: "kardiyoloji" },
          points: 10,
          feedback:
            "Doğru — PCI merkezine ön bildirim, kapı-balon süresini kısaltır. Hastanede kateter lab önceden hazır olmalı.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Transfer öncesi bu aksiyon öncelik değil.",
    },

    // ========================================================
    // ADIM 6 — PCI sonrası yönetim (S3+)
    // ========================================================
    {
      id: "s6_pci_sonrasi",
      kind: "action",
      title: "PCI Sonrası Yönetim",
      prompt:
        "PCI başarılı, LAD'ye stent. Taburculuk öncesi / sonrası hangi tedavileri başlatırsınız?",
      min_actions: 3,
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: {
            type: "decision",
            target_id: "dapt_1_yil",
          },
          points: 15,
          feedback:
            "Doğru — ikili antiplatelet (ASA + P2Y12) 12 ay standart. Yüksek kanama riski: 6 aya düşürülebilir. Yüksek iskemik risk: 1 yılın üzerine çıkarılabilir.",
        },
        {
          action: {
            type: "decision",
            target_id: "statin_yuksek_doz",
          },
          points: 12,
          feedback:
            "Doğru — atorvastatin 40-80 mg veya rosuvastatin 20-40 mg; LDL<55 hedefi (ESC 2023, class I).",
        },
        {
          action: {
            type: "decision",
            target_id: "acei_arb",
          },
          points: 10,
          feedback:
            "Doğru — özellikle anterior MI, düşük EF, HT, DM varsa ACEi/ARB mortaliteyi azaltır. Hasta zaten ramipril alıyor.",
        },
        {
          action: {
            type: "decision",
            target_id: "oral_beta_bloker",
          },
          points: 10,
          feedback:
            "Doğru — hemodinamik stabilde oral beta-bloker başlanır (metoprolol süksinat veya bisoprolol).",
        },
        {
          action: {
            type: "decision",
            target_id: "mra",
          },
          points: 8,
          feedback:
            "Doğru (opsiyonel) — EF<%40 + DM veya HF belirtisi varsa spironolakton/eplerenon düşünülür.",
          min_difficulty: 4,
        },
        {
          action: {
            type: "give_medication",
            target_id: "atorvastatin",
            dose: "80 mg",
          },
          points: 15,
          feedback:
            "Doğru — Atorvastatin 80 mg yüksek doz statin. ACS akut fazında başlanır (ESC 2023 Class I). LDL hedef <55 mg/dL. Plak stabilizasyonu + antiinflamatuvar etki.",
        },
        {
          action: { type: "order_test", target_id: "stemi-eko-yatakbasi" },
          points: 12,
          feedback:
            "✓ Yatak başı EKO — EF %38 (orta düşük). Anterior hipokinezi/akinezi. Mekanik komplikasyon ekartandı. ICD endikasyonu değerlendirmesi için 40. günde EF tekrar bakılmalı.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "PCI sonrası sekonder korumada rutin değil.",
    },

    // ========================================================
    // ADIM 7 — Komplikasyon dalı: VT/VF (dinamik, S3+)
    // ========================================================
    // Bu adım normal akışta açılmaz. Senaryoda aspirin verilmezse veya
    // reperfüzyon gecikirse motor tarafından unlock edilmek üzere hazır.
    // Şimdilik statik olarak flow'a eklemiyoruz; dynamic_unlock sisteminde
    // konumlandırılacak.
    {
      id: "s7_vt_vf_komplikasyonu",
      kind: "action",
      title: "Komplikasyon: VT/VF",
      prompt:
        "Monitörde geniş QRS taşikardi → VF! Yapılacakları sıralayın.",
      narrative: "Hasta nabız ve bilinç kaybediyor. Asistoli değil, VF.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "defibrilator" },
          points: 25,
          feedback:
            "Doğru — VF'de ilk ve en önemli müdahale defibrilasyon (200 J bifazik).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "adrenalin",
            dose: "1 mg",
          },
          points: 15,
          feedback:
            "Doğru — refrakter VF/VT'de 3-5 dk'da bir 1 mg IV (ACLS).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "amiodaron",
            dose: "300 mg",
          },
          points: 15,
          feedback:
            "Doğru — 3 şoka refrakter VF/VT'de 300 mg IV bolus.",
        },
        {
          action: {
            type: "give_medication",
            target_id: "lidokain",
          },
          points: 10,
          feedback:
            "Kabul — amiodaron yoksa alternatif. ACLS'de ikinci tercih.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback:
        "VF yönetiminde öncelik değil. Defib-adrenalin-amiodaron sırası.",
    },

    // ========================================================
    // ADIM 7b (YENİ) — Post-PCI Pump Failure / Kardiyojenik Şok
    // ========================================================
    {
      id: "s7b_kardiyojenik_sok_pump_failure",
      kind: "decision",
      title: "Post-PCI Kardiyojenik Şok — Pump Failure",
      prompt:
        "PCI başarılı (TIMI 3 akım), LAD'ye stent. 4 saat sonra: BP 85/55, HR 110, SpO₂ 91%, bilateral akciğer krepitasyonu, idrar çıkışı azaldı. Laktat 4.5 mmol/L (kritik). EKO tekrar: EF %28, pulmoner ödem bulguları. Kardiyojenik şok + akut pulmoner ödem. Yaklaşımınız?",
      narrative:
        "Post-PCI kardiyojenik şok — reperfüze edilmiş miyokardın iyileşmesi zaman alır ('stunned myocardium'). Mekanik komplikasyon ve re-oklüzyon ekartandı.",
      min_difficulty: 3,
      options: [
        {
          id: "opt_norepinefrin_dobutamin",
          text: "Norepinefrin 0.1-0.3 mcg/kg/dk (MAP ≥65 hedef) + Dobutamin 5-10 mcg/kg/dk (inotropik) + Furosemid IV (pulmoner ödem) + Sıvı kısıtla + Tekrar koroner anjio planla (re-oklüzyon ekartasyonu)",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — ESC 2023 + SOAP-II kılavuzu. Norepinefrin: 1. tercih vazopressör (dopamine üstün, SOAP-II 2010). Dobutamin: inotropik destek. Furosemid: pulmoner ödem boşaltması. Tekrar anjio: stent trombozu/re-oklüzyon ekartasyonu zorunlu. IABP/Impella konsültasyonu (DanGer Shock 2024 pozitif sinyal).",
        },
        {
          id: "opt_mekanik_destek",
          text: "Mekanik dolaşım desteği konsültasyonu (IABP/Impella) + Norepinefrin + Dikkatli sıvı + Tekrar kateterizasyon",
          correct: true,
          points: 30,
          feedback:
            "Doğru — Mekanik destek seçilmiş hastada (genç, düzeltile kabul edilebilir şok). IABP-SHOCK II rutin IABP negatif, ama Impella için DanGer Shock 2024 pozitif sinyal. Norepinefrin + tekrar anjio zorunlu bileşenler.",
        },
        {
          id: "opt_dopamin_sivi",
          text: "Dopamin infüzyonu başla + 1 L SF bolus (hipovolemi düzelt)",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — Dopamin SOAP-II 2010: norepinefrine göre daha yüksek aritmi insidansı + mortalite. Pulmoner ödem varken 1 L SF bolus sıvı yükünü artırır — zarar verir.",
        },
        {
          id: "opt_sivi_bolus",
          text: "2 L kristaloid bolus — önce hipovolemiyi düzelt",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — Bilateral krepitasyon + düşük EF: kardiyojenik şok pulmoner ödemle birlikte. Sıvı yüklemesi pulmoner ödemi kötüleştirir, hipoksiyi artırır. Sıvı kısıtla.",
        },
        {
          id: "opt_beta_bloker",
          text: "Taşikardi var (HR 110) — metoprolol IV başla",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA — Kardiyojenik şokta beta-blokör KONTRENDİKE. Kalp debisini daha düşürür, hipotansiyonu derinleştirir, mortaliteyi artırır. Taşikardi şokun kompensatuvar yanıtıdır — bastırma.",
        },
        {
          id: "opt_medikal_sadece",
          text: "Medikal tedaviyle devam et, tekrar kateterizasyon gereksiz",
          correct: false,
          points: -20,
          feedback:
            "Yetersiz — Stent trombozu, in-stent restenoz, disseke stent veya mekanik komplikasyon post-PCI dönemde klinik kötüleşmenin başlıca nedenleridir. Tekrar görüntüleme zorunlu.",
        },
      ],
    },
  ],

  imaging_results: {
    "stemi-cxr": {
      id: "stemi-cxr",
      modality: "xray",
      name_tr: "Akciğer Grafisi (PA)",
      view: "PA",
      image_url: "/images/scenarios/stemi/normal_chest_xray_pa.jpg",
      attribution: "Mikael Häggström, M.D. — CC0 (Wikimedia Commons)",
      interpretation:
        "Kardiyak silüet normal sınırlarda. Akciğer alanlarında patolojik opasite izlenmemektedir. Hilus ve mediasten normal görünümde. STEMI tanısında akciğer grafisi aort diseksiyonu ve kardiyomegaliyi ekarte etmek için değerlidir.",
      findings: [
        "Normal kardiyotorasik oran (< 0.50)",
        "Her iki akciğer alanı temiz",
        "Plevral effüzyon yok",
        "Normal mediastinal kontur",
      ],
      timestamp_min: 5,
    },
    "stemi-ekg-12lead": {
      id: "stemi-ekg-12lead",
      modality: "ekg",
      name_tr: "12 Derivasyon EKG",
      image_url: "/images/scenarios/stemi/stemi_12lead_ekg.jpg",
      attribution: "User 'Displaced' — Public Domain (Wikimedia Commons)",
      interpretation:
        "Anterior STEMI paterni: V1-V4'te belirgin ST elevasyonu, II/III/aVF'de karşılıklı ST depresyonu. Sinüs taşikardisi (HR ~105/dk). Anterior fasiküler blok paterni izlenmektedir. Sol anteriyor desendan (LAD) proksimal oklüzyonu ile uyumlu bulgular.",
      findings: [
        "V1-V4: ST elevasyonu (Tombstone paterni, 3-5 mm)",
        "II, III, aVF: Karşılıklı ST depresyonu",
        "Sinüs taşikardisi (HR ~105/dk)",
        "Anterior fasikül bloğu: sol aks sapması",
        "Q dalgası henüz belirgin değil — akut faz",
      ],
      timestamp_min: 3,
    },
    "stemi-eko-yatakbasi": {
      id: "stemi-eko-yatakbasi",
      name_tr: "Yatak Başı Ekokardiyografi (TTE)",
      modality: "echo",
      view: "Parasternal uzun eksen + apikal 4 odacıklı",
      interpretation:
        "EF %38 (orta düşük — anterior MI sonrası). Anterior ve anteroseptal duvarlarda belirgin hipokinezi/akinezi (LAD sulama alanı). Sağ ventrikül fonksiyonu korunmuş. Perikart efüzyonu yok. Papiller kas bütünlüğü korunmuş — mitral regürjitasyon yok. VSD yok. Serbest duvar rüptürü ekartandı. Kapak patolojisi saptanmadı.",
      findings: [
        "EF: %38 — orta düşük (normal >55%)",
        "Anterior + anteroseptal duvar: hipokinezi/akinezi (LAD okluzyonu alanı)",
        "Sağ ventrikül: fonksiyon korunmuş",
        "Perikart: sıvı yok",
        "Mekanik komplikasyon EKARTANDı: VSD(-), papiller kas rüptürü(-), serbest duvar rüptürü(-)",
        "Kapaklar: mitral, aort, triküspit normal",
      ],
      timestamp_min: 15,
    },
  },

  scoring: {
    max_points: 293,
    passing_score: 220,
    score_floor: 0,
    grade_bands: {
      A: 315,
      B: 260,
      C: 220,
      D: 165,
    },
  },

  variants: [
    {
      id: "stemi-b-atipik",
      label: "STEMI-B — Atipik Prezentasyon",
      description:
        "78 yaş kadın, DM'li — tipik göğüs ağrısı baskın değil, nefes darlığı ve çarpıntı ön planda. Diyabetik hastada atipik MI sunumu.",
      patient: {
        age: 78,
        sex: "F",
        weight_kg: 68,
        height_cm: 158,
        chief_complaint:
          "Gece başlayan nefes darlığı, çarpıntı ve hafif epigastrik rahatsızlık. Göğüste hafif baskı hissi var.",
        history_items: [
          "DM Tip 2 (15 yıl, insülin)",
          "HT (20 yıl, ilaç kullanıyor)",
          "7 yıl önce geçirilmiş MI",
          "50 paket-yıl sigara (bırakmış)",
        ],
        allergies: [],
        current_medications: [
          "İnsülin glargin 20 IU/gece",
          "Metformin 500 mg 2x1",
          "Ramipril 10 mg 1x1",
          "Atorvastatin 40 mg 1x1",
        ],
        modifiers: {
          beta_blocker: false,
          karaciger_yetm: false,
          bobrek_yetm: false,
        },
      },
      initial_vitals: {
        hr: 96,
        bp_systolic: 132,
        bp_diastolic: 78,
        spo2: 93,
        temp: 36.8,
        rr: 24,
        pain: 3,
        glucose: 224,
        gcs: 15,
      },
    },
  ],

  debrief: {
    key_learnings: [
      "STEMI'de ilk 10 dakikada 12 derivasyonlu EKG zorunludur.",
      "Anterior STEMI (V1-V4) LAD oklüzyonunu gösterir; proksimal LAD yüksek mortaliteli.",
      "Kapı-balon süresi <120 dk sağlanabiliyorsa primer PCI tromboliz üzerine tercih edilir.",
      "İkili antiplatelet (ASA + P2Y12) + antikoagülan reperfüzyon öncesi standart.",
      "P2Y12 seçimi: ESC 2023'te ACS'de tikagrelor/prasugrel klopidogrele tercih edilir (class I).",
      "Erken IV beta-bloker hemodinamik olarak stabil olmayan hastalarda riskli (COMMIT).",
      "Morfin rutin değil — CRUSADE mortalite artışı göstermiştir. Nitrata dirençli ağrıda düşünülür.",
      "SpO₂ ≥90% ise rutin O₂ endike değil (AVOID trial).",
      "PCI sonrası: DAPT 12 ay + yüksek doz statin + ACEi/ARB + oral beta-bloker.",
      "Time is myocardium: Door-to-balloon <90dk (direkt PCI merkezi), <120dk (transfer). Lab paralel akış — PCI'yi geciktirmez.",
      "Troponin STEMI tanısı için beklenmez — klinik+EKG yeterli. Paralel istenir, risk stratifikasyonu + infarkt boyutu için.",
      "LDL hedef <55 mg/dL ACS sonrası (ESC 2023 Class I). Atorvastatin 80mg veya rosuvastatin 40mg — akut fazda başla.",
      "Cr kontrast öncesi: Cr <1.5 güvenli, 1.5-2.0 dikkatli (hidrasyon), >2.0 alternatif yöntem.",
      "Yatak başı EKO post-STEMI: EF + mekanik komplikasyon ekartasyonu (VSD, papiller kas, serbest duvar rüptürü) zorunlu.",
      "Kardiyojenik şokta beta-blokör KONTRENDİKE — kalp debisini düşürür, mortalite artırır.",
      "Norepinefrin > Dopamin kardiyojenik şokta (SOAP-II 2010). IABP rutin negatif (IABP-SHOCK II). Impella pozitif sinyal (DanGer Shock 2024).",
      "Re-oklüzyon + stent trombozu post-PCI ilk 24-48 saatte yüksek risk — klinik kötüleşmede tekrar anjio.",
    ],
    references: [
      "ESC 2023 ACS Yönetim Kılavuzu (Byrne et al., Eur Heart J 2023)",
      "TKD Akut Koroner Sendrom Kılavuzu 2022",
      "AHA/ACC 2021 STEMI Guidelines",
      "PLATO (tikagrelor), TRITON-TIMI 38 (prasugrel)",
      "COMMIT, CRUSADE, AVOID çalışmaları",
      "SOAP-II 2010 (De Backer et al., NEJM) — Norepinefrin vs Dopamin",
      "IABP-SHOCK II 2012 (Thiele et al., NEJM) — IABP rutin negatif",
      "DanGer Shock 2024 (Møller et al., NEJM) — Impella pozitif sinyal",
    ],
    red_flags: [
      "Hipotansiyon (sağ ventrikül MI? Kardiyojenik şok?)",
      "Yeni geliştirdiği sol dal bloğu (STEMI eşdeğeri)",
      "VT/VF — hemen defibrilasyon",
      "V1-V3'te ST depresyonu → posterior MI düşün (V7-V9 çek)",
      "İki kol arası TA farkı >20 mmHg → aort diseksiyonu ekarte et",
      "Laktat >2.0 post-MI: kardiyojenik şok erken sinyali — yakın izlem",
      "PCI sonrası klinik kötüleşme → re-oklüzyon/stent trombozu ekarte",
      "Kardiyojenik şokta beta-blokör emri → kritik hata, durumun kötüleşmesine yol açar",
    ],
    next_scenarios: [],
  },
};
