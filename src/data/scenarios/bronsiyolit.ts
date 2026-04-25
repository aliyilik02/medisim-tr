// ============================================================
// MediSim TR — Akut Bronşiyolit Senaryosu
// ============================================================
// Klinik referans: Türk Toraks Derneği Akut Bronşiyolit Uzlaşı
// Raporu, Türkiye Milli Pediatri Derneği 2017 AB Rehberi,
// AAP Bronchiolitis 2014 Guideline.
// Ana öğretim: destek tedavi vurgusu, gereksiz ilaçları önleme
// (rutin salbutamol, steroid, antibiyotik YOK), hospitalizasyon
// kriterleri, HFNC oksijen desteği.
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_bronsiyolit: Scenario = {
  id: "pedi-bronsiyolit-001",
  version: "0.1.0",
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
  last_updated: "2026-04-24",

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

  scoring: {
    max_points: 170,
    passing_score: 100,
    grade_bands: {
      A: 145,
      B: 125,
      C: 100,
      D: 70,
    },
  },

  debrief: {
    key_learnings: [
      "Bronşiyolit viral, destek tedavi esastır. Rutin salbutamol, steroid, antibiyotik ÖNERİLMEZ.",
      "Nazal aspirasyon ve hidrasyon en önemli iki müdahaledir — hem tedavi hem beslenmenin önkoşulu.",
      "Hospitalizasyon kriterleri: SpO2 <%92 oda havasında, belirgin solunum sıkıntısı, beslenememe, dehidrasyon, apne, yaş <3 ay.",
      "HFNC (yüksek akımlı nazal kanül) orta-ciddi bronşiyolitte mekanik ventilasyon ihtiyacını azaltan kanıtlı bir araç.",
      "Apne küçük bebeklerde ilk ve tek bulgu olabilir — 3 ay altı hasta yakın izlem.",
      "Akciğer grafisi ve rutin laboratuvar tanısal değil, atipik seyir/komplikasyon şüphesinde istenir.",
      "Aileyi eğitmek: nazal aspirasyon tekniği, sık az miktar beslenme, ateş yönetimi, kırmızı bayraklar.",
    ],
    references: [
      "Türk Toraks Derneği Akut Bronşiyolit Tanı ve Tedavi Uzlaşı Raporu",
      "Türkiye Milli Pediatri Derneği — Akut Bronşiyolit Tanı, Değerlendirme ve Yönetim Rehberi 2017",
      "AAP (American Academy of Pediatrics) Clinical Practice Guideline: Bronchiolitis 2014",
      "NICE Guideline NG9 — Bronchiolitis in children (2015, updated 2021)",
    ],
    red_flags: [
      "Apne — özellikle <3 ay ve prematüre bebeklerde ilk bulgu olabilir",
      "Yorgunluk belirtileri: düşen solunum sayısı, azalan çekilme, letarji → solunum yetmezliği yaklaşıyor",
      "Ciddi dehidrasyon: mukoz kuru, fontanel çökük, kapiller dolum >3 sn",
      "Atelektazi/pnömotoraks — akut kötüleşmede akciğer grafisi",
      "Bakteriyel süperenfeksiyon: yüksek ateş persistan + lökositoz + lobar konsolidasyon",
    ],
    next_scenarios: ["pedi-sepsis-001"],
  },
};
