// ============================================================
// MediSim TR — Hızlı Seri Entübasyon / Travma Havayolu
// ============================================================
// Klinik referans: Walls Manual of Emergency Airway Management
// 6th ed (2024), DAS Difficult Airway Society 2015/2022,
// ATLS 11. baskı (2022), Brain Trauma Foundation 2016,
// EAST Practice Management 2018, TARD 2021, AAGBI 2020.
// Faz 5.10 — lab + imaging entegrasyonu + 8 adım modernizasyon.
// Ana öğretim hedefi: 7P yapısı, LEMON zor havayolu, süksinilkolin
// kontrendikasyon (Türkiye yanlış bilgi düzeltme), TBI post-intübasyon
// yönetimi (MAP ≥80, hiperventilasyon kontrendike).
// Klinik review: Mehmet Ali (kullanıcı) — TODO
// ============================================================

import type { Scenario } from "@/engine";

export const scenario_rsi_entübasyon: Scenario = {
  id: "anestezi-rsi-001",
  version: "2.0.0",
  title: "35 Yaş Erkek — Travma, GKS 9, Servikal Kırık",
  description:
    "Trafik kazasında araç dışına fırlayan hasta. GKS 9, subdural hematom, C5-C6 kırığı, tam mide, alkol. Hemodinamik sınır. 7P RSI — LEMON değerlendirme, MILS, TBI post-entübasyon yönetimi.",
  specialty: "anestezi",
  tags: ["rsi", "entübasyon", "havayolu", "anestezi", "travma", "tbi", "servikal-kirik", "lemon", "7p"],
  difficulty: 3,
  supported_difficulties: [2, 3, 4, 5],
  estimated_minutes: 18,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  last_updated: "2026-04-27",

  patient: {
    age: 35,
    sex: "M",
    weight_kg: 80,
    height_cm: 175,
    chief_complaint:
      "Trafik kazası, araç dışına fırlamış. GKS 9 (E2V2M5). Yüzde laserasyonlar, boyun ağrısı. Son yemek 2 saat önce.",
    history_items: [
      "Bilinen hastalık yok (aile ifadesi)",
      "Son yemek: 2 saat önce — TAM MİDE (aspirasyon riski yüksek!)",
      "Alkol kokusu — kanda alkol ölçümü bekleniyor",
      "Boyun travması — servikal stabilizasyon uygulandı, C5-C6 kırık şüphesi",
      "Araç dışı fırlama — yüksek enerjili mekanizma, subdural/kafa travması şüphesi",
    ],
    allergies: [],
    current_medications: [],
    modifiers: {},
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 98,
    bp_diastolic: 62,
    spo2: 91,
    temp: 36.8,
    rr: 26,
    pain: 5,
    gcs: 9,
  },

  available_medications: [
    "propofol",
    "ketamin",
    "etomidat",
    "süksinilkolin",
    "rokuronyum",
    "sugammadeks",
    "atropin",
    "fentanil",
    "morfin",
    "midazolam",
    "adrenalin",
    "noradrenalin",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "oksijen_maske",
    "bvm_maskesi",
    "larengoskop",
    "videolaringoskop",
    "endotrakeal_tup",
    "bougie",
    "lma",
    "cricothyrotomy_seti",
    "kapnograf",
    "iv_kateter_18g",
    "servikal_yaka",
    "aspirator",
  ],

  ekg_pattern: "sinüs_taşikardisi",

  // ⚠️ MILS zorunlu (C5-C6 kırık). Servikal yaka RSI sırasında geçici
  // çıkarılabilir ama 2. asistan MILS uygular. Yaka kaldırmadan entübasyon
  // görüş kısıtlaması yaratır.

  lab_panels: {
    "rsi-pre-abg": {
      id: "rsi-pre-abg",
      name_tr: "Pre-RSI Kan Gazı",
      collected_at_min: 5,
      results: [
        {
          parameter: "pH",
          value: 7.32,
          unit: "",
          reference_range: "7.35-7.45",
          flag: "L",
          interpretation:
            "Hafif respiratuvar + metabolik asidoz — hipoventilasyon (GKS↓) + travma laktatı",
        },
        {
          parameter: "pCO2",
          value: 48,
          unit: "mmHg",
          reference_range: "35-45",
          flag: "H",
          interpretation:
            "Hipoventilasyon — GKS 9 ile solunum yetmezliği. Preoksijenasyon kritik.",
        },
        {
          parameter: "pO2",
          value: 65,
          unit: "mmHg",
          reference_range: "80-100",
          flag: "L",
          interpretation:
            "Oda havasında hipoksemi — 100% O2 ile 3-5 dk preoks → pO2 >250 mmHg hedeflenir",
        },
        {
          parameter: "HCO3",
          value: 24,
          unit: "mEq/L",
          reference_range: "22-26",
        },
        {
          parameter: "SpO2 (hesaplanan)",
          value: 91,
          unit: "%",
          reference_range: ">95",
          flag: "L",
        },
        {
          parameter: "Laktat",
          value: 3.2,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "HH",
          interpretation:
            "Şok komponenti — travma kaynaklı hipoperfüzyon. Sıvı/kan hazırlığı gerekli.",
        },
      ],
      comment:
        "Preoksijenasyon hedefi: SpO2 %99, apne tolerans süresi maksimize et. pCO2 48 → 3-5 dk FiO2 100% ile düzeltilecek.",
    },
    "rsi-cbc-coag": {
      id: "rsi-cbc-coag",
      name_tr: "TKS + Koagülasyon + Kan Grubu",
      collected_at_min: 8,
      results: [
        {
          parameter: "Hgb",
          value: 11.8,
          unit: "g/dL",
          reference_range: "13-17",
          flag: "L",
          interpretation: "Hafif anemi — aktif kanama olabilir, Hgb takibi yap",
        },
        { parameter: "WBC", value: 14.2, unit: "×10³/μL", reference_range: "4-11", flag: "H" },
        { parameter: "Plt", value: 220, unit: "×10³/μL", reference_range: "150-400" },
        {
          parameter: "INR",
          value: 1.3,
          unit: "",
          reference_range: "0.8-1.2",
          flag: "H",
          interpretation: "Hafif uzama — alkol veya erken travma koagülopati. RSI'yı engellemez.",
        },
        { parameter: "aPTT", value: 32, unit: "sn", reference_range: "25-35" },
        {
          parameter: "Kan Grubu",
          value: "A Rh+",
          unit: "",
          interpretation: "Crossmatch alındı. Cerrahi girişim planlanırsa 2 Ü ES hazır.",
        },
      ],
      comment:
        "Hgb 11.8 + INR 1.3 + laktat 3.2 → travma koagülopati zemininde gelişiyor. Masif transfüzyon protokolü hazır ol.",
    },
    "rsi-bmp-tox": {
      id: "rsi-bmp-tox",
      name_tr: "BMP + Toksikoloji Taraması",
      collected_at_min: 10,
      results: [
        { parameter: "Na", value: 138, unit: "mEq/L", reference_range: "136-145" },
        { parameter: "K", value: 4.2, unit: "mEq/L", reference_range: "3.5-5.0" },
        { parameter: "Cr", value: 1.0, unit: "mg/dL", reference_range: "0.6-1.1" },
        {
          parameter: "Glukoz",
          value: 145,
          unit: "mg/dL",
          reference_range: "70-110",
          flag: "H",
          interpretation: "Stres hiperglisemisi — travma yanıtı",
        },
        {
          parameter: "Alkol (kanda)",
          value: 180,
          unit: "mg/dL",
          reference_range: "<10",
          flag: "HH",
          interpretation:
            "İleri sarhoşluk (>150 mg/dL). GKS düşüklüğüne katkıda. RSI sonrası uyanma gecikmesi beklenir.",
        },
        {
          parameter: "Opiat tarama",
          value: "Negatif",
          unit: "",
          reference_range: "Negatif",
        },
        {
          parameter: "Kokain/amfetamin",
          value: "Negatif",
          unit: "",
          reference_range: "Negatif",
        },
      ],
      comment:
        "⚠️ Alkol 180 mg/dL: GKS'ye katkı büyük. Subdural hematom + alkol etkisi ayrıştırılmalı (kafa BT sonucu kritik). Sedasyon dozu dikkatli titre et.",
    },
    "rsi-post-abg": {
      id: "rsi-post-abg",
      name_tr: "Post-Entübasyon Kan Gazı",
      collected_at_min: 30,
      results: [
        {
          parameter: "pH",
          value: 7.40,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "Normalize oldu — ventilatör ayarları uygun",
        },
        {
          parameter: "pCO2",
          value: 38,
          unit: "mmHg",
          reference_range: "35-45",
          interpretation: "Normal — hiperventilasyon yok (TBI'da kritik)",
        },
        {
          parameter: "pO2",
          value: 180,
          unit: "mmHg",
          reference_range: "80-100",
          interpretation: "FiO2 %100 ile yüksek — SpO2 %100. FiO2 yavaş düşür (SpO2 ≥94 koruyarak).",
        },
        { parameter: "HCO3", value: 24, unit: "mEq/L", reference_range: "22-26" },
        {
          parameter: "Laktat",
          value: 2.8,
          unit: "mmol/L",
          reference_range: "<2.0",
          flag: "H",
          interpretation: "Hâlâ yüksek ama düşüyor — sıvı/kan ile perfüzyon tedavisi devam et",
        },
        {
          parameter: "ETCO2",
          value: 38,
          unit: "mmHg",
          reference_range: "35-45",
          interpretation: "Kapnografi uyumlu — ventilatör normoventilasyon sağlıyor",
        },
      ],
      comment:
        "Ventilatör hedefleri TBI: PaCO2 35-40 mmHg (normoventilasyon), SpO2 ≥94%. Hiperventilasyon (PaCO2 <35) serebral vazokonstriksiyon → iskemi.",
    },
  },

  result_delay_seconds: {
    "rsi-pre-abg": 600,
    "rsi-cbc-coag": 900,
    "rsi-bmp-tox": 1800,
    "rsi-post-abg": 1800,
  },

  lab_timeline: [
    {
      at_minute: 5,
      panel_id: "rsi-pre-abg",
      results: [
        {
          parameter: "pH",
          value: 7.35,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "Preoksijenasyon sonrası respiratuar asidoz düzelmeye başladı",
        },
        {
          parameter: "pCO2",
          value: 43,
          unit: "mmHg",
          reference_range: "35-45",
          interpretation: "BVM destekli ventilasyon ile CO2 düşüyor",
        },
        {
          parameter: "pO2",
          value: 285,
          unit: "mmHg",
          reference_range: "80-100",
          interpretation: "FiO2 %100 + 5 dk preoks → apne tolerans süresi ~4-6 dk. RSI için hazır.",
        },
        { parameter: "SpO2 (hesaplanan)", value: 99, unit: "%", reference_range: ">95" },
        { parameter: "Laktat", value: 3.0, unit: "mmol/L", reference_range: "<2.0", flag: "HH" },
      ],
    },
    {
      at_minute: 60,
      panel_id: "rsi-post-abg",
      results: [
        {
          parameter: "pH",
          value: 7.41,
          unit: "",
          reference_range: "7.35-7.45",
          interpretation: "60 dk stabiliizasyon — ventilatör yönetimi başarılı",
        },
        { parameter: "pCO2", value: 37, unit: "mmHg", reference_range: "35-45" },
        {
          parameter: "pO2",
          value: 145,
          unit: "mmHg",
          reference_range: "80-100",
          interpretation: "FiO2 %60'a düşürüldü, oxygenasyon iyi",
        },
        { parameter: "HCO3", value: 24, unit: "mEq/L", reference_range: "22-26" },
        {
          parameter: "Laktat",
          value: 1.8,
          unit: "mmol/L",
          reference_range: "<2.0",
          interpretation: "Normale ulaştı — resüsitasyon başarılı",
        },
      ],
    },
  ],

  imaging_results: {
    "kafa-bt-travma": {
      id: "kafa-bt-travma",
      name_tr: "Kafa BT (Kontrastsız)",
      modality: "ct",
      interpretation:
        "Sağ frontal subdural hematom 6 mm. Midline shift 3 mm sola. Kontüzyon odakları bifrontal. Bazal sisternalar açık — beyin sapı bası yok. Kafatası kırığı yok.",
      findings: [
        "Sağ frontal subdural hematom: 6 mm (akut — hiperdens)",
        "Midline shift: 3 mm sola",
        "Bifrontal kontüzyon odakları",
        "Bazal sisternalar: açık (beyin sapı bası YOK)",
        "Kafatası kırığı: YOK",
        "Hidrosefali: YOK",
        "ACİL NÖROŞİRURJİ KONSÜLTASYONU gerekli — operatif eşiği değerlendirsin",
      ],
      timestamp_min: 20,
    },
    "servikal-bt": {
      id: "servikal-bt",
      name_tr: "Servikal BT (C1-T1)",
      modality: "ct",
      interpretation:
        "C5-C6 fasetli kompresyon kırığı. Ligamentöz hasar şüphesi (MRI teyit gerekir). Kanal çapı kritik sınırda. RSI sırasında MILS zorunlu — servikal yaka geçici çıkarılabilir ama 2. asistan MILS uygular.",
      findings: [
        "C5-C6: Fasetli kompresyon kırığı",
        "Ligamentöz hasar: şüpheli (MRI gerekli)",
        "Spinal kanal çapı: kritik sınırda — instabilite riski",
        "C1-C4, C7-T1: Kırık yok",
        "⚠️ MILS ZORUNLU: Boyun fleksiyonu/ekstansiyonu medulla yaralanması yaratabilir",
      ],
      timestamp_min: 22,
    },
    "pa-grafi-tup": {
      id: "pa-grafi-tup",
      name_tr: "PA Akciğer Grafisi (Post-Entübasyon)",
      modality: "xray",
      interpretation:
        "ETT ucu karina 4 cm üzerinde (ideal konum). Bilateral akciğer alanları eşit havalanmış. Pnömotoraks yok. Sağ akciğerde hafif kontuzyona ait heterojen opasite.",
      findings: [
        "ETT ucu: karina 4 cm üstü — İDEAL KONUM ✓",
        "Bilateral havalanma: eşit ✓",
        "Pnömotoraks: YOK ✓",
        "Plevral efüzyon: minimal sağ",
        "Sağ akciğer alt lob: hafif kontüzyon opasitesi",
        "Mediastinum: normal genişlik",
      ],
      timestamp_min: 35,
    },
  },

  start_step_id: "s1_hazirlik",

  steps: [
    // ====================================================
    // ADIM 1 — RSI hazırlığı / 7P: Preparation + Preoxygenation
    // ====================================================
    {
      id: "s1_hazirlik",
      kind: "action",
      title: "RSI Hazırlığı — 7P: Hazırlık + Preoksijenasyon",
      prompt:
        "RSI kararı verildi. 7P yapısı: Preparation, Preoxygenation, Pretreatment, Paralysis+Induction, Position, Placement, Post-intubation. İlk iki P'yi uygulayın.",
      narrative:
        "SpO₂ %91, GKS 9, tam mide, servikal yaka, alkol kokusu. Laringoskop çalışır, 2 asistan hazır.",
      min_actions: 4,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 20,
          feedback:
            "✓ Preoksijenasyon: %100 O₂ NRB maske ile 3-5 dk. SpO₂'yi %99'a çıkar → apne tolerans süresi 4-6 dk. RSI'ın en kritik adımı.",
          vitals_change: { spo2: 99 },
        },
        {
          action: { type: "use_equipment", target_id: "aspirator" },
          points: 15,
          feedback:
            "✓ Aspirasyon hazır! Tam mide + bilinç bozukluğu = yüksek aspirasyon riski. Aspiratörün çalıştığını kontrol et, yanakta beklet.",
        },
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback: "✓ Kardiyak + SpO₂ + EtCO₂ sürekli monitorizasyon zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 10,
          feedback: "✓ Güvenilir IV yol — tercihen 2 adet (ilaç + sıvı/kan paralel).",
        },
        {
          action: { type: "use_equipment", target_id: "kapnograf" },
          points: 8,
          feedback:
            "✓ Kapnograf hazır — entübasyon sonrası EtCO₂ konfirmasyonu altın standart. TBI'da normoventilasyon (EtCO₂ 35-40) izlemi.",
        },
        {
          action: { type: "use_equipment", target_id: "videolaringoskop" },
          points: 15,
          feedback:
            "✓ Video laringoskopi Plan A olarak hazır. Servikal yaka + MILS → LEMON N kriteri + (Neck mobility 0) → DAS 2022: Servikal travmada video laringoskopi ilk tercih (EAST 2018 kanıtı).",
        },
        {
          action: { type: "use_equipment", target_id: "lma" },
          points: 10,
          feedback:
            "✓ LMA i-gel Plan B olarak hazır. DAS 2015 CICO algoritması: entübasyon başarısızsa supraglottik araç ikinci seçenek.",
        },
        {
          action: { type: "use_equipment", target_id: "cricothyrotomy_seti" },
          points: 10,
          feedback:
            "✓ Krikotirotomi seti Plan C olarak hazır. 'Cannot intubate, cannot oxygenate' (CICO) durumunda cerrahi havayolu. Hazır bulundurmak — standarttır.",
        },
        {
          action: { type: "use_equipment", target_id: "bougie" },
          points: 8,
          feedback:
            "✓ Bougie hazır — zor laringoskopi veya Cormack-Lehane Grad 3'te tüp yönlendirici. Rutin olarak hazırda bulunmalı.",
        },
        {
          action: { type: "examine", target_id: "malampati_havayolu" },
          points: 15,
          feedback:
            "✓ Zor havayolu muayenesi: Mallampati, 3-3-2 kuralı, ağız açıklığı, tiroid-çene mesafesi. Servikal yaka nedeniyle Mallampati değerlendirilemiyor → 'unknown/high risk' kabul et.",
          min_difficulty: 3,
        },
        {
          action: { type: "give_medication", target_id: "atropin" },
          points: 5,
          feedback:
            "Opsiyonel — Pretreatment: süksinilkolin refleks bradikardisi için pediatride standart, erişkinde tartışmalı. Bu hastada çocuk yok, opsiyonel kabul.",
          min_difficulty: 4,
        },
        {
          action: { type: "give_medication", target_id: "fentanil" },
          points: 8,
          feedback:
            "✓ Pretreatment: Fentanil 1-3 mcg/kg → larinkoskopi sempatik yanıtını köreltir (TBI'da ICP piki önler). Hemodinami dikkatli.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "RSI hazırlığında bu adım öncelik değil.",
    },

    // ====================================================
    // YENİ ADIM 1b — Pre-RSI lab + imaging değerlendirmesi
    // ====================================================
    {
      id: "s1b_lab_imaging_review",
      kind: "decision",
      title: "Pre-RSI Bütüncül Değerlendirme",
      prompt:
        "Lab ve imaging geldi: ABG (pH 7.32, pCO2 48, pO2 65, laktat 3.2), CBC (Hgb 11.8, INR 1.3), Alkol 180 mg/dL, Kafa BT (subdural 6mm, midline 3mm), Servikal BT (C5-C6 kırık). RSI öncesi en kritik bulgular ve planınız?",
      options: [
        {
          id: "opt_butunsel",
          text: "C5-C6 kırık → MILS zorunlu, yaka geçici açılır 2. asistan tutar; subdural + midline shift → nöroşirurji çağrısı, ICP yönetimi; alkol GKS'ye katkı → uyanma gecikebilir; laktat 3.2 → şok, kan/sıvı hazır",
          correct: true,
          points: 30,
          feedback:
            "✓ MÜKEMMEL bütüncül travma RSI değerlendirmesi. ATLS 11: Her risk faktörü RSI planını değiştiriyor. Alkol'ün GKS katkısını bilmek sedasyon dozunu ayarlar. BTF 2016: Subdural + midline → MAP ≥80 koru.",
        },
        {
          id: "opt_sadece_servikal",
          text: "Servikal kırık + MILS önemli, diğerleri ikincil",
          correct: false,
          points: 15,
          feedback:
            "⚠️ Kısmi. MILS doğru ama subdural hematom + alkol etkisi + laktat şok komponenti gözden kaçırıldı. Travma RSI bütüncül değerlendirme gerektirir.",
        },
        {
          id: "opt_gec_degerlendir",
          text: "Entübasyon acil, lab/imaging RSI sonrası değerlendirilir",
          correct: false,
          points: -25,
          feedback:
            "✗ Yanlış öncelik. C5-C6 kırık entübasyon tekniğini, subdural hematom post-entübasyon hedefleri, alkol sedasyon dozunu direk etkiliyor. Planlama hayat kurtarıcıdır.",
        },
        {
          id: "opt_yaka_cikar",
          text: "Görüş için servikal yakayı RSI öncesi çıkar",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. C5-C6 kırık + ligamentöz hasar şüphesi. Boyun hareketlenmesi medulla spinalis yaralanması = kalıcı tetrapleji veya ölüm. MILS uygulanırken geçici açılır, asla 'çıkar' değil.",
          critical: true,
        },
      ],
    },

    // ====================================================
    // YENİ ADIM 2b — LEMON skoru + zor havayolu planı
    // ====================================================
    {
      id: "s2b_lemon_difficult_airway",
      kind: "decision",
      title: "LEMON Değerlendirmesi + Zor Havayolu Planı",
      prompt:
        "LEMON: Look=servikal yaka + yüz travması, Evaluate 3-3-2=normal, Mallampati=servikal yaka nedeniyle DEĞERLENDİRİLEMİYOR, Obstruction=yok, Neck mobility=SERVİKAL YAKA=0. Yaklaşımınız?",
      options: [
        {
          id: "opt_tam_plan",
          text: "Plan A: Videolaringoskopi (McGrath/GlideScope) + MILS + bougie hazır / Plan B: LMA i-gel / Plan C: Krikotirotomi seti hazır — 2 deneyimli hekim, açık iletişim, CICO protokolü bilinen",
          correct: true,
          points: 35,
          feedback:
            "✓ MÜKEMMEL — DAS 2015 + 2022 update zor havayolu algoritması. Servikal kırık + bilinmeyen Mallampati + sıfır boyun mobilitesi = YÜKSEK RİSK. EAST 2018: Servikal travmada video laringoskopi birinci seçim. Her plan hazır = güvenli RSI.",
        },
        {
          id: "opt_standart_dl",
          text: "Standart direkt laringoskopi + MILS ile dene",
          correct: false,
          points: 5,
          feedback:
            "⚠️ Mümkün ama suboptimal. Servikal yaka + MILS + bilinmeyen Mallampati durumunda video laringoskopi standart bakım haline gelmiştir (EAST 2018, WALLS 2024). Direkt laringoskopi başarısız olursa geçen süre kritik.",
        },
        {
          id: "opt_awake_fiberoptik",
          text: "Awake fiberoptik entübasyon — en güvenli yöntem",
          correct: false,
          points: -15,
          feedback:
            "✗ Bu hasta için uygun değil. GKS 9 + alkol 180 mg/dL → koopere değil. Hemodinamik sınır, prosedür uzun sürer. Awake FOI koopere, hemodinamik stabil hastalarda tercih edilir.",
        },
        {
          id: "opt_krikotr_ilk",
          text: "Zor havayolu — krikotirotomi ilk seçim olarak uygula",
          correct: false,
          points: -25,
          feedback:
            "✗ Krikotirotomi son çare (Plan C). DAS 2015 CICO algoritması: Önce Plan A (video laringoskopi), Plan B (supraglottik), sonra Plan C. Doğrudan krikotirotomiye geçmek uygunsuz.",
        },
        {
          id: "opt_rsi_iptal",
          text: "RSI iptal — hasta uyandırılsın, uyumlu olunca entübe et",
          correct: false,
          points: -30,
          feedback:
            "✗ KRİTİK HATA. GKS 9 + tam mide + SpO₂ 91% + hava yolu koruma yetisi kaybı → hava yolu güvence altına alınması zorunlu. RSI'yı iptal etmek seçenek değildir.",
          critical: true,
        },
      ],
    },

    // ====================================================
    // ADIM 2 — İndüksiyon ajanı seçimi
    // ====================================================
    {
      id: "s2_indüksiyon",
      kind: "decision",
      title: "İndüksiyon Ajanı — Hemodinami + TBI",
      prompt:
        "Hasta: TA 98/62 (hemodinamik sınır), GKS 9, subdural hematom. Hangi indüksiyon ajanını seçersiniz?",
      options: [
        {
          id: "opt_ketamin",
          text: "Ketamin 1-2 mg/kg IV — hemodinamik stabilite + TBI'da güvenli (güncel kanıt)",
          correct: true,
          points: 25,
          feedback:
            "✓ DOĞRU. Ketamin sempatomimetik etki → BP korur. TBI'da ICP artışı eski endişesi — güncel kanıt (WARS Trial 2024, Upchurch 2018) bu endişeyi desteklemiyor. Sınır hemodinami + travmada birinci tercih.",
        },
        {
          id: "opt_etomidat",
          text: "Etomidat 0.3 mg/kg IV — kardiyovasküler nötr",
          correct: true,
          points: 25,
          feedback:
            "✓ DOĞRU. Etomidat hemodinamiyi en az etkileyen ajan. Kortizol baskısı tek doz sorun yaratmaz. Klasik travma RSI ajanı. Ketamin ile eşit değerli.",
        },
        {
          id: "opt_propofol",
          text: "Propofol 1.5-2 mg/kg IV",
          correct: false,
          points: -15,
          feedback:
            "✗ Bu hastada yüksek risk. Propofol belirgin vazodilatasyon + kardiyak baskı yapar. TA 98/62 → propofol ile ciddi hipotansiyon, TBI'da MAP ≥80 hedefi tehlikeye girer.",
        },
        {
          id: "opt_midazolam",
          text: "Midazolam 0.1 mg/kg IV tek başına",
          correct: false,
          points: -20,
          feedback:
            "✗ Midazolam RSI indüksiyonu için hem çok yavaş başlangıç (3-5 dk) hem de yeterince güçlü değil. Yardımcı ajan olarak kullanılabilir ama tek başına RSI indüksiyonu yapamaz.",
        },
      ],
    },

    // ====================================================
    // ADIM 3 — Nöromüsküler bloker seçimi
    // ====================================================
    {
      id: "s3_nmb_secimi",
      kind: "decision",
      title: "Nöromüsküler Bloker Seçimi",
      prompt:
        "İndüksiyon sonrası hangi nöromüsküler bloker kullanırsınız? Servikal kırık + tam mide + hız kritik.",
      options: [
        {
          id: "opt_suksinilkolin",
          text: "Süksinilkolin 1.5 mg/kg IV — hızlı başlangıç (60-90sn), kısa süre (9-13dk)",
          correct: true,
          points: 25,
          feedback:
            "✓ DOĞRU. Akut travma (<48h) süksinilkolin için klasik endikasyon. Hızlı etki + kısa süre = zor havayolunda kas tonusu hızla geri döner. Kontrendikasyon kontrolü sonraki adımda.",
        },
        {
          id: "opt_rokuronyum",
          text: "Rokuronyum 1.2 mg/kg IV — yüksek doz RSI, sugammadeks ile reversibl",
          correct: true,
          points: 25,
          feedback:
            "✓ DOĞRU — Modern alternatif. Yüksek doz rokuronyum RSI koşullarını karşılar (~60 sn). Sugammadeks 16 mg/kg ile 3 dk'da tam reversiyon. Avrupa/UK merkezlerinde süksinilkolinle eşdeğer veya tercih edilen.",
        },
        {
          id: "opt_rokuronyum_dusuk",
          text: "Rokuronyum 0.6 mg/kg IV — standart doz",
          correct: false,
          points: -10,
          feedback:
            "✗ Yanlış doz. Standart doz 3-5 dk başlangıç — RSI koşullarını sağlamaz. RSI için 1.2 mg/kg zorunlu.",
        },
        {
          id: "opt_vekuronyum",
          text: "Vekuronyum 0.1 mg/kg — nöromüsküler bloker",
          correct: false,
          points: -15,
          feedback:
            "✗ Vekuronyum başlangıcı 3-5 dk — RSI için tamamen uygunsuz. Hız RSI'ın tanımıdır.",
        },
      ],
    },

    // ====================================================
    // YENİ ADIM 3b — Süksinilkolin kontrendikasyon kontrolü
    // ====================================================
    {
      id: "s3b_succinilkolin_kontrendikasyon",
      kind: "decision",
      title: "Süksinilkolin Kontrendikasyon Kontrolü",
      prompt:
        "Süksinilkolin seçildi. Bu hasta için kontrendikasyon kontrolü: 35y erkek, akut travma (1 saat önce), yanık/ezilme/denervasyon öyküsü yok, müsküler distrofi/MH aile öyküsü sorgulandı (negatif), K 4.2 mEq/L normal, böbrek fonksiyonu normal. Karar?",
      options: [
        {
          id: "opt_guvenli",
          text: "GÜVENLI — Akut travma <24h: süksinilkolin standart endikasyon; hiperkalemi riski ezilme/yanık/immobilizasyon >48h'de gelişir; MH öyküsü negatif; K normal",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU. WALLS 2024 + AAGBI 2020: Akut travma süksinilkolin için güvenli. Hiperkalemik arrest riski sadece: >48h denervasyon, yanık >24h, ezilme sendromu ≥48h, immobilizasyon kronik. Bu hasta 1 saat önce yaralandı — bu kriterler yok.",
        },
        {
          id: "opt_rokuronyum_tercih",
          text: "Rokuronyum + sugammadeks tercih — modern yaklaşım, her iki ajan güvenli bu hastada",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU alternatif. Rokuronyum + sugammadeks kombinasyonu Avrupa merkezlerinde giderek tercih edilmekte. Süksinilkolin eşit güvenli ama rokuronyum reversibilite avantajı sunar. İkisi de doğru seçim.",
        },
        {
          id: "opt_kontrol_sonra",
          text: "Süksinilkolini verdikten sonra kontrendikasyon kontrol ederim",
          correct: false,
          points: -15,
          feedback:
            "✗ Sıralama hatalı. Hiperkalemik kardiyak arrest saniyeler içinde gelişebilir. Kontrendikasyon kontrol ETKİDEN ÖNCE yapılır.",
        },
        {
          id: "opt_her_travma_kontrendike",
          text: "Tüm travmalarda süksinilkolin kontrendike — rokuronyuma geç",
          correct: false,
          points: -15,
          feedback:
            "✗ TÜRKİYE'DE YAYGIN YANLIŞ İNANIŞ. Süksinilkolin YALNIZCA >48h ezilme/yanık/denervasyonda kontrendike. Akut travma kontrendikasyon değil — aksine klasik endikasyondur. WALLS 2024: Bu yanılgı gereksiz rokuronyum kullanımına yol açıyor.",
        },
        {
          id: "opt_kontrol_yok",
          text: "Kontrendikasyon kontrolüne gerek yok, RSI'da her zaman güvenli",
          correct: false,
          points: -25,
          feedback:
            "✗ Tehlikeli yaklaşım. Hiperkalemik kardiyak arrest süksinilkolinin ölümcül komplikasyonudur. Kontrol yapılmalı — bu hasta için güvenli, ama her hasta için kontrol standart.",
        },
      ],
    },

    // ====================================================
    // ADIM 4 — Entübasyon ve konfirmasyon
    // ====================================================
    {
      id: "s4_entübasyon_konfirmasyon",
      kind: "action",
      title: "Entübasyon + Tüp Konfirmasyonu (3 Yöntem)",
      prompt:
        "İlaçlar verildi, kas gevşemesi sağlandı. MILS aktif. Entübasyonu gerçekleştirin ve tüp yerini 3 yöntemle doğrulayın.",
      min_actions: 3,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "videolaringoskop" },
          points: 20,
          feedback:
            "✓ Videolaringoskopi ile laringoskopi. MILS altında optimal görüş. Cormack-Lehane Grad I: vokal kordlar tam görünüyor.",
        },
        {
          action: { type: "use_equipment", target_id: "larengoskop" },
          points: 12,
          feedback:
            "Kabul — Direkt laringoskopi. MILS altında daha zor ama deneyimli ellerde uygulanabilir. Video laringoskopi tercih edilmeliydi.",
        },
        {
          action: { type: "use_equipment", target_id: "endotrakeal_tup" },
          points: 15,
          feedback:
            "✓ ETT yerleştirildi. 80 kg erkek için 8.0 mm iç çap, 23 cm diş hizasında. Balon şişirildi.",
        },
        {
          action: { type: "use_equipment", target_id: "kapnograf" },
          points: 25,
          feedback:
            "✓ EtCO₂ ALTIN STANDART. Dalga formu görülüyor, EtCO₂ 38 mmHg — ETT doğru yerde. TBI'da normoventilasyon (35-40 mmHg) sağlandı. Özofageal entübasyon %100 ekarte.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback:
            "✓ SpO₂ 99% — oxygenasyon mükemmel. Birlikte 3 yöntemle konfirmasyon: EtCO₂ + oskültasyon + SpO₂ yükselmesi.",
        },
        {
          action: { type: "examine", target_id: "aci_hareketleri" },
          points: 12,
          feedback:
            "✓ Bilateral eşit oskültasyon: Her iki akciğer havalanıyor. Sol ana bronş entübasyonu (tek akciğer) ekarte edildi.",
        },
        {
          action: { type: "order_test", target_id: "pa-grafi-tup" },
          points: 8,
          feedback:
            "✓ PA grafi ile tüp konfirmasyonu: ETT karina 4 cm üstü — ideal. Bilateral havalanma eşit, pnömotoraks yok. Rutin post-entübasyon konfirmasyonu.",
          min_difficulty: 3,
        },
        {
          action: { type: "use_equipment", target_id: "bougie" },
          points: 8,
          feedback:
            "✓ Bougie kullanıldı — zor laringoskopide tüp yönlendirme. Cormack-Lehane Grad 2-3'te standarttır.",
          min_difficulty: 3,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback: "Entübasyon ve konfirmasyonda bu adım öncelik değil.",
    },

    // ====================================================
    // YENİ ADIM 5 — Post-entübasyon komplikasyon yönetimi
    // ====================================================
    {
      id: "s5_post_intubation",
      kind: "decision",
      title: "Post-Entübasyon Hipotansiyon + TBI Yönetimi",
      prompt:
        "Entübasyon sonrası 5. dk: TA 78/45 (MAP ~56), HR 130, SpO₂ %100, EtCO₂ 38. Post-entübasyon hipotansiyon. TBI hastası — MAP <65 nöron kaybı. Yaklaşımınız?",
      options: [
        {
          id: "opt_sivit_vazopressor",
          text: "Sıvı bolus 500 mL + sedasyon dozunu azalt + push-dose adrenalin (10-20 mcg IV) hazırla + pnömotoraks/kanama ekarte et",
          correct: true,
          points: 30,
          feedback:
            "✓ EMCrit / WALLS 2024 post-entübasyon hipotansiyon yönetimi. Sedasyon en sık neden — doz azalt. Push-dose adrenalin (10-20 mcg IV bolus) köprü vazopressör. DOPES: Displacement, Obstruction, Pneumothorax, Equipment, Stacking (oto-PEEP).",
        },
        {
          id: "opt_tbi_map",
          text: "TBI MAP hedefi ≥80 → noradrenalin/adrenalin infüzyon başla + nöroşirurji koordine et + serebral perfüzyon koru",
          correct: true,
          points: 30,
          feedback:
            "✓ DOĞRU — BTF 2016: Ağır TBI'da MAP ≥80 mmHg (CPP = MAP - ICP ≥60 mmHg). Hipotansiyon ikincil beyin hasarının en önemli nedeni. Subdural hematom + midline shift varsa nöroşirurji ile paralel yönet.",
        },
        {
          id: "opt_izle",
          text: "Post-entübasyon hipotansiyon geçici, izle",
          correct: false,
          points: -15,
          feedback:
            "✗ TBI'da 1 dakikalık hipotansiyon bile nörolojik prognozu kötüleştirir. 'İzle' bu durumda kabul edilemez — MAP ≥80 korumak için aktif tedavi zorunlu.",
        },
        {
          id: "opt_hiperventilasyon",
          text: "ICP yüksek olabilir — hiperventilasyon yap (EtCO₂ 25-30 mmHg hedefle)",
          correct: false,
          points: -25,
          feedback:
            "✗ BTF 2016: Rutin hiperventilasyon KONTRENDİKE. EtCO₂ <35 → serebral vazokonstriksiyon → iskemi. YALNIZCA transtentoryal herniyasyon (Cushing triadı, bilateral pitoz) bulgularında geçici (15-20 dk). Post-ABG pCO₂ 38 normal — dokunma.",
        },
        {
          id: "opt_sedasyon_artir",
          text: "Hasta hareket ediyor — sedasyonu derinleştir",
          correct: false,
          points: -20,
          feedback:
            "✗ Sedasyon artışı hipotansiyonu ağırlaştırır. Önce neden değerlendir (DOPES), sonra doz ayarla. Sebep bilinmeden artırma — TBI'da çift hasar yaratır.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 375,
    passing_score: 205,
    grade_bands: {
      A: 306,
      B: 255,
      C: 205,
      D: 153,
    },
    time_bonus: {
      target_seconds: 720,
      bonus_points: 10,
    },
  },

  debrief: {
    key_learnings: [
      "7P RSI yapısı: Preparation, Preoxygenation, Pretreatment, Paralysis+Induction, Position, Placement, Post-intubation. Her P atlanabilir değil (WALLS 2024).",
      "LEMON skoru: Look, Evaluate 3-3-2, Mallampati, Obstruction, Neck mobility. Servikal yaka = N kriteri + → Video laringoskopi birinci tercih (DAS 2022 + EAST 2018).",
      "MILS (Manuel In-Line Stabilization): Servikal kırıklı hastada RSI zorunlusu. Yaka geçici çıkarılabilir ama 2. asistan MILS sürdürür. Yaka çıkarmak = ölümcül medulla riski.",
      "Süksinilkolin akut travmada GÜVENLİDİR. Kontrendikasyon: >48h ezilme/yanık/denervasyon/immobilizasyon. Bu yanılgı Türkiye'de yaygın — akut travma klasik endikasyondur.",
      "TBI + hipotansiyon = ikincil beyin hasarı. MAP ≥80 hedefi (BTF 2016). Noradrenalin/push-dose adrenalin ile hızlı düzelt.",
      "Hiperventilasyon (PaCO₂ <35): rutin KONTRENDİKE. Serebral vazokonstriksiyon → iskemi. Yalnızca transtentoryal herniyasyon bulgusu varsa geçici uygula.",
      "Post-entübasyon hipotansiyon DOPES: Displacement (tüp yeri), Obstruction, Pneumothorax, Equipment, Stacking (oto-PEEP). Hep sistematik değerlendir.",
      "Tüp konfirmasyonu 3 yöntem: EtCO₂ dalga formu (altın standart) + bilateral oskültasyon + PA grafi (konum).",
    ],
    references: [
      "Brown CA 3rd, Walls RM. Manual of Emergency Airway Management 6th ed — 2024",
      "Frerk C. et al. DAS Difficult Airway Society 2015 Guidelines + 2022 Update",
      "ATLS Advanced Trauma Life Support 11th Edition — 2022",
      "Brain Trauma Foundation. Guidelines for Management of Severe TBI — 2016",
      "EAST Practice Management Guidelines — Airway Management in Trauma — 2018",
      "TARD (Türk Anesteziyoloji Reanimasyon Derneği) Travma Hava Yolu Rehberi 2021",
      "AAGBI Pre-hospital RSI Guidance — 2020",
    ],
    red_flags: [
      "EtCO₂ yok → özofageal entübasyon! Anında çıkar, BVM ile okside et, yeniden planla",
      "Servikal kırıklı hastada yaka çıkarıp MILS uygulamadan laringoskopi = tetrapleji/ölüm riski",
      "Post-entübasyon MAP <65 + TBI → derhal vazopressör/sıvı; 1 dk bile bekletme",
      "Hiperventilasyon (EtCO₂ <35) rutin uygulamak → serebral iskemi",
      "Süksinilkolin + hiperkalemi riski: ezilme/yanık/denervasyon >48h → rokuronyuma geç",
      "SpO₂ entübasyon sırasında <88% → STOP, BVM ile okside et, sonra tekrar dene",
    ],
    next_scenarios: [], // Anestezi branşı genişlerken: zor havayolu CICO, malign hipertermi
  },
};
