import type { Scenario } from "@/engine";

// ============================================================
// STEMI Senaryosu — Anterior STEMI, 62y Erkek
// ============================================================
// Zorluk seviyeleri 1-5 destekli.
// S1-2: Temel tanı ve ABCDE, ASA+P2Y12+heparin+PCI
// S3:   + Aort diseksiyonu ekartasyonu, kapı-balon hesabı, EKG nüansları
// S4-5: + Tikagrelor/prasugrel seçimi, sağ ventrikül/posterior MI kontrolü,
//         PCI sonrası yönetim (DAPT, statin, ACEi), komplikasyon dalı
// ============================================================

export const scenario_stemi: Scenario = {
  id: "kardiyoloji-stemi-001",
  version: "0.2.0", // Yeni motor uyumlu
  title: "62 Yaş Erkek — Akut Göğüs Ağrısı (STEMI)",
  description:
    "2 saattir süren retrosternal göğüs ağrısı, sol kola yayılan. STEMI yönetimi ve reperfüzyon kararı.",
  specialty: "kardiyoloji",
  tags: ["stemi", "acil", "kardiyak", "ekg", "reperfüzyon"],
  difficulty: 3,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 15,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2023, AHA/ACC 2022, TKD 2022 uyumlu",
  last_updated: "2026-04-23",

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
    modifiers: {
      // Farmakoloji motoru için: hasta herhangi bir özel çarpan durumunda değil.
      // (ACEi kullanımı klasik modifier'a girmez)
    },
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
    "tikagrelor",        // S4-5
    "prasugrel",         // S4-5
    "heparin",
    "enoksaparin",       // S3+
    "nitrogliserin",
    "metoprolol",
    "morfin",
    "fentanil",
    "tenecteplase",
    "atropin",
    "adrenalin",
    "amiodaron",         // VT/VF dalı için
    "lidokain",          // VT alternatifi
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

  ekg_pattern: "stemi",

  medication_timing_overrides: {
    aspirin:       { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    klopidogrel:   { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    tikagrelor:    { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    prasugrel:     { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    heparin:       { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    enoksaparin:   { onset_sec: 3, peak_min: 0.25,  duration_min: 0.75 },
    nitrogliserin: { onset_sec: 2, peak_min: 0.133, duration_min: 0.5  },
    metoprolol:    { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    morfin:        { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    fentanil:      { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    tenecteplase:  { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    atropin:       { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    adrenalin:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    amiodaron:     { onset_sec: 2, peak_min: 0.133, duration_min: 0.5  },
    lidokain:      { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
  },

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ========================================================
    // ADIM 1 — İlk değerlendirme (tüm seviyelerde)
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "62 yaş erkek, 2 saat önce başlayan göğüs ağrısı. Acile yeni geldi. İlk 5 dakikada ne yapacaksın?",
      narrative:
        "Hasta soluk, terli ve ağrılı görünüyor. Taşikardik. Sağ kolda tansiyon ölçülüyor.",
      min_actions: 3,
      max_actions: 8,
      expected_outcomes: [
        // ── Yüksek öncelik (monitörizasyon, EKG, damar yolu) ──────────
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "✓ Kardiyak monitörizasyon — sürekli ritim ve aritmi takibi şart.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback: "✓ SpO₂ sürekli ölçümü açıldı.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 20,
          feedback:
            "✓ ESC 2023 Class I — ilk 10 dakikada 12 derivasyonlu EKG zorunlu.",
          unlocks: ["s2_ekg_yorumu"],
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "✓ Geniş lümenli IV yol — ilaç ve sıvı için.",
        },
        // SpO2 %94 — seviyeye göre iki ayrı outcome
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 5,
          feedback:
            "O₂ verildi. SpO₂ sınırda, başlangıç seviyesinde kabul edilebilir refleks.",
          max_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 0,
          feedback:
            "SpO₂ %94 — rutin O₂ endike değil (AVOID trial, ESC 2023). Hipoksi (<90%) yoksa gereksiz, hatta zararlı olabilir.",
          min_difficulty: 3,
        },
        // Aort diseksiyonu ekartasyonu (S3+)
        {
          action: { type: "examine", target_id: "bilateral_kol_tansiyon" },
          points: 10,
          feedback:
            "✓ Aort diseksiyonu ekartasyonu için iki kolda TA farkı (>20 mmHg) değerlendirilmeli.",
          min_difficulty: 3,
        },
        {
          action: { type: "examine", target_id: "nabiz_muayenesi" },
          points: 8,
          feedback:
            "✓ Nabız asimetrisi ve radyofemoral gecikme diseksiyon için önemli ipucu.",
          min_difficulty: 4,
        },
        // ── Klinik olarak doğru ama ana adım değil (antiplatelet/antikoagülan) ──
        {
          action: { type: "give_medication", target_id: "aspirin" },
          points: 10,
          feedback:
            "✓ ESC 2023 Class I — aspirin 150-300 mg çiğneme STEMI şüphesinde ilk temasta verilir. Erken ama doğru.",
        },
        {
          action: { type: "give_medication", target_id: "klopidogrel" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil. (S3-4'te tikagrelor/prasugrel tercih edilir.)",
        },
        {
          action: { type: "give_medication", target_id: "tikagrelor" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil.",
        },
        {
          action: { type: "give_medication", target_id: "prasugrel" },
          points: 5,
          feedback:
            "✓ P2Y12 yüklemesi reperfüzyon öncesi yapılır. Bu adımda erken ama klinik olarak yanlış değil. DİKKAT: İnme öyküsü ve 75+ yaşta kontrendike.",
        },
        {
          action: { type: "give_medication", target_id: "heparin" },
          points: 5,
          feedback:
            "✓ Antikoagülan reperfüzyon öncesi standart. Bu adımda erken ama klinik olarak makul.",
        },
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: 5,
          feedback:
            "✓ Antikoagülan reperfüzyon öncesi standart. Bu adımda erken ama klinik olarak makul.",
        },
        // ── Klinik olarak yanlış veya zararlı ─────────────────────────
        {
          action: { type: "give_medication", target_id: "lidokain" },
          points: -10,
          feedback:
            "✗ STEMI'de profilaktik lidokain ÖNERİLMEZ (ESC 2023). Sadece sürekli VT/VF varlığında — hasta şu an stabil.",
          critical: true,
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback:
            "✗ Morfin rutin değil — CRUSADE: mortalite artışı. Nitrata dirençli ağrıda düşünülür. Henüz nitrat denenmeden erken.",
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -5,
          feedback:
            "✗ Erken IV beta-bloker ilk değerlendirmede öncelik değil. COMMIT: kardiyojenik şok riski. Hemodinamik stabilizasyon sonrası oral form düşünülür.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -3,
          feedback:
            "Erken IV beta-bloker tartışmalı. COMMIT: kardiyojenik şok riskini artırır. İlk değerlendirmede öncelik değil.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "Bu adımda klinik öncelik değil. Sıralama önemli — önce monitör, EKG, damar yolu.",
    },

    // ========================================================
    // ADIM 2 — EKG yorumu (tüm seviyelerde, nüanslar seviyeye göre)
    // ========================================================
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
          id: "opt_anterior_stemi_lad_proksimal",
          text:
            "Anterior STEMI — proksimal LAD (V1-V4 + aVR ST elevasyonu, I/II resiprok)",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — proksimal LAD oklüzyonu daha agresif yaklaşım gerektirir, mortalite yüksek.",
          min_difficulty: 4,
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

    // ========================================================
    // ADIM 2b — Ek derivasyon kontrolü (S3+)
    // ========================================================
    {
      id: "s2b_ek_derivasyonlar",
      kind: "decision",
      title: "Ek Derivasyon Kontrolü",
      prompt:
        "Anterior STEMI tanısı için ek derivasyonlardan hangisini incelersiniz?",
      narrative:
        "Anterior STEMI'de sağ ventrikül ve posterior duvar tutulumu mortalite/tedavi stratejisini değiştirir.",
      min_difficulty: 3,
      options: [
        {
          id: "opt_v4r",
          text:
            "V4R (sağ prekordiyal) — sağ ventrikül MI ekartasyonu için",
          correct: true,
          points: 15,
          feedback:
            "Doğru — özellikle inferior MI + hipotansiyon varsa V4R ST elevasyonu sağ ventrikül tutulumunu gösterir. Anterior MI'da da proksimal LAD'de görülebilir.",
        },
        {
          id: "opt_v7_v9",
          text: "V7-V9 (posterior) — posterior duvar tutulumu için",
          correct: true,
          points: 12,
          feedback:
            "Doğru — V1-V3'te ST depresyonu varsa posterior MI şüphesi. V7-V9'da ST elevasyonu tanıyı koyar.",
        },
        {
          id: "opt_hic",
          text: "Ek derivasyon gerekli değil, tanı net",
          correct: false,
          points: -8,
          feedback:
            "Yetersiz — tedavi kararı ek derivasyonlara göre değişebilir (sağ ventrikül MI'da nitrat dikkatli, inferior pattern'de RCA/LCX ayrımı için).",
        },
      ],
    },

    // ========================================================
    // ADIM 3 — İlk tıbbi tedavi
    // ========================================================
    {
      id: "s3_ilk_tedavi",
      kind: "action",
      title: "İlk Tıbbi Tedavi",
      prompt:
        "STEMI tanısı kondu. Reperfüzyon öncesi verilecek ilaçları seçin.",
      min_actions: 3,
      expected_outcomes: [
        // ASA — her seviyede
        {
          action: {
            type: "give_medication",
            target_id: "aspirin",
            dose: "300 mg",
          },
          points: 20,
          feedback:
            "Doğru — 300 mg ASA çiğnetilerek, class I endikasyon (tüm kılavuzlar).",
        },
        // P2Y12 — Klopidogrel (her seviye) vs tikagrelor/prasugrel (S4-5)
        {
          action: {
            type: "give_medication",
            target_id: "klopidogrel",
            dose: "600 mg",
          },
          points: 15,
          feedback:
            "Doğru — P2Y12 inhibitörü. Yükleme 600 mg PCI planlıysa. Seviye 4-5'te tikagrelor/prasugrel de seçenek.",
          max_difficulty: 3,
        },
        {
          action: {
            type: "give_medication",
            target_id: "klopidogrel",
            dose: "600 mg",
          },
          points: 10, // Düşürüldü: S4-5'te tikagrelor/prasugrel tercih edilmeli
          feedback:
            "Kabul edilebilir ama ESC 2023'te ACS'de tikagrelor veya prasugrel klopidogrele tercih edilir (class I). Klopidogrel: tikagrelor/prasugrel mevcut değilse veya kontrendike ise.",
          min_difficulty: 4,
        },
        {
          action: {
            type: "give_medication",
            target_id: "tikagrelor",
            dose: "180 mg",
          },
          points: 20,
          feedback:
            "Doğru — ESC 2023 class I, ACS'de klopidogrele üstün (PLATO). Yükleme 180 mg.",
          min_difficulty: 4,
        },
        {
          action: {
            type: "give_medication",
            target_id: "prasugrel",
            dose: "60 mg",
          },
          points: 20,
          feedback:
            "Doğru — primer PCI planlanan STEMI'de tikagrelor ile eşdeğer (class I). DİKKAT: İnme öyküsü veya 75+ yaş → kontrendike/dikkatli.",
          min_difficulty: 4,
        },
        // Antikoagülan
        {
          action: {
            type: "give_medication",
            target_id: "heparin",
            dose: "5000 IU",
          },
          points: 15,
          feedback:
            "Doğru — reperfüzyon öncesi antikoagülasyon. 60 IU/kg bolus (bu hastada 84×60=5040, max 4000 IU; yaklaşık 5000 IU klinik kabul).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "enoksaparin",
          },
          points: 12,
          feedback:
            "Kabul — özellikle tromboliz planlanıyorsa tercih edilebilir. Primer PCI'de heparin daha yaygın.",
          min_difficulty: 3,
        },
        // Nitrogliserin — konteks-bağımlı
        {
          action: { type: "give_medication", target_id: "nitrogliserin" },
          points: 5,
          feedback:
            "Ağrı için sublingual verilebilir. Hasta normotansif (SBP 148), güvenli. Sağ ventrikül MI ekarte edilmişse daha güvenli.",
        },
        // Morfin — koşullu (nitrattan önce: -5; sonrası dirençli ağrı: +5)
        // Basit versiyon: şimdi -5 (dirençli ağrı kontrolü sonraki adımda)
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -5,
          feedback:
            "Önce nitrat denenmeli. Rutin morfin önerilmiyor (CRUSADE, mortalite↑). Nitrata dirençli ağrıda ek olarak düşünülür.",
        },
        // Metoprolol — erken IV beta-bloker
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -5, // Eskiden -15, kritik değil
          feedback:
            "Tartışmalı — hasta stabil (HR 104, SBP 148), mutlak kontrendike değil ama öncelik yok (COMMIT). PCI sonrası oral beta-bloker rutin, erken IV sadece refrakter iskemi/hipertansiyonda.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "metoprolol" },
          points: -3,
          feedback:
            "Tartışmalı ve zamanlaması önemli. COMMIT: erken IV beta-bloker kardiyojenik şok riskini artırır. Hemodinamik stabilse oral form gün içinde düşünülebilir. Seviye 3+ için: klinik yargı.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Reperfüzyon öncesi standart tedavide yer almıyor.",
    },

    // ========================================================
    // ADIM 4 — Reperfüzyon kararı (tüm seviyelerde)
    // ========================================================
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
          id: "opt_pci_hesapla",
          text:
            "Kapı-balon süresini hesapla: 45 dk yol + ~30 dk hastane işlemi = 75 dk. <120 dk uygun, PCI için transfer.",
          correct: true,
          points: 35,
          feedback:
            "Mükemmel — klinik muhakeme doğru. İlk tıbbi temas-balon süresi hedef <120 dk (primer PCI), <180 dk (tromboliz sonrası kurtarma PCI).",
          min_difficulty: 3,
        },
        {
          id: "opt_tromboliz",
          text: "Hemen tromboliz (tenekteplaz) yap",
          correct: false,
          points: 10,
          feedback:
            "Geçerli bir seçenek — ancak PCI <120 dk sağlanabilirse PCI önceliklidir. PCI mümkün değilse (120+ dk) tromboliz.",
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

    // ========================================================
    // ADIM 5 — Transfer öncesi stabilizasyon
    // ========================================================
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
        {
          action: { type: "consult", target_id: "kardiyoloji" },
          points: 10,
          feedback:
            "Doğru — PCI merkezine ön bildirim, kapı-balon süresini kısaltır. Hastanede kateter lab önceden hazır olmalı.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Transfer öncesi bu aksiyon öncelik değil.",
    },

    // ========================================================
    // ADIM 6 — PCI sonrası yönetim (S3+)
    // ========================================================
    {
      id: "s6_pci_sonrasi",
      kind: "action",
      title: "PCI Sonrası Yönetim",
      prompt:
        "PCI başarılı, LAD'ye stent. Taburculuk öncesi / sonrası hangi tedavileri başlatırsınız?",
      min_actions: 3,
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: {
            type: "decision",
            target_id: "dapt_1_yil",
          },
          points: 15,
          feedback:
            "Doğru — ikili antiplatelet (ASA + P2Y12) 12 ay standart. Yüksek kanama riski: 6 aya düşürülebilir. Yüksek iskemik risk: 1 yılın üzerine çıkarılabilir.",
        },
        {
          action: {
            type: "decision",
            target_id: "statin_yuksek_doz",
          },
          points: 12,
          feedback:
            "Doğru — atorvastatin 40-80 mg veya rosuvastatin 20-40 mg; LDL<55 hedefi (ESC 2023, class I).",
        },
        {
          action: {
            type: "decision",
            target_id: "acei_arb",
          },
          points: 10,
          feedback:
            "Doğru — özellikle anterior MI, düşük EF, HT, DM varsa ACEi/ARB mortaliteyi azaltır. Hasta zaten ramipril alıyor.",
        },
        {
          action: {
            type: "decision",
            target_id: "oral_beta_bloker",
          },
          points: 10,
          feedback:
            "Doğru — hemodinamik stabilde oral beta-bloker başlanır (metoprolol süksinat veya bisoprolol).",
        },
        {
          action: {
            type: "decision",
            target_id: "mra",
          },
          points: 8,
          feedback:
            "Doğru (opsiyonel) — EF<%40 + DM veya HF belirtisi varsa spironolakton/eplerenon düşünülür.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "PCI sonrası sekonder korumada rutin değil.",
    },

    // ========================================================
    // ADIM 7 — Komplikasyon dalı: VT/VF (dinamik, S3+)
    // ========================================================
    // Bu adım normal akışta açılmaz. Senaryoda aspirin verilmezse veya
    // reperfüzyon gecikirse motor tarafından unlock edilmek üzere hazır.
    // Şimdilik statik olarak flow'a eklemiyoruz; dynamic_unlock sisteminde
    // konumlandırılacak.
    {
      id: "s7_vt_vf_komplikasyonu",
      kind: "action",
      title: "Komplikasyon: VT/VF",
      prompt:
        "Monitörde geniş QRS taşikardi → VF! Yapılacakları sıralayın.",
      narrative: "Hasta nabız ve bilinç kaybediyor. Asistoli değil, VF.",
      min_difficulty: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "defibrilator" },
          points: 25,
          feedback:
            "Doğru — VF'de ilk ve en önemli müdahale defibrilasyon (200 J bifazik).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "adrenalin",
            dose: "1 mg",
          },
          points: 15,
          feedback:
            "Doğru — refrakter VF/VT'de 3-5 dk'da bir 1 mg IV (ACLS).",
        },
        {
          action: {
            type: "give_medication",
            target_id: "amiodaron",
            dose: "300 mg",
          },
          points: 15,
          feedback:
            "Doğru — 3 şoka refrakter VF/VT'de 300 mg IV bolus.",
        },
        {
          action: {
            type: "give_medication",
            target_id: "lidokain",
          },
          points: 10,
          feedback:
            "Kabul — amiodaron yoksa alternatif. ACLS'de ikinci tercih.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -10,
      default_wrong_feedback:
        "VF yönetiminde öncelik değil. Defib-adrenalin-amiodaron sırası.",
    },
  ],

  imaging_results: {
    "stemi-cxr": {
      id: "stemi-cxr",
      modality: "xray",
      name_tr: "Akciğer Grafisi (PA)",
      view: "PA",
      image_url: "/images/scenarios/stemi/normal_chest_xray_pa.jpg",
      attribution: "Mikael Häggström, M.D. — CC0 (Wikimedia Commons)",
      interpretation:
        "Kardiyak silüet normal sınırlarda. Akciğer alanlarında patolojik opasite izlenmemektedir. Hilus ve mediasten normal görünümde. STEMI tanısında akciğer grafisi aort diseksiyonu ve kardiyomegaliyi ekarte etmek için değerlidir.",
      findings: [
        "Normal kardiyotorasik oran (< 0.50)",
        "Her iki akciğer alanı temiz",
        "Plevral effüzyon yok",
        "Normal mediastinal kontur",
      ],
      timestamp_min: 5,
    },
    "stemi-ekg-12lead": {
      id: "stemi-ekg-12lead",
      modality: "ekg",
      name_tr: "12 Derivasyon EKG",
      image_url: "/images/scenarios/stemi/stemi_12lead_ekg.jpg",
      attribution: "User 'Displaced' — Public Domain (Wikimedia Commons)",
      interpretation:
        "Anterior STEMI paterni: V1-V4'te belirgin ST elevasyonu, II/III/aVF'de karşılıklı ST depresyonu. Sinüs taşikardisi (HR ~105/dk). Anterior fasiküler blok paterni izlenmektedir. Sol anteriyor desendan (LAD) proksimal oklüzyonu ile uyumlu bulgular.",
      findings: [
        "V1-V4: ST elevasyonu (Tombstone paterni, 3-5 mm)",
        "II, III, aVF: Karşılıklı ST depresyonu",
        "Sinüs taşikardisi (HR ~105/dk)",
        "Anterior fasikül bloğu: sol aks sapması",
        "Q dalgası henüz belirgin değil — akut faz",
      ],
      timestamp_min: 3,
    },
  },

  scoring: {
    max_points: 280,
    passing_score: 170,
    score_floor: 0,
    grade_bands: {
      A: 240,
      B: 200,
      C: 170,
      D: 130,
    },
  },

  variants: [
    {
      id: "stemi-b-atipik",
      label: "STEMI-B — Atipik Prezentasyon",
      description:
        "78 yaş kadın, DM'li — tipik göğüs ağrısı baskın değil, nefes darlığı ve çarpıntı ön planda. Diyabetik hastada atipik MI sunumu.",
      patient: {
        age: 78,
        sex: "F",
        weight_kg: 68,
        height_cm: 158,
        chief_complaint:
          "Gece başlayan nefes darlığı, çarpıntı ve hafif epigastrik rahatsızlık. Göğüste hafif baskı hissi var.",
        history_items: [
          "DM Tip 2 (15 yıl, insülin)",
          "HT (20 yıl, ilaç kullanıyor)",
          "7 yıl önce geçirilmiş MI",
          "50 paket-yıl sigara (bırakmış)",
        ],
        allergies: [],
        current_medications: [
          "İnsülin glargin 20 IU/gece",
          "Metformin 500 mg 2x1",
          "Ramipril 10 mg 1x1",
          "Atorvastatin 40 mg 1x1",
        ],
        modifiers: {
          beta_blocker: false,
          karaciger_yetm: false,
          bobrek_yetm: false,
        },
      },
      initial_vitals: {
        hr: 96,
        bp_systolic: 132,
        bp_diastolic: 78,
        spo2: 93,
        temp: 36.8,
        rr: 24,
        pain: 3,
        glucose: 224,
        gcs: 15,
      },
    },
  ],

  debrief: {
    key_learnings: [
      "STEMI'de ilk 10 dakikada 12 derivasyonlu EKG zorunludur.",
      "Anterior STEMI (V1-V4) LAD oklüzyonunu gösterir; proksimal LAD yüksek mortaliteli.",
      "Kapı-balon süresi <120 dk sağlanabiliyorsa primer PCI tromboliz üzerine tercih edilir.",
      "İkili antiplatelet (ASA + P2Y12) + antikoagülan reperfüzyon öncesi standart.",
      "P2Y12 seçimi: ESC 2023'te ACS'de tikagrelor/prasugrel klopidogrele tercih edilir (class I).",
      "Erken IV beta-bloker hemodinamik olarak stabil olmayan hastalarda riskli (COMMIT).",
      "Morfin rutin değil — CRUSADE mortalite artışı göstermiştir. Nitrata dirençli ağrıda düşünülür.",
      "SpO₂ ≥90% ise rutin O₂ endike değil (AVOID trial).",
      "PCI sonrası: DAPT 12 ay + yüksek doz statin + ACEi/ARB + oral beta-bloker.",
    ],
    references: [
      "ESC 2023 ACS Yönetim Kılavuzu",
      "TKD Akut Koroner Sendrom Kılavuzu 2022",
      "AHA/ACC 2022 STEMI Guidelines",
      "PLATO (tikagrelor), TRITON-TIMI 38 (prasugrel)",
      "COMMIT, CRUSADE, AVOID çalışmaları",
    ],
    red_flags: [
      "Hipotansiyon (sağ ventrikül MI? Kardiyojenik şok?)",
      "Yeni geliştirdiği sol dal bloğu (STEMI eşdeğeri)",
      "VT/VF — hemen defibrilasyon",
      "V1-V3'te ST depresyonu → posterior MI düşün (V7-V9 çek)",
      "İki kol arası TA farkı >20 mmHg → aort diseksiyonu ekarte et",
    ],
    next_scenarios: [
      "kardiyoloji-kardiyojenik-sok-001",
      "kardiyoloji-aritmi-vt-001",
    ],
  },
};
