// ============================================================
// MediSim TR — Akut Bronşiyolit Senaryosu
// ============================================================
// Klinik referans: AAP Bronchiolitis 2014 Guideline (Ralston et al.),
// NICE NG9 2021, TTD 2020, Türk Pediatri Kurumu 2018 Konsensusu.
// Ana öğretim: destek tedavi vurgusu, gereksiz ilaçları önleme
// (rutin salbutamol, steroid, antibiyotik YOK), hospitalizasyon
// kriterleri, HFNC eskalasyonu.
// Eğitici felsefe: Az tetkik = doğru hekimlik (AAP 2014 Class B).
// Faz 5.4: lab_panels + imaging_results + lab_timeline + s2b/s4b eklendi
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_bronsiyolit: Scenario = {
  id: "pedi-bronsiyolit-001",
  version: "0.2.0",
  title: "8 Aylık Erkek Bebek — Hışıltı ve Solunum Sıkıntısı",
  description:
    "3 gündür burun akıntısı ve öksürük olan bebek, son 12 saatte beslenemiyor, hızlı soluk alıyor. Akut bronşiyolit tanı ve yönetimi — özellikle gereksiz tedavilerden kaçınma.",
  specialty: "pediatri",
  tags: ["bronşiyolit", "rsv", "pediatri", "hışıltı", "solunum"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3],
  estimated_minutes: 10,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  patient: {
    age: 0, // 8 aylık — yıl olarak 0, history'de belirtilir
    sex: "M",
    weight_kg: 8.4,
    height_cm: 70,
    chief_complaint:
      "3 gündür nezle ve öksürük, dün akşamdan beri hızlı soluyor, emzik almıyor, son 12 saatte sadece 2 kez idrar yaptı.",
    history_items: [
      "Yaş: 8 ay (0 yıl - pediatrik)",
      "Zamanında doğum, komplikasyonsuz",
      "Aşıları yaşına uygun",
      "Kronik hastalığı yok",
      "Evde 3 yaşında kardeşinde geçen hafta soğuk algınlığı",
      "Sigara içilen ev değil",
      "Anne sütü + ek gıda",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 162,
    bp_systolic: 92,
    bp_diastolic: 58,
    spo2: 91, // Hafif hipoksi
    temp: 38.1,
    rr: 58, // Takipne (8 ay için normal ≤40)
    gcs: 15,
  },

  available_medications: [
    "salin_09",
    "nazal_salin", // Burun aspirasyonu için
    "parasetamol_pediatrik",
    "salbutamol_nebul",
    "adrenalin_nebul",
    "deksametazon",
    "amoksisilin",
    "hipertonik_salin_3", // %3 hipertonik salin neb
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "nazal_aspirator",
    "oksijen_maske",
    "hfnc", // Yüksek akımlı nazal kanül
    "nebulizator",
    "iv_kateter",
    "infant_tartisi",
  ],

  ekg_pattern: "normal",

  start_step_id: "step-1",

  steps: [
    // ===== ADIM 1 =====
    {
      id: "step-1",
      kind: "action",
      title: "İlk değerlendirme",
      prompt:
        "Bebek muayenede: bilinç açık ama yorgun, burun kanadı solunumu var, interkostal çekilme +, bilateral ince ralleri var. İlk aksiyon?",
      min_actions: 2,
      default_wrong_penalty: -3,
      default_wrong_feedback: "Bu adımda öncelik destek tedavisi değerlendirmesidir.",
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 15,
          feedback:
            "✓ SpO2 bronşiyolitte ağırlık göstergesi. <%92 hastane yatışı endikasyonu.",
        },
        {
          action: { type: "use_equipment", target_id: "nazal_aspirator" },
          points: 20,
          feedback:
            "✓ Bronşiyolitte nazal sekresyon temizliği ilk basamak tedavi. Beslemenin de önkoşulu.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Kardiyak monitörizasyon, özellikle RR ve HR takibi.",
        },
        {
          action: { type: "examine", target_id: "hidrasyon_degerlendirme" },
          points: 15,
          feedback:
            "✓ Dehidrasyon durumu (idrar, gözyaşı, fontanel, kapiller dolum) beslenme kararı için şart.",
        },
        // Yaygın hatalar
        {
          action: { type: "give_medication", target_id: "amoksisilin" },
          points: -15,
          feedback:
            "✗ Bronşiyolit viral, antibiyotik rutin önerilmez. Sadece sekonder bakteriyel enfeksiyon kanıtı varsa.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 1b (S2.5) — Tetkik Kararı =====
    {
      id: "s2b_orders",
      kind: "action",
      title: "Tetkik Kararı — Az Tetkik Doğru Hekimliktir",
      prompt:
        "Bronşiyolit klinik tanısı kuvvetli. Hangi tetkikleri istersiniz? Dikkat: bronşiyolitte rutin lab/görüntüleme AAP 2014'e göre ÖNERİLMEZ.",
      min_actions: 0,
      default_wrong_penalty: -10,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "br-cbg" },
          points: 30,
          feedback:
            "✓ Kapiller kan gazı: Orta-ağır bronşiyolitte CO2 retansiyonunu değerlendirir. SpO2 91, RR 58, çekilme var — CBG solunum yetmezliği eşiğini gösterir. pH 7.32, pCO2 52 → kompanze respiratuar asidoz başlıyor.",
        },
        {
          action: { type: "order_test", target_id: "br-viral-pcr" },
          points: 25,
          feedback:
            "✓ RSV PCR: Tanıyı doğrular, hastane izolasyon kararı için kullanışlı. Zorunlu değil ama eğitici — yönetimi değiştirmez. RSV pozitif doğrulandı.",
        },
        {
          action: { type: "order_test", target_id: "br-cbc-crp" },
          points: 0,
          feedback:
            "⚠️ CBC + CRP: Viral tabloda lenfosit baskınlığı ve düşük CRP (%65 lenfosit, CRP 8 mg/L) bakteriyel ko-enfeksiyonu dışlar — ama AAP 2014 rutin önermiyor. Atipik seyir veya lökositoz şüphesinde kabul edilebilir.",
        },
        // Yanlış seçimler — eğitici negatif puan
        {
          action: { type: "order_test", target_id: "pa-cxr-pediatrik" },
          points: -15,
          feedback:
            "✗ PA Akciğer Grafisi: AAP 2014 Class B — tipik bronşiyolitte rutin grafi ÖNERİLMEZ. Gereksiz radyasyon, klinik kararı değiştirmez (hiperinflasyon bulgusu zaten beklenen). Atipik seyir/komplikasyon şüphesinde iste.",
        },
        {
          action: { type: "order_test", target_id: "idrar_tam_tahlili" },
          points: -10,
          feedback:
            "✗ Tam idrar tahlili: Ateşli <2 aylık infantta UTI ekartasyonu gereklidir ama 8 aylık bu hastada klinik endikasyon yok.",
        },
        {
          action: { type: "order_test", target_id: "kan_kulturu" },
          points: -15,
          feedback:
            "✗ Kan kültürü: Bakteremi olasılığı viral bronşiyolitte çok düşük. Gereksiz invazif işlem ve gecikme.",
        },
        {
          action: { type: "order_test", target_id: "prokalsitonin" },
          points: -15,
          feedback:
            "✗ Prokalsitonin: Viral bronşiyolitte klinik bağlamda anlamsız. Az tetkik = doğru hekimlik.",
        },
      ],
    },

    // ===== ADIM 2 =====
    {
      id: "step-2",
      kind: "decision",
      title: "Tedavi seçimi",
      prompt:
        "Nazal aspirasyon sonrası SpO2 93'e çıktı, RR 52, hâlâ çekilme var. Hangi tedavi uygun?",
      allow_multiple: true,
      partial_credit: false,
      options: [
        {
          id: "opt-destek",
          text: "Sadece destek: nemli hava, nazal aspirasyon, sık küçük öğünle beslenme",
          correct: true,
          points: 25,
          feedback:
            "✓ Hafif-orta bronşiyolitte kanıta dayalı en doğru yaklaşım. Rutin farmakolojik tedavi yoktur.",
        },
        {
          id: "opt-o2",
          text: "SpO2 %92'nin altına düşerse oksijen desteği (başlangıçta düşük akımlı)",
          correct: true,
          points: 15,
          feedback:
            "✓ Türk Toraks ve AAP kılavuzu: SpO2 <%90-92 oksijen endikasyonu.",
        },
        {
          id: "opt-salbutamol",
          text: "Salbutamol nebul 2.5 mg, 20 dk'da bir",
          correct: false,
          points: -10,
          feedback:
            "✗ AAP 2014: bronşiyolitte rutin salbutamol ÖNERİLMEZ — etkinliği gösterilmedi. Atopi öyküsü veya deneme yanıtı varsa bireysel karar.",
        },
        {
          id: "opt-deksametazon",
          text: "Deksametazon IV",
          correct: false,
          points: -15,
          feedback:
            "✗ Sistemik steroid rutin önerilmez (kanıt yok, zarar var). İlk atak bronşiyolitte kesinlikle hayır.",
          critical: true,
        },
        {
          id: "opt-adrenalin-nebul",
          text: "Nebülize adrenalin 0.5 mg/kg",
          correct: false,
          points: -5,
          feedback:
            "Ağır vakalarda, yatış kararı verilmiş hastada denenebilir ancak hafif-orta tabloda rutin yer almaz.",
          min_difficulty: 3,
        },
        {
          id: "opt-hipertonik",
          text: "%3 hipertonik salin nebul",
          correct: false,
          points: -3,
          feedback:
            "Hastane yatışında düşünülebilir, acil ilk müdahalede rutin önerilmez. Kanıt tartışmalı.",
          min_difficulty: 3,
        },
      ],
    },

    // ===== ADIM 3 =====
    {
      id: "step-3",
      kind: "decision",
      title: "Yatış kararı",
      prompt:
        "2 saat sonra tekrar değerlendirme: SpO2 oda havasında %89, RR 60, çekilme devam, bebek 3 saattir beslenemiyor, 4 saattir idrar yok. Ne yaparsın?",
      options: [
        {
          id: "opt-yatis",
          text: "Hastaneye yatır, IV sıvı + HFNC oksijen başla",
          correct: true,
          points: 30,
          feedback:
            "✓ Yatış kriterleri: SpO2 <%92 oda havasında, beslenemme, dehidrasyon, ciddi solunum sıkıntısı. HFNC (high-flow nasal cannula) orta-ciddi bronşiyolitte kanıtlı yarar.",
        },
        {
          id: "opt-evde-takip",
          text: "Evde nazal aspirasyon + 24 saat sonra kontrole çağır",
          correct: false,
          points: -25,
          feedback:
            "✗ TEHLİKELİ. Hipoksi, beslenemme, azalmış idrar — evde takip güvensiz.",
          critical: true,
        },
        {
          id: "opt-gozlem-acil",
          text: "4-6 saat acil serviste gözle, düzelirse eve gönder",
          correct: false,
          points: -10,
          feedback:
            "SpO2 < %92 + beslenemme + dehidrasyon üçlüsü ile yatış endikasyonu zaten var. Uzatmak zaman kaybı.",
        },
        {
          id: "opt-yogun-bakim",
          text: "Direkt pediatrik yoğun bakıma yatır",
          correct: false,
          points: -5,
          feedback:
            "Hasta hâlâ uyanık, stabil. Önce servis + HFNC. Apne, yorgunluk, mekanik ventilasyon ihtiyacı olursa YBÜ.",
          min_difficulty: 3,
        },
      ],
    },

    // ===== ADIM 3b — HFNC Eskalasyon Kararı =====
    {
      id: "s4b_escalation",
      kind: "decision",
      title: "Servis: Solunum Desteği Eskalasyonu",
      prompt:
        "Servis yatışı yapıldı, standart nazal O2 (2 L/dk) başlandı. 1. saat değerlendirme: SpO2 %89 (O2 altında), RR 68/dk, subkostal + interkostal çekilme artıyor, bebek beslenemıyor, hafif letarji. Solunum desteğini nasıl artırırsınız?",
      options: [
        {
          id: "opt_hfnc",
          text: "HFNC başla — 2 L/kg/dk, FiO2 titreyle (hedef SpO2 ≥%92)",
          correct: true,
          points: 25,
          feedback:
            "✓ HFNC ilk eskalasyon seçeneği (NICE NG9 2021 + AAP). Yüksek akımlı nazal kanül CPAP etkisi + ısıtmalı nemlendirilmiş O2 birlikte sağlar. CBG izlemi: HFNC ile pCO2 düşüş beklenir (52 → 46).",
        },
        {
          id: "opt_dusuk_o2",
          text: "Düşük akım O2 devam + daha sık vital ölçümü",
          correct: false,
          points: 5,
          feedback:
            "⚠️ SpO2 %89, RR 68, letarji başlıyor — düşük akım O2 yetersiz kalacak. Kabul edilebilir ama optimal değil. HFNC eskalasyonu geciktirilmemeli.",
        },
        {
          id: "opt_entübasyon",
          text: "Entübasyon + mekanik ventilasyon",
          correct: false,
          points: -15,
          feedback:
            "✗ Apne, solunum durması veya ağır yorgunluk yok. Entübasyon prematür ve gereksiz risk. Önce HFNC dene — mekanik ventilasyon son basamak.",
        },
        {
          id: "opt_salbutamol_steroid",
          text: "Salbutamol nebül + deksametazon IV başla",
          correct: false,
          points: -20,
          feedback:
            "✗ KRİTİK HATA — AAP 2014: Bronşiyolitte bronkodilatör VE sistemik steroid rutin ÖNERİLMEZ. Bu astım değil — bronkodilatörün etki mekanizması yoktur. Steroid ise zarar verir. Bu tercih yapılırsa CBG kötüleşir: pH 7.32→7.28, pCO2 52→60.",
          critical: true,
        },
      ],
    },

    // ===== ADIM 4 — İleri seviye: komplikasyon =====
    {
      id: "step-4",
      kind: "action",
      title: "Servisde 6. saat: ani SpO2 düşüşü %82",
      prompt:
        "HFNC altında servisde 6. saat. Bebek aniden resti, apne gelişti, SpO2 %82. Hızlı yanıt?",
      min_difficulty: 2,
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "ambu" },
          points: 25,
          feedback:
            "✓ Apne → balon-maske ventilasyonu. Bronşiyolitin en kritik komplikasyonu.",
        },
        {
          action: { type: "consult", target_id: "pediatrik_ybu" },
          points: 15,
          feedback: "✓ Pediatri YBÜ, olası entübasyon/CPAP için.",
        },
        {
          action: { type: "examine", target_id: "havayolu_acikligi" },
          points: 10,
          feedback: "Nazal sekresyon tıkadıysa aspirasyon + pozisyon.",
        },
        {
          action: { type: "give_medication", target_id: "adrenalin_nebul" },
          points: -5,
          feedback: "Apne ataağında ilk müdahale havayolu + ventilasyon, ilaç değil.",
          critical: false,
        },
      ],
      default_wrong_penalty: -5,
    },
  ],

  lab_panels: {
    "br-cbg": {
      id: "br-cbg",
      name_tr: "Kapiller Kan Gazı",
      results: [
        { parameter: "pH",     value: 7.32, unit: "",       reference_range: "7.35-7.45",  flag: "L",
          interpretation: "Kompanze respiratuar asidoz başlangıcı. CO2 retansiyonu var; HCO3 artışı henüz yetişemedi." },
        { parameter: "pCO₂",   value: 52,   unit: "mmHg",   reference_range: "35-45",       flag: "H",
          interpretation: "Hiperkarbi — solunum yetmezliğinin erken işareti. >60 kritik, hemen HFNC/entübasyon." },
        { parameter: "pO₂",    value: 45,   unit: "mmHg",   reference_range: "50-80",       flag: "L",
          interpretation: "Kapiller kan gazında pO2 düşük izlenir, SpO2 ile birlikte yorumla." },
        { parameter: "HCO₃⁻",  value: 26,   unit: "mEq/L",  reference_range: "22-26" },
        { parameter: "BE",     value: 1,    unit: "mEq/L",  reference_range: "-2 / +2" },
        { parameter: "SaO₂",   value: 87,   unit: "%",      reference_range: "95-100",      flag: "L" },
      ],
      comment: "Kompanze respiratuar asidoz + hiperkarbi. HFNC veya solunum desteği eskalasyonu endikasyonu güçlü.",
    },
    "br-viral-pcr": {
      id: "br-viral-pcr",
      name_tr: "Viral PCR Paneli (Solunum)",
      results: [
        { parameter: "RSV",             value: "Pozitif +++", unit: "", reference_range: "Negatif", flag: "H",
          interpretation: "RSV bronşiyoliti doğrulandı. Türkiye'de kış mevsiminde en sık etken (%60-80)." },
        { parameter: "İnfluenza A",     value: "Negatif",    unit: "", reference_range: "Negatif" },
        { parameter: "İnfluenza B",     value: "Negatif",    unit: "", reference_range: "Negatif" },
        { parameter: "Parainfluenza 1", value: "Negatif",    unit: "", reference_range: "Negatif" },
        { parameter: "Parainfluenza 3", value: "Negatif",    unit: "", reference_range: "Negatif" },
        { parameter: "hMPV",            value: "Negatif",    unit: "", reference_range: "Negatif" },
        { parameter: "Adenovirüs",      value: "Negatif",    unit: "", reference_range: "Negatif" },
      ],
      comment: "RSV mono-enfeksiyonu. Tanıyı doğrular, tedaviyi değiştirmez — yönetim zaten destek tedavidir.",
    },
    "br-cbc-crp": {
      id: "br-cbc-crp",
      name_tr: "Tam Kan Sayımı + CRP",
      results: [
        { parameter: "WBC",      value: 11.2, unit: "×10³/µL", reference_range: "6.0-17.5" },
        { parameter: "Nötrofil", value: 28,   unit: "%",        reference_range: "30-60",    flag: "L",
          interpretation: "Nötrofil oranı düşük — viral enfeksiyon paterni." },
        { parameter: "Lenfosit", value: 65,   unit: "%",        reference_range: "30-60",    flag: "H",
          interpretation: "Lenfosit baskınlığı viral etiyolojiyle uyumlu. Bakteriyel ko-enfeksiyon düşük ihtimal." },
        { parameter: "Hgb",      value: 11.5, unit: "g/dL",     reference_range: "10.5-13.5" },
        { parameter: "PLT",      value: 320,  unit: "×10³/µL",  reference_range: "150-450" },
        { parameter: "CRP",      value: 8,    unit: "mg/L",     reference_range: "<5",       flag: "H",
          interpretation: "<10 mg/L: Bakteriyel ko-enfeksiyon olasılığı düşük. Viral inflamasyon ile uyumlu." },
      ],
      comment: "Viral CBC paterni + düşük CRP — bakteriyel ko-enfeksiyon ekarte. AAP 2014: bu tetkik rutin önerilmez.",
    },
  },

  result_delay_seconds: {
    "br-cbg":       600,   // 10 dk
    "br-viral-pcr": 7200,  // 120 dk (sınav modunda gerçek; eğitimde 5 sn)
    "br-cbc-crp":   900,   // 15 dk
  },

  lab_timeline: [
    {
      panel_id: "br-cbg",
      at_minute: 60,
      results: [
        { parameter: "pH",     value: 7.35, unit: "",      reference_range: "7.35-7.45",
          interpretation: "HFNC sonrası pH normalize oluyor. Solunum desteği etkinliğini doğrular." },
        { parameter: "pCO₂",   value: 46,   unit: "mmHg",  reference_range: "35-45",       flag: "H" },
        { parameter: "HCO₃⁻",  value: 25,   unit: "mEq/L", reference_range: "22-26" },
        { parameter: "BE",     value: 0,    unit: "mEq/L", reference_range: "-2 / +2" },
        { parameter: "SaO₂",   value: 93,   unit: "%",     reference_range: "95-100",      flag: "L",
          interpretation: "SpO2 hedefi ≥%92 sağlandı. HFNC yanıtı olumlu — eskalasyon (entübasyon) gerekmedi." },
      ],
    },
  ],

  imaging_results: {
    "pa-cxr-pediatrik": {
      id: "pa-cxr-pediatrik",
      name_tr: "PA Akciğer Grafisi (Pediatrik)",
      modality: "xray",
      view: "PA (Anteroposterior — bebek)",
      interpretation:
        "Bilateral hiperinflasyon (havalanma artışı): düzleşmiş diyafram, yatay kotalar. Peribronşiyal kalınlaşma. Sağ üst lobda subsegmenter atelektazi (plug/tıkaç). Konsolidasyon/infiltrasyon görülmedi. Kardiyak silüet normal. Plevral efüzyon yok. AAP 2014 uyarısı: Bu bulgular tipik bronşiyolitte beklenen değişikliklerdir — yönetimi değiştirmez. Rutin çekimden kaçının.",
      findings: [
        "Bilateral hiperinflasyon (düzleşmiş diyafram)",
        "Peribronşiyal kalınlaşma",
        "Sağ üst lob subsegmenter atelektazi",
        "Konsolidasyon/infiltrasyon: Yok",
        "Kardiyak silüet: Normal",
        "Plevral efüzyon: Yok",
        "Yorum: Tipik bronşiyolit radyolojisi — yönetim kararını değiştirmez",
      ],
      timestamp_min: 15,
      attribution: "Eğitim amaçlı temsili rapor — AAP 2014 bronşiyolit radyoloji kriterleri",
    },
  },

  scoring: {
    max_points: 250,
    passing_score: 150,
    grade_bands: {
      A: 215,
      B: 185,
      C: 150,
      D: 120,
    },
  },

  debrief: {
    key_learnings: [
      "Az tetkik doğru hekimliktir: AAP 2014 Class B — bronşiyolitte rutin lab ve akciğer grafisi ÖNERİLMEZ. Tanı kliniktir.",
      "Bronşiyolit viral, destek tedavi esastır: Nazal aspirasyon + hidrasyon + oksijen desteği. Rutin salbutamol, steroid, antibiyotik YOK.",
      "Kapiller kan gazı endikasyonu: Orta-ağır tabloda (SpO2 <%92, RR >60, çekilme) CO2 retansiyonunu değerlendirmek için gerekli — pCO2 >52 HFNC eskalasyonu güçlendirir.",
      "RSV PCR: Tanıyı doğrular, izolasyon kararına yardımcı olur. Tedaviyi değiştirmez.",
      "HFNC ilk eskalasyon seçeneğidir (NICE NG9 2021): pCO2 52 → 46, pH 7.32 → 7.35 ile yanıt izlenir.",
      "Salbutamol/steroid ısrarı klasik öğrenci hatası: Astım değil bronşiyolit — bronkodilatörün mekanizması yoktur. Steroid zarar verir.",
      "Hospitalizasyon kriterleri: SpO2 <%92, ciddi solunum sıkıntısı, beslenememe, dehidrasyon, apne, <3 ay yaş.",
      "Apne küçük bebeklerde ilk ve tek bulgu olabilir — 3 ay altı yakın izlem.",
    ],
    references: [
      "AAP Clinical Practice Guideline: Bronchiolitis 2014 (Ralston et al., Pediatrics)",
      "NICE Guideline NG9 — Bronchiolitis in children (2015, updated 2021)",
      "Türk Toraks Derneği Akut Bronşiyolit Uzlaşı Raporu",
      "Türk Pediatri Kurumu Bronşiyolit Tanı/Tedavi Konsensusu 2018",
    ],
    red_flags: [
      "Gereksiz tetkik istemek (grafi, kan kültürü, PCT): Radyasyon + invazif işlem + gecikme — klinik kararı değiştirmez",
      "Salbutamol/steroid: Bronşiyolitte etkinliği yok, zarar var — CBG kötüleşir (pH düşer, pCO2 artar)",
      "Yorgunluk belirtileri: Düşen SS + azalan çekilme + letarji → solunum yetmezliği yaklaşıyor",
      "Apne: <3 ay ve prematüre bebeklerde bronşiyolitte sık; hemen balon-maske + PYBÜ",
      "Bakteriyel süperenfeksiyon: Persistan ateş + lökositoz + lobar konsolidasyon → antibiyotik + grafi endike",
    ],
    next_scenarios: ["pediatri-sepsis-001"],
  },
};
