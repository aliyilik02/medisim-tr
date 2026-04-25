// ============================================================
// MediSim TR — Akut İskemik İnme Senaryosu
// ============================================================
// Klinik referans: 2026 AHA/ASA AIS kılavuzu (Mart 2025'e kadar
// kanıt taraması), Türk Nöroloji Derneği tPA önerileri.
// Ana öğretim hedefi: zaman penceresi (4.5 saat), NIHSS, BT sonrası
// tromboliz kararı, kontrendikasyon denetimi.
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_iskemik_inme: Scenario = {
  id: "acil-iskemik-inme-001",
  version: "0.1.0",
  title: "72 Yaş Kadın — Ani Gelişen Sağ Hemipleji",
  description:
    "Kahvaltı esnasında sağ kolunu kaldıramamaya başlayan hasta. Konuşmada peltekleşme. İlk tıbbi temasa 90. dakika. Akut iskemik inme tanı, zaman penceresi değerlendirmesi ve tPA kararı.",
  specialty: "acil",
  tags: ["inme", "stroke", "tPA", "alteplaz", "nöroloji", "acil"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 14,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-24",

  patient: {
    age: 72,
    sex: "F",
    weight_kg: 68,
    height_cm: 160,
    chief_complaint:
      "90 dakika önce kahvaltıda aniden sağ kolum tutmaz oldu, konuşmam bozuldu.",
    history_items: [
      "Hipertansiyon (10 yıl, amlodipin 10 mg/gün)",
      "Atriyal fibrilasyon (3 yıl, rivaroksaban 20 mg/gün — son dozu dün sabah)",
      "Tip 2 DM (metformin 1000 mg 2x1)",
      "Sigara öyküsü yok",
    ],
    allergies: [],
    current_medications: ["amlodipin", "rivaroksaban", "metformin"],
    modifiers: {
      bobrek_yetm: false,
      karaciger_yetm: false,
      beta_blocker: false,
    },
  },

  // ⚠️ Kritik klinik bağlam: rivaroksaban son dozu <48 saat ise tPA kontrendike
  // (AHA/ASA 2026). Hastanın öyküsü özellikle zor bir karar yaratır.

  initial_vitals: {
    hr: 96,
    bp_systolic: 178,
    bp_diastolic: 98,
    spo2: 96,
    temp: 36.6,
    rr: 18,
    gcs: 14, // Bilinç açık, oriyante; dizartri nedeniyle tam 15 değil
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
    "nihss_formu",
  ],

  ekg_pattern: "normal",

  start_step_id: "step-1",

  steps: [
    // ===== ADIM 1 =====
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
          feedback: "Monitörizasyon, aritmi takibi ve AF saptanması için şart.",
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 15,
          feedback:
            "Hipoglisemi inmeyi taklit eder — KŞ < 60 ise tedavi ilk öncelik. Rehber: inme değerlendirmesinde glukoz zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter" },
          points: 10,
          feedback: "İki geniş lümenli IV yol (tPA + sıvı + acil ilaç).",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 5,
          feedback: "SpO2 > %94 hedefli. Rutin oksijen önerilmez.",
        },
        {
          action: { type: "examine", target_id: "nihss" },
          points: 20,
          feedback:
            "NIHSS hem tanı hem tedavi kararı için zorunlu (AHA/ASA Sınıf I).",
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

    // ===== ADIM 2 =====
    {
      id: "step-2",
      kind: "decision",
      title: "NIHSS: 14. Sonraki kritik adım?",
      prompt:
        "NIHSS 14 (orta-ciddi). Dizartri, sağ üst ekstremite 2/5, sağ alt 3/5, sağ homonim hemianopi. KŞ 138 mg/dL. İlk 20 dakikada hangi tetkik mutlaka yapılmalı?",
      options: [
        {
          id: "opt-bt",
          text: "Kontrastsız beyin BT",
          correct: true,
          points: 25,
          feedback:
            "✓ Doğru. İntrakraniyal kanamayı dışlamak için ilk 20 dakikada kontrastsız BT zorunlu (AHA/ASA Sınıf I). Penumbra değerlendirmesi için perfüzyon BT eklenebilir ama ilk öncelik kanamayı ekarte etmek.",
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
          text: "BT anjiyografi (önce)",
          correct: false,
          points: -3,
          feedback:
            "Mekanik trombektomi adayı için yararlı ama ilk sıra kontrastsız BT. BT anjio sonraki adım.",
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

    // ===== ADIM 3 =====
    {
      id: "step-3",
      kind: "info",
      title: "BT sonucu",
      prompt: "",
      content:
        "Kontrastsız BT: Akut kanama yok. Erken iskemik değişiklik sol MCA sulama alanında ASPECTS 8. BT anjio: sol MCA M1 segmentinde tıkanıklık. Zaman: semptom başlangıcından 110 dakika.",
    },

    // ===== ADIM 4 — Zorlu tPA kararı =====
    {
      id: "step-4",
      kind: "decision",
      title: "tPA kararı",
      prompt:
        "Hasta rivaroksaban 20 mg/gün kullanıyor, son doz dün sabah (≈24 saat önce). NIHSS 14, BT'de kanama yok, MCA M1 tıkanıklığı. tPA (alteplaz veya tenekteplaz) verir misiniz?",
      options: [
        {
          id: "opt-tpa-ver",
          text: "Evet, IV alteplaz 0.9 mg/kg hemen başla",
          correct: false,
          points: -25,
          feedback:
            "✗ TEHLİKELİ. Rivaroksaban son dozu <48 saat önce alındıysa tPA kontrendike (AHA/ASA 2026). Anti-Xa düzeyi bilinmeden verilmesi intrakraniyal kanama riski yüksek.",
          critical: true,
        },
        {
          id: "opt-tnk-ver",
          text: "Tenekteplaz 0.25 mg/kg (maks 25 mg) tek bolus",
          correct: false,
          points: -25,
          feedback:
            "✗ Aynı gerekçe. DOAC kullanan hastada her iki tromboliz de kontrendike.",
          critical: true,
        },
        {
          id: "opt-trombektomi",
          text: "Tromboliz yapma — mekanik trombektomi için nöroradyolojiye yönlendir",
          correct: true,
          points: 35,
          feedback:
            "✓ DOĞRU. DOAC ≤48 saat → tromboliz kontrendike, ancak mekanik trombektomi hâlâ uygun. M1 tıkanıklığı + NIHSS ≥6 + 6 saat içinde EVT Sınıf I endikasyon. Hızlı transfer hayat kurtarır.",
        },
        {
          id: "opt-antikoagulan-rev",
          text: "Andeksanet alfa ile rivaroksaban antagonize et, sonra tPA",
          correct: false,
          points: -10,
          feedback:
            "Andeksanet + tPA güvenliği gösterilmemiştir, rutin önerilmez. Doğru yol mekanik trombektomi.",
          min_difficulty: 4,
        },
      ],
    },

    // ===== ADIM 5 — Kan basıncı yönetimi =====
    {
      id: "step-5",
      kind: "action",
      title: "Transfer öncesi kan basıncı yönetimi",
      prompt:
        "Hasta trombektomi merkezine transfer edilecek. TA 178/98. Ne yaparsın?",
      min_actions: 1,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "labetolol" },
          points: 20,
          feedback:
            "✓ EVT öncesi TA hedef <185/110. IV labetolol 10-20 mg bolus uygun. (AHA/ASA Sınıf I)",
        },
        {
          action: { type: "give_medication", target_id: "nikardipin" },
          points: 18,
          feedback:
            "✓ IV nikardipin 5 mg/saat başla, 2.5 mg/saat artır. Labetolola alternatif.",
        },
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: -15,
          feedback:
            "✗ EVT planı varsa aspirin ertelenir. Anti-agregan işlem sonrası başlar.",
          critical: true,
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "mannitol" },
          points: -10,
          feedback:
            "Mannitol rutin önerilmez; herniasyon bulguları yok. Boş yere yapıldı.",
        },
      ],
      default_wrong_penalty: -3,
    },

    // ===== ADIM 6 — Sadece zorluk 4 için ek soru =====
    {
      id: "step-6",
      kind: "decision",
      title: "EVT sonrası reperfüzyon yönetimi",
      prompt:
        "Mekanik trombektomi başarılı (TICI 2b). Hastanın 24 saat izleminde en kritik 3 husus nedir?",
      min_difficulty: 4,
      allow_multiple: true,
      partial_credit: true,
      options: [
        {
          id: "opt-ta",
          text: "Kan basıncı <180/105, dalgalanmayı önle",
          correct: true,
          points: 15,
          feedback: "✓ Reperfüzyon hemoraji riskini sıkı TA kontrolü azaltır.",
        },
        {
          id: "opt-nihss",
          text: "Seri NIHSS takibi (her saat ilk 8 saat)",
          correct: true,
          points: 15,
          feedback:
            "✓ Erken nörolojik kötüleşme rekanalizasyon kayıp veya hemoraji işaretidir.",
        },
        {
          id: "opt-bt-24",
          text: "24. saat kontrol BT — hemorajik dönüşüm?",
          correct: true,
          points: 10,
          feedback:
            "✓ Antitrombotik başlamadan önce hemorajik dönüşümü ekarte zorunlu.",
        },
        {
          id: "opt-trombolitik",
          text: "IV tPA trombektomi sonrası verilmeli",
          correct: false,
          points: -10,
          feedback:
            "✗ Başarılı EVT sonrası ek tromboliz rutin önerilmez, kanama riski.",
        },
        {
          id: "opt-heparin",
          text: "Heparin infüzyonu başla",
          correct: false,
          points: -10,
          feedback:
            "✗ Akut inme sonrası rutin heparin önerilmez; hemoraji riski.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 200,
    passing_score: 120,
    grade_bands: {
      A: 170,
      B: 145,
      C: 120,
      D: 90,
    },
    time_bonus: {
      target_seconds: 600,
      bonus_points: 10,
    },
  },

  debrief: {
    key_learnings: [
      "Zaman beyindir: son normal görülme saatinden 4.5 saat içinde tPA, 6-24 saat içinde seçilmiş hastalara EVT.",
      "İlk 20 dakikada kontrastsız BT zorunlu — kanamayı ekarte etmek tPA kararının ön şartı.",
      "NIHSS ≥6 + büyük damar tıkanıklığı (M1/ICA/baziller) → mekanik trombektomi endikasyonu.",
      "DOAC (rivaroksaban, apiksaban, dabigatran) son dozu ≤48 saat ise tromboliz KONTRENDİKE; ancak EVT hâlâ uygun.",
      "Tromboliz öncesi TA <185/110; trombolize uygun değilse EVT öncesi aynı hedef.",
      "Kan şekeri ölçümü zorunlu — hipoglisemi inmeyi taklit eder, tedavisi farklıdır.",
      "2026 AHA/ASA: Tenekteplaz 0.25 mg/kg (maks 25 mg) alteplaza alternatif — tek bolus, iş akışı kolaylığı.",
    ],
    references: [
      "2026 AHA/ASA Akut İskemik İnme Erken Yönetim Kılavuzu",
      "Türk Nöroloji Derneği — İnme Tanı ve Tedavi Rehberi 2023",
      "ESO 2021 Guidelines — Intravenous Thrombolysis",
      "HERMES meta-analizi (Lancet 2016) — EVT kanıt temeli",
    ],
    red_flags: [
      "Son normal görülme saatinden >4.5 saat geçmişse kör şekilde tPA verme — perfüzyon görüntüleme kararı değiştirebilir.",
      "DOAC kullanımı, INR >1.7 (warfarin), trombosit <100.000 → tromboliz kontrendikasyonları.",
      "Bilinen intrakraniyal neoplazm, son 3 ay içinde baş travması veya inme → tPA yasak.",
      "Kan şekeri <50 mg/dL veya >400 mg/dL → düzeltmeden değerlendirme yanıltıcı.",
      "NIHSS tek başına yeterli değil — hafif inme bile disabling defisit yaratıyorsa tPA düşünülür.",
    ],
    next_scenarios: ["dahi-dka-001"],
  },
};
