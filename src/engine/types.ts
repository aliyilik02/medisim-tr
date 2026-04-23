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
  category: "kardiyak" | "antibiyotik" | "analjezik" | "sedatif"
           | "antikoagulan" | "antiaritmik" | "sıvı" | "diğer";
  default_dose?: string;        // Gösterim için ("1 mg IV push")
  contraindications?: string[]; // Basit metin — detaylı şema için ExtendedMedication
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
  min_difficulty?: Difficulty;  // Bu seçenek hangi seviyeden itibaren görünür
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
  // Geçerli değerler: "normal" | "stemi" | "vt" | "vf" | "asistoli"
  // Belirtilmezse "normal" kullanılır
  ekg_pattern?: string;

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

  // Dinamik olarak açılan adımlar (komplikasyon dalı vb.)
  unlocked_dynamic_step_ids?: string[];
  results: StepResult[];
  total_score: number;
  finished: boolean;
  grade?: "A" | "B" | "C" | "D" | "F";
}
