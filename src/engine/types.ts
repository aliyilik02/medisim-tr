// ============================================================
// MediSim TR — Senaryo Motoru Tipleri
// ============================================================
// Bu dosya projenin kalbi. Her senaryo bu şemaya uymak zorunda.
// Şemayı değiştirmek = tüm senaryoları etkilemek. Dikkat.
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

export type PlayMode = "egitim" | "sinav";

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
}

// ------------------------------------------------------------
// Envanter (İlaç & Ekipman)
// ------------------------------------------------------------

export interface Medication {
  id: string;
  name_tr: string;
  name_en?: string;
  category: "kardiyak" | "antibiyotik" | "analjezik" | "sedatif"
           | "antikoagulan" | "antiaritmik" | "sıvı" | "diğer";
  default_dose?: string;
  contraindications?: string[];
}

export interface Equipment {
  id: string;
  name_tr: string;
  icon?: string;
  category: "monitorizasyon" | "havayolu" | "damar_yolu"
           | "defibrilasyon" | "cerrahi" | "koruyucu" | "diğer";
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
  vitals_change?: Partial<PatientVitals>; // Aksiyondan sonra vitaller değişir mi
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
}

export interface StepBase {
  id: string;
  title: string;
  prompt: string;              // Öğrenciye sorulan
  narrative?: string;          // Opsiyonel sahne anlatımı
  time_limit_sec?: number;
  min_actions?: number;        // Devam etmek için min. aksiyon
  max_actions?: number;        // Üst sınır (sınırsız spam engeli)
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
  display?: {
    type: "image" | "ecg" | "lab" | "imaging";
    asset: string;
    caption?: string;
  };
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
  time_bonus?: {
    target_seconds: number;
    bonus_points: number;
  };
}

export interface Debrief {
  key_learnings: string[];
  references: string[];
  red_flags?: string[];       // Bu senaryoda dikkat edilmesi gereken kritik noktalar
  next_scenarios?: string[];  // Önerilen sonraki senaryolar
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
  difficulty: Difficulty;
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
  started_at: number;
  current_step_id: string | null;
  completed_step_ids: string[];
  vitals: PatientVitals;
  results: StepResult[];
  total_score: number;
  finished: boolean;
  grade?: "A" | "B" | "C" | "D" | "F";
}
