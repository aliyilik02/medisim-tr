import type { Scenario } from "@/engine";

// ============================================================
// Hipoglisemi Senaryosu — 60y Erkek, Tip 2 DM, Sulfonilüre
// ============================================================
// Zorluk seviyeleri 1-3 destekli.
// S1: Glukometre → Dekstroz → Gözlem kararı (temel)
// S2: + Tiamin önceliği, sulfonilüre uzun etki farkındalığı
// S3: + %10 dekstroz infüzyonu vs oral yol kararı
//
// Kaynaklar:
// - ADA Standards of Care in Diabetes 2024, Sec. 6
// - TEMD Diyabet Tanı ve Tedavi Rehberi 2022
// - Cryer PE. Hypoglycemia in Diabetes. Diabetes Care 2003
// ============================================================

export const scenario_hipoglisemi: Scenario = {
  id: "dahiliye-hipoglisemi-001",
  version: "1.0.0",
  title: "60 Yaş Erkek — Titreme, Terleme, Bilinç Değişikliği (Hipoglisemi)",
  description:
    "Sulfonilüre kullanan Tip 2 DM hastası. Sabah kahvaltı etmeden ilacını almış. Acil servise titreme, terleme ve konfüzyon ile başvurdu.",
  specialty: "dahiliye",
  tags: ["hipoglisemi", "diyabet", "sulfonilüre", "acil", "metabolik", "endokrin"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3],
  estimated_minutes: 10,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ADA/EASD 2024, TEMD 2022 uyumlu",
  last_updated: "2026-04-24",

  patient: {
    age: 60,
    sex: "M",
    weight_kg: 82,
    height_cm: 172,
    chief_complaint:
      "Sabahtan beri titreme ve aşırı terleme. Eşi 'konuşmaları anlaşılmıyor, gözleri boş bakıyor' diye getirmiş.",
    history_items: [
      "Tip 2 DM (12 yıl) — glibenklamid 5 mg 2×1 + metformin 1000 mg 2×1",
      "Hipertansiyon — amlodipin 5 mg 1×1",
      "Sabah ilaçlarını kahvaltı yapmadan almış",
      "Son 2 haftadır iştahsızlık şikayeti var",
    ],
    allergies: [],
    current_medications: ["Glibenklamid 5 mg", "Metformin 1000 mg", "Amlodipin 5 mg"],
    modifiers: {},
  },

  initial_vitals: {
    hr: 112,
    bp_systolic: 138,
    bp_diastolic: 86,
    spo2: 97,
    temp: 36.6,
    rr: 18,
    gcs: 13,
    glucose: 38,
    pain: 2,
  },

  available_medications: [
    "dekstroz_50",
    "salin_09",
    "tiamin",
    "insulin_regular",
    "magnezyum_sulfat",
  ],
  available_equipment: [
    "glukometre",
    "iv_kateter_18g",
    "monitor",
    "pulse_oksimetre",
    "ekg_12",
  ],

  ekg_pattern: "normal",

  steps: [
    {
      id: "step-1-degerlendir",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta getiriliyor. Konfüze, terli, hafif tremoru var. İlk ne yaparsınız?",
      narrative:
        "60 yaşında erkek hasta acile ambulansla getirildi. Eşi 'sabahtan beri titriyor, garip konuşuyor' diyor. Hasta soruları gecikmeyle ve yanlış yanıtlıyor.",
      min_difficulty: 1,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 30,
          critical: true,
          feedback:
            "Doğru! Konfüzyon + titreme + terleme triadında ilk adım kan glukozu ölçümüdür. Glukometre: 38 mg/dL — ciddi semptomatik hipoglisemi.",
          unlocks: ["step-2-mudahale"],
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          critical: false,
          feedback:
            "Hasta monitörüne bağlandı: HR 112, SpO₂ %97. Monitorizasyon doğru ama glukoz ölçümü önce gelir.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          critical: false,
          feedback:
            "IV kateter yerleştirildi — tedavi için gerekli. Ancak tanıyı doğrulamak (glukometre) önce gelir.",
        },
        {
          action: { type: "give_medication", target_id: "insulin_regular" },
          points: -25,
          critical: true,
          feedback:
            "KRİTİK HATA! Konfüze, terli hastaya tanı koymadan insülin vermek yaşamı tehdit eder. Kan glukozu ölçülmeden asla insülin verilmez.",
        },
      ],
    },
    {
      id: "step-2-mudahale",
      kind: "action",
      title: "Akut Tedavi",
      prompt:
        "Kan glukozu 38 mg/dL. IV kateter yerleştirildi. Hasta oral alamıyor. Tedaviye nasıl başlarsınız?",
      narrative:
        "Glukometre 38 mg/dL gösteriyor. Hasta konfüze ve oral alım güvenli değil. IV damar yolu açık.",
      min_difficulty: 1,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "tiamin" },
          points: 15,
          critical: false,
          feedback:
            "Doğru! Glukoz vermeden önce tiamin (B1): 2 haftadır iştahsız bu hastada Wernicke ensefalopatisi riskini azaltır. İyi klinik pratik.",
        },
        {
          action: { type: "give_medication", target_id: "dekstroz_50" },
          points: 30,
          critical: true,
          feedback:
            "Doğru! 25 g (%50 dekstroz, 50 mL) IV push — semptomatik hipoglisemide birincil IV tedavi. Tiamin önce verilmediyse ileride Wernicke riski akılda tutulmalı.",
          unlocks: ["step-3-takip"],
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 0,
          critical: false,
          feedback:
            "Salin %0.9 hipoglisemiyi tedavi etmez. Damar yolunu açık tutmak için kullanılabilir ama önce glukoz ver.",
        },
        {
          action: { type: "give_medication", target_id: "magnezyum_sulfat" },
          points: -10,
          critical: false,
          feedback:
            "Yanlış öncelik. Magnezyum bu hastada endike değil. Acilen hipoglisemiyi düzelt.",
        },
        {
          action: { type: "give_medication", target_id: "insulin_regular" },
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA! Hipoglisemide insülin verilmez! Bu hastayı öldürebilir.",
        },
      ],
    },
    {
      id: "step-3-takip",
      kind: "decision",
      title: "Tedavi Sonrası Karar",
      prompt:
        "Dekstrozdan 15 dk sonra glukoz 95 mg/dL. Hasta uyanık, yönelimi düzelmekte, 'çok yorgunum' diyor. Ne yaparsınız?",
      narrative:
        "Glukoz 95 mg/dL, GKS 15, hasta konuşuyor. Eşi 'eski haline döndü gibi' diyor. Sabah aldığı glibenklamid hâlâ aktif.",
      min_difficulty: 1,
      options: [
        {
          id: "opt-a",
          text: "Glukozu 2-4 saatte bir kontrol et, kompleks karbonhidrat yedir, sulfonilüreyü geçici kes ve 24 saat gözlemle.",
          correct: true,
          points: 30,
          feedback:
            "Doğru! Glibenklamid yarı ömrü 12+ saat, etki süresi 24 saate uzayabilir. Sadece glukoz normalleşmesi taburculuk için yeterli değil; 24 saat gözlem şart.",
        },
        {
          id: "opt-b",
          text: "Glukoz normale döndü, taburcu et ve günlük dozunu yarıya indirmesini söyle.",
          correct: false,
          points: -20,
          feedback:
            "YANLIŞ! Glibenklamid uzun etkili; erken taburculuk tekrar hipoglisemi ile ölümle sonuçlanabilir. 24 saat gözlem şarttır.",
        },
        {
          id: "opt-c",
          text: "%10 Dekstroz infüzyonu başla (100 mL/saat), sulfonilüreyü kes, endokrin konsültasyon iste.",
          correct: true,
          points: 20,
          feedback:
            "Kabul edilebilir — glukoz tekrar düşerse %10 dekstroz infüzyonu uygundur. Tüm vakalarda rutin infüzyon gerekmez; beslenebildiğinde oral yol tercih edilir.",
          min_difficulty: 2,
        },
        {
          id: "opt-d",
          text: "Sulfonilüreyü kes, glukoz 120 mg/dL üzerinde kalıncaya kadar insülin infüzyonu başla.",
          correct: false,
          points: -30,
          feedback:
            "KRİTİK HATA! Hipoglisemi tedavisinde insülin verilmez. Bu seçenek durumu daha da kötüleştirir ve yaşamı tehdit eder.",
        },
      ],
    },
  ],

  start_step_id: "step-1-degerlendir",

  scoring: {
    max_points: 100,
    passing_score: 60,
    grade_bands: { A: 90, B: 75, C: 60, D: 45 },
  },

  debrief: {
    key_learnings: [
      "Konfüzyon + terleme + taşikardi triadı → ilk eylem kan glukozu ölçümüdür; tanı koymadan ilaç verilmez.",
      "Glukoz vermeden önce tiamin: beslenme sorunu riski taşıyan hastalarda Wernicke ensefalopatisini önler.",
      "Sulfonilüreler uzun etkilidir (glibenklamid 24 saat) — kısa süreli glukoz normalleşmesi güvenli taburculuk anlamına gelmez; 24 saat gözlem ve beslenme desteği şarttır.",
    ],
    references: [
      "ADA Standards of Care in Diabetes 2024 — Section 6: Glycemic Targets",
      "TEMD Diyabet Tanı ve Tedavi Rehberi 2022",
      "Cryer PE. Hypoglycemia in Diabetes. Diabetes Care 2003;26:1902-1912",
    ],
    red_flags: [
      "GKS <13 veya nöbet → 50 mL D50 derhal IV push, yoğun bakım konsültasyonu",
      "Tekrarlayan hipoglisemi → ilaç etkileşimi veya sulfonilüre doz aşımı araştır",
      "Yaşlı, böbrek yetersizlikli hasta + sulfonilüre → hipoglisemi riski çok yüksek, doz revizyonu gerekir",
    ],
    next_scenarios: [],
  },
};
