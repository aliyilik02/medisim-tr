// ============================================================
// MediSim TR — Akut Apandisit Senaryosu (Cerrahi)
// ============================================================
// Klinik referans: WSES Jerusalem Guidelines 2020 (Acute Appendicitis),
// Türk Cerrahi Derneği Akut Karın Kılavuzu.
// Ana öğretim hedefi: Alvarado skoru, görüntüleme kararı,
// antibiyotik seçimi, laparoskopik appendektomi endikasyonu.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_apandisit: Scenario = {
  id: "cerrahi-apandisit-001",
  version: "0.1.0",
  title: "28 Yaş Erkek — Sağ Alt Kadran Ağrısı",
  description:
    "12 saat önce göbek çevresinden başlayıp sağ alt kadrana yerleşen ağrı, bulantı-kusma. Akut apandisit tanı-tedavi algoritması ve cerrahi karar.",
  specialty: "cerrahi",
  tags: ["apandisit", "akut karın", "cerrahi", "laparoskopi", "alvarado"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3, 4],
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "WSES Jerusalem Guidelines 2020 uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 28,
    sex: "M",
    weight_kg: 75,
    height_cm: 178,
    chief_complaint:
      "12 saat önce göbek çevresinde başlayan, sağ alt kadrana yerleşen ağrı. Bulantı ve 1 kez kusma var. İştahsızlık.",
    history_items: [
      "Daha önce benzer şikâyet yok",
      "Kronik hastalık yok",
      "Sigara yok",
      "Son yemek 10 saat önce",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 98,
    bp_systolic: 122,
    bp_diastolic: 76,
    spo2: 99,
    temp: 38.1,
    rr: 18,
    pain: 7,
    gcs: 15,
  },

  available_medications: [
    "metronidazol",
    "seftriakson",
    "ampisilin_sulbaktam",
    "parasetamol",
    "morfin",
    "fentanil",
    "ondansetron",
    "omeprazol",
  ],

  available_equipment: [
    "iv_kateter_18g",
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "stetoskop",
    "ultrasonografi",
    "bilgisayarli_tomografi",
  ],

  ekg_pattern: "normal_sinüs",

  start_step_id: "s1_fizik_muayene",

  steps: [
    // ====================================================
    // ADIM 1 — Fizik muayene ve Alvarado skoru
    // ====================================================
    {
      id: "s1_fizik_muayene",
      kind: "action",
      title: "Fizik Muayene ve Değerlendirme",
      prompt:
        "Hasta acil serviste. Akut apandisit şüphesiyle ilk muayene ve değerlendirmeyi başlatın.",
      narrative:
        "Hasta masaya yatmak istiyor, sağ tarafı bükülü pozisyonda. Sağ alt kadranda baskı hissediyor.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "makburney_noktasi" },
          points: 15,
          feedback:
            "Doğru — McBurney noktasında hassasiyet (+1 Alvarado). Lokalize hassasiyet apandisit için klasik.",
        },
        {
          action: { type: "examine", target_id: "rebound_hassasiyeti" },
          points: 15,
          feedback:
            "Doğru — Rebound pozitif (+1 Alvarado). Peritoneal irritasyon var.",
        },
        {
          action: { type: "use_equipment", target_id: "tansiyon_aleti" },
          points: 5,
          feedback: "Doğru — Baseline vital değerlendirmesi gerekli.",
        },
        {
          action: { type: "order_test", target_id: "tam_kan_sayimi" },
          points: 20,
          feedback:
            "Doğru — Lökositoz (+2 Alvarado). Lökosit >10.000/mm³ apandisit tanısını güçlendirir.",
          unlocks: ["s2_goruntuleme_karari"],
        },
        {
          action: { type: "order_test", target_id: "crp" },
          points: 10,
          feedback:
            "Doğru — CRP yükselmesi inflamasyonu gösterir. WSES kılavuzu: CRP + lökositoz güçlü tanısal destek.",
          min_difficulty: 2,
        },
        {
          action: { type: "order_test", target_id: "idrar_tam_tahlili" },
          points: 5,
          feedback:
            "Doğru — Üriner patoloji ekartasyonu için. Apandisit komşuluğunda hafif piyüri görülebilir.",
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: 8,
          feedback:
            "Kabul — WSES/Cochrane: analjezik kullanımı muayeneyi maskelemez. Erken analjezi öneriliyor.",
        },
        {
          action: { type: "give_medication", target_id: "ondansetron" },
          points: 5,
          feedback: "Kabul — Bulantı-kusma için antiemetik uygun.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Apandisit değerlendirmesinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 2 — Görüntüleme kararı
    // ====================================================
    {
      id: "s2_goruntuleme_karari",
      kind: "decision",
      title: "Görüntüleme Kararı",
      prompt:
        "Lökosit 14.500, CRP 45 mg/L, Alvarado skoru 7 hesaplandı. Görüntüleme için ne yaparsınız?",
      narrative:
        "Alvarado skoru ≥7 cerrahi konsültasyon için yeterli. Ancak görüntüleme tanıyı kesinleştirir ve komplikasyonu dışlar.",
      options: [
        {
          id: "opt_usg",
          text: "Abdominal ultrasonografi — ilk seçenek (radyasyon yok, hızlı)",
          correct: true,
          points: 20,
          feedback:
            "Doğru — USG: radyasyon yok, hızlı, apandisit pozitif bulgu sensitivitesi %75-90. Genç erkekte ilk tercih.",
        },
        {
          id: "opt_bt",
          text: "BT çek (duyarlılık %94-98)",
          correct: true,
          points: 15,
          feedback:
            "Kabul — BT altın standart ama radyasyon var. Obez hastalarda, USG belirsiz olduğunda veya Alvarado 5-6 arası tercih edilir.",
        },
        {
          id: "opt_bt_ilk",
          text: "Doğrudan BT çek, USG'yi atla",
          correct: false,
          points: -8,
          feedback:
            "Genç erkekte gereksiz radyasyon. WSES kılavuzu: belirsiz tanılarda BT önce, tipik tabloda (Alvarado ≥7) USG önce tercih.",
        },
        {
          id: "opt_goruntuleme_yok",
          text: "Görüntüleme gerek yok, klinik yeterli — direkt cerrahiye gönder",
          correct: true,
          points: 10,
          feedback:
            "Kabul — Alvarado ≥8'de (veya çok tipik tabloda) doğrudan cerrahi mümkün. Ama bu hastada 7 — görüntüleme kesinleştirici.",
        },
      ],
    },

    // ====================================================
    // ADIM 3 — Cerrahi karar ve preoperatif hazırlık
    // ====================================================
    {
      id: "s3_cerrahi_karar",
      kind: "action",
      title: "Cerrahi Hazırlık ve Antibiyotik",
      prompt:
        "USG: apendiks 8 mm çapında, çevre yağda inflame görünüm. Apandisit tanısı kesin. Cerrahi hazırlık yapın.",
      narrative:
        "Cerrahi konsültan laparoskopik appendektomi planlıyor. Ameliyathane hazırlanıyor.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 20,
          feedback:
            "Doğru — Preoperatif profilaktik antibiyotik (sefalorin grubu + metronidazol veya ampisilin-sulbaktam). WSES: komplike olmayan apandisitte 24 saat yeterli.",
        },
        {
          action: { type: "give_medication", target_id: "metronidazol" },
          points: 15,
          feedback:
            "Doğru — Anaerob kapsama için metronidazol eklenmesi gerekli. Seftriakson + metronidazol: standart kapsam.",
        },
        {
          action: { type: "give_medication", target_id: "ampisilin_sulbaktam" },
          points: 18,
          feedback:
            "Doğru — Ampisilin-sulbaktam tek başına geniş spektrumlu kapsam sağlar (aerob + anaerob). Alternatif uygun seçim.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback:
            "Doğru — IV damar yolu açıldı. İntraoperatif sıvı ve ilaç için gerekli.",
        },
        {
          action: { type: "consult", target_id: "cerrahi" },
          points: 15,
          feedback:
            "Doğru — Cerrahi konsültasyon teyit edildi, ameliyathane hazırlanıyor.",
        },
        {
          action: { type: "order_test", target_id: "kan_grubu_cross" },
          points: 10,
          feedback:
            "Doğru — Preoperatif standart. Komplike apandisitte transfüzyon gerekebilir.",
          min_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "parasetamol" },
          points: 5,
          feedback: "Kabul — Postoperatif analjezi planlaması uygun.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Preoperatif hazırlıkta bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 4 — Komplike apandisit yönetimi (S3+)
    // ====================================================
    {
      id: "s4_komplikasyon",
      kind: "decision",
      title: "Komplikasyon Kararı",
      prompt:
        "Ameliyat sırasında apendiks perfore, lokal peritonit var. Ameliyat ekibi ne yapmalı?",
      narrative:
        "Laparoskopide apendiks perforasyonu saptandı, çevre periton kontamine.",
      min_difficulty: 3,
      options: [
        {
          id: "opt_laparoskopi_devam",
          text: "Laparoskopik devam et, abdomeni bol yıka, dren koy",
          correct: true,
          points: 25,
          feedback:
            "Doğru — Komplike apandisitte laparoskopik devam standart. Bol irrigasyon (3L+ SF) ve peritoneal dren.",
        },
        {
          id: "opt_acik",
          text: "Açık cerrahiye dön (laparotomi)",
          correct: true,
          points: 15,
          feedback:
            "Kabul — Yaygın peritonit veya teknik zorluk varsa konversiyon endike. Lokal peritonit laparoskopik devam müsaade eder.",
        },
        {
          id: "opt_antibiyotik_sonlandir",
          text: "Yalnızca preoperatif antibiyotikle yetinildi, postoperatif gerek yok",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — Perfore apandisitte en az 3-5 gün IV antibiyotik gerekli. WSES: komplike = uzatılmış tedavi.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 160,
    passing_score: 100,
    grade_bands: { A: 140, B: 120, C: 100, D: 75 },
  },

  debrief: {
    key_learnings: [
      "Alvarado skoru ≥7: cerrahi konsültasyon endikasyonu. ≥8-10: görüntüleme atlanabilir.",
      "USG önce: genç hasta, tipik tablo, radyasyon kısıtlaması. BT: belirsiz tablo, obez hasta, komplikasyon şüphesi.",
      "Preoperatif antibiyotik profilaksisi: seftriakson + metronidazol VEYA ampisilin-sulbaktam (komplikasyona göre süre)",
      "Analjezik muayeneyi maskelemez — erken ağrı tedavisi WSES/Cochrane kanıtlı.",
      "Perfore apandisit: laparoskopik devam + bol irrigasyon + dren + uzatılmış IV antibiyotik (3-5 gün).",
    ],
    references: [
      "WSES Jerusalem Guidelines for Acute Appendicitis 2020",
      "Türk Cerrahi Derneği Akut Karın Kılavuzu",
      "Cochrane: analjezi tanıyı maskeler mi? (yok — kanıt yok)",
      "AHA/SIS Surgical Infection Society Guidelines 2017",
    ],
    red_flags: [
      "Jeneralize peritonit → acil laparotomi",
      "Ateş >38.5 + katı karın → perfore / abse şüphesi",
      "Alvarado <4 → alternatif tanılar: ovaryan kist torsiyonu, üreteral taş, Meckel divertikülü",
    ],
    next_scenarios: ["cerrahi-kolesistit-001", "cerrahi-intestinal-obstruksiyon-001"],
  },
};
