// ============================================================
// MediSim TR — Sepsis Tanıma ve Hemşirelik Bakımı
// ============================================================
// Klinik referans: Surviving Sepsis Campaign 2021 (Evans et al.),
// NEWS2 — RCP UK 2017, qSOFA — Sepsis-3 Singer 2016,
// SBAR — Joint Commission 2018, TYBHD Sepsis Bakım Rehberi.
// Faz 5.9 — lab entegrasyonu + senaryo modernizasyonu (3→6 adım).
// Ana öğretim hedefi (hemşirelik özel): erken uyarı (NEWS2/qSOFA),
// SBAR eskalasyonu, bundle uygulaması, lab yorumlama + raporlama,
// KBY'de sıvı izlemi. Lab "isteme" puanı düşük, "yorumlama +
// raporlama" puanı yüksek — hemşirelik ayırt edici özelliği.
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_sepsis_hemsirelik: Scenario = {
  id: "hemsirelik-sepsis-001",
  version: "2.0.0",
  title: "70 Yaş Kadın — Serviste Ani Kötüleşme",
  description:
    "Dahiliye servisinde yatan yaşlı hasta, hemşire vizitinde ajite ve konfüze bulunuyor. KBY 3a + DM + penisilin alerjisi. NEWS2/qSOFA → SBAR eskalasyonu → SSC 2021 Hour-1 bundle → KBY sıvı izlemi → vazopressör kararı.",
  specialty: "hemsirelik",
  tags: ["sepsis", "q-sofa", "news2", "hemşirelik", "bundle", "sbar", "eskalasyon", "kby", "sıvı"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  patient: {
    age: 70,
    sex: "F",
    weight_kg: 62,
    height_cm: 155,
    chief_complaint:
      "Dahiliye servisi, yatış 3. günü. Üriner enfeksiyon nedeniyle yatıyor. Hemşire vizitinde ajite ve bilinç bulanıklığı fark etti.",
    history_items: [
      "Üriner sistem enfeksiyonu — 3 gündür IV antibiyotik (seftriakson 2 g/gün)",
      "Tip 2 DM (insülin glargin)",
      "KBY Evre 3a (baseline Cr 1.4 mg/dL)",
      "KOAH hafif (kontrollü)",
      "Yatış önceki bilinç: tam açık — bu değişim YENİ",
    ],
    allergies: ["Penisilin alerjisi (döküntü öyküsü — 10 yıl önce)"],
    current_medications: [
      "Seftriakson 2 g/gün IV (aktif sepsis tedavisi)",
      "İnsülin glargin 18 Ü gece",
      "Enalapril 5 mg/gün",
      "Furosemid 40 mg/gün",
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
    "stetoskop",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  // ⚠️ Hemşirelik perspektifi: Penisilin alerjisi kritik → pip-tazo KONTRENDİKE.
  // KBY 3a + yaşlı → sıvı aşırı yüklenme riski. Lab isteme = düşük puan,
  // lab yorumlama + SBAR raporlama = yüksek puan.

  lab_panels: {
    "sh-lactate": {
      id: "sh-lactate",
      name_tr: "Serum Laktat (POC)",
      collected_at_min: 5,
      results: [
        {
          parameter: "Serum Laktat",
          value: 4.2,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation:
            "Laktat ≥4 mmol/L → perfüzyon bozukluğu. SSC 2021: Sepsis Hour-1 Bundle — 30 mL/kg kristaloid, vazopressör hazırlığı. 2. saat klirens ölçümü planla.",
        },
      ],
      comment: "POC laktat — sepsis şiddet sınıflaması ve sıvı/vazopressör kararında kritik",
    },
    "sh-cbc-diff": {
      id: "sh-cbc-diff",
      name_tr: "TKS + Diferansiyel",
      collected_at_min: 8,
      results: [
        {
          parameter: "WBC",
          value: 18.5,
          unit: "×10³/μL",
          reference_range: "4-11",
          flag: "HH",
          interpretation: "Belirgin lökositoz — bakteriyel enfeksiyon uyumlu",
        },
        {
          parameter: "Bant (immatür nötrofil)",
          value: 14,
          unit: "%",
          reference_range: "<5",
          flag: "HH",
          interpretation: "Sola kayma — aktif bakteriyel süreç, kemik iliği uyarısı",
        },
        {
          parameter: "Nötrofil",
          value: 82,
          unit: "%",
          reference_range: "50-70",
          flag: "H",
        },
        {
          parameter: "Hgb",
          value: 11.2,
          unit: "g/dL",
          reference_range: "12-16",
          flag: "L",
          interpretation: "Kronik hastalık anemisi — KBY zemininde",
        },
        {
          parameter: "Plt",
          value: 165,
          unit: "×10³/μL",
          reference_range: "150-400",
          interpretation: "Alt sınırda — sepsis ile DIC gelişimi izle, seri ölçüm öner",
        },
      ],
      comment:
        "WBC 18.5k + bant %14 (sola kayma) → aktif bakteriyel sepsis. Trombosit düşüşü DIC habercisi olabilir.",
    },
    "sh-bmp-cr": {
      id: "sh-bmp-cr",
      name_tr: "BMP + Kreatinin",
      collected_at_min: 8,
      results: [
        {
          parameter: "Kreatinin",
          value: 1.8,
          unit: "mg/dL",
          reference_range: "0.6-1.1",
          flag: "HH",
          interpretation:
            "Baseline Cr 1.4'ten 1.8'e yükseliş → AKI on CKD. Sepsis kaynaklı prerenal/renal AKI. Sıvı ve ilaç doz ayarı gerekli.",
        },
        {
          parameter: "BUN",
          value: 34,
          unit: "mg/dL",
          reference_range: "7-20",
          flag: "H",
        },
        {
          parameter: "K",
          value: 4.8,
          unit: "mEq/L",
          reference_range: "3.5-5.0",
          interpretation: "Üst sınırda — KBY + AKI + ACE inhibitörü → hiperkalemi takibi zorunlu",
        },
        {
          parameter: "Na",
          value: 135,
          unit: "mEq/L",
          reference_range: "136-145",
          flag: "L",
        },
        {
          parameter: "HCO3",
          value: 18,
          unit: "mEq/L",
          reference_range: "22-26",
          flag: "L",
          interpretation: "Metabolik asidoz — laktat yüksekliği + AKI kombinasyonu",
        },
        {
          parameter: "Glukoz",
          value: 245,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "HH",
          interpretation: "Stres hiperglisemisi + DM zemini. İnsülin titrasyonu planla (hedef 140-180 mg/dL YBÜ).",
        },
        {
          parameter: "Cl",
          value: 103,
          unit: "mEq/L",
          reference_range: "98-107",
        },
      ],
      comment:
        "AKI on CKD: Cr 1.4 → 1.8. Meropenem dozu ayarı: eGFR hesapla. Furosemid devam/doz kararı hekim değerlendirmesinde.",
    },
    "sh-blood-culture": {
      id: "sh-blood-culture",
      name_tr: "Kan Kültürü (2 Set)",
      collected_at_min: 12,
      results: [
        {
          parameter: "Kan Kültürü Set 1",
          value: "Örnek alındı",
          unit: "",
          interpretation:
            "Antibiyotik ÖNCE alındı ✓ — kültür pozitiflik oranını korur. Sonuç 24-48 saat (eğitim modu: 30 dk).",
        },
        {
          parameter: "Kan Kültürü Set 2",
          value: "Örnek alındı",
          unit: "",
          interpretation: "Farklı venöz yoldan 2. set — kontaminasyonu ekarte için zorunlu.",
        },
      ],
      comment:
        "⚠️ Eğitici: Kan kültürü antibiyotik ÖNCE alınmalı. Her 1 saatlik antibiyotik gecikmesi kan kültürü pozitifliğini %10-15 azaltır. 2 set = altın standart.",
    },
    "sh-urine-culture": {
      id: "sh-urine-culture",
      name_tr: "İdrar Tahlili + Kültür",
      collected_at_min: 15,
      results: [
        {
          parameter: "İdrar Lökosit",
          value: "+++",
          unit: "",
          reference_range: "Negatif",
          flag: "HH",
          interpretation: "Ciddi piyüri — üriner enfeksiyon güçlü kanıtı",
        },
        {
          parameter: "İdrar Nitrit",
          value: "Pozitif",
          unit: "",
          reference_range: "Negatif",
          flag: "H",
          interpretation: "Gram-negatif bakteri (Enterobacteriaceae) uyumlu — E.coli, Klebsiella olası",
        },
        {
          parameter: "İdrar Eritrosit",
          value: "+",
          unit: "",
          reference_range: "Negatif",
        },
        {
          parameter: "İdrar Kültürü",
          value: "Bekleniyor",
          unit: "",
          interpretation:
            "Ön sonuç 24-48 saat (eğitim modu: 30 dk) → E.coli üremesi bekleniyor. Üriner sepsis kaynağı doğrulanacak.",
        },
      ],
      comment:
        "Lökosit+++ / Nitrit+ = üriner kaynaklı sepsis klinisyeni ve mikrobiyologu için güçlü ön gösterge. Kültür antibiyogram ile tedaviyi optimize eder.",
    },
  },

  result_delay_seconds: {
    "sh-lactate": 600,
    "sh-cbc-diff": 900,
    "sh-bmp-cr": 900,
    "sh-blood-culture": 1800,
    "sh-urine-culture": 1800,
  },

  lab_timeline: [
    {
      at_minute: 60,
      panel_id: "sh-lactate",
      results: [
        {
          parameter: "Serum Laktat",
          value: 2.8,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "H",
          interpretation:
            "Hour-1 bundle yanıtı: 4.2 → 2.8 (klirens %33). Kısmi düzelme, ancak MAP sınırda — vazopressör kararı yaklaşıyor. 2. saat takip laktat hedefi <2.0.",
        },
      ],
    },
    {
      at_minute: 120,
      panel_id: "sh-lactate",
      results: [
        {
          parameter: "Serum Laktat",
          value: 1.9,
          unit: "mmol/L",
          reference_range: "<2.0",
          interpretation:
            "Norepinefrin + sıvı kombinasyonu ile perfüzyon normalize oldu. Laktat <2.0 hedefi sağlandı — klirens %55. Klinik stabilizasyon.",
        },
      ],
    },
  ],

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
        "Hasta konfüze, soluğu hızlı, terlemiş. Vitalleri normal değil. Hemşire erken müdahaleyle sepsis mortalitesini anlamlı azaltabilir.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "✓ Sürekli monitörizasyon başladı. HR 118, TA 88/54, SpO₂ %93, SS 24. q-SOFA: SS≥22 (1) + GCS<15 (1) + SBP≤100 (1) = 3 — SEPSIS ŞÜPHESİ YÜKSEK.",
        },
        {
          action: { type: "examine", target_id: "bilinc_degerlendirmesi" },
          points: 15,
          feedback:
            "✓ Bilinç değişimi: GCS 12 (yatışta tam açık → YENİ kötüleşme). qSOFA bileşeni 1: konfüzyon. NEWS2 bilinç puanı: ACVPU = C (Confusion) = 3 puan.",
        },
        {
          action: { type: "consult", target_id: "doktor" },
          points: 20,
          feedback:
            "✓ Hekimi hemen çağır — hemşirenin birincil görevi. ISBAR iletişimi: Kimlik-Durum-Geçmiş-Değerlendirme-Öneri yapısıyla bildir. Gecikme = kötü prognoz.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback:
            "✓ SpO₂ %93 → O₂ destek başla. SSC 2021: SpO₂ ≥94 hedef. Yüksek akım maske uygun.",
          vitals_change: { spo2: 96 },
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 8,
          feedback:
            "✓ Kan şekeri ölçümü. DM + konfüzyon → hipoglisemi ayırıcı tanı. Hiperglisemi de sepsis belirtisi. Glukoz 245 mg/dL — stres + DM.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Erken sepsis tanımada bu adım öncelik değil.",
    },

    // ====================================================
    // YENİ ADIM 1b — NEWS2 / qSOFA hesaplama
    // ====================================================
    {
      id: "s1b_news2_qsofa",
      kind: "decision",
      title: "NEWS2 / qSOFA Skoru ve Alarm Seviyesi",
      prompt:
        "Vitaller: HR 118, TA 88/54, SpO₂ %93, Ateş 38.8°C, SS 24, GCS 12. Bu hastanın NEWS2 ve qSOFA skoru nedir, alarm seviyesi ve beklenen aksiyon ne olmalı?",
      options: [
        {
          id: "opt_dogru_skor",
          text: "NEWS2 ≥9, qSOFA 3 — KIRMIZI ALARM: Kritik bakım ekibi / hekim ACİL çağrısı",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. qSOFA = 3/3: SS 24 ≥22 (+1) + GCS 12 <15 (+1) + SBP 88 ≤100 (+1). NEWS2: SS 24 (+2) + SpO2 93 (+2) + SBP 88 (+3) + HR 118 (+2) + Ateş 38.8 (+1) + ACVPU Confusion (+3) = 13+ puan. RCP UK 2017: NEWS2 ≥7 → acil eskalasyon, kritik bakım ekibi aktivasyonu.",
        },
        {
          id: "opt_orta_skor",
          text: "NEWS2 7, qSOFA 2 — Sarı alarm: 30 dakika içinde hekim bilgilendir",
          correct: false,
          points: 15,
          feedback:
            "⚠️ Kısmi. qSOFA aslında 3/3 (SS, bilinç VE SBP hepsi kritik sınırı aşıyor). NEWS2 de 7'nin çok üzerinde. Hesaplama eksik — gerçekte daha yüksek alarma gerek var.",
        },
        {
          id: "opt_dusuk_skor",
          text: "NEWS2 4, qSOFA 1 — Normal takip yeterli",
          correct: false,
          points: -25,
          feedback:
            "✗ KRİTİK HATA. Vital değerleri tam tartılmadı. HR 118 + TA 88/54 + SpO2 93 + SS 24 + GCS 12 = YBÜ adayı profili. Bu skorda 'normal takip' kabul edilemez.",
        },
        {
          id: "opt_skor_atlama",
          text: "Skor hesaplamadan eskalasyon — 'sezgi ile kritik' kararı",
          correct: false,
          points: -15,
          feedback:
            "✗ Standardize skor olmadan eskalasyon hekime yetersiz bilgi aktarır. NEWS2/qSOFA SBAR raporunun temeli — 'NEWS2 9, qSOFA 3' demek hekimi anında önceliklendiriyor.",
          min_difficulty: 2,
        },
      ],
    },

    // ====================================================
    // ADIM 2 — 1 Saatlik Sepsis Bundle
    // ====================================================
    {
      id: "s2_bundle",
      kind: "action",
      title: "Hour-1 Sepsis Bundle (SSC 2021)",
      prompt:
        "Hekim 'Sepsis şüphesi — bundle başlatın' dedi. SSC 2021 Hour-1 bundle 5 bileşenini uygulayın. Her dakika kritik.",
      narrative:
        "SSC 2021 Hour-1 Bundle: (1) Laktat, (2) Kan kültürü antibiyotik ÖNCE, (3) Geniş spektrum antibiyotik, (4) 30 mL/kg kristaloid (laktat≥4 veya hipotansiyon), (5) Sıvıya yanıtsızsa vazopressör.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "sh-lactate" },
          points: 15,
          feedback:
            "✓ Serum laktat: POC ile 10 dk'da sonuç. Laktat 4.2 mmol/L — sepsis şok sınıfı. SSC 2021 Bundle Bileşen 1. 2. saat klirens ölçümü planla.",
        },
        {
          action: { type: "use_equipment", target_id: "kan_kültürü_kiti" },
          points: 20,
          feedback:
            "✓ Kan kültürü antibiyotik ÖNCE alındı. Bu sıralama kritik: antibiyotik kültür pozitifliğini %10-15/saat azaltır. 2 set, farklı venöz yoldan. SSC 2021 Bundle Bileşen 2.",
        },
        {
          action: { type: "give_medication", target_id: "meropenem" },
          points: 25,
          feedback:
            "✓ DOĞRU antibiyotik seçimi. Meropenem: penisilin alerjisinde güvenli (<1% çapraz reaksiyon), geniş spektrum, gram-negatif üriner sepsis için uygun. KBY 3a: eGFR hesaplayarak doz ayarı yap. SSC 2021 Bundle Bileşen 3.",
        },
        {
          action: { type: "give_medication", target_id: "piperasilin_tazobaktam" },
          points: -20,
          feedback:
            "✗ KRİTİK HATA. Piperasilin-tazobaktam penisilin grubu ilaçtır — penisilin alerjisi olan hastada kontrendike! Çapraz reaksiyon riski. Meropenem veya sefepim (hafif penisilin alerjisinde) tercih edilmeli.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "serum_fizyolojik_500ml" },
          points: 20,
          feedback:
            "✓ IV kristaloid: 30 mL/kg = 62 kg × 30 = 1860 mL. Laktat ≥4 veya hipotansiyon varsa SSC 2021 Bundle Bileşen 4. ⚠️ KBY + yaşlı: akciğer seslerini ve idrar çıkışını izle.",
          vitals_change: { bp_systolic: 95, bp_diastolic: 62 },
        },
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 18,
          feedback:
            "✓ Ringer laktat: izotonik kristaloid. SF ile eşdeğer, bazı çalışmalarda AKI'da SF'ye üstün. KBY izlemi aynı.",
          vitals_change: { bp_systolic: 95, bp_diastolic: 62 },
        },
        {
          action: { type: "use_equipment", target_id: "kateter_foley" },
          points: 10,
          feedback:
            "✓ Saatlik idrar çıkışı takibi: oligüri <0.5 mL/kg/saat (bu hastada <31 mL/saat) → renal hipoperfüzyon. KBY zemininde AKI izlemi için kritik.",
        },
        {
          action: { type: "order_test", target_id: "sh-blood-culture" },
          points: 5,
          feedback:
            "✓ Kan kültürü panelini sipariş ettin. Antibiyotik öncesi alınması zaten bundle protokolünde — doğru sıralama.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Sepsis bundle'ında bu adım öncelik değil.",
    },

    // ====================================================
    // YENİ ADIM 4b — KBY hastasında sıvı yönetimi
    // ====================================================
    {
      id: "s4b_kby_sivi_dikkat",
      kind: "decision",
      title: "KBY'de Sıvı Aşırı Yüklenme Bulgusu",
      prompt:
        "30 mL/kg kristaloid (~1.9 L) uygulanırken yeni bulgular gelişti: oskültasyonda bibaziler ral (yeni), SpO₂ %96→93, boyun veni dolgunluğu. KBY Evre 3a zemin var. Yaklaşımınız?",
      options: [
        {
          id: "opt_dikkatli_yonetim",
          text: "Sıvıyı yavaşlat + hekime SBAR ile bildir (RAL + SpO2 düşüş) + akciğer/JVD dinleme + saatlik idrar takibi + furosemid emri için hazır ol",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. SSC 2021: Yaşlı + KBY hastasında 30 mL/kg dinamik yanıt değerlendirmesi ile titre edilmeli. Pulmoner konjesyon bulgusu → sıvıyı duraksat, hekime bildir. Pasif bacak kaldırma testi (PLR) ile volüm yanıtını değerlendirebilirsin.",
        },
        {
          id: "opt_dinamik_yanit",
          text: "Sıvıyı bolus duraklatması + hekim çağrısı + dinamik yanıt göstergeleri (vital, laktat, idrar çıkışı) değerlendirme",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU (aynı yaklaşım). Dinamik yanıt değerlendirmesi: BP, HR, idrar çıkışı, laktat klirens. Konjesyon bulgusu varken devam etme — zarar verir.",
        },
        {
          id: "opt_devam_et",
          text: "30 mL/kg tamamlanana kadar devam et — protokol böyle diyor",
          correct: false,
          points: -15,
          feedback:
            "✗ Protokol klinik gözlem YERİNE GEÇMEZ. KBY + yaşlı + ral + SpO2 düşüşü → sıvı aşırı yükü. Bundle hedefi sıvı hacmi değil, hemodinamik düzelme. Zarar veriyor olabilirsin.",
        },
        {
          id: "opt_vazopressor_tek",
          text: "Sıvıyı tamamen durdur, noradrenalin başla",
          correct: false,
          points: -10,
          feedback:
            "✗ İki hata: (1) Hemşire hekim emri olmadan vazopressör başlatamaz. (2) Volüm yetersizse vazopressör tek başına yetmez. Hekimi çağır ve birlikte karar ver.",
        },
        {
          id: "opt_gozlem_yok",
          text: "Bulguları gözardı et, bundle protokolünü tamamlamaya devam et",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. Klinik gözlem hemşireliğin temeli — protokol gözlem yerine geçmez. Hastayı aktif zarara sürüklüyorsun. Pulmoner ödem gelişimi hayatı tehdit eder.",
          critical: true,
        },
      ],
    },

    // ====================================================
    // YENİ ADIM 2b — Lab yorumlama + SBAR raporlama
    // ====================================================
    {
      id: "s2b_lab_interpretation_sbar",
      kind: "decision",
      title: "Lab Sonuçları Geldi — SBAR Raporlama",
      prompt:
        "Lab sonuçları: Laktat 4.2, Cr 1.8 (baseline 1.4'ten kötüleşme — AKI), WBC 18.5k bant %14, HCO3 18 (asidoz), Glukoz 245. Hekime SBAR raporu yapacaksınız. Hangi yapı doğru ve eksiksizdir?",
      options: [
        {
          id: "opt_tam_sbar",
          text: "S: 70y bayan, üriner sepsis şüphesi, 3. gün kötüleşme / B: KBY 3a, DM, penisilin alerjisi, seftriakson altında ateş / A: NEWS2 ≥9, qSOFA 3, Laktat 4.2, Cr 1.8 (baseline 1.4'ten↑ — AKI), bant %14, HCO3 18, MAP 65 sınırda, GCS 12 / R: Acil değerlendirme, meropenem emri + doz ayarı (KBY), vazopressör hazırlığını onaylayın",
          correct: true,
          points: 35,
          feedback:
            "✓ MÜKEMMEL SBAR. Situation-Background-Assessment-Recommendation tam yapısı: hekim hastayı tanımasa karar verebilir. Lab değerlerini klinik anlam ile bağladın (Cr baseline karşılaştırma, AKI yorumu). Öneri sunmak hemşirenin görevidir — bu etkili savunuculuktur.",
        },
        {
          id: "opt_kisa_sbar",
          text: "'Doktor bey, hastanın durumu kötüleşti, gelin bakar mısınız?'",
          correct: false,
          points: -15,
          feedback:
            "✗ Etkisiz iletişim. Hekim önceliklendirme yapamıyor, gecikme riski yüksek. NEWS2 9 olan hasta mı, yoksa hafif hipertansif hasta mı? SBAR yapısı urgency'i iletiyor.",
        },
        {
          id: "opt_sadece_lab",
          text: "Yalnızca lab değerlerini okuyorum: 'Laktat 4.2, Cr 1.8, WBC 18.5k, bant 14...'",
          correct: false,
          points: 5,
          feedback:
            "⚠️ Kısmi. Rakamları ilettiniz ama klinik bağlam (Cr baseline, qSOFA, önerilen aksiyon) eksik. Hekim retrospektif olarak Cr bazalini bilmiyorsa AKI'yi kaçırabilir.",
        },
        {
          id: "opt_kendi_karar",
          text: "Lab değerlerini kendim yorumlayıp, hekim emri beklemeden meropenem ve noradrenalin başlatıyorum",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. Hemşire iş tanımı aşıldı. İlaç yorumu ve tedavi kararı hekime ait. Hemşire gözlemler, raporlar ve uygular — tanı ve karar hekimde. Bağımsız ilaç başlatma tıbbi, hukuki ve etik ihlaldir.",
          critical: true,
        },
        {
          id: "opt_dosyaya_kayit",
          text: "Lab sonuçlarını dosyaya kaydediyorum, eskalasyon yapmıyorum",
          correct: false,
          points: -25,
          feedback:
            "✗ NEWS2 ≥9 + AKI + laktat 4.2 → acil eskalasyon endikasyonu. Sessiz kalmak ihmal sayılır. Hemşirelik Kanunu (Türkiye): Hemşire kritik bulgularda anında bildirme yükümlüdür.",
        },
      ],
    },

    // ====================================================
    // ADIM 3 — Vazopressör kararı
    // ====================================================
    {
      id: "s3_vazopressor",
      kind: "decision",
      title: "Vazopressör Kararı — MAP <65",
      prompt:
        "30 mL/kg sıvı uygulandı (dikkatli izlemle). TA 90/58 → OAB ~69 mmHg, ancak tekrar ölçümde 84/50 → OAB ~61 mmHg. Laktat 4.2 → 2.8 (kısmi düzelme). Septik şok kliniği sürüyor. Hekim vazopressör emri için onay istiyor — hemşire olarak ne bilmeli?",
      options: [
        {
          id: "opt_noradrenalin",
          text: "Noradrenalin 0.01-0.03 mcg/kg/dk başla — OAB hedefi ≥65 mmHg, santral kat veya büyük periferik yoldan",
          correct: true,
          points: 25,
          feedback:
            "✓ DOĞRU. SSC 2021 Sınıf I-A: Septik şokta birinci tercih noradrenalindir. OAB hedef ≥65 mmHg (bazı hastalarda ≥70-75). KBY'de doz titrasyonu önemli. Periferik yol acil başlangıç için kabul edilebilir ama santral kat tercih edilir.",
        },
        {
          id: "opt_sivi_devam",
          text: "Sıvı yüklemeye devam et — vazopressör erken",
          correct: false,
          points: -10,
          feedback:
            "✗ 30 mL/kg + pulmoner konjesyon bulgusu zaten verdi. Daha fazla sıvı akciğer ödemi ağırlaştırır. Sıvıya yanıtsız hipotansiyon → vazopressör zamanı.",
        },
        {
          id: "opt_dobutamin",
          text: "Noradrenalin yerine dobutamin ekle",
          correct: false,
          points: -5,
          feedback:
            "✗ Dobutamin yalnızca kardiyak output düşükse (septik + kardiyojenik kombinasyon) eklenir. İlk seçim her zaman noradrenalindir.",
        },
        {
          id: "opt_vasopressin",
          text: "Vazopressin ekle — noradrenalin dozu yüksekse ikinci basamak",
          correct: false,
          points: 10,
          feedback:
            "✓ Kısmi bilgi, doğru bağlam. Vazopressin SSC 2021'de ikinci basamak (noradrenalin 0.25-0.5 mcg/kg/dk'ya rağmen yetersizse). Şu an birinci adım noradrenalin.",
          min_difficulty: 3,
        },
      ],
    },
  ],

  scoring: {
    max_points: 301,
    passing_score: 168,
    grade_bands: {
      A: 252,
      B: 210,
      C: 168,
      D: 126,
    },
    time_bonus: {
      target_seconds: 600,
      bonus_points: 10,
    },
  },

  debrief: {
    key_learnings: [
      "SBAR yapısı (Situation-Background-Assessment-Recommendation): Hemşirenin etkili eskalasyonunun temeli. 'Hasta kötü' değil — NEWS2 9, qSOFA 3, laktat 4.2 ilet.",
      "NEWS2 ≥7: Acil kritik bakım ekibi çağrısı (RCP UK 2017). qSOFA ≥2: Sepsis şüphesi yüksek (Sepsis-3 2016). Bu hastada her ikisi de kritik sınırı aşıyor.",
      "SSC 2021 Hour-1 Bundle: (1) Laktat, (2) Kan kültürü antibiyotik ÖNCE, (3) Geniş spektrum antibiyotik 1h içinde, (4) 30 mL/kg kristaloid (laktat≥4 veya hipotansiyon), (5) Noradrenalin MAP <65'te.",
      "Penisilin alerjisi + sepsis: Meropenem güvenli (çapraz reaksiyon <%1). Piperasilin-tazobaktam = penisilin grubu = KONTRENDİKE. Her alerjik öykü tedavide farklılık yaratır.",
      "KBY + yaşlı + sıvı: 30 mL/kg dinamik yanıt ile titre et. Pulmoner konjesyon bulgusu (ral, SpO2 düşüşü, JVD) → sıvıyı yavaşlat, hekime bildir — protokol gözlem yerine geçmez.",
      "Hemşirelik rolü: Gözlemci + Raportör + Uygulayıcı. Tanı ve karar hekimde, ama doğru gözlem + etkili SBAR iletişimi hayat kurtarır.",
      "Lab yorumlama hemşireye ait değil, hekim kararıdır. Hemşire değerleri iletir, bağlamı (Cr baseline) not eder, öneride bulunur — bağımsız ilaç başlatmaz.",
    ],
    references: [
      "Evans L. et al. Surviving Sepsis Campaign International Guidelines 2021 — Critical Care Medicine",
      "Singer M. et al. Sepsis-3 Definitions — JAMA 2016",
      "Royal College of Physicians UK. NEWS2 Score — 2017",
      "Joint Commission. SBAR Communication Standard — 2018",
      "TYBHD (Türk Yoğun Bakım Hemşireleri Derneği) Sepsis Bakım Rehberi",
      "AACN Practice Alert: Preventing Harm from Sepsis — 2021",
    ],
    red_flags: [
      "Penisilin alerjisi + beta-laktam (pip-tazo/amoksisilav) vermek — anaflaksi riski",
      "Laktik asit ≥4 mmol/L → Septik şok — yoğun bakım transferi gerekebilir",
      "OAB <65 sıvıya rağmen → noradrenalin gecikmez — hemşire emri doğrular, gecikmeden uygular",
      "KBY hastada sıvı yüklemesi: Her 500 mL sonrası akciğer dinle, idrar çıkışını kaydet",
      "Kan kültürü antibiyotik SONRA alınmak → pozitiflik kaybı, mikroorganizma tanımlanamaz",
      "Lab sonuçlarını dosyaya kaydedip eskalasyon yapmama — NEWS2 9'da bu ihmaldir",
    ],
    next_scenarios: [], // Hemşirelik branşı genişlerken doldurulacak (düşme riski, ilaç hatası)
  },
};
