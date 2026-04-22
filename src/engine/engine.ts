// ============================================================
// MediSim TR — Senaryo Motoru
// ============================================================
// Senaryo oynatımının tüm mantığı burada.
// UI (React) bu motora "aksiyon yaptım" diye haber verir,
// motor da sonucu hesaplar.
// ============================================================

import type {
  Scenario,
  SessionState,
  Step,
  ActionRef,
  ActionOutcome,
  PatientVitals,
  PlayMode,
  DecisionOption,
} from "./types";

// ------------------------------------------------------------
// Yardımcı: Aksiyon eşleştirme
// ------------------------------------------------------------

function actionsMatch(a: ActionRef, b: ActionRef): boolean {
  if (a.type !== b.type) return false;
  if (a.target_id !== b.target_id) return false;
  // Dose ve site opsiyonel — eğer beklenende varsa eşleşmeli
  if (b.dose && a.dose !== b.dose) return false;
  if (b.site && a.site !== b.site) return false;
  return true;
}

// ------------------------------------------------------------
// Oturum başlatma
// ------------------------------------------------------------

export function startSession(scenario: Scenario, mode: PlayMode): SessionState {
  return {
    scenario_id: scenario.id,
    mode,
    started_at: Date.now(),
    current_step_id: scenario.start_step_id,
    completed_step_ids: [],
    vitals: { ...scenario.initial_vitals },
    results: [],
    total_score: 0,
    finished: false,
  };
}

// ------------------------------------------------------------
// Adım bulma
// ------------------------------------------------------------

export function getStep(scenario: Scenario, stepId: string): Step | undefined {
  return scenario.steps.find((s) => s.id === stepId);
}

export function getCurrentStep(
  scenario: Scenario,
  session: SessionState
): Step | null {
  if (!session.current_step_id) return null;
  return getStep(scenario, session.current_step_id) ?? null;
}

// ------------------------------------------------------------
// Aksiyon değerlendirme (ActionStep için)
// ------------------------------------------------------------

export interface ActionEvaluation {
  matched_outcome: ActionOutcome | null;
  points: number;
  feedback: string;
  critical: boolean;
  vitals_change?: Partial<PatientVitals>;
  unlocks: string[];
}

export function evaluateAction(
  step: Step,
  action: ActionRef,
  scenario: Scenario
): ActionEvaluation {
  if (step.kind !== "action") {
    return {
      matched_outcome: null,
      points: 0,
      feedback: "Bu adımda aksiyon beklenmiyor.",
      critical: false,
      unlocks: [],
    };
  }

  // Beklenen aksiyonlar arasında eşleşen var mı?
  const matched = step.expected_outcomes.find((o) =>
    actionsMatch(action, o.action)
  );

  if (matched) {
    return {
      matched_outcome: matched,
      points: matched.points,
      feedback: matched.feedback,
      critical: matched.critical ?? false,
      vitals_change: matched.vitals_change,
      unlocks: matched.unlocks ?? [],
    };
  }

  // Eşleşme yok — varsayılan hatalı aksiyon
  const defaultPenalty = step.default_wrong_penalty ?? -5;

  // Alerjiye dikkat — otomatik kritik hata
  let critical = false;
  let extraFeedback = "";
  if (action.type === "give_medication") {
    const med = scenario.available_medications.includes(action.target_id);
    if (!med) {
      extraFeedback = " (Bu ilaç envanterde yok, muhtemelen yanlış seçim.)";
    }
  }

  return {
    matched_outcome: null,
    points: defaultPenalty,
    feedback:
      (step.default_wrong_feedback ??
        "Bu aksiyon şu an için uygun değil.") + extraFeedback,
    critical,
    unlocks: [],
  };
}

// ------------------------------------------------------------
// Karar değerlendirme (DecisionStep için)
// ------------------------------------------------------------

export interface DecisionEvaluation {
  option: DecisionOption;
  points: number;
  feedback: string;
}

export function evaluateDecision(
  step: Step,
  optionId: string
): DecisionEvaluation | null {
  if (step.kind !== "decision") return null;
  const option = step.options.find((o) => o.id === optionId);
  if (!option) return null;
  return {
    option,
    points: option.points,
    feedback: option.feedback,
  };
}

// ------------------------------------------------------------
// Adım sonlandırma — bir sonraki adıma geçiş
// ------------------------------------------------------------

export function completeStep(
  session: SessionState,
  stepId: string,
  pointsEarned: number,
  actionsTaken: ActionRef[],
  criticalErrors: number,
  nextStepId: string | null
): SessionState {
  const timeSpent = Math.floor((Date.now() - session.started_at) / 1000);

  const newResult = {
    step_id: stepId,
    actions_taken: actionsTaken,
    points_earned: pointsEarned,
    time_spent_sec: timeSpent,
    critical_errors: criticalErrors,
  };

  const newCompleted = [...session.completed_step_ids, stepId];
  const newTotalScore = session.total_score + pointsEarned;

  return {
    ...session,
    current_step_id: nextStepId,
    completed_step_ids: newCompleted,
    results: [...session.results, newResult],
    total_score: newTotalScore,
    finished: nextStepId === null,
  };
}

// ------------------------------------------------------------
// Vitalleri güncelle
// ------------------------------------------------------------

export function applyVitalsChange(
  current: PatientVitals,
  change: Partial<PatientVitals>
): PatientVitals {
  return { ...current, ...change };
}

// ------------------------------------------------------------
// Not hesaplama
// ------------------------------------------------------------

export function calculateGrade(
  score: number,
  scoring: Scenario["scoring"]
): "A" | "B" | "C" | "D" | "F" {
  const { grade_bands } = scoring;
  if (score >= grade_bands.A) return "A";
  if (score >= grade_bands.B) return "B";
  if (score >= grade_bands.C) return "C";
  if (score >= grade_bands.D) return "D";
  return "F";
}

export function finalizeSession(
  session: SessionState,
  scenario: Scenario
): SessionState {
  return {
    ...session,
    finished: true,
    grade: calculateGrade(session.total_score, scenario.scoring),
  };
}

// ------------------------------------------------------------
// Sonraki adımı bulma
// ------------------------------------------------------------
// Basit mantık: unlocks varsa onu kullan, yoksa steps listesinde
// sıradaki adımı al. Hiçbiri yoksa bitir.
// ------------------------------------------------------------

export function pickNextStep(
  scenario: Scenario,
  currentStepId: string,
  unlocks: string[]
): string | null {
  if (unlocks.length > 0) {
    return unlocks[0];
  }
  const idx = scenario.steps.findIndex((s) => s.id === currentStepId);
  if (idx === -1 || idx === scenario.steps.length - 1) return null;
  return scenario.steps[idx + 1].id;
}
