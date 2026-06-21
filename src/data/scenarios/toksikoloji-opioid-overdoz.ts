import { defineScenario } from "@/engine";

// ============================================================
// PİLOT SENARYO — Opioid Overdoz (Toksikoloji) — DRAFT
// ============================================================
// Üretim sisteminin (Blok 1 kontrat + Blok 2 ekipman mapper + Blok 3 validate
// + Blok 4 skill) UÇTAN UCA çalıştığının kanıtı. Sıfır-kapsama yüksek-öncelik
// branş: toksikoloji (mevcut 14'te yok).
//
// ⚠️⚠️ KLİNİK İÇERİK DRAFT ⚠️⚠️
// Tüm klinik sayısal değerler (naloksan dozu/yolu, solunum depresyonu trend
// hızı, antidot yanıt süresi, vital eşikleri) TODO_KLINIK etiketli — MAKUL
// başlangıç, klinik DEĞİL. Claude.ai kaynaklı doğrulayacak, ACTIVE'i Ali Bey verir.
// clinical_review.status = "DRAFT".
// ============================================================

export const scenario_toksikoloji_opioid_overdoz = defineScenario({
  id: "toksikoloji-opioid-overdoz-001",
  version: "1.0.0",
  title: "26Y Erkek — Bilinç Bulanıklığı ve Yüzeyel Solunum",
  description:
    "Evde yanıtsız bulunan genç erkek; miyotik pupil, yüzeyel solunum, " +
    "iğne izleri. Opioid toksisitesi — havayolu/solunum desteği + naloksan kararı.",
  specialty: "acil",
  tags: ["toksikoloji", "opioid", "antidot", "solunum-depresyonu", "naloksan"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR — üretim hattı pilotu",
  last_updated: "2026-06-21",

  patient: {
    age: 26,
    sex: "M",
    weight_kg: 72,
    chief_complaint: "Yanıtsız, nefesi çok yavaş (yakını getirdi).",
    history_items: [
      "Madde kullanım öyküsü (yakın ifadesi)",
      "Bilinen kronik hastalık yok",
    ],
    allergies: [],
  },
  // TODO_KLINIK: opioid toksisitesi başlangıç vitalleri (RR/SpO2/GCS/pupil derecesi)
  // — kaynak: Goldfrank's Toxicologic Emergencies / UpToDate opioid intoxication
  initial_vitals: {
    hr: 88,
    bp_systolic: 110,
    bp_diastolic: 70,
    spo2: 80,
    temp: 36.4,
    rr: 6,
    gcs: 7,
    pupil_left_mm: 2,
    pupil_right_mm: 2,
    pupil_reactive: true,
  },

  // Hepsi mapper'da tanımlı (Blok 2) → merkezi fizyoloji
  available_medications: ["naloksan", "salin_09", "flumazenil", "dekstroz_50"],
  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "oksijen_maske",
    "ambu",
    "entubasyon_seti",
    "iv_kateter_18g",
  ],
  use_central_equipment_effects: true,

  start_step_id: "ilk-degerlendirme",
  steps: [
    {
      id: "ilk-degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme (ABC)",
      prompt:
        "Hasta yanıtsız, solunumu yüzeyel. Önce ne yaparsın? (izlem, oksijenasyon, ventilasyon)",
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "genel" },
          points: 10,
          feedback:
            "İyi: miyotik pupil + solunum depresyonu + bilinç bulanıklığı = opioid toksidromu.",
          unlocks: ["tani-karar"],
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 5,
          feedback: "Monitörizasyon başlandı — SpO2/solunum yakın izlem.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 8,
          feedback:
            "Oksijenasyon başlandı. Ancak asıl sorun ventilasyon (RR çok düşük) — yetersiz kalabilir.",
        },
        {
          action: { type: "use_equipment", target_id: "ambu" },
          points: 12,
          feedback:
            "Doğru: yüzeyel solunumda BVM ile asiste ventilasyon hayat kurtarır (antidot etki edene dek).",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Bu aşamada öncelik ABC — havayolu/solunum.",
    },
    {
      id: "tani-karar",
      kind: "decision",
      title: "Toksidrom Tanısı",
      prompt:
        "Miyozis + solunum depresyonu + bilinç değişikliği. En olası toksidrom?",
      options: [
        {
          id: "opioid",
          text: "Opioid toksisitesi",
          correct: true,
          points: 20,
          feedback:
            "Doğru. Klasik triad: miyozis, solunum depresyonu, SSS depresyonu.",
        },
        {
          id: "antikolinerjik",
          text: "Antikolinerjik toksidrom",
          correct: false,
          points: -8,
          feedback:
            "Hayır — antikolinerjikte midriyazis, taşikardi, ateş, kuru cilt beklenir.",
        },
        {
          id: "sempatomimetik",
          text: "Sempatomimetik toksidrom",
          correct: false,
          points: -8,
          feedback: "Hayır — sempatomimetikte ajitasyon, hipertansiyon, midriyazis olur.",
          critical: true,
        },
      ],
    },
    {
      id: "antidot-karar",
      kind: "action",
      title: "Antidot / Müdahale",
      prompt:
        "Ventilasyon desteklenirken spesifik tedavi? Doğru antidotu seç veya yolu belirle.",
      expected_outcomes: [
        {
          // DOĞRU YOL → iyi son
          action: { type: "give_medication", target_id: "naloksan" },
          points: 30,
          feedback:
            "Doğru antidot: naloksan opioid reseptör antagonisti — solunumu geri döndürür.",
          unlocks: ["stabilizasyon"],
        },
        {
          action: { type: "use_equipment", target_id: "ambu" },
          points: 10,
          feedback:
            "Ventilasyon desteği doğru köprü — ama spesifik antidot (naloksan) gerekli.",
        },
        {
          // DALLANMA → komplikasyon yolu (gereksiz erken invaziv girişim)
          action: { type: "use_equipment", target_id: "entubasyon_seti" },
          points: 5,
          feedback:
            "Erken entübasyon: naloksan denenmeden invaziv havayolu çoğu opioid vakasında gereksiz. Komplikasyon riski.",
          unlocks: ["komplikasyon"],
        },
        {
          // KRİTİK HATA → yanlış antidot
          action: { type: "give_medication", target_id: "flumazenil" },
          points: -20,
          feedback:
            "YANLIŞ: flumazenil benzodiazepin antagonisti; opioidde etkisiz, miks/bağımlıda nöbet tetikler.",
          critical: true,
          unlocks: ["komplikasyon"],
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback: "Önce doğru antidot kararı.",
    },
    {
      id: "komplikasyon",
      kind: "info",
      title: "Komplikasyon — Geç/Yanlış Karar",
      prompt: "Durum kötüleşti, ek müdahale gerekti.",
      content:
        "Naloksan gecikti/yanlış seçildi → solunum depresyonu derinleşti, " +
        "hipoksi ilerledi. BVM ile ventilasyon ve naloksan ile geç de olsa " +
        "kurtarıldı. Ders: opioid toksisitesinde önce ventilasyon + erken naloksan.",
    },
    {
      id: "stabilizasyon",
      kind: "info",
      title: "Stabilizasyon",
      prompt: "Hasta yanıt verdi, solunum düzeldi.",
      content:
        "Naloksan sonrası solunum hızı ve bilinç düzeldi. DİKKAT: naloksan yarı " +
        "ömrü kısa — re-narkotizasyon için gözlem/tekrar doz gerekebilir. " +
        "Hasta izleme alınır.",
    },
  ],

  // ZORUNLU deterioration — tedavisiz opioid solunum depresyonu → apne/arrest
  deterioration: [
    {
      id: "solunum-depresyonu",
      label: "Opioid solunum depresyonu",
      trends: [
        // TODO_KLINIK: solunum depresyonu trend hızı (SpO2/RR düşüş) — kaynak: Goldfrank's opioid
        { vital: "spo2", delta_per_sec: -0.15, floor: 45 },
        { vital: "rr", delta_per_sec: -0.04, floor: 2 },
        { vital: "gcs", delta_per_sec: -0.01, floor: 3 },
      ],
      // Ventilasyon (BVM) VEYA antidot (naloksan) kötüleşmeyi durdurur
      halted_by: [
        { type: "give_medication", target_id: "naloksan" },
        { type: "use_equipment", target_id: "ambu" },
        { type: "use_equipment", target_id: "entubasyon_seti" },
      ],
      // TODO_KLINIK: naloksan/ventilasyon sonrası iyileşme hızı — kaynak: UpToDate
      recovery_trends: [
        { vital: "spo2", delta_per_sec: 0.5, ceiling: 97 },
        { vital: "rr", delta_per_sec: 0.15, ceiling: 16 },
        { vital: "gcs", delta_per_sec: 0.05, ceiling: 15 },
      ],
    },
  ],

  scoring: {
    // max_points = ulaşılabilir optimal (tüm pozitif outcome toplamı = 100).
    // structure.test auto-play en iyi skoru ile uyumlu; bonus audit'ten geçer.
    max_points: 100,
    passing_score: 60,
    grading_mode: "auto",
    grade_bands: { A: 85, B: 70, C: 55, D: 40 },
    score_floor: 0,
  },

  // ICD-10 / SNOMED CT kodlama (yapısal test zorunlu).
  // TODO_KLINIK: kesin kod (alt kırılım/7. karakter) doğrulanacak — kaynak: ICD-10 / SNOMED CT
  clinical_codes: {
    icd10: "T40.2", // Poisoning by other opioids
    snomed_ct: "242253008", // Overdose of opiate
  },

  debrief: {
    key_learnings: [
      "Opioid toksidromu: miyozis + solunum depresyonu + SSS depresyonu.",
      "Önce VENTİLASYON (BVM/oksijen) — antidot etki edene dek köprü.",
      "Naloksan opioid antagonisti; yarı ömrü kısa → re-narkotizasyon gözlemi.",
      "Flumazenil opioidde etkisiz + nöbet riski — yanlış antidot.",
    ],
    references: [
      // TODO_KLINIK: kesin baskı/yıl + doz tabloları doğrulanacak
      "Goldfrank's Toxicologic Emergencies (opioid intoxication)",
      "UpToDate — Acute opioid intoxication in adults",
      "UÇEP-2020 — Zehirlenmeler / antidotlar",
    ],
    red_flags: [
      "Yanlış antidot (flumazenil) — nöbet riski",
      "Ventilasyon atlanıp sadece izlem — hipoksik arrest",
    ],
  },

  // Klinik muhakeme (egitim modu — CEZASIZ, öğretici "neden?")
  reasoning_prompts: [
    {
      id: "rp-naloksan-neden",
      triggerIds: ["naloksan"],
      question: "Naloksanı neden bu hastada ilk spesifik tedavi olarak seçtin?",
      options: [
        {
          text: "Opioid reseptör antagonisti — solunum depresyonunu geri döndürür",
          correct: true,
        },
        { text: "Sedasyonu derinleştirip hastayı sakinleştirir", correct: false },
        { text: "Benzodiazepin etkisini geri çevirir", correct: false },
      ],
      explanation:
        "Naloksan kompetitif opioid antagonistidir; opioidin solunum depresan " +
        "etkisini hızla geri döndürür. Yarı ömrü kısa olduğundan re-narkotizasyon " +
        "açısından gözlem gerekir.",
      source: "TODO_KLINIK: Goldfrank's / UpToDate — doz ve yol doğrulanacak",
      status: "DRAFT",
    },
  ],

  clinical_review: {
    status: "DRAFT",
    draft_areas: [
      "initial_vitals",
      "deterioration",
      "naloksan-doz-yol",
      "reasoning_prompts",
      "references",
    ],
    notes:
      "Üretim hattı pilotu. Tüm klinik sayısal değerler TODO_KLINIK — Claude.ai " +
      "kaynaklı doğrulanacak. ACTIVE onayı Ali Bey.",
  },
});
