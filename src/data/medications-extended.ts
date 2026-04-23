import type {
  ExtendedMedication,
  Contraindication,
} from "@/engine/pharmacology/types";

// ============================================================
// MediSim TR — Genişletilmiş İlaç Kataloğu (Farmakoloji Motoru)
// ============================================================
// Her ilacın farmakoloji motoru verileri:
//   - preset: PHARMACOLOGY_PRESETS'ten şablon
//   - dose_band: doğru/hatalı sınır + under/over ceza
//   - modifiers: hasta özelliklerine göre çarpan
//   - contraindications: alerji, geçmiş, vital, eşzamanlı ilaç
//
// NOT: Temel kimlik bilgileri src/data/medications.ts içinde.
// Senaryo motor bu iki kataloğu id üzerinden eşleştirir.
// ============================================================
//
// FAZ 1 İÇERİĞİ:
// - Kardiyovasküler (30 ilaç) — Hafta 1 ✅
// - Solunum + diğer (30 ilaç) — Hafta 2
//
// Klinik referanslar: ESC 2023, AHA/ACC 2022, UpToDate, Katzung 15e
// ============================================================

// ------------------------------------------------------------
// Ortak kontrendikasyon blokları (tekrar etmesin diye)
// ------------------------------------------------------------

// Aktif kanama — tüm antikoagülan/antiagregan/trombolitik için
const CONTRA_AKTIF_KANAMA: Contraindication = {
  trigger: { kind: "history", keyword: "aktif kanama" },
  severity: "kritik",
  effect: "kanama_alevlenme",
  penalty: -25,
  grace_sec: 120,
  message:
    "DİKKAT: Aktif kanama öyküsünde antikoagülan/antiagregan kontrendike!",
  feedback:
    "Aktif kanaması olan hastada kanama riski taşıyan ilaç mutlak kontrendikedir. Önce kanama kontrolü.",
  antidotes: [],
};

// Yakın zamanlı intrakraniyal kanama — trombolitik için
const CONTRA_ICH_HISTORY: Contraindication = {
  trigger: { kind: "history", keyword: "intrakraniyal kanama" },
  severity: "kritik",
  effect: "hemorajik_transformasyon",
  penalty: -30,
  message:
    "DİKKAT: İntrakraniyal kanama öyküsü → trombolitik mutlak kontrendike!",
  feedback:
    "Önceki intrakraniyal kanama trombolitik tedavinin mutlak kontrendikasyonudur.",
};

// ------------------------------------------------------------
// İLAÇ TANIMLARI
// ------------------------------------------------------------

export const EXTENDED_MEDICATIONS: Record<string, ExtendedMedication> = {
  // ========================================================
  // ANTİAGREGAN (4)
  // ========================================================
  aspirin: {
    id: "aspirin",
    preset: "antiagregan",
    dose_band: {
      default_dose: 300,
      dose_unit: "mg",
      dose_route: "PO",
      band_lower_pct: 0.5, // 150-300-325 mg hepsi kabul
      band_upper_pct: 1.1,
      under_dose_penalty: -3,
      over_dose_penalty: -3,
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "allergy", keyword: "aspirin" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -25,
        grace_sec: 60,
        message: "DİKKAT: Aspirin alerjisi!",
        feedback:
          "Aspirin alerjisi olan hastada ASA kontrendike. Alternatif: klopidogrel veya tikagrelor.",
      },
    ],
  },

  klopidogrel: {
    id: "klopidogrel",
    preset: "antiagregan",
    dose_band: {
      default_dose: 600, // Yükleme dozu (acil)
      dose_unit: "mg",
      dose_route: "PO",
      band_lower_pct: 0.5, // 300 mg da kabul edilebilir (bazı kılavuzlar)
      band_upper_pct: 1.1,
      under_dose_penalty: -3,
      over_dose_penalty: -5,
    },
    contraindications: [CONTRA_AKTIF_KANAMA],
  },

  tikagrelor: {
    id: "tikagrelor",
    preset: "antiagregan",
    dose_band: {
      default_dose: 180,
      dose_unit: "mg",
      dose_route: "PO",
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "history", keyword: "intrakraniyal kanama" },
        severity: "kritik",
        effect: "kanama",
        penalty: -25,
        message:
          "Önceki intrakraniyal kanama → tikagrelor mutlak kontrendike.",
        feedback: "Tikagrelor için ICH öyküsü mutlak kontrendikasyondur.",
      },
    ],
  },

  prasugrel: {
    id: "prasugrel",
    preset: "antiagregan",
    dose_band: {
      default_dose: 60,
      dose_unit: "mg",
      dose_route: "PO",
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "history", keyword: "inme" },
        severity: "kritik",
        effect: "kanama_riski",
        penalty: -25,
        message: "DİKKAT: İnme/TIA öyküsünde prasugrel kontrendike!",
        feedback:
          "Prasugrel inme/TIA öyküsünde kontrendikedir. Tikagrelor veya klopidogrel tercih edilmeli.",
      },
      // 75 yaş üzeri + <60 kg göreceli kontrendikasyon (prasugrel için özel)
    ],
    modifiers: {
      yasli_70plus: 0.8, // 75+ için genelde kullanılmaz; motor seviye 4-5 için uyarır
    },
  },

  // ========================================================
  // ANTİKOAGÜLAN (4)
  // ========================================================
  heparin: {
    id: "heparin",
    preset: "antikoagulan-parenteral",
    dose_band: {
      default_dose: 60, // IU/kg
      dose_unit: "IU",
      dose_route: "IV_push",
      weight_based: true,
      max_single_dose: 4000,
      band_lower_pct: 0.85,
      band_upper_pct: 1.15,
      under_dose_penalty: -5,
      over_dose_penalty: -10,
    },
    modifiers: {
      bobrek_yetm: 1.0, // Heparin renal-bağımsız; doz ayarı yok (enoksaparinden farkı)
      yasli_70plus: 0.9,
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "history", keyword: "HIT" },
        severity: "kritik",
        effect: "tromboz_riski",
        penalty: -30,
        grace_sec: 60,
        message: "DİKKAT: Heparin-indüklü trombositopeni (HIT) öyküsü!",
        feedback:
          "HIT öyküsünde heparin mutlak kontrendike. Bivalirudin veya fondaparinuks kullan.",
        antidotes: ["bivalirudin", "fondaparinuks"],
      },
    ],
  },

  enoksaparin: {
    id: "enoksaparin",
    preset: "antikoagulan-parenteral",
    dose_band: {
      default_dose: 1.0, // mg/kg
      dose_unit: "mg",
      dose_route: "SC",
      weight_based: true,
      band_lower_pct: 0.85,
      band_upper_pct: 1.15,
    },
    modifiers: {
      bobrek_yetm: 0.5, // CrCl <30 → doz yarıya
      yasli_70plus: 0.75, // 75+ için STEMI'de bolus atlanır, doz azaltılır
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "modifier", modifier: "bobrek_yetm" },
        severity: "uyari",
        effect: "biyobirikim",
        penalty: -3,
        message:
          "Böbrek yetmezliği: enoksaparin dozu %50'ye azaltılmalı veya heparin tercih edilmeli.",
        feedback:
          "CrCl <30 mL/dk'da enoksaparin birikir. Heparin daha güvenli.",
      },
    ],
  },

  fondaparinuks: {
    id: "fondaparinuks",
    preset: "antikoagulan-parenteral",
    dose_band: {
      default_dose: 2.5,
      dose_unit: "mg",
      dose_route: "SC",
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
    },
    modifiers: {
      bobrek_yetm: 0, // CrCl <30 kontrendike (çarpan 0 → etki yok ama kontrendikasyon da var)
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      {
        trigger: { kind: "modifier", modifier: "bobrek_yetm" },
        severity: "orta",
        effect: "biyobirikim",
        penalty: -10,
        effect_vitals: {}, // akut vital etki yok, kanama geç
        message: "Ağır böbrek yetmezliğinde (CrCl <30) fondaparinuks kontrendike.",
        feedback:
          "Fondaparinuks renal atılır; CrCl <30 mL/dk'da kullanılmamalı.",
      },
    ],
  },

  bivalirudin: {
    id: "bivalirudin",
    preset: "antikoagulan-parenteral",
    dose_band: {
      default_dose: 0.75, // mg/kg bolus
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
    },
    modifiers: {
      bobrek_yetm: 0.75,
    },
    contraindications: [CONTRA_AKTIF_KANAMA],
  },

  // ========================================================
  // TROMBOLİTİK (2)
  // ========================================================
  tenecteplase: {
    id: "tenecteplase",
    dose_band: {
      // Kiloya göre: <60 kg=30, 60-70=35, 70-80=40, 80-90=45, ≥90=50 mg
      // Motor için ortalama 40 mg kabul, weight_based=false
      default_dose: 40,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.75,
      band_upper_pct: 1.25,
      under_dose_penalty: -10,
      over_dose_penalty: -15,
    },
    timing: {
      onset_sec: 300,
      peak_min: 30,
      duration_min: 120,
    },
    modifiers: {
      yasli_70plus: 0.85, // 75+ için dikkat, ağır kanama riski artar
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      CONTRA_ICH_HISTORY,
      {
        trigger: { kind: "history", keyword: "iskemik inme" },
        severity: "kritik",
        effect: "hemorajik_donusum",
        penalty: -25,
        message: "Son 3 ay içinde iskemik inme → trombolitik kontrendike.",
        feedback:
          "3 ay içindeki iskemik inme trombolitik için mutlak kontrendikasyondur.",
      },
      {
        trigger: { kind: "vital", param: "bp_systolic", op: ">", value: 180 },
        severity: "orta",
        effect: "kanama_riski",
        penalty: -10,
        message:
          "SBP >180 mmHg → trombolitik öncesi kan basıncı kontrolü gerekli.",
        feedback:
          "Kontrolsüz hipertansiyonda (>180/110) trombolitik göreceli kontrendikedir.",
      },
    ],
  },

  alteplase: {
    id: "alteplase",
    dose_band: {
      default_dose: 100, // Toplam maksimum doz
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.85,
      band_upper_pct: 1.0,
    },
    timing: {
      onset_sec: 600,
      peak_min: 45,
      duration_min: 180,
    },
    contraindications: [
      CONTRA_AKTIF_KANAMA,
      CONTRA_ICH_HISTORY,
    ],
  },

  // ========================================================
  // NİTRATLAR (3)
  // ========================================================
  nitrogliserin: {
    id: "nitrogliserin",
    preset: "vazodilator-nitrat",
    dose_band: {
      default_dose: 0.4,
      dose_unit: "mg",
      dose_route: "SL",
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "kritik",
        effect: "ağır_hipotansiyon",
        effect_vitals: { sbp_range: [-30, -20], dbp_range: [-15, -10] },
        penalty: -20,
        grace_sec: 60,
        message:
          "DİKKAT: SBP <90 mmHg iken nitrat → ağır hipotansiyon!",
        feedback:
          "Hipotansiyonda (SBP<90) nitrat kontrendike. Sıvı resüsitasyonu gerekir.",
        antidotes: ["salin_09", "ringer_laktat", "noradrenalin"],
      },
      {
        trigger: { kind: "concurrent_med", medication_id: "sildenafil" },
        severity: "kritik",
        effect: "ağır_hipotansiyon",
        effect_vitals: { sbp_range: [-40, -25] },
        penalty: -25,
        grace_sec: 60,
        message: "DİKKAT: PDE-5 inhibitörü (sildenafil) + nitrat → şok!",
        feedback:
          "PDE-5 inhibitörü kullanımı (24 saat içinde) nitrat için mutlak kontrendikasyondur.",
      },
      // Sağ ventrikül MI: preload-bağımlı, nitrat hipotansiyon yapar
      // Bu karmaşık bir karar — senaryoda özel olarak işaretlenmeli
    ],
  },

  nitrogliserin_iv: {
    id: "nitrogliserin_iv",
    preset: "vazodilator-nitrat",
    dose_band: {
      // IV infüzyon mcg/dk — 5-200 aralığı geniş, orta değer
      default_dose: 20,
      dose_unit: "mcg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.25,
      band_upper_pct: 5.0, // Titrasyon nedeniyle geniş bant
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "kritik",
        effect: "ağır_hipotansiyon",
        effect_vitals: { sbp_range: [-30, -20] },
        penalty: -20,
        grace_sec: 60,
        message: "DİKKAT: SBP <90 mmHg iken IV nitrat kontrendike!",
        feedback: "IV nitrat da SL gibi hipotansiyonda kontrendikedir.",
      },
    ],
  },

  sodyum_nitroprussid: {
    id: "sodyum_nitroprussid",
    vitals: {
      hr_range: [5, 15],
      sbp_range: [-30, -15],
      dbp_range: [-20, -10],
    },
    timing: {
      onset_sec: 30,
      peak_min: 2,
      duration_min: 3, // Çok kısa etki, titrasyon kolay
    },
    dose_band: {
      default_dose: 0.5, // mcg/kg/dk
      dose_unit: "mcg",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.6,
      band_upper_pct: 5.0, // Titrasyon
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "kritik",
        effect: "ağır_hipotansiyon",
        effect_vitals: { sbp_range: [-40, -25] },
        penalty: -25,
        grace_sec: 60,
        message: "DİKKAT: Hipotansiyonda nitroprussid kontrendike!",
        feedback:
          "Nitroprussid güçlü vazodilatör; SBP<90'da ağır şok yapar.",
      },
    ],
  },

  // ========================================================
  // BETA-BLOKER (3)
  // ========================================================
  metoprolol: {
    id: "metoprolol",
    preset: "beta-bloker",
    dose_band: {
      default_dose: 5,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5, // 2.5-5 mg aralığı
      band_upper_pct: 1.2,
      under_dose_penalty: -2,
      over_dose_penalty: -5,
    },
    modifiers: {
      beta_blocker: 1.3, // Zaten beta-bloker altındaysa kümülatif etki artar
      karaciger_yetm: 1.3, // Hepatik metabolize; birikim
      yasli_70plus: 1.2,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "astım" },
        severity: "orta",
        effect: "bronkospazm",
        effect_vitals: { spo2_range: [-5, -3], rr_range: [3, 6] },
        penalty: -15,
        message: "Astım hastasında beta-bloker bronkospazm yapabilir.",
        feedback:
          "Beta-1 seçici olsa da yüksek dozda astımı alevlendirebilir. Seviye 3+ için kardiyoselektif ayırımı önemli.",
      },
      {
        trigger: { kind: "vital", param: "hr", op: "<", value: 60 },
        severity: "kritik",
        effect: "bradikardi_kotu",
        effect_vitals: { hr_range: [-20, -10], sbp_range: [-15, -8] },
        penalty: -20,
        grace_sec: 60,
        message: "DİKKAT: Bradikardide (HR<60) beta-bloker → AV blok riski!",
        feedback:
          "Bradikardide beta-bloker kontrendike. Önce HR değerlendirilmeli.",
        antidotes: ["atropin", "adrenalin"],
      },
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 100 },
        severity: "orta",
        effect: "hipotansiyon",
        effect_vitals: { sbp_range: [-15, -8] },
        penalty: -10,
        message: "Sınırda kan basıncı — beta-bloker hipotansiyonu derinleştirebilir.",
        feedback:
          "SBP<100 göreceli kontrendikasyon; STEMI'de erken IV beta-bloker tartışmalı.",
      },
    ],
  },

  esmolol: {
    id: "esmolol",
    preset: "beta-bloker",
    vitals: {
      // Esmolol daha kısa etki, preset'i override
      hr_range: [-20, -10],
      sbp_range: [-15, -8],
    },
    timing: {
      onset_sec: 60,
      peak_min: 2,
      duration_min: 10, // Çok kısa!
    },
    dose_band: {
      default_dose: 500, // mcg/kg bolus
      dose_unit: "mcg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.8,
      band_upper_pct: 1.2,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "hr", op: "<", value: 60 },
        severity: "kritik",
        effect: "bradikardi",
        penalty: -20,
        grace_sec: 60,
        message: "Bradikardide esmolol kontrendike.",
        feedback: "Esmolol beta-bloker grubu; HR<60 mutlak kontrendike.",
        antidotes: ["atropin"],
      },
    ],
  },

  labetalol: {
    id: "labetalol",
    vitals: {
      // Alfa+beta karışık, SBP düşüşü daha belirgin
      hr_range: [-15, -5],
      sbp_range: [-25, -15],
      dbp_range: [-15, -8],
    },
    timing: {
      onset_sec: 120,
      peak_min: 5,
      duration_min: 240,
    },
    dose_band: {
      default_dose: 10,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.8,
      band_upper_pct: 2.0, // 10-20 mg aralığı
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "astım" },
        severity: "orta",
        effect: "bronkospazm",
        effect_vitals: { spo2_range: [-4, -2], rr_range: [2, 5] },
        penalty: -12,
        message: "Astım hastasında labetalol bronkospazm riski taşır.",
        feedback:
          "Labetalol non-selektif beta bloker içeriği nedeniyle astımda dikkatli.",
      },
    ],
  },

  // ========================================================
  // KALSİYUM KANAL BLOKERİ (2)
  // ========================================================
  diltiazem: {
    id: "diltiazem",
    preset: "kalsiyum-kanal-bloker",
    dose_band: {
      default_dose: 0.25, // mg/kg
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.8,
      band_upper_pct: 1.4, // İkinci doz 0.35 mg/kg
    },
    modifiers: {
      karaciger_yetm: 1.4, // Hepatik metabolize
      yasli_70plus: 1.2,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "kritik",
        effect: "hipotansiyon",
        effect_vitals: { sbp_range: [-20, -10] },
        penalty: -20,
        grace_sec: 60,
        message: "Hipotansiyonda diltiazem kontrendike.",
        feedback: "SBP<90'da Ca kanal bloker şoku derinleştirir.",
      },
      {
        trigger: { kind: "history", keyword: "düşük ejeksiyon" },
        severity: "kritik",
        effect: "pulmoner_odem",
        penalty: -25,
        grace_sec: 90,
        message: "DEF azalmış HF'de diltiazem kontrendike (inotrop-negatif).",
        feedback: "EF<%40 olan hastada diltiazem ve verapamil kontrendike.",
      },
    ],
  },

  verapamil: {
    id: "verapamil",
    preset: "kalsiyum-kanal-bloker",
    dose_band: {
      default_dose: 5,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5, // 2.5-5 mg
      band_upper_pct: 1.0,
    },
    modifiers: {
      beta_blocker: 0, // Beta-bloker altındaysa kombinasyon kontrendike (tetikleyici contra'da)
      yasli_70plus: 1.3,
    },
    contraindications: [
      {
        trigger: { kind: "modifier", modifier: "beta_blocker" },
        severity: "kritik",
        effect: "AV_blok_asistoli",
        effect_vitals: { hr_range: [-40, -20], sbp_range: [-25, -15] },
        penalty: -30,
        grace_sec: 60,
        message: "DİKKAT: Beta-bloker + verapamil → AV blok / asistoli!",
        feedback:
          "Beta-bloker altındaki hastada verapamil mutlak kontrendike. Diltiazem de dikkatli.",
        antidotes: ["atropin", "adrenalin", "kalsiyum_glukonat"],
      },
    ],
  },

  // ========================================================
  // ANTİARİTMİK (4)
  // ========================================================
  amiodaron: {
    id: "amiodaron",
    preset: "antiaritmik-amiodaron",
    dose_band: {
      default_dose: 300,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5, // 150-300 mg (arrest 300, stabil VT 150)
      band_upper_pct: 1.1,
    },
    modifiers: {
      karaciger_yetm: 1.3,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "tiroid" },
        severity: "uyari",
        effect: "tiroid_disfonksiyon",
        penalty: -2,
        message: "Amiodaron uzun dönem tiroid disfonksiyonu yapabilir.",
        feedback:
          "Akut kullanımda sorun değil; elektif tedavi için tiroid kontrolü gerekir.",
      },
    ],
  },

  lidokain: {
    id: "lidokain",
    vitals: {
      hr_range: [-5, 0],
      sbp_range: [-5, 0],
    },
    timing: {
      onset_sec: 45,
      peak_min: 2,
      duration_min: 15,
    },
    dose_band: {
      default_dose: 1.0, // mg/kg
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.8,
      band_upper_pct: 1.5, // 1-1.5 mg/kg
    },
    modifiers: {
      karaciger_yetm: 1.5, // Hepatik; birikim → toksisite
      yasli_70plus: 1.3,
    },
    contraindications: [
      {
        trigger: { kind: "modifier", modifier: "karaciger_yetm" },
        severity: "uyari",
        effect: "toksisite_riski",
        penalty: -3,
        message: "Karaciğer yetmezliğinde lidokain dozu azaltılmalı.",
        feedback:
          "Lidokain hepatik metabolize; KC yetmezliğinde 1 mg/kg yerine 0.5 mg/kg.",
      },
    ],
  },

  adenozin: {
    id: "adenozin",
    preset: "antiaritmik-adenozin",
    dose_band: {
      default_dose: 6,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.9,
      band_upper_pct: 2.1, // 6/12/12 mg protokolü
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "astım" },
        severity: "orta",
        effect: "bronkospazm",
        effect_vitals: { spo2_range: [-4, -2], rr_range: [2, 5] },
        penalty: -10,
        message: "Astımlıda adenozin bronkospazm yapabilir.",
        feedback:
          "Astım/KOAH'ta adenozin göreceli kontrendike; verapamil tercih edilebilir.",
      },
      {
        trigger: { kind: "history", keyword: "WPW" },
        severity: "kritik",
        effect: "VF_riski",
        penalty: -25,
        grace_sec: 60,
        message:
          "DİKKAT: WPW'de geniş QRS taşikardi varsa adenozin kontrendike!",
        feedback:
          "WPW + AF'de adenozin aksesuar yol üzerinden VF tetikleyebilir.",
      },
    ],
  },

  atropin: {
    id: "atropin",
    vitals: {
      hr_range: [15, 30],
      sbp_range: [5, 15],
    },
    timing: {
      onset_sec: 60,
      peak_min: 3,
      duration_min: 30,
    },
    dose_band: {
      default_dose: 0.5,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.9,
      band_upper_pct: 2.1, // 0.5-1 mg; max toplam 3 mg
      max_single_dose: 1.0,
    },
    contraindications: [
      // 2. veya 3. derece kalp bloğu göreceli etkisiz — uyarı
      {
        trigger: { kind: "history", keyword: "dar açılı glokom" },
        severity: "uyari",
        effect: "göz_içi_basınç",
        penalty: -2,
        message: "Dar açılı glokomda atropin dikkatli kullanılmalı.",
        feedback:
          "Acil bradikardide fayda > zarar; ancak bilinmeli.",
      },
    ],
  },

  // ========================================================
  // VAZOPRESÖR / İNOTROP (4)
  // ========================================================
  adrenalin: {
    id: "adrenalin",
    preset: "sempatomimetik-guclu",
    dose_band: {
      // Kardiyak arrest: 1 mg IV. Anafilaksi: 0.3-0.5 mg IM.
      // Motor IV arrest dozunu baz alıyor; anafilaksi senaryoda override ile
      default_dose: 1,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.9,
      band_upper_pct: 1.1,
      under_dose_penalty: -5,
      over_dose_penalty: -10,
    },
    modifiers: {
      beta_blocker: 0.4, // Beta-bloker altında etki azalır
      yasli_70plus: 0.85,
    },
    contraindications: [
      // Arrest dışında, iskemik kalp hastalığı + hipertansif hastada dikkat
      // Ama arrest'te absolute indication — kontrendikasyon yok
    ],
  },

  noradrenalin: {
    id: "noradrenalin",
    preset: "vazopresor-saf",
    dose_band: {
      default_dose: 0.1, // mcg/kg/dk başlangıç
      dose_unit: "mcg",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.3, // 0.03-0.5 arası titre
      band_upper_pct: 5.0,
    },
    modifiers: {
      yasli_70plus: 0.9,
    },
    contraindications: [
      // Mezenterik iskemi, ekstravasation risk; acil durumda fayda >
    ],
  },

  dopamin: {
    id: "dopamin",
    preset: "sempatomimetik-orta",
    dose_band: {
      default_dose: 10, // mcg/kg/dk
      dose_unit: "mcg",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.3, // 3-20 arası titre
      band_upper_pct: 2.0,
    },
    modifiers: {
      beta_blocker: 0.7,
      yasli_70plus: 0.85,
    },
    contraindications: [
      // Feokromositoma, taşiaritmi göreceli
    ],
  },

  dobutamin: {
    id: "dobutamin",
    preset: "sempatomimetik-orta",
    vitals: {
      // Dobutamin beta-1 baskın, SBP etkisi daha az
      hr_range: [10, 20],
      sbp_range: [5, 15],
      dbp_range: [-5, 5],
    },
    timing: {
      onset_sec: 60,
      peak_min: 10,
      duration_min: 15,
    },
    dose_band: {
      default_dose: 5, // mcg/kg/dk
      dose_unit: "mcg",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.5,
      band_upper_pct: 4.0,
    },
    modifiers: {
      beta_blocker: 0.5, // Beta-1 agonist, beta-blokerle karşıt etki
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "uyari",
        effect: "yetersiz_vazopresör",
        penalty: -5,
        message:
          "Hipotansif şokta dobutamin tek başına yetersiz — noradrenalin ekle.",
        feedback:
          "Dobutamin inotrop; saf vazopresör değil. SBP<90 ise noradrenalin + dobutamin.",
      },
    ],
  },

  // ========================================================
  // DİÜRETİK / AKUT KALP YETMEZLİĞİ (2)
  // ========================================================
  furosemid: {
    id: "furosemid",
    vitals: {
      // Akut vital etki minimal; asıl fayda dekonjesyonda (geç)
      sbp_range: [-5, 0],
      rr_range: [-3, -1], // Pulmoner ödem çözülürse
      spo2_range: [1, 3],
    },
    timing: {
      onset_sec: 300,
      peak_min: 20,
      duration_min: 180,
    },
    dose_band: {
      default_dose: 40,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5, // 20-40 naif / ev dozunun 2 katı
      band_upper_pct: 3.0,
    },
    modifiers: {
      bobrek_yetm: 2.0, // Yüksek doz gerekir
      yasli_70plus: 1.2,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "orta",
        effect: "hipotansiyon_kötü",
        effect_vitals: { sbp_range: [-10, -5] },
        penalty: -10,
        message: "Hipotansif hastada furosemid şoku derinleştirir.",
        feedback:
          "Kardiyojenik şokta furosemid dikkatli; önce preload/inotrop değerlendir.",
      },
      {
        trigger: { kind: "allergy", keyword: "sülfa" },
        severity: "uyari",
        effect: "çapraz_alerji",
        penalty: -3,
        message: "Sülfa alerjisinde furosemidle çapraz reaksiyon nadir.",
        feedback: "Klinik anlamlı çapraz reaksiyon nadir; dikkatli izle.",
      },
    ],
  },

  digoksin: {
    id: "digoksin",
    vitals: {
      hr_range: [-15, -5],
      sbp_range: [0, 5],
    },
    timing: {
      onset_sec: 900, // IV 15 dk
      peak_min: 120, // 2 saat
      duration_min: 1440, // 24 saat
    },
    dose_band: {
      default_dose: 0.25,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.9, // DAR terapötik aralık
      band_upper_pct: 1.1,
      under_dose_penalty: -5,
      over_dose_penalty: -15, // Toksisite ciddi
    },
    modifiers: {
      bobrek_yetm: 1.5, // Renal atılım, birikim
      yasli_70plus: 1.4,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "hr", op: "<", value: 60 },
        severity: "kritik",
        effect: "bradikardi_agir",
        effect_vitals: { hr_range: [-15, -8] },
        penalty: -20,
        grace_sec: 120,
        message: "Bradikardide digoksin kontrendike.",
        feedback: "Digoksin AV nod iletimini yavaşlatır; HR<60'ta kontrendike.",
        antidotes: ["atropin", "digibind"],
      },
      {
        trigger: { kind: "history", keyword: "WPW" },
        severity: "kritik",
        effect: "VF_riski",
        penalty: -25,
        message:
          "WPW + AF'de digoksin aksesuar yolu hızlandırır → VF riski!",
        feedback: "WPW'de digoksin kontrendike; amiodaron veya prokainamid.",
      },
    ],
  },

  // ========================================================
  // HT KRİZİ (1)
  // ========================================================
  nikardipin: {
    id: "nikardipin",
    vitals: {
      // Dihidropiridin; vazodilatasyon baskın, HR refleks artar
      hr_range: [5, 15],
      sbp_range: [-25, -15],
      dbp_range: [-15, -10],
    },
    timing: {
      onset_sec: 300,
      peak_min: 15,
      duration_min: 60,
    },
    dose_band: {
      default_dose: 5, // mg/saat başlangıç
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 1.0,
      band_upper_pct: 3.0, // 5-15 mg/saat titrasyon
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 100 },
        severity: "orta",
        effect: "hipotansiyon",
        effect_vitals: { sbp_range: [-15, -8] },
        penalty: -10,
        message: "Düşük kan basıncında nikardipin dikkatli titre edilmeli.",
        feedback:
          "Nikardipin titre edilebilir ama başlangıç SBP>120 olmalı.",
      },
    ],
  },

  // ========================================================
  // ANALJEZİK (göğüs ağrısı) — 1 tane
  // ========================================================
  morfin: {
    id: "morfin",
    preset: "opioid-guclu",
    dose_band: {
      default_dose: 4,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5, // 2-4 mg
      band_upper_pct: 1.25, // 5 mg üst sınır
    },
    modifiers: {
      karaciger_yetm: 1.5,
      bobrek_yetm: 1.3,
      yasli_70plus: 1.3,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "KOAH" },
        severity: "kritik",
        effect: "solunum_depresyonu",
        effect_vitals: { rr_range: [-8, -4], spo2_range: [-6, -3] },
        penalty: -25,
        grace_sec: 60,
        message:
          "DİKKAT: KOAH'ta morfin → ağır solunum depresyonu!",
        feedback:
          "KOAH hastasında morfin solunumu baskılar. Naloksan hazır tutulmalı. Fentanil daha güvenli alternatif.",
        antidotes: ["naloksan"],
      },
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 100 },
        severity: "orta",
        effect: "hipotansiyon",
        effect_vitals: { sbp_range: [-12, -6] },
        penalty: -10,
        message: "Sınırda kan basıncında morfin hipotansiyonu derinleştirebilir.",
        feedback:
          "STEMI + hipotansiyonda morfin dikkatli; nitrogliserin denenmemişse morfin öncelikli değil.",
      },
      {
        trigger: { kind: "allergy", keyword: "morfin" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -20,
        grace_sec: 60,
        message: "Morfin alerjisi — fentanil veya meperidin kullan.",
        feedback: "Opioid çapraz alerjisi olabilir; fentanil farklı sınıf.",
      },
    ],
  },

  // ========================================================
  // HAFTA 2 — KARDİYO-DIŞI İLAÇLAR (30)
  // ========================================================
  // Ref: UpToDate, Katzung 15e, GINA 2024 (astım), GOLD 2024 (KOAH),
  // ADA 2024 (DKA), Surviving Sepsis 2021, BSAC/IDSA antibiyotik rehberleri
  // ========================================================

  // ---------- SOLUNUM (5) ----------
  salbutamol: {
    id: "salbutamol",
    preset: "bronkodilator",
    dose_band: {
      default_dose: 2.5,
      dose_unit: "mg",
      dose_route: "nebul",
      band_lower_pct: 0.8,
      band_upper_pct: 2.0,  // 5 mg hâlâ normal aralıkta
      under_dose_penalty: -2,
      over_dose_penalty: -3,
    },
    modifiers: {
      beta_blocker: 0.5,  // beta-bloker altında etkinlik azalır
    },
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "salbutamol" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -20,
        message: "Salbutamol alerjisi — ipratropium bromür al.",
        feedback: "Beta-2 agonist alerjisi nadir ama kritik. Antikolinerjik alternatif.",
      },
      {
        trigger: { kind: "vital", param: "hr", op: ">=", value: 150 },
        severity: "orta",
        effect: "taşiaritmi",
        effect_vitals: { hr_range: [10, 20] },
        penalty: -8,
        message: "Taşikardi var — salbutamol HR'i daha da artırır.",
        feedback: "Çok yüksek HR'de beta-2 agonist taşiaritmi riski. Magnezyum veya ipratropium düşün.",
      },
    ],
  },

  ipratropium: {
    id: "ipratropium",
    preset: "bronkodilator",
    vitals: {
      hr_range: [2, 5],     // Antikolinerjik, HR'i biraz artırır
      spo2_range: [2, 4],
    },
    timing: { onset_sec: 900, peak_min: 30, duration_min: 240 },  // Daha yavaş
    dose_band: {
      default_dose: 0.5,
      dose_unit: "mg",
      dose_route: "nebul",
      band_lower_pct: 0.5,  // 0.25 mg da kabul
      band_upper_pct: 1.0,
      under_dose_penalty: -2,
      over_dose_penalty: -3,
    },
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "atropin" },
        severity: "orta",
        effect: "alerjik_reaksiyon",
        penalty: -10,
        message: "Atropin alerjisi — ipratropium çapraz alerjiyle kontrendike.",
        feedback: "İpratropium atropin türevi; çapraz reaktivite olabilir.",
      },
      {
        trigger: { kind: "history", keyword: "glokom" },
        severity: "uyari",
        effect: "göz içi basınç artışı",
        penalty: -3,
        message: "Dar açılı glokomda maskeden nebülizasyon dikkat — gözlere kaçmamalı.",
        feedback: "Ağız parçası tercih et veya gözlük taktır.",
      },
    ],
  },

  magnezyum_sulfat: {
    id: "magnezyum_sulfat",
    vitals: {
      hr_range: [-5, 0],
      sbp_range: [-10, -3],
      spo2_range: [1, 3],   // Bronkodilatasyon etkisi
    },
    timing: { onset_sec: 60, peak_min: 20, duration_min: 120 },
    dose_band: {
      default_dose: 2,
      dose_unit: "g",
      dose_route: "IV_infusion",
      band_lower_pct: 0.8,
      band_upper_pct: 1.5,
      under_dose_penalty: -3,
      over_dose_penalty: -10,  // Aşırı doz — kas güçsüzlüğü, hipotansiyon
    },
    modifiers: {
      bobrek_yetm: 0.5,  // Böbrek atılır — dikkatli, etki artar gibi gelir ama doz azaltmak gerek
    },
    contraindications: [
      {
        trigger: { kind: "modifier", modifier: "bobrek_yetm" },
        severity: "orta",
        effect: "hipermagnezemi",
        effect_vitals: { hr_range: [-10, -5], sbp_range: [-15, -8] },
        penalty: -10,
        message: "Böbrek yetmezliğinde magnezyum birikir — doz azalt, yakın izlem.",
        feedback: "Hipermagnezemi → kas güçsüzlüğü, aritmi, solunum depresyonu.",
      },
      {
        trigger: { kind: "history", keyword: "miyastenia gravis" },
        severity: "kritik",
        effect: "solunum_depresyonu",
        penalty: -25,
        grace_sec: 90,
        message: "Miyastenia gravis + magnezyum = ciddi kas güçsüzlüğü, kontrendike!",
        feedback: "Nöromusküler bağlantıyı bloke eder. Kalsiyum antidot olabilir.",
        antidotes: ["kalsiyum_glukonat"],
      },
    ],
  },

  deksametazon: {
    id: "deksametazon",
    preset: "kortikosteroid-sistemik",
    dose_band: {
      default_dose: 8,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,  // 4 mg da kabul
      band_upper_pct: 1.5,
      under_dose_penalty: -2,
      over_dose_penalty: -2,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "aktif mantar enfeksiyonu" },
        severity: "orta",
        effect: "enfeksiyon_alevlenme",
        penalty: -8,
        message: "Sistemik mantar enfeksiyonunda kortikosteroid dikkatli.",
        feedback: "Kortikosteroid bağışıklığı baskılar, mantar yayılabilir.",
      },
      {
        trigger: { kind: "vital", param: "glucose", op: ">", value: 300 },
        severity: "uyari",
        effect: "hiperglisemi_alevlenme",
        penalty: -3,
        message: "Zaten yüksek glukoz — kortikosteroid artırır.",
        feedback: "Hiperglisemi varlığında steroidler kan şekerini daha da yükseltir.",
      },
    ],
  },

  hidrokortizon: {
    id: "hidrokortizon",
    preset: "kortikosteroid-sistemik",
    dose_band: {
      default_dose: 100,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,  // Adrenal yetm → 100 mg, sepsis → 50 mg q6h
      band_upper_pct: 2.0,  // 200 mg da septik şokta kabul
      under_dose_penalty: -2,
      over_dose_penalty: -2,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "aktif mantar enfeksiyonu" },
        severity: "orta",
        effect: "enfeksiyon_alevlenme",
        penalty: -8,
        message: "Sistemik mantar enfeksiyonunda dikkat.",
        feedback: "Mantar yayılma riski. Fayda-zarar değerlendir.",
      },
    ],
  },

  // ---------- ANALJEZİK + SEDATİF (5) ----------
  parasetamol: {
    id: "parasetamol",
    preset: "nsaid-parenteral",
    vitals: {
      temp_range: [-1.0, -0.4],
      pain_range: [-3, -1],
    },
    timing: { onset_sec: 300, peak_min: 30, duration_min: 240 },
    dose_band: {
      default_dose: 1000,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.5,  // 500 mg pediatrik/küçük erişkin
      band_upper_pct: 1.0,
      under_dose_penalty: -2,
      over_dose_penalty: -10,  // >4g/gün hepatotoksik
    },
    modifiers: {
      karaciger_yetm: 0.5,  // Karaciğerde metabolize — dikkat
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "karaciger yetmezligi" },
        severity: "orta",
        effect: "hepatotoksisite",
        penalty: -10,
        message: "Karaciğer yetmezliğinde parasetamol dozu yarıya düşür.",
        feedback: "Maks günlük 2 g, aralık 6 saat. N-asetilsistein antidot.",
      },
      {
        trigger: { kind: "allergy", keyword: "parasetamol" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -15,
        message: "Parasetamol alerjisi — ibuprofen veya opioid alternatif.",
        feedback: "Nadir ama var. Stevens-Johnson riski.",
      },
    ],
  },

  tramadol: {
    id: "tramadol",
    preset: "opioid-orta",
    dose_band: {
      default_dose: 100,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.5,
      band_upper_pct: 1.0,
      under_dose_penalty: -2,
      over_dose_penalty: -5,
    },
    modifiers: {
      karaciger_yetm: 0.6,
      bobrek_yetm: 0.7,
      yasli_70plus: 0.7,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "epilepsi" },
        severity: "orta",
        effect: "nöbet_eşiği_düşer",
        penalty: -12,
        message: "Tramadol nöbet eşiğini düşürür — epilepside dikkat.",
        feedback: "Serotonerjik etki nedeniyle nöbet riski artar.",
      },
      {
        trigger: { kind: "concurrent_med", medication_id: "ssri_herhangi" },
        severity: "orta",
        effect: "serotonin_sendromu",
        penalty: -10,
        message: "SSRI ile tramadol → serotonin sendromu riski.",
        feedback: "Hipertermi, miyokloni, rijidite. Alternatif analjezik seç.",
      },
    ],
  },

  ketamin: {
    id: "ketamin",
    vitals: {
      hr_range: [10, 20],       // Sempatik uyarı
      sbp_range: [10, 25],
      pain_range: [-8, -5],
      gcs_range: [-8, -5],      // Disosiyatif sedasyon
    },
    timing: { onset_sec: 30, peak_min: 1, duration_min: 15 },
    dose_band: {
      default_dose: 1.5,
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.66,  // 1 mg/kg
      band_upper_pct: 1.33,  // 2 mg/kg
      under_dose_penalty: -3,
      over_dose_penalty: -5,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: ">", value: 180 },
        severity: "orta",
        effect: "hipertansiyon_alevlenme",
        effect_vitals: { sbp_range: [20, 35] },
        penalty: -10,
        message: "Ağır HT'de ketamin kan basıncını daha da yükseltir.",
        feedback: "Sempatomimetik etki. Etomidate veya propofol daha güvenli.",
      },
      {
        trigger: { kind: "history", keyword: "psikoz" },
        severity: "orta",
        effect: "emergence_reaksiyon",
        penalty: -5,
        message: "Psikotik bozuklukta ketamin emergence reaksiyon riski artar.",
        feedback: "Midazolam ile birlikte vermek reaksiyonu azaltabilir.",
      },
    ],
  },

  propofol: {
    id: "propofol",
    vitals: {
      hr_range: [-10, -3],
      sbp_range: [-25, -10],
      gcs_range: [-10, -6],
      rr_range: [-8, -3],
    },
    timing: { onset_sec: 30, peak_min: 1, duration_min: 10 },
    dose_band: {
      default_dose: 2,
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.75,  // 1.5 mg/kg
      band_upper_pct: 1.25,
      under_dose_penalty: -3,
      over_dose_penalty: -8,
    },
    modifiers: {
      yasli_70plus: 0.6,   // Yaşlıda doz azalt
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "bp_systolic", op: "<", value: 90 },
        severity: "kritik",
        effect: "hipotansiyon_derinlesme",
        effect_vitals: { sbp_range: [-20, -10] },
        penalty: -20,
        grace_sec: 60,
        message: "Hipotansiyonda propofol = kardiyovasküler kollaps. Ketamin veya etomidate tercih!",
        feedback: "Vazodilatasyon + miyokardial depresyon. Düşük SBP'de kontrendike.",
        antidotes: ["adrenalin", "noradrenalin"],
      },
      {
        trigger: { kind: "allergy", keyword: "soya" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -20,
        grace_sec: 60,
        message: "Soya/yumurta alerjisi — propofol kontrendike.",
        feedback: "Propofol emülsiyonu soya yağı ve yumurta lesitini içerir.",
      },
    ],
  },

  etomidate: {
    id: "etomidate",
    vitals: {
      hr_range: [-2, 2],
      sbp_range: [-5, 3],      // Hemodinamik nötr — bu nedenle şokta tercih
      gcs_range: [-10, -6],
    },
    timing: { onset_sec: 20, peak_min: 1, duration_min: 8 },
    dose_band: {
      default_dose: 0.3,
      dose_unit: "mg",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.66,
      band_upper_pct: 1.33,
      under_dose_penalty: -3,
      over_dose_penalty: -5,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "adrenal yetmezlik" },
        severity: "orta",
        effect: "adrenal_supresyon",
        penalty: -10,
        message: "Etomidate adrenal supresyon yapar — adrenal yetm. hastasında dikkat.",
        feedback: "11-beta-hidroksilazı bloke eder. Septik şokta tek doz bile tartışmalı.",
      },
    ],
  },

  // ---------- METABOLİK (3) ----------
  insulin_regular: {
    id: "insulin_regular",
    preset: "insulin-kisa",
    dose_band: {
      default_dose: 0.1,
      dose_unit: "IU",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.5,   // 0.05 U/kg/saat — de-eskalasyon
      band_upper_pct: 1.4,   // 0.14 U/kg/saat — ADA 2024 üst
      under_dose_penalty: -3,
      over_dose_penalty: -8,
    },
    contraindications: [
      {
        trigger: { kind: "vital", param: "glucose", op: "<", value: 70 },
        severity: "kritik",
        effect: "hipoglisemi_derinlesme",
        effect_vitals: { glucose_range: [-30, -15] },
        penalty: -25,
        grace_sec: 60,
        message: "DİKKAT: Kan şekeri zaten düşük. Önce dekstroz ver!",
        feedback: "İnsülini hipoglisemik hastaya verme. Dekstroz %50 25 g IV push.",
        antidotes: ["dekstroz_50"],
      },
      {
        trigger: { kind: "history", keyword: "hipokalemi" },
        severity: "kritik",
        effect: "hipokalemi_aritmi",
        penalty: -25,
        grace_sec: 90,
        message: "K<3.3 mEq/L'de insülin = ölümcül hipokalemi + aritmi. Önce KCl!",
        feedback: "DKA'da ADA kılavuzu: K>3.3 olmadan insülin başlatma.",
        antidotes: ["kcl"],
      },
    ],
  },

  dekstroz_50: {
    id: "dekstroz_50",
    preset: "dekstroz-hipertonik",
    dose_band: {
      default_dose: 25,
      dose_unit: "g",
      dose_route: "IV_push",
      band_lower_pct: 0.4,
      band_upper_pct: 2.0,
      under_dose_penalty: -2,
      over_dose_penalty: -2,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "alkolizm kronik" },
        severity: "uyari",
        effect: "Wernicke_riski",
        penalty: -3,
        message: "Kronik alkolikde dekstroz önce tiamin olmadan Wernicke tetikleyebilir.",
        feedback: "Önce 100 mg tiamin IV, sonra dekstroz.",
        antidotes: ["tiamin"],
      },
    ],
  },

  bikarbonat: {
    id: "bikarbonat",
    vitals: {
      sbp_range: [-3, 3],
      spo2_range: [-1, 0],
    },
    timing: { onset_sec: 60, peak_min: 5, duration_min: 30 },
    dose_band: {
      default_dose: 1,
      dose_unit: "mEq",
      dose_route: "IV_push",
      weight_based: true,
      band_lower_pct: 0.5,
      band_upper_pct: 2.0,
      under_dose_penalty: -2,
      over_dose_penalty: -5,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "metabolik alkaloz" },
        severity: "kritik",
        effect: "alkaloz_derinlesme",
        penalty: -20,
        grace_sec: 60,
        message: "Alkalozda bikarbonat = paradoksik durum, kontrendike!",
        feedback: "pH > 7.45 ise asla verme.",
      },
      {
        trigger: { kind: "history", keyword: "dka pH yuksek" },
        severity: "orta",
        effect: "paradoksik_asidoz",
        penalty: -10,
        message: "DKA'da rutin bikarbonat ÖNERİLMİYOR — sadece pH<6.9 ve hemodinamik kollaps.",
        feedback: "ADA 2024: serebral ödem riski artar, hiperkapniye yol açabilir.",
      },
    ],
  },

  kalsiyum_glukonat: {
    id: "kalsiyum_glukonat",
    vitals: {
      hr_range: [-5, -2],
      sbp_range: [3, 8],
    },
    timing: { onset_sec: 30, peak_min: 5, duration_min: 30 },
    dose_band: {
      default_dose: 1,
      dose_unit: "g",
      dose_route: "IV_infusion",
      band_lower_pct: 0.5,
      band_upper_pct: 2.0,
      under_dose_penalty: -2,
      over_dose_penalty: -5,
    },
    contraindications: [
      {
        trigger: { kind: "concurrent_med", medication_id: "digoksin" },
        severity: "kritik",
        effect: "digitalis_toksisite_alevlenme",
        penalty: -25,
        grace_sec: 90,
        message: "Digoksin altında IV kalsiyum = ölümcül aritmi (stone heart).",
        feedback: "Digitalis toksisitesinde kalsiyum kardiyak kontraktilite durabilir.",
      },
      {
        trigger: { kind: "history", keyword: "hiperkalsemi" },
        severity: "kritik",
        effect: "hiperkalsemi_kriz",
        penalty: -20,
        message: "Zaten yüksek kalsiyum — daha fazla verme!",
        feedback: "Böbrek yetm, aritmi, koma riski.",
      },
    ],
  },

  // ---------- ANTİBİYOTİK (4) ----------
  // NOT: Antibiyotiklerin doğrudan vital etkisi yoktur (yavaş: enfeksiyon
  // kontrolü saatler sürer). Motor için vitals boş, sadece kontrendikasyon.
  seftriakson: {
    id: "seftriakson",
    dose_band: {
      default_dose: 2000,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.5,   // 1 g da kabul (pediatrik/hafif)
      band_upper_pct: 1.0,
      under_dose_penalty: -3,
      over_dose_penalty: -2,
    },
    timing: { onset_sec: 1800, peak_min: 60, duration_min: 1440 }, // 24 saat
    vitals: {},
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "penisilin" },
        severity: "orta",
        effect: "çapraz_alerji",
        penalty: -10,
        message: "Penisilin alerjisinde sefalosporinler %5-10 çapraz reaktivite — dikkat.",
        feedback: "Anaflaktik öyküde kaçın. Aztreonam veya kinolon alternatif.",
      },
      {
        trigger: { kind: "allergy", keyword: "sefalosporin" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -25,
        grace_sec: 60,
        message: "Sefalosporin alerjisi — kontrendike!",
        feedback: "Meropenem dikkatli, aztreonam güvenli alternatif.",
        antidotes: ["adrenalin", "difenhidramin", "hidrokortizon"],
      },
    ],
  },

  piperasilin_tazobaktam: {
    id: "piperasilin_tazobaktam",
    dose_band: {
      default_dose: 4500,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.7,  // 3.375 g minimum
      band_upper_pct: 1.0,
      under_dose_penalty: -3,
      over_dose_penalty: -2,
    },
    timing: { onset_sec: 1800, peak_min: 30, duration_min: 360 }, // 6 saat
    vitals: {},
    modifiers: {
      bobrek_yetm: 0.5,
    },
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "penisilin" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -25,
        grace_sec: 60,
        message: "Penisilin alerjisi — piperasilin kontrendike!",
        feedback: "Meropenem veya sefepim düşün (çapraz reaktivite düşük).",
        antidotes: ["adrenalin", "difenhidramin", "hidrokortizon"],
      },
    ],
  },

  vankomisin: {
    id: "vankomisin",
    dose_band: {
      default_dose: 15,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.8,
      band_upper_pct: 1.4,  // 20 mg/kg
      under_dose_penalty: -3,
      over_dose_penalty: -5,
    },
    timing: { onset_sec: 3600, peak_min: 60, duration_min: 720 }, // 12 saat
    vitals: {},
    modifiers: {
      bobrek_yetm: 0.4,  // Nefrotoksik, doz azaltılmalı
    },
    contraindications: [
      {
        trigger: { kind: "modifier", modifier: "bobrek_yetm" },
        severity: "orta",
        effect: "nefrotoksisite",
        penalty: -10,
        message: "Böbrek yetmezliğinde vankomisin doz ayarı şart.",
        feedback: "GFR'ye göre doz + trough düzeyi izle (hedef 15-20).",
      },
      {
        trigger: { kind: "allergy", keyword: "vankomisin" },
        severity: "orta",
        effect: "red_man_sendromu",
        effect_vitals: { sbp_range: [-15, -5], hr_range: [10, 20] },
        penalty: -8,
        message: "Hızlı infüzyon → red man sendromu. Min 60 dk sürede ver.",
        feedback: "Histamin salınımı. Yavaşlat + difenhidramin.",
      },
    ],
  },

  meropenem: {
    id: "meropenem",
    dose_band: {
      default_dose: 1000,
      dose_unit: "mg",
      dose_route: "IV_infusion",
      band_lower_pct: 0.5,   // 500 mg hafif
      band_upper_pct: 2.0,   // 2 g menenjit/ağır
      under_dose_penalty: -3,
      over_dose_penalty: -2,
    },
    timing: { onset_sec: 1800, peak_min: 30, duration_min: 480 }, // 8 saat
    vitals: {},
    modifiers: {
      bobrek_yetm: 0.5,
    },
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "karbapenem" },
        severity: "kritik",
        effect: "alerjik_reaksiyon",
        penalty: -25,
        grace_sec: 60,
        message: "Karbapenem alerjisi — kontrendike.",
        feedback: "Aztreonam güvenli alternatif, sefepim dikkatli.",
        antidotes: ["adrenalin", "difenhidramin", "hidrokortizon"],
      },
      {
        trigger: { kind: "history", keyword: "epilepsi" },
        severity: "uyari",
        effect: "nöbet_eşiği_düşer",
        penalty: -5,
        message: "Karbapenemler nöbet eşiğini düşürebilir — epilepside izlem.",
        feedback: "Özellikle böbrek yetm + yüksek doz + SSS enfeksiyonu riskli.",
      },
    ],
  },

  // ---------- ANTİEMETİK + ANTİALERJİK (3) ----------
  ondansetron: {
    id: "ondansetron",
    vitals: {},
    timing: { onset_sec: 120, peak_min: 10, duration_min: 240 },
    dose_band: {
      default_dose: 4,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,
      band_upper_pct: 2.0,  // 8 mg ağır emezi
      under_dose_penalty: -2,
      over_dose_penalty: -3,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "uzun QT" },
        severity: "orta",
        effect: "QT_uzamasi",
        penalty: -10,
        message: "Uzun QT sendromu — ondansetron kontrendike (Torsades riski).",
        feedback: "Metoklopramid de QT uzatır. Alternatif: haloperidol düşük doz.",
      },
    ],
  },

  metoklopramid: {
    id: "metoklopramid",
    vitals: {},
    timing: { onset_sec: 120, peak_min: 15, duration_min: 120 },
    dose_band: {
      default_dose: 10,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,
      band_upper_pct: 2.0,
      under_dose_penalty: -2,
      over_dose_penalty: -3,
    },
    modifiers: {
      yasli_70plus: 0.7,  // Ekstrapiramidal yan etki riski
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "parkinson" },
        severity: "orta",
        effect: "ekstrapiramidal",
        penalty: -12,
        message: "Parkinson'da metoklopramid = motor bozulma.",
        feedback: "Dopamin antagonisti. Ondansetron kullan.",
      },
      {
        trigger: { kind: "history", keyword: "bağırsak obstrüksiyonu" },
        severity: "kritik",
        effect: "perforasyon_riski",
        penalty: -20,
        message: "Obstrüksiyonda prokinetik = perforasyon. Kontrendike!",
        feedback: "Önce mekanik obstrüksiyon dışlanmalı.",
      },
    ],
  },

  difenhidramin: {
    id: "difenhidramin",
    vitals: {
      hr_range: [2, 8],     // Antikolinerjik → HR biraz artar
      gcs_range: [-2, 0],   // Sedasyon
    },
    timing: { onset_sec: 60, peak_min: 30, duration_min: 240 },
    dose_band: {
      default_dose: 50,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,
      band_upper_pct: 1.0,
      under_dose_penalty: -2,
      over_dose_penalty: -5,
    },
    modifiers: {
      yasli_70plus: 0.5,  // Deliryum riski
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "dar açılı glokom" },
        severity: "orta",
        effect: "göz_içi_basınç_artışı",
        penalty: -8,
        message: "Dar açılı glokom — antikolinerjik etki kontrendike.",
        feedback: "Feniramin IV daha az antikolinerjik.",
      },
      {
        trigger: { kind: "history", keyword: "prostat hipertrofisi" },
        severity: "uyari",
        effect: "üriner_retansiyon",
        penalty: -3,
        message: "BPH'da antikolinerjik üriner retansiyona neden olabilir.",
        feedback: "Kısa süreli kullanım nispeten güvenli.",
      },
    ],
  },

  // ---------- ANTİDOT + DİĞER KRİTİK (5) ----------
  naloksan: {
    id: "naloksan",
    preset: "naloksan",
    dose_band: {
      default_dose: 0.4,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.25,  // 0.1 mg — hassas titrasyon (opioid bağımlısında)
      band_upper_pct: 5.0,   // 2 mg'e kadar kabul
      under_dose_penalty: -1,
      over_dose_penalty: -2,  // Aşırı doz → abrupt withdrawal, ajitasyon
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "kronik opioid" },
        severity: "uyari",
        effect: "akut_withdrawal",
        penalty: -3,
        message: "Kronik opioid kullanıcısında tam doz naloksan → ajitasyon.",
        feedback: "Küçük dozlarla titre et (0.1 mg). Amaç RR düzeltmek, bilinç değil.",
      },
    ],
  },

  flumazenil: {
    id: "flumazenil",
    preset: "flumazenil",
    dose_band: {
      default_dose: 0.2,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,
      band_upper_pct: 5.0,  // 1 mg da kabul
      under_dose_penalty: -2,
      over_dose_penalty: -3,
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "kronik benzo" },
        severity: "kritik",
        effect: "withdrawal_nobeti",
        penalty: -20,
        grace_sec: 60,
        message: "Kronik benzo kullanıcısında flumazenil = nöbet riski!",
        feedback: "Sadece iyatrojenik overdoz veya net tek doz alımında kullan.",
      },
      {
        trigger: { kind: "concurrent_med", medication_id: "trisiklik_antidepresan" },
        severity: "kritik",
        effect: "nobet",
        penalty: -20,
        grace_sec: 60,
        message: "TCA koingestion + flumazenil = ciddi nöbet + aritmi.",
        feedback: "Mikst intoksikasyonda kaçın.",
      },
    ],
  },

  mannitol: {
    id: "mannitol",
    vitals: {
      sbp_range: [-5, 0],   // Başlangıçta geçici SBP artışı, sonra diürez ile düşüş
    },
    timing: { onset_sec: 900, peak_min: 60, duration_min: 240 },
    dose_band: {
      default_dose: 0.5,
      dose_unit: "g",
      dose_route: "IV_infusion",
      weight_based: true,
      band_lower_pct: 0.5,
      band_upper_pct: 2.0,  // 1 g/kg da kabul
      under_dose_penalty: -3,
      over_dose_penalty: -5,
    },
    modifiers: {
      bobrek_yetm: 0.3,  // Ağır böbrek yetm → etki azalır, yük artar
    },
    contraindications: [
      {
        trigger: { kind: "history", keyword: "anuri" },
        severity: "kritik",
        effect: "sıvı_yüklenme",
        penalty: -25,
        grace_sec: 90,
        message: "Anürik hastada mannitol = pulmoner ödem, kontrendike!",
        feedback: "İşe yaramaz çünkü atılamıyor. Hipertonik salin alternatif.",
      },
      {
        trigger: { kind: "history", keyword: "kalp yetmezligi" },
        severity: "orta",
        effect: "dekompanzasyon",
        penalty: -10,
        message: "Kalp yetmezliğinde mannitol → geçici preload artışı, dekompanzasyon.",
        feedback: "Hipertonik salin %3 daha güvenli alternatif.",
      },
    ],
  },

  tiamin: {
    id: "tiamin",
    vitals: {},
    timing: { onset_sec: 300, peak_min: 30, duration_min: 720 },
    dose_band: {
      default_dose: 100,
      dose_unit: "mg",
      dose_route: "IV_push",
      band_lower_pct: 0.5,
      band_upper_pct: 5.0,  // 500 mg Wernicke tedavisi
      under_dose_penalty: -1,
      over_dose_penalty: -1,
    },
    contraindications: [
      {
        trigger: { kind: "allergy", keyword: "tiamin" },
        severity: "kritik",
        effect: "anafilaksi",
        penalty: -15,
        grace_sec: 60,
        message: "Tiamin alerjisi nadir ama anafilaksi yapabilir.",
        feedback: "Özellikle hızlı IV'de. Yavaş infüzyon daha güvenli.",
        antidotes: ["adrenalin"],
      },
    ],
  },
};

// ------------------------------------------------------------
// Yardımcılar
// ------------------------------------------------------------

export function getExtendedMedication(
  id: string
): ExtendedMedication | undefined {
  return EXTENDED_MEDICATIONS[id];
}

export function listExtendedMedicationIds(): string[] {
  return Object.keys(EXTENDED_MEDICATIONS);
}
