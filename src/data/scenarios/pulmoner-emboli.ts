import type { Scenario } from "@/engine";

// ============================================================
// Pulmoner Emboli Senaryosu — Masif PE, 54y Kadın
// ============================================================
// Post-op 3. gün kalça artroplastisi → ani nefes darlığı + plöretik ağrı
// Hemodinamik bozukluk → yüksek riskli (masif) PE
//
// Zorluk seviyeleri 1-5 destekli.
// S1-2: ABCDE, temel Wells, BT anjiyografi kararı
// S3:   + Wells hesaplama nüansı, D-dimer tuzağı
// S4-5: + Tromboliz kontrendikasyon analizi (post-op göreceli KI),
//         vasopresör seçimi, post-tromboliz antikoagülasyon protokolü
//
// Referans: ESC 2019 Akut PE Tanı ve Tedavi Kılavuzu,
//           AHA 2011 PE Scientific Statement,
//           TKD 2020 Venöz Tromboembolizm
// ============================================================

export const scenario_pulmoner_emboli: Scenario = {
  id: "acil-pulmoner-emboli-001",
  version: "1.0.0",
  title: "54 Yaş Kadın — Ani Nefes Darlığı (Masif PE)",
  description:
    "Sol kalça artroplastisi sonrası 3. günde ani başlayan ağır nefes darlığı, plöretik göğüs ağrısı ve hemodinamik bozukluk. Masif pulmoner emboli tanısı ve yönetimi.",
  specialty: "acil",
  tags: ["pulmoner-emboli", "pe", "tromboliz", "dvt", "antikoagülan", "masif-pe", "wells"],
  difficulty: 3,
  supported_difficulties: [1, 2, 3, 4, 5],
  estimated_minutes: 18,
  modes: ["quiz", "interactive_3d"],
  language: "tr",
  author: "MediSim TR Ekibi",
  reviewed_by: "ESC 2019, AHA 2011, TKD 2020 uyumlu",
  last_updated: "2026-04-25",

  patient: {
    age: 54,
    sex: "F",
    weight_kg: 72,
    height_cm: 162,
    chief_complaint:
      "Ameliyattan 3 gün sonra ani başlayan nefes darlığı ve sağ yan ağrısı. 'Nefes alamıyorum, göğsüm yanıyor.'",
    history_items: [
      "Sol kalça artroplastisi (3 gün önce, genel anestezi)",
      "HT (10 yıl, amlodipin)",
      "Obezite (VKİ 27.4)",
      "Sigara (10 paket-yıl, bırakmış)",
    ],
    allergies: [],
    current_medications: ["Amlodipin 5 mg 1x1", "Enoksaparin 40 mg sc (profilaksi, dün son doz)"],
    modifiers: {},
  },

  initial_vitals: {
    hr: 118,
    bp_systolic: 88,
    bp_diastolic: 58,
    spo2: 88,
    temp: 37.1,
    rr: 28,
    pain: 7,
    gcs: 14,
  },

  available_medications: [
    "heparin",
    "enoksaparin",
    "fondaparinuks",
    "alteplase",
    "noradrenalin",
    "dobutamin",
    "morfin",
    "salin_09",
    "ringer_laktat",
    "oksijen",
  ],

  available_equipment: [
    "monitor",
    "pulse_oksimetre",
    "tansiyon_aleti",
    "ekg_12",
    "iv_kateter_18g",
    "iv_kateter_20g",
    "oksijen_maske",
    "yuksek_akimli_oksijen",
    "stetoskop",
    "eko",
  ],

  start_step_id: "s1_ilk_degerlendirme",

  steps: [
    // ========================================================
    // ADIM 1 — İlk Değerlendirme (tüm seviyelerde)
    // ========================================================
    {
      id: "s1_ilk_degerlendirme",
      kind: "action",
      title: "İlk Değerlendirme",
      prompt:
        "Hasta acil servise getirildi. Vital bulgular kritik. İlk 2 dakikada yapılması gerekenleri seçin.",
      narrative:
        "Hasta belirgin dispneik, ortopneik pozisyonda. Ajite, soluk ve siyanotik görünüm. Sol bacak hafif şiş.",
      min_actions: 3,
      max_actions: 6,
      expected_outcomes: [
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 15,
          feedback:
            "Doğru — sürekli kardiyak ve SpO₂ monitorizasyonu başlatıldı. Hemodinamik instabilite izlenecek.",
        },
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 10,
          feedback: "Doğru — SpO₂ 88%, ağır hipoksi. Hemen oksijen tedavisi gerekiyor.",
        },
        {
          action: { type: "use_equipment", target_id: "ekg_12" },
          points: 15,
          feedback:
            "Doğru — EKG çekildi: taşikardi, sağ kalp strain paterni (S1Q3T3 veya yeni sağ dal bloğu). AMI ekartasyonu için zorunlu.",
        },
        {
          action: { type: "use_equipment", target_id: "iv_kateter_18g" },
          points: 15,
          feedback: "Doğru — hemodinamik instabilite var, geniş damar yolu şart.",
        },
        {
          action: { type: "use_equipment", target_id: "yuksek_akimli_oksijen" },
          points: 20,
          feedback:
            "Doğru — SpO₂ 88%, ağır hipoksi. Yüksek akımlı oksijen (maske ile 10-15 L/dk) hedef SpO₂ >94%. Kritik müdahale.",
        },
        {
          action: { type: "use_equipment", target_id: "oksijen_maske" },
          points: 10,
          feedback:
            "Kabul edilebilir — ama SpO₂ 88'de yüksek akımlı oksijen tercih edilmeli (10-15 L/dk, rezervuarlı maske).",
          max_difficulty: 2,
        },
        {
          action: { type: "use_equipment", target_id: "stetoskop" },
          points: 8,
          feedback:
            "Doğru — oskültasyon: sol bazalde plevral sürtünme sesi, sağda hafif azalmış ses. AMI ve pnömotoraks ayırıcı tanısı için.",
          min_difficulty: 2,
        },
        // Seviye 3+: Alt ekstremite muayenesi (DVT bulgusu arama)
        {
          action: { type: "examine", target_id: "alt_ekstremite" },
          points: 12,
          feedback:
            "Doğru — sol bacak incelemesi: baldırda şişlik, eritem ve ağrı. DVT klinik bulgusu → Wells skorunda +3 puan (PE > diğer tanılar daha olası).",
          min_difficulty: 3,
        },
        // Yanlış: Morfin verme — bradikardi riski + vazodilatasyon + hipotansiyon
        {
          action: { type: "give_medication", target_id: "morfin" },
          points: -15,
          feedback:
            "Hatalı — masif PE'de hipotansiyon zaten var. Morfin vazodilatasyon yaparak durumu ağırlaştırır. Analjezi için daha güvenli alternatifler (düşük doz fentanil, ancak dikkatli).",
        },
        // Yanlış: Enoksaparin başlama (tromboliz planlanacak, UFH tercih edilmeli)
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Şimdilik erken — önce risk sınıflaması ve tromboliz kararı. Masif PE'de sistemik tromboliz gerekiyorsa UFH tercih edilir (hızlı reversal mümkün). LMWH başlarsan tromboliz öncesi sorun yaşarsın.",
          min_difficulty: 2,
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu aksiyon kritik ilk dakikalar için öncelik değil. A-B-C, oksijen, IV yol ve EKG önce.",
    },

    // ========================================================
    // ADIM 2 — Wells PE Klinik Olasılık Skoru (tüm seviyelerde)
    // ========================================================
    {
      id: "s2_wells_skoru",
      kind: "decision",
      title: "Klinik PE Olasılığı — Wells Skoru",
      prompt:
        "Bu hasta için Wells PE skoru hesaplayın ve PE klinik olasılığını belirleyin.",
      narrative:
        "Hasta: post-op 3. gün (hareketsizlik + majör cerrahi), kalp hızı 118/dk, DVT klinik bulgusu sol bacakta, PE başka tanılardan daha olası görünüyor. Wells kriterleri: PE>diğer (+3), kalp hızı>100 (+1.5), majör cerrahi son 4 hf (+1.5), DVT klinik bulgusu (+3) = Toplam 9 puan.",
      options: [
        {
          id: "opt_yuksek_olasilik",
          text: "Yüksek olasılıklı PE (Wells >4 puan) — doğrudan BT anjiyografi",
          correct: true,
          points: 30,
          feedback:
            "Doğru. Wells skoru: PE>diğer (+3) + kalp hızı>100 (+1.5) + majör cerrahi son 4 hf (+1.5) + DVT klinik bulgusu (+3) = 9 puan → yüksek olasılık. D-dimer atlı, direkt BT anjiyografi. (ESC 2019 class I)",
        },
        {
          id: "opt_orta_olasilik",
          text: "Orta olasılıklı PE (Wells 2-4 puan) — önce D-dimer",
          correct: false,
          points: -15,
          feedback:
            "Hatalı hesaplama. Wells ≥5 bu hastada (cerrahi, taşikardi, DVT bulgusu, PE>diğer). D-dimer atlı, yüksek olasılıklıda BT anjiyografi direkt yapılır. D-dimer bekleme süresi değerli zamanı kaybettirir.",
        },
        {
          id: "opt_dusuk_olasilik",
          text: "Düşük olasılıklı PE (Wells <2 puan) — D-dimer yeterli",
          correct: false,
          points: -25,
          feedback:
            "Ciddi hata. Bu tablo düşük olasılıklı değil: post-op 3. gün, taşikardi, SpO₂ 88, hipotansiyon ve DVT bulgusu var. Wells kolayca >7.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 2b — Wells Nüansı: D-dimer tuzağı (Seviye 3+)
    // ========================================================
    {
      id: "s2b_ddimer_tuzagi",
      kind: "decision",
      title: "D-Dimer Gönderilmeli Mi?",
      prompt:
        "Asistan hekimden D-dimer isteği geliyor. 'Önce D-dimer çıksın, sonra BT isteriz' diyor. Kararın?",
      min_difficulty: 3,
      options: [
        {
          id: "opt_bt_direkt",
          text: "D-dimer gerek yok — yüksek olasılıklı PE'de BT anjiyografi direkt",
          correct: true,
          points: 20,
          feedback:
            "Doğru. Wells >4'te D-dimer tanısal değer taşımaz, negatif olsa bile PE ekarte edemez. Ayrıca post-op dönemde D-dimer zaten yüksek olur (spesifik değil). BT anjiyografi direkt endike. (ESC 2019 Algoritması)",
        },
        {
          id: "opt_ddimer_iste",
          text: "D-dimer isteyelim, sonucu bekleyelim",
          correct: false,
          points: -15,
          feedback:
            "Hatalı yaklaşım. Yüksek klinik olasılıkta D-dimer değersiz; üstelik post-op dönemde zaten yüksek çıkar. Geçen her dakika hemodinaminizi kötüleştiriyor.",
        },
      ],
    },

    // ========================================================
    // ADIM 3 — Tetkik Sonucu: BT PA Anjiyografi (info)
    // ========================================================
    {
      id: "s3_bt_sonucu",
      kind: "info",
      title: "BT PA Anjiyografi Sonucu",
      prompt: "BT anjiyografi raporunu inceleyin.",
      content:
        "BT PA ANJİYOGRAFİ RAPORU:\n\nBilateral ana pulmoner arterlerde masif trombüs (sağ > sol). Sağ ventrikül/sol ventrikül çap oranı 1.6 (>0.9 = sağ kalp strainı). İnterventrikular septumun sola deviyasyonu. Akciğer parankiminde sağ alt lobda kama şeklinde infarkt alanı.\n\nSONUÇ: Masif bilateral pulmoner emboli, belirgin sağ kalp yüklenmesi. Klinik korelasyon: hemodinamik instabilite mevcut. Acil reperfüzyon gerektirir.",
    },

    // ========================================================
    // ADIM 4 — Risk Sınıflaması (tüm seviyelerde)
    // ========================================================
    {
      id: "s4_risk_siniflamasi",
      kind: "decision",
      title: "PE Risk Sınıflaması",
      prompt:
        "BT ve klinik bulgulara göre bu hastanın PE risk sınıfı nedir?",
      narrative:
        "Sistolik BP 88 mmHg, kalp hızı 118, BT'de masif bilateral trombüs ve sağ kalp strain.",
      options: [
        {
          id: "opt_yuksek_riskli",
          text: "Yüksek riskli (Masif) PE — hemodinamik instabilite var",
          correct: true,
          points: 30,
          feedback:
            "Doğru. ESC 2019: sistolik BP <90 mmHg = yüksek riskli (masif) PE. Bu grupta erken mortalite >15%. Sistemik tromboliz veya cerrahi embolektomi endikedir. Antikoagülasyon tek başına yeterli değil.",
        },
        {
          id: "opt_orta_yuksek",
          text: "Orta-yüksek riskli PE — hemodinami normal, troponin/BNP yüksek",
          correct: false,
          points: -15,
          feedback:
            "Hatalı. Orta-yüksek riskli PE'de sistolik BP korunur, sadece sağ kalp biomarkerları yükselir. Burada sistolik BP 88 — bu tanım gereği masif PE.",
        },
        {
          id: "opt_dusuk_riskli",
          text: "Düşük riskli PE — PESI skoru düşük",
          correct: false,
          points: -30,
          feedback:
            "Ağır hata. PESI skoru düşük olsa bile hemodinamik instabilite tek başına yüksek riskli PE tanımlar. Bu hasta kardiyojenik şok sınırında.",
          critical: true,
        },
      ],
    },

    // ========================================================
    // ADIM 5 — İlk Resüsitasyon + Antikoagülasyon (tüm seviyelerde)
    // ========================================================
    {
      id: "s5_resusitasyon",
      kind: "action",
      title: "Resüsitasyon ve Antikoagülasyon",
      prompt:
        "Masif PE tanısı kondu. Hemodinamik destek ve antikoagülasyon için aksiyonlarınızı seçin.",
      min_actions: 2,
      max_actions: 5,
      expected_outcomes: [
        // UFH — doğru (masif PE'de tercih: hızlı reversal, tromboliz öncesi uyumluluk)
        {
          action: { type: "give_medication", target_id: "heparin" },
          points: 25,
          feedback:
            "Doğru — masif PE'de UFH tercih edilir (tromboliz planlanıyorsa LMWH'ya göre üstün: hızlı reversal, doz titrasyonu mümkün). Bolus 80 IU/kg IV, ardından 18 IU/kg/h infüzyon. aPTT hedefi 60-80 sn. (ESC 2019 class I)",
        },
        // Noradrenalin — doğru (vasopresör, masif PE'de first-line)
        {
          action: { type: "give_medication", target_id: "noradrenalin" },
          points: 20,
          feedback:
            "Doğru — masif PE'de vasopresör gerekiyorsa noradrenalin first-line (periferik damar tonusu + sağ ventrikül perfüzyonu). Hedef MAP >65 mmHg. (ESC 2019 class IIa)",
          min_difficulty: 2,
        },
        // Dikkatli sıvı — az puan, seviye 3+'te negatif
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: 5,
          feedback:
            "Dikkatli ol — masif PE'de sıvı yüklemesi sağ kalp fonksiyonunu bozabilir. Küçük hacim (250-500 mL) deneme yüklemesi kabul edilebilir; fazlası sağ ventriküler başarısızlığı derinleştirir.",
          max_difficulty: 2,
        },
        {
          action: { type: "give_medication", target_id: "salin_09" },
          points: -5,
          feedback:
            "Dikkat — masif PE'de fazla sıvı sağ ventrikülü gerer ve sol ventrikülü komprese eder (paradoks septal hareket). Sıvı yüklemeden kaçın; hemoraji yoksa küçük hacim (≤500 mL) sınırla. Vasopresör öne çıkar.",
          min_difficulty: 3,
        },
        // Dobutamin — doğru ancak noradrenalin tercih
        {
          action: { type: "give_medication", target_id: "dobutamin" },
          points: 10,
          feedback:
            "Kabul edilebilir — sağ ventrikül inotrop desteği için dobutamin kullanılabilir, ancak hipotansiyon varsa noradrenalin öne çıkar. Kombine kullanım (noradrenalin + dobutamin) düşünülebilir. (ESC 2019 class IIb)",
          min_difficulty: 3,
        },
        // LMWH — hatalı (masif PE + tromboliz planı)
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Uygun değil — masif PE'de tromboliz planlanıyorsa LMWH yerine UFH tercih et. LMWH başlarsan tromboliz güvenliği karmaşıklaşır; ayrıca böbrek işlev bozukluğunda doz ayarı zorlaşır.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Bu masif PE yönetiminde öncelik değil. Heparin, vasopresör ve oksijen hedefe al.",
    },

    // ========================================================
    // ADIM 5b — Kontrendikasyon Analizi (Seviye 4+)
    // ========================================================
    {
      id: "s5b_kontrendikasyon",
      kind: "decision",
      title: "Tromboliz Kontrendikasyonu Var Mı?",
      prompt:
        "Sistemik tromboliz uygulamadan önce kontrendikasyonları değerlendirin. Bu hastada nedir?",
      min_difficulty: 4,
      narrative:
        "Hasta 3 gün önce genel anestezi altında majör ortopedik cerrahi geçirdi. İnme öyküsü yok, aktif kanama yok, malignite yok.",
      options: [
        {
          id: "opt_goreli_ki",
          text:
            "Göreceli kontrendikasyon — son 3 haftada majör cerrahi (fayda/risk değerlendir, masif PE'de tromboliz ağır basar)",
          correct: true,
          points: 25,
          feedback:
            "Doğru. Son 3 haftada majör cerrahi tromboliz için göreceli kontrendikasyon. Ancak masif PE'de (hemodinamik instabilite) yaşam tehdidi kanama riskinden ağır basar — tromboliz tercih edilir. Bu karar açıkça belgelenmalı. (ESC 2019: yaşam tehdit eden PE'de göreceli KI'lar override edilebilir)",
        },
        {
          id: "opt_mutlak_ki",
          text: "Mutlak kontrendikasyon — tromboliz yapılamaz, cerrahi embolektomi",
          correct: false,
          points: -15,
          feedback:
            "Hatalı — mutlak kontrendikasyonlar: son 2 ay içinde inme, intrakraniyal operasyon, aktif iç kanama (menstrüasyon hariç), bilinen intrakraniyal tm. Majör ortopedik cerrahi mutlak değil, görecelidir.",
        },
        {
          id: "opt_ki_yok",
          text: "Kontrendikasyon yok — doğrudan tromboliz başla",
          correct: false,
          points: -10,
          feedback:
            "Yetersiz değerlendirme. Göreceli kontrendikasyon var (post-op 3. gün). Fayda/risk tartılmadan 'kontrendikasyon yok' diyemezsin. Ancak kararın sonucu (tromboliz yapmak) bu durumda klinik olarak doğru.",
        },
      ],
    },

    // ========================================================
    // ADIM 6 — Tromboliz Kararı (tüm seviyelerde)
    // ========================================================
    {
      id: "s6_tromboliz_karari",
      kind: "decision",
      title: "Reperfüzyon Stratejisi",
      prompt:
        "Masif PE tanısı netleşti, antikoagülan başlandı. Reperfüzyon stratejiniz ne?",
      narrative:
        "Sistolik BP hâlâ 88-90 mmHg, SpO₂ 90% (yüksek akımlı O₂ altında). Noradrenalin başlandı. Hasta anksiyöz.",
      options: [
        {
          id: "opt_sistemik_tromboliz",
          text: "Sistemik tromboliz — Alteplaz 100 mg IV/2 saat",
          correct: true,
          points: 35,
          feedback:
            "Doğru. ESC 2019 class I: masif PE (hemodinamik instabilite) + kontrendikasyon yoksa (veya göreceli KI masif PE'de ağır basmıyorsa) sistemik tromboliz. Alteplaz 100 mg/2 h en çok çalışılan protokol. Tromboliz sırasında UFH infüzyonunu durdur, sonrasında aPTT <80 sn olunca yeniden başla.",
        },
        {
          id: "opt_sadece_heparin",
          text: "Sadece antikoagülasyon ile izle — heparin infüzyon yeterli",
          correct: false,
          points: -20,
          feedback:
            "Yetersiz. Antikoagülasyon zaten aktif trombüsü çözdürmez, sadece büyümeyi önler. Masif PE'de hemodinamik bozukluk varsa tromboliz veya embolektomi gerekir. Yalnız heparin ile mortalite çok yüksek.",
          critical: true,
        },
        {
          id: "opt_cerrahi_embolektomi",
          text: "Acil cerrahi embolektomi",
          correct: false,
          points: 10,
          feedback:
            "Kabul edilebilir ama ikinci tercih. Cerrahi embolektomi: tromboliz başarısız, mutlak kontrendikasyon varsa veya sağ kalp trombüsü ek durumunda tercih edilir. Bu hastada önce tromboliz denenir, cerrahi yedekte.",
        },
        {
          id: "opt_kateter_directed",
          text: "Kateter yönlendirmeli tromboliz (CDT)",
          correct: false,
          points: 5,
          feedback:
            "Masif PE'de genellikle sistemik tromboliz öne çıkar — CDT daha çok submassif/orta-yüksek riskli PE'de, kanama riski yüksek hastalarda düşünülür. Bu hastada sistemik tromboliz daha hızlı ve pratik.",
          min_difficulty: 4,
        },
      ],
    },

    // ========================================================
    // ADIM 7 — Post-Tromboliz İzlem (tüm seviyelerde)
    // ========================================================
    {
      id: "s7_post_tromboliz",
      kind: "action",
      title: "Post-Tromboliz İzlem ve Tedavi",
      prompt:
        "Alteplaz infüzyonu başlandı. Tromboliz sonrası kritik izlem aksiyonlarını seçin.",
      narrative:
        "Trombolizden 30 dakika sonra: BP 102/68, HR 98, SpO₂ 95%. Hasta daha sakin. Ancak sağ bacakta IV yeri hafif sızdırıyor.",
      min_actions: 3,
      max_actions: 5,
      expected_outcomes: [
        // aPTT kontrolü ve heparin yeniden başlama
        {
          action: { type: "examine", target_id: "aptt_kontrolu" },
          points: 20,
          feedback:
            "Doğru — tromboliz bittikten sonra aPTT <80 sn olana kadar heparini durdur, sonra bolussuz infüzyon olarak devam et. (ESC 2019 protokolü)",
          min_difficulty: 2,
        },
        // Kanama izlemi
        {
          action: { type: "examine", target_id: "kanama_degerlendirmesi" },
          points: 15,
          feedback:
            "Doğru — tromboliz sonrası kanama komplikasyonu birincil risktir. Nörolojik durum, IV bölgeleri, hemoptizi, hematüri izle. Gereksiz invaziv işlem yapma.",
        },
        // Vital izlem sürdürme
        {
          action: { type: "use_equipment", target_id: "monitor" },
          points: 10,
          feedback:
            "Doğru — vital izleme ve kardiyak monitorizasyon devam. BP artışı trombolizisin etkinliğini gösterir.",
        },
        // SpO₂ hedefi kontrolü
        {
          action: { type: "use_equipment", target_id: "pulse_oksimetre" },
          points: 8,
          feedback:
            "Doğru — SpO₂ >94% hedefi. Gereksiz O₂ hiperoksiye yol açabilir; SpO₂ stabil olunca titrasyona geç.",
        },
        // Eko değerlendirme
        {
          action: { type: "use_equipment", target_id: "eko" },
          points: 15,
          feedback:
            "Doğru — tromboliz sonrası TTE ile sağ ventrikül iyileşmesini değerlendirmek klinik yanıtı nesnel olarak gösterir. Sağ kalp dilatasyonunun gerilemesi iyi prognoz işareti.",
          min_difficulty: 3,
        },
        // Yanlış: Foley sonda, mesane travması riski + gereksiz invazyon
        {
          action: { type: "use_equipment", target_id: "foley_sonda" },
          points: -10,
          feedback:
            "Gereksiz ve riskli — tromboliz sonrası invaziv işlemler kanama riskini artırır. Foley zorunlu endikasyon yoksa takma.",
          min_difficulty: 3,
        },
        // Yanlış: Hemen LMWH geçme
        {
          action: { type: "give_medication", target_id: "enoksaparin" },
          points: -10,
          feedback:
            "Erken — tromboliz bittikten hemen sonra LMWH'ya geçme. Önce aPTT kontrol et (<80 sn), sonra UFH infüzyon olarak devam et, 24-48 saat sonra DOAC/LMWH geçiş değerlendir.",
        },
      ],
      default_wrong_penalty: -5,
      default_wrong_feedback:
        "Post-tromboliz dönemde kanama izlemi, antikoagülasyon protokolü ve vital takibi öncelik.",
    },

    // ========================================================
    // ADIM 8 — Taburculuk ve Uzun Dönem Plan (Seviye 2+, info)
    // ========================================================
    {
      id: "s8_uzun_donem",
      kind: "decision",
      title: "Uzun Dönem Antikoagülasyon",
      prompt:
        "Hasta stabil, yoğun bakıma alınıyor. Uzun dönem antikoagülasyon planı ne olmalı?",
      min_difficulty: 2,
      narrative:
        "Provokatif risk faktörü: majör cerrahi (geçici, reversible). DVT + PE: 3 ay antikoagülasyon standart. Risk faktörü tam geçici → süre tartışmalı.",
      options: [
        {
          id: "opt_3_ay_doac",
          text: "3 ay DOAC (rivaroksaban veya apiksaban) — provokatif PE, geçici risk",
          correct: true,
          points: 25,
          feedback:
            "Doğru. Provokatif PE (majör cerrahi) + geri dönen risk faktörü → 3 ay antikoagülasyon yeterli. DOAC (rivaroksaban 15 mg 2x1/3 hf sonra 20 mg 1x1, veya apiksaban 10 mg 2x1/7 gün sonra 5 mg 2x1) önerilir. VKA (warfarin) artık ikinci seçenek. (ESC 2019, class I)",
        },
        {
          id: "opt_6_ay",
          text: "6 ay antikoagülasyon — semptomlar geçene kadar uzat",
          correct: false,
          points: -5,
          feedback:
            "Kısmen makul ama kanıt 3 ay desteğiyle. Provokatif PE'de 3 ay sonrası uzatma önerisi mevcut değil. Risk faktörleri kalıcıysa (örn. aktif kanser) uzatma düşünülür.",
        },
        {
          id: "opt_belirsiz_sure",
          text: "Süresiz antikoagülasyon — tekrar riski yüksek",
          correct: false,
          points: -15,
          feedback:
            "Hatalı. Süresiz antikoagülasyon yüksek riskli hastalarda (provokasyon yoksa, antifosfolipid sendromu, aktif kanser) düşünülür. Bu hastada risk faktörü geçici cerrahi — 3 ay yeterli.",
        },
      ],
    },
  ],

  scoring: {
    max_points: 305,
    passing_score: 183, // ~%60
    grade_bands: {
      A: 274, // ~%90
      B: 229, // ~%75
      C: 183, // ~%60
      D: 137, // ~%45
    },
  },

  debrief: {
    key_learnings: [
      "Masif PE tanımı: sistolik BP <90 mmHg veya 40 mmHg'den fazla düşme — bu eşik tedaviyi belirler",
      "Wells skoru >4 → yüksek olasılık → D-dimer atla, BT anjiyografi direkt (özellikle post-op dönemde D-dimer zaten yüksektir)",
      "Masif PE'de antikoagülasyon tek başına yeterli değil; tromboliz veya embolektomi gerekir",
      "Masif PE'de sıvı yüklemesi tehlikeli — sağ ventrikül kompresyonu artar; vasopresör (noradrenalin) tercih",
      "Tromboliz sonrası aPTT <80 sn olana kadar heparin bekletilir, sonra bolussuz infüzyon",
      "Post-op majör cerrahi tromboliz için göreceli kontrendikasyon — masif PE'de fayda/risk genellikle tromboliz lehine",
      "Provokatif PE (geçici risk faktörü): 3 ay DOAC yeterli, süresiz antikoagülasyon gerekmez",
    ],
    references: [
      "ESC 2019 — Acute Pulmonary Embolism Diagnosis and Management Guidelines",
      "AHA 2011 — Management of Massive and Submassive Pulmonary Embolism",
      "TKD 2020 — Venöz Tromboembolizm Ulusal Uzlaşı Kılavuzu",
      "Meyer G et al. — PEITHO Trial (2014) — Fibrinolysis for Intermediate-High Risk PE",
    ],
    red_flags: [
      "Hemodinamik instabilite + PE → tromboliz veya embolektomi düşün — antikoagülasyon tek başına yetmez",
      "Masif PE'de fazla sıvı sağ kalbi daha da kötüleştirir",
      "Post-op dönemde D-dimer yüksek olduğundan tanısal değeri düşüktür — yüksek olasılıklıda BT direkt",
      "Tromboliz sonrası aPTT kontrolsüz heparin → ciddi kanama riski",
    ],
    next_scenarios: [
      "acil-kardiyojenik-sok-001",
      "acil-anaflaksi-001",
    ],
  },
};
