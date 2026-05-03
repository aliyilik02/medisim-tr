// ============================================================
// MediSim TR — Akut Apandisit Senaryosu (Cerrahi)
// ============================================================
// Klinik referans: WSES Jerusalem Guidelines 2020 (Acute Appendicitis),
// EAES 2016 (laparoskopik apandektomi), TCD 2019 Akut Karın.
// Ana öğretim hedefi: Alvarado skoru, görüntüleme kararı (USG→BT),
// perforasyon ayırıcı tanısı, antibiyotik + cerrahi hazırlık.
// Faz 5.3: lab_panels + imaging_results + lab_timeline + s2b/s3b eklendi
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_apandisit: Scenario = {
  id: "cerrahi-apandisit-001",
  version: "0.2.0",
  title: "28 Yaş Erkek — Sağ Alt Kadran Ağrısı",
  description:
    "12 saat önce göbek çevresinden başlayıp sağ alt kadrana yerleşen ağrı, bulantı-kusma. Akut apandisit tanı-tedavi algoritması ve cerrahi karar.",
  specialty: "cerrahi",
  tags: ["apandisit", "akut karın", "cerrahi", "laparoskopi", "alvarado"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3, 4],
  estimated_minutes: 12,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "WSES Jerusalem Guidelines 2020 uyumlu",
  last_updated: "2026-04-27",

  patient: {
    age: 28,
    sex: "M",
    weight_kg: 75,
    height_cm: 178,
    chief_complaint:
      "12 saat önce göbek çevresinde başlayan, sağ alt kadrana yerleşen ağrı. Bulantı ve 1 kez kusma var. İştahsızlık.",
    history_items: [
      "Daha önce benzer şikâyet yok",
      "Kronik hastalık yok",
      "Sigara yok",
      "Son yemek 10 saat önce",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 98,
    bp_systolic: 122,
    bp_diastolic: 76,
    spo2: 99,
    temp: 38.1,
    rr: 18,
    pain: 7,
    gcs: 15,
  },

  available_medications: [
    "metronidazol",
    "seftriakson",
    "ampisilin_sulbaktam",
    "parasetamol",
    "morfin",
    "fentanil",
    "ondansetron",
    "omeprazol",
  ],

  available_equipment: [
    "iv_kateter_18g",
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "stetoskop",
    "ultrasonografi",
    "bilgisayarli_tomografi",
  ],

  ekg_pattern: "normal_sinüs",

  start_step_id: "s1_fizik_muayene",

  steps: [
    // ====================================================
    // ADIM 1 — Fizik muayene ve Alvarado skoru
    // ====================================================
    {
      id: "s1_fizik_muayene",
      kind: "action",
      title: "Fizik Muayene ve Değerlendirme",
      prompt:
        "Hasta acil serviste. Akut apandisit şüphesiyle ilk muayene ve değerlendirmeyi başlatın.",
      narrative:
        "Hasta masaya yatmak istiyor, sağ tarafı bükülü pozisyonda. Sağ alt kadranda baskı hissediyor.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "makburney_noktasi" },
          points: 15,
          feedback:
            "Doğru — McBurney noktasında hassasiyet (+1 Alvarado). Lokalize hassasiyet apandisit için klasik.",
        },
        {
          action: { type: "examine", target_id: "rebound_hassasiyeti" },
          points: 15,
          feedback:
            "Doğru — Rebound pozitif (+1 Alvarado). Peritoneal irritasyon var.",
        },
        {
          action: { type: "use_equipment", target_id: "tansiyon_aleti" },
          points: 5,
          feedback: "Doğru — Baseline vital değerlendirmesi gerekli.",
        },
        {
          action: { type: "order_test", target_id: "tam_kan_sayimi" },
          points: 20,
          feedback:
            "Doğru — Lökositoz (+2 Alvarado). Lökosit >10.000/mm³ apandisit tanısını güçlendirir.",
        },
        {
          action: { type: "order_test", target_id: "crp" },
          points: 10,
          feedback:
            "Doğru — CRP yükselmesi inflamasyonu gösterir. WSES kılavuzu: CRP + lökositoz güçlü tanısal destek.",
          min_difficulty: 2,
        },
        {
          action: { type: "order_test", target_id: "idrar_tam_tahlili" },
          points: 5,
          feedback:
            "Doğru — Üriner patoloji ekartasyonu için. Apandisit komşuluğunda hafif piyüri görülebilir.",
        },
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: 8,
          feedback:
            "Kabul — WSES/Cochrane: analjezik kullanımı muayeneyi maskelemez. Erken analjezi öneriliyor.",
        },
        {
          action: { type: "give_medication", target_id: "ondansetron" },
          points: 5,
          feedback: "Kabul — Bulantı-kusma için antiemetik uygun.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Apandisit değerlendirmesinde bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 2b (S2.5) — Lab Paneli + İlk Görüntüleme Tetkiki
    // ====================================================
    {
      id: "s2b_orders",
      kind: "action",
      title: "Lab Paneli + Görüntüleme",
      prompt:
        "Akut apandisit şüphesi var. Tanıyı güçlendirmek ve ayırıcı tanıları dışlamak için tetkik paketini isteyin.",
      min_actions: 3,
      default_wrong_penalty: -5,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "ap-cbc" },
          points: 12,
          feedback:
            "✓ TKS: WBC 14.5k (+2 Alvarado). Nötrofil %82 sola kayma (+1 Alvarado). Lökositoz + nötrofili apandisit için klasik.",
        },
        {
          action: { type: "order_test", target_id: "ap-inflammation" },
          points: 12,
          feedback:
            "✓ CRP + PCT: CRP 45 mg/L orta inflamasyon. PCT 0.3 sınırda — <0.5 komplike olmayan apandisiti destekler, >0.5 perforasyon şüphesi.",
        },
        {
          action: { type: "order_test", target_id: "ap-bmp-lft" },
          points: 10,
          feedback:
            "✓ BMP + LFT: Kolesistit ayırıcısı için LFT (N → safra patolojisi dışlandı). Dehidratasyon değerlendirmesi.",
        },
        {
          action: { type: "order_test", target_id: "ap-urine-hcg" },
          points: 8,
          feedback:
            "✓ İdrar tahlili: Hafif lökositüri komşuluk irritasyonu ile açıklanır — UTI değil. βhCG erkek hastada N/A (kadın hastada ektopik gebelik zorunlu dışlama).",
        },
        {
          action: { type: "use_equipment", target_id: "ultrasonografi" },
          points: 13,
          feedback:
            "✓ Abdominal USG: İlk görüntüleme seçeneği (radyasyon yok, hızlı). Apendiks 8mm, peri-apendiküler sıvı +/- — tanısal değer sınırda.",
        },
        // Yanlış seçimler
        {
          action: { type: "order_test", target_id: "d-dimer" },
          points: -10,
          feedback:
            "✗ D-dimer gereksiz: Pulmoner emboli şüphesi yok. Akut karında katkısı yok.",
        },
        {
          action: { type: "order_test", target_id: "troponin" },
          points: -10,
          feedback:
            "✗ Troponin gereksiz: Kardiyak şikâyet yok. Akut apandisit tanı paketinde yeri yok.",
        },
      ],
    },

    // ====================================================
    // ADIM 2 — Görüntüleme kararı
    // ====================================================
    {
      id: "s2_goruntuleme_karari",
      kind: "decision",
      allow_multiple: true,
      partial_credit: true,
      title: "Görüntüleme Kararı",
      prompt:
        "Lökosit 14.500, CRP 45 mg/L, Alvarado skoru 7 hesaplandı. Görüntüleme için ne yaparsınız?",
      narrative:
        "Alvarado skoru ≥7 cerrahi konsültasyon için yeterli. Ancak görüntüleme tanıyı kesinleştirir ve komplikasyonu dışlar.",
      options: [
        {
          id: "opt_usg",
          text: "Abdominal ultrasonografi — ilk seçenek (radyasyon yok, hızlı)",
          correct: true,
          points: 20,
          feedback:
            "Doğru — USG: radyasyon yok, hızlı, apandisit pozitif bulgu sensitivitesi %75-90. Genç erkekte ilk tercih.",
        },
        {
          id: "opt_bt",
          text: "BT çek (duyarlılık %94-98)",
          correct: true,
          points: 15,
          feedback:
            "Kabul — BT altın standart ama radyasyon var. Obez hastalarda, USG belirsiz olduğunda veya Alvarado 5-6 arası tercih edilir.",
        },
        {
          id: "opt_bt_ilk",
          text: "Doğrudan BT çek, USG'yi atla",
          correct: false,
          points: -8,
          feedback:
            "Genç erkekte gereksiz radyasyon. WSES kılavuzu: belirsiz tanılarda BT önce, tipik tabloda (Alvarado ≥7) USG önce tercih.",
        },
        {
          id: "opt_goruntuleme_yok",
          text: "Görüntüleme gerek yok, klinik yeterli — direkt cerrahiye gönder",
          correct: true,
          points: 10,
          feedback:
            "Kabul — Alvarado ≥8'de (veya çok tipik tabloda) doğrudan cerrahi mümkün. Ama bu hastada 7 — görüntüleme kesinleştirici.",
          min_difficulty: 2,
        },
      ],
    },

    // ====================================================
    // ADIM 3b — USG Sonucu Sınırda: BT Kararı
    // ====================================================
    {
      id: "s3b_imaging_decision",
      kind: "decision",
      title: "USG Sonucu Sınırda — Sıradaki Adım",
      prompt:
        "USG: apendiks 8mm, çevre yağda hafif inflamasyon, peri-apendiküler sıvı +/-. Sensitivite sınırda. Alvarado skoru 7. Ne yaparsınız?",
      narrative:
        "USG'de apendiks görselleştirildi ancak çap ve bulgular kesin tanıya yetmiyor. Perforasyon ekarte edilemedi.",
      options: [
        {
          id: "opt_bt_iste",
          text: "Abdominal BT çek — USG inkonklusif, altın standart görüntüleme",
          correct: true,
          points: 15,
          feedback:
            "✓ Doğru — WSES 2020: USG inkonklusif ise BT altın standart (sensitivite %94-98, özgüllük %95). Apendiks 11mm + fekalit + peri-apendiküler yağ inflamasyonu görüldü → tanı kesinleşti.",
        },
        {
          id: "opt_klinik_takip",
          text: "Klinik takip + Alvarado tekrar (2-4 saat)",
          correct: false,
          points: 5,
          feedback:
            "⚠️ Düşük şüphede kabul edilebilir. Ama bu hastada Alvarado 7, CRP 45, sola kayma var — gecikme perforasyon riskini artırır. BT tercih edilmeli.",
        },
        {
          id: "opt_direkt_cerrahi",
          text: "Direkt cerrahi konsültasyon — görüntüleme yeterli",
          correct: false,
          points: -5,
          feedback:
            "✗ Görüntüleme tamamlanmadan cerrahi erken — BT perforasyon, abse, alternatif tanı verir. Cerrahi riskini tanıyla orantıla.",
        },
        {
          id: "opt_taburcu",
          text: "Taburcu et, 24 saat sonra kontrole çağır",
          correct: false,
          points: -15,
          feedback:
            "✗ TEHLİKELİ — Alvarado 7 + lab bulgusu + görüntüleme şüpheli. Perforasyon 12-24 saatte gelişebilir. Gözlem veya görüntüleme tamamlanmadan taburcu edilmez.",
          critical: true,
        },
      ],
    },

    // ====================================================
    // ADIM 3 — Cerrahi karar ve preoperatif hazırlık
    // ====================================================
    {
      id: "s3_cerrahi_karar",
      kind: "action",
      title: "Cerrahi Hazırlık ve Antibiyotik",
      prompt:
        "USG: apendiks 8 mm çapında, çevre yağda inflame görünüm. Apandisit tanısı kesin. Cerrahi hazırlık yapın.",
      narrative:
        "Cerrahi konsültan laparoskopik appendektomi planlıyor. Ameliyathane hazırlanıyor.",
      min_actions: 2,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "seftriakson" },
          points: 20,
          feedback:
            "Doğru — Preoperatif profilaktik antibiyotik (sefalorin grubu + metronidazol veya ampisilin-sulbaktam). WSES: komplike olmayan apandisitte 24 saat yeterli.",
        },
        {
          action: { type: "give_medication", target_id: "metronidazol" },
          points: 15,
          feedback:
            "Doğru — Anaerob kapsama için metronidazol eklenmesi gerekli. Seftriakson + metronidazol: standart kapsam.",
        },
        {
          action: { type: "give_medication", target_id: "ampisilin_sulbaktam" },
          points: 18,
          feedback:
            "Doğru — Ampisilin-sulbaktam tek başına geniş spektrumlu kapsam sağlar (aerob + anaerob). Alternatif uygun seçim.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback:
            "Doğru — IV damar yolu açıldı. İntraoperatif sıvı ve ilaç için gerekli.",
        },
        {
          action: { type: "consult", target_id: "cerrahi" },
          points: 15,
          feedback:
            "Doğru — Cerrahi konsültasyon teyit edildi, ameliyathane hazırlanıyor.",
        },
        {
          action: { type: "order_test", target_id: "kan_grubu_cross" },
          points: 10,
          feedback:
            "Doğru — Preoperatif standart. Komplike apandisitte transfüzyon gerekebilir.",
          min_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "parasetamol" },
          points: 5,
          feedback: "Kabul — Postoperatif analjezi planlaması uygun.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Preoperatif hazırlıkta bu adım öncelik değil.",
    },

    // ====================================================
    // ADIM 4 — Komplike apandisit yönetimi (S3+)
    // ====================================================
    {
      id: "s4_komplikasyon",
      kind: "decision",
      title: "Komplikasyon Kararı",
      prompt:
        "Ameliyat sırasında apendiks perfore, lokal peritonit var. Ameliyat ekibi ne yapmalı?",
      narrative:
        "Laparoskopide apendiks perforasyonu saptandı, çevre periton kontamine.",
      min_difficulty: 3,
      options: [
        {
          id: "opt_laparoskopi_devam",
          text: "Laparoskopik devam et, abdomeni bol yıka, dren koy",
          correct: true,
          points: 25,
          feedback:
            "Doğru — Komplike apandisitte laparoskopik devam standart. Bol irrigasyon (3L+ SF) ve peritoneal dren.",
        },
        {
          id: "opt_acik",
          text: "Açık cerrahiye dön (laparotomi)",
          correct: true,
          points: 15,
          feedback:
            "Kabul — Yaygın peritonit veya teknik zorluk varsa konversiyon endike. Lokal peritonit laparoskopik devam müsaade eder.",
        },
        {
          id: "opt_antibiyotik_sonlandir",
          text: "Yalnızca preoperatif antibiyotikle yetinildi, postoperatif gerek yok",
          correct: false,
          points: -20,
          feedback:
            "Hatalı — Perfore apandisitte en az 3-5 gün IV antibiyotik gerekli. WSES: komplike = uzatılmış tedavi.",
        },
      ],
    },
  ],

  lab_panels: {
    "ap-cbc": {
      id: "ap-cbc",
      name_tr: "Tam Kan Sayımı",
      results: [
        { parameter: "WBC",      value: 14.5, unit: "×10³/µL", reference_range: "4.5-11.0",  flag: "HH",
          interpretation: "Lökositoz — Alvarado +2. >10k apandisit tanısını güçlendirir." },
        { parameter: "Nötrofil", value: 82,   unit: "%",        reference_range: "40-70",      flag: "H",
          interpretation: "Sola kayma — Alvarado +1. >75% nötrofil inflamasyon/enfeksiyona işaret." },
        { parameter: "Lenfosit", value: 12,   unit: "%",        reference_range: "20-40",      flag: "L" },
        { parameter: "Hgb",      value: 15.2, unit: "g/dL",     reference_range: "13.5-17.5" },
        { parameter: "Hct",      value: 45.6, unit: "%",        reference_range: "40-52" },
        { parameter: "PLT",      value: 312,  unit: "×10³/µL",  reference_range: "150-400" },
        { parameter: "Bant",     value: "+/-", unit: "",         reference_range: "<5%",        flag: "H",
          interpretation: "Periferik yaymada bant nötrofil — sola kaymanın ek kanıtı." },
      ],
      comment: "Lökositoz + sola kayma → Alvarado L1+L2 = +3 puan. WBC 14.5k komplike olmayan apandisitin tipik değeri.",
    },
    "ap-inflammation": {
      id: "ap-inflammation",
      name_tr: "İnflamasyon Belirteçleri",
      results: [
        { parameter: "CRP",           value: 45,  unit: "mg/L",  reference_range: "<5",   flag: "H",
          interpretation: "Orta düzey inflamasyon. <10: düşük şüphe. 10-100: orta. >100: perforasyon/abse şüphesi." },
        { parameter: "Prokalsitonin", value: 0.3, unit: "ng/mL", reference_range: "<0.5",
          interpretation: "Sınırda normal. <0.5 komplike olmayan apandisitle uyumlu. >0.5 perforasyon riskini artırır." },
      ],
      comment: "CRP 45 orta inflamasyon — aktif apandisit ama henüz perforasyon değil. PCT sınırda güven verici.",
    },
    "ap-bmp-lft": {
      id: "ap-bmp-lft",
      name_tr: "BMP + Karaciğer Fonksiyon",
      results: [
        { parameter: "Na⁺",    value: 138, unit: "mEq/L", reference_range: "136-145" },
        { parameter: "K⁺",     value: 3.8, unit: "mEq/L", reference_range: "3.5-5.0" },
        { parameter: "Cl⁻",    value: 102, unit: "mEq/L", reference_range: "98-107" },
        { parameter: "BUN",    value: 18,  unit: "mg/dL",  reference_range: "7-20" },
        { parameter: "Cr",     value: 0.9, unit: "mg/dL",  reference_range: "0.7-1.2" },
        { parameter: "Glukoz", value: 95,  unit: "mg/dL",  reference_range: "70-100" },
        { parameter: "AST",    value: 28,  unit: "U/L",    reference_range: "10-40" },
        { parameter: "ALT",    value: 24,  unit: "U/L",    reference_range: "7-56" },
        { parameter: "T. Bil", value: 0.8, unit: "mg/dL",  reference_range: "<1.2",
          interpretation: "Normal bilirübin — kolesistit/kolanjit tanısı dışlandı." },
      ],
      comment: "LFT normal → safra yolu patolojisi ekarte. Renal fonksiyon ve elektrolitler normal — cerrahi için hazır.",
    },
    "ap-urine-hcg": {
      id: "ap-urine-hcg",
      name_tr: "İdrar Tahlili",
      results: [
        { parameter: "Lökosit",  value: "+1",       unit: "",      reference_range: "Negatif", flag: "H",
          interpretation: "1-5/hpf hafif lökositüri — apandiksin mesane/üreter komşuluğu irritasyonu ile açıklanır. UTI dışlandı (nitrit negatif)." },
        { parameter: "Eritrosit",value: "Negatif",  unit: "",      reference_range: "Negatif" },
        { parameter: "Nitrit",   value: "Negatif",  unit: "",      reference_range: "Negatif" },
        { parameter: "Protein",  value: "Negatif",  unit: "",      reference_range: "Negatif" },
        { parameter: "βhCG",     value: "N/A",      unit: "",      reference_range: "—",
          interpretation: "Erkek hasta — βhCG uygulanmaz. Kadın hastada ektopik gebelik dışlaması zorunludur." },
      ],
      comment: "İdrar bulguları UTI ile uyumlu değil — komşuluk irritasyonu. UTI + ektopik gebelik (erkek N/A) ekarte.",
    },

    // ------------------------------------------------------------
    // s1_fizik_muayene adımındaki "hızlı tarama" tetkikleri
    // (s2b_orders'daki ap-cbc/ap-inflammation/ap-urine-hcg ile
    // klinik olarak tutarlı değerler — aynı hasta, daha kısa panel)
    // ------------------------------------------------------------
    "tam_kan_sayimi": {
      id: "tam_kan_sayimi",
      name_tr: "Tam Kan Sayımı (TKS)",
      results: [
        { parameter: "WBC",      value: 14.5, unit: "×10³/µL", reference_range: "4.5-11.0", flag: "H",
          interpretation: "Lökositoz (+2 Alvarado). Apandisit için klasik bulgu." },
        { parameter: "Nötrofil", value: 82,   unit: "%",        reference_range: "50-70",   flag: "H",
          interpretation: "Sola kayma (+1 Alvarado). Bakteriyel/akut inflamasyon paterni." },
        { parameter: "Lenfosit", value: 12,   unit: "%",        reference_range: "20-40",   flag: "L" },
        { parameter: "Hgb",      value: 14.8, unit: "g/dL",     reference_range: "13.5-17.5" },
        { parameter: "Hct",      value: 44,   unit: "%",        reference_range: "40-52" },
        { parameter: "Plt",      value: 285,  unit: "×10³/µL",  reference_range: "150-450" },
      ],
      comment: "Lökositoz + nötrofili + sola kayma → Alvarado +3 puan. WSES 2020: TKS apandisit tanısının laboratuvar köşe taşı.",
    },

    "crp": {
      id: "crp",
      name_tr: "CRP",
      results: [
        { parameter: "CRP", value: 45, unit: "mg/L", reference_range: "<5", flag: "H",
          interpretation: "Orta inflamasyon. CRP >10 + lökositoz apandisit tanısını kuvvetlendirir (WSES 2020). >100 mg/L perforasyon/abse şüphesi yükseltir." },
      ],
      comment: "CRP TKS ile birlikte güçlü tanısal destek. Tek başına özgül değildir; klinik + lökosit ile birlikte yorumlanır.",
    },

    "idrar_tam_tahlili": {
      id: "idrar_tam_tahlili",
      name_tr: "Tam İdrar Tahlili (TIT)",
      results: [
        { parameter: "Renk",      value: "Sarı",     unit: "",     reference_range: "Açık sarı" },
        { parameter: "Berraklık", value: "Berrak",   unit: "",     reference_range: "Berrak" },
        { parameter: "Dansite",   value: 1.020,      unit: "",     reference_range: "1.005-1.025" },
        { parameter: "pH",        value: 6.0,        unit: "",     reference_range: "5.0-7.5" },
        { parameter: "Lökosit esterazı", value: "Eser (+)", unit: "", reference_range: "Negatif", flag: "H",
          interpretation: "Hafif lökositüri — apandiksin mesane/üreter komşuluğu irritasyonu ile uyumlu." },
        { parameter: "Nitrit",    value: "Negatif",  unit: "",     reference_range: "Negatif",
          interpretation: "Negatif — UTI ekarte (klinik olarak en önemli bulgu)." },
        { parameter: "Glukoz",    value: "Negatif",  unit: "",     reference_range: "Negatif" },
        { parameter: "Keton",     value: "+",        unit: "",     reference_range: "Negatif",
          interpretation: "Hafif keton — açlık/iştahsızlık ile uyumlu." },
        { parameter: "Protein",   value: "Negatif",  unit: "",     reference_range: "Negatif" },
        { parameter: "Eritrosit", value: "Negatif",  unit: "",     reference_range: "Negatif" },
        { parameter: "Lökosit (mikroskopi)", value: "5-8", unit: "/hpf", reference_range: "0-5", flag: "H" },
        { parameter: "Bakteri",   value: "Yok",      unit: "",     reference_range: "Yok" },
      ],
      comment: "İdrar yolu enfeksiyonu YOK (nitrit negatif, bakteri yok). Hafif piyüri komşuluk irritasyonundan — apandisit tanısını desteklemeyen ama dışlamayan bulgu.",
    },

    // ------------------------------------------------------------
    // s2b_orders yanlış seçimleri (-10): D-Dimer, Troponin
    // ------------------------------------------------------------
    "d-dimer": {
      id: "d-dimer",
      name_tr: "D-Dimer",
      results: [
        { parameter: "D-Dimer", value: 580, unit: "ng/mL FEU", reference_range: "<500", flag: "H",
          interpretation: "Hafif yükseklik. Akut inflamasyon (apandisit) D-Dimer'i non-spesifik olarak yükseltebilir — PE tanısına götürmez. Klinik bağlamda PE şüphesi yok; bu bulgu yanlış pozitif." },
      ],
      comment: "WSES 2020: Akut karında D-Dimer rutin önerilmez. PE ön olasılığı yoksa istem klinik kararı değiştirmez ve gereksiz ileri tetkik (BT-anjio) tetikleyebilir.",
    },

    "troponin": {
      id: "troponin",
      name_tr: "Troponin I (yüksek duyarlıklı)",
      results: [
        { parameter: "Troponin I (hs)", value: 0.012, unit: "ng/mL", reference_range: "<0.04",
          interpretation: "Normal — kardiyak iskemi kanıtı yok. Klinik tabloda zaten kardiyak şikâyet yok; bu tetkik anlamsızdı." },
      ],
      comment: "Tabloda göğüs ağrısı, dispne veya EKG değişikliği yok. Troponin akut karın paneline dahil değildir — ESC AKS kılavuzu klinik şüphe + EKG ile değerlendirir.",
    },

    // ------------------------------------------------------------
    // s4 (cerrahi hazırlık) — preoperatif kan grubu / cross-match
    // ------------------------------------------------------------
    "kan_grubu_cross": {
      id: "kan_grubu_cross",
      name_tr: "Kan Grubu + Cross-Match",
      results: [
        { parameter: "ABO grubu",        value: "O",       unit: "", reference_range: "—" },
        { parameter: "Rh tipi",          value: "Pozitif", unit: "", reference_range: "—" },
        { parameter: "Direkt Coombs",    value: "Negatif", unit: "", reference_range: "Negatif" },
        { parameter: "İndirekt Coombs",  value: "Negatif", unit: "", reference_range: "Negatif" },
        { parameter: "Cross-match",      value: "Uyumlu — 2 ünite ER konsantresi rezerve", unit: "", reference_range: "—",
          interpretation: "Kan bankası 2 Ü ER konsantresi hazır tuttu. Komplike apandisit/perforasyon olasılığında transfüzyon ihtiyacı için preoperatif standart." },
      ],
      comment: "Preoperatif kan grubu/cross-match elektif/yarı-elektif tüm cerrahide standart. Komplike apandisitte intraabdominal kanama veya peritoneal kontaminasyon kontrolünde transfüzyon gerekebilir.",
    },
  },

  result_delay_seconds: {
    "ap-cbc":             900,   // 15 dk
    "ap-inflammation":   1800,   // 30 dk
    "ap-bmp-lft":         900,   // 15 dk
    "ap-urine-hcg":       600,   // 10 dk
    "tam_kan_sayimi":     900,   // 15 dk — basit TKS
    "crp":                900,   // 15 dk
    "idrar_tam_tahlili":  600,   // 10 dk
    "d-dimer":            900,   // 15 dk — yanlış seçim
    "troponin":           900,   // 15 dk — yanlış seçim
    "kan_grubu_cross":   1200,   // 20 dk — preop standart
  },

  lab_timeline: [
    {
      panel_id: "ap-cbc",
      at_minute: 90,
      results: [
        { parameter: "WBC",      value: 17.2, unit: "×10³/µL", reference_range: "4.5-11.0",  flag: "HH",
          interpretation: "Gözlem altında WBC 14.5k → 17.2k: inflamasyon artıyor. Perforasyon riski yükseldi." },
        { parameter: "Nötrofil", value: 88,   unit: "%",        reference_range: "40-70",      flag: "H" },
      ],
    },
    {
      panel_id: "ap-inflammation",
      at_minute: 90,
      results: [
        { parameter: "CRP",           value: 95,  unit: "mg/L",  reference_range: "<5",   flag: "HH",
          interpretation: "CRP 45 → 95 mg/L: Hızlı yükseliş perforasyon riskini güçlü şekilde artırıyor. Cerrahi kararını geciktirme." },
        { parameter: "Prokalsitonin", value: 0.8, unit: "ng/mL", reference_range: "<0.5", flag: "H",
          interpretation: "PCT >0.5 sınırı geçti — perforasyon veya lokal peritonit başlangıcı." },
      ],
    },
  ],

  imaging_results: {
    "abdominal-usg": {
      id: "abdominal-usg",
      name_tr: "Abdominal Ultrasonografi",
      modality: "us",
      view: "Sağ alt kadran odaklı",
      interpretation:
        "Apendiks görselleştirildi: çap 8mm (N <6mm), duvar kalınlığı 3mm. Peri-apendiküler sıvı minimal (+/-). Probe-tenderness pozitif (transduktör baskısında hassasiyet arttı). Kompressibilite yok. Perforasyon ekarte edilemiyor. Tanısal değer sınırda — BT ile teyit önerilir.",
      findings: [
        "Apendiks çapı: 8mm (anormal, >6mm)",
        "Duvar kalınlığı: 3mm (artmış)",
        "Kompressibilite: Yok (anormal)",
        "Probe-tenderness: Pozitif",
        "Peri-apendiküler sıvı: Minimal (+/-)",
        "Serbest sıvı: Görülmedi",
        "Perforasyon: Ekarte edilemiyor",
        "Yorum: Tanısal değer sınırda → BT gerekli",
      ],
      timestamp_min: 10,
      attribution: "Eğitim amaçlı temsili rapor — WSES 2020 kriterleri",
    },
    "abdominal-ct": {
      id: "abdominal-ct",
      name_tr: "Abdominal Bilgisayarlı Tomografi",
      modality: "ct",
      view: "Kontrastlı aksiyel + koronal",
      interpretation:
        "Apendiks çapı 11mm, duvar kalınlığı 4mm. Peri-apendiküler yağ dokusunda inflamatuvar değişiklikler (stranding). Apendiks proksimalinde fekalit (+). Serbest sıvı minimal. Perforasyon kesin görülmüyor ancak sağ alt kadranda izole küçük hava kabarcığı şüpheli — olası erken/mikro perforasyon ekarte edilemez. Apandisit tanısı kesin.",
      findings: [
        "Apendiks çapı: 11mm (belirgin dilatasyon)",
        "Duvar kalınlığı: 4mm (artmış, mural ödem)",
        "Peri-apendiküler yağ inflamasyonu: Belirgin (+)",
        "Fekalit: Apendiks proksimalinde (+)",
        "Serbest sıvı: Minimal sağ alt kadran",
        "Şüpheli serbest hava izi: Sağ alt kadranda küçük hava kabarcığı (+/-)",
        "Perforasyon: Kesin görülmüyor, mikro-perforasyon ekarte edilemiyor",
        "Tanı: Akut apandisit — acil cerrahi endike",
      ],
      timestamp_min: 25,
      attribution: "Eğitim amaçlı temsili rapor — WSES 2020 + ACR kriterleri",
    },
  },

  scoring: {
    max_points: 246,
    passing_score: 145,
    grade_bands: { A: 200, B: 170, C: 145, D: 115 },
  },

  debrief: {
    key_learnings: [
      "Alvarado skoru ≥7: cerrahi konsültasyon endikasyonu. ≥8-10: görüntüleme atlanabilir.",
      "Bu senaryoda Alvarado breakdown (10/10): M=+1 (migrasyon) | A=+1 (anoreksi) | N=+1 (bulantı/kusma) | T=+2 (SAK hassasiyet) | R=+1 (rebound) | E=+1 (ateş 38.1°C) | L1=+2 (WBC 14.5k) | L2=+1 (nötrofil %82). Maksimum skor = kesin apandisit şüphesi.",
      "USG önce: genç hasta, tipik tablo, radyasyon kısıtlaması (sensitivite %75-90). BT altın standart: USG inkonklusif, obez hasta, komplikasyon şüphesi (sensitivite %94-98).",
      "CRP + PCT kombinasyonu: CRP <10 düşük şüphe. PCT >0.5 perforasyon riskini artırır. Bu hastada CRP 45, PCT 0.3 — komplike olmayan apandisit.",
      "Gözlemde gecikme tehlikeli: t=90dk'de CRP 45→95, WBC 14.5k→17.2k. Hızlı yükseliş perforasyon riskini güçlü gösterir.",
      "Preoperatif antibiyotik profilaksisi: seftriakson + metronidazol VEYA ampisilin-sulbaktam (komplike olguda 3-5 gün uzat).",
      "Analjezik muayeneyi maskelemez — erken ağrı tedavisi WSES/Cochrane kanıtlı.",
      "Perfore apandisit: laparoskopik devam + bol irrigasyon + dren + uzatılmış IV antibiyotik.",
    ],
    references: [
      "WSES Jerusalem Guidelines for Acute Appendicitis 2020",
      "EAES Guidelines for Laparoscopic Appendectomy 2016",
      "Türk Cerrahi Derneği Akut Karın Kılavuzu 2019",
      "Cochrane: analjezi tanıyı maskeler mi? (yok — kanıt yok)",
    ],
    red_flags: [
      "Jeneralize peritonit → acil laparotomi",
      "CRP >100 + ateş yüksek → abse/perfore apandisit — BT şart",
      "Gözlemde CRP/WBC hızlı yükseliş → gecikmeyin, cerrahi kararını verin",
      "Alvarado <4 → alternatif tanılar: ovaryan kist/torsiyon (kadın), üreteral taş, Meckel divertikülü",
      "USG inkonklusif → BT atlamayın; şüpheli serbest hava = acil cerrahi",
    ],
    next_scenarios: ["cerrahi-kolesistit-001", "cerrahi-intestinal-obstruksiyon-001"],
  },
};
