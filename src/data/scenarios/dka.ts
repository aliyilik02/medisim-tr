import type { Scenario } from "@/engine";

// ============================================================
// DKA Senaryosu — 24y Kadın, Tip 1 DM, Akut DKA
// ============================================================
// v0.2.0 (2026-04-25) — Tam revizyon:
// - Tetikleyici workup adımı (S2.5)
// - DKA rezolüsyon kriterleri adımı (S6)
// - SC insülin geçiş adımı (S7) — kritik klinik boşluk
// - HHS overlap, magnezyum, K<3.3 dallanma seçenekleri
// - Skor rekalibrasyonu (max 150 → 220)
// - JBDS-IP 2023 + ISPAD 2022 referansları eklendi
//
// Zorluk seviyeleri 2-4 destekli.
// S2:   Temel DKA tanısı, sıvı-K-insülin sıralaması
// S3:   + Bikarbonat tartışması (rutin değil), K eşik kontrolü
// S4:   + Öglisemik DKA ayırıcı (SGLT2 inh), serebral ödem uyarıları,
//         de-eskalasyon (glukoz<250 → dekstroz ekleme + insülin yarıya)
//
// Kaynaklar:
// - ADA/EASD/JBDS/AACE/DTS 2024 Hyperglycemic Crises Consensus (Umpierrez 2024)
// - BSPED 2021 / ISPAD 2022 (pediatrik referans, S4 serebral ödem)
// - TEMD 2022 Diyabet Kılavuzu (Türkiye yerel)
// - JBDS-IP 2023 (DKA rezolüsyonu + SC geçiş protokolü)
// ============================================================

export const scenario_dka: Scenario = {
  id: "dahiliye-dka-001",
  version: "0.2.0",
  title: "24 Yaş Kadın — Kusma, Karın Ağrısı, Polipne (DKA)",
  description:
    "Tip 1 DM, 3 gündür insülinini aksatan hasta. Acilde DKA tanısı, sıvı-potasyum-insülin sıralaması ve izlem.",
  specialty: "dahiliye",
  tags: ["dka", "acil", "endokrin", "metabolik", "diyabet"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4],
  estimated_minutes: 20,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ADA/EASD 2024, JBDS-IP 2023, TEMD 2022, ISPAD 2022 uyumlu",
  last_updated: "2026-04-25",

  // Senaryo yazarının demo için ilaç zamanlaması override'ı.
  // Gerçek klinikte insülin onset 15 dk, peak 1 saat. Demo'da hasta monitöründe
  // glukoz düşüşünü canlı görmek için hızlandırılmış.
  // Eğitmen istediği ilacın onset_sec/peak_min/duration_min değerlerini ezebilir.
  medication_timing_overrides: {
    insulin_regular: { onset_sec: 3, peak_min: 0.25, duration_min: 0.75 },
    salin_09:        { onset_sec: 1, peak_min: 0.083, duration_min: 0.333 },
    dekstroz_50:     { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
    kcl:             { onset_sec: 2, peak_min: 0.133, duration_min: 0.5  },
    bikarbonat:      { onset_sec: 1, peak_min: 0.05,  duration_min: 0.25 },
  },

  patient: {
    age: 24,
    sex: "F",
    weight_kg: 58,
    height_cm: 166,
    chief_complaint:
      "1 gündür kusma, karın ağrısı, derin-hızlı nefes alma. Son 3 gündür insülinini düzensiz yapmış.",
    history_items: [
      "Tip 1 DM (10 yıl, insülin detemir + insülin aspart)",
      "Son 3 günde viral üst solunum yolu enfeksiyonu",
      "İnsülin dozunu hastalık sırasında azaltmış",
      "Son 24 saatte ateş 38.2°C, öksürük (viral USYE)",
    ],
    allergies: [],
    current_medications: [
      "İnsülin detemir 20 IU gece",
      "İnsülin aspart öğünlerde 6-8 IU",
    ],
    modifiers: {},
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 102,
    bp_diastolic: 64,
    spo2: 98,
    temp: 37.8,
    rr: 28,        // Kussmaul solunumu
    pain: 6,
    glucose: 485,  // Hiperglisemik
    gcs: 14,       // Hafif letarji
  },

  available_medications: [
    "salin_09",
    "ringer_laktat",
    "insulin_regular",
    "kcl",
    "dekstroz_50",
    "bikarbonat",
    "ondansetron",        // Kusma için
    "seftriakson",        // Enfeksiyon tetikleyicisi varsa
    "tiamin",             // Alkolik DKA ayırıcı (bu vaka değil ama var)
    "magnezyum_sulfat",   // Severe DKA + hipoMg birlikteliği (S4)
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "glukometre",
    "ekg_12",
    "kan_gazi_cihazi",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "infuzyon_pompasi",
    "perfuzor",
    "ng_sonda",
    "foley_sonda",
    "stetoskop",
    // Tetikleyici workup examine hedefleri (S2.5)
    // equipment.ts'e eklenmedi — engine freeform target_id olarak kabul eder
    "tam_kan_sayimi",
    "crp",
    "idrar_tahlili",
    "akciger_grafisi",
    "beta_hidroksibutirat",
  ],

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ========================================================
    // ADIM 1 — İlk değerlendirme
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta dispneik, takipneik, ağzında aseton kokusu var. İlk 5 dakikada ne yaparsın?",
      narrative:
        "GKS 14, derin-hızlı Kussmaul solunumu, ciltte turgor azalmış, mukoz membranlar kuru.",
      min_actions: 4,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "Doğru — sürekli monitorizasyon, hipoK aritmi riski için kritik.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback:
            "Doğru — geniş bir damar yolu. Volüm replasmanı için şart.",
          unlocks: ["s2_lab_degerlendirme", "s2b_tetikleyici_workup"],
        },
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 10,
          feedback: "Doğru — kapiller kan şekeri bakıldı: 485 mg/dL.",
        },
        {
          action: { type: "use_equipment", target_id: "kan_gazi_cihazi" },
          points: 15,
          feedback:
            "Doğru — VKG: pH 7.18, HCO3 10, pCO2 22 → yüksek anyon açığı metabolik asidoz.",
          unlocks: ["s2_lab_degerlendirme", "s2b_tetikleyici_workup"],
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 10,
          feedback:
            "Doğru — K dengesizliği EKG'de T-dalga değişikliği olarak görülebilir.",
        },
        // S3+ için ikinci damar yolu (potasyum ayrı lümenden)
        {
          action: { type: "use_equipment", target_id: "iv_kateter_20g" },
          points: 8,
          feedback:
            "Doğru — potasyum replasmanı ayrı bir damardan verilirse güvenli (ISPAD önerisi).",
          min_difficulty: 3,
        },
        // Öglisemik DKA uyarısı — S4
        {
          action: { type: "examine", target_id: "sgltz_sorgula" },
          points: 12,
          feedback:
            "Doğru — SGLT2 inhibitörü kullanımı sorgulandı. Öglisemik DKA ayırıcı için kritik.",
          min_difficulty: 4,
        },
        // Ateş ölçümü — USYE tetikleyicisi (S3+)
        {
          action: { type: "examine", target_id: "ates_olcum" },
          points: 6,
          feedback:
            "Doğru — ateş 37.8°C, viral USYE öyküsü doğrulanıyor. Tetikleyici taraması gerekecek.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu ilk 5 dakikanın önceliği değil. Önce monitör + damar yolu + kan gazı.",
    },

    // ========================================================
    // ADIM 2 — Lab yorumu
    // ========================================================
    {
      id: "s2_lab_degerlendirme",
      kind: "decision",
      title: "Lab Sonuçları",
      prompt:
        "Kan gazı pH 7.18, HCO3 10 mEq/L. Glukoz 485 mg/dL. Keton (+++). K 5.4 mEq/L. Na 132. Anyon açığı 22. Tanı?",
      options: [
        {
          id: "a",
          text: "Hafif DKA",
          correct: false,
          points: -5,
          feedback:
            "Hayır — pH 7.18 ve HCO3 10 orta-ciddi DKA tanımı (hafif: pH 7.25-7.30).",
        },
        {
          id: "b",
          text: "Orta şiddette DKA",
          correct: true,
          points: 25,
          feedback:
            "Doğru — pH 7.0-7.24 + HCO3 10-15 = orta şiddette DKA. Anyon açığı 22 (>12) doğrular.",
        },
        {
          id: "c",
          text: "Hiperozmolar hiperglisemik durum (HHS)",
          correct: false,
          points: -10,
          feedback:
            "Hayır — HHS'te keton minimal, pH genellikle >7.30, glukoz >600. Bu DKA.",
        },
        {
          id: "d",
          text: "Laktik asidoz",
          correct: false,
          points: -8,
          feedback:
            "Hayır — keton pozitif + tipik tablo DKA ile uyumlu. Laktik asidoz için ek veri gerekir.",
        },
        // S4 için ek seçenek
        {
          id: "e",
          text: "Öglisemik DKA (SGLT2 inh. kullanıyor)",
          correct: false,
          points: -5,
          feedback:
            "Bu hastada glukoz 485 — klasik DKA, öglisemik değil. SGLT2 inh. kullansaydı akla gelirdi.",
          min_difficulty: 4,
        },
        // HHS overlap (Umpierrez 2024)
        {
          id: "f",
          text: "DKA + HHS overlap (mikst tablo)",
          correct: false,
          points: -3,
          feedback:
            "İlginç düşünce — DKA + HHS overlap vakaların ~%30'unda görülür (Umpierrez 2024). Bu hastada efektif osm <320 mOsm/kg, klasik DKA. Overlap için osm >320 + ciddi mental durum gerekir.",
          min_difficulty: 4,
        },
      ],
    },

    // ========================================================
    // ADIM 2.5 — Tetikleyici Workup (YENİ)
    // ========================================================
    {
      id: "s2b_tetikleyici_workup",
      kind: "action",
      title: "Tetikleyici Araştırma",
      prompt:
        "DKA tanısı kondu. Bu epizod neden tetiklendi? Hızlı tarama yap.",
      narrative:
        "DKA'nın %75'inde tetikleyici vardır: enfeksiyon (~%40), insülin uyumsuzluğu, MI/CVA (yaşlıda), pankreatit, ilaç (steroid, SGLT2i). Tetikleyiciyi tedavi etmezsen DKA tekrar eder.",
      min_actions: 2,
      max_actions: 5,
      expected_outcomes: [
        {
          action: { type: "examine", target_id: "tam_kan_sayimi" },
          points: 8,
          feedback:
            "Doğru — DKA'da BK genelde yüksek (stres + dehidratasyon), >25.000 enfeksiyon lehine.",
        },
        {
          action: { type: "examine", target_id: "idrar_tahlili" },
          points: 8,
          feedback:
            "Doğru — keton (++), nitrit/lökosit kontrolü için. Üriner enfeksiyon DKA'da sık tetikleyici.",
        },
        {
          action: { type: "examine", target_id: "akciger_grafisi" },
          points: 8,
          feedback:
            "Doğru — pnömoni ekartasyonu, ayrıca ARDS riski (severe DKA).",
        },
        {
          action: { type: "examine", target_id: "crp" },
          points: 5,
          feedback:
            "Yararlı — CRP yüksekliği bakteriyel enfeksiyon lehine. Ama spesifik değil.",
          min_difficulty: 3,
        },
        {
          action: { type: "examine", target_id: "beta_hidroksibutirat" },
          points: 10,
          feedback:
            "Doğru — kanda BHB DKA tanısı + izlem altın standardı. >3.0 mmol/L tanısal, hedef <0.6 mmol/L.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "ondansetron" },
          points: 6,
          feedback:
            "Mantıklı — kusma var, semptomatik tedavi. NG sonda gereksinimini azaltır.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 5,
          feedback:
            "Yararlı — yaşlı hastada DKA tetikleyicisi MI olabilir. 24y kadında düşük olasılık ama tarama doğru.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "Bu adımda öncelik tetikleyici taraması (enfeksiyon, MI, ilaç).",
    },

    // ========================================================
    // ADIM 3 — Sıvı resüsitasyonu
    // ========================================================
    {
      id: "s3_sivi",
      kind: "action",
      title: "Sıvı Resüsitasyonu",
      prompt:
        "K 5.4 mEq/L, hasta stabil hemodinamik. İlk sıvı tedavisi için kararını ver.",
      narrative:
        "Hasta volum açığı yaklaşık 6 L. Kapiller dolum 3 sn, ekstremiteler hafif soğuk.",
      min_actions: 1,
      max_actions: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 20,
          feedback:
            "Doğru — %0.9 NaCl 15-20 mL/kg (yaklaşık 1 L) ilk saatte. ADA/EASD 2024 başlangıç tedavisi.",
          unlocks: ["s4_insulin_karari"],
        },
        {
          action: { type: "give_medication", target_id: "ringer_laktat" },
          points: 15,
          feedback:
            "Doğru — dengeli kristalloid (Ringer/Plasmalyte) da kabul. Hiperkloremik asidozu azaltır (PROPARATION-DKA 2023).",
          unlocks: ["s4_insulin_karari"],
          min_difficulty: 3,
        },
        // ERKEN insülin hatası
        {
          action: { type: "give_medication", target_id: "insulin_regular" },
          points: -15,
          feedback:
            "HATA — önce sıvı, sonra K kontrolü. İnsülini erken verirsen hipoK riski çok yüksek.",
          critical: true,
        },
        // Yanlış: bikarbonat
        {
          action: { type: "give_medication", target_id: "bikarbonat" },
          points: -10,
          feedback:
            "ADA 2024: pH>6.9'da rutin bikarbonat ÖNERİLMİYOR. Serebral ödem ve paradoksik intraselüler asidoz riski.",
          min_difficulty: 3,
        },
        // S3+ için Foley (çıkış takibi)
        {
          action: { type: "use_equipment", target_id: "foley_sonda" },
          points: 8,
          feedback:
            "Doğru — idrar çıkışı takibi (>0.5 mL/kg/saat hedef) K replasman güvenliği için önemli.",
          min_difficulty: 3,
        },
        // K dallanma — varsayım sorusu (S4)
        {
          action: { type: "decision", target_id: "k_dusuk_senaryo" },
          points: 12,
          feedback:
            "Önemli klinik nokta — Bu hastada K 5.4. Eğer K <3.3 olsaydı: insülini BAŞLATMA, önce KCl 20-40 mEq/saat ver, K ≥3.3 olunca insülin başla (ADA 2024 Class I).",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Bu adımda öncelik sıvı. K ve insülin sonraki adım.",
    },

    // ========================================================
    // ADIM 4 — İnsülin kararı
    // ========================================================
    {
      id: "s4_insulin_karari",
      kind: "decision",
      title: "İnsülin Tedavisi — Zamanlama",
      prompt:
        "1 L salin verildi (30 dk geçti). Yeni K: 5.0 mEq/L. Hasta biraz daha uyanık. Şimdi ne yaparsın?",
      options: [
        {
          id: "a",
          text: "İnsülin infüzyonu 0.1 IU/kg/saat başla (~6 IU/saat)",
          correct: true,
          points: 25,
          feedback:
            "Doğru — K>3.3 olduğu için insülin güvenli. ADA 2024: 0.1 IU/kg/saat (bolus gerek yok).",
          min_difficulty: 2,
        },
        {
          id: "b",
          text: "Önce K replasmanı, sonra insülin",
          correct: false,
          points: 5,
          feedback:
            "Gereksiz — K 5.0 mEq/L hâlâ normal aralıkta. 5.2'nin altına düştüğünde sıvıya 20-30 mEq K ekle.",
        },
        {
          id: "c",
          text: "IV insülin bolusu 0.1 IU/kg, sonra infüzyon",
          correct: false,
          points: 0,
          feedback:
            "Eski uygulama — 2024 kılavuz bolus önermiyor. Hipoglisemi riski artar, ek fayda yok.",
          min_difficulty: 3,
        },
        {
          id: "d",
          text: "Bikarbonat ver, sonra insülin",
          correct: false,
          points: -10,
          feedback:
            "HATA — bikarbonat rutin değil. Serebral ödem ve hipoK riski artırır.",
        },
        // S4 için: hem insülin hem K sıvıya ekleme (proaktif)
        {
          id: "e",
          text: "İnsülin 0.1 IU/kg/saat + sıvıya 20 mEq/L K ekle (proaktif)",
          correct: true,
          points: 28,
          feedback:
            "Mükemmel — K 5.0 mEq/L zaten 5.2 eşiğine yakın. İnsülin başlarken K'yı destekleyici dozda eklemek önemli.",
          min_difficulty: 4,
        },
        // Magnezyum + hipoMg
        {
          id: "f",
          text: "Magnezyum kontrolü iste, hipoMg ise replase et",
          correct: false,
          points: 8,
          feedback:
            "İyi düşünce — DKA'nın %30-40'ında hipoMg var. Mg <1.5 mg/dL ise 2 g MgSO4 IV. Yine de bu adımda öncelik insülin başlatma.",
          min_difficulty: 4,
        },
      ],
    },

    // ========================================================
    // ADIM 5 — İzlem ve de-eskalasyon
    // ========================================================
    {
      id: "s5_izlem",
      kind: "action",
      title: "İzlem — 3. Saat",
      prompt:
        "3 saat geçti. Glukoz 235 mg/dL'ye düştü. pH hâlâ 7.22 (asidoz sürüyor). K 4.1 mEq/L. Ne yaparsın?",
      narrative:
        "Hedef: ketonları temizle, hipoglisemiye girme. ADA 2024 de-eskalasyon yaklaşımı.",
      min_actions: 1,
      max_actions: 3,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "dekstroz_50" },
          points: 20,
          feedback:
            "Doğru — glukoz <250 mg/dL olunca dekstroz ekle. Hipoglisemiyi önlerken insülinle keton temizliği devam eder.",
          unlocks: ["s6_rezolusyon"],
        },
        {
          action: { type: "decision", target_id: "insulin_yariya" },
          points: 15,
          feedback:
            "Doğru — glukoz <250 + asidoz devam → insülini 0.05 IU/kg/saate düşür, dekstrozla devam et.",
        },
        // S3+ için K replasmanı (azalıyor)
        {
          action: { type: "give_medication", target_id: "kcl" },
          points: 12,
          feedback:
            "Doğru — K 4.1 mEq/L insülinle daha da düşebilir. Sıvıya 20-30 mEq/L K ekle, hedef 4-5 mEq/L.",
          min_difficulty: 3,
        },
        // HATALI: insülini kes
        {
          action: { type: "decision", target_id: "insulin_kes" },
          points: -15,
          feedback:
            "HATA — insülini kesmek = ketonlar devam, DKA çözülmez. Dozu azalt, kesme.",
          critical: true,
        },
        // S4 için serebral ödem uyarısı
        {
          action: { type: "examine", target_id: "gks_kontrol" },
          points: 10,
          feedback:
            "Doğru — tedavi sırasında bilinç değişimi serebral ödem işareti olabilir (özellikle pediatride). Mannitol hazır tutulmalı.",
          min_difficulty: 4,
        },
        // Glukoz düşüş hızı kontrolü (S4)
        {
          action: { type: "decision", target_id: "glukoz_dusus_hizi_kontrol" },
          points: 10,
          feedback:
            "Doğru — glukoz düşüş hızı <50-75 mg/dL/saat olmalı (>100 ise serebral ödem riski, özellikle pediatride). Hız fazlaysa insülini azalt + dekstroz erken başla.",
          min_difficulty: 4,
        },
      ],
      default_wrong_penalty: -3,
      default_wrong_feedback:
        "Bu aşamada öncelik dekstroz ekleme + insülin titrasyonu.",
    },

    // ========================================================
    // ADIM 6 — DKA Rezolüsyon Kriterleri (YENİ)
    // ========================================================
    {
      id: "s6_rezolusyon",
      kind: "decision",
      title: "DKA Rezolüsyonu — Hangisi Bitiş Kriteri?",
      prompt:
        "8. saat. Glukoz 180 mg/dL, pH 7.34, HCO3 17, BHB 0.8 mmol/L, anyon açığı 12. Hasta uyanık, oral alabiliyor. DKA çözüldü mü?",
      options: [
        {
          id: "a",
          text: "Hayır — pH hâlâ <7.40, asidoz devam",
          correct: false,
          points: -5,
          feedback:
            "Yanlış kriter — pH 7.30 üzeri rezolüsyon için yeterli. Hedef pH 7.40 değil; hiperkloremik asidoz tedavi sonrası beklenir.",
        },
        {
          id: "b",
          text: "Evet — sadece glukoz <200 yeterli",
          correct: false,
          points: -8,
          feedback:
            "HATA — glukoz tek başına yeterli değil. DKA'da glukoz erken düşer ama ketonlar devam edebilir. Anyon açığı + pH + BHB önemli.",
        },
        {
          id: "c",
          text: "Evet — pH ≥7.30 + HCO3 ≥15 + anyon açığı ≤12 + BHB <0.6",
          correct: true,
          points: 25,
          feedback:
            "Doğru — ADA/JBDS rezolüsyon kriterleri: 2 kriter yeterli. Hastada AG kapanmış (12), pH normal, HCO3 17. BHB 0.8 → hedefe yakın, devam edilebilir.",
          min_difficulty: 2,
        },
        {
          id: "d",
          text: "Evet, sadece BHB <0.6 mmol/L kriteri yeterli",
          correct: false,
          points: 5,
          feedback:
            "Kısmen doğru — BHB en spesifik kriter, ama tek başına yeterli sayılmaz. Hedef <0.6, hastada 0.8. Bekle, AG ve pH zaten normal — pratikte SC geçiş başlatılabilir.",
          min_difficulty: 3,
        },
        {
          id: "e",
          text: "Hayır — hasta saatler boyunca aç kalmalı, sonra değerlendir",
          correct: false,
          points: -10,
          feedback:
            "HATA — hasta uyanık ve oral alabiliyorsa SC geçiş hazırlığı yapılmalı. Aç bırakmak DKA'yı uzatır.",
        },
      ],
    },

    // ========================================================
    // ADIM 7 — SC İnsülin Geçişi (YENİ)
    // ========================================================
    {
      id: "s7_sc_gecis",
      kind: "action",
      title: "SC İnsülin Geçişi — Köprüleme",
      prompt:
        "DKA çözüldü. Hasta öğün almaya hazır. IV insülini nasıl keseceksin?",
      narrative:
        "En sık hata: IV insülin direkt kesiliyor → 1-2 saat içinde DKA tekrar başlıyor (ketogenez yeniden tetikleniyor). Bazal SC insülinini IV'den ÖNCE başlat, üst üste bin.",
      min_actions: 1,
      max_actions: 3,
      expected_outcomes: [
        {
          action: { type: "decision", target_id: "bazal_once_sc_baslat" },
          points: 25,
          feedback:
            "Doğru — Bazal SC insülini (detemir/glargin) IV insülini kesmeden 1-2 saat ÖNCE başlat. IV insülinin yarı ömrü 7-9 dk, bazal SC absorbsiyonu 1-2 saat sürer. Üst üste binme şart.",
          min_difficulty: 2,
        },
        {
          action: { type: "decision", target_id: "ogune_gore_bolus_planla" },
          points: 15,
          feedback:
            "Doğru — Hasta detemir + aspart kullanıyor. Detemir 20 IU akşam, aspart öğün öncesi 6-8 IU restart. Karbonhidrat sayımı önerilir.",
          min_difficulty: 3,
        },
        // KRİTİK HATA — direkt IV kesme
        {
          action: { type: "decision", target_id: "iv_direkt_kes" },
          points: -20,
          feedback:
            "KRİTİK HATA — IV insülini kesip SC başlatmak DKA rebound'una yol açar. SC absorbsiyonu yavaş, ketogenez dakikalar içinde geri başlar. Asla doğrudan kesme.",
          critical: true,
        },
        // Endokrin konsültasyonu
        {
          action: { type: "consult", target_id: "endokrinoloji" },
          points: 8,
          feedback:
            "Yararlı — yeni tanı T1DM'de hasta eğitimi + doz titrasyonu için endokrin konsültasyonu standart. Mevcut hasta bilinen T1DM ama uyum sorunu var, eğitim tekrarı endike.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu adımda öncelik: bazal SC insülin → 1-2 saat bekle → IV kes. Bu sırayla.",
    },
  ],

  scoring: {
    max_points: 220,
    passing_score: 130,
    grade_bands: {
      A: 195,
      B: 165,
      C: 140,
      D: 110,
    },
  },

  debrief: {
    key_learnings: [
      "DKA tedavisinde sıra: SIVI → K kontrol → İNSÜLİN. Bu sıra hayat kurtarır.",
      "K<3.3 mEq/L'de insülin kontrendike — önce K replasmanı, sonra insülin.",
      "Rutin bikarbonat ÖNERİLMİYOR (pH>6.9). Serebral ödem + paradoksik asidoz riski.",
      "Glukoz <250 mg/dL olduğunda: dekstroz %5-10 EKLE + insülini yarıya düşür. İnsülini KESME.",
      "Yeni kılavuz (ADA 2024): insülin bolusu rutin değil. Doğrudan 0.1 IU/kg/saat infüzyon.",
      "İzlem: kan şekeri 1-2 saatte bir, K 2 saatte bir, VKG 4 saatte bir.",
      "DKA rezolüsyonu = pH ≥7.30 + HCO3 ≥15 + AG ≤12 + BHB <0.6 (2 kriter yeterli). Glukoz tek başına yetmez.",
      "SC geçiş: bazal insülini IV kesmeden 1-2 saat önce başlat. Doğrudan kesmek = DKA rebound.",
      "Tetikleyici araştırması zorunlu: tam kan, idrar, akciğer grafisi, BHB. Tedavi etmezsen DKA tekrar eder.",
    ],
    references: [
      "Umpierrez GE et al. Hyperglycemic Crises in Adults with Diabetes: Consensus Report. Diabetes Care. 2024.",
      "TEMD Diyabet Tanı ve Tedavi Kılavuzu 2022.",
      "ISPAD Clinical Practice Consensus Guidelines 2022 (pediatrik DKA).",
      "Joint British Diabetes Societies (JBDS-IP) 2023 — DKA Yönetimi ve SC Geçiş Protokolü.",
      "Kitabchi AE et al. Hyperglycemic Crises in Adults. ADA Position Statement (güncel revize).",
    ],
    red_flags: [
      "K<3.3 mEq/L'de insülin verme",
      "Sıvı önce verilmeden insülin başlama",
      "pH>6.9'da rutin bikarbonat verme",
      "Glukoz <200-250 olunca dekstroz eklemeyi unutma",
      "Çocuklarda tedavi sırasında bilinç bozulması = serebral ödem (mannitol hazır tut)",
      "IV insülini SC köprü olmadan direkt kesme — DKA 1-2 saat içinde geri döner.",
      "Glukoz düşüş hızı >100 mg/dL/saat — serebral ödem riski (özellikle pediatride).",
    ],
    next_scenarios: ["pediatri-sepsis-001"],
  },
};
