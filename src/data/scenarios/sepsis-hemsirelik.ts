// ============================================================
// MediSim TR — Sepsis Tanıma ve Hemşirelik Bakımı
// ============================================================
// Klinik referans: Sepsis-3 Tanım (2016), Surviving Sepsis Campaign
// Bundle 2021, Türkiye Yoğun Bakım Derneği Sepsis Protokolü.
// Ana öğretim hedefi: hemşire perspektifinden erken sepsis tanıma,
// q-SOFA, 1 saatlik bundle, sıvı yönetimi, vital izlemi.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_sepsis_hemsirelik: Scenario = {
  id: "hemsirelik-sepsis-001",
  version: "0.1.0",
  title: "70 Yaş Kadın — Serviste Ani Kötüleşme",
  description:
    "Dahiliye servisinde yatan yaşlı hasta, hemşire vizitinde ajite ve konfüze bulunuyor. Ateş, taşikardi ve hipotansiyon. q-SOFA, sepsis bundle ve hemşirelik bakımı.",
  specialty: "hemsirelik",
  tags: ["sepsis", "q-sofa", "hemşirelik", "bundle", "erken tanı", "sıvı"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3],
  estimated_minutes: 10,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "Surviving Sepsis Campaign 2021 Bundle uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 70,
    sex: "F",
    weight_kg: 62,
    height_cm: 155,
    chief_complaint:
      "Dahiliye servisi, yatış 3. günü. Üriner enfeksiyon nedeniyle yatıyor. Hemşire vizitinde ajite ve bilinç bulanıklığı fark etti.",
    history_items: [
      "Üriner sistem enfeksiyonu — 3 gündür IV antibiyotik",
      "Tip 2 DM (insülin)",
      "KBY (Evre 3a)",
      "Koah (hafif)",
      "Yatış önceki bilinç: tam açık",
    ],
    allergies: ["Penisilin alerjisi"],
    current_medications: [
      "Seftriakson 2 g/gün IV",
      "İnsülin glargin",
      "Enalapril 5 mg",
      "Furosemid 40 mg",
    ],
    modifiers: {
      bobrek_yetm: true,
    },
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 88,
    bp_diastolic: 54,
    spo2: 93,
    temp: 38.8,
    rr: 24,
    pain: 3,
    gcs: 12,
  },

  available_medications: [
    "serum_fizyolojik_500ml",
    "ringer_laktat",
    "noradrenalin",
    "vankomisin",
    "piperasilin_tazobaktam",
    "meropenem",
    "parasetamol",
    "oksijen",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "iv_kateter_18g",
    "kateter_foley",
    "oksijen_maske",
    "kan_kültürü_kiti",
    "glukometre",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  start_step_id: "s1_erken_tani",

  steps: [
    // ====================================================
    // ADIM 1 — Erken tanıma ve alarm
    // ====================================================
    {
      id: "s1_erken_tani",
      kind: "action",
      title: "Erken Değerlendirme ve Alarm",
      prompt:
        "Hemşire olarak hastanın ani kötüleşmesini fark ettiniz. İlk 10 dakikada ne yaparsınız?",
      narrative:
        "Hasta konfüze, soluğu hızlı, terlemiş. Vitalleri normal değil. Hemşire erken müdahaleyle sepsis mortalitesini azaltabilir.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "Doğru — Sürekli monitörizasyon başladı. Vitaller: HR 118, TA 88/54, SpO₂ %93, SS 24. q-SOFA ≥2 (bilinç bozukluğu, SS≥22, SBP≤100) → SEPSIS ŞÜPHESİ.",
        },
        {
          action: { type: "examine", target_id: "bilinc_degerlendirmesi" },
          points: 15,
          feedback:
            "Doğru — q-SOFA bileşeni 1: bilinç değişimi (GKS <15 veya yeni konfüzyon). +1 puan.",
        },
        {
          action: { type: "consult", target_id: "doktor" },
          points: 20,
          feedback:
            "Doğru — Hemşirenin görevi: hekimi hemen çağır ve sepsis şüphesini bildir. ISBAR iletişimi: Kimlik-Durum-Geçmiş-Değerlendirme-Öneri.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback:
            "Doğru — SpO₂ %93 → O₂ destek başla. Hedef ≥94%.",
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 8,
          feedback:
            "Doğru — Kan şekeri: diyabetik hastada hipoglisemi konfüzyonu taklit edebilir. Ayrıca hiperglisemi sepsis belirtisi.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Erken sepsis tanımada bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 2 — 1 Saatlik Sepsis Bundle
    // ====================================================
    {
      id: "s2_bundle",
      kind: "action",
      title: "1 Saatlik Sepsis Bundle",
      prompt:
        "Hekim 'Sepsis şüphesi var' dedi. 1 saatlik Surviving Sepsis Campaign bundle'ı uygulayın.",
      narrative:
        "Her dakika kritik. SSC 2021: Laktik asit, kan kültürü, antibiyotik, sıvı — hepsi 1 saat içinde.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "laktik_asit" },
          points: 20,
          feedback:
            "Doğru — Laktat ölçümü: ≥4 mmol/L → septik şok. SSC 2021 Bundle: Laktik asit ilk 1 saat. Tekrar 2 saat sonra ölçülmeli (klirens izlemi).",
        },
        {
          action: { type: "use_equipment", target_id: "kan_kültürü_kiti" },
          points: 20,
          feedback:
            "Doğru — Kan kültürü antibiyotik ÖNCE alınmalı. En az 2 set (farklı damardan). Antibiyotiği bekletme ama kültürü unutturtma.",
        },
        {
          action: { type: "give_medication", target_id: "piperasilin_tazobaktam" },
          points: 20,
          feedback:
            "Doğru — Geniş spektrumlu antibiyotik: piperasilin-tazobaktam uygun (penisilin alerjisi dikkat: alerji tarihçesi). Meropenem de alternatif.",
        },
        {
          action: { type: "give_medication", target_id: "meropenem" },
          points: 18,
          feedback:
            "Doğru — Karbapenem: KBY'li hastada doz ayarı gerekebilir. Geniş spektrum için uygun.",
        },
        {
          action: { type: "give_medication", target_id: "serum_fizyolojik_500ml" },
          points: 15,
          feedback:
            "Doğru — IV sıvı yüklemesi: 30 mL/kg kristaloid (SF veya RL) 3 saat içinde. Bu hastada 62 kg → ~1860 mL. KBY varsa sıvı yanıtını izle.",
        },
        {
          action: { type: "use_equipment", target_id: "kateter_foley" },
          points: 10,
          feedback:
            "Doğru — Saatlik idrar çıkışı takibi: oligüri <0.5 mL/kg/saat organ disfonksiyonu göstergesi.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Sepsis bundle'ında bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 3 — Vazopressör kararı
    // ====================================================
    {
      id: "s3_vazopressor",
      kind: "decision",
      title: "Vazopressör Kararı",
      prompt:
        "30 mL/kg sıvıya rağmen TA 84/50 → OAB <65 mmHg. Septik şok. Ne yaparsınız?",
      options: [
        {
          id: "opt_noradrenalin",
          text: "Noradrenalin 0.01-0.03 mcg/kg/dk ile başla — birinci tercih vazopressör",
          correct: true,
          points: 25,
          feedback:
            "Doğru — SSC 2021: septik şokta birinci tercih noradrenalindir. OAB hedef ≥65 mmHg. Santral kat veya büyük periferik yoldan verilmeli.",
        },
        {
          id: "opt_sivi_devam",
          text: "Sıvı yüklemeye devam et",
          correct: false,
          points: -10,
          feedback:
            "Yetersiz — 30 mL/kg sıvıya rağmen hipotansiyon → vazopressör başlama zamanı. Daha fazla sıvı pulmoner ödeme yol açabilir.",
        },
        {
          id: "opt_dobutamin",
          text: "Dobutamin ekle",
          correct: false,
          points: -5,
          feedback:
            "Yanlış öncelik — Dobutamin yalnızca kardiyak output düşükse (septik + kardiyojenik kombinasyon) eklenir. İlk adım noradrenalin.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 170,
    passing_score: 105,
    grade_bands: { A: 150, B: 128, C: 105, D: 80 },
  },

  debrief: {
    key_learnings: [
      "q-SOFA ≥2 (bilinç+, SS≥22, SBP≤100) → sepsis şüphesi → hekimi çağır, bundle başlat.",
      "SSC 2021 Bundle (1 saat): Laktat, kan kültürü, antibiyotik, 30 mL/kg kristaloid, vazopressör (OAB <65'te).",
      "Hemşirenin rolü: erken tanıma, hızlı iletişim, bundle uygulaması, yanıt izlemi.",
      "Antibiyotik kültür ÖNCE ama antibiyotiği bekletme! 1 saat içinde başlanması mortaliteyi anlamlı düşürür.",
      "OAB hedefi ≥65 mmHg. Sıvıya yanıtsızsa noradrenalin — dobutamin yalnızca kardiyak output düşükse.",
    ],
    references: [
      "Surviving Sepsis Campaign International Guidelines 2021",
      "Sepsis-3 Definitions (Singer et al., JAMA 2016)",
      "Türkiye Yoğun Bakım Derneği Sepsis Protokolü",
      "SSC 1-Hour Bundle Evidence-Based Update 2021",
    ],
    red_flags: [
      "Laktik asit ≥4 mmol/L → Septik şok — yoğun bakım transferi",
      "OAB <65 sıvıya rağmen → noradrenalin gecikmez",
      "Penisilin alerjisi + beta-laktam kullanımı → anaflaksi riski",
      "KBY hastada sıvı yüklemesi: akciğer sesleri kontrol et (pulmoner ödem)",
    ],
    next_scenarios: ["hemsirelik-düsme-riski-001", "hemsirelik-ilac-hatasi-001"],
  },
};
