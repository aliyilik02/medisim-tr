import type { Scenario } from "@/engine";

export const scenario_anaflaksi: Scenario = {
  id: "acil-anaflaksi-001",
  version: "0.1.0",
  title: "28 Yaş Kadın — Arı Sokması Sonrası Solunum Sıkıntısı",
  description:
    "Piknikte arı sokmasının ardından 10 dakika içinde gelişen yüz şişliği, hırıltı ve hipotansiyon. Anafilaksi tanı ve yönetimi.",
  specialty: "acil",
  tags: ["anafilaksi", "acil", "adrenalin", "alerji", "şok"],
  difficulty: 2,
  estimated_minutes: 10,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-22",

  patient: {
    age: 28,
    sex: "F",
    weight_kg: 62,
    height_cm: 165,
    chief_complaint:
      "10 dakika önce arı sokmasının ardından yüzünde şişlik, nefes darlığı, baş dönmesi başladı.",
    history_items: [
      "Bilinen arı alerjisi öyküsü yok",
      "Daha önce böyle bir atak yaşamamış",
      "Kronik hastalık yok",
    ],
    allergies: [],
    current_medications: [],
  },

  initial_vitals: {
    hr: 128,
    bp_systolic: 82,
    bp_diastolic: 48,
    spo2: 89,
    temp: 36.5,
    rr: 28,
    pain: 4,
    gcs: 14,
  },

  available_medications: [
    "adrenalin",
    "feniramin",
    "prednisolon",
    "salin_09",
    "ringer_laktat",
    "morfin",
    "fentanil",
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
  ],

  start_step_id: "s1_tani",

  steps: [
    {
      id: "s1_tani",
      kind: "decision",
      title: "Klinik Tanı",
      prompt:
        "Vitaller ve tablo önünüzde. Çalışma tanınız nedir?",
      narrative:
        "Yüzde belirgin ödem, dudak şişliği. Oskültasyonda yaygın wheezing. Taşikardik, hipotansif.",
      options: [
        {
          id: "opt_anaflaksi",
          text: "Anafilaksi (cilt + solunum + dolaşım tutulumu)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — 2 sistem tutulumu + tetikleyici maruziyet anafilaksi kriterlerini karşılıyor.",
        },
        {
          id: "opt_astim",
          text: "Akut astım atağı",
          correct: false,
          points: -15,
          feedback:
            "Wheezing var ama yüz ödemi ve hipotansiyon astım ile açıklanmaz. Anafilaksi.",
        },
        {
          id: "opt_sok",
          text: "Septik şok",
          correct: false,
          points: -20,
          feedback:
            "Ateş yok, enfeksiyon öyküsü yok, tetikleyici açık (arı sokması). Sepsis değil.",
        },
        {
          id: "opt_anjiyoodem",
          text: "İzole anjiyoödem",
          correct: false,
          points: -10,
          feedback:
            "Yüz ödemi var ama izole değil — hipotansiyon ve wheezing eşlik ediyor. Anafilaksi.",
        },
      ],
    },

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
            "MÜKEMMEL — 0.3-0.5 mg IM (anterolateral uyluk) anafilakside ilk ve en önemli tedavi. Hayati.",
          vitals_change: { bp_systolic: 95, hr: 118 },
        },
        {
          action: { type: "give_medication", target_id: "adrenalin" },
          points: 25,
          feedback:
            "Adrenalin doğru ama IM yol (anterolateral uyluk) tercih edilmeli. Genel 'adrenalin' yerine IM belirtin.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 15,
          feedback: "Doğru — SpO₂ %89, yüksek akım O₂ endike.",
          vitals_change: { spo2: 94 },
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "Doğru — sıvı resüsitasyonu için geniş damar yolu şart.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — sürekli monitörizasyon.",
        },
        {
          action: { type: "give_medication", target_id: "feniramin" },
          points: -10,
          feedback:
            "HATA — antihistaminikler anafilakside ADRENALIN YERİNE GEÇMEZ. Adrenalin öncelikli. Antihistaminik sadece cilt semptomları için ikinci sırada.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "prednisolon" },
          points: -5,
          feedback:
            "Steroid etkisi 4-6 saat sonra başlar. Akut tedavide öncelik değil, adrenalin sonrası verilir.",
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback:
        "Bu anafilaksinin ilk 60 saniyesinde öncelik değil.",
    },

    {
      id: "s3_destek_tedavi",
      kind: "action",
      title: "Destek Tedavi",
      prompt:
        "Adrenalin sonrası hasta kısmen düzeldi. Şimdi destek tedavisi.",
      narrative:
        "TA 95/60, HR 118, SpO₂ 94%. Hâlâ wheezing var ama hafifledi.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 20,
          feedback:
            "Doğru — 20 mL/kg hızlı bolus (~1000-1500 mL). Distribütif şokta sıvı şart.",
          vitals_change: { bp_systolic: 108 },
        },
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 20,
          feedback: "Doğru — izotonik sıvı resüsitasyonu.",
          vitals_change: { bp_systolic: 108 },
        },
        {
          action: { type: "give_medication", target_id: "feniramin" },
          points: 10,
          feedback:
            "Şimdi uygun — adrenalin sonrası ek tedavi. Kaşıntı/ürtikeri azaltır.",
        },
        {
          action: { type: "give_medication", target_id: "prednisolon" },
          points: 10,
          feedback:
            "Şimdi uygun — bifazik reaksiyonu önlemek için. Etkisi gecikmelidir.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Bu aşamada öncelik değil.",
    },

    {
      id: "s4_izlem",
      kind: "info",
      title: "İzlem & Eğitim",
      prompt: "Okuyun ve devam edin.",
      content:
        "Hasta stabilleşti. En az 4-6 saat izlem önerilir (bifazik reaksiyon riski %5-20). Taburculuk öncesi: (1) Alerji tetikleyici eğitimi, (2) Adrenalin oto-enjektör reçetesi, (3) Alerji polikliniğine yönlendirme.",
    },
  ],

  scoring: {
    max_points: 150,
    passing_score: 90,
    grade_bands: {
      A: 130,
      B: 110,
      C: 90,
      D: 70,
    },
  },

  debrief: {
    key_learnings: [
      "Anafilakside ilk ve en önemli ilaç IM ADRENALİN'dir (0.3-0.5 mg anterolateral uyluk).",
      "Antihistaminik ve steroid adrenalinin YERİNE GEÇMEZ — yalnızca ek tedavidir.",
      "Tanı kriteri: tetikleyici + ≥2 sistem tutulumu (cilt, solunum, dolaşım, GİS).",
      "Hipotansiyon varlığında hızlı sıvı resüsitasyonu şart (20 mL/kg).",
      "Bifazik reaksiyon %5-20 oranında görülür; en az 4-6 saat izlem önerilir.",
      "Taburculukta oto-enjektör reçetesi ve alerji polikliniği kritik.",
    ],
    references: [
      "EAACI Anaphylaxis Guidelines 2021",
      "Türk Toraks Derneği Anafilaksi Kılavuzu",
      "WAO Anaphylaxis Guidance 2020",
    ],
    red_flags: [
      "Adrenalin gecikmesi — mortalite en sık nedeni",
      "IV adrenalin — sadece arrest durumunda (aritmi riski)",
      "Antihistaminik/steroid ile 'tedavi ettim' yanılgısı",
    ],
  },
};
