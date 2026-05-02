// ============================================================
// MediSim TR — Ağır Preeklampsi / Eklampsi Senaryosu
// ============================================================
// Klinik referans: ACOG Practice Bulletin 222 (2020),
// ISSHP 2021, TJOD Preeklampsi Kılavuzu 2022,
// WHO Pre-eclampsia Önerileri 2023.
// HELLP sınıflaması: Tennessee/Mississippi kriterleri.
// Ana öğretim hedefi: ağır özellik kriterleri, MgSO4 protokolü,
// antihipertansif tedavi, doğum kararı.
// Faz 5.2: lab_panels + imaging_results + lab_timeline + S1b eklendi
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_preeklampsi: Scenario = {
  id: "kadin_dogum-preeklampsi-001",
  version: "0.2.0",
  title: "32 Yaş Kadın — 36 Haftalık Gebe, Baş Ağrısı ve Hipertansiyon",
  description:
    "36 haftalık primigravid hasta, baş ağrısı, görme bozukluğu ve TA 168/110 ile acile başvurdu. Ağır preeklampsi tanı kriterleri, MgSO4 ve antihipertansif yönetimi.",
  specialty: "kadin_dogum",
  tags: ["preeklampsi", "eklampsi", "mgsO4", "magnezyum", "obstetri", "doğum"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ACOG PB 222 (2020), WHO 2023 uyumlu",
  last_updated: "2026-04-27",

  patient: {
    age: 32,
    sex: "F",
    weight_kg: 72,
    height_cm: 163,
    chief_complaint:
      "36 haftalık ilk gebelik. Sabahtan beri şiddetli baş ağrısı, gözlerinde parlama hissi ve şişlik var. Kan basıncı yüksek.",
    history_items: [
      "Primigravida — 36 hafta",
      "Obstetrik takip: düzenli gidiyordu, son kontrol 4 hafta önce — TA normaldi",
      "Aile öyküsü: anne de gebelikte hipertansiyon yaşamış",
      "Sigara içmiyor",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {
      gebelik: true,
    },
  },

  initial_vitals: {
    hr: 96,
    bp_systolic: 168,
    bp_diastolic: 110,
    spo2: 98,
    temp: 37.0,
    rr: 18,
    pain: 6,
    gcs: 15,
  },

  available_medications: [
    "magnezyum_sulfat",
    "labetalol",
    "hidralazin",
    "nifedipin",
    "deksametazon",
    "betametazon",
    "kalsiyum_glukonat",
    "oksitosin",
    "diazepam",
  ],

  available_equipment: [
    "monitor",
    "tansiyon_aleti",
    "pulse_oksimetre",
    "iv_kateter_18g",
    "kateter_foley",
    "ultrasonografi",
    "fetal_kalp_monitoru",
    "reflex_çekici",
  ],

  ekg_pattern: "normal_sinüs",

  start_step_id: "s1_agir_pre_tani",

  steps: [
    // ====================================================
    // ADIM 1 — Ağır preeklampsi tanısı
    // ====================================================
    {
      id: "s1_agir_pre_tani",
      kind: "action",
      title: "Ağır Preeklampsi Değerlendirmesi",
      prompt:
        "Hasta acile getirildi. Ağır preeklampsi şüphesiyle değerlendirmeyi başlatın.",
      narrative:
        "TA 168/110. Başağrısı ve görme bozukluğu var. Bacaklarda belirgin ödem. Fetal kalp sesleri 140/dk.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "idrar_protein" },
          points: 15,
          feedback:
            "Doğru — Spot protein/kreatinin oranı veya 24 saat idrar proteini. Preeklampside ≥0.3 g/gün veya spot ≥0.3 anlamlı.",
        },
        {
          action: { type: "order_test", target_id: "tam_kan_sayimi" },
          points: 12,
          feedback:
            "Doğru — Trombositopeni HELLP sendromunu düşündürür. Plt <100.000 ağır özellik.",
        },
        {
          action: { type: "order_test", target_id: "karaciger_fonksiyon_testleri" },
          points: 15,
          feedback:
            "Doğru — AST/ALT yükselmesi HELLP kriterini gösterir. AST >70 U/L ağır özellik sayılır.",
        },
        {
          action: { type: "order_test", target_id: "kreatinin" },
          points: 10,
          feedback:
            "Doğru — Kreatinin >1.1 mg/dL (bazalsiz) veya 2 katı artış ağır özellik.",
        },
        {
          action: { type: "use_equipment", target_id: "fetal_kalp_monitoru" },
          points: 15,
          feedback:
            "Doğru — NST (non-stress test) veya kardiyotokografi zorunlu. Fetal iyilik durumu değerlendir.",
        },
        {
          action: { type: "use_equipment", target_id: "kateter_foley" },
          points: 10,
          feedback:
            "Doğru — Saatlik idrar çıkışı takibi: oligüri <0.5 mL/kg/saat ağır özellik.",
        },
        {
          action: { type: "examine", target_id: "derin_tendon_refleksleri" },
          points: 8,
          feedback:
            "Doğru — Hiperrefleksi/klonus: nöbet riski göstergesi. MgSO4 başlamadan önce baseline.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Preeklampsi değerlendirmesinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 1b (S1.5) — Lab Paneli + Görüntüleme Tetkikleri
    // ====================================================
    {
      id: "s1b_lab_order",
      kind: "action",
      title: "Lab Paneli + Görüntüleme",
      prompt:
        "Ağır preeklampsi kriterleri karşılandı. HELLP sendromunu tam değerlendirmek için tetkik paketini isteyin.",
      min_actions: 3,
      default_wrong_penalty: -5,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "pe-cbc" },
          points: 12,
          feedback:
            "✓ TKS: Trombositopeni (Plt <100k) HELLP tanısı için kritik. Şistosit varlığı mikroanjiopatik hemolitik anemiyi (MAHA) doğrular.",
        },
        {
          action: { type: "order_test", target_id: "pe-lft" },
          points: 15,
          feedback:
            "✓ Karaciğer + LDH + Haptoglobin: HELLP tanı üçlüsü — hemoliz (LDH >600, haptoglobin düşük), karaciğer hasarı (AST >70).",
        },
        {
          action: { type: "order_test", target_id: "pe-renal" },
          points: 10,
          feedback:
            "✓ Renal panel: Cr >1.1 ACOG ağır özellik. Ürik asit >5.5 preeklampsi ciddiyetiyle korelasyon. Mg baseline — tedavi izlemi için gerekli.",
        },
        {
          action: { type: "order_test", target_id: "pe-urine" },
          points: 15,
          feedback:
            "✓ Proteinüri: Spot P/Cr ≥0.3 anlamlı, >3.5 ağır. 24h protein >5g şiddetli proteinüri.",
        },
        {
          action: { type: "order_test", target_id: "pe-coag" },
          points: 8,
          feedback:
            "✓ Koagülasyon: HELLP + DIC riski. Fibrinojen <300 DIC başlangıcı; D-dimer fibrin yıkım markeri.",
        },
        {
          action: { type: "use_equipment", target_id: "ultrasonografi" },
          points: 12,
          feedback:
            "✓ Obstetrik USG: AFI (oligohidramnios?), umbilikal arter Doppler (uteroplatental yetmezlik?), fetal biyometri (IUGR?).",
        },
        {
          action: { type: "use_equipment", target_id: "fetal_kalp_monitoru" },
          points: 8,
          feedback:
            "✓ NST/CTG: Fetal iyilik kontrolü. Non-reaktif NST + azalmış variabilite → kategorize et, gözetim koy.",
        },
        // Yanlış seçimler
        {
          action: { type: "order_test", target_id: "prokalsitonin" },
          points: -10,
          feedback:
            "✗ Prokalsitonin gereksiz: Bu tablo enfeksiyon değil, preeklampsi. PCT sonucu yönetimi değiştirmez.",
        },
        {
          action: { type: "order_test", target_id: "troponin" },
          points: -10,
          feedback:
            "✗ Troponin gereksiz: Kardiyak şüphe yoksa erken evrede katkısı yok. HELLP'ın ileri evresinde izlenebilir.",
        },
      ],
    },

    // ====================================================
    // ADIM 2 — Magnezyum sulfat nöbet profilaksisi
    // ====================================================
    {
      id: "s2_mgso4",
      kind: "action",
      title: "MgSO4 Nöbet Profilaksisi",
      prompt:
        "TA 168/110, baş ağrısı, görme bozukluğu — ağır preeklampsi kriterleri karşılandı. Nöbet profilaksisi başlatın.",
      narrative:
        "Eklampsi (nöbet) riski yüksek. MgSO4 profilaksisi ACOG class I A kanıt. Kalsiyum glukonat hazır olmalı.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: {
            type: "give_medication",
            target_id: "magnezyum_sulfat",
            dose: "4-6 g IV yükleme 15-20 dk",
          },
          points: 30,
          feedback:
            "Doğru — MgSO4 yükleme dozu: 4-6 g IV (dilüe, 15-20 dk). Ardından 1-2 g/saat idame. ACOG/WHO önerir: eklamptik nöbeti önler ve tedavi eder.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback: "Doğru — Güvenilir IV yol şart. MgSO4 damar yoluyla verilmeli.",
        },
        {
          action: { type: "order_test", target_id: "magnezyum_duzeyi" },
          points: 10,
          feedback:
            "Doğru — Tedavi penceresi: 5-7 mEq/L. Toksik: >9 mEq/L (respiratuvar arrest: >12 mEq/L).",
          min_difficulty: 3,
        },
        {
          action: { type: "examine", target_id: "patellar_refleks" },
          points: 10,
          feedback:
            "Doğru — MgSO4 idamede saat başı: patellar refleks (kaybolması toksisite!), SS, SpO₂, idrar çıkışı takibi.",
        },
        {
          action: { type: "examine", target_id: "solunum_sayisi" },
          points: 5,
          feedback:
            "Doğru — SS <12/dk MgSO4 toksisitesinin erken işareti. İnfüzyonu durdur, antidot: kalsiyum glukonat 1 g IV yavaş.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Nöbet profilaksisinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 3 — Antihipertansif tedavi
    // ====================================================
    {
      id: "s3_antihipertansif",
      kind: "decision",
      title: "Antihipertansif Seçimi",
      prompt:
        "TA 168/110. Ağır hipertansiyon (SBP≥160 veya DBP≥110) için acil antihipertansif başlayın. Hangi ilacı seçersiniz?",
      options: [
        {
          id: "opt_labetalol",
          text: "Labetalol 20 mg IV bolus (15 dk aralıklarla 40-80 mg eklenebilir, max 300 mg)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — Labetalol gebelikte güvenli, etkin. ACOG birinci tercih. Bradikardi açısından izle.",
        },
        {
          id: "opt_hidralazin",
          text: "Hidralazin 5-10 mg IV — gebelikte uzun süreli kanıt var",
          correct: true,
          points: 22,
          feedback:
            "Doğru — Hidralazin gebelikte uzun süredir kullanılır. Refleks taşikardi ve maternal hipotansiyona dikkat.",
        },
        {
          id: "opt_nifedipin_oral",
          text: "Nifedipin 10-20 mg oral (hızlı etkili)",
          correct: true,
          points: 20,
          feedback:
            "Doğru — Oral nifedipin ağır hipertansiyonda etkin. ACOG/WHO: IV yol olmadan kullanılabilir. Sublingualden kaçın (hızlı düşüş: utero-plasental hipoperfüzyon).",
        },
        {
          id: "opt_ace_inhibitor",
          text: "Enalapril IV — güçlü antihipertansif",
          correct: false,
          points: -25,
          feedback:
            "KESİN KONTRENDİKE — ACE inhibitörleri gebelikte fetal toksik (renal displazi, oligohidramnioz, fetal ölüm). Kullanılmamalı.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 — Doğum kararı
    // ====================================================
    {
      id: "s4_dogum_karari",
      kind: "decision",
      title: "Doğum Kararı",
      prompt:
        "Hasta 36 haftalık, ağır preeklampsi kriterleri var. Ne yaparsınız?",
      options: [
        {
          id: "opt_dogur",
          text: "Hemen doğumu başlat (indüksiyon veya sezaryen) — 36 haftada ağır pre'de kesin endikasyon",
          correct: true,
          points: 30,
          feedback:
            "Doğru — ACOG: ≥34 hafta + ağır preeklampsi = doğum endikasyonu. 36 haftada bekleme önerilmez, perinatal sonuçlara katkısı yok.",
        },
        {
          id: "opt_deksametazon_bekle",
          text: "<34 hafta olsaydı kortikosteroid (betametazon) ver, 48 saat bekle",
          correct: true,
          points: 15,
          feedback:
            "Doğru prensip ama bu senaryoda 36 hafta — kortikosteroid penceresi kapanmış. ≥34 haftada bekleme önerilmez.",
        },
        {
          id: "opt_bekle",
          text: "TA kontrol altında, 38-40 haftaya kadar bekle",
          correct: false,
          points: -30,
          feedback:
            "Yanlış — Ağır preeklampsi ≥34 haftada bekleme endikasyonu yoktur. Maternal (nöbet, ablasyon, stroke) ve fetal komplikasyonlar riski kabul edilemez.",
        },
      ],
    },

    // ====================================================
    // ADIM 5 — Eklampsi (konvülsiyon) gelişirse (S3+)
    // ====================================================
    {
      id: "s5_eklampsi_nöbet",
      kind: "action",
      title: "Eklampsi — Aktif Nöbet Yönetimi",
      prompt:
        "Hasta nöbet geçiriyor (tonik-klonik, 90 sn sürüyor). Ne yaparsınız?",
      narrative:
        "Eklampsi gelişti. Hasta sağ tarafı dönüktü, ağız hafif açık. SpO₂ düşüyor.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "magnezyum_sulfat", dose: "2-4 g IV" },
          points: 25,
          feedback:
            "Doğru — Aktif eklampside MgSO4 2-4 g IV bolus (5 dk). MgSO4 başlanmamışsa yükleme dozu ver. Başlanmışsa ek 2 g ver.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback: "Doğru — O₂ destek: SpO₂ hedef ≥95%.",
        },
        {
          action: { type: "examine", target_id: "lateral_dekubitus" },
          points: 8,
          feedback:
            "Doğru — Sol lateral pozisyon: aorto-kaval bası azaltır, aspirasyon riskini düşürür.",
        },
        {
          action: { type: "give_medication", target_id: "diazepam" },
          points: -5,
          feedback:
            "Dikkatli — MgSO4 başlandıysa diazepam ikinci seçenek. MgSO4'e dirençli nöbette eklenir. Fetal CNS baskısına dikkat.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -8,
      default_wrong_feedback: "Aktif eklampsi yönetiminde öncelik değil.",
    },
  ],

  lab_panels: {
    "pe-cbc": {
      id: "pe-cbc",
      name_tr: "Tam Kan Sayımı",
      results: [
        { parameter: "WBC",       value: 10.2, unit: "×10³/µL", reference_range: "4.5-11.0" },
        { parameter: "Nötrofil",  value: 74,   unit: "%",        reference_range: "40-70",    flag: "H" },
        { parameter: "Hgb",       value: 11.8, unit: "g/dL",     reference_range: "12.0-16.0", flag: "L",
          interpretation: "Gebelik dilüsyonu + erken hemoliz. Hızlı düşüş HELLP gelişimini düşündürür." },
        { parameter: "Hct",       value: 35.2, unit: "%",        reference_range: "36-46",    flag: "L" },
        { parameter: "PLT",       value: 98,   unit: "×10³/µL",  reference_range: "150-400",  flag: "LL",
          interpretation: "HELLP eşiği: <100k sınırda, <50k kritik. Saatlik trend izlemesi şart." },
        { parameter: "Şistosit",  value: "+/-", unit: "",        reference_range: "Negatif",  flag: "H",
          interpretation: "Periferik yaymada birkaç şistosit — MAHA (mikroanjiopatik hemolitik anemi) başlangıcı." },
      ],
      comment: "PLT 98k + şistosit başlangıcı → HELLP eşiğinde. Saatlik CBC izlemi; PLT <100k düşüşü 24-48h içinde doğum kararını güçlendirir.",
    },
    "pe-lft": {
      id: "pe-lft",
      name_tr: "Karaciğer Fonksiyon + Hemoliz Belirteçleri",
      results: [
        { parameter: "AST",         value: 95,  unit: "U/L",    reference_range: "10-40",    flag: "HH",
          interpretation: "2× üst sınırın üzerinde — ACOG ağır özellik kriteri (>70 U/L). HELLP Sınıf 1-2." },
        { parameter: "ALT",         value: 72,  unit: "U/L",    reference_range: "7-56",     flag: "HH" },
        { parameter: "T. Bilirubin",value: 1.4, unit: "mg/dL",  reference_range: "<1.2",     flag: "H" },
        { parameter: "LDH",         value: 685, unit: "U/L",    reference_range: "<250",     flag: "HH",
          interpretation: ">600 U/L hemoliz markeri (HELLP tanı kriteri). Hücre harabiyetini gösterir." },
        { parameter: "Haptoglobin", value: 28,  unit: "mg/dL",  reference_range: "30-200",   flag: "L",
          interpretation: "Düşük haptoglobin hemolizi doğrular (eritrosit yıkımında Hgb'ye bağlanıp tükenir)." },
      ],
      comment: "AST yüksekliği + LDH >600 + haptoglobin düşüklüğü → Tennessee HELLP Sınıf 1-2 kriterleri karşılanıyor.",
    },
    "pe-renal": {
      id: "pe-renal",
      name_tr: "Renal Panel + Ürik Asit + Magnezyum",
      results: [
        { parameter: "Kreatinin",  value: 1.2,  unit: "mg/dL",  reference_range: "0.5-0.9",  flag: "H",
          interpretation: ">1.1 mg/dL ACOG ağır preeklampsi kriteri (gebelikte bazal Cr düşük olduğundan 1.1 bile anlamlı)." },
        { parameter: "BUN",        value: 22,   unit: "mg/dL",  reference_range: "7-18",      flag: "H" },
        { parameter: "Ürik asit",  value: 6.8,  unit: "mg/dL",  reference_range: "<5.5",      flag: "H",
          interpretation: ">5.5 mg/dL preeklampsi ciddiyetiyle korelasyon. Renal filtrasyon + trofoblast kaynaklı yıkım." },
        { parameter: "Mg²⁺",       value: 2.1,  unit: "mg/dL",  reference_range: "1.7-2.4",
          interpretation: "Tedavi öncesi baseline normal. MgSO4 sonrası terapötik hedef: 4-7 mEq/L (4.8-8.4 mg/dL)." },
      ],
      comment: "Kreatinin ağır özellik eşiğini geçti. MgSO4 infüzyonu başlayınca Mg düzeyi saat başı izlenir.",
    },
    "pe-coag": {
      id: "pe-coag",
      name_tr: "Koagülasyon Paneli",
      results: [
        { parameter: "INR",        value: 1.3,  unit: "",        reference_range: "0.8-1.2",  flag: "H" },
        { parameter: "aPTT",       value: 38,   unit: "sn",      reference_range: "25-35",    flag: "H" },
        { parameter: "Fibrinojen", value: 285,  unit: "mg/dL",   reference_range: "200-400",
          interpretation: "Gebelikte fibrinojen 400-600 mg/dL beklenir. 285 mg/dL göreceli düşüklük — tüketim başlıyor olabilir." },
        { parameter: "D-dimer",    value: 2.8,  unit: "µg/mL",   reference_range: "<0.5",     flag: "HH",
          interpretation: "Fibrin yıkım ürünleri artmış. HELLP + endotel hasarıyla uyumlu. DIC başlangıcı için izle." },
      ],
      comment: "Fibrinojen gebelik normunun altında + yüksek D-dimer. DIC riski — PLT düşüşüyle birlikte izle.",
    },
    "pe-urine": {
      id: "pe-urine",
      name_tr: "İdrar Protein Analizi",
      results: [
        { parameter: "Protein/Kreatinin",value: 0.85, unit: "g/g",    reference_range: "<0.3",   flag: "HH",
          interpretation: "≥0.3 anlamlı proteinüri (gebelikte). >3.5 nefrotik düzey. Bu değer ağır proteinüri." },
        { parameter: "24h Protein",      value: 5.2,  unit: "g/24h",  reference_range: "<0.3",   flag: "HH",
          interpretation: ">5g/24h ağır preeklampside görülen ağır proteinüri. Glomerüler hasar kanıtı." },
        { parameter: "Hemoglobin",       value: "+2", unit: "",        reference_range: "Negatif", flag: "H",
          interpretation: "İdrarda Hgb: hemolizin böbreklere yansıması. Hemoglobinüri HELLP'ı destekler." },
        { parameter: "Sediment",         value: "Granüler silindirler", unit: "", reference_range: "Yok",
          interpretation: "Glomerüler hasar göstergesi." },
      ],
      comment: "P/Cr 0.85 + 24h protein 5.2g → ağır proteinüri. Oligüri ile birlikte böbrek komplikasyonu riski yüksek.",
    },

    // ------------------------------------------------------------
    // s1b adımındaki "doğru" hızlı tarama tetkikleri
    // (s2b'deki pe-* panelleriyle klinik olarak tutarlı; aynı hasta,
    // daha basit/abstract panel — eğitim akışında öncelik)
    // ------------------------------------------------------------
    "tam_kan_sayimi": {
      id: "tam_kan_sayimi",
      name_tr: "Tam Kan Sayımı (TKS)",
      results: [
        { parameter: "WBC", value: 12.4, unit: "×10³/µL", reference_range: "4.5-11.0", flag: "H",
          interpretation: "Hafif lökositoz — gebelik + stres yanıtı." },
        { parameter: "Hgb", value: 9.8,  unit: "g/dL",    reference_range: "11.0-14.5", flag: "L",
          interpretation: "Anemi — mikroanjiopatik hemolitik anemi (MAHA, HELLP komponenti)." },
        { parameter: "Hct", value: 30,   unit: "%",       reference_range: "33-44",     flag: "L" },
        { parameter: "Plt", value: 78,   unit: "×10³/µL", reference_range: "150-400",   flag: "HH",
          interpretation: "Trombositopeni <100k — HELLP sendromu Tennessee kriteri 1, ağır özellik (ACOG PB 222)." },
        { parameter: "Periferik yayma — Şistosit", value: "Var (++)", unit: "", reference_range: "Yok", flag: "H",
          interpretation: "Şistositler MAHA'yı doğrular. HELLP tanısının destekleyici bulgusu." },
      ],
      comment: "Plt 78k + şistosit + Hgb düşüklüğü → HELLP'ın hematolojik üçlüsünden iki bulgu. Karaciğer enzimleriyle birlikte tanı tamamlanır.",
    },

    "karaciger_fonksiyon_testleri": {
      id: "karaciger_fonksiyon_testleri",
      name_tr: "Karaciğer Fonksiyon Testleri (KCFT)",
      results: [
        { parameter: "AST",        value: 124, unit: "U/L",   reference_range: "<35",   flag: "HH",
          interpretation: "AST >70 ağır özellik kriteri (ACOG PB 222). HELLP'ın 'EL' (elevated liver enzymes) komponenti." },
        { parameter: "ALT",        value: 98,  unit: "U/L",   reference_range: "<35",   flag: "HH" },
        { parameter: "Total bilirubin", value: 1.6, unit: "mg/dL", reference_range: "0.3-1.2", flag: "H",
          interpretation: "İndirekt hiperbilirübinemi — hemolizle uyumlu." },
        { parameter: "LDH",        value: 720, unit: "U/L",   reference_range: "140-280", flag: "HH",
          interpretation: "LDH >600 → hemoliz kanıtı (HELLP 'H' komponenti). Tennessee kriteri 3." },
        { parameter: "Haptoglobin", value: 18, unit: "mg/dL", reference_range: "30-200", flag: "L",
          interpretation: "Düşük haptoglobin — intravasküler hemoliz (MAHA)." },
        { parameter: "Albümin",    value: 3.2, unit: "g/dL",  reference_range: "3.5-5.0", flag: "L" },
        { parameter: "ALP",        value: 145, unit: "U/L",   reference_range: "30-120 (gebelikte 2× normal)" },
      ],
      comment: "AST 124 + LDH 720 + düşük haptoglobin → HELLP tam klinik tablo (H + EL). Trombositopeni ile birlikte tanı tamamlandı.",
    },

    "kreatinin": {
      id: "kreatinin",
      name_tr: "Serum Kreatinin",
      results: [
        { parameter: "Kreatinin", value: 1.3, unit: "mg/dL", reference_range: "0.5-0.9 (gebelikte)", flag: "HH",
          interpretation: "Kreatinin >1.1 (bazalsiz) → ACOG ağır özellik kriteri. Glomerüler filtrasyon azalmış. Akut böbrek hasarı (AKI) eşiğinde." },
        { parameter: "Ürik asit", value: 7.2, unit: "mg/dL", reference_range: "<5.5 (gebelikte)", flag: "H",
          interpretation: "Hiperürisemi — preeklampsi şiddet göstergesi (TJOD 2022). Glomerüler hasar ve azalmış tübüler sekresyon." },
        { parameter: "BUN",       value: 22,  unit: "mg/dL", reference_range: "8-20", flag: "H" },
      ],
      comment: "Cr 1.3 + ürik asit 7.2 → renal disfonksiyon ağır özellik kriteri. Oligüri (<500 mL/24h) gelişirse ileri renal monitörizasyon gerekir.",
    },

    "idrar_protein": {
      id: "idrar_protein",
      name_tr: "İdrar Protein (Spot + 24h)",
      results: [
        { parameter: "Dipstick protein",        value: "+++",  unit: "",       reference_range: "Negatif", flag: "HH",
          interpretation: "Yoğun proteinüri — preeklampsi tanı kriteri." },
        { parameter: "Spot Protein/Kreatinin", value: 0.85,    unit: "",       reference_range: "<0.3",   flag: "HH",
          interpretation: "≥0.3 anlamlı proteinüri (ACOG/ISSHP). >3.5 nefrotik. Bu değer ağır proteinüri sınırında." },
        { parameter: "24h idrar proteini",     value: 5.2,     unit: "g/24h",  reference_range: "<0.3",   flag: "HH",
          interpretation: ">5g/24h ağır proteinüri. ACOG 2020 ağır özellik kriterinden çıkarılmış olsa da klinik şiddet göstergesi olarak değerlidir." },
      ],
      comment: "Spot P/Cr 0.85 + 24h 5.2g → tanı kesin, ağır düzey. Tek başına ağır özellik kriteri değildir (ACOG 2020) ama diğer ağır özelliklerle (TA, semptom, lab) birleşince tablo netleşir.",
    },

    // ------------------------------------------------------------
    // s4 (MgSO4 tedavi izlemi) — magnezyum düzeyi
    // ------------------------------------------------------------
    "magnezyum_duzeyi": {
      id: "magnezyum_duzeyi",
      name_tr: "Serum Magnezyum",
      collected_at_min: 5,
      results: [
        { parameter: "Mg (baseline)", value: 1.9, unit: "mEq/L", reference_range: "1.5-2.5",
          interpretation: "Tedavi öncesi normal seviye. MgSO4 yükleme dozu sonrası 4-6h'de tekrar et." },
      ],
      comment: "MgSO4 tedavi penceresi: 4-7 mEq/L (terapötik). >9 mEq/L → patellar refleks kaybı (toksisite uyarısı). >12 mEq/L → solunum depresyonu/arrest. Klinik izlem (DTR, SS, idrar çıkışı) lab seviyesi kadar önemli — antidot: kalsiyum glukonat 1g IV.",
    },

    // ------------------------------------------------------------
    // s2b yanlış seçimleri (-10): Prokalsitonin, Troponin
    // ------------------------------------------------------------
    "prokalsitonin": {
      id: "prokalsitonin",
      name_tr: "Prokalsitonin (PCT)",
      results: [
        { parameter: "PCT", value: 0.14, unit: "ng/mL", reference_range: "<0.25",
          interpretation: "Düşük — bakteriyel sepsis kanıtı yok. Klinik tablo zaten preeklampsi/HELLP, sepsis değil. Sonuç klinik kararı değiştirmedi." },
      ],
      comment: "ACOG PB 222 + TJOD 2022: Preeklampsi tanı/yönetim algoritmasında PCT yer almaz. Korioamnionit veya sepsis ön olasılığı varsa düşünülür — bu hastada o klinik şüphe yok.",
    },

    "troponin": {
      id: "troponin",
      name_tr: "Troponin I (yüksek duyarlıklı)",
      results: [
        { parameter: "Troponin I (hs)", value: 0.018, unit: "ng/mL", reference_range: "<0.04",
          interpretation: "Normal — kardiyak iskemi yok. Bu evrede preeklampsi-ilişkili kardiyak tutulum yok. Peripartum kardiyomiyopati veya akut akciğer ödemi gelişirse anlamlı olabilir, mevcut tabloda değil." },
      ],
      comment: "Preeklampsi-ilişkili kardiyak tutulum (peripartum kardiyomiyopati, akut akciğer ödemi) ileri evrede izlenebilir. Erken tanı/yönetim aşamasında troponin rutin değil.",
    },
  },

  result_delay_seconds: {
    "pe-cbc":                       900,   // 15 dk
    "pe-lft":                       900,   // 15 dk
    "pe-renal":                     900,   // 15 dk
    "pe-coag":                     1800,   // 30 dk
    "pe-urine":                    3600,   // 60 dk (24h idrar toplama simüle)
    "tam_kan_sayimi":               900,   // 15 dk
    "karaciger_fonksiyon_testleri": 900,   // 15 dk
    "kreatinin":                    600,   // 10 dk
    "idrar_protein":               1800,   // 30 dk (spot için kısa, 24h için kavramsal)
    "magnezyum_duzeyi":             600,   // 10 dk — tedavi izlemi
    "prokalsitonin":               1800,   // 30 dk — yanlış seçim
    "troponin":                     900,   // 15 dk — yanlış seçim
  },

  lab_timeline: [
    {
      panel_id: "pe-cbc",
      at_minute: 60,
      results: [
        { parameter: "Hgb",      value: 11.3, unit: "g/dL",    reference_range: "12.0-16.0", flag: "L",
          interpretation: "Hgb düşüşü devam ediyor — hemoliz aktif." },
        { parameter: "PLT",      value: 88,   unit: "×10³/µL", reference_range: "150-400",   flag: "LL",
          interpretation: "PLT 98k → 88k: HELLP gelişimi onaylanıyor. Düşüş trendi doğum kararını güçlendiriyor." },
        { parameter: "Şistosit", value: "+",  unit: "",        reference_range: "Negatif",   flag: "H",
          interpretation: "Şistosit artışı — MAHA progrese ediyor." },
      ],
    },
    {
      panel_id: "pe-lft",
      at_minute: 60,
      results: [
        { parameter: "AST",  value: 118, unit: "U/L",   reference_range: "10-40",  flag: "HH",
          interpretation: "AST 95 → 118: Karaciğer hasarı artıyor. Kapsül gerilme ağrısı riski." },
        { parameter: "ALT",  value: 89,  unit: "U/L",   reference_range: "7-56",   flag: "HH" },
        { parameter: "LDH",  value: 742, unit: "U/L",   reference_range: "<250",   flag: "HH",
          interpretation: "LDH artışı hemolizin devam ettiğini gösteriyor." },
      ],
    },
  ],

  imaging_results: {
    "obstetric-usg": {
      id: "obstetric-usg",
      name_tr: "Obstetrik Ultrasonografi",
      modality: "us",
      view: "Transabdominal",
      interpretation:
        "Fetal biyometri 34+2 hafta uyumlu (gerçek gestasyon: 36 hafta) — IUGR şüpheli, 2 haftadan fazla geri kalma. AFI 6.2 cm (borderline oligohidramnios). Umbilikal arter Doppler: S/D oranı 3.8 (referans <3.0, artmış rezistans). Plasenta matür (Grade III).",
      findings: [
        "Fetal biyometri: 34+2 hafta uyumlu → gerçek hafta 36 → IUGR (≥2 hafta geri)",
        "AFI: 6.2 cm (borderline oligohidramnios, <5 cm kritik)",
        "Umbilikal arter Doppler: S/D 3.8 (artmış rezistans — uteroplatental yetmezlik)",
        "Pulsatilite indeksi artmış",
        "Plasenta: grade III matür",
        "Fetal aktivite azalmış",
        "Fetal anatomi değerlendirme: acil koşulda tam yapılmadı",
      ],
      timestamp_min: 10,
      attribution: "Eğitim amaçlı temsili rapor — ISUOG 2021 FGR kılavuzu kriterleri",
    },
    "nst-ctg": {
      id: "nst-ctg",
      name_tr: "NST / Kardiyotokografi",
      modality: "other",
      view: "Eksternal tokodinamometre",
      interpretation:
        "Non-reaktif NST: 20 dakika izlemde 2 yeterli akselerasyon yok (<15 bpm, <15 sn). Temel fetal kalp hızı 140-145/dk. Variabilite azalmış (minimal, 2-5 bpm). Geç deselerasyon görülmedi. Kontraksiyon yok. BPS (Biyofizik Profil Skoru) eksik — USG bulgusuyla birlikte değerlendirme gerekli.",
      findings: [
        "Reaktivite: Non-reaktif (yetersiz akselerasyon)",
        "Temel FKH: 140-145/dk (normal)",
        "Variabilite: Azalmış — minimal (2-5 bpm)",
        "Deselerasyon: Geç deselerasyon yok",
        "Kontraksiyon: Yok (uterus istirahat halinde)",
        "Yorum: Kategori II izlem — yakın CTG takibi gerekli",
      ],
      timestamp_min: 5,
      attribution: "Eğitim amaçlı temsili rapor — ACOG 2009 CTG 3-tier sınıflaması",
    },
  },

  scoring: {
    max_points: 285,
    passing_score: 185,
    grade_bands: { A: 250, B: 215, C: 185, D: 140 },
  },

  debrief: {
    key_learnings: [
      "Ağır preeklampsi kriterleri: SBP≥160 veya DBP≥110, trombositopeni <100k, kreatinin >1.1, AST/ALT 2×üst normal, şiddetli baş ağrısı/görme bozukluğu.",
      "MgSO4: ACOG class I A — nöbet profilaksisi ve eklamptik nöbet tedavisinde altın standart.",
      "MgSO4 takibi: patellar refleks, SS, idrar çıkışı. Toksisite antidotu: kalsiyum glukonat.",
      "Antihipertansif: labetalol IV, hidralazin IV, veya oral nifedipin. ACE inhibitörleri KESİN KONTRENDİKE.",
      "≥34 hafta + ağır preeklampsi = DOĞUM ZAMANI. Bekleme perinatal sonucu iyileştirmez, maternal riski artırır.",
    ],
    references: [
      "ACOG Practice Bulletin 222 (2020) — Gestational Hypertension and Preeclampsia",
      "WHO Recommendations for Prevention and Treatment of Pre-eclampsia and Eclampsia (2023)",
      "Türk Jinekoloji ve Obstetri Derneği Preeklampsi Kılavuzu 2022",
      "ISSHP Classification 2021",
    ],
    red_flags: [
      "Eklampsi başlarsa: sol lateral, hava yolu açıklığı, O₂, MgSO4 2-4 g IV bolus",
      "MgSO4 toksisitesi: refleks kaybı → infüzyon durdur, kalsiyum glukonat 1 g IV",
      "HELLP sendromu: Plt <100k + AST yüksek + hemoliz → 24-48 saat içinde doğum",
      "Maternal bradikardi labetalol sonrası → doz azalt, atropin hazır tut",
    ],
    next_scenarios: ["kadin_dogum-hellp-001", "kadin_dogum-postpartum-kanama-001"],
  },
};
