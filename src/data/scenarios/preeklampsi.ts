// ============================================================
// MediSim TR — Ağır Preeklampsi / Eklampsi Senaryosu
// ============================================================
// Klinik referans: ACOG Practice Bulletin 222 (2020),
// Türk Jinekoloji ve Obstetri Derneği Preeklampsi Kılavuzu 2022,
// WHO Recommendations for Prevention and Treatment of Pre-eclampsia 2023.
// Ana öğretim hedefi: ağır özellik kriterleri, MgSO4 protokolü,
// antihipertansif tedavi, doğum kararı.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_preeklampsi: Scenario = {
  id: "kadin_dogum-preeklampsi-001",
  version: "0.1.0",
  title: "32 Yaş Kadın — 36 Haftalık Gebe, Baş Ağrısı ve Hipertansiyon",
  description:
    "36 haftalık primigravid hasta, baş ağrısı, görme bozukluğu ve TA 168/110 ile acile başvurdu. Ağır preeklampsi tanı kriterleri, MgSO4 ve antihipertansif yönetimi.",
  specialty: "kadin_dogum",
  tags: ["preeklampsi", "eklampsi", "mgsO4", "magnezyum", "obstetri", "doğum"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ACOG PB 222 (2020), WHO 2023 uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 32,
    sex: "F",
    weight_kg: 72,
    height_cm: 163,
    chief_complaint:
      "36 haftalık ilk gebelik. Sabahtan beri şiddetli baş ağrısı, gözlerinde parlama hissi ve şişlik var. Kan basıncı yüksek.",
    history_items: [
      "Primigravida — 36 hafta",
      "Obstetrik takip: düzenli gidiyordu, son kontrol 4 hafta önce — TA normaldi",
      "Aile öyküsü: anne de gebelikte hipertansiyon yaşamış",
      "Sigara içmiyor",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {
      gebelik: true,
    },
  },

  initial_vitals: {
    hr: 96,
    bp_systolic: 168,
    bp_diastolic: 110,
    spo2: 98,
    temp: 37.0,
    rr: 18,
    pain: 6,
    gcs: 15,
  },

  available_medications: [
    "magnezyum_sulfat",
    "labetalol",
    "hidralazin",
    "nifedipin",
    "deksametazon",
    "betametazon",
    "kalsiyum_glukonat",
    "oksitosin",
    "diazepam",
  ],

  available_equipment: [
    "monitor",
    "tansiyon_aleti",
    "pulse_oksimetre",
    "iv_kateter_18g",
    "kateter_foley",
    "ultrasonografi",
    "fetal_kalp_monitoru",
    "reflex_çekici",
  ],

  ekg_pattern: "normal_sinüs",

  start_step_id: "s1_agir_pre_tani",

  steps: [
    // ====================================================
    // ADIM 1 — Ağır preeklampsi tanısı
    // ====================================================
    {
      id: "s1_agir_pre_tani",
      kind: "action",
      title: "Ağır Preeklampsi Değerlendirmesi",
      prompt:
        "Hasta acile getirildi. Ağır preeklampsi şüphesiyle değerlendirmeyi başlatın.",
      narrative:
        "TA 168/110. Başağrısı ve görme bozukluğu var. Bacaklarda belirgin ödem. Fetal kalp sesleri 140/dk.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "idrar_protein" },
          points: 15,
          feedback:
            "Doğru — Spot protein/kreatinin oranı veya 24 saat idrar proteini. Preeklampside ≥0.3 g/gün veya spot ≥0.3 anlamlı.",
        },
        {
          action: { type: "order_test", target_id: "tam_kan_sayimi" },
          points: 12,
          feedback:
            "Doğru — Trombositopeni HELLP sendromunu düşündürür. Plt <100.000 ağır özellik.",
        },
        {
          action: { type: "order_test", target_id: "karaciger_fonksiyon_testleri" },
          points: 15,
          feedback:
            "Doğru — AST/ALT yükselmesi HELLP kriterini gösterir. AST >70 U/L ağır özellik sayılır.",
        },
        {
          action: { type: "order_test", target_id: "kreatinin" },
          points: 10,
          feedback:
            "Doğru — Kreatinin >1.1 mg/dL (bazalsiz) veya 2 katı artış ağır özellik.",
        },
        {
          action: { type: "use_equipment", target_id: "fetal_kalp_monitoru" },
          points: 15,
          feedback:
            "Doğru — NST (non-stress test) veya kardiyotokografi zorunlu. Fetal iyilik durumu değerlendir.",
        },
        {
          action: { type: "use_equipment", target_id: "kateter_foley" },
          points: 10,
          feedback:
            "Doğru — Saatlik idrar çıkışı takibi: oligüri <0.5 mL/kg/saat ağır özellik.",
        },
        {
          action: { type: "examine", target_id: "derin_tendon_refleksleri" },
          points: 8,
          feedback:
            "Doğru — Hiperrefleksi/klonus: nöbet riski göstergesi. MgSO4 başlamadan önce baseline.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Preeklampsi değerlendirmesinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 2 — Magnezyum sulfat nöbet profilaksisi
    // ====================================================
    {
      id: "s2_mgso4",
      kind: "action",
      title: "MgSO4 Nöbet Profilaksisi",
      prompt:
        "TA 168/110, baş ağrısı, görme bozukluğu — ağır preeklampsi kriterleri karşılandı. Nöbet profilaksisi başlatın.",
      narrative:
        "Eklampsi (nöbet) riski yüksek. MgSO4 profilaksisi ACOG class I A kanıt. Kalsiyum glukonat hazır olmalı.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: {
            type: "give_medication",
            target_id: "magnezyum_sulfat",
            dose: "4-6 g IV yükleme 15-20 dk",
          },
          points: 30,
          feedback:
            "Doğru — MgSO4 yükleme dozu: 4-6 g IV (dilüe, 15-20 dk). Ardından 1-2 g/saat idame. ACOG/WHO önerir: eklamptik nöbeti önler ve tedavi eder.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback: "Doğru — Güvenilir IV yol şart. MgSO4 damar yoluyla verilmeli.",
        },
        {
          action: { type: "order_test", target_id: "magnezyum_duzeyi" },
          points: 10,
          feedback:
            "Doğru — Tedavi penceresi: 5-7 mEq/L. Toksik: >9 mEq/L (respiratuvar arrest: >12 mEq/L).",
          min_difficulty: 3,
        },
        {
          action: { type: "examine", target_id: "patellar_refleks" },
          points: 10,
          feedback:
            "Doğru — MgSO4 idamede saat başı: patellar refleks (kaybolması toksisite!), SS, SpO₂, idrar çıkışı takibi.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Nöbet profilaksisinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 3 — Antihipertansif tedavi
    // ====================================================
    {
      id: "s3_antihipertansif",
      kind: "decision",
      title: "Antihipertansif Seçimi",
      prompt:
        "TA 168/110. Ağır hipertansiyon (SBP≥160 veya DBP≥110) için acil antihipertansif başlayın. Hangi ilacı seçersiniz?",
      options: [
        {
          id: "opt_labetalol",
          text: "Labetalol 20 mg IV bolus (15 dk aralıklarla 40-80 mg eklenebilir, max 300 mg)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — Labetalol gebelikte güvenli, etkin. ACOG birinci tercih. Bradikardi açısından izle.",
        },
        {
          id: "opt_hidralazin",
          text: "Hidralazin 5-10 mg IV — gebelikte uzun süreli kanıt var",
          correct: true,
          points: 22,
          feedback:
            "Doğru — Hidralazin gebelikte uzun süredir kullanılır. Refleks taşikardi ve maternal hipotansiyona dikkat.",
        },
        {
          id: "opt_nifedipin_oral",
          text: "Nifedipin 10-20 mg oral (hızlı etkili)",
          correct: true,
          points: 20,
          feedback:
            "Doğru — Oral nifedipin ağır hipertansiyonda etkin. ACOG/WHO: IV yol olmadan kullanılabilir. Sublingualden kaçın (hızlı düşüş: utero-plasental hipoperfüzyon).",
        },
        {
          id: "opt_ace_inhibitor",
          text: "Enalapril IV — güçlü antihipertansif",
          correct: false,
          points: -25,
          feedback:
            "KESİN KONTRENDİKE — ACE inhibitörleri gebelikte fetal toksik (renal displazi, oligohidramnioz, fetal ölüm). Kullanılmamalı.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 — Doğum kararı
    // ====================================================
    {
      id: "s4_dogum_karari",
      kind: "decision",
      title: "Doğum Kararı",
      prompt:
        "Hasta 36 haftalık, ağır preeklampsi kriterleri var. Ne yaparsınız?",
      options: [
        {
          id: "opt_dogur",
          text: "Hemen doğumu başlat (indüksiyon veya sezaryen) — 36 haftada ağır pre'de kesin endikasyon",
          correct: true,
          points: 30,
          feedback:
            "Doğru — ACOG: ≥34 hafta + ağır preeklampsi = doğum endikasyonu. 36 haftada bekleme önerilmez, perinatal sonuçlara katkısı yok.",
        },
        {
          id: "opt_deksametazon_bekle",
          text: "<34 hafta olsaydı kortikosteroid (betametazon) ver, 48 saat bekle",
          correct: true,
          points: 15,
          feedback:
            "Doğru prensip ama bu senaryoda 36 hafta — kortikosteroid penceresi kapanmış. ≥34 haftada bekleme önerilmez.",
        },
        {
          id: "opt_bekle",
          text: "TA kontrol altında, 38-40 haftaya kadar bekle",
          correct: false,
          points: -30,
          feedback:
            "Yanlış — Ağır preeklampsi ≥34 haftada bekleme endikasyonu yoktur. Maternal (nöbet, ablasyon, stroke) ve fetal komplikasyonlar riski kabul edilemez.",
        },
      ],
    },

    // ====================================================
    // ADIM 5 — Eklampsi (konvülsiyon) gelişirse (S3+)
    // ====================================================
    {
      id: "s5_eklampsi_nöbet",
      kind: "action",
      title: "Eklampsi — Aktif Nöbet Yönetimi",
      prompt:
        "Hasta nöbet geçiriyor (tonik-klonik, 90 sn sürüyor). Ne yaparsınız?",
      narrative:
        "Eklampsi gelişti. Hasta sağ tarafı dönüktü, ağız hafif açık. SpO₂ düşüyor.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "magnezyum_sulfat", dose: "2-4 g IV" },
          points: 25,
          feedback:
            "Doğru — Aktif eklampside MgSO4 2-4 g IV bolus (5 dk). MgSO4 başlanmamışsa yükleme dozu ver. Başlanmışsa ek 2 g ver.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback: "Doğru — O₂ destek: SpO₂ hedef ≥95%.",
        },
        {
          action: { type: "examine", target_id: "lateral_dekubitus" },
          points: 8,
          feedback:
            "Doğru — Sol lateral pozisyon: aorto-kaval bası azaltır, aspirasyon riskini düşürür.",
        },
        {
          action: { type: "give_medication", target_id: "diazepam" },
          points: -5,
          feedback:
            "Dikkatli — MgSO4 başlandıysa diazepam ikinci seçenek. MgSO4'e dirençli nöbette eklenir. Fetal CNS baskısına dikkat.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -8,
      default_wrong_feedback: "Aktif eklampsi yönetiminde öncelik değil.",
    },
  ],

  scoring: {
    max_points: 200,
    passing_score: 130,
    grade_bands: { A: 175, B: 150, C: 130, D: 100 },
  },

  debrief: {
    key_learnings: [
      "Ağır preeklampsi kriterleri: SBP≥160 veya DBP≥110, trombositopeni <100k, kreatinin >1.1, AST/ALT 2×üst normal, şiddetli baş ağrısı/görme bozukluğu.",
      "MgSO4: ACOG class I A — nöbet profilaksisi ve eklamptik nöbet tedavisinde altın standart.",
      "MgSO4 takibi: patellar refleks, SS, idrar çıkışı. Toksisite antidotu: kalsiyum glukonat.",
      "Antihipertansif: labetalol IV, hidralazin IV, veya oral nifedipin. ACE inhibitörleri KESİN KONTRENDİKE.",
      "≥34 hafta + ağır preeklampsi = DOĞUM ZAMANI. Bekleme perinatal sonucu iyileştirmez, maternal riski artırır.",
    ],
    references: [
      "ACOG Practice Bulletin 222 (2020) — Gestational Hypertension and Preeclampsia",
      "WHO Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia (2023)",
      "Türk Jinekoloji ve Obstetri Derneği Preeklampsi Kılavuzu 2022",
      "ISSHP Classification 2021",
    ],
    red_flags: [
      "Eklampsi başlarsa: sol lateral, hava yolu açıklığı, O₂, MgSO4 2-4 g IV bolus",
      "MgSO4 toksisitesi: refleks kaybı → infüzyon durdur, kalsiyum glukonat 1 g IV",
      "HELLP sendromu: Plt <100k + AST yüksek + hemoliz → 24-48 saat içinde doğum",
      "Maternal bradikardi labetalol sonrası → doz azalt, atropin hazır tut",
    ],
    next_scenarios: ["kadin_dogum-hellp-001", "kadin_dogum-postpartum-kanama-001"],
  },
};
