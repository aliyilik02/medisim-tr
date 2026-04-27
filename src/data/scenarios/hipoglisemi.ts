import type { Scenario } from "@/engine";

// ============================================================
// Hipoglisemi Senaryosu — 68y Erkek, Tip 2 DM + CKD + Sülfonilüre
// ============================================================
// Post-op değil, iatrojenik: Kahvaltısız glimepirid + CKD evre 3b-4
// → Uzamış, rebound riskli hipoglisemi
//
// Faz 5.6: lab entegrasyonu + rebound dinamiği eklendi
// - 3 panel (POC glukoz, BMP+CKD, etiyoloji) — lab-light felsefe
// - GÖRÜNTÜLEME YOK: fokal nörolojik bulgu yoksa beyin BT gereksiz
// - lab_timeline: t=30dk düzelme + t=120dk REBOUND (sülfonilüre uzun yarı ömür)
// - s2b_orders: "Önce tedavi → sonra lab" prensibi
// - s4b_recurrence: Oktreotid (sülfonilüre antagonisti) — klasik atlanan karar
// - s5b_disposition: 48-72h yatış zorunluluğu (sülfonilüre + CKD)
//
// Referans: ADA Standards 2025, Endocrine Society 2009 (Cryer PE, JCEM),
//           TEMD 2024 Diyabet Kılavuzu
// ============================================================

export const scenario_hipoglisemi: Scenario = {
  id: "dahiliye-hipoglisemi-001",
  version: "2.0.0",
  title: "68 Yaş Erkek — Titreme, Terleme, Bilinç Değişikliği (Hipoglisemi)",
  description:
    "Glimepirid + CKD evre 3b-4 zemininde kahvaltısız ilaç alan 68 yaşındaki Tip 2 DM hastası. Uzamış semptomatik hipoglisemi, rebound riski yüksek. Etiyoloji: CKD kaynaklı sülfonilüre akümülasyonu.",
  specialty: "dahiliye",
  tags: ["hipoglisemi", "diyabet", "sulfonilüre", "ckd", "acil", "metabolik", "endokrin", "oktreotid", "rebound"],
  difficulty: 2,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 15,
  modes: ["quiz"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ADA 2025, Endocrine Society 2009, TEMD 2024 uyumlu",
  last_updated: "2026-04-27",

  patient: {
    age: 68,
    sex: "M",
    weight_kg: 82,
    height_cm: 172,
    chief_complaint:
      "Sabahtan beri titreme ve aşırı terleme. Eşi 'konuşmaları tutarsız, gözleri boş bakıyor' diye getirmiş.",
    history_items: [
      "Tip 2 DM (15 yıl) — glimepirid 4 mg 1×1 + metformin 1000 mg 2×1",
      "Kronik böbrek hastalığı — CKD evre 3b-4 (eGFR ~28 mL/dk/1.73m²)",
      "Hipertansiyon — amlodipin 5 mg 1×1",
      "Sabah ilaçlarını kahvaltı yapmadan almış",
      "Son 2 haftadır iştahsızlık + ~3 kg kilo kaybı",
    ],
    allergies: [],
    current_medications: [
      "Glimepirid 4 mg 1×1",
      "Metformin 1000 mg 2×1",
      "Amlodipin 5 mg 1×1",
    ],
    modifiers: {},
  },

  initial_vitals: {
    hr: 112,
    bp_systolic: 142,
    bp_diastolic: 88,
    spo2: 97,
    temp: 36.6,
    rr: 18,
    gcs: 12,
    glucose: 38,
    pain: 2,
  },

  available_medications: [
    "dekstroz_50",
    "salin_09",
    "tiamin",
    "insulin_regular",
    "magnezyum_sulfat",
    "oktreotid",
    "glukagon",
  ],

  available_equipment: [
    "glukometre",
    "iv_kateter_18g",
    "monitor",
    "pulse_oksimetre",
    "ekg_12",
    "beyin_bt",
  ],

  ekg_pattern: "normal",

  lab_panels: {
    "hipo-poc-glucose": {
      id: "hipo-poc-glucose",
      name_tr: "POC Kapiller Glukoz + Venöz Glukoz",
      results: [
        { parameter: "POC Kapiller Glukoz", value: 38,  unit: "mg/dL", reference_range: "70-180", flag: "LL",
          interpretation: "Ciddi hipoglisemi. Whipple triadı: glukoz <55 + semptom + tedaviye yanıt." },
        { parameter: "Venöz Glukoz",        value: 42,  unit: "mg/dL", reference_range: "70-110", flag: "LL",
          interpretation: "Venöz doğrulama. POC ile uyumlu — ölçüm hatası değil." },
      ],
      comment: "POC ve venöz glukoz uyumlu. Tedavi gecikmeden başlanmalı — sonuç beklenmez.",
    },
    "hipo-bmp-lft-cbc": {
      id: "hipo-bmp-lft-cbc",
      name_tr: "BMP + KC Fonksiyon + KKS",
      results: [
        { parameter: "Glukoz (plazma)",  value: 42,   unit: "mg/dL",      reference_range: "70-110",   flag: "LL" },
        { parameter: "Na⁺",             value: 139,  unit: "mEq/L",       reference_range: "136-145" },
        { parameter: "K⁺",              value: 5.1,  unit: "mEq/L",       reference_range: "3.5-5.0",  flag: "H",
          interpretation: "Hafif yüksek — CKD bağlantılı. Potasyum izlemi sürdür." },
        { parameter: "Kreatinin",        value: 2.1,  unit: "mg/dL",       reference_range: "0.7-1.2",  flag: "HH",
          interpretation: "Belirgin yüksek — CKD evre 3b-4. Glimepirid akümülasyonu = uzamış hipoglisemi riski." },
        { parameter: "BUN",             value: 38,   unit: "mg/dL",       reference_range: "7-25",     flag: "H" },
        { parameter: "eGFR (CKD-EPI)",  value: 28,   unit: "mL/dk/1.73m²", reference_range: ">60",     flag: "LL",
          interpretation: "CKD evre 3b-4. eGFR <30 ml/dk → sülfonilüre kontrendike (ADA 2025 / TEMD 2024)." },
        { parameter: "HbA1c",           value: 6.2,  unit: "%",           reference_range: "4.5-5.6",  flag: "H",
          interpretation: "Sıkı glisemik kontrol + sülfonilüre + CKD = yüksek hipoglisemi riski üçlüsü." },
        { parameter: "AST",             value: 28,   unit: "U/L",         reference_range: "<35" },
        { parameter: "ALT",             value: 22,   unit: "U/L",         reference_range: "<40" },
        { parameter: "WBC",             value: 9.2,  unit: "×10³/μL",     reference_range: "4-10" },
        { parameter: "Hemoglobin",      value: 11.8, unit: "g/dL",        reference_range: "13.5-17.5", flag: "L",
          interpretation: "CKD anemisi. Hafif — hipoglisemi tablosunu doğrudan etkilemiyor." },
        { parameter: "Trombosit",       value: 188,  unit: "×10³/μL",     reference_range: "150-400" },
      ],
      comment: "Kreatinin 2.1 + eGFR 28: glimepirid aktif metabolitleri birikmekte. Uzamış hipo ve rebound riski yüksek. Sülfonilüre derhal kesilmeli.",
    },
    "hipo-etiology-panel": {
      id: "hipo-etiology-panel",
      name_tr: "Hipoglisemi Etiyoloji Paneli",
      results: [
        { parameter: "C-Peptid",          value: 3.8,    unit: "ng/mL",  reference_range: "0.8-3.1",   flag: "H",
          interpretation: "Yüksek C-peptid = endojen insülin fazlalığı. İnsülinoma veya sülfonilüre uyarımı — ekzojen insülin değil." },
        { parameter: "İnsülin",           value: "Yüksek", unit: "μU/mL", reference_range: "2-20 (açlık)", flag: "H",
          interpretation: "Endojen insülin fazla — sülfonilüre uyarısıyla uyumlu." },
        { parameter: "Proinsülin",        value: "Normale yakın", unit: "", reference_range: "Normale yakın",
          interpretation: "Normal proinsülin/insülin oranı insülinoma olasılığını azaltır." },
        { parameter: "Sülfonilüre Düzeyi", value: "POZİTİF", unit: "", reference_range: "Negatif", flag: "C",
          interpretation: "Sülfonilüre varlığı konfirme. Iatrojenik hipoglisemi tanısı kesinleşti." },
        { parameter: "Kortizol",          value: 22,     unit: "μg/dL",  reference_range: "5-25",
          interpretation: "Normal — adrenal yetmezlik dışlandı." },
        { parameter: "TSH",               value: 2.4,    unit: "mIU/L",  reference_range: "0.4-4.0",
          interpretation: "Normal — hipotiroidizm hipoglisemi açıklamıyor." },
      ],
      comment: "C-peptid yüksek + sülfonilüre pozitif + insülin yüksek → iatrojenik sülfonilüre hipoglisemisi. İnsülinoma veya ekzojen insülin dışlandı.",
    },
  },

  result_delay_seconds: {
    "hipo-poc-glucose":      60,
    "hipo-bmp-lft-cbc":     900,
    "hipo-etiology-panel": 3600,
  },

  // lab_timeline: tedavi yanıtı (t=30dk) + rebound hipo (t=120dk)
  // Not: t=240dk alternatif yol (oktreotid → stabil / sadece dekstroz → 3. atak) engine'de
  // conditional branching olmadığından step geri bildirim metinleriyle modellendi.
  lab_timeline: [
    {
      panel_id: "hipo-poc-glucose",
      at_minute: 30,
      results: [
        { parameter: "POC Kapiller Glukoz", value: 110, unit: "mg/dL", reference_range: "70-180",
          interpretation: "IV dekstroz %50 sonrası düzelme. Hasta bilinç açıldı. Oryantasyon tam." },
        { parameter: "Venöz Glukoz",        value: 115, unit: "mg/dL", reference_range: "70-110", flag: "H" },
      ],
    },
    {
      panel_id: "hipo-poc-glucose",
      at_minute: 120,
      results: [
        { parameter: "POC Kapiller Glukoz", value: 58, unit: "mg/dL", reference_range: "70-180", flag: "L",
          interpretation: "REBOUND HİPO: sülfonilüre yarı ömrü CKD'de 24-72 saate uzar. Sürekli dekstroz infüzyonu yetmedi. Oktreotid düşün." },
        { parameter: "Venöz Glukoz",        value: 62, unit: "mg/dL", reference_range: "70-110", flag: "L" },
      ],
    },
  ],

  steps: [
    // ========================================================
    // ADIM 1 — İlk Değerlendirme
    // ========================================================
    {
      id: "step-1-degerlendir",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta getiriliyor. Konfüze (GKS 12), terli, tremoru var. İlk ne yaparsınız?",
      narrative:
        "68 yaşında erkek hasta yakınları tarafından acile getirildi. Eşi 'sabahtan beri titriyor, tutarsız konuşuyor' diyor. Hasta soruları gecikmeyle ve yanlış yanıtlıyor.",
      min_difficulty: 1,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "glukometre" },
          points: 30,
          critical: true,
          feedback:
            "Doğru! Konfüzyon + titreme + terleme triadında ilk adım kan glukozu ölçümüdür. Glukometre: 38 mg/dL — ciddi semptomatik hipoglisemi. Whipple triadı: glukoz <55 + semptom + tedaviye yanıt.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback:
            "Monitöre bağlandı: HR 112, SpO₂ %97. Monitorizasyon doğru — ama glukoz ölçümü önce gelir.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback:
            "IV kateter yerleştirildi — tedavi için gerekli. Ancak tanıyı doğrulamak (glukometre) önce gelir.",
        },
        {
          action: { type: "give_medication", target_id: "insulin_regular" },
          points: -25,
          critical: true,
          feedback:
            "KRİTİK HATA! Konfüze, terli hastaya tanı koymadan insülin vermek yaşamı tehdit eder. Kan glukozu ölçülmeden asla insülin verilmez.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Konfüze hasta için önce A-B-C değerlendirmesi, monitorizasyon ve kan glukozu ölçümü.",
    },

    // ========================================================
    // ADIM 1b — Tetkik İstemi (Faz 5.6 — lab entegrasyonu)
    // ========================================================
    // Felsefe: "Önce tedavi → sonra lab". POC glukoz + IV dekstroz
    // eşzamanlı olmalı. Lab beklemek = tedavi gecikmesi.
    {
      id: "s2b_orders",
      kind: "action",
      title: "Tetkik İstemi",
      prompt:
        "Glukometre 38 mg/dL. İV yol açıldı. Hangi tetkikleri istersiniz? (Tedavi aynı anda başlanabilir)",
      narrative:
        "Hasta monitörize, IV yol açık. Glukometre değeri 38 mg/dL. Tetkik istemi aşaması — ancak hipoglisemide tedavi tetkik sonuçları beklenmeden başlanır.",
      min_actions: 1,
      max_actions: 5,
      expected_outcomes: [
        {
          action: { type: "order_test", target_id: "hipo-poc-glucose" },
          points: 30,
          feedback:
            "Doğru — POC kapiller glukoz anlık sonuç verir, tedavi gecikmesi olmaz. Venöz glukoz doğrulama için ek değer sağlar. Whipple triadının ilk kolu.",
        },
        {
          action: { type: "order_test", target_id: "hipo-bmp-lft-cbc" },
          points: 25,
          feedback:
            "Doğru — BMP + Kreatinin CKD değerlendirmesi ve sülfonilüre akümülasiyon riskini ortaya çıkarır. HbA1c ile glisemik kontrol kalitesi görülür. Tedavi planlaması için kritik.",
        },
        {
          action: { type: "order_test", target_id: "hipo-etiology-panel" },
          points: 20,
          feedback:
            "Doğru (Seviye 2+) — C-peptid + sülfonilüre düzeyi uzamış hipoglisemi etiyolojisini netleştirir. Sonuç 60 dakikada gelir — tedavi beklenilmez, ama retrospektif tanı önemli.",
          min_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: -15,
          feedback:
            "Gereksiz — hipoglisemide rutin EKG endikasyonu yok. Semptomları hipoglisemi açıklıyor. Gereksiz tetkik tedavi gecikmesi ve kaynak israfına yol açar.",
        },
        {
          action: { type: "use_equipment", target_id: "beyin_bt" },
          points: -15,
          feedback:
            "Gereksiz — fokal nörolojik defisit yok, hipoglisemi semptomları açıklıyor. Beyin BT hipoglisemide rutin değil; gereksiz radyasyon + tedavi gecikmesi. Fokal defisit kalmadıkça görüntüleme önerilmez.",
        },
        {
          action: { type: "examine", target_id: "idrar_tahlili" },
          points: -10,
          feedback:
            "Öncelik değil — hipoglisemi tanısı ve yönetiminde idrar tahlili katkı sağlamaz. Enfeksiyon şüphesi yoksa gereksiz.",
        },
        {
          action: { type: "examine", target_id: "tedaviyi_ertele" },
          points: -25,
          critical: true,
          feedback:
            "KRİTİK HATA — sülfonilüre paneli 60 dakikada gelir. Hipoglisemide (GKS 12, glukoz 38) beyin hasarı beklemez. Kan glukozu ölçülmüşse eşzamanlı tedavi başlanır; lab sonucu beklenmez.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu tetkik hipoglisemi yönetiminde öncelik değil.",
    },

    // ========================================================
    // ADIM 2 — Akut Tedavi
    // ========================================================
    {
      id: "step-2-mudahale",
      kind: "action",
      title: "Akut Tedavi",
      prompt:
        "Kan glukozu 38 mg/dL. IV kateter yerleştirildi. Hasta oral alamıyor (GKS 12). Tedaviye nasıl başlarsınız?",
      narrative:
        "Glukometre 38 mg/dL. Hasta konfüze, oral alım güvenli değil. IV damar yolu açık. CKD var — sülfonilüre etkisi uzayabilir.",
      min_difficulty: 1,
      expected_outcomes: [
        {
          action: { type: "give_medication", target_id: "tiamin" },
          points: 15,
          feedback:
            "Doğru! Glukoz vermeden önce tiamin (B1, 100 mg IV): 2 haftadır iştahsız bu hastada Wernicke ensefalopatisi riskini azaltır. İyi klinik pratik.",
        },
        {
          action: { type: "give_medication", target_id: "dekstroz_50" },
          points: 30,
          critical: true,
          feedback:
            "Doğru! 25 g (%50 dekstroz, 50 mL) IV push — semptomatik hipoglisemide birincil IV tedavi. CKD + sülfonilüre kombinasyonunda tek doz yetmeyebilir; 15-30 dk sonra glukozu yeniden kontrol et.",
          unlocks: ["step-3-takip"],
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 0,
          feedback:
            "Salin hipoglisemiyi tedavi etmez. Damar yolunu açık tutmak için kullanılabilir ama önce glukoz ver.",
        },
        {
          action: { type: "give_medication", target_id: "magnezyum_sulfat" },
          points: -10,
          feedback:
            "Yanlış öncelik. Magnezyum bu hastada endike değil. Acilen hipoglisemiyi düzelt.",
        },
        {
          action: { type: "give_medication", target_id: "insulin_regular" },
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA! Hipoglisemide insülin verilmez! Bu hastayı öldürebilir.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Hipoglisemi tedavisinde önce tiamin (Wernicke önlemi), sonra dekstroz %50 IV. Diğer ilaçlar şimdilik öncelik değil.",
    },

    // ========================================================
    // ADIM 3 — Tedavi Sonrası Karar
    // ========================================================
    {
      id: "step-3-takip",
      kind: "decision",
      title: "Tedavi Sonrası Karar",
      prompt:
        "Dekstrozdan 15 dk sonra glukoz 95 mg/dL. Hasta uyanık, oryantasyonu düzelmekte, 'çok yorgunum' diyor. Ne yaparsınız?",
      narrative:
        "Glukoz 95 mg/dL, GKS 14. Hasta iletişim kuruyor. Eşi 'eski haline döndü gibi' diyor. Glimepirid son dozu 6 saat önce — CKD nedeniyle yarı ömrü 2-3 katına çıkmış.",
      min_difficulty: 1,
      options: [
        {
          id: "opt-a",
          text: "Glukozu 2-4 saatte bir kontrol et, kompleks karbonhidrat yedir, sülfonilüreyü kes, 48-72 saat gözlemle.",
          correct: true,
          points: 30,
          feedback:
            "Doğru! Glimepirid yarı ömrü 5-8 saat ama CKD evre 3b-4'te (eGFR 28) aktif metabolit birikimi nedeniyle etki 24-72 saate uzayabilir. Sadece glukoz normalleşmesi taburculuk için yeterli değil. 48-72 saat gözlem şart.",
        },
        {
          id: "opt-b",
          text: "Glukoz normale döndü, taburcu et ve günlük dozunu yarıya indirmesini söyle.",
          correct: false,
          points: -20,
          feedback:
            "YANLIŞ! Glimepirid CKD'de birikir — kısa süreli düzelme güvenli taburculuk anlamına gelmez. Erken taburculuk rebound hipoglisemi ile ölümle sonuçlanabilir.",
        },
        {
          id: "opt-c",
          text: "%10 Dekstroz infüzyonu başla (100 mL/saat), sülfonilüreyü kes, endokrin konsültasyon iste.",
          correct: true,
          points: 20,
          feedback:
            "Kabul edilebilir — sürekli glukoz infüzyonu beslenemediyse uygundur. Tüm vakalarda rutin gerekmez; beslenirse oral yol tercih edilir. Endokrin konsültasyon önerilir.",
          min_difficulty: 2,
        },
        {
          id: "opt-d",
          text: "Sülfonilüreyü kes, glukoz 120 mg/dL üzerinde kalıncaya kadar insülin infüzyonu başla.",
          correct: false,
          points: -30,
          feedback:
            "KRİTİK HATA! Hipoglisemi tedavisinde insülin infüzyonu verilmez. Durumu ölümcül biçimde kötüleştirir.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 4b — Rebound Hipoglisemi (Faz 5.6)
    // ========================================================
    // t=120dk: lab_timeline POC 110→58 (sülfonilüre hâlâ aktif, CKD'de uzamış etki)
    {
      id: "s4b_recurrence",
      kind: "decision",
      title: "Rebound Hipoglisemi Yönetimi",
      prompt:
        "2 saat sonra (t=120dk): hasta yeniden diaforezi ve hafif konfüzyon. POC glukoz 58 mg/dL. Sülfonilüre düzeyi pozitif geldi — CKD nedeniyle etki devam ediyor. Yaklaşımınız?",
      narrative:
        "t=120dk — glukoz 58 mg/dL (rebound). Sülfonilüre düzeyi POZİTİF. Glimepirid yarı ömrü CKD'de 24-72 saate uzamış. Sürekli dekstroz infüzyonu tek başına yetersiz kalmış.",
      options: [
        {
          id: "opt-oktreotid",
          text: "Oktreotid 50-100 mcg SC (veya IV) + %10 dekstroz infüzyon sürdür",
          correct: true,
          points: 30,
          feedback:
            "Doğru! Oktreotid somatostatin analoğu olarak pankreas insülin salınımını baskılar — sülfonilüre etkisini antagonize eder. Endocrine Society 2009 (Cryer PE, JCEM): sülfonilüre hipoglisemisinde tek başına dekstrozdan üstün; tekrarlayan doz gerekebilir (her 6-8 saat). Bu yolda t=240dk glukoz 75-90 mg/dL stabilidir.",
        },
        {
          id: "opt-dekstroz-sadece",
          text: "Sürekli %10 dekstroz infüzyon devam et, oktreotid yok",
          correct: false,
          points: 5,
          feedback:
            "Yetersiz. Dekstroz infüzyonu kısa süreli stabilite sağlar ama sülfonilüre aktif kaldıkça insülin salgılamaya devam eder. t=240dk'da 3. rebound atağı olası. Oktreotid eklenmeli.",
        },
        {
          id: "opt-bolus-taburcu",
          text: "Bolus dekstroz %50 ver, ardından normal beslenme",
          correct: false,
          points: -15,
          feedback:
            "Yetersiz. Sülfonilüre CKD'de 24-72 saat aktif kalır — kısa bolus sonrası glukoz hızla tekrar düşer. Sürekli izlem ve glukoz desteği şart.",
        },
        {
          id: "opt-glukagon",
          text: "Glukagon 1 mg IM",
          correct: false,
          points: -10,
          feedback:
            "Sülfonilüre hipoglisemisinde glukagon etkisi sınırlı. Sülfonilüre pankreas beta hücrelerini sürekli uyardığından endojen insülin artmış; glukagon glikojenolizi uyarır ama insülin bunu hızla karşılar. Oktreotid (insülin salgılanmasını durdurmak) çok daha etkili.",
        },
        {
          id: "opt-oral-taburcu",
          text: "Oral glukoz tableti ver, eve gönder",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA! CKD + sülfonilüre kombinasyonunda ev ortamında ölümcül rebound riski var. Sülfonilüre etkisi 24-72 saat devam eder. Standart bakım: 48-72 saat yatış zorunlu.",
        },
      ],
    },

    // ========================================================
    // ADIM 5b — Disposition Kararı (Faz 5.6)
    // ========================================================
    {
      id: "s5b_disposition",
      kind: "decision",
      title: "Taburculuk / Yatış Kararı",
      prompt:
        "Glukoz stabilize oldu (oktreotid + dekstroz ile 80-90 mg/dL). Etiyoloji netleşti: iatrojenik sülfonilüre hipoglisemisi + CKD. Hasta için en uygun disposition?",
      narrative:
        "t=240dk — glukoz 85 mg/dL (oktreotid yolunda). Sülfonilüre düzeyi: pozitif. Etki 24-72 saat sürebilir. Hastanın yalnız yaşadığı öğrenildi.",
      options: [
        {
          id: "opt-yatis",
          text: "Dahiliye/endokrin servisine yatış, 48-72 saat gözlem, glimepirid kesilmesi, endokrinoloji konsültasyonu, DM yönetim revizyonu",
          correct: true,
          points: 25,
          feedback:
            "Doğru! Standart bakım: CKD + sülfonilüre hipoglisemisinde 48-72 saat gözlem zorunlu. Glimepirid kalıcı olarak kesilmeli, alternatif (DPP-4 inhibitörü veya GLP-1 agonisti) planlanmalı. Endokrinoloji konsültasyonu önerilir.",
        },
        {
          id: "opt-gozlem-kisa",
          text: "Acil gözlem 12 saat, glukoz stabile döndüyse taburcu",
          correct: false,
          points: -10,
          feedback:
            "Yetersiz. Sülfonilüre CKD'de 24-72 saat aktif kalır — 12 saat gözlem erken taburculuğa yol açar. Rebound hipoglisemi ve ev ortamında ölüm riski yüksek.",
        },
        {
          id: "opt-ev",
          text: "Oral glukoz tablet reçetesi yaz, ailesi bilgilendirildi, ertesi gün poliklinik",
          correct: false,
          points: -30,
          critical: true,
          feedback:
            "KRİTİK HATA! CKD + sülfonilüre kombinasyonu 24-72 saat gözlem gerektiren yüksek riskli tablodur. Ev taburculuğu standart bakım dışıdır — ölüme yol açabilir.",
        },
      ],
    },
  ],

  start_step_id: "step-1-degerlendir",

  scoring: {
    max_points: 255,
    passing_score: 153,
    grade_bands: { A: 230, B: 191, C: 153, D: 115 },
  },

  debrief: {
    key_learnings: [
      "Konfüzyon + terleme + taşikardi triadı → ilk eylem kan glukozu ölçümüdür; tanı koymadan ilaç verilmez (Whipple triadı: glukoz <55 + semptom + tedaviye yanıt)",
      "Hipoglisemide 'önce tedavi → sonra etiyoloji': lab sonuçları beklenmeden eşzamanlı glukoz tedavisi başlanır — tedavi gecikmesi beyin hasarına yol açar",
      "CKD evre 3b-4 + sülfonilüre = uzamış ve rebound hipoglisemi: glimepirid aktif metabolitleri böbrekte birikerek etki süresini 24-72 saate uzatır",
      "Oktreotid (somatostatin analoğu) sülfonilüre hipoglisemisinde pankreas insülin salınımını baskılar — tek başına dekstroz infüzyonundan üstün (Endocrine Society 2009)",
      "Glukagon sülfonilüre hipoglisemisinde sınırlı etkili: sülfonilüre insülin salgısını sürdürdüğünden glukagonun glikojenoliz etkisi hızla karşılanır",
      "Bu hastanın sülfonilüre reçetesi CKD evre 3b-4'te KONTRENDIKE idi: ADA 2025 + TEMD 2024 → eGFR <30 ml/dk'da glimepirid/gliklazid kullanılmamalı. Alternatif: DPP-4 inhibitörleri (sitagliptin doz ayarlı), GLP-1 agonistleri veya insülin (titrasyonla)",
      "CKD + sülfonilüre hipoglisemisi → 48-72 saat yatış zorunlu; erken taburculuk ev ortamında ölüm riski",
    ],
    references: [
      "ADA Standards of Medical Care in Diabetes 2025 — Section 6: Glycemic Targets (Hypoglycemia)",
      "Cryer PE et al. — Endocrine Society 2009 Hypoglycemia Clinical Practice Guideline (J Clin Endocrinol Metab 2009;94:709)",
      "TEMD 2024 — Türkiye Endokrinoloji ve Metabolizma Derneği Diyabet Tanı, Tedavi ve İzlem Kılavuzu",
      "Whipple AO — Pancreatic tumors and hypoglycemia. Ann Surg 1935 (Whipple triadı)",
    ],
    red_flags: [
      "GKS <13 + glukoz <50 → 50 mL D%50 derhal IV push, sonrası glukometre kontrolü ve yoğun bakım konsültasyonu",
      "CKD + sülfonilüre → uzamış hipoglisemi: tek doz dekstroz yetmez, 48-72 saat gözlem zorunlu",
      "Rebound hipoglisemi (glukoz normalleştikten 1-4 saat sonra tekrar düşme) → oktreotid 50-100 mcg SC düşün",
      "Fokal nörolojik defisit hipoglisemi düzeldikten sonra da devam ediyorsa → beyin görüntülemesi; yoksa gereksiz",
    ],
    next_scenarios: [],
  },
};
