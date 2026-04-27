// ============================================================
// MediSim TR — Akut İskemik İnme Senaryosu
// ============================================================
// Klinik referans: 2026 AHA/ASA AIS kılavuzu, TNS 2023,
// ESO 2021 tPA kılavuzu. Faz 5.7 — lab + perfüzyon entegrasyonu.
// Ana öğretim hedefi: kapı-iğne <60 dk paralel iş akışı,
// INR/glukoz sonrası alteplaz/TNK kararı, LVO → bridge EVT,
// post-tromboliz 24 saat antikoagülasyon yasağı (AF bile olsa).
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_iskemik_inme: Scenario = {
  id: "acil-iskemik-inme-001",
  version: "2.0.0",
  title: "72 Yaş Kadın — Ani Gelişen Sağ Hemipleji",
  description:
    "Kahvaltı esnasında sağ kolunu kaldıramamaya başlayan hasta. Konuşmada peltekleşme. İlk tıbbi temasa 90. dakika. AF'li hasta — antikoagülan yok. Kapı-iğne hedefi, paralel iş akışı, LVO yönetimi.",
  specialty: "acil",
  tags: ["inme", "stroke", "tPA", "alteplaz", "tenekteplaz", "nöroloji", "acil", "LVO", "EVT"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 16,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  patient: {
    age: 72,
    sex: "F",
    weight_kg: 68,
    height_cm: 160,
    chief_complaint:
      "90 dakika önce kahvaltıda aniden sağ kolum tutmaz oldu, konuşmam bozuldu.",
    history_items: [
      "Hipertansiyon (10 yıl, amlodipin 10 mg/gün)",
      "Atriyal fibrilasyon (3 yıl — kardiyoloji kontrollerine gitmiyor, antikoagülan başlanmamış)",
      "Tip 2 DM (metformin 1000 mg 2x1)",
      "Sigara öyküsü yok",
    ],
    allergies: [],
    current_medications: ["amlodipin", "metformin"],
    modifiers: {
      bobrek_yetm: false,
      karaciger_yetm: false,
      beta_blocker: false,
    },
  },

  initial_vitals: {
    hr: 96,
    bp_systolic: 178,
    bp_diastolic: 95,
    spo2: 96,
    temp: 36.6,
    rr: 18,
    gcs: 14,
    pain: 0,
  },

  available_medications: [
    "alteplaz",
    "tenekteplaz",
    "aspirin",
    "klopidogrel",
    "labetolol",
    "nikardipin",
    "salin_09",
    "insulin_regular",
    "mannitol",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "iv_kateter",
    "glukometre",
    "oksijen_maske",
    "ekg_cihazi",
    "bt_tarayici",
    "bt_anjiyografi",
    "bt_perfuzyon",
    "nihss_formu",
  ],

  ekg_pattern: "normal",

  lab_panels: {
    "inme-poc-glucose": {
      id: "inme-poc-glucose",
      name_tr: "Acil POC Glukoz",
      collected_at_min: 5,
      results: [
        {
          parameter: "POC Glukoz",
          value: 108,
          unit: "mg/dL",
          reference_range: "70-110",
          interpretation: "Normal — hipoglisemi yok, tromboliz kararını engellemez",
        },
      ],
      comment: "Tromboliz öncesi hipoglisemi/hiperglisemi ekartasyonu zorunlu (AHA/ASA Sınıf I)",
    },
    "inme-cbc-bmp": {
      id: "inme-cbc-bmp",
      name_tr: "TKS + Metabolik Panel",
      collected_at_min: 8,
      results: [
        {
          parameter: "WBC",
          value: 9.2,
          unit: "×10³/μL",
          reference_range: "4-11",
        },
        {
          parameter: "Hgb",
          value: 13.1,
          unit: "g/dL",
          reference_range: "12-16",
        },
        {
          parameter: "Plt",
          value: 198,
          unit: "×10³/μL",
          reference_range: "150-400",
          interpretation: "Trombosit ≥100.000 — tromboliz için uygun",
        },
        {
          parameter: "Glukoz",
          value: 114,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
        },
        {
          parameter: "BUN",
          value: 16,
          unit: "mg/dL",
          reference_range: "7-20",
        },
        {
          parameter: "Kreatinin",
          value: 1.0,
          unit: "mg/dL",
          reference_range: "0.6-1.1",
        },
        {
          parameter: "Na",
          value: 139,
          unit: "mEq/L",
          reference_range: "136-145",
        },
        {
          parameter: "K",
          value: 4.0,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
        },
      ],
      comment: "Plt ≥100.000 ve Cr normal — tromboliz için organik engel yok",
    },
    "inme-coag": {
      id: "inme-coag",
      name_tr: "Koagülasyon Paneli",
      collected_at_min: 8,
      results: [
        {
          parameter: "PT/INR",
          value: 1.1,
          unit: "",
          reference_range: "0.8-1.2",
          interpretation: "Tromboliz uygun — INR <1.7 koşulu sağlandı, antikoagülan etkisi yok",
        },
        {
          parameter: "aPTT",
          value: 27,
          unit: "sn",
          reference_range: "25-35",
        },
        {
          parameter: "Fibrinojen",
          value: 312,
          unit: "mg/dL",
          reference_range: "200-400",
        },
      ],
      comment: "Warfarin yok, DOAC yok — tromboliz için koagülasyon bariyeri yok",
    },
    "inme-cardiac-lipid": {
      id: "inme-cardiac-lipid",
      name_tr: "Kardiyak Markörler + Lipid Profili",
      collected_at_min: 12,
      results: [
        {
          parameter: "Troponin I (hsTnI)",
          value: "<0.04",
          unit: "ng/mL",
          reference_range: "<0.04",
          interpretation: "Normal — AKS ile korelasyon yok, kardiyak emboli profili devam eder",
        },
        {
          parameter: "HbA1c",
          value: 7.8,
          unit: "%",
          reference_range: "<5.7",
          flag: "HH",
          interpretation: "DM kontrolü orta-kötü — sekonder önleme planında ayarlanmalı",
        },
        {
          parameter: "LDL-K",
          value: 145,
          unit: "mg/dL",
          reference_range: "<70",
          flag: "HH",
          interpretation: "İnme sonrası hedef LDL <70 mg/dL — yüksek doz statin başla (AHA/ASA 2026)",
        },
        {
          parameter: "Total Kolesterol",
          value: 218,
          unit: "mg/dL",
          reference_range: "<200",
          flag: "H",
        },
        {
          parameter: "Trigliserit",
          value: 162,
          unit: "mg/dL",
          reference_range: "<150",
          flag: "H",
        },
      ],
      comment: "Acil tromboliz kararı için öncelikli değil; sekonder önleme profili için kritik",
    },
  },

  result_delay_seconds: {
    "inme-poc-glucose": 60,
    "inme-cbc-bmp": 600,
    "inme-coag": 600,
    "inme-cardiac-lipid": 1800,
  },

  lab_timeline: [
    {
      at_minute: 90,
      panel_id: "inme-poc-glucose",
      results: [
        {
          parameter: "POC Glukoz",
          value: 98,
          unit: "mg/dL",
          reference_range: "70-110",
          interpretation: "Stabil — tromboliz infüzyonu süresince normoglisemi korunuyor",
        },
      ],
    },
    {
      at_minute: 240,
      panel_id: "inme-poc-glucose",
      results: [
        {
          parameter: "POC Glukoz",
          value: 105,
          unit: "mg/dL",
          reference_range: "70-110",
          interpretation: "24 saatlik takipte stabil — insülin düzeltmesi gerekmedi",
        },
      ],
    },
  ],

  imaging_results: {
    "bt-kontrastsiz": {
      id: "bt-kontrastsiz",
      name_tr: "Kontrastsız Kraniyal BT",
      modality: "ct",
      interpretation:
        "Akut intrakraniyal kanama yok. Sol MCA sulama alanında erken iskemik değişiklikler. ASPECTS 8 (putamen + insular korteks tutulumu). Hiperdans MCA bulgusu şüpheli (sol).",
      findings: [
        "Akut intrakraniyal kanama: YOK",
        "ASPECTS skoru: 8/10 — putamen ve insular korteks tutulumu",
        "Sol MCA sulama alanında silik sulkal silme",
        "Hiperdans sol MCA bulgusu: şüpheli",
        "Kitle etkisi veya herniasyon: YOK",
        "Ventrikül boyutları normal",
      ],
      timestamp_min: 25,
    },
    "bt-anjiyografi": {
      id: "bt-anjiyografi",
      name_tr: "BT Anjiyografi (Kraniyoservikal)",
      modality: "ct",
      interpretation:
        "Sol MCA M1 segmentinde tam oklüzyon — büyük damar tıkanıklığı (LVO) doğrulandı. İpsilateral İKA ve diğer majör damarlar açık.",
      findings: [
        "Sol MCA M1: TAM OKLÜZYON — LVO+",
        "Sol MCA M2 ve distal: opasifikasyon yok",
        "Sağ MCA ve anterior dolaşım: normal",
        "Sol ve sağ ACA: açık",
        "Baziller arter: açık",
        "İntrakraniyal İKA bilateral: açık",
        "Kolateral akım: orta düzeyde (ASPECTS ile uyumlu)",
      ],
      timestamp_min: 32,
    },
    "bt-perfuzyon": {
      id: "bt-perfuzyon",
      name_tr: "BT Perfüzyon (CTP)",
      modality: "ct",
      interpretation:
        "Sol MCA sulama alanında geniş penumbra, küçük infarkt çekirdeği. Mismatch oranı 4.7 — tromboliz ve EVT için güçlü perfüzyon profili.",
      findings: [
        "İnfarkt çekirdeği (rCBF <30%): ~18 mL",
        "Penumbra (Tmax >6 sn): ~85 mL",
        "Mismatch oranı: 4.7 — kurtarılabilir doku dominant",
        "CBF/CBV eşleşmesi: akut iskemik penumbra paterni",
        "Lüksüs perfüzyon veya erken reperfüzyon: YOK",
      ],
      timestamp_min: 40,
    },
  },

  start_step_id: "step-1",

  steps: [
    // ===== ADIM 1: İlk değerlendirme =====
    {
      id: "step-1",
      kind: "action",
      title: "İlk değerlendirme ve vital stabilizasyon",
      prompt:
        "Hasta acile geldi, son normal görüldüğü zaman 90 dakika önce. İlk 10 dakikada ne yaparsın?",
      min_actions: 3,
      default_wrong_penalty: -5,
      default_wrong_feedback: "Akut inmede bu aksiyon ilk 10 dakikanın önceliği değil.",
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Monitörizasyon, aritmi takibi ve AF ritminin belgelenmesi için şart.",
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 15,
          feedback:
            "Hipoglisemi inmeyi taklit eder — KŞ <60 ise tedavi ilk öncelik. Rehber: inme değerlendirmesinde glukoz zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter" },
          points: 10,
          feedback: "İki geniş lümenli IV yol (tPA + sıvı + acil ilaç).",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 5,
          feedback: "SpO2 >%94 hedefli. Rutin oksijen önerilmez.",
        },
        {
          action: { type: "examine", target_id: "nihss" },
          points: 20,
          feedback:
            "NIHSS hem tanı hem tedavi kararı için zorunlu (AHA/ASA Sınıf I). Kapı-NIHSS hedef <10 dakika.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: -5,
          feedback:
            "SpO2 %96 — rutin oksijen önerilmez. %94 eşiği altında uygulanır.",
          min_difficulty: 3,
        },
      ],
    },

    // ===== YENİ: s2b_rapid_orders — paralel lab =====
    {
      id: "s2b_rapid_orders",
      kind: "action",
      title: "Paralel lab siparişleri — kapı-iğne yarışı",
      prompt:
        "NIHSS 14. Tromboliz uygunluğu için hangi tetkikleri PARALEL olarak sipariş edersin? Kan alımı BT'ye giderken yapılır — zamandan kazan.",
      min_actions: 2,
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu aksiyon tromboliz iş akışında öncelikli değil — kapı-iğne süresini uzatır.",
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "inme-poc-glucose" },
          points: 20,
          feedback:
            "✓ POC glukoz 1 dakikada sonuç. Tromboliz kararı öncesi zorunlu (AHA/ASA Sınıf I) — hipoglisemi ekartasyonu.",
        },
        {
          action: { type: "order_test", target_id: "inme-coag" },
          points: 35,
          feedback:
            "✓ INR ve aPTT KRİTİK. Antikoagülan öyküsü belirsiz hastalarda tromboliz kararı öncesi zorunlu — INR >1.7 ise tromboliz kontrendike.",
        },
        {
          action: { type: "order_test", target_id: "inme-cbc-bmp" },
          points: 20,
          feedback:
            "✓ Platelet ve metabolik taban değeri gerekli. Plt <100.000 tromboliz kontrendike.",
        },
        {
          action: { type: "order_test", target_id: "inme-cardiac-lipid" },
          points: 15,
          feedback:
            "✓ Kardiyak markörler + sekonder önleme profili. Acil karar için değil; erken sipariş sonucu tPA sonrası hazır eder.",
          min_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "ekg_cihazi" },
          points: 15,
          feedback:
            "✓ EKG: AF ritmini belgele, kardiyak emboli kaynağını dokümante et. Kan alımıyla paralel yapılabilir.",
        },
        {
          action: { type: "give_medication", target_id: "alteplaz" },
          points: -30,
          feedback:
            "✗ KRİTİK: INR ve glukoz sonucu beklemeden tromboliz verilemez. Sonuç bekleme süresi çok kısa — önce tetkikleri al.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: -20,
          feedback:
            "✗ Tromboliz planı varken aspirin önce verilmez. Aspirin trombolizi geciktirir, yetersiz tedavi olur.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 2: BT kararı =====
    {
      id: "step-2",
      kind: "decision",
      title: "NIHSS: 14. Sonraki kritik görüntüleme?",
      prompt:
        "NIHSS 14 (orta-ciddi). Dizartri, sağ üst ekstremite 2/5, sağ alt 3/5, sağ homonim hemianopi. KŞ 108 mg/dL. İlk 20 dakikada hangi görüntüleme mutlaka yapılmalı?",
      options: [
        {
          id: "opt-bt",
          text: "Kontrastsız beyin BT (+ eş zamanlı BTA)",
          correct: true,
          points: 25,
          feedback:
            "✓ Doğru. Kontrastsız BT kanamayı ekarte eder (Sınıf I). LVO şüphesinde BTA ile paralel çekmek standart — ayrı sefer gerekmez.",
        },
        {
          id: "opt-mr",
          text: "Beyin MR (DWI)",
          correct: false,
          points: -5,
          feedback:
            "MR duyarlılık yüksek ama süreyi uzatır. İlk adım BT — zaman beyindir.",
        },
        {
          id: "opt-ct-angio",
          text: "BT anjiyografi (önce, kontrastsız BT atlayarak)",
          correct: false,
          points: -3,
          feedback:
            "BTA kanama ekartasyonu yapmaz — önce kontrastsız BT zorunlu. İkisi paralel çekilebilir ama kontrastsız BT ilk.",
          min_difficulty: 3,
        },
        {
          id: "opt-eeg",
          text: "EEG",
          correct: false,
          points: -10,
          feedback:
            "İnmenin akut yönetiminde EEG yer almaz. Postiktal dönem şüphesinde kullanılır.",
        },
      ],
    },

    // ===== ADIM 3: BT + BTA + CTP sonuçları =====
    {
      id: "step-3",
      kind: "info",
      title: "BT + BTA + CTP sonuçları",
      prompt: "",
      content:
        "Kontrastsız BT: Akut kanama YOK. ASPECTS 8. BT Anjiyografi: Sol MCA M1 TAM OKLÜZYON (LVO+). BT Perfüzyon: Çekirdek 18 mL / Penumbra 85 mL / Mismatch 4.7. INR: 1.1. Plt: 198.000. KŞ: 108 mg/dL. Semptom başlangıcından 110 dakika, kapıdan 20 dakika geçti.",
    },

    // ===== YENİ: s3b_thrombolysis_decision =====
    {
      id: "s3b_thrombolysis_decision",
      kind: "decision",
      title: "Tromboliz kararı — INR 1.1, LVO+, pencere 110 dk",
      prompt:
        "BT'de kanama yok. INR 1.1, Plt 198.000, KŞ 108 mg/dL. Antikoagülan öyküsü yok. NIHSS 14 + sol MCA M1 LVO. Tromboliz verir misiniz?",
      options: [
        {
          id: "opt-alteplaz",
          text: "IV Alteplaz 0.9 mg/kg (maks 90 mg) — %10 bolus + %90 60 dk infüzyon",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. Tüm kontrendikasyonlar ekarte: kanama yok, INR 1.1, Plt ≥100K, KŞ normal, pencere 110 dk (<4.5 saat). Alteplaz AHA/ASA 2026 Sınıf I-A.",
        },
        {
          id: "opt-tnk",
          text: "IV Tenekteplaz 0.25 mg/kg (maks 25 mg) — tek IV bolus",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. Tenekteplaz AHA/ASA 2026 Sınıf I-B alternatif. Tek bolus — operasyonel avantaj, kapı-iğne süresini kısaltır. LVO varlığında alteplaza üstünlüğü araştırılıyor.",
        },
        {
          id: "opt-bekle-bp",
          text: "TA 178/95 — <185/110 zaten iyi, tromboliz zorunlu değil",
          correct: false,
          points: -20,
          feedback:
            "✗ YANLIŞ. BP <185/110 tromboliz öncesi ön koşul, erteleme gerekçesi değil. NIHSS 14 + LVO → tromboliz Sınıf I endikasyon. Gecikme kötü prognoz.",
        },
        {
          id: "opt-heparin",
          text: "IV Heparin infüzyon başla — AF için antikoagülasyon",
          correct: false,
          points: -25,
          feedback:
            "✗ Heparin akut inme trombolizinin yerini tutmaz. AF kökenli emboli olsa bile akut heparin önerilmez — kanama riski ve trombolize engel. Antikoagülasyon 24 saat sonra değerlendirilir.",
          critical: true,
        },
        {
          id: "opt-aspirin-bekle",
          text: "Aspirin 300 mg ver, tromboliz kararını geç",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. Aspirin trombolizin yerine geçemez; kararı geciktirmek ciddi beyin hasarına yol açar. NIHSS 14 + LVO + uygun hasta → tPA Sınıf I.",
          critical: true,
        },
        {
          id: "opt-direkt-evt",
          text: "Tromboliz yapma — doğrudan EVT'ye yönlendir",
          correct: false,
          points: -15,
          feedback:
            "✗ M1 LVO + uygun pencere + uygun hasta → bridge strateji (tPA + EVT) üstündür. tPA atlamak AHA/ASA 2026 Sınıf III (harm) için güçlü kanıt yok — ancak bridge strateji tercih edilmeli.",
        },
      ],
    },

    // ===== YENİ: s4b_lvo_decision =====
    {
      id: "s4b_lvo_decision",
      kind: "decision",
      title: "LVO yönetimi — EVT planı",
      prompt:
        "Alteplaz infüzyonu başlandı. BTA: Sol MCA M1 tam oklüzyon (LVO+). Büyük damar tıkanıklığı için sıradaki kritik adım nedir?",
      options: [
        {
          id: "opt-evt-konsultasyon",
          text: "Nöroradyoloji / girişimsel nöroloji aktivasyonu — mekanik trombektomi",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. M1 oklüzyon + NIHSS ≥6 + mismatch oranı 4.7 → EVT Sınıf I (HERMES 2016). tPA infüzyon sürerken paralel EVT aktivasyonu — bridge strateji. Her dakika beyin dokusu.",
        },
        {
          id: "opt-sadece-tpa",
          text: "tPA verildi, EVT planı yok — sonucu bekle",
          correct: false,
          points: -15,
          feedback:
            "✗ M1 oklüzyonunda tPA tek başına %30-40 rekanalizasyon sağlar. M1 LVO → EVT Sınıf I; tPA + EVT kombinasyonu üstündür. Bekleme kötü prognoz.",
        },
        {
          id: "opt-evt-gec",
          text: "EVT'yi geç pencereye (6-24 saat) bırak, şimdi tPA yeterli",
          correct: false,
          points: -20,
          feedback:
            "✗ Geç pencere EVT, erken EVT imkânı olmayan durumlar içindir. Erken aktivasyon mümkünken gecikme kabul edilemez.",
        },
        {
          id: "opt-heparin-bridge",
          text: "Heparin infüzyon başla — AF kökenli tıkanıklık için köprü",
          correct: false,
          points: -25,
          feedback:
            "✗ Tromboliz sonrası ilk 24 saatte heparin KONTRENDİKE — hemorajik dönüşüm riski yüksek. AF antikoagülasyonu 24 saat BT kontrolü sonrası başlanır.",
          critical: true,
        },
        {
          id: "opt-medikal",
          text: "Medikal yönetim, girişimsel plan yok",
          correct: false,
          points: -25,
          feedback:
            "✗ M1 LVO + NIHSS 14 + uygun perfüzyon profili → EVT Sınıf I. Medikal yönetimle yetinmek rehber dışıdır.",
        },
      ],
    },

    // ===== YENİ: s5b_bp_management =====
    {
      id: "s5b_bp_management",
      kind: "action",
      title: "Post-tromboliz kan basıncı yönetimi",
      prompt:
        "Alteplaz infüzyonu devam ediyor. Kontrol ölçümü: 188/100 mmHg. Post-tromboliz hedef BP <180/105 — hedef aşıldı. Ne yaparsın?",
      min_actions: 1,
      default_wrong_penalty: -5,
      default_wrong_feedback: "Post-tromboliz BP yönetiminde bu aksiyon önerilmez.",
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "labetolol" },
          points: 28,
          feedback:
            "✓ Post-tromboliz hedef <180/105. IV Labetolol 10 mg bolus, gerekirse tekrarlayan doz ile titre et. (AHA/ASA Sınıf I)",
        },
        {
          action: { type: "give_medication", target_id: "nikardipin" },
          points: 24,
          feedback:
            "✓ IV Nikardipin 5 mg/saat başla, titre et. Labetolola etkili alternatif (beta-bloker kontrendike ise tercih).",
        },
        {
          action: { type: "use_equipment", target_id: "tansiyon_aleti" },
          points: 10,
          feedback:
            "✓ Post-tromboliz BP monitörizasyonu zorunlu: ilk 2 saat her 15 dk, sonraki 6 saat her 30 dk.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 8,
          feedback:
            "✓ Sürekli kardiyak monitorizasyon — aritmi ve hemodinamik izlem için.",
        },
        {
          action: { type: "examine", target_id: "nihss" },
          points: 5,
          feedback:
            "✓ Seri NIHSS — erken nörolojik kötüleşme veya hemoraji belirtisi. Post-tromboliz ilk saatlerde kritik.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "mannitol" },
          points: -10,
          feedback:
            "Mannitol BP düşürmez; beyin ödemi tedavisi içindir. Herniasyon bulgusu yok.",
        },
      ],
    },

    // ===== ADIM 6 — Sadece zorluk 4 =====
    {
      id: "step-6",
      kind: "decision",
      title: "EVT sonrası reperfüzyon yönetimi",
      prompt:
        "Mekanik trombektomi başarılı (TICI 2b). Hastanın 24 saat izleminde en kritik 4 husus nedir?",
      min_difficulty: 4,
      allow_multiple: true,
      partial_credit: true,
      options: [
        {
          id: "opt-ta",
          text: "Kan basıncı <180/105, dalgalanmayı önle",
          correct: true,
          points: 15,
          feedback: "✓ Reperfüzyon hemorajisini sıkı TA kontrolü azaltır.",
        },
        {
          id: "opt-nihss",
          text: "Seri NIHSS takibi (her saat ilk 8 saat)",
          correct: true,
          points: 15,
          feedback:
            "✓ Erken nörolojik kötüleşme rekanalizasyon kaybı veya hemoraji işaretidir.",
        },
        {
          id: "opt-bt-24",
          text: "24. saat kontrol BT — hemorajik dönüşümü ekarte et",
          correct: true,
          points: 10,
          feedback:
            "✓ Antitrombotik başlamadan önce hemorajik dönüşüm ekartasyonu zorunlu. AF antikoagülasyonu da bu BT'ye göre planlanır.",
        },
        {
          id: "opt-antikoagulan-24",
          text: "24. saat BT temizse AF için antikoagülasyona başla",
          correct: true,
          points: 15,
          feedback:
            "✓ Tromboliz / EVT sonrası 24 saat antikoagülasyon yasağı. BT'de kanama yoksa 24 saat sonunda DOAC başlanabilir. (AHA/ASA 2026 Sınıf IIa)",
        },
        {
          id: "opt-trombolitik",
          text: "EVT sonrası IV tPA ver",
          correct: false,
          points: -10,
          feedback:
            "✗ Başarılı EVT sonrası ek tromboliz rutin önerilmez — kanama riski artırır.",
        },
        {
          id: "opt-heparin-hemen",
          text: "Hemen heparin infüzyon başla (AF için)",
          correct: false,
          points: -15,
          feedback:
            "✗ Tromboliz / EVT sonrası ilk 24 saat antikoagülasyon KONTRENDİKE. 24 saat bekle, BT kontrol et, sonra DOAC başla.",
          critical: true,
        },
      ],
    },
  ],

  scoring: {
    max_points: 355,
    passing_score: 213,
    grade_bands: {
      A: 320,
      B: 266,
      C: 213,
      D: 160,
    },
    time_bonus: {
      target_seconds: 600,
      bonus_points: 10,
    },
  },

  debrief: {
    key_learnings: [
      "Kapı-iğne (door-to-needle) hedefi ≤60 dakika — paralel iş akışı zorunlu: NIHSS, kan alma, BT ve tPA hazırlık eş zamanlı yapılır.",
      "Tromboliz öncesi zorunlu kontroller: POC glukoz, INR, trombosit. Yalnızca bu üç parametre güvenle doğrulanırsa tPA verilir.",
      "INR 1.1, Plt ≥100K, KŞ 70-400 mg/dL, kanama yok, pencere <4.5 saat → alteplaz veya tenekteplaz Sınıf I endikasyon.",
      "Büyük damar tıkanıklığı (M1/İKA/baziller) + tPA uygun pencere → bridge strateji: tPA + EVT. Sadece tPA veya sadece EVT inferior.",
      "TIPA / EVT sonrası ilk 24 saat antikoagülasyon KONTRENDİKE — hemorajik dönüşüm riski. AF olsa bile bekle; 24. saat BT'de kanama yoksa DOAC başla.",
      "Post-tromboliz BP hedefi <180/105 (tromboliz öncesi <185/110'dan daha sıkı). IV labetolol veya nikardipin tercih.",
      "BT perfüzyon mismatch 4.7 (çekirdek 18 mL, penumbra 85 mL) → kurtarılabilir doku dominant; EVT için güçlü endikasyon.",
      "Tenekteplaz 0.25 mg/kg tek IV bolus — alteplaz 60 dk infüzyona alternatif, operasyonel avantaj (AHA/ASA 2026 Sınıf I-B).",
    ],
    references: [
      "2026 AHA/ASA Akut İskemik İnme Erken Yönetim Kılavuzu",
      "Türk Nöroloji Derneği — İnme Tanı ve Tedavi Rehberi 2023",
      "ESO 2021 Guidelines — Intravenous Thrombolysis",
      "HERMES meta-analizi (Lancet 2016) — EVT kanıt temeli",
      "NOR-TEST 2 (2022) — Tenekteplaz vs Alteplaz LVO subgrup analizi",
    ],
    red_flags: [
      "Son normal görülme >4.5 saat ise kör şekilde tPA verme — perfüzyon görüntüleme kararı değiştirebilir (wake-up stroke / geç pencere protokolü).",
      "DOAC son dozu ≤48 saat → tromboliz kontrendike; ancak EVT hâlâ uygun.",
      "INR >1.7 (warfarin), Plt <100.000 → tromboliz kontrendike.",
      "Bilinen intrakraniyal neoplazm, son 3 ay içinde baş travması veya inme → tPA yasak.",
      "Kan şekeri <50 mg/dL veya >400 mg/dL → düzeltmeden değerlendirme yanıltıcı.",
      "Tromboliz / EVT sonrası ilk 24 saat: heparin, warfarin, DOAC başlama — hemorajik dönüşüm. AF için antikoagülasyon 24. saat BT temizse planlanır.",
    ],
    next_scenarios: ["dahi-dka-001"],
  },
};
