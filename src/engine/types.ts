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

  // 3D (opsiyonel)
  scene?: SceneConfig;
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
  finished: boolean;
  grade?: "A" | "B" | "C" | "D" | "F";
}
