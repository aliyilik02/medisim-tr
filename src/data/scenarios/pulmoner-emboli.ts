import type { Scenario } from "@/engine";

// ============================================================
// Pulmoner Emboli Senaryosu — Submasif (Orta-Yüksek Riskli) PE, 54y Kadın
// ============================================================
// Post-op 3. gün kalça artroplastisi → ani nefes darlığı + plöretik ağrı
// Sınırda hemodinami (BP 95/62) + RV yüklenmesi + troponin pozitif
// → orta-yüksek riskli (submasif) PE
//
// Faz 5.5: lab entegrasyonu eklendi
// - AKG, kardiyak biyobelirteç, D-dimer, KKS+BMP, koagülasyon
// - BT PA anjiyografi + yatak başı EKO görüntüleme sonuçları
// - lab_timeline: t=60 dk troponin/NT-proBNP artışı, laktat düzelme
// - s1b_orders: tetkik istemi (D-dimer = 0 pt eğitici mesaj)
// - s3b_risk_stratification: submasif PE tedavi stratejisi (PEITHO 2014)
//
// Referans: ESC 2019, PEITHO 2014 (Meyer G, N Engl J Med), TKD 2020, AHA 2011
// ============================================================

export const scenario_pulmoner_emboli: Scenario = {
  id: "acil-pulmoner-emboli-001",
  version: "2.0.0",
  title: "54 Yaş Kadın — Ani Nefes Darlığı (Submasif PE)",
  description:
    "Sol kalça artroplastisi sonrası 3. günde ani başlayan nefes darlığı ve plöretik göğüs ağrısı. Sınırda hemodinami (BP 95/62), sağ ventrikül yüklenmesi ve troponin pozitifliği ile submasif (orta-yüksek riskli) pulmoner emboli tanısı ve yönetimi.",
  specialty: "acil",
  tags: ["pulmoner-emboli", "pe", "submasif-pe", "tromboliz", "dvt", "antikoagülan", "wells", "peitho"],
  difficulty: 3,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 20,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2019, PEITHO 2014, TKD 2020 uyumlu",
  last_updated: "2026-04-27",

  patient: {
    age: 54,
    sex: "F",
    weight_kg: 72,
    height_cm: 162,
    chief_complaint:
      "Ameliyattan 3 gün sonra ani başlayan nefes darlığı ve sağ yan ağrısı. 'Nefes alamıyorum, göğsüm yanıyor.'",
    history_items: [
      "Sol kalça artroplastisi (3 gün önce, genel anestezi)",
      "HT (10 yıl, amlodipin)",
      "Obezite (VKİ 27.4)",
      "Sigara (10 paket-yıl, bırakmış)",
    ],
    allergies: [],
    current_medications: ["Amlodipin 5 mg 1x1", "Enoksaparin 40 mg sc (profilaksi, dün son doz)"],
    modifiers: {},
  },

  initial_vitals: {
    hr: 115,
    bp_systolic: 95,
    bp_diastolic: 62,
    spo2: 91,
    temp: 37.2,
    rr: 26,
    pain: 7,
    gcs: 15,
  },

  available_medications: [
    "heparin",
    "enoksaparin",
    "fondaparinuks",
    "alteplase",
    "noradrenalin",
    "dobutamin",
    "morfin",
    "salin_09",
    "ringer_laktat",
    "oksijen",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "ekg_12",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "oksijen_maske",
    "yuksek_akimli_oksijen",
    "stetoskop",
    "eko",
  ],

  start_step_id: "s1_ilk_degerlendirme",

  lab_panels: {
    "pe-cbc-bmp": {
      id: "pe-cbc-bmp",
      name_tr: "Tam Kan Sayımı + Temel Metabolik Panel",
      results: [
        { parameter: "Hemoglobin",  value: 12.8, unit: "g/dL",    reference_range: "12-16",    flag: "L" },
        { parameter: "Hematokrit",  value: 38,   unit: "%",        reference_range: "36-46" },
        { parameter: "Lökosit",     value: 11.2, unit: "×10³/μL", reference_range: "4-10",     flag: "H",
          interpretation: "Reaktif lökositoz — akut pulmoner emboli + stres yanıtı." },
        { parameter: "Trombosit",   value: 235,  unit: "×10³/μL", reference_range: "150-400" },
        { parameter: "Kreatinin",   value: 1.1,  unit: "mg/dL",   reference_range: "0.5-1.1",  flag: "H",
          interpretation: "Üst sınırda — heparin/DOAC dozu ayarı için izle." },
        { parameter: "BUN",         value: 22,   unit: "mg/dL",   reference_range: "7-25" },
        { parameter: "Na⁺",         value: 138,  unit: "mEq/L",   reference_range: "136-145" },
        { parameter: "K⁺",          value: 4.1,  unit: "mEq/L",   reference_range: "3.5-5.0" },
      ],
      comment: "Bazal değerler. Hemoglobin hafif düşük — tromboliz kararında kanama riski faktörü. Kreatinin üst sınırda, DOAC dozu ayarlı.",
    },
    "pe-d-dimer": {
      id: "pe-d-dimer",
      name_tr: "D-Dimer",
      results: [
        { parameter: "D-Dimer", value: 4850, unit: "ng/mL", reference_range: "<500", flag: "HH",
          interpretation: "Post-op dönemde spesifik değil — Wells >4'te tanısal değeri yok, BT kararını etkilemez." },
      ],
      comment: "Belirgin yüksek. Wells yüksek olasılıkta D-dimer negatif prediktif değer taşımaz; post-op dönemde nonspesifik.",
    },
    "pe-cardiac": {
      id: "pe-cardiac",
      name_tr: "Kardiyak Biyobelirteçler",
      results: [
        { parameter: "Troponin I (yüksek duyarlıklı)", value: 0.18, unit: "ng/mL", reference_range: "<0.04", flag: "HH",
          interpretation: "Sağ ventrikül miyosit hasarı — ESC 2019 orta-yüksek risk kriteri." },
        { parameter: "NT-proBNP", value: 850, unit: "pg/mL", reference_range: "<125", flag: "HH",
          interpretation: "RV duvar stresi ve volume yükü. PEITHO giriş kriteri ≥600 pg/mL." },
      ],
      comment: "Troponin + NT-proBNP yüksekliği submasif PE orta-yüksek risk sınıflamasını belirler (ESC 2019 + PEITHO 2014 kriterleri).",
    },
    "pe-abg": {
      id: "pe-abg",
      name_tr: "Arteriyel Kan Gazı",
      results: [
        { parameter: "pH",          value: 7.44, unit: "",       reference_range: "7.35-7.45" },
        { parameter: "pCO₂",        value: 32,   unit: "mmHg",   reference_range: "35-45",      flag: "L",
          interpretation: "Hipokapni — kompensatuar hiperventilasyon (RR 26)." },
        { parameter: "pO₂",         value: 62,   unit: "mmHg",   reference_range: "80-100",     flag: "L",
          interpretation: "Hipoksi — V/Q uyumsuzluğu ve düşük mixed venöz O₂ saturasyonu." },
        { parameter: "HCO₃",        value: 21,   unit: "mEq/L",  reference_range: "22-26",      flag: "L" },
        { parameter: "A-a gradienti", value: "~45 mmHg (artmış)", unit: "", reference_range: "<15", flag: "H",
          interpretation: "Artmış A-a gradienti PE ile uyumlu — şant + V/Q uyumsuzluğu." },
        { parameter: "Laktat",       value: 2.4,  unit: "mmol/L", reference_range: "0.5-2.0",   flag: "H",
          interpretation: "Sınırda yüksek — erken doku hipoperfüzyon işareti." },
      ],
      comment: "Hipoksi + hipokapni + artmış A-a gradienti PE ile uyumlu. Laktat sınırda (hemodinami sınırını yansıtır).",
    },
    "pe-coag": {
      id: "pe-coag",
      name_tr: "Koagülasyon Profili (Bazal)",
      results: [
        { parameter: "PT/INR",      value: 1.1,  unit: "",       reference_range: "<1.2" },
        { parameter: "aPTT",        value: 28,   unit: "sn",     reference_range: "25-35",
          interpretation: "Bazal aPTT — heparin başlamadan önce referans. Hedef tedavi altında 60-80 sn." },
        { parameter: "Fibrinojen",  value: 420,  unit: "mg/dL",  reference_range: "200-400",    flag: "H",
          interpretation: "Hafif yüksek — akut faz tepkisi (cerrahi + PE)." },
      ],
      comment: "Koagülasyon normal — heparin başlamadan önce zorunlu referans. INR ve aPTT tromboliz tartışılacaksa belgelenmeli.",
    },
  },

  result_delay_seconds: {
    "pe-d-dimer": 600,
    "pe-abg": 600,
    "pe-cbc-bmp": 900,
    "pe-cardiac": 900,
    "pe-coag": 900,
  },

  lab_timeline: [
    {
      panel_id: "pe-cardiac",
      at_minute: 60,
      results: [
        { parameter: "Troponin I (yüksek duyarlıklı)", value: 0.22, unit: "ng/mL", reference_range: "<0.04", flag: "HH",
          interpretation: "Troponin artışı: devam eden RV miyokart hasarı. Tedavi eskalasyonu kararını destekler." },
        { parameter: "NT-proBNP", value: 1100, unit: "pg/mL", reference_range: "<125", flag: "HH",
          interpretation: "NT-proBNP artışı: RV yükü artıyor. Yakın izlem kritik." },
      ],
    },
    {
      panel_id: "pe-abg",
      at_minute: 60,
      results: [
        { parameter: "pH",    value: 7.44, unit: "",       reference_range: "7.35-7.45" },
        { parameter: "pCO₂",  value: 32,   unit: "mmHg",   reference_range: "35-45",    flag: "L" },
        { parameter: "pO₂",   value: 65,   unit: "mmHg",   reference_range: "80-100",   flag: "L",
          interpretation: "Oksijen hafif düzeldi (O₂ desteği altında)." },
        { parameter: "Laktat", value: 1.8,  unit: "mmol/L", reference_range: "0.5-2.0",
          interpretation: "Laktat normale döndü — UFH başlangıcı ile birlikte mikrodolaşım kısmi düzelme." },
      ],
    },
  ],

  imaging_results: {
    "bt-pulmoner-anjiyo": {
      id: "bt-pulmoner-anjiyo",
      name_tr: "BT Pulmoner Anjiyografi",
      modality: "ct",
      interpretation:
        "Sağ ana pulmoner arterde ve sol alt lob segmenter dallarda dolum defekti. RV/LV çap oranı 1.05 (sınırda ≥1.0 = sağ kalp yüklenmesi). İVS sola hafif deviasyon. Sol alt lobda periferik kama şeklinde dansite artışı (olası PE infarkta bağlı).",
      findings: [
        "Sağ ana PA + sol alt lob segmenter trombüs",
        "RV/LV çap oranı: 1.05 (sınırda ≥1.0)",
        "İVS hafif sol deviasyon",
        "Sol alt lobda kama şeklinde periferik dansite artışı (olası infarkt)",
      ],
      timestamp_min: 35,
    },
    "yatak-basi-eko": {
      id: "yatak-basi-eko",
      name_tr: "Yatak Başı Ekokardiyografi (TTE)",
      modality: "echo",
      interpretation:
        "McConnell işareti pozitif (RV serbest duvar hipokinezisi, apeks korunmuş — akut PE'ye spesifik). TAPSE 15 mm (sınırda, normal >16 mm). RV hafif dilate. Triküspit yetmezlik jet hızı 3.1 m/s (tahmini RVSP ~48 mmHg). LV EF %60 (korunmuş).",
      findings: [
        "McConnell işareti: pozitif (akut PE'ye spesifik)",
        "TAPSE: 15 mm (sınırda — normal >16 mm)",
        "RV hafif dilate (RV/LV >1.0)",
        "RVSP: ~48 mmHg (pulmoner hipertansiyon)",
        "LV EF: %60 (korunmuş)",
      ],
      timestamp_min: 20,
    },
  },

  steps: [
    // ========================================================
    // ADIM 1 — İlk Değerlendirme
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta acil servise getirildi. Vital bulgular kritik. İlk 2 dakikada yapılması gerekenleri seçin.",
      narrative:
        "Hasta belirgin dispneik, ortopneik pozisyonda. Ajite, soluk görünüm. Sol bacak hafif şiş. SpO₂ 91%, BP 95/62 mmHg.",
      min_actions: 3,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "Doğru — sürekli kardiyak ve SpO₂ monitorizasyonu başlatıldı. Hemodinamik sınır izlenecek.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback: "Doğru — SpO₂ 91%, hipoksi. Hemen oksijen tedavisi gerekiyor.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 15,
          feedback:
            "Doğru — EKG çekildi: taşikardi, sağ kalp strain paterni (S1Q3T3 veya yeni sağ dal bloğu). AMI ekartasyonu için zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "Doğru — sınırda hemodinami, geniş damar yolu şart.",
        },
        {
          action: { type: "use_equipment", target_id: "yuksek_akimli_oksijen" },
          points: 20,
          feedback:
            "Doğru — SpO₂ 91%, hipoksi. Yüksek akımlı oksijen (rezervuarlı maske, 10-15 L/dk) hedef SpO₂ >94%.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback:
            "Kabul edilebilir — ama SpO₂ 91'de yüksek akımlı oksijen (rezervuarlı maske, 10-15 L/dk) tercih edilmeli.",
          max_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "stetoskop" },
          points: 8,
          feedback:
            "Doğru — oskültasyon: plöretik sürtünme sesi ve azalmış solunum sesleri. AMI ve pnömotoraks ayırıcı tanısı için.",
          min_difficulty: 2,
        },
        {
          action: { type: "examine", target_id: "alt_ekstremite" },
          points: 12,
          feedback:
            "Doğru — sol bacak incelemesi: baldırda şişlik, eritem. DVT klinik bulgusu → Wells skorunda +3 puan.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -15,
          feedback:
            "Hatalı — sınırda hipotansiyon zaten var. Morfin vazodilatasyon yaparak hemodinami bozabilir.",
        },
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Şimdilik erken — önce risk sınıflaması ve tromboliz kararı. PE'de UFH tercih edilir (hızlı reversal mümkün).",
          min_difficulty: 2,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu aksiyon kritik ilk dakikalar için öncelik değil. A-B-C, oksijen, IV yol ve EKG önce.",
    },

    // ========================================================
    // ADIM 1b — Tetkik İstemi (Faz 5.5 — lab entegrasyonu)
    // ========================================================
    {
      id: "s1b_orders",
      kind: "action",
      title: "Tetkik İstemi",
      prompt:
        "İlk değerlendirme tamamlandı. Hemodinami sınırda, PE ön tanısı güçlü. Hangi tetkikleri istersiniz?",
      narrative:
        "Hasta monitörize edildi, IV yol açıldı, yüksek akımlı oksijen başlandı. Tetkik istemi aşaması.",
      min_actions: 2,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "pe-abg" },
          points: 20,
          feedback:
            "Doğru — AKG hipoksiyi nesnel gösterir. Artmış A-a gradienti PE ile uyumlu; şiddet değerlendirmesinde kritik.",
        },
        {
          action: { type: "order_test", target_id: "pe-cardiac" },
          points: 25,
          feedback:
            "Doğru — Troponin ve NT-proBNP sağ ventrikül hasarını ve risk sınıflamasını belirler. Submasif PE yönetiminde zorunlu (ESC 2019 orta-yüksek risk kriteri).",
        },
        {
          action: { type: "order_test", target_id: "pe-cbc-bmp" },
          points: 15,
          feedback:
            "Doğru — hemoglobin tromboliz öncesi kanama riski değerlendirmesine, kreatinin heparin dozuna yön verir.",
        },
        {
          action: { type: "order_test", target_id: "pe-coag" },
          points: 15,
          feedback:
            "Doğru — bazal koagülasyon profili heparin başlamadan önce zorunlu referans. INR ve aPTT tromboliz tartışılacaksa belgelenmeli.",
        },
        {
          action: { type: "use_equipment", target_id: "eko" },
          points: 20,
          feedback:
            "Doğru — TTE yatak başı RV fonksiyon değerlendirmesi. McConnell işareti, TAPSE ve RV/LV oranı submasif PE tanısını destekler.",
          min_difficulty: 2,
        },
        {
          action: { type: "order_test", target_id: "pe-d-dimer" },
          points: 0,
          feedback:
            "Tartışmalı — Wells yüksek olasılıkta (>4 puan) D-dimer'ın negatif prediktif değeri yok. Post-op dönemde zaten yüksek olur. BT kararını etkilemez; zaman kaybı sayılabilir. (ESC 2019: Wells >4 → D-dimer atla, direkt BT)",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 10,
          feedback:
            "Doğru — sağ dal bloğu, S1Q3T3 veya sağ aks sapması sağ kalp yüklenmesini destekler. Ayırıcı tanıya katkı.",
          max_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu tetkik pulmoner emboli ilk değerlendirmesinde öncelik değil.",
    },

    // ========================================================
    // ADIM 2 — Wells PE Klinik Olasılık Skoru
    // ========================================================
    {
      id: "s2_wells_skoru",
      kind: "decision",
      title: "Klinik PE Olasılığı — Wells Skoru",
      prompt:
        "Bu hasta için Wells PE skoru hesaplayın ve PE klinik olasılığını belirleyin.",
      narrative:
        "Hasta: post-op 3. gün (hareketsizlik + majör cerrahi), kalp hızı 115/dk, DVT klinik bulgusu sol bacakta, PE başka tanılardan daha olası. Wells kriterleri: PE>diğer (+3), kalp hızı>100 (+1.5), majör cerrahi son 4 hf (+1.5), DVT klinik bulgusu (+3) = Toplam 9 puan.",
      options: [
        {
          id: "opt_yuksek_olasilik",
          text: "Yüksek olasılıklı PE (Wells >4 puan) — doğrudan BT anjiyografi",
          correct: true,
          points: 30,
          feedback:
            "Doğru. Wells skoru: PE>diğer (+3) + kalp hızı>100 (+1.5) + majör cerrahi son 4 hf (+1.5) + DVT klinik bulgusu (+3) = 9 puan → yüksek olasılık. D-dimer atlı, direkt BT anjiyografi. (ESC 2019 class I)",
        },
        {
          id: "opt_orta_olasilik",
          text: "Orta olasılıklı PE (Wells 2-4 puan) — önce D-dimer",
          correct: false,
          points: -15,
          feedback:
            "Hatalı hesaplama. Wells ≥5 bu hastada (cerrahi, taşikardi, DVT bulgusu, PE>diğer). Yüksek olasılıklıda BT anjiyografi direkt yapılır.",
        },
        {
          id: "opt_dusuk_olasilik",
          text: "Düşük olasılıklı PE (Wells <2 puan) — D-dimer yeterli",
          correct: false,
          points: -25,
          feedback:
            "Ciddi hata. Post-op 3. gün, taşikardi, hipoksi, sınırda hipotansiyon ve DVT bulgusu var. Wells kolayca >7.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 2b — Wells Nüansı: D-dimer tuzağı (Seviye 3+)
    // ========================================================
    {
      id: "s2b_ddimer_tuzagi",
      kind: "decision",
      title: "D-Dimer Gönderilmeli Mi?",
      prompt:
        "Asistan hekimden D-dimer isteği geliyor. 'Önce D-dimer çıksın, sonra BT isteriz' diyor. Kararın?",
      min_difficulty: 3,
      options: [
        {
          id: "opt_bt_direkt",
          text: "D-dimer gerek yok — yüksek olasılıklı PE'de BT anjiyografi direkt",
          correct: true,
          points: 20,
          feedback:
            "Doğru. Wells >4'te D-dimer tanısal değer taşımaz, negatif olsa bile PE ekarte edemez. Post-op dönemde D-dimer zaten yüksek olur. BT anjiyografi direkt endike. (ESC 2019 Algoritması)",
        },
        {
          id: "opt_ddimer_iste",
          text: "D-dimer isteyelim, sonucu bekleyelim",
          correct: false,
          points: -15,
          feedback:
            "Hatalı yaklaşım. Yüksek klinik olasılıkta D-dimer değersiz; üstelik post-op dönemde zaten yüksek çıkar. Her geçen dakika risk artıyor.",
        },
      ],
    },

    // ========================================================
    // ADIM 3 — BT PA Anjiyografi Sonucu (info)
    // ========================================================
    {
      id: "s3_bt_sonucu",
      kind: "info",
      title: "BT PA Anjiyografi Sonucu",
      prompt: "BT anjiyografi raporunu inceleyin.",
      content:
        "BT PA ANJİYOGRAFİ RAPORU:\n\nSağ ana pulmoner arterde ve sol alt lob segmenter dallarda dolum defekti. Sağ ventrikül/sol ventrikül çap oranı 1.05 (>1.0 — sağ kalp yüklenmesi, sınırda). İnterventrikular septum sola hafif deviasyon. Sol alt lobda periferik kama şeklinde dansite artışı (olası infarkt alanı).\n\nSONUÇ: Submasif pulmoner emboli (orta-yüksek riskli). Sağ ventrikül yüklenmesi mevcut. Klinik korelasyon: troponin pozitifliği ile birlikte ESC 2019 orta-yüksek risk kriterleri karşılanıyor.",
    },

    // ========================================================
    // ADIM 3b — Submasif PE Tedavi Stratejisi (Faz 5.5)
    // ========================================================
    {
      id: "s3b_risk_stratification",
      kind: "decision",
      title: "Submasif PE'de Tedavi Stratejisi",
      prompt:
        "BT ve EKO sonuçlarına göre bu submasif (orta-yüksek riskli) PE'de hangi tedavi stratejisini seçersiniz?",
      narrative:
        "Troponin 0.18 ng/mL ↑, NT-proBNP 850 pg/mL ↑, TAPSE 15 mm, McConnell işareti pozitif. Sistolik BP 95 mmHg (sınırda korunmuş). BT'de RV/LV 1.05.",
      options: [
        {
          id: "opt_heparin_izle",
          text: "UFH (heparin) başla, yakın izlem — hemodinami bozulursa eskalasyon",
          correct: true,
          points: 35,
          feedback:
            "Doğru. Submasif PE'de ESC 2019 class I: önce antikoagülasyon başla, hemodinami bozulursa trombolize eskalasyon yap. Bu hastada BP sınırda ama henüz şok tanımını karşılamıyor (sistolik >90). Yoğun bakımda yakın izlem zorunlu.",
        },
        {
          id: "opt_sistemik_tromboliz",
          text: "Hemen sistemik tromboliz (alteplaz 100 mg) — RV yüklenmesi var",
          correct: false,
          points: 0,
          feedback:
            "Tartışmalı. PEITHO 2014 (normotansif troponin-pozitif PE, n=1006): tromboliz 7 günlük hemodinamik dekompansasyonu azalttı (%5.6→%2.6), ancak 30 günlük mortaliteyi azaltmadı (%2.4 vs %3.2). Major kanama belirgin arttı (%11.5 vs %2.4). Post-op 3. günde ek kanama riski var. ESC 2019 class IIb — şu an kesin doğru değil.",
        },
        {
          id: "opt_cdth",
          text: "Kateter yönlendirmeli tromboliz (CDTH) — düşük doz, düşük kanama riski",
          correct: false,
          points: 10,
          feedback:
            "Kabul edilebilir seçenek. CDTH kanıt tabanı büyümekte (OPTALYSE, ULTIMA). Kanama riski daha az. Ancak tüm merkezlerde mevcut değil; first-line değil.",
          min_difficulty: 4,
        },
        {
          id: "opt_taburcu",
          text: "DOAC başla, taburcu et — PESI skoru düşükse uygun",
          correct: false,
          points: -25,
          feedback:
            "Ciddi hata. Troponin pozitifliği, RV yüklenmesi ve sınırda hemodinami ile orta-yüksek riskli PE taburcu edilemez. Yatış + yoğun bakım izlemi zorunlu.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 4 — Risk Sınıflaması
    // ========================================================
    {
      id: "s4_risk_siniflamasi",
      kind: "decision",
      title: "PE Risk Sınıflaması",
      prompt: "BT ve klinik bulgulara göre bu hastanın PE risk sınıfı nedir?",
      narrative:
        "Sistolik BP 95 mmHg (sınırda), kalp hızı 115, BT'de sağ ana PA + sol alt lob trombüs, RV/LV 1.05, Troponin 0.18 ↑, NT-proBNP 850 ↑.",
      options: [
        {
          id: "opt_orta_yuksek",
          text: "Orta-yüksek riskli (Submasif) PE — hemodinami korunmuş, troponin/BNP yüksek, RV yüklenmesi",
          correct: true,
          points: 30,
          feedback:
            "Doğru. ESC 2019: sistolik BP ≥90 mmHg ama sağ kalp biyomarkerları (Troponin + NT-proBNP) yüksek + RV disfonksiyon görüntülemede → orta-yüksek riskli (submasif) PE. Bu grupta erken mortalite %3-15. Strateji: antikoagülasyon + yakın izlem, hemodinami bozulursa eskalasyon.",
        },
        {
          id: "opt_yuksek_riskli",
          text: "Yüksek riskli (Masif) PE — hemodinamik instabilite",
          correct: false,
          points: -15,
          feedback:
            "Hatalı. Masif PE tanımı: sistolik BP <90 mmHg veya >40 mmHg ani düşüş. Bu hastada BP 95/62 — masif PE eşiğini karşılamıyor. Orta-yüksek riskli (submasif) daha doğru.",
        },
        {
          id: "opt_dusuk_riskli",
          text: "Düşük riskli PE — PESI skoru düşük, ayaktan tedavi",
          correct: false,
          points: -30,
          feedback:
            "Ağır hata. Troponin pozitifliği ve RV yüklenmesi orta-yüksek risk kriterleri. PESI skoru düşük görünse bile RV yüklenmesi varsa düşük riskli sayılamaz. Bu hasta yatış gerektirir.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 5 — Resüsitasyon ve Antikoagülasyon
    // ========================================================
    {
      id: "s5_resusitasyon",
      kind: "action",
      title: "Resüsitasyon ve Antikoagülasyon",
      prompt:
        "Orta-yüksek riskli PE tanısı kondu. Hemodinamik destek ve antikoagülasyon için aksiyonlarınızı seçin.",
      min_actions: 2,
      max_actions: 5,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "heparin" },
          points: 25,
          feedback:
            "Doğru — PE'de UFH tercih edilir (tromboliz olasılığı açıksa LMWH'ya göre üstün: hızlı reversal, doz titrasyonu). Bolus 80 IU/kg IV, ardından 18 IU/kg/h infüzyon. aPTT hedefi 60-80 sn. (ESC 2019 class I)",
        },
        {
          action: { type: "give_medication", target_id: "noradrenalin" },
          points: 15,
          feedback:
            "Kabul edilebilir — MAP <65 mmHg ise başlanabilir. BP 95/62 ile noradrenalin şimdilik erken sayılabilir; hemodinami kötüleşirse first-line vasopresör. (ESC 2019 class IIa)",
          min_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 5,
          feedback:
            "Dikkatli ol — PE'de sıvı yüklemesi sağ kalp fonksiyonunu bozabilir. Küçük hacim (250-500 mL) deneme yüklemesi kabul edilebilir.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: -5,
          feedback:
            "Dikkat — fazla sıvı sağ ventrikülü gerer ve sol ventrikülü komprese eder. Sıvı yüklemeden kaçın; küçük hacim sınırla. Vasopresör öne çıkar.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "dobutamin" },
          points: 10,
          feedback:
            "Kabul edilebilir — sağ ventrikül inotrop desteği. Hipotansiyon gelişirse noradrenalin öne çıkar. Kombine kullanım düşünülebilir. (ESC 2019 class IIb)",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Uygun değil — tromboliz olasılığı açık olduğundan UFH tercih et. LMWH başlarsan tromboliz güvenliği karmaşıklaşır.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu PE yönetiminde öncelik değil. Heparin, oksijen ve yakın izlem hedefe al.",
    },

    // ========================================================
    // ADIM 5b — Kontrendikasyon Analizi (Seviye 4+)
    // ========================================================
    {
      id: "s5b_kontrendikasyon",
      kind: "decision",
      title: "Tromboliz Kontrendikasyonu Var Mı?",
      prompt:
        "Hemodinami kötüleşirse tromboliz planlanabilir. Kontrendikasyonları değerlendirin.",
      min_difficulty: 4,
      narrative:
        "Hasta 3 gün önce genel anestezi altında majör ortopedik cerrahi geçirdi. İnme öyküsü yok, aktif kanama yok, malignite yok.",
      options: [
        {
          id: "opt_goreli_ki",
          text: "Göreceli kontrendikasyon — son 3 haftada majör cerrahi (fayda/risk değerlendir; submasif PE'de tartışmalı, masif PE'de ağır basar)",
          correct: true,
          points: 25,
          feedback:
            "Doğru. Son 3 haftada majör cerrahi tromboliz için göreceli kontrendikasyon. Submasif PE'de kanıt trombolizi desteklemez (PEITHO 2014). Masif PE gelişirse hemodinamik instabilite kanama riskinden ağır basar. Bu karar belgelenmalı. (ESC 2019)",
        },
        {
          id: "opt_mutlak_ki",
          text: "Mutlak kontrendikasyon — tromboliz kesinlikle yapılamaz",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — mutlak KI: son 2 ay içinde inme, intrakraniyal operasyon, aktif iç kanama, bilinen intrakraniyal tm. Majör ortopedik cerrahi mutlak değil, görecelidir.",
        },
        {
          id: "opt_ki_yok",
          text: "Kontrendikasyon yok — tromboliz planla",
          correct: false,
          points: -10,
          feedback:
            "Yetersiz değerlendirme. Göreceli kontrendikasyon var (post-op 3. gün). Fayda/risk tartılmadan 'kontrendikasyon yok' diyemezsin.",
        },
      ],
    },

    // ========================================================
    // ADIM 6 — Reperfüzyon Stratejisi
    // ========================================================
    {
      id: "s6_tromboliz_karari",
      kind: "decision",
      title: "Reperfüzyon Stratejisi",
      prompt:
        "Submasif PE tanısı netleşti, UFH başlandı. Sistolik BP 96 mmHg (hafif düzelme). Troponin artmaya devam ediyor. Reperfüzyon stratejiniz ne?",
      narrative:
        "Sistolik BP 96 mmHg (UFH sonrası hafif düzelme), SpO₂ 94% (yüksek akımlı O₂ altında). Troponin 0.18→0.22 ng/mL artıyor.",
      options: [
        {
          id: "opt_heparin_izle",
          text: "UFH infüzyon ile yoğun izlem — hemodinami bozulursa eskalasyon",
          correct: true,
          points: 35,
          feedback:
            "Doğru. Submasif PE'de hemodinami korunmuşsa ESC 2019 class I: antikoagülasyon + yakın izlem. PEITHO 2014: normotansif troponin-pozitif PE'de anında trombolizin 30 günlük mortaliteye faydası gösterilemedi; kanama riski (%11.5 vs %2.4) anlamlı artar. Strateji: UFH + YBÜ izlemi, hemodinami bozulursa eskalasyon.",
        },
        {
          id: "opt_sistemik_tromboliz",
          text: "Sistemik tromboliz — Alteplaz 100 mg IV/2 saat",
          correct: false,
          points: 0,
          feedback:
            "Tartışmalı. Submasif PE'de tromboliz ESC 2019 class IIb (zayıf öneri). PEITHO 2014: mortalite faydası yok, major kanama belirgin artıyor. Post-op 3. günde ek kanama riski var. Hemodinami bozulursa (sistolik <90) class I endikasyon gelişir — ama şu an 'yapılabilir ama önerilmez'.",
        },
        {
          id: "opt_cerrahi_embolektomi",
          text: "Acil cerrahi embolektomi",
          correct: false,
          points: -10,
          feedback:
            "Uygun değil. Cerrahi embolektomi tromboliz başarısız veya mutlak KI varsa rezerve tutulur. Submasif PE'de hemodinami korunmuşken cerrahi birinci seçenek değil.",
        },
        {
          id: "opt_kateter_directed",
          text: "Kateter yönlendirmeli tromboliz (CDT)",
          correct: false,
          points: 10,
          feedback:
            "Makul seçenek. CDTH submasif PE'de kanama riski yüksek hastalarda tercih edilebilir. Kanıt büyümekte (OPTALYSE). Ancak tüm merkezlerde mevcut değil; first-line değil.",
          min_difficulty: 4,
        },
      ],
    },

    // ========================================================
    // ADIM 7 — Antikoagülasyon İzlem ve Tedavi
    // ========================================================
    {
      id: "s7_post_tromboliz",
      kind: "action",
      title: "Antikoagülasyon İzlem ve Tedavi",
      prompt:
        "UFH infüzyonu başlandı, yoğun bakıma alındı. Kritik izlem aksiyonlarını seçin.",
      narrative:
        "2 saat sonra: BP 102/68, HR 98, SpO₂ 96%. Hasta daha sakin. Troponin eğrisi izleniyor.",
      min_actions: 3,
      max_actions: 5,
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "aptt_kontrolu" },
          points: 20,
          feedback:
            "Doğru — UFH ile aPTT hedefi 60-80 sn. Terapötik aralık tutturulmazsa tekrar tromboembolik olay riski artar. (ESC 2019 protokolü)",
          min_difficulty: 2,
        },
        {
          action: { type: "examine", target_id: "kanama_degerlendirmesi" },
          points: 15,
          feedback:
            "Doğru — antikoagülasyon altında kanama komplikasyonu birincil risktir. IV bölgeler, GIS kanama bulguları, nörolojik durum izle.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback:
            "Doğru — vital izleme ve kardiyak monitorizasyon devam. BP artışı tedavinin etkinliğini gösterir.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 8,
          feedback:
            "Doğru — SpO₂ >94% hedefi. Gereksiz O₂ hiperoksiye yol açabilir; SpO₂ stabil olunca titrasyona geç.",
        },
        {
          action: { type: "use_equipment", target_id: "eko" },
          points: 15,
          feedback:
            "Doğru — TTE ile RV iyileşmesini değerlendir. TAPSE artışı ve RV dilatasyonunun gerilemesi iyi prognoz işareti.",
          min_difficulty: 3,
        },
        {
          action: { type: "use_equipment", target_id: "foley_sonda" },
          points: -10,
          feedback:
            "Gereksiz ve riskli — antikoagülasyon altında invaziv işlemler kanama riskini artırır. Foley zorunlu endikasyon yoksa takma.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Erken — UFH terapötik olduğu sürece devam et. 24-48 saat sonra stabil hastada DOAC/LMWH geçiş değerlendir.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Antikoagülasyon altında aPTT kontrolü, kanama izlemi ve vital takibi öncelik.",
    },

    // ========================================================
    // ADIM 8 — Uzun Dönem Antikoagülasyon (Seviye 2+)
    // ========================================================
    {
      id: "s8_uzun_donem",
      kind: "decision",
      title: "Uzun Dönem Antikoagülasyon",
      prompt:
        "Hasta stabil, yoğun bakıma alınıyor. Uzun dönem antikoagülasyon planı ne olmalı?",
      min_difficulty: 2,
      narrative:
        "Provokatif risk faktörü: majör cerrahi (geçici, reversible). DVT + PE: 3 ay antikoagülasyon standart.",
      options: [
        {
          id: "opt_3_ay_doac",
          text: "3 ay DOAC (rivaroksaban veya apiksaban) — provokatif PE, geçici risk",
          correct: true,
          points: 25,
          feedback:
            "Doğru. Provokatif PE (majör cerrahi) + geçici risk faktörü → 3 ay antikoagülasyon yeterli. DOAC önerilir (rivaroksaban 15 mg 2x1/3 hf sonra 20 mg 1x1, veya apiksaban 10 mg 2x1/7 gün sonra 5 mg 2x1). VKA artık ikinci seçenek. (ESC 2019 class I)",
        },
        {
          id: "opt_6_ay",
          text: "6 ay antikoagülasyon — semptomlar geçene kadar uzat",
          correct: false,
          points: -5,
          feedback:
            "Kısmen makul ama kanıt 3 ay desteğiyle. Provokatif PE'de 3 ay sonrası uzatma önerilmez. Risk faktörleri kalıcıysa (aktif kanser vb.) uzatma düşünülür.",
        },
        {
          id: "opt_belirsiz_sure",
          text: "Süresiz antikoagülasyon — tekrar riski yüksek",
          correct: false,
          points: -15,
          feedback:
            "Hatalı. Süresiz antikoagülasyon yüksek riskli hastalarda (provokasyon yok, antifosfolipid sendromu, aktif kanser) düşünülür. Bu hastada risk faktörü geçici cerrahi — 3 ay yeterli.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 385,
    passing_score: 230,
    grade_bands: {
      A: 347,
      B: 289,
      C: 230,
      D: 173,
    },
  },

  debrief: {
    key_learnings: [
      "Submasif (orta-yüksek riskli) PE: sistolik BP ≥90 mmHg ama troponin/BNP yüksek + RV yüklenmesi — masif PE'den farklı yönetim",
      "Wells Skoru: PE>diğer (+3) + kalp hızı>100 (+1.5) + majör cerrahi son 4 hf (+1.5) + DVT bulgusu (+3) = 9 puan → yüksek olasılık → D-dimer atla, BT direkt",
      "D-dimer: Wells >4'te değersiz; post-op dönemde zaten yüksek olduğundan tanısal değeri yok",
      "PEITHO 2014 (N=1006): normotansif troponin-pozitif PE'de anında tromboliz mortaliteyi azaltmadı, major kanama belirgin arttı (%11.5 vs %2.4)",
      "Submasif PE yönetimi: UFH + YBÜ izlemi birincil; sistolik BP <90'a düşerse tromboliz eskalasyonu (ESC 2019 class I)",
      "McConnell işareti (RV serbest duvar hipokinezisi + korunmuş apeks) + TAPSE azalması: akut PE'ye spesifik EKO bulguları",
      "Post-op PE'de tromboliz göreceli kontrendikasyon; submasif PE'de fayda kanıtlanmamış — masif PE'de bireysel değerlendir",
      "Provokatif PE (geçici risk faktörü): 3 ay DOAC yeterli, süresiz antikoagülasyon gerekmez",
    ],
    references: [
      "ESC 2019 — Acute Pulmonary Embolism Diagnosis and Management Guidelines",
      "Meyer G et al. — PEITHO Trial (2014) — Fibrinolysis for Intermediate-High Risk PE (N Engl J Med 2014;370:1402)",
      "AHA 2011 — Management of Massive and Submassive Pulmonary Embolism",
      "TKD 2020 — Venöz Tromboembolizm Ulusal Uzlaşı Kılavuzu",
      "Piazza G et al. — OPTALYSE PE Trial (2018) — Catheter-Directed Thrombolysis for Submassive PE",
    ],
    red_flags: [
      "Submasif PE'de erken tromboliz tartışmalı — mortalite faydası yok ama kanama riski belirgin artıyor (PEITHO 2014)",
      "Wells >4'te D-dimer değersiz — post-op dönemde spesifik olmadığından zaman kaybıdır",
      "Hemodinami kötüleşirse (sistolik <90) submasif → masif geçişi: tromboliz artık class I endikasyon",
      "UFH aPTT terapötik aralık dışı → yetersiz antikoagülasyon veya kanama riski",
    ],
    next_scenarios: [
      "acil-kardiyojenik-sok-001",
      "acil-anaflaksi-001",
    ],
  },
};
