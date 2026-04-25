// ============================================================
// MediSim TR — Kardiyojenik Şok Senaryosu
// ============================================================
// Klinik referans: ESC 2023 Akut KY kılavuzu, AHA Cardiogenic
// Shock 2022 Scientific Statement, SCAI Shock Classification
// (A-B-C-D-E stages).
// Ana öğretim: şok tanıma, vazopressor/inotrop seçimi, mekanik
// destek kararı, STEMI komplikasyonu tanıma.
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_kardiyojenik_sok: Scenario = {
  id: "kardi-kardiyojenik-sok-001",
  version: "0.1.0",
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
  last_updated: "2026-04-24",

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

  scoring: {
    max_points: 220,
    passing_score: 130,
    grade_bands: {
      A: 185,
      B: 160,
      C: 130,
      D: 95,
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
