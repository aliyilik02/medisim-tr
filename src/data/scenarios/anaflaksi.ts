// ============================================================
// MediSim TR — Anaflaksi Senaryosu
// ============================================================
// Klinik referans: WAO 2020 Anaphylaxis Guidance,
// EAACI 2021, AAAAI/ACAAI 2020, AİİD 2022.
// Faz 5.8 — lab entegrasyonu + adrenalin önceliği.
// Ana öğretim hedefi: klinik tanı (lab DEĞİL), adrenalin önce,
// triptaz timing, refrakter yönetim, bifazik reaksiyon gözlem.
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_anaflaksi: Scenario = {
  id: "acil-anaflaksi-001",
  version: "2.0.0",
  title: "35 Yaş Kadın — Sefalosporin İnfüzyonu Sırasında Anaflaksi",
  description:
    "Tonsillit nedeniyle aile hekiminde sefazolin IV başlanan hasta. İnfüzyon başladıktan 10 dakika sonra yüz ödemi, dispne, hipotansiyon. IgE-aracılı tip 1 hipersensitivite. Klinik tanı → adrenalin önce → lab monitörizasyon → refrakter yönetim → bifazik gözlem.",
  specialty: "acil",
  tags: ["anaflaksi", "acil", "adrenalin", "alerji", "sefalosporin", "beta-laktam", "şok"],
  difficulty: 2,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  // ICD-10 + SNOMED CT (REVIEWED_PENDING_ACTIVATION — kullanıcı onayı 2026-05-04)
  clinical_codes: { icd10: "T78.2", snomed_ct: "39579001" },

  patient: {
    age: 35,
    sex: "F",
    weight_kg: 68,
    height_cm: 165,
    chief_complaint:
      "Sefazolin infüzyonu başladıktan birkaç dakika sonra yüzümde şişlik, boğazımda daralma ve nefes almakta güçlük başladı.",
    history_items: [
      "Tonsillit tanısı ile aile hekimine başvurdu, sefazolin IV önerildi — ilk doz aile hekimi kliniğinde",
      "Bilinen ilaç veya besin alerjisi öyküsü yok",
      "Beta-laktam ile daha önce hiç karşılaşmamış",
      "Kronik hastalık yok, düzenli ilaç kullanmıyor",
    ],
    allergies: ["sefazolin (ilk maruziyet — önceden bilinmiyordu)"],
    current_medications: [],
    modifiers: {
      bobrek_yetm: false,
      karaciger_yetm: false,
      beta_blocker: false,
    },
  },

  initial_vitals: {
    hr: 128,
    bp_systolic: 78,
    bp_diastolic: 44,
    spo2: 88,
    temp: 36.8,
    rr: 30,
    gcs: 14,
    pain: 3,
  },

  available_medications: [
    "adrenalin",
    "feniramin",
    "prednisolon",
    "salin_09",
    "ringer_laktat",
    "glukagon",
    "noradrenalin",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "oksijen_maske",
    "ambu",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "entubasyon_seti",
    "stetoskop",
    "ekg_12",
    "akciger_grafisi",
    "bt_kraniyal",
  ],

  ekg_pattern: "normal",

  medication_timing_overrides: {
    adrenalin:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25  },
    feniramin:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25  },
    prednisolon:   { onset_sec: 2, peak_min: 0.133, duration_min: 0.5   },
    salin_09:      { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
    ringer_laktat: { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
    glukagon:      { onset_sec: 2, peak_min: 0.25,  duration_min: 1.0   },
    noradrenalin:  { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
  },

  // ⚠️ Eğitim notu: Anaflaksi klinik tanıdır. Lab sonucu beklenmez.
  // Adrenalin IM gecikirse mortalite artar — en sık ölüm nedeni adrenalin gecikmesidir.

  lab_panels: {
    "ana-tryptase": {
      id: "ana-tryptase",
      name_tr: "Serum Triptaz (Akut)",
      collected_at_min: 15,
      results: [
        {
          parameter: "Serum Triptaz",
          value: 28,
          unit: "ng/mL",
          reference_range: "<11.4",
          flag: "HH",
          interpretation:
            "Mast hücre aktivasyonu — akut anaflaksi tanısını destekler. Bazal triptaz (24h sonra) ile kıyaslama gerekir",
        },
      ],
      comment:
        "Triptaz semptomlardan 1-2h sonra pik yapar, 6-8h içinde düşer. Geç gönderilen örnek değersizdir. Akut triptaz > bazal + bazal×0.2 + 2 → mast hücre aktivasyonu kriterleri (REMA 2021)",
    },
    "ana-cbc-bmp": {
      id: "ana-cbc-bmp",
      name_tr: "TKS + Metabolik Panel",
      collected_at_min: 10,
      results: [
        {
          parameter: "WBC",
          value: 12.5,
          unit: "×10³/μL",
          reference_range: "4-11",
          flag: "H",
          interpretation: "Stres lökositozu — enfeksiyonla karıştırılmamalı",
        },
        { parameter: "Hgb", value: 13.2, unit: "g/dL", reference_range: "12-16" },
        { parameter: "Plt", value: 210, unit: "×10³/μL", reference_range: "150-400" },
        {
          parameter: "Glukoz",
          value: 118,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
          interpretation: "Stres hiperglisemisi — şok yanıtı",
        },
        { parameter: "Na", value: 138, unit: "mEq/L", reference_range: "136-145" },
        { parameter: "K", value: 3.8, unit: "mEq/L", reference_range: "3.5-5.0" },
        {
          parameter: "HCO3",
          value: 19,
          unit: "mEq/L",
          reference_range: "22-26",
          flag: "L",
          interpretation: "Metabolik asidoz başlangıcı — şok perfüzyon bozukluğu",
        },
        { parameter: "BUN", value: 12, unit: "mg/dL", reference_range: "7-20" },
        { parameter: "Kreatinin", value: 0.8, unit: "mg/dL", reference_range: "0.6-1.1" },
      ],
      comment: "Baseline değerleri — şok biyokimyasını takip et. Adrenalin ve sıvı ile düzelmesi beklenir.",
    },
    "ana-abg-lactate": {
      id: "ana-abg-lactate",
      name_tr: "Kan Gazı + Laktat",
      collected_at_min: 8,
      results: [
        {
          parameter: "pH",
          value: 7.31,
          unit: "",
          reference_range: "7.35-7.45",
          flag: "L",
          interpretation: "Laktik asidoz — distribütif şok perfüzyon bozukluğu",
        },
        { parameter: "pCO2", value: 36, unit: "mmHg", reference_range: "35-45" },
        {
          parameter: "pO2",
          value: 78,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "L",
          interpretation: "Hipoksemi — bronkospazm + histamin aracılı bronş düz kas kasılması",
        },
        {
          parameter: "HCO3",
          value: 19,
          unit: "mEq/L",
          reference_range: "22-26",
          flag: "L",
        },
        {
          parameter: "Laktat",
          value: 3.8,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation: "Yüksek laktat — şok perfüzyon bozukluğu. Adrenalin + sıvı ile düzelme beklenir.",
        },
        { parameter: "SpO2 (hesaplanan)", value: 88, unit: "%", reference_range: ">95", flag: "L" },
      ],
      comment:
        "Laktat 3.8 mmol/L — refrakter şokta yüksekliği devam ederse IV adrenalin infüzyon gerekebilir",
    },

    // ------------------------------------------------------------
    // Yanlış seçim (-15): D-Dimer, anaflaksiyi PE ile karıştırma hatası
    // ------------------------------------------------------------
    "d_dimer": {
      id: "d_dimer",
      name_tr: "D-Dimer",
      results: [
        { parameter: "D-Dimer", value: 1240, unit: "ng/mL FEU", reference_range: "<500", flag: "H",
          interpretation: "Hafif-orta yükseklik. Anaflaksinin kendisi DIC-benzeri aktivasyon yaparak D-Dimer'i yükseltir (Wakahara 2008, Choi 2014) — bu bulgu PE'yi ne destekler ne de dışlar. Klinik bağlam: tetikleyici + cilt + bronkospazm = anaflaksi tanısı zaten kondu." },
      ],
      comment: "WAO 2020: anaflakside D-Dimer rutin önerilmez. Anafilaksi distribütif şoku ile PE obstrüktif şoku ayırıcı tanısı klinik bağlamla yapılır — D-Dimer non-spesifik yükseklikle yanlış yönlendirebilir. Tetkik tabloyu değiştirmedi.",
    },
  },

  result_delay_seconds: {
    "ana-tryptase":   1800,
    "ana-cbc-bmp":    900,
    "ana-abg-lactate": 600,
    "d_dimer":        900,  // 15 dk
  },

  lab_timeline: [
    {
      at_minute: 30,
      panel_id: "ana-abg-lactate",
      results: [
        {
          parameter: "pH",
          value: 7.38,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "Normalleşiyor — adrenalin + sıvı yanıtı yeterli",
        },
        { parameter: "pCO2", value: 38, unit: "mmHg", reference_range: "35-45" },
        {
          parameter: "pO2",
          value: 92,
          unit: "mmHg",
          reference_range: "80-100",
          interpretation: "Hipoksemi düzeldi — oksijen + bronkospazm rezolüsyon",
        },
        { parameter: "HCO3", value: 23, unit: "mEq/L", reference_range: "22-26" },
        {
          parameter: "Laktat",
          value: 2.1,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "H",
          interpretation: "Hızla düşüyor — tedavi yanıtı pozitif. Perfüzyon düzeliyor.",
        },
        { parameter: "SpO2 (hesaplanan)", value: 96, unit: "%", reference_range: ">95" },
      ],
    },
    {
      at_minute: 240,
      panel_id: "ana-abg-lactate",
      results: [
        {
          parameter: "pH",
          value: 7.42,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "Normal — 4 saatlik gözlem boyunca stabil",
        },
        { parameter: "pCO2", value: 40, unit: "mmHg", reference_range: "35-45" },
        {
          parameter: "pO2",
          value: 98,
          unit: "mmHg",
          reference_range: "80-100",
        },
        { parameter: "HCO3", value: 25, unit: "mEq/L", reference_range: "22-26" },
        {
          parameter: "Laktat",
          value: 0.9,
          unit: "mmol/L",
          reference_range: "<2.0",
          interpretation: "Normal — gözlem süresince klinik stabilite sağlandı",
        },
        { parameter: "SpO2 (hesaplanan)", value: 99, unit: "%", reference_range: ">95" },
      ],
    },
  ],

  // ============================================================
  // ⚠️ DRAFT — Faz 1 oynanabilir döngü alanları (12 Haziran 2026)
  // ============================================================
  // Kötüleşme eğrileri ve oskültasyon eşlemesi KLİNİK İÇERİKTİR.
  // Klinik review (Ali Bey) + ACTIVE onayı BEKLİYOR.
  //
  // Eğri gerekçesi (WAO 2020): tedavisiz anaflaktik şokta dakikalar
  // içinde progresif hipotansiyon + hipoksemi + refleks taşikardi.
  //   SBP  −2 mmHg/30sn (≈ −4/dk)  → 78'den 7 dk'da taban 50'ye
  //   SpO2 −1/20sn (≈ −3/dk)       → 88'den ~5 dk'da taban 72'ye
  //   HR   +1/20sn refleks         → tavan 152
  // Adrenalin (IM veya IV — her site) fazı durdurur; iyileşme trendi
  // WAO'da tarif edilen dakikalar içindeki klinik yanıtı taklit eder.
  // Eğitim modunda 8× hız: kötüleşme ~50 sn gerçek zamanda hissedilir.
  deterioration: [
    {
      id: "untreated-anaphylaxis",
      label: "Tedavisiz anaflaktik şok",
      trends: [
        { vital: "bp_systolic",  delta_per_sec: -0.067, floor: 50 },
        { vital: "bp_diastolic", delta_per_sec: -0.033, floor: 30 },
        { vital: "spo2",         delta_per_sec: -0.05,  floor: 72 },
        { vital: "hr",           delta_per_sec: 0.05,   ceiling: 152 },
        { vital: "rr",           delta_per_sec: 0.017,  ceiling: 40 },
      ],
      halted_by: [
        // site verilmedi — IM uyluk da, genel adrenalin de durdurur
        { type: "give_medication", target_id: "adrenalin" },
      ],
      recovery_trends: [
        { vital: "bp_systolic",  delta_per_sec: 0.1,   ceiling: 112 },
        { vital: "bp_diastolic", delta_per_sec: 0.05,  ceiling: 70 },
        { vital: "spo2",         delta_per_sec: 0.08,  ceiling: 97 },
        { vital: "hr",           delta_per_sec: -0.07, floor: 96 },
        { vital: "rr",           delta_per_sec: -0.03, floor: 16 },
      ],
    },
  ],

  // Oskültasyon (DRAFT): bronkospazm → tüm ön göğüs odaklarında yaygın
  // wheezing; adrenalin sonrası (faz durunca) normal kalp sesine döner.
  // Ses dosyaları: public/sounds/auscultation/ (atıf: SOUNDS-LICENSE.md)
  auscultation: {
    "chest-front": {
      sound_id: "lung_wheeze",
      resolved_sound_id: "heart_normal",
      phase_id: "untreated-anaphylaxis",
      note: "Yaygın ekspiratuvar wheezing — histamin aracılı bronkospazm. Erb noktası.",
    },
    "chest-left": {
      sound_id: "lung_wheeze",
      resolved_sound_id: "heart_normal",
      phase_id: "untreated-anaphylaxis",
      note: "Wheezing + taşikardik kalp sesleri — mitral odak (5. İKA midklavikular).",
    },
    "chest-right": {
      sound_id: "lung_wheeze",
      resolved_sound_id: "heart_normal",
      phase_id: "untreated-anaphylaxis",
      note: "Wheezing — aortik odak (2. İKA sağ sternal kenar).",
    },
  },

  start_step_id: "s1_tani",

  steps: [
    // ===== ADIM 1: Klinik Tanı =====
    {
      id: "s1_tani",
      kind: "decision",
      allow_multiple: true,
      partial_credit: true,
      title: "Klinik Tanı",
      prompt:
        "Sefazolin infüzyonu sırasında gelişen tablo. Bu anaflaksi tanısını destekleyen bulgular hangileridir? (Birden fazla seçin)",
      narrative:
        "Yüzde belirgin ödem, dudak şişliği. Oskültasyonda yaygın wheezing ve stridor. Enjeksiyon bölgesinde ürtiker. Taşikardik, hipotansif.",
      options: [
        {
          id: "opt_tetikleyici",
          text: "Tetikleyici (sefalosporin IV) + akut başlangıç (10 dk içinde)",
          correct: true,
          points: 8,
          feedback:
            "✓ Tetikleyici maruziyet + akut başlangıç — WAO 2020 Anaflaksi Tanı Kriteri 1.",
        },
        {
          id: "opt_cilt",
          text: "Cilt/mukoza tutulumu (yüz ödemi, ürtiker, dudak şişliği)",
          correct: true,
          points: 8,
          feedback: "✓ Cilt tutulumu ≥1 sistem tutulumu — tanı kriterlerinde zorunlu.",
        },
        {
          id: "opt_solunum",
          text: "Solunum yolu tutulumu (wheezing, stridor, dispne)",
          correct: true,
          points: 8,
          feedback:
            "✓ 2. sistem tutulumu — tek başına 2. sistem tutulumu ile anaflaksi tanısı tamamlandı (WAO).",
        },
        {
          id: "opt_hipotansiyon",
          text: "Hipotansiyon (TA 78/44 — tanımlanan yaş/cinsiyet için ciddi düşük)",
          correct: true,
          points: 6,
          feedback: "✓ Dolaşım tutulumu — anafilaksi ciddiyet göstergesi. Ölüm riski var.",
        },
        {
          id: "opt_ates",
          text: "Ateş yok — enfeksiyonu ekarte ediyoruz",
          correct: false,
          points: -5,
          feedback:
            "Bu düşünce doğru ama tanıyı destekleyen bulgu değil; ateş yokluğu negatif bir özellik.",
        },
        {
          id: "opt_lab_bekle",
          text: "Lab sonuçlarını bekle — triptaz geldikten sonra tanıyı doğrula",
          correct: false,
          points: -15,
          feedback:
            "✗ KRİTİK HATA. Anaflaksi klinik tanıdır — lab sonucu beklenmez. Triptaz tanıyı destekler, tedaviyi başlatmaz. Adrenalin hemen!",
          critical: true,
        },
      ],
    },

    // ===== YENİ: s2b_orders — Lab siparişleri =====
    {
      id: "s2b_orders",
      kind: "action",
      title: "Lab siparişleri — adrenalin geciktirilmemeli",
      prompt:
        "Tanı kondu, adrenalin IM verildi. Şimdi paralel olarak hangi monitörizasyon ve lab testlerini sıralarsinız? (Anaflaksi klinik tanı — lab sonucu BEKLENMEZ, tedavi izlemi için kullanılır)",
      min_actions: 1,
      default_wrong_penalty: -10,
      default_wrong_feedback:
        "Bu anaflaksi yönetiminde öncelikli değil — gereksiz radyasyon veya zaman kaybı.",
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "ana-tryptase" },
          points: 25,
          feedback:
            "✓ Serum triptaz: semptom başlangıcından 1-2h içinde pik yapar. Şimdi gönder — geç gönderim değersiz. Anaflaksi tanısını retrospektif destekler ve ileride alerji değerlendirmesinde kullanılır.",
        },
        {
          action: { type: "order_test", target_id: "ana-abg-lactate" },
          points: 20,
          feedback:
            "✓ ABG + Laktat: Şok derinliğini ve perfüzyon yanıtını değerlendirir. pH 7.31, laktat 3.8 — refrakter şok riskini erkenden saptadın.",
        },
        {
          action: { type: "order_test", target_id: "ana-cbc-bmp" },
          points: 15,
          feedback:
            "✓ TKS + Metabolik panel: Baseline değerler ve ayırıcı tanı desteği. Şok biyokimyasını takip et.",
        },
        {
          action: { type: "examine", target_id: "histamin_duzeyi" },
          points: 0,
          feedback:
            "⚠️ Histamin: Yarı ömrü 15-30 dakika — çok hızlı düşer, anaflaksinin geç semptomatik döneminde değersiz. Triptaz daha güvenilir ve uzun ömürlü.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: -10,
          feedback:
            "✗ EKG: Anaflaksi tabloyu açıklıyor — rutin EKG öncelik değil. Kardiyak aritmi veya AKS şüphesi olmadan rutin EKG kaynak israfıdır.",
        },
        {
          action: { type: "use_equipment", target_id: "akciger_grafisi" },
          points: -15,
          feedback:
            "✗ Akciğer grafisi: Anaflakside rutin görüntüleme ÖNERİLMEZ. Bronkospazm zaten adrenalin ile tedavi ediliyor. Gereksiz radyasyon ve tedavi gecikmesi.",
        },
        {
          action: { type: "use_equipment", target_id: "bt_kraniyal" },
          points: -15,
          feedback:
            "✗ Beyin BT: Anaflaksi şokunu nörolojik şok ile karıştırma hatası. Tetikleyici + akut başlangıç + cilt/solunum tutulumu → klinik tanı netleşti.",
        },
        {
          action: { type: "order_test", target_id: "d_dimer" },
          points: -15,
          feedback:
            "✗ D-Dimer: Anaflaksiyi PE ile karıştırma hatası. Tetikleyici + ürtiker + bronkospazm + akut başlangıç → PE ayırıcı tanı gerektirmiyor.",
        },
        {
          action: { type: "examine", target_id: "bekle_triptaz_sonucu" },
          points: -30,
          feedback:
            "✗ KRİTİK: Triptaz sonucu beklenerek adrenalin geciktirilemez. Klinik tanı yeterli — beklemek ölüm riski. Triptaz tanıyı destekler, tedaviyi başlatmaz.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 2: İlk Müdahale =====
    {
      id: "s2_ilk_mudahale",
      kind: "action",
      title: "İlk Müdahale — Zaman Kritik!",
      prompt:
        "Tanı kondu. İlk 60 saniye içinde ne yaparsınız? (En az 3 aksiyon)",
      time_limit_sec: 90,
      min_actions: 3,
      expected_outcomes: [
        {
          action: {
            type: "give_medication",
            target_id: "adrenalin",
            site: "im_uyluk",
          },
          points: 40,
          feedback:
            "MÜKEMMEL — 0.3-0.5 mg IM (anterolateral uyluk) anafilakside ilk ve en önemli tedavi. Hayati. WAO 2020: IM adrenalin geciktirme → ölüm.",
          vitals_change: { bp_systolic: 95, hr: 118 },
        },
        {
          action: { type: "give_medication", target_id: "adrenalin" },
          points: 25,
          feedback:
            "Adrenalin doğru ama IM yol (anterolateral uyluk) tercih edilmeli. Genel 'adrenalin' yerine IM uyluk belirtin — emilim hızı 2× daha hızlı.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 15,
          feedback: "✓ SpO₂ %88 — yüksek akım O₂ endike. Bronkospazm çözülürken hipoksemi desteği.",
          vitals_change: { spo2: 94 },
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "✓ Geniş lümenli IV yol — sıvı resüsitasyonu ve ilaç için şart.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "✓ Sürekli monitörizasyon — hemodinamik yanıt takibi.",
        },
        {
          action: { type: "give_medication", target_id: "feniramin" },
          points: -10,
          feedback:
            "HATA — antihistaminik ADRENALIN YERİNE GEÇMEZ. Adrenalin öncelikli. Antihistaminik sadece cilt semptomları için ikinci sırada, asla ilk ilaç değil.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "prednisolon" },
          points: -5,
          feedback:
            "Steroid etkisi 4-6 saat sonra başlar. Akut tedavide öncelik değil — adrenalin sonrası verilir. Bifazik reaksiyonu önlemek amacıyla kullanılır.",
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback:
        "Bu anafilaksinin ilk 60 saniyesinde öncelik değil.",
    },

    // ===== ADIM 3: Destek Tedavi =====
    {
      id: "s3_destek_tedavi",
      kind: "action",
      title: "Destek Tedavi",
      prompt:
        "Adrenalin sonrası hasta kısmen düzeldi. TA 95/60, HR 118, SpO₂ 94%. Hâlâ wheezing var ama hafifledi. Şimdi?",
      narrative:
        "TA 95/60, HR 118, SpO₂ 94%. Hâlâ wheezing var ama hafifledi.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 20,
          feedback:
            "✓ 20 mL/kg hızlı bolus (~1000-1500 mL). Distribütif şokta kapiller kaçak var — sıvı zorunlu.",
          vitals_change: { bp_systolic: 108 },
        },
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 20,
          feedback: "✓ İzotonik sıvı resüsitasyonu. Salin_09 ile eşdeğer.",
          vitals_change: { bp_systolic: 108 },
        },
        {
          action: { type: "give_medication", target_id: "feniramin" },
          points: 10,
          feedback:
            "✓ Adrenalin sonrası uygun — H1 antagonist kaşıntı/ürtikeri azaltır. Asla monoterapi değil.",
        },
        {
          action: { type: "give_medication", target_id: "prednisolon" },
          points: 10,
          feedback:
            "✓ Adrenalin sonrası uygun — bifazik reaksiyonu önlemek için. Etkisi 4-6 saat gecikmelidir, akut etkisi yok.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Bu aşamada öncelik değil.",
    },

    // ===== YENİ: s3b_refractory — Refrakter Anaflaksi =====
    {
      id: "s3b_refractory",
      kind: "decision",
      title: "Refrakter Anaflaksi",
      prompt:
        "2 doz adrenalin IM verildi. IV sıvı 1 L verildi. Hâlâ: TA 85/45, dispne devam ediyor, stridor +. Refrakter anaflaksi. Yaklaşımınız?",
      min_difficulty: 3,
      options: [
        {
          id: "opt_iv_adrenalin",
          text: "IV Adrenalin infüzyon başla (0.1 mcg/kg/dk) + havayolu hazırlığı + ikinci IV erişim",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. WAO 2020 Sınıf I: Refrakter anaflakside IV adrenalin infüzyon, sürekli titre edilmeli. IM yetersiz kaldı → IV geçiş zamanı. Stridor → havayolu ekibi hazır. Entübasyon eşiği düşük tut.",
        },
        {
          id: "opt_glukagon",
          text: "Glukagon 1-5 mg IV bolus (beta-blokör kullanıcısıysa)",
          correct: true,
          points: 15,
          feedback:
            "✓ DOĞRU (şartlı). Beta-blokör kullanan hastalarda adrenerjik direnci aşmak için glukagon cAMP ile bypass eder. Bu hastada beta-blokör öyküsü yok, ancak bilinmesi gereken ilke. Eğer beta-blokör öyküsü olsaydı — Sınıf IIa.",
          min_difficulty: 4,
        },
        {
          id: "opt_uc_doz_im",
          text: "3. doz adrenalin IM ver ve beklemeye devam et",
          correct: false,
          points: 5,
          feedback:
            "⚠️ Kısmi. IM 3. doz geçiş önce düşünülebilir ama 2 doz IM sonrası TA hâlâ 85/45 → IV infüzyon zamanı. IM yeterli rekanalizasyon sağlamıyor, IV'e geçiş gerekli.",
        },
        {
          id: "opt_steroid_antihistamin",
          text: "Kortikosteroid dozu artır + antihistaminik IV ekle, adrenalini durdur",
          correct: false,
          points: -25,
          feedback:
            "✗ KLASİK HATA. Steroid/antihistaminik yardımcı tedavi — ADRENALIN ASLA DURDURULMAZ. WAO 2020 Sınıf I: Adrenalin anaflakside birincil ve vazgeçilmez ilaçtır. Steroid+antihistaminik monoterapide ölüm riski yüksek.",
          critical: true,
        },
        {
          id: "opt_noradrenalin",
          text: "Noradrenalin infüzyon başla, adrenalini durdur",
          correct: false,
          points: -15,
          feedback:
            "✗ Noradrenalin vazopressör olarak kullanılabilir ama ADRENALİN DEVAM ETMELİ. Noradrenalin ek tedavi olarak adrenaline ek verilir, yerine geçmez. Anafilakside adrenalin spesifik mekanizmalarla etkilidir (α+β+mast hücre baskısı).",
        },
        {
          id: "opt_antihistamin_bekle",
          text: "Antihistaminik IV ver, düzelmesini bekle",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. Stridor + hipotansiyon → ölümcül gecikme. Antihistaminik asla monoterapi değil. WAO 2020: Bu klinik tabloda antihistaminikle beklemek ihmal sayılır.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 4: İzlem =====
    {
      id: "s4_izlem",
      kind: "info",
      title: "Klinik Yanıt ve İzlem",
      prompt: "",
      content:
        "Hasta adrenalin + sıvı sonrası düzeldi. TA 112/70, HR 96, SpO₂ 97%. Triptaz sonucu 28 ng/mL (>11.4 — mast hücre aktivasyonu). Laktat 30. dakikada 3.8→2.1 düştü. Bifazik reaksiyon riski %5-20 — semptomlar geçtikten 4-12 saat sonra yeniden ortaya çıkabilir. En az 6-8 saat gözlem önerilir.",
    },

    // ===== YENİ: s5b_observation — Disposisyon =====
    {
      id: "s5b_observation",
      kind: "decision",
      title: "Taburculuk / Yatış Kararı",
      prompt:
        "Klinik stabilizasyon sağlandı. TA 115/70, semptomlar geriledi, hasta iyi hissediyor. Taburcu olmak istiyor. Disposition kararınız?",
      options: [
        {
          id: "opt_gozlem_otoenjek",
          text: "Acil gözlem 6-8 saat + adrenalin oto-enjektör reçetesi + alerji uzmanı yönlendirme",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. WAO 2020 + EAACI 2021: Orta-ağır anaflakside 6-8h gözlem standardı — bifazik reaksiyon riski %5-20 (4-12h sonra). Oto-enjektör (Penepin/Epipen) hayat kurtarıcı — mutlak. Alerji uzmanı: tetikleyici tanımlama + deri testi + cilt testi.",
        },
        {
          id: "opt_kisa_gozlem",
          text: "2 saat gözlem → stabil görünüyorsa taburcu",
          correct: false,
          points: -10,
          feedback:
            "✗ 2 saat yetersiz. Bifazik reaksiyon 4-12 saat sonra olabilir — 6-8h gözlem standardı. 2 saatte asemptomatik olan hasta 6. saatte yeniden anaflaksi yaşayabilir.",
        },
        {
          id: "opt_hemen_taburcu",
          text: "Hemen taburcu — oral steroid + antihistaminik reçetesi yaz, 3 gün kullan",
          correct: false,
          points: -25,
          feedback:
            "✗ Bifazik reaksiyon riski göz ardı edildi. Oto-enjektör verilmedi — bir sonraki maruziyet ölümcül olabilir. Oral steroid/antihistaminik yeterli değil.",
        },
        {
          id: "opt_yatir_48h",
          text: "Hastane yatış 48 saat (rutin)",
          correct: false,
          points: -5,
          feedback:
            "⚠️ Aşırı. Orta-ağır anaflakside 6-8h gözlem yeterli. 48h yatış refrakter/komplike durumlara rezerve edilir. Kaynakların verimli kullanımı da hekimlik sanatının parçası.",
        },
        {
          id: "opt_tetikleyici_kacanma",
          text: "Taburcu — sadece sefalosporin/beta-laktam kaçınma önerisi, oto-enjektör vermeden",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. Oto-enjektör olmadan taburcu = bir sonraki maruziyet için ölüm riski. Tetikleyici kaçınma tek başına yeterli değil — hasta yanlışlıkla maruz kalabilir. Oto-enjektör + aile eğitimi ZORUNLU.",
          critical: true,
        },
      ],
    },
  ],

  scoring: {
    max_points: 270,
    passing_score: 162,
    grade_bands: {
      A: 243,
      B: 202,
      C: 162,
      D: 121,
    },
    time_bonus: {
      target_seconds: 480,
      bonus_points: 10,
    },
  },

  debrief: {
    key_learnings: [
      "Anaflaksi KLİNİK TANIDIR — lab sonucu beklenmez. Tetikleyici + ≥2 sistem tutulumu = tanı tamamlandı, adrenalin hemen.",
      "İlk ve en önemli ilaç IM ADRENALİN (0.3-0.5 mg anterolateral uyluk) — gecikme ölümün en sık nedenidir.",
      "Antihistaminik ve steroid adrenalinin YERİNE GEÇMEZ — yalnızca ek tedavidir. Monoterapi ile ölüm riski yüksek.",
      "Triptaz semptomdan 1-2 saat sonra pik yapar, 6-8 saat içinde düşer — semptom başında hemen gönder. Geç gönderim değersiz.",
      "Refrakter anaflaksi (2× IM adrenalin sonrası hâlâ hipotansif): IV adrenalin infüzyon (0.1 mcg/kg/dk, titre et). WAO 2020 Sınıf I.",
      "Beta-blokör kullanan hastada adrenaline direnç: glukagon 1-5 mg IV alfa/beta blokajını bypass eder.",
      "Bifazik reaksiyon %5-20 vakada görülür, 4-12 saat sonra — 6-8 saat gözlem standardı (orta-ağır anaflakside).",
      "Taburculuk şartları: oto-enjektör (Penepin/Epipen) reçetesi + kullanım eğitimi + alerji uzmanı yönlendirme.",
      "Sefalosporin-penisilin çapraz reaksiyon %1-3 (eski rakam %10 YANLIŞ). Her iki ilaç alerjisi olan hasta alerji uzmanında değerlendirilmeli.",
    ],
    references: [
      "WAO (World Allergy Organization) Anaphylaxis Guidance 2020",
      "EAACI Anaphylaxis Guidelines 2021",
      "AAAAI/ACAAI Joint Task Force Practice Parameters 2020",
      "AİİD (Türkiye Astım, Allerji ve İmmünoloji Derneği) Anaflaksi Tanı/Tedavi Rehberi 2022",
      "REMA (Red Española de Mastocitosis) Triptaz Tanı Kriterleri 2021",
    ],
    red_flags: [
      "Adrenalin gecikmesi — en sık mortalite nedeni. Tanıyı koydun, adrenalin ver.",
      "IV adrenalin bolus (hızlı) — sadece kardiyak arrest durumunda. Diğer tüm durumlarda IV adrenalin infüzyon + titre et.",
      "Antihistaminik/steroid ile 'tedavi ettim' yanılgısı — monoterapi ile ölüm riski.",
      "Triptaz sonucu beklenerek adrenalin geciktirme — klinik tanı yeterli.",
      "Oto-enjektörsüz taburcu — bir sonraki maruziyet ölümcül olabilir.",
      "Bifazik reaksiyon gözlemini atlama — 6-8h önce taburcu etme.",
    ],
    next_scenarios: [],
  },
};
