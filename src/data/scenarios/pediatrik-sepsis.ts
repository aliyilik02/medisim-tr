import type { Scenario } from "@/engine";

// ============================================================
// Pediatrik Sepsis — 8 Aylık İnfant, Pnömoni Kaynaklı Septik Şok
// ============================================================
// SSC 2020 Pediatric Bundle (sıvı yanıtlı şok)
// AAP 2024 + IDSA pediatric CAP guidelines uyumlu
// D2 öğrenci düzeyi — temel sepsis bundle akışı
// Lab sistemi yeni şablonu test eden ilk senaryo
// ============================================================

export const scenario_pediatrik_sepsis: Scenario = {
  id: "pediatri-sepsis-001",
  version: "0.2.0",
  title: "8 Aylık İnfant — Pnömoni Kaynaklı Septik Şok",
  description:
    "3 gündür ateş+öksürük, son 6 saatte halsizlik artmış. Soğuk ekstremite, hipotansiyon, hipoksi. Sıvı yanıtlı septik şok yönetimi (SSC 2020 Pediatric Bundle).",
  specialty: "pediatri",
  tags: ["sepsis", "pediatri", "pnömoni", "şok", "infant", "bundle"],
  difficulty: 2,
  supported_difficulties: [2],
  estimated_minutes: 12,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR",
  reviewed_by: "SSC 2020 Pediatric, AAP 2024, IDSA pediatric pneumonia",
  last_updated: "2026-04-26",

  // ICD-10 + SNOMED CT (REVIEWED_PENDING_ACTIVATION — kullanıcı onayı 2026-05-04)
  clinical_codes: { icd10: "P36.9", snomed_ct: "91302008" },

  medication_timing_overrides: {
    salin_09:      { onset_sec: 1,  peak_min: 0.083, duration_min: 0.5 },
    ringer_laktat: { onset_sec: 1,  peak_min: 0.083, duration_min: 0.5 },
    seftriakson:   { onset_sec: 5,  peak_min: 0.5,   duration_min: 8 },
    parasetamol:   { onset_sec: 30, peak_min: 1,     duration_min: 4 },
  },

  patient: {
    age: 0,
    sex: "M",
    weight_kg: 9,
    height_cm: 70,
    chief_complaint:
      "3 gündür ateş ve öksürük. Son 6 saatte halsizlik, beslenememe. Annesi soğuk el-ayak ve idrar azaldığını söylüyor.",
    history_items: [
      "Term doğum, doğumsal hastalık yok",
      "Aşı takvimi tam (PCV13 dahil)",
      "Kreşe gidiyor — son 2 haftada akran enfeksiyonu",
      "Allerjisi yok",
      "Son 8 saatte beslenmemiş, son 6 saatte idrar yok",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 175,
    bp_systolic: 65,
    bp_diastolic: 40,
    spo2: 87,
    temp: 39.2,
    rr: 55,
    pain: 4,
    glucose: 68,
    gcs: 13,
  },

  ekg_pattern: "sinus_tach",

  available_medications: [
    "salin_09",
    "ringer_laktat",
    "seftriakson",
    "vankomisin",
    "parasetamol",
    "dekstroz_50",
    "adrenalin",
    "noradrenalin",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "glukometre",
    "kan_gazi_cihazi",
    "iv_kateter_24g",
    "pediatrik_io_seti",
    "nazal_kanul",
    "hfnc",
    "oksijen_maskesi",
    "stetoskop",
    "ates_olcer",
  ],

  start_step_id: "s1_triaj",

  steps: [
    {
      id: "s1_triaj",
      kind: "info",
      title: "Triaj — Vakanın Sunumu",
      prompt: "Acil servise getirildi. Hızlı değerlendir.",
      narrative:
        "8 aylık erkek bebek, annesi kucağında. 3 gündür ateş ve öksürük şikâyeti. Son 6 saatte uykuya meyilli, beslenememe, soğuk el-ayak. Triaj nabız 175, SpO₂ 87%, ısı 39.2°C. İlk bakışta letarjik, soluk-grimsi, takipneik, soğuk uçlar.",
      content:
        "Pediatrik septik şok tanısı için 'soğuk şok' bulguları: takikardi + uzun kapiller dolum + soğuk ekstremite + letarji. Bu hastada hepsi mevcut. Sıradaki adım: ABC + monitör + IV/IO erişim.",
    },

    {
      id: "s2_abc_monitor",
      kind: "action",
      title: "ABC + Monitör + Damar Yolu",
      prompt:
        "Hastayı izlemeye al ve damar yolu aç. SSC 2020: ilk dakikalarda IV/IO erişim hedef. SpO₂ 87 — oksijen desteği şart.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 8,
          feedback: "Doğru — monitör ilk basamak. Triaj vitalleri doğrulandı.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_24g" },
          points: 12,
          feedback:
            "Doğru — pediatrik 24G IV kateter. 2 deneme başarısız olursa 90 sn içinde IO'ya geç (SSC 2020).",
        },
        {
          action: { type: "use_equipment", target_id: "pediatrik_io_seti" },
          points: 10,
          feedback:
            "Kabul — pediatrik IO direkt başlangıçta da meşru. Tibial proksimal yerleştirme.",
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 6,
          feedback:
            "Doğru — sepsiste hipoglisemi sık (özellikle bebeklerde). Glukoz 68 sınırda.",
        },
        {
          action: { type: "use_equipment", target_id: "stetoskop" },
          points: 4,
          feedback: "Doğru — sağ alt zonda krepitan ral duyuluyor. Pnömoni odağı.",
        },
        {
          action: { type: "use_equipment", target_id: "hfnc" },
          points: 8,
          feedback:
            "Doğru — HFNC pediatrik solunum sıkıntısında ilk tercih. SpO₂ 87→94 hedefle.",
          vitals_change: { spo2: 94 },
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maskesi" },
          points: 5,
          feedback:
            "Kabul — rezervuarlı maske de çalışır ama HFNC daha konforlu (bebek ajite olmaz).",
          vitals_change: { spo2: 92 },
        },
        {
          action: { type: "use_equipment", target_id: "nazal_kanul" },
          points: -3,
          feedback:
            "Yetersiz — SpO₂ 87 ve solunum sıkıntısı için nazal kanül 2-3 L/dk yetmez. HFNC veya rezervuarlı maske gerekir.",
        },
      ],
      default_wrong_penalty: -2,
      default_wrong_feedback:
        "Bu adımda öncelik: monitör + IV/IO + glukoz + oksijen. Tedavi sonraki adımda.",
    },

    {
      id: "s3_tetkik",
      kind: "action",
      title: "Lab + Kültür + PA Grafi",
      prompt:
        "Antibiyotikten ÖNCE kan kültürü al. Lablar paralel istenir. SSC hedefi: AB ilk 1 saat içinde — kültür AB'yi geciktirmemeli.",
      narrative: "İdeal sıra: Kan kültürü → Lablar → Antibiyotik. Toplam <30 dk.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "psp-kan-kulturu" },
          points: 15,
          feedback:
            "Çok doğru — kültür ABxöncesi alındı. Final 24-48 saat ama tedavi yönlendirmesi için kritik.",
        },
        {
          action: { type: "order_test", target_id: "psp-tks" },
          points: 8,
          feedback:
            "Doğru — sepsis taraması: WBC 22 (sola kayma). Trombositopeni DIC için işaret.",
        },
        {
          action: { type: "order_test", target_id: "psp-crp-pct" },
          points: 8,
          feedback:
            "Doğru — Prokalsitonin 8.4 bakteriyel sepsis için yüksek özgünlük. Viralden ayırır.",
        },
        {
          action: { type: "order_test", target_id: "psp-kan-gazi" },
          points: 10,
          feedback:
            "Doğru — laktat 3.2 hipoperfüzyon işareti. Resüsitasyon yanıtı laktatla takip edilir.",
        },
        {
          action: { type: "order_test", target_id: "psp-biyokimya" },
          points: 6,
          feedback:
            "Doğru — BUN/Cr ile prerenal AKI değerlendirilir. Sodyum/glukoz takibi de önemli.",
        },
        {
          action: { type: "order_test", target_id: "psp-pa-grafi" },
          points: 8,
          feedback:
            "Doğru — sağ alt lob konsolidasyonu görüldü. Pnömoni odağı doğrulandı.",
        },
      ],
      default_wrong_penalty: -2,
      default_wrong_feedback:
        "Bu adımda tetkikler ve kültür. Tedavi sonraki adımda.",
    },

    {
      id: "s4_tani",
      kind: "decision",
      title: "Klinik Tanı",
      prompt:
        "Veriler: HR 175, SBP 65, SpO₂ 87, kapiller dolum >3 sn, letarji, laktat 3.2, WBC 22, PCT 8.4, sağ alt lob konsolidasyonu. Tanı?",
      options: [
        {
          id: "a",
          text: "Basit pnömoni — IV antibiyotik başla, sıvı sınırlı tut",
          correct: false,
          points: -10,
          feedback:
            "Hayır — hipotansiyon + laktat 3.2 + soğuk şok bulguları septik şok tanımı. Sıvı sınırlamak hayati hata.",
        },
        {
          id: "b",
          text: "Pnömoni kaynaklı septik şok — bundle başlat (sıvı + AB + kültür)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — SSC 2020 Pediatric kriterleri: SBP <70 (infant), kapiller dolum uzun, laktat >2 → septik şok. 1 saatlik bundle aktif.",
        },
        {
          id: "c",
          text: "Konjenital kalp hastalığı dekompansasyonu",
          correct: false,
          points: -5,
          feedback:
            "Hayır — anamnezde KKH yok, aşıları tam, daha önce sağlıklı. Klinik enfeksiyonla uyumlu.",
        },
        {
          id: "d",
          text: "Bronşiyolit — destek tedavi yeter",
          correct: false,
          points: -10,
          feedback:
            "Hayır — hipotansiyon ve laktat yüksekliği bronşiyolitle açıklanmaz.",
        },
      ],
    },

    {
      id: "s5_antibiyotik",
      kind: "action",
      title: "Ampirik Antibiyotik",
      prompt:
        "Tanı: septik şok. AB ilk 1 saat içinde. 3 ay-5 yaş toplum kökenli pnömoni etkenleri: S. pneumoniae > H. influenzae > S. aureus.",
      min_actions: 1,
      max_actions: 2,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 25,
          feedback:
            "Doğru — Seftriakson 75 mg/kg IV. S. pneumoniae ve H. influenzae'yi örtüyor. AAP 2024 + IDSA önerisi.",
        },
        {
          action: { type: "give_medication", target_id: "vankomisin" },
          points: 5,
          feedback:
            "Kabul — MRSA örtmek için eklenebilir ama bu vakada zorunlu değil. Toplumda MRSA pnömonisi nadir; klinik şüphe yoksa eklemeyi geciktirme. Eklersen 15 mg/kg IV.",
        },
      ],
      default_wrong_penalty: -8,
      default_wrong_feedback:
        "Bu adımda antibiyotik. Pediatrik dozlama mg/kg — sabit erişkin doz hayati hata.",
    },

    {
      id: "s6_sivi",
      kind: "action",
      title: "Sıvı Resüsitasyonu",
      prompt:
        "SSC 2020 Pediatric: 10-20 mL/kg izotonik bolus 5-10 dk. Yanıt: HR, kapiller dolum, MAP. Maks 60 mL/kg ilk saatte (yüklenme riski).",
      narrative: "Bu hasta 9 kg → her bolus 90-180 mL.",
      min_actions: 1,
      max_actions: 4,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 20,
          feedback:
            "Çok doğru — Ringer Laktat hipokloremik metabolik asidoz riskini azaltır. SSC 2020'de NaCl'a tercih edilir.",
          vitals_change: { hr: 155, bp_systolic: 80, bp_diastolic: 50 },
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 18,
          feedback:
            "Doğru — %0.9 NaCl 20 mL/kg (180 mL) bolus 5-10 dk. Yanıt değerlendir, gerekirse tekrar.",
          vitals_change: { hr: 158, bp_systolic: 78, bp_diastolic: 48 },
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu adımda sıvı bolusu. Vazopresör henüz erken — sıvı yanıtını gör.",
    },

    {
      id: "s7_ek_tedavi",
      kind: "decision",
      title: "Ateş + Hipoglisemi Yönetimi",
      prompt:
        "Sıvı bolus sonrası vital iyileşme: HR 158, SBP 80. Ateş hâlâ 39°C, glukoz 65 mg/dL. Sıradaki adım?",
      options: [
        {
          id: "a",
          text: "Parasetamol IV 15 mg/kg + Dekstroz %10 2 mL/kg bolus",
          correct: true,
          points: 18,
          feedback:
            "Doğru — pediatrik ateş kontrolü konfor + metabolik talebi azaltır. Hipoglisemi sınırı (<70) düzeltilir.",
        },
        {
          id: "b",
          text: "Sadece parasetamol — glukoz 65 sınır, kendiliğinden düzelir",
          correct: false,
          points: -5,
          feedback:
            "Eksik — sepsiste glukoz hızla düşebilir. Beslenme yokken 65 mg/dL düzeltilir (bebeklerde <70 düzelt eşiği).",
        },
        {
          id: "c",
          text: "İbuprofen + glukoz takibi (replasman yok)",
          correct: false,
          points: -8,
          feedback:
            "Yanlış — septik şokta ibuprofen kontrendike (renal yan etki, hipoperfüzyon). Glukoz da replasman ister.",
        },
      ],
    },

    {
      id: "s8_yatis",
      kind: "decision",
      title: "Yatış Kararı",
      prompt:
        "60 dk sonra: HR 148, SBP 84, SpO₂ 95% (HFNC), laktat 2.0. Sıvı yanıtlı şok, AB verildi. Sıradaki?",
      options: [
        {
          id: "a",
          text: "Pediatrik Yoğun Bakım (PYBÜ) — yakın monitör, vazopresör hazır",
          correct: true,
          points: 20,
          feedback:
            "Doğru — sıvı yanıtlı bile olsa septik şok PYBÜ izlemi gerektirir. İlk 24 saat tekrar bozulma olasılığı yüksek.",
        },
        {
          id: "b",
          text: "Pediatri servisi — durum stabil, normal yatak",
          correct: false,
          points: -8,
          feedback:
            "Hayır — septik şok geçirdi, PYBÜ standart bakım yeri. Servis monitörü yetersiz.",
        },
        {
          id: "c",
          text: "Acil gözlem 4-6 saat → düzelirse taburcu",
          correct: false,
          points: -15,
          critical: true,
          feedback:
            "Kritik hata — septik şok hastasını taburcu hayati risk. Bakteriyemi ilk saatlerde kötüleşebilir.",
        },
        {
          id: "d",
          text: "Çocuk Enfeksiyon konsültasyonu + servise yatış",
          correct: false,
          points: 5,
          feedback: "Konsültasyon doğru ama yatış yeri PYBÜ olmalı. Yarı puan.",
        },
      ],
    },
  ],

  lab_panels: {
    "psp-tks": {
      id: "psp-tks",
      name_tr: "Tam Kan Sayımı",
      results: [
        { parameter: "WBC",      value: 22.4, unit: "×10³/µL", reference_range: "6.0-17.5", flag: "H",
          interpretation: "Sola kayma + lökositoz, bakteriyel paterni. Pediatrik referans yetişkinden farklı." },
        { parameter: "Nötrofil", value: 78,   unit: "%",        reference_range: "30-60",     flag: "H" },
        { parameter: "Lenfosit", value: 14,   unit: "%",        reference_range: "30-60",     flag: "L" },
        { parameter: "Hgb",      value: 10.8, unit: "g/dL",     reference_range: "10.5-13.5" },
        { parameter: "PLT",      value: 285,  unit: "×10³/µL",  reference_range: "150-450" },
      ],
      comment: "Sola kayma + nötrofil hâkimiyeti bakteriyel sepsis ile uyumlu. PLT normal — DIC erken aşamada değil.",
    },
    "psp-crp-pct": {
      id: "psp-crp-pct",
      name_tr: "CRP + Prokalsitonin",
      results: [
        { parameter: "CRP",            value: 145, unit: "mg/L",  reference_range: "<5",   flag: "HH" },
        { parameter: "Prokalsitonin",  value: 8.4, unit: "ng/mL", reference_range: "<0.5", flag: "HH",
          interpretation: "PCT >2 bakteriyel sepsis için yüksek özgünlük. >10 = ciddi sepsis." },
      ],
      comment: "Bakteriyel pnömoni kaynaklı sepsis ile uyumlu. Tedaviyle 48-72 saatte düşer.",
    },
    "psp-kan-gazi": {
      id: "psp-kan-gazi",
      name_tr: "Kan Gazı + Laktat",
      results: [
        { parameter: "pH",     value: 7.31, unit: "",       reference_range: "7.35-7.45",  flag: "L" },
        { parameter: "pCO₂",   value: 32,   unit: "mmHg",   reference_range: "35-45",       flag: "L" },
        { parameter: "pO₂",    value: 68,   unit: "mmHg",   reference_range: "80-100",      flag: "L" },
        { parameter: "HCO₃⁻",  value: 18,   unit: "mEq/L",  reference_range: "22-26",       flag: "L" },
        { parameter: "BE",     value: -7,   unit: "mEq/L",  reference_range: "-2 / +2",     flag: "L" },
        { parameter: "Laktat", value: 3.2,  unit: "mmol/L", reference_range: "0.5-2.0",     flag: "H",
          interpretation: "Doku hipoperfüzyonu işareti. Hedef: laktat <2 (2 saat içinde)." },
      ],
      comment: "Hafif metabolik asidoz + kompansatuvar takipne. Laktat 3.2 sepsis bundle indikasyonu.",
    },
    "psp-biyokimya": {
      id: "psp-biyokimya",
      name_tr: "Biyokimya / Elektrolitler",
      results: [
        { parameter: "Glukoz",    value: 68,  unit: "mg/dL", reference_range: "70-110", flag: "L",
          interpretation: "Sınırda hipoglisemi. Bebeklerde sepsis altında hızlı düşebilir." },
        { parameter: "BUN",       value: 24,  unit: "mg/dL", reference_range: "5-18",    flag: "H",
          interpretation: "Prerenal AKI işareti. Sıvı sonrası tekrar değerlendir." },
        { parameter: "Kreatinin", value: 0.6, unit: "mg/dL", reference_range: "0.2-0.5", flag: "H" },
        { parameter: "Na⁺",       value: 134, unit: "mEq/L", reference_range: "136-145", flag: "L" },
        { parameter: "K⁺",        value: 4.2, unit: "mEq/L", reference_range: "3.5-5.5" },
        { parameter: "Cl⁻",       value: 102, unit: "mEq/L", reference_range: "98-107" },
      ],
    },
    "psp-kan-kulturu": {
      id: "psp-kan-kulturu",
      name_tr: "Kan Kültürü (Ön Rapor)",
      results: [
        { parameter: "Üreme",       value: "Beklemede",                unit: "", reference_range: "Negatif",
          interpretation: "Final 24-48 saat. Gram boyamada gram (+) diplokok." },
        { parameter: "Gram boyama", value: "Gram (+) diplokok",        unit: "", reference_range: "—", flag: "C",
          interpretation: "S. pneumoniae morfolojisi ile uyumlu. Seftriakson örtüyor." },
      ],
      comment: "24 saat sonraki final rapor lab_timeline'da.",
    },
  },

  result_delay_seconds: {
    "psp-tks":         60,
    "psp-crp-pct":     90,
    "psp-kan-gazi":    60,
    "psp-biyokimya":   90,
    "psp-kan-kulturu": 120,
  },

  lab_timeline: [
    {
      panel_id: "psp-kan-gazi",
      at_minute: 60,
      results: [
        { parameter: "pH",     value: 7.36, unit: "",       reference_range: "7.35-7.45" },
        { parameter: "pCO₂",   value: 36,   unit: "mmHg",   reference_range: "35-45" },
        { parameter: "pO₂",    value: 92,   unit: "mmHg",   reference_range: "80-100",  flag: "L" },
        { parameter: "HCO₃⁻",  value: 22,   unit: "mEq/L",  reference_range: "22-26" },
        { parameter: "Laktat", value: 2.0,  unit: "mmol/L", reference_range: "0.5-2.0",
          interpretation: "Resüsitasyon yanıtı: laktat normalize. Bundle başarılı." },
      ],
    },
    {
      panel_id: "psp-kan-kulturu",
      at_minute: 1440,
      results: [
        { parameter: "Üreme",        value: "S. pneumoniae",                       unit: "", reference_range: "Negatif", flag: "C" },
        { parameter: "Antibiyogram", value: "Seftriakson duyarlı, Penisilin orta", unit: "", reference_range: "—",
          interpretation: "Mevcut tedavi (seftriakson) uygun. Vankomisin verildiyse kesilebilir." },
      ],
    },
  ],

  imaging_results: {
    "psp-pa-grafi": {
      id: "psp-pa-grafi",
      name_tr: "PA Akciğer Grafisi",
      modality: "xray",
      view: "PA",
      interpretation:
        "Sağ alt zonda lober konsolidasyon (sağ alt lob pnömonisi). Sol akciğer açık. Kardiyo-torasik oran normal. Plevral efüzyon yok.",
      findings: [
        "Sağ alt lob homojen konsolidasyon",
        "Hava bronkogramı (+)",
        "Kardiyak silüet normal",
        "Plevral efüzyon yok",
        "Pnömotoraks yok",
      ],
      attribution: "Eğitim amaçlı temsili rapor",
    },
  },

  scoring: {
    max_points: 240,
    passing_score: 130,
    grade_bands: { A: 175, B: 150, C: 130, D: 100 },
    score_floor: 0,
  },

  debrief: {
    key_learnings: [
      "Pediatrik septik şok tanısı SBP'ye değil klinik bulgulara dayanır: kapiller dolum >3 sn, soğuk uçlar, letarji, taşikardi.",
      "İnfantta SBP <70 mmHg = hipotansiyon (yetişkinden farklı eşik).",
      "SSC 2020 Pediatric Bundle (1 saat): IV/IO erişim → kültür → antibiyotik → sıvı bolus → laktat kontrolü.",
      "Sıvı bolusu 10-20 mL/kg, 5-10 dk içinde. İlk saatte maks 60 mL/kg (yüklenme riski).",
      "Ringer Laktat NaCl'a tercih edilir (hipokloremik asidoz önlenir).",
      "Antibiyotik ilk 1 saat içinde — kültür hazırlığı geciktirmemeli. 3-5 yaş pnömoni: seftriakson 75 mg/kg IV.",
      "Pediatrik dozlama mg/kg — sabit erişkin doz puan kaybı + güvenlik riski.",
      "Sepsiste hipoglisemi sık (özellikle bebeklerde, beslenme yokken). Glukoz <70 düzelt.",
      "Septik şok hastası — sıvı yanıtlı olsa bile — PYBÜ'ye yatırılır. 24 saat içinde tekrar bozulma riski.",
      "Toplumda MRSA pnömonisi nadir; vankomisin rutin değil, klinik şüphede ekle.",
    ],
    references: [
      "Weiss SL et al. Surviving Sepsis Campaign International Guidelines for the Management of Septic Shock and Sepsis-Associated Organ Dysfunction in Children. Pediatr Crit Care Med. 2020.",
      "AAP — Community-Acquired Pneumonia in Children: 2024 Update.",
      "IDSA / Pediatric Infectious Diseases Society — Management of CAP in Children Guidelines (revize 2023).",
      "WHO IMCI — Integrated Management of Childhood Illness.",
      "TEMD/TPED Pediatrik Sepsis Tanı ve Yönetim Önerileri.",
    ],
    red_flags: [
      "İnfantta SBP <70 = septik şok eşiği — yetişkin değerlendirmesi yanıltır.",
      "Antibiyotik gecikmesi (>1 saat) mortalite artırır — kültür beklentisi gerekçe olamaz.",
      "Sıvı yüklenmesi (>60 mL/kg ilk saatte) pulmoner ödem riski — yanıt değerlendirerek bolus tekrarla.",
      "Hipoglisemiyi atla, sepsiste hızla derinleşir.",
      "Stabil görünen septik şok hastasını taburcu/servis kararı = kritik hata. Standart yer PYBÜ.",
    ],
    next_scenarios: ["bronsiyolit-001", "anaflaksi-001"],
  },
};
