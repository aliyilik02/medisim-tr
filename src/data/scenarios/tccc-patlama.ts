// ============================================================
// MediSim TR — TCCC Patlama Yaralanması (Askeri / TCCC)
// ============================================================
// Klinik referans: TCCC Guidelines CoTCCC 2024,
// PHTLS (Prehospital Trauma Life Support) 10. Baskı,
// NATO Emergency War Surgery 4. Baskı,
// TSK Saha İlk Yardım Protokolü.
// Ana öğretim hedefi: TCCC üç aşaması (CUF→TFC→TACEVAC),
// tourniquet uygulaması, gerilimli PTX yönetimi, massive hemorrhage.
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_tccc_patlama: Scenario = {
  id: "askeri_tccc-patlama-001",
  version: "0.1.0",
  title: "24 Yaş Asker — Patlama Yaralanması, Sağ Bacak Kanaması",
  description:
    "Muharebe ortamında patlama. Sağ bacakta yüksek debili kanama, şarapnel yaralanması. Göğüs ağrısı ve nefes darlığı. TCCC protokollerine göre Care Under Fire → Tactical Field Care → TACEVAC.",
  specialty: "askeri_tccc",
  tags: ["tccc", "tourniquet", "patlama", "ptx", "masif kanama", "saha tıbbı"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4, 5],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "TCCC CoTCCC Guidelines 2024, NATO Emergency War Surgery uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 24,
    sex: "M",
    weight_kg: 82,
    height_cm: 180,
    chief_complaint:
      "Patlama, sağ bacakta şarapnel kanalı — aktif arteriyel kanama. Göğüs ağrısı, nefes alırken solunum sıkıntısı. Bilinç açık ama korkmuş ve ağrılı.",
    history_items: [
      "Aktif muharebe personeli",
      "Patlama: yaklaşık 3 dakika önce",
      "Bilinç açık (konuşuyor)",
      "Sağ bacak: uyluk orta 1/3 şarapnel — fışkıran kanama",
      "Göğüs sağ: nefes alırken ıslık sesi (sucking chest wound?)",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 128,
    bp_systolic: 90,
    bp_diastolic: 54,
    spo2: 89,
    temp: 36.5,
    rr: 28,
    pain: 9,
    gcs: 14,
  },

  available_medications: [
    "ketamin",
    "morfin",
    "fentanil_nazal",
    "traneksamik_asit",
    "seftriakson",
    "amoksisilin_klavulanat",
    "serum_fizyolojik",
    "ringer_laktat",
    "plazma",
  ],

  available_equipment: [
    "tourniquet_cat",
    "hemostaz_gazi",
    "oclusive_pansuman",
    "igne_dekompresyon",
    "gog_tüpü",
    "nasopharengeal_airway",
    "bvm_maskesi",
    "oksijen_maske",
    "iv_kateter_18g",
    "io_ig",
    "kompresyon_bandi",
    "tansiyon_aleti",
    "pulse_oksimetre",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  start_step_id: "s1_care_under_fire",

  steps: [
    // ====================================================
    // ADIM 1 — Care Under Fire (Ateş Altında Bakım)
    // ====================================================
    {
      id: "s1_care_under_fire",
      kind: "decision",
      title: "Care Under Fire — Ateş Altında İlk Müdahale",
      prompt:
        "Patlama oldu, ateş hâlâ sürüyor! Sağ bacağında masif kanayan asker yerde. Ne yaparsınız?",
      narrative:
        "TCCC Faz 1 — Ateş altında yalnızca yaşamı tehdit eden kanamayı durdur. Kapsamlı muayene şimdi değil.",
      options: [
        {
          id: "opt_tourniquet_ilk",
          text: "Tourniquet (CAT) koy, hastayı örtüye al, kendini koru, emniyete çekil",
          correct: true,
          points: 35,
          feedback:
            "Doğru — CUF prensipleri: Hayati kanama→Tourniquet; sonra bitiş noktasına taşı. 'Hayatta kalan için çalış.' Dakika kaybetme.",
        },
        {
          id: "opt_degerlendir_ilk",
          text: "Hastanın yanına git, ABC değerlendirmesi yap",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — Ateş altında kapsamlı değerlendirme yapılmaz. CUF kuralı: ÖNCE güvenli pozisyon, sınırlı müdahale. Kendini tehlikeye atma.",
        },
        {
          id: "opt_sivi",
          text: "IV sıvı başla",
          correct: false,
          points: -15,
          feedback:
            "Yanlış öncelik — CUF'ta IV sıvı değil, kanama kontrolü önce. Sıvı TFC aşamasında.",
        },
      ],
    },

    // ====================================================
    // ADIM 2 — Tactical Field Care (Taktik Saha Bakımı)
    // ====================================================
    {
      id: "s2_tactical_field_care",
      kind: "action",
      title: "Tactical Field Care — Güvenli Alanda Tam Değerlendirme",
      prompt:
        "Güvenli noktaya taşındınız. Tourniquet var, kanama kontrol altında. Şimdi tam değerlendirme yapın (MARCH protokolü).",
      narrative:
        "MARCH: Massive hemorrhage → Airway → Respiration → Circulation → Hypothermia. Sistematik git.",
      min_actions: 4,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "tourniquet_cat" },
          points: 20,
          feedback:
            "Doğru — Tourniquet yeri değerlendir: uyluk üst 1/3, kasttan 5 cm yukarı. Uygulama saati YAZ. Zaten uygulandıysa teyit et.",
        },
        {
          action: { type: "examine", target_id: "solunum_muayenesi" },
          points: 20,
          feedback:
            "Doğru — R (Respiration): Göğüs muayenesi! Sağda azalmış solunum sesi + trakea sola deviasyon → GERİLİMLİ PTX! Acil iğne dekompresyon gerekli.",
        },
        {
          action: { type: "use_equipment", target_id: "igne_dekompresyon" },
          points: 25,
          feedback:
            "Doğru — Gerilimli PTX: 2. interkostal aralık, mid-klaviküler hat (MCL) veya 4-5. IKA ön aksiller hat'tan 14G iğne. SpO₂ ve TA düzelmeli.",
        },
        {
          action: { type: "use_equipment", target_id: "oclusive_pansuman" },
          points: 15,
          feedback:
            "Doğru — Emici göğüs yarası (sucking chest wound): valf-li kapatıcı pansuman (Halo, Russell Chest Seal). Hava girişi engelle, çıkışa izin ver.",
        },
        {
          action: { type: "use_equipment", target_id: "hemostaz_gazi" },
          points: 10,
          feedback:
            "Doğru — Tourniket uygulanamayan kanamalar için hemostaz gazı + basınç.",
        },
        {
          action: { type: "give_medication", target_id: "traneksamik_asit" },
          points: 20,
          feedback:
            "Doğru — TXA 1 g IV yavaş (10 dk), 3 saat içinde! CRASH-2/MATTERs çalışmaları: masif kanamalı travmada mortaliteyi azaltır. TCCC Class I önerir.",
        },
        {
          action: { type: "give_medication", target_id: "ketamin" },
          points: 10,
          feedback:
            "Doğru — Saha analjezisi: Ketamin 0.5 mg/kg IV veya 1 mg/kg IM. Hemodinamiyi korur. TCCC analjezi seçeneği.",
        },
      ],
      default_wrong_penalty: -8,
      default_wrong_feedback: "MARCH protokolünde bu adım sırası değil.",
    },

    // ====================================================
    // ADIM 3 — Tourniquet doğrulama ve geçici kapatma
    // ====================================================
    {
      id: "s3_tourniquet_dogrulama",
      kind: "decision",
      title: "Tourniquet Doğrulama",
      prompt:
        "Tourniket uyguladınız. Aşağıdakilerden hangisi doğru tourniket uygulamasını gösterir?",
      options: [
        {
          id: "opt_dogru_tk",
          text: "Kanama durdu, distal nabız yok, uygulama saati yazıldı",
          correct: true,
          points: 20,
          feedback:
            "Doğru — Etkin tourniket: kanama durması + distal nabzın olmaması + YAZILI saat. Hedef arteriyel baskıyı kes.",
        },
        {
          id: "opt_yarim_tk",
          text: "Kanama azaldı ama devam ediyor — tourniket yerinde",
          correct: false,
          points: -15,
          feedback:
            "Yanlış — Tourniket 'kısmi' çalışmamalı. Ya sıkıştır (kanama dursun, distal nabız gitsin) ya da çıkar ve farklı yönteme geç.",
        },
        {
          id: "opt_gevset",
          text: "Tourniket 1 saatten fazlaysa gevşet",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — TCCC: Tourniket saha koşullarında GEVŞETİLMEZ. Ekstremite ölümü riski, reperfüzyon şoku. Hastane ortamında uzmanca kaldırılır.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 — TACEVAC (Tahliye) hazırlığı (S3+)
    // ====================================================
    {
      id: "s4_tacevac",
      kind: "action",
      title: "TACEVAC — Tahliye Hazırlığı",
      prompt:
        "MEDEVAC çağrıldı. Helikopter 12 dakika uzakta. Hastayı tahliyeye hazırlayın.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "9line_medevac" },
          points: 20,
          feedback:
            "Doğru — 9-line MEDEVAC mesajı: konum, frekans, hasta sayısı/durumu, ekipman ihtiyacı, engeller. Tahliye koordinasyonunda kritik.",
        },
        {
          action: { type: "examine", target_id: "hipotermi_kontrolu" },
          points: 10,
          feedback:
            "Doğru — Hipotermi: savaş yara triadı (hipotermi, asidoz, koagülopati). Space blanket sarılmalı. Sıcak tutulmalı.",
        },
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 12,
          feedback:
            "Doğru — TCCC: Açık yara → saha antibiyotiği. Ertaştırılamaz. Seftriakson 1-2 g IV/IM uygun.",
        },
        {
          action: { type: "use_equipment", target_id: "io_ig" },
          points: 10,
          feedback:
            "Doğru — IV damar yolu zorsa İntraosseöz (IO) seçeneği. Sternum veya tibial. Kan ürünü dahil her şey verilebilir.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "TACEVAC hazırlığında bu adım öncelik değil.",
    },
  ],

  scoring: {
    max_points: 210,
    passing_score: 135,
    grade_bands: { A: 185, B: 160, C: 135, D: 105 },
  },

  debrief: {
    key_learnings: [
      "TCCC 3 Faz: Care Under Fire (CUF) → Tactical Field Care (TFC) → TACEVAC. Her fazın farklı öncelikleri var.",
      "CUF: Yalnızca masif kanamanın tourniketi + kendi güvenliğin. Kapsamlı değerlendirme değil.",
      "MARCH protokolü: Massive Hemorrhage → Airway → Respiration → Circulation → Hypothermia/Hyperthermia.",
      "Gerilimli PTX: 2. IKA MCL'den iğne dekompresyon — hava çıkışı sessiz ıslık ve TA/SpO₂ düzelmesi.",
      "Traneksamik asit (TXA): Masif kanamalı travmada yaralanmadan ilk 3 saat içinde 1 g IV. TCCC Class I.",
      "Tourniket saha koşullarında gevşetilmez; saat yazılmalı; hastane ortamında uzmanca kaldırılır.",
    ],
    references: [
      "CoTCCC TCCC Guidelines 2024 (Committee on Tactical Combat Casualty Care)",
      "PHTLS Prehospital Trauma Life Support 10. Baskı 2023",
      "NATO Emergency War Surgery 4. Baskı",
      "CRASH-2 Trial (Lancet 2010) — Traneksamik asit",
      "MATTERs Study (Arch Surg 2012)",
    ],
    red_flags: [
      "Tourniket distal nabzı kesmiyorsa → sık ya da hemostaz gazına geç",
      "Gerilimli PTX: trakeal deviasyon + azalmış nefes sesi → hemen iğne dekompresyon",
      "Bilinç kaybı saha'da → nasopharyngeal airway, yaralıyı yana yatır",
      "TXA 3 saatten sonra verilmesi kanama/ölümü artırabilir",
    ],
    next_scenarios: ["askeri_tccc-penetran-gogus-001", "askeri_tccc-tbi-saha-001"],
  },
};
