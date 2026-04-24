import type { Scenario } from "@/engine";

// ============================================================
// Pediatrik Sepsis Senaryosu — 4y Çocuk, Febril Sepsis → Septik Şok
// ============================================================
// Zorluk seviyeleri 2-4 destekli.
// S2:   Temel pediatrik sepsis tanıma, sıvı bolus (20 mL/kg), antibiyotik
// S3:   + Dirençli şok → adrenalin (DOPAMIN DEĞİL), kültür önce AB
// S4:   + Vazopressin ikinci ajan, hidrokortizon (dirençli vazopressör şokunda),
//         sıvı yüklenme riski (pulmoner ödem), IO yolu
//
// Kaynaklar:
// - Surviving Sepsis Campaign (SSC) Pediatrik Kılavuzu 2020
// - AAP Sepsis Clinical Report
// - TATD Çocuklarda Sepsis ve Septik Şok Protokolü 2018
// ============================================================

export const scenario_pediatrik_sepsis: Scenario = {
  id: "pediatri-sepsis-001",
  version: "0.1.0",
  title: "4 Yaş Erkek — Ateş, Bilinç Bulanıklığı (Septik Şok)",
  description:
    "2 gündür ateş, bugün letarjik. Taşikardi, kapiller dolum >3 sn, soğuk ekstremiteler. Septik şok yönetimi.",
  specialty: "pediatri",
  tags: ["sepsis", "sok", "pediatri", "acil", "antibiyotik"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 15,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "SSC Pediatrik 2020, TATD 2018 uyumlu",
  last_updated: "2026-04-23",

  // Demo için ilaç zamanlaması — gerçek klinikte sıvı yanıtı dakikalar,
  // adrenalin etkisi 1-2 dk alır. Monitörde canlı görmek için hızlandırılmış.
  medication_timing_overrides: {
    salin_09:      { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
    ringer_laktat: { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
    adrenalin:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25  },
    noradrenalin:  { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25  },
    hidrokortizon: { onset_sec: 2, peak_min: 0.133, duration_min: 0.5   },
    dopamin:       { onset_sec: 2, peak_min: 0.133, duration_min: 0.5   },
  },

  patient: {
    age: 4,
    sex: "M",
    weight_kg: 18,
    height_cm: 104,
    chief_complaint:
      "2 gündür ateş, bugün uykuya meyilli, az idrar. Beslenmiyor. Annesi ekstremitelerinin soğuk olduğunu söylüyor.",
    history_items: [
      "Geçen hafta otitis media, amoksisilin almış (3 gün önce bitirdi)",
      "Aşı takvimi tam",
      "Kronik hastalık yok",
      "Son 6 saattir idrar çıkarmamış",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {
      // pediatrik: runtime'da age alanından türetilir
    },
  },

  initial_vitals: {
    hr: 172,             // Pediatrik taşikardi (4y normal: 80-130)
    bp_systolic: 82,     // Hipotansif (4y normal SBP: >90)
    bp_diastolic: 45,
    spo2: 93,
    temp: 39.6,
    rr: 42,              // Takipneik (4y normal: 20-30)
    pain: 3,
    glucose: 88,
    gcs: 12,             // Letarji (V=4, M=5, E=3)
  },

  available_medications: [
    "salin_09",
    "ringer_laktat",
    "seftriakson",
    "piperasilin_tazobaktam",
    "vankomisin",
    "meropenem",
    "adrenalin",         // Pediatrik septik şokta İLK tercih vazopressör
    "noradrenalin",
    "dopamin",           // Artık 1. tercih DEĞİL
    "hidrokortizon",     // Dirençli şok
    "parasetamol",       // Ateş
    "dekstroz_50",       // Hipoglisemi riskine karşı
    "midazolam",         // Sedasyon (entübasyon gerekirse)
    "ketamin",           // Pediatrik entübasyonda hemodinamik nötr
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "glukometre",
    "kan_gazi_cihazi",
    "pediatrik_oksijen_maske",
    "bvm_pediatrik",
    "iv_kateter_20g",
    "pediatrik_io_seti",
    "infuzyon_pompasi",
    "perfuzor",
    "ekg_12",
    "pediatrik_def_padleri",
    "foley_sonda",
    "ventilator_mekanik",
    "stetoskop",
  ],

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ========================================================
    // ADIM 1 — İlk değerlendirme
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme (0-5 dk)",
      prompt:
        "4 yaşında, 18 kg. HR 172, SBP 82, SpO₂ 93%, GKS 12, kapiller dolum 4 sn. İlk 5 dakikada ne yaparsın?",
      narrative:
        "Çocuk letarjik, cildi benekli, ekstremiteler soğuk. Perfüzyon kötü.",
      min_actions: 3,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — sürekli monitör + EKG ritim izlemi.",
        },
        {
          action: { type: "use_equipment", target_id: "pediatrik_oksijen_maske" },
          points: 12,
          feedback:
            "Doğru — SpO₂ 93% + şok → yüksek akım O₂. Solunum işini destekler.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_20g" },
          points: 15,
          feedback:
            "Doğru — damar yolu hızlıca açıldı. 20G pediatrik için uygun.",
          unlocks: ["s2_sok_tani"],
        },
        // S3+ için IO yolu (damar yolu bulunamadığında)
        {
          action: { type: "use_equipment", target_id: "pediatrik_io_seti" },
          points: 15,
          feedback:
            "Doğru — pediatrik şokta damar yolu 90 sn'de açılamıyorsa IO endike (SSC 2020). Proksimal tibia.",
          unlocks: ["s2_sok_tani"],
          min_difficulty: 3,
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 10,
          feedback:
            "Doğru — pediatrik sepsiste hipoglisemi sık (glikojen rezervi az). Sonuç: 88 mg/dL, normal.",
        },
        {
          action: { type: "use_equipment", target_id: "kan_gazi_cihazi" },
          points: 12,
          feedback:
            "Doğru — laktat + pH + baz açığı. Sonuç: laktat 4.2 mmol/L, pH 7.28.",
          min_difficulty: 3,
        },
        // Antipiretik — önemli ama öncelik değil
        {
          action: { type: "give_medication", target_id: "parasetamol" },
          points: 3,
          feedback:
            "Faydalı ama öncelik değil. Sıvı + antibiyotik daha öncelikli. Ateş için verilebilir.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "İlk 5 dakika: monitör + damar yolu + O₂ + glukoz. Antibiyotik ve sıvı sonraki adım.",
    },

    // ========================================================
    // ADIM 2 — Şok tanıma
    // ========================================================
    {
      id: "s2_sok_tani",
      kind: "decision",
      title: "Tanı",
      prompt:
        "HR 172, SBP 82, kapiller dolum 4 sn, laktat 4.2 mmol/L, GKS 12, son 6 saat idrar yok. Tablo?",
      options: [
        {
          id: "a",
          text: "Dekompanse septik şok (hipotansiyon ile)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — 4y için SBP <90 hipotansiyon. Hipotansiyon + end-organ hasarı (oligüri, GKS↓, laktat↑) = dekompanse septik şok.",
        },
        {
          id: "b",
          text: "Kompanse septik şok",
          correct: false,
          points: 10,
          feedback:
            "Yakın — kompansede SBP normal olur. Bu hastada SBP 82 = dekompanse.",
        },
        {
          id: "c",
          text: "Menenjit (acile yönlendir)",
          correct: false,
          points: 0,
          feedback:
            "Menenjit ayrıcı olabilir ama öncelik şokun yönetimi. LP hemodinami stabilleşmeden YAPILMAZ.",
        },
        {
          id: "d",
          text: "Gastroenterit + dehidratasyon",
          correct: false,
          points: -8,
          feedback:
            "Hayır — ateş 39.6 + letarji + laktat 4.2 enfeksiyöz şoka uyuyor. GE'de laktat bu kadar yüksek olmaz.",
        },
      ],
    },

    // ========================================================
    // ADIM 3 — Sıvı resüsitasyonu + antibiyotik
    // ========================================================
    {
      id: "s3_sivi_ab",
      kind: "action",
      title: "Resüsitasyon (5-15 dk)",
      prompt:
        "Septik şok. İlk saat içinde ne yapmalısın? (SSC 1-saat bundle)",
      min_actions: 2,
      max_actions: 5,
      expected_outcomes: [
        // Sıvı bolus 20 mL/kg = 360 mL
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 25,
          feedback:
            "Doğru — 20 mL/kg izotonik bolus (~360 mL) 5-10 dk içinde. SSC 2020: ilk saatte 40-60 mL/kg'e kadar.",
          unlocks: ["s4_vazopresor"],
        },
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 25,
          feedback:
            "Doğru — dengeli kristalloid tercih edilir (hiperkloremik asidoz riski düşük). 20 mL/kg bolus.",
          unlocks: ["s4_vazopresor"],
          min_difficulty: 3,
        },
        // Antibiyotik — 1 saat içinde KRİTİK
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 20,
          feedback:
            "Doğru — geniş spektrum antibiyotik ilk saat içinde. Seftriakson pediatrik sepsiste standart ilk seçim.",
        },
        {
          action: { type: "give_medication", target_id: "vankomisin" },
          points: 15,
          feedback:
            "Doğru — MRSA riski veya ciddi tabloda vankomisin + seftriakson kombinasyonu. Tek başına yetersiz olabilir.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "meropenem" },
          points: 12,
          feedback:
            "Kabul — dirençli organizma şüphesi varsa karbapenem. İlk seçim değil ama kabul edilebilir.",
          min_difficulty: 3,
        },
        // Kültür — AB öncesi
        {
          action: { type: "order_test", target_id: "kan_kulturu" },
          points: 10,
          feedback:
            "Doğru — kan kültürü antibiyotik öncesi alınır. AMA antibiyotiği geciktirme (>45 dk olmamalı).",
          min_difficulty: 3,
        },
        // Foley — idrar takibi
        {
          action: { type: "use_equipment", target_id: "foley_sonda" },
          points: 8,
          feedback:
            "Doğru — idrar çıkışı (>1 mL/kg/saat hedef) sıvı yanıtının en güvenilir göstergesi.",
        },
        // HATA: çok büyük sıvı tek seferde
        {
          action: { type: "give_medication", target_id: "dopamin" },
          points: -10,
          feedback:
            "HATA — pediatrik septik şokta dopamin artık 1. tercih DEĞİL (SSC 2020). Adrenalin tercih edilir. Ama hâlâ sıvı yeterli verilmedi.",
          critical: true,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "1. saat bundle: sıvı 20 mL/kg + antibiyotik + kültür + laktat takibi.",
    },

    // ========================================================
    // ADIM 4 — Vazopressör kararı (sıvıya dirençli şok)
    // ========================================================
    {
      id: "s4_vazopresor",
      kind: "decision",
      title: "Sıvıya Dirençli Şok",
      prompt:
        "40 mL/kg sıvı verildi (720 mL, 3 bolus). HR hâlâ 158, SBP 84, kapiller dolum 3 sn, akciğerde krepitan raller. Sonraki ajan?",
      options: [
        {
          id: "a",
          text: "Adrenalin 0.05-0.3 mcg/kg/dk (periferik veya IO'dan)",
          correct: true,
          points: 30,
          feedback:
            "Doğru — SSC 2020: pediatrik soğuk şokta (bu vaka) ADRENALİN 1. tercih. Santral yol yoksa periferik/IO başlanabilir.",
          min_difficulty: 2,
        },
        {
          id: "b",
          text: "Noradrenalin 0.05-0.1 mcg/kg/dk",
          correct: true,
          points: 25,
          feedback:
            "Kabul — sıcak şokta (vazoplejik) noradrenalin tercih. Bu vaka soğuk şok (kapiller dolum uzun, ekstremite soğuk) — adrenalin daha uygun ama noradrenalin de kabul.",
          min_difficulty: 3,
        },
        {
          id: "c",
          text: "Dopamin 5-10 mcg/kg/dk",
          correct: false,
          points: -10,
          feedback:
            "HATA — SSC 2020 ve ACCM 2017 pediatrik şokta dopamini 1. tercih olmaktan çıkardı. Adrenalin/noradrenalin tercih.",
        },
        {
          id: "d",
          text: "Daha fazla sıvı (20 mL/kg daha)",
          correct: false,
          points: -5,
          feedback:
            "HAYIR — akciğerde ral var, sıvı yüklenmesi başlıyor. 40 mL/kg sonrası vazopressöre geç.",
        },
        // S4 için: vazopressin ikinci ajan
        {
          id: "e",
          text: "Adrenalin + vazopressin (erken ikinci ajan)",
          correct: true,
          points: 28,
          feedback:
            "Mükemmel — SSC 2020: dirençli şokta ikinci ajan olarak vazopressin (terlipresin de alternatif). Katekolamin dozunu azaltır.",
          min_difficulty: 4,
        },
      ],
    },

    // ========================================================
    // ADIM 5 — Dirençli vazopressör şok
    // ========================================================
    {
      id: "s5_direncli",
      kind: "action",
      title: "Vazopressöre Dirençli Şok (60 dk)",
      prompt:
        "Adrenalin 0.2 mcg/kg/dk'ya rağmen SBP 78, HR 150 sürüyor. Akciğer raller +, idrar çıkışı yok. Ne eklersin?",
      narrative:
        "Sıvı artık dikkatli verilmeli. Kardiyak disfonksiyon olabilir.",
      min_actions: 1,
      max_actions: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "hidrokortizon" },
          points: 20,
          feedback:
            "Doğru — SSC 2020: dirençli vazopressör şokta hidrokortizon 2 mg/kg bolus, sonra 50 mg/m²/gün. Adrenal yetmezlik olasılığı.",
        },
        // S4 için: entübasyon hazırlığı + ketamin tercihi
        {
          action: { type: "give_medication", target_id: "ketamin" },
          points: 15,
          feedback:
            "Doğru — septik şokta entübasyon için ketamin (hemodinamik nötr). Etomidate adrenal supresyon yapar, propofol hipotansiyonu derinleştirir.",
          min_difficulty: 4,
        },
        {
          action: { type: "use_equipment", target_id: "ventilator_mekanik" },
          points: 15,
          feedback:
            "Doğru — akciğer raller + solunum yorulması → entübasyon + mekanik ventilasyon.",
          min_difficulty: 4,
        },
        // S4 için echo (kardiyak disfonksiyon değerlendirmesi)
        {
          action: { type: "use_equipment", target_id: "ultrason" },
          points: 12,
          feedback:
            "Doğru — POCUS: EF düşükse inotropik destek (dobutamin), vena kava durumu sıvı ihtiyacı için.",
          min_difficulty: 4,
        },
        // HATA: propofol septik şokta
        {
          action: { type: "give_medication", target_id: "propofol" },
          points: -15,
          feedback:
            "HATA — septik şokta propofol = kardiyovasküler kollaps. Ketamin veya etomidate tercih (ancak etomidate de adrenal sup yapar).",
          critical: true,
        },
        // HATA: daha fazla sıvı
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: -8,
          feedback:
            "HAYIR — akciğer raller var, sıvı yüklenmesi belirgin. Vazopressör + kardiyak destek öncelikli.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu aşamada: hidrokortizon + entübasyon hazırlığı + kardiyak değerlendirme.",
    },
  ],

  scoring: {
    max_points: 150,
    passing_score: 90,
    grade_bands: {
      A: 135,
      B: 115,
      C: 95,
      D: 75,
    },
  },

  debrief: {
    key_learnings: [
      "Pediatrik septik şokta SBP ile hipotansiyon tanımı yaşa bağlı: 1-10 yaş için SBP <70+(2×yaş).",
      "SSC 2020 1-saat bundle: sıvı 20 mL/kg × 2-3 bolus + antibiyotik + kültür + laktat.",
      "Pediatrik septik şokta DOPAMİN ARTIK 1. TERCİH DEĞİL — adrenalin (soğuk şok) veya noradrenalin (sıcak şok).",
      "Damar yolu 90 sn'de bulunamazsa IO — hayat kurtarır.",
      "Sıvıya dirençli şokta hidrokortizon düşünül (adrenal yetmezlik olasılığı).",
      "Septik şokta entübasyon → ketamin tercih (hemodinamik nötr).",
      "Akciğerde ral/ödem başladıysa sıvıyı durdur, vazopressör ve kardiyak desteğe geç.",
    ],
    references: [
      "Weiss SL et al. Surviving Sepsis Campaign International Guidelines for the Management of Septic Shock and Sepsis-Associated Organ Dysfunction in Children. Pediatr Crit Care Med. 2020.",
      "TATD Çocuklarda Sepsis ve Septik Şok Protokolü, CAYD 2018.",
      "Evans L et al. Surviving Sepsis Campaign: International Guidelines for Management of Sepsis and Septic Shock 2021.",
    ],
    red_flags: [
      "Pediatrik septik şokta dopamin 1. tercih DEĞİL",
      "Antibiyotiği 1 saat içinde ver — kültürü bekleme",
      "Damar yolu bulunamadıysa IO (90 sn eşiği)",
      "Akciğerde ral başladıysa sıvıyı durdur, vazopressör öncelikli",
      "Entübasyonda propofol septik şokta kontrendike (ketamin tercih)",
    ],
    next_scenarios: ["dahiliye-dka-001"],
  },
};
