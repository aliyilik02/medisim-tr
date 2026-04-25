// ============================================================
// MediSim TR — Hızlı Seri Entübasyon / Anestezi Senaryosu
// ============================================================
// Klinik referans: SIAARTI, ESA (European Society of Anaesthesiology)
// RSI Guidelines 2022, UpToDate RSI protokolü.
// Ana öğretim hedefi: RSI endikasyonu, preoksijenasyon, ilaç seçimi
// (indüksiyon + nöromüsküler bloker), laringoskopi, tüp konfirmasyonu.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_rsi_entübasyon: Scenario = {
  id: "anestezi-rsi-001",
  version: "0.1.0",
  title: "35 Yaş Erkek — Azalmış Bilinç, Havayolu Yönetimi",
  description:
    "Trafik kazasında araç dışına fırlayan hasta. GKS 9, çeşitli yüz-baş travması, aspirasyon riski yüksek. RSI ile güvenli havayolu yönetimi.",
  specialty: "anestezi",
  tags: ["rsi", "entübasyon", "havayolu", "anestezi", "travma", "süksinilkolin"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4, 5],
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESA RSI Guidelines 2022 uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 35,
    sex: "M",
    weight_kg: 80,
    height_cm: 175,
    chief_complaint:
      "Trafik kazası, araç dışına fırlamış. GKS 9 (E2V2M5). Yüzde laserasyonlar, boyun ağrısı. Son yemek 2 saat önce.",
    history_items: [
      "Bilinen hastalık yok (aile ifadesi)",
      "Son yemek: 2 saat önce — TAM MİDE (aspirasyon riski!)",
      "Alkol kokusu",
      "Boyun travması — servikal stabilizasyon uygulandı",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 98,
    bp_diastolic: 62,
    spo2: 91,
    temp: 36.8,
    rr: 26,
    pain: 5,
    gcs: 9,
  },

  available_medications: [
    "propofol",
    "ketamin",
    "etomidat",
    "süksinilkolin",
    "rokuronyum",
    "atropin",
    "fentanil",
    "morfin",
    "midazolam",
    "sugammadeks",
    "adrenalin",
    "noradrenalin",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "oksijen_maske",
    "bvm_maskesi",
    "larengoskop",
    "endotrakeal_tup",
    "kapnograf",
    "iv_kateter_18g",
    "servikal_yaka",
    "aspirator",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  start_step_id: "s1_hazirlik",

  steps: [
    // ====================================================
    // ADIM 1 — RSI hazırlığı ve preoksijenasyon
    // ====================================================
    {
      id: "s1_hazirlik",
      kind: "action",
      title: "RSI Hazırlığı ve Preoksijenasyon",
      prompt:
        "Hasta RSI kararı verildi. Entübasyon öncesi hazırlığı yapın.",
      narrative:
        "SpO₂ %91, GKS 9, aspirasyon riski var. Ekip hazır, laringoskop çalışır durumda.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 20,
          feedback:
            "Doğru — Preoksijenasyon: %100 O₂ ile 3 dakika (yeterli zaman varsa) veya 8 derin nefes. SpO₂'yi azami %99'a çıkar. RSI'da en kritik adım.",
        },
        {
          action: { type: "use_equipment", target_id: "aspirator" },
          points: 15,
          feedback:
            "Doğru — Yanakta hazır aspirasyon! Tam mide → regürjitasyon riski yüksek. Aspiratörün çalıştığını kontrol et.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — Sürekli kardiyak ve SpO₂ monitorizasyon zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback: "Doğru — Güvenilir IV yol şart. Tercihen 2 adet.",
        },
        {
          action: { type: "examine", target_id: "malampati_havayolu" },
          points: 15,
          feedback:
            "Doğru — Zor havayolu tahmini: Mallampati, tiroid-çene mesafesi, ağız açıklığı. GKS düşük — muayene kısıtlı ama kontrol şart.",
          min_difficulty: 3,
        },
        {
          action: { type: "use_equipment", target_id: "kapnograf" },
          points: 8,
          feedback:
            "Doğru — Kapnograf hazır tutulmalı. Entübasyon sonrası EtCO₂ konfirmasyonu zorunlu.",
        },
        {
          action: { type: "give_medication", target_id: "atropin" },
          points: 8,
          feedback:
            "Kabul — Premedikasyon: süksinilkolin refleks bradikardisine karşı pediatride standart, erişkinde tartışmalı. Bu hastada opsiyonel.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "RSI hazırlığında bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 2 — İndüksiyon ajanı seçimi
    // ====================================================
    {
      id: "s2_indüksiyon",
      kind: "decision",
      title: "İndüksiyon Ajanı Seçimi",
      prompt:
        "Hasta hemodinamik olarak sınırda (TA 98/62). Hangi indüksiyon ajanını seçersiniz?",
      narrative:
        "Propofol ile hipotansiyon riski var. Ketamin sempatik uyarıcı etkisiyle travmada avantajlı. Etomidat da hemodinamik stabildir.",
      options: [
        {
          id: "opt_ketamin",
          text: "Ketamin 1.5 mg/kg IV — travmada hemodinamik açıdan avantajlı",
          correct: true,
          points: 25,
          feedback:
            "Mükemmel seçim. Ketamin: sempatomimetik etki → kan basıncını korur. Bronkodilatatör. TBI'da ICP artışı kaygısı var ama güncel kanıt bunu desteklemiyor.",
        },
        {
          id: "opt_etomidat",
          text: "Etomidat 0.3 mg/kg IV — kardiyovasküler stabilite",
          correct: true,
          points: 22,
          feedback:
            "İyi seçim. Etomidat hemodinamiyi en az etkileyen ajanlardan biri. Kortizol baskısı tartışmalı — tek doz sorun yaratmaz.",
        },
        {
          id: "opt_propofol",
          text: "Propofol 2 mg/kg IV — güçlü indüksiyon",
          correct: false,
          points: -15,
          feedback:
            "Riskli — Propofol belirgin vazodilatasyon ve kardiyak baskı yapar. TA 98/62 olan hastada hipotansiyon riski çok yüksek. Seçmemelisiniz.",
        },
        {
          id: "opt_midazolam",
          text: "Midazolam 0.1 mg/kg IV — sedatif",
          correct: false,
          points: -10,
          feedback:
            "Hatalı — Midazolam RSI indüksiyonu için yeterince hızlı ve güçlü değil. RSI'da propofol / ketamin / etomidat tercih edilir.",
        },
      ],
    },

    // ====================================================
    // ADIM 3 — Nöromüsküler bloker seçimi
    // ====================================================
    {
      id: "s3_nmb_secimi",
      kind: "decision",
      title: "Nöromüsküler Bloker Seçimi",
      prompt:
        "İndüksiyon sonrası hangi nöromüsküler bloker kullanırsınız?",
      narrative:
        "RSI için hızlı başlangıç süresi kritik. Hasta boyun travmalı — kötü entübasyon koşullarında desatürasyon riski var.",
      options: [
        {
          id: "opt_suksinilkolin",
          text: "Süksinilkolin 1.5 mg/kg IV (başlangıç: 60-90 sn, süre: 9-13 dk)",
          correct: true,
          points: 20,
          feedback:
            "Doğru — Hızlı başlangıç ve kısa etki süresi RSI için idealdir. Kontrendikasyon yok (hiperkalemi, göz travması, yanık, immobilizasyon 48+ saat YOK).",
        },
        {
          id: "opt_rokuronyum",
          text: "Rokuronyum 1.2 mg/kg IV (yüksek doz RSI dozu, başlangıç: ~60 sn)",
          correct: true,
          points: 18,
          feedback:
            "Doğru — Yüksek dozda rokuronyum RSI koşullarını sağlar. Avantaj: süksinilkolin kontrendikasyonlarında seçenek. Sugammadeks ile hızla antagonize edilebilir.",
        },
        {
          id: "opt_rokuronyum_dusuk",
          text: "Rokuronyum 0.6 mg/kg IV (standart intübasyon dozu)",
          correct: false,
          points: -10,
          feedback:
            "Yanlış doz — RSI için yeterli değil. Standart doz yavaş başlangıç yapar, RSI koşullarını sağlayamaz. 1.2 mg/kg gerekli.",
        },
        {
          id: "opt_vekuronyum",
          text: "Vekuronyum 0.1 mg/kg (standart doz)",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — Vekuronyum başlangıcı yavaş (3-5 dk). RSI için uygun değil.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 — Entübasyon ve konfirmasyon
    // ====================================================
    {
      id: "s4_entübasyon_konfirmasyon",
      kind: "action",
      title: "Entübasyon ve Tüp Konfirmasyonu",
      prompt:
        "İlaçlar verildi, kas gevşemesi sağlandı. Entübasyonu gerçekleştirin ve tüp yerini doğrulayın.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "larengoskop" },
          points: 15,
          feedback:
            "Doğru — Laringoskopi uygulandı. Görünüm: Cormack-Lehane evre I. Vokal kordlar görülüyor.",
        },
        {
          action: { type: "use_equipment", target_id: "endotrakeal_tup" },
          points: 15,
          feedback:
            "Doğru — ETT yerleştirildi. 80 kg erkek için çap 8.0 mm, diş hizasına göre 21-23 cm işaretlenmeli.",
        },
        {
          action: { type: "use_equipment", target_id: "kapnograf" },
          points: 20,
          feedback:
            "Doğru — EtCO₂ konfirmasyonu: altın standart. EtCO₂ dalgası görülüyorsa ETT doğru yerde. Özofageal entübasyonu dışlar.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback:
            "Doğru — SpO₂ takibi: entübasyon sonrası yükselmelidir. %95+ hedeflenir.",
        },
        {
          action: { type: "examine", target_id: "aci_hareketleri" },
          points: 10,
          feedback:
            "Doğru — Her iki akciğer oskültasyonu: bilateral eşit solunum sesi. Özofageal entübasyonu dışla.",
        },
        {
          action: { type: "order_test", target_id: "akciger_grafisi" },
          points: 8,
          feedback:
            "Doğru — ETT yerini doğrulama için PA akciğer grafisi. Karina 2 cm üzeri hedeflenir.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Entübasyon sonrası bu adım öncelik değil.",
    },
  ],

  scoring: {
    max_points: 190,
    passing_score: 120,
    grade_bands: { A: 165, B: 140, C: 120, D: 90 },
  },

  debrief: {
    key_learnings: [
      "RSI = İndüksiyon + NMB eş zamanlı, Sellick manevrası (krikoid bası) tartışmalı — aspirasyon riski yüksekse değerlendir.",
      "Preoksijenasyon en kritik adım: %100 O₂ 3 dk veya 8 derin nefes. Apne tolerans süresi belirler.",
      "Hemodinamik instabilite: Ketamin veya etomidat; propofol'dan kaçın.",
      "Süksinilkolin RSI standardı; kontrendikasyonlarda yüksek doz rokuronyum (1.2 mg/kg) kullan.",
      "Tüp konfirmasyonu: EtCO₂ (altın standart) + bilateral oskültasyon + SpO₂ yükselmesi.",
      "Zor havayolu planı: video laringoskop hazır, LMA veya cerrahi havayolu son seçenek.",
    ],
    references: [
      "ESA Difficult Airway Management Guidelines 2022",
      "UpToDate: Rapid sequence intubation in adults for emergency medicine",
      "SIAATRI RSI Protocol 2021",
      "Cormack-Lehane sınıflandırması",
    ],
    red_flags: [
      "EtCO₂ yok → özofageal entübasyon! Hemen çıkar, BVM ile ventile et",
      "Entübasyon sonrası TA düşüşü → propofol etkisi veya tansiyon PTX",
      "SpO₂ entübasyon sırasında <88% → STOP, BVM ile okside et, sonra tekrar dene",
      "Süksinilkolin + hiperkalemi riski: yanık, ezilme sendromu, immobilizasyon > 48 saat",
    ],
    next_scenarios: ["anestezi-zor-havayolu-001", "anestezi-malign-hipertermi-001"],
  },
};
