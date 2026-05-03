// ============================================================
// MediSim TR — Kardiyojenik Şok Senaryosu
// ============================================================
// Klinik referans: ESC 2021 Heart Failure kılavuzu, AHA Cardiogenic
// Shock 2022 Scientific Statement, SCAI Shock Classification
// (A-B-C-D-E stages).
// Ana öğretim: şok tanıma, vazopressor/inotrop seçimi, mekanik
// destek kararı, STEMI komplikasyonu tanıma.
// Faz 5.1: lab_panels + imaging_results + lab_timeline + S2.5 eklendi
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_kardiyojenik_sok: Scenario = {
  id: "kardi-kardiyojenik-sok-001",
  version: "0.2.0",
  title: "65 Yaş Erkek — STEMI Sonrası Şok",
  description:
    "3 saat önce anterior STEMI tanısı alan hasta, primer PCI sonrası koroner yoğun bakımda. Ani hipotansiyon, oligüri ve konfüzyon. SCAI evrelendirmesi, vazopressor-inotrop seçimi, mekanik destek kararı.",
  specialty: "kardiyoloji",
  tags: ["kardiyojenik şok", "stemi", "şok", "noradrenalin", "dobutamin", "ecmo"],
  difficulty: 4,
  supported_difficulties: [3, 4, 5],
  estimated_minutes: 15,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  patient: {
    age: 65,
    sex: "M",
    weight_kg: 82,
    height_cm: 172,
    chief_complaint:
      "3 saat önce anterior STEMI tanısıyla primer PCI yapıldı (LAD'ye DES). Şu an konfü, terli, soğuk ekstremiteler.",
    history_items: [
      "Hipertansiyon (10 yıl, perindopril)",
      "Hiperlipidemi (atorvastatin)",
      "Sigara öyküsü: 30 paket-yıl (hâlâ aktif)",
      "Aile öyküsü: baba 52 yaşında MI",
      "PCI sonrası DAPT: aspirin + tikagrelor başlandı",
    ],
    allergies: [],
    current_medications: ["aspirin", "tikagrelor", "atorvastatin", "perindopril"],
    modifiers: {
      beta_blocker: false,
      karaciger_yetm: false,
      bobrek_yetm: false,
    },
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 78,
    bp_diastolic: 52,
    spo2: 91,
    temp: 36.2, // Hafif hipotermi — perfüzyon bozuk
    rr: 26,
    gcs: 13, // Konfüzyon, perfüzyon azalmış
    pain: 3, // Göğüs ağrısı kısmen devam
  },

  available_medications: [
    "noradrenalin",
    "adrenalin",
    "dobutamin",
    "dopamin",
    "milrinon",
    "vazopressin",
    "furosemid",
    "salin_09",
    "ringer_laktat",
    "heparin",
    "enoksaparin",
    "aspirin",
    "tikagrelor",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "arter_kanul",
    "santral_kateter",
    "foley",
    "ekg_cihazi",
    "eko",
    "hemodinamik_monitor",
    "iabp", // Intra-aortik balon pompası
    "impella",
    "ecmo_va",
    "oksijen_maske",
    "ambu",
  ],

  ekg_pattern: "stemi",

  start_step_id: "step-1",

  steps: [
    // ===== ADIM 1 — Şok tanıma ve ABCDE =====
    {
      id: "step-1",
      kind: "action",
      title: "İlk değerlendirme ve monitörizasyon",
      prompt:
        "PCI sonrası 3. saat. TA 78/52, HR 118, soğuk ekstremiteler, kapiller dolum >4 sn, idrar son 2 saatte 15 mL. İlk aksiyon?",
      min_actions: 3,
      default_wrong_penalty: -3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "arter_kanul" },
          points: 20,
          feedback:
            "✓ Arter kanülü gerçek zamanlı TA izlemi için zorunlu. Şokta NIBP yanıltıcıdır.",
        },
        {
          action: { type: "use_equipment", target_id: "santral_kateter" },
          points: 15,
          feedback:
            "✓ Santral yol: vazopressor ve CVP takibi için.",
        },
        {
          action: { type: "use_equipment", target_id: "foley" },
          points: 15,
          feedback:
            "✓ Saatlik idrar çıkışı şok izleminin temelidir. <0.5 mL/kg/saat → persisting hipoperfüzyon.",
        },
        {
          action: { type: "use_equipment", target_id: "eko" },
          points: 20,
          feedback:
            "✓ Acil EKO: LV fonksiyonu, mekanik komplikasyon (VSR, papiller kas rüptürü, perikardiyal efüzyon) ayırıcı için.",
        },
        {
          action: { type: "order_test", target_id: "laktat" },
          points: 15,
          feedback:
            "✓ Laktat şok şiddeti ve takip parametresi. >2 mmol/L hipoperfüzyon kanıtı.",
        },
        // Yanlış seçimler
        {
          action: { type: "give_medication", target_id: "furosemid" },
          points: -15,
          feedback:
            "✗ TEHLİKELİ. Hipotansif hastada diüretik şoku derinleştirir. Konjesyon kanıtı olsa bile önce perfüzyon stabilize edilir.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 2 — EKO bulgusu sunumu =====
    {
      id: "step-2",
      kind: "info",
      title: "EKO sonucu",
      prompt: "",
      content:
        "Yatak başı EKO: LV ejeksiyon fraksiyonu %25, anterior ve apikal duvar akinez. Mitral yetmezlik hafif. Sağ ventrikül normal. Perikardiyal efüzyon yok. VSR (ventriküler septal rüptür) yok. → İskemik LV disfonksiyonuna bağlı kardiyojenik şok (SCAI Evre C-D).",
    },

    // ===== ADIM 2b (S2.5) — Lab + Görüntüleme Tetkikleri =====
    {
      id: "step-2b",
      kind: "action",
      title: "Lab + Tetkik Paketi",
      prompt:
        "EKO yatak başında başlatıldı. Şokun derinliğini ve organ hasarını belirlemek için hangi acil laboratuvar tetkiklerini istiyorsunuz?",
      min_actions: 3,
      default_wrong_penalty: -5,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "ks-cardiac-markers" },
          points: 20,
          feedback:
            "✓ Troponin I + NT-proBNP: MI tanısını doğrula, KY şiddetini değerlendir. NT-proBNP >5000 → ağır ventriküler yüklenim.",
        },
        {
          action: { type: "order_test", target_id: "ks-abg-lactate" },
          points: 20,
          feedback:
            "✓ ABG + Laktat: Kardiyojenik şokta en kritik tetkik. Laktat >4 mmol/L ciddi hipoperfüzyon — tedavi yanıtı laktat klerensiyle izlenir.",
        },
        {
          action: { type: "order_test", target_id: "ks-cbc" },
          points: 10,
          feedback:
            "✓ Tam kan sayımı: Anemiyi dışla (LV fonksiyon bozukluğunu derinleştirir), stres lökositozu değerlendir.",
        },
        {
          action: { type: "order_test", target_id: "ks-bmp-extended" },
          points: 15,
          feedback:
            "✓ BMP: Renal perfüzyon (BUN/Cr), K+ ve Mg2+ (vazopresör + reperfüzyon altında aritmi riski), stres hiperglisemi.",
        },
        {
          action: { type: "order_test", target_id: "ks-lft-coag" },
          points: 10,
          feedback:
            "✓ Karaciğer + Koagülasyon: Şok karaciğeri izlemi (AST/ALT). INR uzaması DIC başlangıcının erken işareti.",
        },
        // Yanlış seçimler
        {
          action: { type: "order_test", target_id: "d-dimer" },
          points: -10,
          feedback:
            "✗ D-dimer gereksiz: STEMI + PCI öyküsü + EKO bulgusuyla tanı kardiyojenik şok. PE ayırıcısı bu tabloda katkı sağlamaz.",
        },
        {
          action: { type: "order_test", target_id: "prokalsitonin" },
          points: -10,
          feedback:
            "✗ Prokalsitonin gereksiz: Bu tablo kardiyojenik şok, sepsis değil. PCT sonucu yönetimi değiştirmez, zaman kaybettirir.",
        },
      ],
    },

    // ===== ADIM 3 — Vazopressor seçimi =====
    {
      id: "step-3",
      kind: "decision",
      title: "İlk vazopressor seçimi",
      prompt:
        "500 mL kristalloid yükleme yapıldı, TA 82/54. Hâlâ oligüri ve konfüzyon. İlk vazoaktif ajan?",
      options: [
        {
          id: "opt-nor",
          text: "Noradrenalin infüzyonu (0.05-0.1 μg/kg/dk başlangıç)",
          correct: true,
          points: 30,
          feedback:
            "✓ Kardiyojenik şokta ilk tercih noradrenalin. SOAP II + OptimaCC çalışmaları: daha az aritmi ve daha iyi mortalite vs dopamin. Hedef MAP ≥65 mmHg.",
        },
        {
          id: "opt-dopamin",
          text: "Dopamin 10 μg/kg/dk",
          correct: false,
          points: -15,
          feedback:
            "✗ SOAP II (De Backer 2010): kardiyojenik şokta dopamin noradrenaline kıyasla daha fazla aritmi ve mortalite. Rutin önerilmez.",
        },
        {
          id: "opt-adrenalin",
          text: "Adrenalin infüzyonu",
          correct: false,
          points: -10,
          feedback:
            "Refrakter şokta eklenebilir ancak ilk sıra değil. Laktik asidoz ve ritim sorunları yan etki.",
          min_difficulty: 4,
        },
        {
          id: "opt-dobutamin-ilk",
          text: "Dobutamin (hipotansif hastada tek başına)",
          correct: false,
          points: -10,
          feedback:
            "✗ Dobutamin periferik vazodilatör etkisiyle hipotansiyonu DERİNLEŞTİREBİLİR. Önce noradrenalin + MAP sağla, sonra inotrop ekle.",
          critical: true,
        },
        {
          id: "opt-vazopressin",
          text: "Vazopressin 0.03 U/dk",
          correct: false,
          points: 5,
          feedback:
            "Noradrenaline ek olarak refrakter şokta düşünülür, ilk seçim değil.",
          min_difficulty: 4,
        },
      ],
    },

    // ===== ADIM 4 — İnotrop desteği =====
    {
      id: "step-4",
      kind: "decision",
      title: "İnotrop eklenmesi",
      prompt:
        "Noradrenalin 0.3 μg/kg/dk ile MAP 68 sağlandı. Ancak laktat 4.2 mmol/L, idrar hâlâ <0.3 mL/kg/saat, konfüzyon devam. Sonraki adım?",
      options: [
        {
          id: "opt-dobu",
          text: "Dobutamin 5 μg/kg/dk ekle",
          correct: true,
          points: 25,
          feedback:
            "✓ LV disfonksiyonu (EF %25) + persisting hipoperfüzyon → inotrop desteği. Dobutamin β1 ile kardiyak output artırır. Noradrenalinle birlikte verilir (MAP korunur).",
        },
        {
          id: "opt-milrinon",
          text: "Milrinon 0.375 μg/kg/dk",
          correct: false,
          points: 10,
          feedback:
            "Alternatif PDE-3 inhibitörü, β-bloker altındaki hastada tercih edilir. Vazodilatör etki hipotansiyon riski.",
          min_difficulty: 4,
        },
        {
          id: "opt-nor-arttir",
          text: "Sadece noradrenalin dozunu 0.5'e çıkar",
          correct: false,
          points: -10,
          feedback:
            "✗ Hipoperfüzyon sebebi kontraktilite — vazopressor artışı çözüm değil, artsa bile afterload artışı LV'yi daha da zorlar.",
        },
        {
          id: "opt-sivi-yukle",
          text: "1000 mL kristalloid daha yükle",
          correct: false,
          points: -15,
          feedback:
            "✗ Akciğer ödemi riski. LV disfonksiyonu + zaten yüklendi. Volüm yanıtlılığı dinamik parametrelerle (PLR, SVV) değerlendirilir.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 5 — Mekanik destek kararı =====
    {
      id: "step-5",
      kind: "decision",
      title: "Refrakter şok — mekanik destek",
      prompt:
        "30 dk sonra: noradrenalin 0.6 μg/kg/dk + dobutamin 10 μg/kg/dk altında MAP 60, laktat 6.1, idrar yok. SCAI Evre D. Ne yaparsın?",
      min_difficulty: 4,
      options: [
        {
          id: "opt-impella",
          text: "Impella CP yerleştirilmesi için kardiyak cerrahi/girişim hazır",
          correct: true,
          points: 30,
          feedback:
            "✓ Refrakter kardiyojenik şokta mikroaksiyel pompa (Impella) erken seçenek. DanGer-Shock çalışması (NEJM 2024) STEMI-CS'de Impella CP 180 gün mortaliteyi anlamlı azalttı (class I gelişen kanıt).",
        },
        {
          id: "opt-ecmo",
          text: "VA-ECMO başla",
          correct: true,
          points: 25,
          feedback:
            "✓ Ciddi biventriküler yetmezlik, refrakter şok, kardiyak arrest riski → VA-ECMO. Impella ile kombinasyonu (ECMELLA) refrakter olgularda kullanılır.",
          min_difficulty: 5,
        },
        {
          id: "opt-iabp",
          text: "IABP (intra-aortik balon pompası)",
          correct: false,
          points: -5,
          feedback:
            "✗ IABP-SHOCK II çalışması: IABP mortaliteyi azaltmıyor. Rutin önerilmez, mekanik komplikasyon (VSR) köprü olarak özel durumlar.",
        },
        {
          id: "opt-epinefrin-art",
          text: "Adrenalin ekle, ek mekanik destek yapma",
          correct: false,
          points: -15,
          feedback:
            "✗ Refrakter şokta ilaç maksimumlarına çıkmak mortaliteyi azaltmaz, ritim sorunları artırır. Mekanik destek kararı ertelemek kaybetmiş zaman.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 6 — Kılavuz bilgisi ve debrief için =====
    {
      id: "step-6",
      kind: "decision",
      title: "SCAI şok evrelendirmesi",
      prompt:
        "Hastanın başvurudaki tabloya göre SCAI evresi neydi, tedavi sonrası şu an hangi evre?",
      min_difficulty: 3,
      options: [
        {
          id: "opt-c-d",
          text: "Başlangıç: C (Klasik şok). Refrakter sonrası: D (Kötüleşen)",
          correct: true,
          points: 15,
          feedback:
            "✓ SCAI: A (at risk) → B (başlangıç) → C (klasik: hipoperfüzyon + vazoaktif ihtiyacı) → D (kötüleşen: artan destek) → E (extremis: CPR/ECMO). Erken tanıma mortaliteyi belirler.",
        },
        {
          id: "opt-a-b",
          text: "Başlangıç: A, Sonrası: B",
          correct: false,
          points: -10,
          feedback:
            "✗ Hipoperfüzyon kanıtı (laktat, oligüri, konfüzyon) + vazoaktif ihtiyacı → minimum C.",
        },
        {
          id: "opt-e",
          text: "Başlangıç: E",
          correct: false,
          points: -5,
          feedback:
            "E evresi CPR veya refrakter arrest. Hasta bilinçli, ritimi var — henüz E değil.",
        },
      ],
    },
  ],

  lab_panels: {
    "ks-cbc": {
      id: "ks-cbc",
      name_tr: "Tam Kan Sayımı",
      results: [
        { parameter: "WBC",      value: 14.2, unit: "×10³/µL", reference_range: "4.5-11.0",  flag: "H",
          interpretation: "Stres lökositozu — kardiyojenik şokta sempatoadrenal aktivasyonla beklenen." },
        { parameter: "Nötrofil", value: 82,   unit: "%",        reference_range: "40-70",      flag: "H" },
        { parameter: "Hgb",      value: 13.2, unit: "g/dL",     reference_range: "13.5-17.5",  flag: "L" },
        { parameter: "Hct",      value: 39,   unit: "%",        reference_range: "40-52",       flag: "L" },
        { parameter: "PLT",      value: 198,  unit: "×10³/µL",  reference_range: "150-400" },
      ],
      comment: "Belirgin anemi yok. Hafif sınır Hgb — LV disfonksiyonunu derinleştirmez ama izle.",
    },
    "ks-cardiac-markers": {
      id: "ks-cardiac-markers",
      name_tr: "Kardiyak Belirteçler",
      results: [
        { parameter: "Troponin I", value: 8.4,    unit: "ng/mL",  reference_range: "<0.04",    flag: "HH",
          interpretation: "Akut MI + şok durumunda masif miyokard hasarı. Trend her 3-6 saatte izlenir." },
        { parameter: "NT-proBNP",  value: 12450,  unit: "pg/mL",  reference_range: "<125",     flag: "HH",
          interpretation: ">5000 → ağır ventriküler yüklenim + duvar stresi. EF %25 ile uyumlu." },
        { parameter: "CK-MB",      value: 145,    unit: "U/L",    reference_range: "<25",      flag: "HH" },
      ],
      comment: "Troponin I ve NT-proBNP değerleri STEMI komplikasyonu olarak gelişen kardiyojenik şokla uyumlu.",
    },
    "ks-abg-lactate": {
      id: "ks-abg-lactate",
      name_tr: "Kan Gazı + Laktat",
      results: [
        { parameter: "pH",     value: 7.22, unit: "",       reference_range: "7.35-7.45",  flag: "LL",
          interpretation: "Ciddi metabolik asidoz. Kompansatuvar hiperventilasyon (RR 26) ile pCO2 düşük." },
        { parameter: "pCO₂",   value: 28,   unit: "mmHg",   reference_range: "35-45",       flag: "L" },
        { parameter: "pO₂",    value: 62,   unit: "mmHg",   reference_range: "80-100",      flag: "L" },
        { parameter: "HCO₃⁻",  value: 14,   unit: "mEq/L",  reference_range: "22-26",       flag: "LL" },
        { parameter: "BE",     value: -12,  unit: "mEq/L",  reference_range: "-2 / +2",     flag: "LL" },
        { parameter: "Laktat", value: 4.8,  unit: "mmol/L", reference_range: "0.5-2.0",     flag: "HH",
          interpretation: "Kritik hipoperfüzyon. >4 mmol/L SCAI C-D ile uyumlu. Hedef: laktat klerensi >10%/saat." },
        { parameter: "SaO₂",   value: 89,   unit: "%",      reference_range: "95-100",      flag: "L" },
      ],
      comment: "Ağır metabolik asidoz + hiperlaktatemi. Tedavinin başarısı laktat klerensiyle izlenir.",
    },
    "ks-bmp-extended": {
      id: "ks-bmp-extended",
      name_tr: "BMP + Elektrolitler",
      results: [
        { parameter: "Na⁺",       value: 137,  unit: "mEq/L",  reference_range: "136-145" },
        { parameter: "K⁺",        value: 4.8,  unit: "mEq/L",  reference_range: "3.5-5.0",  flag: "H",
          interpretation: "Sınırda hiperkali — prerenal AKI + asidoz kaynaklı. >5.5 tehlikeli, yakın izle." },
        { parameter: "Cl⁻",       value: 103,  unit: "mEq/L",  reference_range: "98-107" },
        { parameter: "BUN",       value: 38,   unit: "mg/dL",  reference_range: "7-20",      flag: "H",
          interpretation: "Prerenal AKI işareti. Renal perfüzyon bozulmuş." },
        { parameter: "Kreatinin", value: 2.1,  unit: "mg/dL",  reference_range: "0.7-1.2",  flag: "HH",
          interpretation: "Akut böbrek hasarı (baseline N varsayıldı). Sıvı + perfüzyon düzelince izle." },
        { parameter: "Glukoz",    value: 178,  unit: "mg/dL",  reference_range: "70-100",    flag: "H",
          interpretation: "Stres hiperglisemi — kardiyojenik şokta sempatoadrenal yanıt. >180 → insülin protokolü." },
        { parameter: "Mg²⁺",      value: 0.7,  unit: "mEq/L",  reference_range: "1.3-2.1",  flag: "L",
          interpretation: "Hipomagnesemi — ventrikül fibrilasyonu ve diğer aritmi riskini artırır. Replase et." },
        { parameter: "Ca²⁺",      value: 8.2,  unit: "mg/dL",  reference_range: "8.5-10.2", flag: "L" },
      ],
      comment: "AKI + hipomagnesemi + stres hiperglisemi üçlüsü kardiyojenik şok organ hasarı profiliyle uyumlu.",
    },
    "ks-lft-coag": {
      id: "ks-lft-coag",
      name_tr: "Karaciğer Fonksiyon + Koagülasyon",
      results: [
        { parameter: "AST",          value: 385,  unit: "U/L",  reference_range: "10-40",   flag: "HH",
          interpretation: "Şok karaciğeri (hipoksik hepatit). Düşük debili hepatik hipoperfüzyon → santrilobüler nekroz." },
        { parameter: "ALT",          value: 215,  unit: "U/L",  reference_range: "7-56",    flag: "HH" },
        { parameter: "T. Bilirubin", value: 1.8,  unit: "mg/dL", reference_range: "<1.2",   flag: "H" },
        { parameter: "INR",          value: 1.9,  unit: "",      reference_range: "0.8-1.2", flag: "H",
          interpretation: "Koagülasyon bozukluğu başlangıcı. >2.0 → DIC / ağır karaciğer hasarı eşiği." },
        { parameter: "aPTT",         value: 52,   unit: "sn",    reference_range: "25-35",   flag: "H",
          interpretation: "Uzamış aPTT. Heparin/DAPT + karaciğer hasarı katkısı. Kanama riskini artırır." },
      ],
      comment: "Şok karaciğeri tablosu — kardiyojenik şokta %30-50 olguda görülür. Perfüzyon düzelince AST/ALT gerilemeye başlar.",
    },

    // ------------------------------------------------------------
    // step-1 nokta laktat ölçümü (POC) — ABG'den ayrı, hızlı tetkik
    // ------------------------------------------------------------
    "laktat": {
      id: "laktat",
      name_tr: "Nokta Laktat (POC)",
      results: [
        { parameter: "Laktat (POC)", value: 5.2, unit: "mmol/L", reference_range: "<2.0", flag: "HH",
          interpretation: "Ciddi hipoperfüzyon — SCAI Evre C-D ile uyumlu. Laktat klerensi tedavi yanıtının primer takip parametresi (>%10/saat hedef). >4 mmol/L mortalite belirteci." },
      ],
      comment: "Nokta laktat (i-STAT/POC) ABG sonucundan önce 1-2 dk'da gelir — şokta erken karar için kritik. Hedef: 2 saatte ≥%10 düşüş. Dirençli laktat → mekanik destek (Impella/IABP/VA-ECMO) eşiğini düşürür.",
    },

    // ------------------------------------------------------------
    // Yanlış seçim (-10): D-dimer, kardiyojenik şokta PE ayırıcı katkı sağlamaz
    // ------------------------------------------------------------
    "d-dimer": {
      id: "d-dimer",
      name_tr: "D-Dimer",
      results: [
        { parameter: "D-Dimer", value: 1380, unit: "ng/mL FEU", reference_range: "<500", flag: "H",
          interpretation: "Hafif-orta yükseklik. Akut MI + sistemik inflamasyon + heparin altındaki hastada D-Dimer non-spesifik olarak yükselir — PE'yi ne destekler ne dışlar. STEMI + PCI öyküsü + EKO bulgusu zaten kardiyojenik şok tanısı koymuş durumda." },
      ],
      comment: "ESC 2021: Akut iskemik olayda D-Dimer rutin önerilmez (Wells skoru düşükse). Bu hastada PE ön olasılığı düşük; non-spesifik yükseklik gereksiz BT-anjio kararına götürebilir.",
    },

    // ------------------------------------------------------------
    // Yanlış seçim (-10): Prokalsitonin, sepsis değil kardiyojenik şok
    // ------------------------------------------------------------
    "prokalsitonin": {
      id: "prokalsitonin",
      name_tr: "Prokalsitonin (PCT)",
      results: [
        { parameter: "PCT", value: 0.18, unit: "ng/mL", reference_range: "<0.25 (bakteriyel sepsis dışı)",
          interpretation: "Düşük — bakteriyel sepsis lehine bulgu yok. Kardiyojenik şokta PCT hafif yükselebilir (doku hipoperfüzyonu) ama tablo zaten sepsis değil. Sonuç klinik kararı değiştirmedi." },
      ],
      comment: "AHA 2022 Cardiogenic Shock: Sepsis ön olasılığı yoksa PCT rutin önerilmez. Bu hastada STEMI + KY → tablo açık. PCT zaman ve maliyet kaybı.",
    },
  },

  result_delay_seconds: {
    "ks-cbc":              900,   // 15 dk
    "ks-cardiac-markers":  900,   // 15 dk
    "ks-abg-lactate":      600,   // 10 dk
    "ks-bmp-extended":    1800,   // 30 dk
    "ks-lft-coag":        2700,   // 45 dk
    "laktat":              120,   // 2 dk — POC, hızlı
    "d-dimer":             900,   // 15 dk
    "prokalsitonin":      1800,   // 30 dk
  },

  lab_timeline: [
    {
      panel_id: "ks-abg-lactate",
      at_minute: 30,
      results: [
        { parameter: "pH",     value: 7.24, unit: "",       reference_range: "7.35-7.45",  flag: "LL" },
        { parameter: "pCO₂",   value: 26,   unit: "mmHg",   reference_range: "35-45",       flag: "L" },
        { parameter: "HCO₃⁻",  value: 13,   unit: "mEq/L",  reference_range: "22-26",       flag: "LL" },
        { parameter: "BE",     value: -13,  unit: "mEq/L",  reference_range: "-2 / +2",     flag: "LL" },
        { parameter: "Laktat", value: 5.8,  unit: "mmol/L", reference_range: "0.5-2.0",     flag: "HH",
          interpretation: "Laktat kötüleşiyor — noradrenalin MAP hedefi sağlandı ama doku perfüzyonu yetersiz. İnotrop + mekanik destek gerekliliğine işaret." },
      ],
    },
    {
      panel_id: "ks-abg-lactate",
      at_minute: 90,
      results: [
        { parameter: "pH",     value: 7.30, unit: "",       reference_range: "7.35-7.45",  flag: "L" },
        { parameter: "pCO₂",   value: 30,   unit: "mmHg",   reference_range: "35-45",       flag: "L" },
        { parameter: "HCO₃⁻",  value: 17,   unit: "mEq/L",  reference_range: "22-26",       flag: "L" },
        { parameter: "BE",     value: -9,   unit: "mEq/L",  reference_range: "-2 / +2",     flag: "L" },
        { parameter: "Laktat", value: 4.2,  unit: "mmol/L", reference_range: "0.5-2.0",     flag: "HH",
          interpretation: "Mekanik destek sonrası hafif iyileşme. Laktat klerensi başladı ancak hedef (<2) uzak. Devam izlemi gerekli." },
      ],
    },
  ],

  imaging_results: {
    "ks-eko": {
      id: "ks-eko",
      name_tr: "Yatak Başı EKO",
      modality: "echo",
      view: "Apikal 4 boşluk + Parasternal",
      interpretation:
        "Ağır LV sistolik disfonksiyon: EF %25-30. Anterior ve apikal duvar akinez (LAD bölgesi). RV boyut ve fonksiyon normal. Perikardiyal efüzyon yok. Kapaklar: hafif mitral yetersizlik, diğerleri normal. VSR yok, serbest duvar rüptürü yok.",
      findings: [
        "LV ejeksiyon fraksiyonu: %25-30 (ağır sistolik disfonksiyon)",
        "Anterior-apikal akinez — LAD bölgesi iskemisiyle uyumlu",
        "RV fonksiyon ve boyut normal",
        "Perikardiyal efüzyon yok",
        "Mitral yetersizlik hafif (grade 1)",
        "Triküspid, aort, pulmoner kapaklar normal",
        "Ventriküler septal rüptür yok",
        "Serbest duvar rüptürü yok",
      ],
      timestamp_min: 10,
      attribution: "Eğitim amaçlı temsili rapor — ESC 2021 HF kriterleri",
    },
    "ks-cxr": {
      id: "ks-cxr",
      name_tr: "PA Akciğer Grafisi",
      modality: "xray",
      view: "PA (Posteroanterior)",
      interpretation:
        "Bilateral perihiler ve bazal buzlu cam opasiteler, pulmoner venöz hipertansiyonla uyumlu akciğer ödemi. Kardiyotorasik oran genişlemiş (>0.55). Bilateral Kerley B çizgileri. Küçük bilateral plevral efüzyon.",
      findings: [
        "Kardiyomegali (KT oranı >0.55)",
        "Bilateral perihiler buzlu cam opasite — pulmoner ödem",
        "Bilateral Kerley B çizgileri (interstirsyel ödem)",
        "Küçük bilateral plevral efüzyon",
        "Pnömotoraks yok",
        "Mediastinum geniş değil (aort diseksiyonu dışlandı)",
      ],
      timestamp_min: 15,
      attribution: "Eğitim amaçlı temsili rapor — ESC 2021 HF radyoloji kriterleri",
    },
  },

  scoring: {
    max_points: 230,
    passing_score: 175,
    grade_bands: {
      A: 250,
      B: 215,
      C: 175,
      D: 130,
    },
  },

  debrief: {
    key_learnings: [
      "Kardiyojenik şok tanısı: hipoperfüzyon kanıtı (laktat ≥2, oligüri, konfüzyon, soğuk ekstremite) + SBP <90 veya vazopressor ihtiyacı.",
      "İlk vazopressor: NORADRENALİN (SOAP II, OptimaCC — daha az aritmi, daha iyi sonuç vs dopamin).",
      "İnotrop eklemek: LV disfonksiyonu + persisting hipoperfüzyonda dobutamin veya milrinon. Tek başına hipotansif hastada verme.",
      "Erken EKO şart: LV fonksiyonu + mekanik komplikasyon (VSR, papiller kas, tamponad) ayırımı.",
      "IABP rutin önerilmez (IABP-SHOCK II). Impella CP STEMI-CS'de DanGer-Shock kanıtıyla erken mortaliteyi azaltır.",
      "VA-ECMO refrakter, biventriküler yetmezlik veya arrest eşiğinde. Merkez ve ekip hazırlığı şart.",
      "SCAI evrelendirmesi (A-B-C-D-E) iletişim ve tedavi aciliyeti için ortak dil — her 30-60 dakikada tekrar değerlendir.",
    ],
    references: [
      "ESC 2023 Akut ve Kronik Kalp Yetmezliği Kılavuzu",
      "AHA Cardiogenic Shock Scientific Statement 2022",
      "SCAI Shock Classification (Naidu et al., JACC 2022)",
      "SOAP II (De Backer, NEJM 2010) — noradrenalin vs dopamin",
      "DanGer-Shock (Møller et al., NEJM 2024) — Impella CP STEMI-CS",
      "IABP-SHOCK II (Thiele, NEJM 2012)",
    ],
    red_flags: [
      "Mekanik komplikasyon gözden kaçırma: VSR, papiller kas rüptürü, serbest duvar rüptürü → acil cerrahi",
      "Dobutamini hipotansif hastada tek başına başlamak — MAP düşer, hipoperfüzyon derinleşir",
      "Aşırı sıvı yüklemesi — akciğer ödemi ve vent bağımlılığı",
      "SCAI D-E'de mekanik destek kararını geciktirme — 'bir ilaç daha deneyelim' mortaliteyi artırır",
      "Laktat izlemini takip etmeme — klinik iyileşme yanıltıcı, laktat klirensi gerçek göstergedir",
    ],
    next_scenarios: ["kardi-stemi-001"],
  },
};
