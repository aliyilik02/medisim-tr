import type { Scenario } from "@/engine";

export const scenario_stemi: Scenario = {
  id: "kardiyoloji-stemi-001",
  version: "0.1.0",
  title: "62 Yaş Erkek — Akut Göğüs Ağrısı",
  description:
    "2 saattir süren retrosternal göğüs ağrısı, sol kola yayılan. STEMI yönetimi ve reperfüzyon kararı.",
  specialty: "kardiyoloji",
  tags: ["stemi", "acil", "kardiyak", "ekg", "reperfüzyon"],
  difficulty: 3,
  estimated_minutes: 15,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-22",

  patient: {
    age: 62,
    sex: "M",
    weight_kg: 84,
    height_cm: 174,
    chief_complaint:
      "2 saat önce başlayan, sol kola yayılan, sıkıştırıcı göğüs ağrısı. İstirahatte geçmiyor.",
    history_items: [
      "HT (20 yıl, düzensiz ilaç kullanımı)",
      "DM Tip 2 (8 yıl, metformin)",
      "30 paket-yıl sigara",
      "Babası 58 yaşında MI'dan ex",
    ],
    allergies: [],
    current_medications: ["Metformin 1000 mg 2x1", "Ramipril 5 mg 1x1"],
  },

  initial_vitals: {
    hr: 104,
    bp_systolic: 148,
    bp_diastolic: 92,
    spo2: 94,
    temp: 36.7,
    rr: 22,
    pain: 8,
    glucose: 186,
    gcs: 15,
  },

  available_medications: [
    "aspirin",
    "klopidogrel",
    "heparin",
    "nitrogliserin",
    "metoprolol",
    "morfin",
    "fentanil",
    "tenecteplase",
    "atropin",
    "adrenalin",
  ],

  available_equipment: [
    "ekg_12",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "monitor",
    "oksijen_maske",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "defibrilator",
    "stetoskop",
  ],

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta acil servise geldi. İlk 2 dakikada yapılması gerekenleri seçin.",
      narrative:
        "Hasta soluk, terli ve ağrılı görünüyor. Taşikardik. Sağ kolda tansiyon ölçülüyor.",
      min_actions: 3,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback: "Doğru — hasta monitörize edildi. Sürekli ritim takibi başladı.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback: "Doğru — SpO₂ sürekli ölçümü açıldı.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 20,
          feedback:
            "Doğru — ilk 10 dakikada 12 derivasyonlu EKG zorunlu (AHA/ESC).",
          unlocks: ["s2_ekg_yorumu"],
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "Doğru — geniş bir damar yolu açıldı.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 5,
          feedback:
            "SpO₂ 94%, sınırda. O₂ verildi ama rutin değil; hipoksi yoksa gereksiz.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu aksiyon ilk 2 dakikanın önceliği değil. Önce A-B-C ve EKG.",
    },

    {
      id: "s2_ekg_yorumu",
      kind: "decision",
      title: "EKG Yorumu",
      prompt: "EKG çıktısını değerlendirin.",
      narrative: "V1-V4 derivasyonlarında belirgin ST elevasyonu mevcut.",
      display: {
        type: "ecg",
        asset: "ecg_anterior_stemi.png",
        caption: "12 derivasyonlu EKG (25 mm/sn, 10 mm/mV)",
      },
      options: [
        {
          id: "opt_anterior_stemi",
          text: "Anterior STEMI (V1-V4 ST elevasyonu)",
          correct: true,
          points: 30,
          feedback:
            "Doğru tanı. Anterior STEMI — LAD oklüzyonu muhtemel. Acil reperfüzyon endikasyonu.",
        },
        {
          id: "opt_nstemi",
          text: "NSTEMI",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — ST elevasyonu açıkça var, bu STEMI'dir. NSTEMI'de ST elevasyonu olmaz.",
        },
        {
          id: "opt_perikardit",
          text: "Akut perikardit",
          correct: false,
          points: -10,
          feedback:
            "Perikarditte ST elevasyonu diffüz ve konkav olur. Burada lokalize (anterior), konveks — STEMI.",
        },
        {
          id: "opt_erken_repolarizasyon",
          text: "Erken repolarizasyon varyantı",
          correct: false,
          points: -20,
          feedback:
            "Klinik tablo (ağrı + risk faktörleri) ile uyumsuz. Asla STEMI'yi erken repolarizasyona bağlama.",
        },
      ],
    },

    {
      id: "s3_ilk_tedavi",
      kind: "action",
      title: "İlk Tıbbi Tedavi",
      prompt:
        "STEMI tanısı kondu. Reperfüzyon öncesi verilecek ilaçları seçin.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: 20,
          feedback:
            "Doğru — 300 mg ASA çiğnetilerek, class I endikasyon (tüm kılavuzlar).",
        },
        {
          action: { type: "give_medication", target_id: "klopidogrel" },
          points: 20,
          feedback:
            "Doğru — ikili antiplatelet için P2Y12 inhibitörü. Yükleme dozu 600 mg PCI planlıysa.",
        },
        {
          action: { type: "give_medication", target_id: "heparin" },
          points: 15,
          feedback:
            "Doğru — reperfüzyon öncesi antikoagülasyon. Kiloya göre bolus.",
        },
        {
          action: { type: "give_medication", target_id: "nitrogliserin" },
          points: 5,
          feedback:
            "Ağrı için sublingual verilebilir, ancak hipotansiyon varsa kontrendike.",
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback:
            "Rutin önerilmiyor (CRUSADE çalışması). Nitrata rağmen dirençli ağrıda düşünülür. Erken tercih değildir.",
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -15,
          critical: true,
          feedback:
            "DİKKAT — STEMI'nin erken fazında IV beta-bloker hemodinamik bozulma riski taşır (COMMIT). Tercihen erken dönemde verilmez.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Reperfüzyon öncesi standart tedavide yer almıyor.",
    },

    {
      id: "s4_reperfuzyon_karari",
      kind: "decision",
      title: "Reperfüzyon Stratejisi",
      prompt:
        "Hastaneniz PCI merkezine 45 dakika uzakta. Ağrı başlangıcından 2 saat geçti. Ne yaparsınız?",
      options: [
        {
          id: "opt_pci_transfer",
          text:
            "Primer PCI için transfer — kapı-balon < 120 dk hedefiyle acil sevk",
          correct: true,
          points: 30,
          feedback:
            "Doğru — ilk tıbbi temastan PCI'ye <120 dk sağlanabiliyorsa primer PCI tercih edilir (ESC 2023).",
        },
        {
          id: "opt_tromboliz",
          text: "Hemen tromboliz (tenekteplaz) yap",
          correct: false,
          points: 10,
          feedback:
            "Geçerli bir seçenek — ancak PCI <120 dk sağlanabilirse PCI önceliklidir. Trombolizde puan daha düşük.",
        },
        {
          id: "opt_bekle",
          text: "Medikal tedaviyle izle, ağrı geçerse taburcu et",
          correct: false,
          points: -40,
          feedback:
            "KRİTİK HATA — STEMI'de reperfüzyon yapılmadan hasta izlenemez. Mortalite riski çok yüksek.",
        },
        {
          id: "opt_koroner_yogun",
          text:
            "Koroner yoğun bakıma yatış, sabah kateter laboratuvarına gönder",
          correct: false,
          points: -35,
          feedback:
            "Hatalı — STEMI zaman kritik. 'Time is muscle.' Sabaha ertelenemez.",
        },
      ],
    },

    {
      id: "s5_transfer_oncesi",
      kind: "action",
      title: "Transfer Öncesi Stabilizasyon",
      prompt: "PCI transferi başlamadan önce son kontrol.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "defibrilator" },
          points: 15,
          feedback:
            "Doğru — VT/VF riski yüksek. Defibrilatör hazır olmalı, pedler yapıştırılmalı.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — transfer boyunca monitörizasyon sürsün.",
        },
        {
          action: { type: "examine", target_id: "vitaller" },
          points: 10,
          feedback: "Doğru — transfer öncesi son vital kontrolü şart.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Transfer öncesi bu aksiyon öncelik değil.",
    },
  ],

  scoring: {
    max_points: 200,
    passing_score: 120,
    grade_bands: {
      A: 170,
      B: 145,
      C: 120,
      D: 95,
    },
  },

  debrief: {
    key_learnings: [
      "STEMI'de ilk 10 dakikada 12 derivasyonlu EKG zorunludur.",
      "Anterior STEMI (V1-V4) LAD oklüzyonunu gösterir ve yüksek mortalitelidir.",
      "Kapı-balon süresi <120 dk sağlanabiliyorsa primer PCI tromboliz üzerine tercih edilir.",
      "İkili antiplatelet (ASA + P2Y12) + antikoagülan reperfüzyon öncesi standart.",
      "Erken dönemde IV beta-bloker hemodinamik olarak stabil olmayan hastalarda riskli.",
      "Morfin rutin değil — CRUSADE çalışması mortalite artışı göstermiştir.",
    ],
    references: [
      "ESC 2023 STEMI Yönetim Kılavuzu",
      "TKD Akut Koroner Sendrom Kılavuzu 2022",
      "AHA/ACC 2022 STEMI Guidelines",
    ],
    red_flags: [
      "Hipotansiyon (sağ ventrikül MI? Kardiyojenik şok?)",
      "Yeni geliştirdiği sol dal bloğu (STEMI eşdeğeri)",
      "VT/VF — hemen defibrilasyon",
    ],
    next_scenarios: ["kardiyoloji-kardiyojenik-sok-001"],
  },
};
