import { defineScenario } from "@/engine";

// ============================================================
// PİLOT SENARYO — Opioid Overdoz (Toksikoloji) — DRAFT
// ============================================================
// Üretim sisteminin (Blok 1 kontrat + Blok 2 ekipman mapper + Blok 3 validate
// + Blok 4 skill) UÇTAN UCA çalıştığının kanıtı. Sıfır-kapsama yüksek-öncelik
// branş: toksikoloji (mevcut 14'te yok).
//
// ⚠️⚠️ KLİNİK İÇERİK — REVIEWED_PENDING_ACTIVATION (ACTIVE değil) ⚠️⚠️
// Klinik tur (22 Haz): klinik boşluklar kaynaklı dolduruldu — naloksan doz/yol
// (0.4 mg IV titre, Goldfrank's 11e + UpToDate), toksidrom vitalleri, ICD-10
// T40.2 / SNOMED 242253008, referans baskı/yıl. Trend/etki miktarları
// simülasyon kalibrasyonudur (kılavuz literal Δ vermez).
// clinical_review.status = "REVIEWED_PENDING_ACTIVATION" — ACTIVE'i Ali Bey verir.
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
  // Opioid toksidromu başlangıç vitalleri — Goldfrank's 11e (2019) + UpToDate
  // "Acute opioid intoxication": bradipne (RR<12, sıklıkla <8), miyozis (pupil
  // ~2 mm, reaktif), SSS depresyonu (GCS düşük), hipoventilasyona bağlı
  // hipoksemi. HR/BP başlangıçta korunur (ağır hipoksiye dek). Değerler
  // kılavuzla tutarlı; REVIEWED — ACTIVE'i Ali Bey verir.
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
        // Tedavisiz opioid solunum depresyonu → ilerleyici hipoksi → apne/
        // bradikardi/arrest (dakikalar içinde). delta_per_sec PEDAGOJİK tempo
        // (gerçek-zaman sıkıştırma), literal fizyoloji değil — kaynak: Goldfrank's
        // 11e opioid bölümü (klinik seyir yönü).
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
      // Naloksan etkisi (IV onset 1-2 dk) VEYA etkin ventilasyon sonrası hızlı
      // düzelme. Tempo pedagojik — kaynak: UpToDate naloksan farmakokinetiği.
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

  // ICD-10 (TR, WHO): T40.2 "Diğer opioidlerle zehirlenme". Alt-kırılım referansı:
  // T40.0 afyon · T40.1 eroin · T40.2 diğer opioidler (morfin/kodein/oksikodon) ·
  // T40.3 metadon · T40.4 sentetik (fentanil vb.). Genel opioid overdoz → T40.2.
  // SNOMED CT 242253008 "Overdose of opiate" (doğrulandı). Kaynak: WHO ICD-10 / SNOMED CT International.
  clinical_codes: {
    icd10: "T40.2",
    snomed_ct: "242253008",
  },

  debrief: {
    key_learnings: [
      "Opioid toksidromu: miyozis + solunum depresyonu + SSS depresyonu.",
      "Önce VENTİLASYON (BVM/oksijen) — antidot etki edene dek köprü.",
      "Naloksan opioid antagonisti; yarı ömrü kısa → re-narkotizasyon gözlemi.",
      "Flumazenil opioidde etkisiz + nöbet riski — yanlış antidot.",
    ],
    references: [
      "Goldfrank's Toxicologic Emergencies, 11. baskı (2019) — Opioids bölümü",
      "UpToDate — Acute opioid intoxication in adults (güncel sürüm)",
      "UÇEP-2020 — Zehirlenmeler / antidotlar (naloksan)",
      "TİTCK — Naloksan KÜB (Türkiye ruhsatlı; doz/yol)",
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
      source:
        "Naloksan dozu (katalog ile uyumlu): 0.4 mg IV başlangıç, RR düzelene dek " +
        "titre (opioid bağımlısında 0.1 mg ile başla — abrupt withdrawal kaçın); " +
        "IV yoksa 0.4 mg IM veya 2-4 mg intranazal; apne/peri-arrestte 2 mg. " +
        "Onset IV 1-2 dk; etki süresi 30-90 dk < çoğu opioid → re-narkotizasyon, " +
        "≥4-6 sa gözlem (uzun etkili opioid/metadonda daha uzun). " +
        "Kaynak: Goldfrank's 11e (2019) + UpToDate (Acute opioid intoxication).",
      status: "REVIEWED_PENDING_ACTIVATION",
    },
  ],

  clinical_review: {
    status: "REVIEWED_PENDING_ACTIVATION",
    reviewed_at: "2026-06-22",
    draft_areas: [],
    notes:
      "Klinik tur (22 Haz): tüm klinik boşluklar kaynaklı dolduruldu — initial_vitals " +
      "(Goldfrank's 11e toksidrom), naloksan doz/yol (katalog 0.4 mg IV titre + " +
      "Goldfrank's/UpToDate), deterioration/recovery tempo (pedagojik, opioid apne " +
      "seyri), ICD-10 T40.2 / SNOMED 242253008, referans baskı/yıl. Etki/trend " +
      "miktarları simülasyon kalibrasyonu (kılavuz literal Δ vermez). ACTIVE onayı Ali Bey'de.",
  },
});
