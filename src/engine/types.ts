// ============================================================
// MediSim TR — Senaryo Motoru Tipleri
// ============================================================
// Bu dosya projenin kalbi. Her senaryo bu şemaya uymak zorunda.
// Şemayı değiştirmek = tüm senaryoları etkilemek. Dikkat.
//
// NOT (23 Nisan 2026): Bu dosya ve pharmacology/types.ts içerikleri
// daha önce YER DEĞİŞTİRMİŞTİ (prod build kırıktı). 23 Nisan
// güncellemesinde düzeltildi + canlı monitör için SessionState'e
// baseline_vitals ve active_medications eklendi.
// ============================================================

export type Specialty =
  | "kardiyoloji"
  | "dahiliye"
  | "acil"
  | "pediatri"
  | "cerrahi"
  | "anestezi"
  | "kadin_dogum"
  | "hemsirelik"
  | "askeri_tccc";

export type Difficulty = 1 | 2 | 3 | 4 | 5;

export type PlayMode = "egitim" | "klinik" | "sinav";

// Senaryo iki şekilde oynanabilir — listede ikisi de olmalı
export type ScenarioMode = "quiz" | "interactive_3d";

// ------------------------------------------------------------
// Hasta
// ------------------------------------------------------------

export interface PatientVitals {
  hr: number;              // Kalp hızı /dk
  bp_systolic: number;     // Sistolik kan basıncı mmHg
  bp_diastolic: number;    // Diyastolik kan basıncı mmHg
  spo2: number;            // Oksijen satürasyonu %
  temp: number;            // Vücut ısısı °C
  rr: number;              // Solunum sayısı /dk
  pain?: number;           // 0-10 ağrı skoru
  glucose?: number;        // mg/dL
  gcs?: number;            // 3-15 Glasgow

  // Faz 1 — genişletilmiş vitaller
  etco2?: number;                // mmHg, kapnograf end-tidal CO2
  map?: number;                  // Ortalama arter basıncı mmHg (hesaplanan veya ölçülen)
  cvp?: number;                  // Santral venöz basınç cmH2O
  abp_systolic?: number;         // İnvaziv arteriyel SBP (NIBP'den ayrı)
  abp_diastolic?: number;        // İnvaziv arteriyel DBP
  st_elevation_mm?: number;      // ST elevasyon mm (EKG monitörden)
  pupil_left_mm?: number;        // Sol pupil çapı mm
  pupil_right_mm?: number;       // Sağ pupil çapı mm
  pupil_reactive?: boolean;      // Işık refleksi var mı
  urine_output_ml_hr?: number;   // Saatlik idrar çıkışı mL/saat
}

// Farmakoloji motorunun ilaç etkisini modifiye ederken kullandığı hasta özellikleri.
// Her çarpan bir veya birden fazla ilacı etkiler. 'gebelik' özel: çarpan değil, kontrendikasyon tetikleyicisi olabilir.
export interface PatientModifiers {
  beta_blocker?: boolean;    // Hasta kronik beta-bloker altında mı?
  karaciger_yetm?: boolean;
  bobrek_yetm?: boolean;
  gebelik?: boolean;
  // Yaş grubu türetilir (age alanından), ama ilaç motoru için hazır flag de tutabiliriz:
  // yasli_70plus, pediatrik — runtime'da hesaplanır.
}

export interface Patient {
  age: number;
  sex: "M" | "F";
  weight_kg: number;
  height_cm?: number;
  avatar_id?: string;
  /** Etnik ten tonu (3D model Skin_Body baseColor). Bkz. patientModels.ts SkinTone. */
  skin_tone?: "fair" | "mediterranean" | "tan" | "brown" | "dark";
  chief_complaint: string;
  history_items: string[];
  allergies: string[];
  current_medications?: string[];
  modifiers?: PatientModifiers;  // Farmakoloji çarpanları için
}

// ------------------------------------------------------------
// Envanter (İlaç & Ekipman)
// ------------------------------------------------------------
// NOT: İlaç için farmakoloji verileri (preset, band, modifier, kontrendikasyon)
// src/engine/pharmacology/types.ts içinde tanımlı. Burada temel kimlik bilgileri.
// Genişletilmiş tip: ExtendedMedication (pharmacology/types.ts).

export interface Medication {
  id: string;
  name_tr: string;
  name_en?: string;
  category: "kardiyak" | "antibiyotik" | "antiviral" | "analjezik" | "sedatif"
           | "antikoagulan" | "antiaritmik" | "sıvı" | "endokrin"
           | "antiepileptik" | "antidot" | "diğer";
  default_dose?: string;        // Gösterim için ("1 mg IV push")
  contraindications?: string[]; // Basit metin — detaylı şema için ExtendedMedication
}

export interface Equipment {
  id: string;
  name_tr: string;
  icon?: string;
  category: "monitorizasyon" | "havayolu" | "damar_yolu"
           | "defibrilasyon" | "cerrahi" | "koruyucu"
           | "laboratuvar" | "goruntuleme" | "diğer";
}

// ------------------------------------------------------------
// Aksiyonlar — öğrencinin yapabileceği şeyler
// ------------------------------------------------------------

export type ActionType =
  | "give_medication"       // İlaç uygula
  | "use_equipment"         // Ekipman kullan
  | "examine"               // Fizik muayene
  | "order_test"            // Tetkik iste
  | "consult"               // Konsültasyon iste
  | "decision"              // Karar (çoktan seçmeli)
  | "procedure"             // Prosedür uygula (3D'de dokunarak)
  | "communicate";          // Hasta/yakınıyla iletişim

export interface ActionRef {
  type: ActionType;
  target_id: string;        // İlaç id, ekipman id, vb.
  dose?: string;            // İlaçlar için
  site?: string;            // Prosedür lokasyonu (örn. "sol_uyluk")
}

// Bir adımda aksiyonun değerlendirilmesi
export interface ActionOutcome {
  action: ActionRef;
  points: number;           // + puan = doğru, - = hatalı
  unlocks?: string[];       // Hangi adımları açar
  feedback: string;         // Öğrenciye gösterilecek açıklama
  critical?: boolean;       // Kritik hata mı? (örn. alerjik ilaç)
  vitals_change?: Partial<PatientVitals>; // Aksiyondan sonra vitaller değişir mi (statik; dinamik için farmakoloji motoru)
  min_difficulty?: Difficulty;  // Bu seçenek hangi seviyeden itibaren görünür/değerlendirilir
  max_difficulty?: Difficulty;  // Opsiyonel: yalnızca X seviyesine kadar (örn. "basit puan" seviye 2'de biter)
}

// ------------------------------------------------------------
// Adım (Step) — senaryo bir adımlar DAG'ı
// ------------------------------------------------------------

export interface DecisionOption {
  id: string;
  text: string;
  correct: boolean;
  points: number;
  feedback: string;
  critical?: boolean;           // true: kritik hata — debrief'te kırmızı uyarı
  min_difficulty?: Difficulty;
  max_difficulty?: Difficulty;
}

export interface StepBase {
  id: string;
  title: string;
  prompt: string;              // Öğrenciye sorulan
  narrative?: string;          // Opsiyonel sahne anlatımı
  time_limit_sec?: number;
  min_actions?: number;        // Devam etmek için min. aksiyon
  max_actions?: number;        // Üst sınır (sınırsız spam engeli)
  min_difficulty?: Difficulty; // Bu adım hangi seviyeden itibaren görünür (altındaysa atlanır)
  max_difficulty?: Difficulty; // Üst sınır (nadir: "sadece başlangıç seviyesi için ekstra açıklama adımı")
}

export interface ActionStep extends StepBase {
  kind: "action";
  expected_outcomes: ActionOutcome[];
  // Bunun dışındaki her aksiyon "uygun değil" olarak puan alır
  default_wrong_penalty?: number;
  default_wrong_feedback?: string;
}

export interface DecisionStep extends StepBase {
  kind: "decision";
  options: DecisionOption[];
  allow_multiple?: boolean;   // true: checkbox + onay butonu (çoklu seçim)
  partial_credit?: boolean;   // allow_multiple=true: seçilmeyen correct'ler için %50 ceza
  display?: {
    type: "image" | "ecg" | "lab" | "imaging";
    asset: string;
    caption?: string;
  };
}

export interface DecisionMultiEvaluation {
  selected_options: DecisionOption[];
  missed_correct_options: DecisionOption[];  // allow_multiple: seçilmeyen correct seçenekler
  points: number;
  feedback: string;
  all_correct: boolean;
}

export interface InfoStep extends StepBase {
  kind: "info";               // Sadece bilgi gösterir, ilerle
  content: string;
}

export type Step = ActionStep | DecisionStep | InfoStep;

// ------------------------------------------------------------
// Puanlama & Debrief
// ------------------------------------------------------------

export interface ScoringConfig {
  max_points: number;
  passing_score: number;
  grade_bands: {
    A: number;
    B: number;
    C: number;
    D: number;
  };
  /**
   * "auto" (varsayılan): grade_bands ve passing_score, max_points × standart
   *   eşik (%85/%70/%55/%40) olarak hesaplanır. Yazılı değerler ignore edilir.
   * "manual": grade_bands ve passing_score elle yazılmış değerler kullanılır.
   *   Özel senaryolar (sınav modu, OSCE) için.
   */
  grading_mode?: "auto" | "manual";
  time_bonus?: {
    target_seconds: number;
    bonus_points: number;
  };
  // Toplam puanın düşebileceği alt sınır. Varsayılan: sınır yok (undefined).
  // Yeni senaryolarda 0 koyun — negatif puan öğrenci motivasyonunu bozar.
  score_floor?: number;
}

export interface Debrief {
  key_learnings: string[];
  references: string[];
  red_flags?: string[];       // Bu senaryoda dikkat edilmesi gereken kritik noktalar
  next_scenarios?: string[];  // Önerilen sonraki senaryolar
}

// ------------------------------------------------------------
// Monitör Konfigürasyonu (Faz 1)
// ------------------------------------------------------------

export interface AlarmThresholds {
  hr_low?: number;
  hr_high?: number;
  spo2_low?: number;
  bp_systolic_low?: number;
  bp_systolic_high?: number;
  rr_low?: number;
  rr_high?: number;
  etco2_low?: number;
  etco2_high?: number;
  glucose_low?: number;
  glucose_high?: number;
  urine_output_low?: number;
}

export interface MonitorConfig {
  visible_params?: Array<keyof PatientVitals>;
  visible_modules?: Array<"ekg" | "etco2" | "abp" | "st_trend">;
  alarm_thresholds?: Partial<AlarmThresholds>;
}

// ------------------------------------------------------------
// Laboratuvar / Tetkik Sistemi (Faz 3)
// ------------------------------------------------------------

export type LabFlag = "L" | "H" | "LL" | "HH" | "C";
// L=düşük, H=yüksek, LL=kritik düşük, HH=kritik yüksek, C=pozitif/anormal

export interface LabValue {
  parameter: string;          // "Hgb", "WBC", "pH", "Glukoz"
  value: string | number;     // Sayı veya semantik ("Pozitif", "+++")
  unit: string;               // "g/dL", "mg/dL", "/μL", "mmol/L"
  reference_range?: string;   // "12-16" veya "<5"
  flag?: LabFlag;
  interpretation?: string;    // Kısa açıklama (eğitim değeri için)
}

export interface LabPanel {
  id: string;                 // Equipment ID ile eşleşmeli (örn. "tam_kan_sayimi")
  name_tr: string;            // "Tam Kan Sayımı"
  collected_at_min?: number;  // Senaryo başlangıcına göre kaç dk'da alındı
  results: LabValue[];
  comment?: string;           // Lab notu
}

export interface LabPanelHistory {
  panel_id: string;
  snapshots: LabPanel[];      // Zaman içinde tekrar edilen ölçümler
}

export interface LabTimelineEntry {
  at_minute: number;          // Senaryo başından kaç dk sonra bu değerler geçerli
  panel_id: string;
  results: LabValue[];
  trigger?: "auto" | "after_step";
  trigger_step_id?: string;
}

// Görüntüleme tetkiki sonucu (röntgen, BT, US, EKO)
export type ImagingModality = "xray" | "ct" | "mri" | "us" | "echo" | "ekg" | "other";

export interface ImagingResult {
  id: string;                        // Equipment ID ile eşleşmeli
  name_tr: string;                   // "PA Akciğer Grafisi"
  modality: ImagingModality;
  view?: string;                     // "PA", "Lateral", "Aksiyel T0", vb.
  image_url?: string;                // Görüntü URL'si (harici veya data URI)
  thumbnail_url?: string;            // Önizleme için küçük boyut
  interpretation: string;            // Radyolog/klinisyen yorumu
  findings?: string[];               // Spesifik bulgular listesi
  timestamp_min?: number;            // Senaryo başından kaç dk sonra çekildi
  attribution?: string;              // Görüntü kaynağı (Wikimedia, özel, vb.)
}

// ------------------------------------------------------------
// Gerçek Zamanlı Kötüleşme — Faz 1 (Sanal Hasta Planı v1, Bölüm 4.2)
// ------------------------------------------------------------
// Senaryo yazarı tedavisiz kalan hastanın vital trendini tanımlar.
// SimplePhysiologyProvider (physiology.ts) bu fazları uygular;
// Faz 3'te Pulse Engine aynı PhysiologyProvider arayüzünün arkasına girer.
//
// ⚠️ KLİNİK İÇERİK: trend değerleri (delta_per_sec, floor/ceiling)
// klinik içerik sayılır — DRAFT bayrağıyla girer, ACTIVE'e geçişi
// sadece klinik review yapar.

// Trend uygulanabilir sayısal vital alanları (boolean pupil_reactive hariç)
export type TrendableVital =
  | "hr"
  | "bp_systolic"
  | "bp_diastolic"
  | "spo2"
  | "temp"
  | "rr"
  | "pain"
  | "glucose"
  | "gcs"
  | "etco2";

export interface VitalTrend {
  vital: TrendableVital;
  /** Simüle edilen saniye başına değişim. Negatif = düşüş. Örn. SBP −2/30sn → -0.067 */
  delta_per_sec: number;
  /** Alt sınır — vital bunun altına inmez (kötüleşme tabanı / iyileşme hedefi) */
  floor?: number;
  /** Üst sınır — vital bunun üstüne çıkmaz */
  ceiling?: number;
}

/** Bir aksiyonun deterioration fazını durdurup durdurmadığını tarif eder.
    site verilmezse her site eşleşir (örn. adrenalin IM veya IV — ikisi de durdurur). */
export interface ActionMatcher {
  type: ActionType;
  target_id: string;
  site?: string;
}

/** Vital eşik koşulu — escalation tetiği (eval-monitor FSM'inden uyarlandı). */
export interface VitalCondition {
  vital: TrendableVital;
  op: "lt" | "gt" | "lte" | "gte";
  value: number;
  /** Koşul bu kadar simüle sn TUTULU kalmalı (anlık değil; verilmezse anlık) */
  for_sec?: number;
}

/**
 * Faz eskalasyonu — koşul sağlanınca hedef fazı AKTİVE eder. Opsiyonel katman:
 * eski senaryolar (escalations'sız) aynen çalışır. eval-monitor'un olay/zaman/
 * vital-eşik state-transition mantığını A'nın deterioration modeline ekler
 * ("90 sn müdahale yoksa arrest", "SpO2<78 8 sn tutulu → hava yolu ödemi").
 */
export interface PhaseEscalation {
  /** Aktive edilecek hedef faz id'si */
  to_phase_id: string;
  /** Faz aktifleştiğinden bu kadar simüle sn sonra tetikle (zaman-tetikli) */
  after_sec?: number;
  /** Vital eşik koşulu tutulunca tetikle (vital-eşik-tetikli) */
  when_vital?: VitalCondition;
  /** true ise tetiklenince MEVCUT faz da durur (trend'leri kesilir, hedef devralır) */
  halt_self?: boolean;
}

// ------------------------------------------------------------
// Faz-senkron sinyal — EKG / ses / görsel TEK kaynaktan (STEMI gerçeklik paketi)
// ------------------------------------------------------------
// Deterioration'ın aktif fazı, monitör EKG paterni + oskültasyon kalp sesi +
// 3D görsel dramatik katman için TEK gerçek kaynaktır. physiology.ts
// getActivePhaseSignal() ile dışa verir; useScenarioRunner EKG+ses+görsele
// dağıtır (kod tekrarı yok). Faz içi evrim (VF→asistoli) ve reperfüzyon
// (recovering) burada çözülür.
// ⚠️ KLİNİK İÇERİK: EKG/ses/görsel faz eşlemesi DRAFT — review zorunlu.

/** Monitör EKG faz paterni — STEMI iskemi→aritmi→arrest evrim vokabüleri.
    waveform-engine Rhythm + ST sapmasına adapter.ts'de eşlenir.
    Klinik sıra (SAEM M3 + LITFL ECG Library): ST elevasyonu → VES → VT salvosu
    → VF → asistoli. */
export type EkgPattern =
  | "sinus" // normal
  | "st_elevation" // STEMI baseline: ST elevasyonlu sinüs
  | "st_elev_pvc" // ST elevasyon + ara sıra VES (iritabl miyokard başlangıcı)
  | "vt_salvo" // multifokal VES + R-on-T + VT salvoları (VF riski — LITFL)
  | "vfib" // ventriküler fibrilasyon
  | "asystole"; // asistoli (düz hat)

/** Oskültasyon kalp sesi faz paterni. auscultationAudio'da .ogg'a eşlenir. */
export type HeartSound =
  | "normal"
  | "tachy"
  | "s3_gallop" // pompa yetmezliği (placeholder — ses dosyası eklenecek)
  | "muffled" // düşük debili / şok (placeholder)
  | "silent"; // arrest — nabız / ses yok

/** 3D görsel dramatik katman — vital-tabanlı baseline'ın ÜSTÜNE eklenir (0-1). */
export interface PhaseVisualHint {
  cyanosis_boost?: number;
  pallor_boost?: number;
  diaphoresis_boost?: number;
  mottled_boost?: number;
  /** true → nefes animasyonu durur (arrest). */
  breath_stopped?: boolean;
}

/** Faz başına senkron sinyal — senaryo yazarı tanımlar (klinik DRAFT). */
export interface PhaseSignalSpec {
  ekg: EkgPattern;
  heart_sound: HeartSound;
  /** Faz İÇİ geç evrim (örn. VF→asistoli): after_sec sonra ekg_late'e geçer. */
  ekg_late?: EkgPattern;
  heart_sound_late?: HeartSound;
  ekg_late_after_sec?: number;
  visual?: PhaseVisualHint;
  /** Faz aktifleşince öğretici modda gösterilecek anlatım (klinik DRAFT). */
  narration?: string;
}

/** physiology.getActivePhaseSignal() çıktısı — dağıtım için çözülmüş sinyal. */
export interface PhaseSignal {
  /** Dominant faz id, "baseline" (faz yok) veya "recovering" (reperfüzyon sonrası). */
  phaseId: string;
  /** deterioration[] index; -1 baseline, -2 recovering. */
  phaseIndex: number;
  ekg: EkgPattern;
  heartSound: HeartSound;
  visual: PhaseVisualHint;
  /** Bu faz müdahale ile durduruldu mu (recovery kolu). */
  recovering: boolean;
  narration?: string;
}

export interface DeteriorationPhase {
  id: string;
  label?: string;
  /** Bu adım current olduğunda faz aktifleşir ve adım geçilse bile sürer.
      Verilmezse senaryo başından itibaren aktif. */
  active_from_step_id?: string;
  /** Tedavisiz seyir — faz aktif ve durdurulmamışken her tick uygulanır */
  trends: VitalTrend[];
  /** Bu aksiyonlardan biri yapılınca faz durur (halt) */
  halted_by: ActionMatcher[];
  /** Halt sonrası iyileşme trendi — floor/ceiling iyileşme hedefi olarak kullanılır */
  recovery_trends?: VitalTrend[];
  /** Opsiyonel — koşul sağlanınca başka fazı aktive eden eskalasyonlar
      (zaman/vital-eşik tetikli durum geçişi). Verilmezse eski davranış. */
  escalations?: PhaseEscalation[];
  /** Faz-senkron sinyal — EKG paterni + kalp sesi + görsel dramatik katman
      (STEMI gerçeklik paketi). Verilmezse getActivePhaseSignal o faz için null
      döner → eski senaryolar etkilenmez. ⚠️ KLİNİK İÇERİK: DRAFT. */
  signal?: PhaseSignalSpec;
}

// ------------------------------------------------------------
// Oskültasyon Eşlemesi — Faz 1 (Sanal Hasta Planı v1, Bölüm 4.4)
// ------------------------------------------------------------
// Senaryo, 3D bölge id'sine (regions.ts) patolojiye uygun ses atar.
// resolved_sound_id: ilişkili deterioration fazı durdurulduktan sonra
// çalınacak ses (örn. adrenalin sonrası wheeze → normal kalp sesi).

export interface AuscultationOverride {
  /** public/sounds/auscultation/{sound_id}.ogg */
  sound_id: string;
  /** phase_id durdurulduktan sonra çalınacak ses */
  resolved_sound_id?: string;
  /** Hangi deterioration fazına bağlı (resolved geçişi için) */
  phase_id?: string;
  /** Muayene panelinde gösterilecek bulgu metni */
  note?: string;
}

// ------------------------------------------------------------
// 3D Sahne Tanımı (ileride dolacak)
// ------------------------------------------------------------

export interface Hotspot {
  id: string;
  label: string;
  position: { x: number; y: number; z: number };
  available_actions: ActionType[];
  associated_step_ids?: string[];
}

export interface SceneConfig {
  background: string;           // örn. "hospital_er" | "battlefield"
  patient_position: "supine" | "sitting" | "standing";
  hotspots: Hotspot[];
}

// ------------------------------------------------------------
// Zaman ölçeği — eğitim/sınav modu arası hız farkı
// ------------------------------------------------------------

export interface TimeScaleOverride {
  egitim?: number;   // Varsayılan 8.0 (hızlı öğrenme)
  klinik?: number;   // Varsayılan 3.0 (gerçekçi hissi, hızlandırılmış)
  sinav?: number;    // Varsayılan 1.0 (gerçek zaman)
}

// ------------------------------------------------------------
// İlaç zamanlama override — senaryo bazlı
// ------------------------------------------------------------
// Bu senaryoda belirli bir ilacın farmakokinetik süresini değiştir.
// Örn: insülin normalde onset_sec=300 (5 dk), ama demo senaryosunda
// onset_sec=10 (10 saniyede etki başlasın) diyebilirsin.
// Ayarlanmayan alanlar ilacın kendi değerini kullanır.
export interface MedicationTimingOverride {
  onset_sec?: number;
  peak_min?: number;
  duration_min?: number;
}

// ------------------------------------------------------------
// Hasta varyantı — aynı senaryo, farklı klinik tablo
// ------------------------------------------------------------
// Faz 1 sonunda aktifleşecek. Şimdilik tip iskeleti.

export interface PatientVariant {
  id: string;                            // "stemi-b-atipik"
  label: string;                         // Gösterim adı
  description: string;                   // Öğretici not
  patient: Partial<Patient>;             // Temel senaryonun patient'ını override eder
  initial_vitals?: Partial<PatientVitals>;
  step_overrides?: Record<string, Partial<Step>>; // step_id → değişiklik
}

// ------------------------------------------------------------
// Klinik Review Hattı (CLAUDE.md "Klinik İçerik Disiplini")
// ------------------------------------------------------------
// Bayrak akışı: DRAFT → REVIEWED_PENDING_ACTIVATION → ACTIVE.
// ACTIVE'e geçişi SADECE Ali Bey yapar (otonom değil). Alan yoksa güvenli
// varsayılan DRAFT (getClinicalStatus). Önceden yorum konvansiyonuyla
// tutuluyordu; artık tipli alan + /klinik-review dashboard ile izlenir.
export type ClinicalReviewStatus =
  | "DRAFT"
  | "REVIEWED_PENDING_ACTIVATION"
  | "ACTIVE";

export interface ClinicalReview {
  status: ClinicalReviewStatus;
  /** Onaylayan (Ali Bey). */
  reviewed_by?: string;
  /** Review/onay tarihi (ISO). */
  reviewed_at?: string;
  /** Hâlâ review bekleyen klinik alanlar (ör. "deterioration", "auscultation"). */
  draft_areas?: string[];
  notes?: string;
}

// ------------------------------------------------------------
// Ana Senaryo Tipi
// ------------------------------------------------------------

export interface Scenario {
  // Meta
  id: string;
  version: string;
  title: string;
  description: string;
  specialty: Specialty;
  tags: string[];
  difficulty: Difficulty;              // Senaryonun varsayılan seviyesi
  supported_difficulties?: Difficulty[]; // Oynanabilir seviyeler — boşsa 1-5 hepsi
  estimated_minutes: number;
  modes: ScenarioMode[];
  language: "tr";
  author?: string;
  reviewed_by?: string;
  last_updated: string;         // ISO date

  // İçerik
  patient: Patient;
  initial_vitals: PatientVitals;
  available_medications: string[];  // Medication id'leri
  available_equipment: string[];    // Equipment id'leri
  steps: Step[];
  start_step_id: string;

  // Sonuç
  scoring: ScoringConfig;
  debrief: Debrief;

  // Farmakoloji motoru — zaman ölçeği override (ör. gerçek zaman baskısı önemli senaryolar)
  time_scale_override?: TimeScaleOverride;

  // İlaç bazlı zamanlama override — senaryo yazarı bu senaryoda
  // belirli ilaçların onset/peak/duration sürelerini değiştirebilir.
  // Anahtar: medication_id (örn. "insulin_regular").
  // Kullanım: "Normalde 15 dk etki eden insülin bu senaryoda 45 sn'de etki etsin"
  medication_timing_overrides?: Record<string, MedicationTimingOverride>;

  // Varyantlar (opsiyonel, Faz 1 sonunda)
  variants?: PatientVariant[];

  // EKG şerit deseni — EcgStrip bileşeni için
  ekg_pattern?: string;

  // Faz 1 — Monitör konfigürasyonu (opsiyonel, yoksa default davranış)
  monitor_config?: MonitorConfig;

  // Faz 3 — Lab/Tetkik sistemi (tümü opsiyonel — eski senaryolar bunlar olmadan çalışır)
  lab_panels?: Record<string, LabPanel>;
  lab_timeline?: LabTimelineEntry[];
  result_delay_seconds?: Record<string, number>;
  // Görüntüleme sonuçları. Key = equipment id → tetkik istendiğinde döner
  imaging_results?: Record<string, ImagingResult>;

  /**
   * Opsiyonel: ICD-10/SNOMED CT kodlama (Faz 4 — DRAFT şema desteği).
   * Şu an senaryo dosyalarında doldurulmamış. Kullanıcı onayı ve klinik
   * review sonrası ayrı bir PR olarak eklenir. Bkz:
   * src/data/clinical-codes/scenario-mappings.json
   */
  clinical_codes?: {
    icd10?: string;
    snomed_ct?: string;
  };

  // 3D (opsiyonel)
  scene?: SceneConfig;

  // Blok 2 — Merkezi ekipman-etki mapper'ı (opt-in; eski senaryolar etkilenmez)
  // true → use_equipment aksiyonları src/engine/equipment merkezi fizyolojisinden
  // geçer (entübasyon SpO2, O2 maskesi hipoksemide, defib ritim vb.).
  // false/yok → ESKİ davranış: senaryo elle vitals_change yazar. Çakışma yok.
  // ⚠️ Etki DEĞERLERİ klinik içerik: DRAFT (TODO_KLINIK). Bkz equipment/catalog.ts
  use_central_equipment_effects?: boolean;

  // Faz 1 — Gerçek zamanlı kötüleşme (opsiyonel; eski senaryolar etkilenmez)
  // ⚠️ Klinik içerik: DRAFT bayrağı + klinik review zorunlu (PLAN-SANAL-HASTA-V1 §4.2)
  deterioration?: DeteriorationPhase[];

  // Faz 1 — Oskültasyon bölge→ses eşlemesi. Key = PatientRegion id (regions.ts)
  auscultation?: Record<string, AuscultationOverride>;

  // ÖĞRETİCİ mod (egitim/teaching) — adım açıklama metinleri. Key = step.id.
  // Sistem o adımda doğru aksiyonu otomatik uygularken bu metni gösterir.
  // Ses ENTEGRASYONU yok (şimdilik) — text alanı ileride TTS'e bağlanacak yapıda.
  // ⚠️ Klinik içerik: DRAFT (narration tıbbi açıklama içerir) — review zorunlu.
  teaching_narration?: Record<string, string>;

  // Klinik review durumu (opsiyonel; yoksa getClinicalStatus DRAFT döner).
  // ACTIVE'e geçişi sadece Ali Bey yapar — /klinik-review dashboard'dan.
  clinical_review?: ClinicalReview;

  // Klinik muhakeme prompt'ları (egitim modu — "neden?" öğretici, CEZASIZ).
  // ⚠️ Klinik içerik: her prompt'ta status (DRAFT → ACTIVE). Puanı ETKİLEMEZ.
  reasoning_prompts?: ReasoningPrompt[];
}

// ------------------------------------------------------------
// ÜRETİM KONTRATI — Blok 1 (16→400 senaryo temeli)
// ------------------------------------------------------------
// Mevcut 14 senaryo `Scenario` tipinde KALIR (geriye uyumluluk: pek çok
// alan opsiyonel). ÜRETİLEN her YENİ senaryo ise `ProductionScenario`
// daraltılmış tipine uymalı — opsiyonel alanları derleme-zamanı ZORUNLU
// yapar. Böylece eski senaryolar kırılmadan yeni üretim disipline edilir.
//
// Bu tip "alan VAR mı" kontratını taşır. "Alan İÇERİĞİ yeterli mi"
// (deterioration ≥1 faz, gerçek dallanma, katalog-id geçerli, max_points
// ulaşılabilir, references dolu) kontrolü Blok 3 validate.mjs'in işidir —
// çünkü TS tipi bir dizinin boş-olmadığını veya bir id'nin katalogda
// olduğunu güvenle ifade edemez.
//
// ⚠️ KLİNİK İÇERİK: Üretilen senaryo `clinical_review.status: "DRAFT"`
// ile doğar. ACTIVE'e geçişi SADECE Ali Bey yapar (CLAUDE.md kural 3).

export interface ProductionScenario extends Scenario {
  /** Oynanabilir seviyeler — üretimde min 3 seviye (validate kontrol eder). */
  supported_difficulties: Difficulty[];
  /** EN AZ 1 kötüleşme fazı ZORUNLU — statik/cansız senaryo üretilemez.
      (Dizinin boş-olmadığını validate.mjs doğrular.) */
  deterioration: DeteriorationPhase[];
  /** Klinik review durumu ZORUNLU — üretimde "DRAFT" ile doğar. */
  clinical_review: ClinicalReview;
  /** Ekipman etkisi merkezi mapper'dan gelsin (Blok 2). Üretilen senaryolarda
      açık (true) — eski elle vitals_change yerine merkezi fizyoloji.
      ⚠️ Opsiyonel bırakıldı: ekipman kullanmayan saf-karar senaryosu da geçerli. */
  use_central_equipment_effects?: boolean;
}

/**
 * Üretim senaryosu tanımlama yardımcısı — derleme-zamanı kontrat kapısı.
 * Yeni üretilen her senaryo dosyası `export const scenario_x = defineScenario({...})`
 * ile yazılır; eksik zorunlu alan (deterioration/clinical_review/...) derleme
 * hatası verir. Identity fonksiyon — runtime maliyeti yok.
 *
 * Mevcut 14 senaryo bunu KULLANMAZ (düz `Scenario` tipinde kalır) — geriye uyumlu.
 */
export function defineScenario(s: ProductionScenario): ProductionScenario {
  return s;
}

// ------------------------------------------------------------
// Oyun Oturumu (Runtime State)
// ------------------------------------------------------------

export interface StepResult {
  step_id: string;
  actions_taken: ActionRef[];
  points_earned: number;
  time_spent_sec: number;
  critical_errors: number;
}

export interface SessionState {
  scenario_id: string;
  mode: PlayMode;
  selected_difficulty: Difficulty;     // Kullanıcının seçtiği zorluk — filtrelerde kullanılır
  variant_id?: string;                 // Seçili varyant (varsa)
  started_at: number;
  current_step_id: string | null;
  // "in_progress": oynanıyor | "completed": doğal tamamlandı | "partial": kullanıcı erken bitirdi | "abandoned": süre doldu/kritik
  completion_status?: "in_progress" | "completed" | "partial" | "abandoned";
  completed_step_ids: string[];

  // Baseline = ilaçsız "temel" vitaller. Canlı monitör için referans noktası.
  // Statik vital değişimleri (evaluateAction outcome'ı) baseline'a işler.
  // Farmakoloji delta'sı (ilaçların tick etkisi) baseline'ın üstüne eklenir.
  baseline_vitals: PatientVitals;

  // Gösterilen (canlı) vitaller = baseline + pharmacology tick delta.
  // useVitalsTick hook her tick'te bunu günceller.
  vitals: PatientVitals;

  // Faz 1 — simüle saat (ms, started_at tabanlı). PhysiologyProvider'lı
  // oturumlarda farmakoloji + deterioration AYNI eksende akar: mod hızı
  // (eğitim 8×) ikisine eşit uygulanır, tarayıcı tab throttling ikisini
  // birlikte yavaşlatır. Provider'sız (quiz) oturumda kullanılmaz.
  sim_time_ms?: number;

  // Farmakoloji motoru — şu an hastanın sisteminde olan ilaçlar.
  // Tick fonksiyonu bu tam objeler üzerinde çalışır (instance_id, administered_at,
  // effective_vitals, timing, expires_at). Tipe Pharmacology namespace'inden erişilir:
  //   import type { Pharmacology } from "@/engine";
  //   const actives: Pharmacology.ActiveMedication[] = session.active_medications;
  // Opsiyonel: eski kod hâlâ active_medication_ids kullanıyor olabilir, geçiş için bırakıldı.
  active_medications?: import("./pharmacology/types").ActiveMedication[];
  active_medication_ids?: string[];      // @deprecated — active_medications kullan

  // Aktif ilaçların kümülatif EKG etkisi — useVitalsTick hook her tick'te günceller.
  // EcgStrip bileşenine iletilerek dalga formu ilaç tepkisi verir.
  current_ecg_params?: import("./pharmacology/types").EcgEffect;

  // Faz 3 — Lab order geçmişi
  ordered_labs?: Array<{
    panel_id: string;
    ordered_at_min: number;
    resolved_at_min?: number;
    panel?: LabPanel;
  }>;

  // Dinamik olarak açılan adımlar (komplikasyon dalı vb.)
  unlocked_dynamic_step_ids?: string[];
  results: StepResult[];
  total_score: number;
  // max(score_floor, total_score) — finalizeSession tarafından set edilir, display/grade için kullanılır
  floored_score?: number;
  // Seçilen zorlukta GERÇEKTEN ulaşılabilir tavan (getAchievableMaxPoints).
  // Yüzde + grade bunun üstünden hesaplanır (sabit max_points difficulty-kör).
  // finalizeSession set eder; display fallback: scenario.scoring.max_points.
  effective_max_points?: number;
  finished: boolean;
  grade?: "A" | "B" | "C" | "D" | "F";

  // Klinik muhakeme cevapları (SADECE egitim modu) — CEZASIZ.
  // ⚠️ Skor/grade hesabına GİRMEZ; yalnız debrief öğretici gösterimi için.
  reasoning_answers?: ReasoningAnswer[];
}

// ------------------------------------------------------------
// Klinik muhakeme (egitim modu — "neden?" öğretici katman, CEZASIZ)
// ------------------------------------------------------------
// Kritik aksiyon yapılınca (sadece egitim) gerekçe sorulur. Yanlış gerekçe
// PUAN KIRMAZ — debrief'te öğretici geri bildirim gösterilir. Klinik içerik:
// her prompt'ta `status` bayrağı (DRAFT → ACTIVE; ACTIVE'i Ali Bey verir).

export interface ReasoningOption {
  text: string;
  correct: boolean;
}

export interface ReasoningPrompt {
  id: string;                 // benzersiz prompt id
  // Bu hedeflerden biri seçilince çıkar: aksiyon target_id (ör. "aspirin")
  // VEYA decision option id (ör. "opt_pci_transfer"). Reperfüzyon birden çok
  // yolla yapıldığı için liste (PCI kararı VEYA tromboliz VEYA tenecteplase).
  triggerIds: string[];
  question: string;
  options: ReasoningOption[]; // 1 doğru + çeldiriciler
  explanation: string;        // debrief öğretici açıklama
  source: string;             // klinik kaynak (ör. "ESC 2023 ACS Guidelines")
  status: "DRAFT" | "REVIEWED_PENDING_ACTIVATION" | "ACTIVE";
}

export interface ReasoningAnswer {
  prompt_id: string;
  selected_index: number;     // seçilen option indeksi
  correct: boolean;           // öğretici (PUANI ETKİLEMEZ)
  answered_at: number;        // ms
}
