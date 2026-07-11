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
  Difficulty,
  DecisionMultiEvaluation,
} from "./types";
import { resolveScenarioVariant } from "./variant";
import { getEffectiveGradeBands, deriveGradeBands, STANDARD_GRADE_THRESHOLDS } from "./grading";

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

export function startSession(
  scenario: Scenario,
  mode: PlayMode,
  difficulty?: Difficulty,
  variantId?: string
): SessionState {
  const resolved = resolveScenarioVariant(scenario, variantId);
  const initial = { ...resolved.initial_vitals };
  return {
    scenario_id: scenario.id,
    mode,
    selected_difficulty: difficulty ?? scenario.difficulty,
    variant_id: variantId,
    started_at: Date.now(),
    current_step_id: resolved.start_step_id,
    completed_step_ids: [],
    baseline_vitals: { ...initial },
    vitals: initial,
    active_medications: [],
    active_medication_ids: [],
    unlocked_dynamic_step_ids: [],
    results: [],
    total_score: 0,
    finished: false,
    completion_status: "in_progress",
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
  scenario: Scenario,
  difficulty?: Difficulty
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

  // Seçili zorluk — verilmemişse senaryonun kendi difficulty'si
  const selectedDiff: Difficulty = difficulty ?? scenario.difficulty;

  // Zorluk seviyesine uygun outcome'ları filtrele
  const filteredOutcomes = step.expected_outcomes.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, selectedDiff)
  );

  // Beklenen aksiyonlar arasında eşleşen var mı?
  const matched = filteredOutcomes.find((o) =>
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
  const critical = false;
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
// Zorluk filtresi yardımcıları
// ------------------------------------------------------------

/**
 * Bir outcome/option/step bu zorluk seviyesinde görünür mü?
 * min_difficulty: bu seviyeden itibaren görünür
 * max_difficulty: bu seviyeye kadar (dahil) görünür
 */
export function isVisibleAtDifficulty(
  min: Difficulty | undefined,
  max: Difficulty | undefined,
  selected: Difficulty
): boolean {
  if (min !== undefined && selected < min) return false;
  if (max !== undefined && selected > max) return false;
  return true;
}

/**
 * Senaryonun adımlarını seçilen zorluğa göre filtreler.
 * UI bunu senaryo açılışında çağırır, sadece uygun adımları gösterir.
 */
export function getStepsForDifficulty(
  scenario: Scenario,
  difficulty: Difficulty
): Step[] {
  return scenario.steps.filter((s) =>
    isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, difficulty)
  );
}

/**
 * DecisionStep'in seçeneklerini zorluğa göre filtreler.
 * UI bunu seçenekleri render ederken kullanır.
 */
export function getVisibleOptions(
  step: Step,
  difficulty: Difficulty
): DecisionOption[] {
  if (step.kind !== "decision") return [];
  return step.options.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
  );
}

// ------------------------------------------------------------
// Karar değerlendirme (DecisionStep için)
// ------------------------------------------------------------

export interface DecisionEvaluation {
  option: DecisionOption;
  points: number;
  feedback: string;
  /** Dallanma hedefi (option.next_step_id) — yoksa null → linear akış. */
  next_step_id: string | null;
}

export function evaluateDecision(
  step: Step,
  optionId: string,
  difficulty?: Difficulty,
  scenario?: Scenario
): DecisionEvaluation | null {
  if (step.kind !== "decision") return null;

  const selectedDiff: Difficulty =
    difficulty ?? scenario?.difficulty ?? 3;

  const option = step.options.find((o) => o.id === optionId);
  if (!option) return null;

  // Seçilen opsiyon bu zorluk seviyesinde mi görünmeli?
  // (Eğer değilse, kullanıcı muhtemelen UI'dan erişememiş olmalı;
  // yine de sertlik için kontrol et)
  if (
    !isVisibleAtDifficulty(
      option.min_difficulty,
      option.max_difficulty,
      selectedDiff
    )
  ) {
    return null;
  }

  return {
    option,
    points: option.points,
    feedback: option.feedback,
    next_step_id: option.next_step_id ?? null,
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
  const bands = getEffectiveGradeBands(scoring);
  if (score >= bands.A) return "A";
  if (score >= bands.B) return "B";
  if (score >= bands.C) return "C";
  if (score >= bands.D) return "D";
  return "F";
}

/**
 * Seçilen zorlukta GERÇEKTEN ulaşılabilir en iyi puan (best-path toplamı).
 *
 * SORUN: scoring.max_points TEK sabit sayı ve difficulty-kör. Ama adımlar/
 * outcome'lar/option'lar min_difficulty/max_difficulty ile gated → ulaşılabilir
 * puan zorlukla DEĞİŞİR (örn. STEMI d1≈293, d5≈550). Yüzde + grade bantlarını
 * sabit max_points üzerinden hesaplamak yüksek zorlukta %>100 + bedava A üretir.
 * Bu fonksiyon seçilen zorlukta best-path'i yürüyüp ulaşılabilir tavanı verir.
 *
 * Saf: girdi senaryo+zorluk, çıktı sayı. autoPlayBestPath ile aynı strateji
 * (her adımda en yüksek pozitif outcome'lar, decision'da en iyi correct).
 */
export function getAchievableMaxPoints(
  scenario: Scenario,
  difficulty: Difficulty
): number {
  let stepId: string | null = scenario.start_step_id;
  let total = 0;
  const seen = new Set<string>();

  for (let i = 0; i < 100 && stepId; i++) {
    if (seen.has(stepId)) break;
    seen.add(stepId);
    const step = getStep(scenario, stepId);
    if (!step) break;

    let unlock: string | null = null;

    if (step.kind === "action") {
      const positives = step.expected_outcomes
        .filter((o) =>
          isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
        )
        .filter((o) => (o.points ?? 0) > 0)
        .sort((a, b) => b.points - a.points);
      const cap = step.max_actions ?? positives.length;
      for (const o of positives.slice(0, cap)) {
        total += o.points;
        if (!unlock && o.unlocks && o.unlocks.length > 0) unlock = o.unlocks[0];
      }
    } else if (step.kind === "decision") {
      const correct = step.options
        .filter((o) =>
          isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
        )
        .filter((o) => o.correct)
        .sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
      if (step.allow_multiple) {
        // Çoklu seçim: tüm doğru option'lar puana eklenir.
        for (const o of correct) total += o.points ?? 0;
      } else if (correct.length > 0) {
        total += correct[0].points ?? 0;
      }
      // Dallanan karar: best-path seçilen doğrunun dalını izler
      // (runtime finishStep davranışıyla tutarlı ulaşılabilir tavan).
      const branched = correct.find((o) => o.next_step_id);
      if (branched?.next_step_id) unlock = branched.next_step_id;
    }

    stepId = pickNextStep(scenario, step.id, unlock ? [unlock] : [], difficulty);
  }

  // time_bonus ulaşılabilir tavana dahil (mükemmel oyun zaman bonusunu da alabilir).
  if (scenario.scoring.time_bonus) total += scenario.scoring.time_bonus.bonus_points;

  return Math.max(total, 1); // 0'a bölme guard
}

/**
 * Zorluk-duyarlı grade. grading_mode "manual" → yazılı bantlar (sabit).
 * Aksi halde bantlar SEÇİLEN ZORLUKTA ulaşılabilir tavandan türetilir
 * (A=%85 ulaşılabilir, vb.) — her zorlukta tutarlı.
 */
export function calculateGradeForDifficulty(
  score: number,
  scenario: Scenario,
  difficulty: Difficulty
): "A" | "B" | "C" | "D" | "F" {
  if (scenario.scoring.grading_mode === "manual") {
    return calculateGrade(score, scenario.scoring);
  }
  const bands = deriveGradeBands(getAchievableMaxPoints(scenario, difficulty));
  if (score >= bands.A) return "A";
  if (score >= bands.B) return "B";
  if (score >= bands.C) return "C";
  if (score >= bands.D) return "D";
  return "F";
}

/** Zorluk-duyarlı geçme eşiği (ulaşılabilir tavanın %40'ı; manual'de yazılı). */
export function getEffectivePassingScoreForDifficulty(
  scenario: Scenario,
  difficulty: Difficulty
): number {
  if (scenario.scoring.grading_mode === "manual") {
    return scenario.scoring.passing_score;
  }
  return Math.round(
    getAchievableMaxPoints(scenario, difficulty) * STANDARD_GRADE_THRESHOLDS.D
  );
}

export function finalizeSession(
  session: SessionState,
  scenario: Scenario,
  reason: "completed" | "partial" | "abandoned" = "completed"
): SessionState {
  // total_score ham kalır; floored_score display/grade için
  const floor = scenario.scoring.score_floor ?? 0;
  const flooredScore = Math.max(floor, session.total_score);
  // Zorluk-duyarlı ulaşılabilir tavan → yüzde + grade tutarlı (sabit max_points
  // difficulty-kör olduğu için %>100 / bedava A sorununu çözer).
  const achievableMax = getAchievableMaxPoints(
    scenario,
    session.selected_difficulty
  );
  return {
    ...session,
    finished: true,
    floored_score: flooredScore,
    effective_max_points: achievableMax,
    grade: calculateGradeForDifficulty(
      flooredScore,
      scenario,
      session.selected_difficulty
    ),
    completion_status: reason,
  };
}

// ------------------------------------------------------------
// Sonraki adımı bulma
// ------------------------------------------------------------
// Basit mantık: unlocks varsa onu kullan, yoksa steps listesinde
// sıradaki adımı al. Zorluk filtresine uymayan adımları atlar.
// Hiçbiri yoksa bitir.
// ------------------------------------------------------------

// ------------------------------------------------------------
// Çoklu karar değerlendirme (allow_multiple=true DecisionStep için)
// ------------------------------------------------------------

export function evaluateDecisionMulti(
  step: Step,
  optionIds: string[],
  difficulty?: Difficulty,
  scenario?: Scenario
): DecisionMultiEvaluation | null {
  if (step.kind !== "decision") return null;

  const selectedDiff: Difficulty = difficulty ?? scenario?.difficulty ?? 3;

  const visibleOptions = step.options.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, selectedDiff)
  );

  const selected = visibleOptions.filter((o) => optionIds.includes(o.id));
  const selectedIdSet = new Set(selected.map((o) => o.id));

  let totalPoints = selected.reduce((sum, o) => sum + o.points, 0);

  const correctVisible = visibleOptions.filter((o) => o.correct);
  const missed = correctVisible.filter((o) => !selectedIdSet.has(o.id));

  if (step.partial_credit && missed.length > 0) {
    const penalty = missed.reduce(
      (sum, o) => sum + Math.round(Math.abs(o.points) * 0.5),
      0
    );
    totalPoints -= penalty;
  }

  const lines: string[] = [];
  for (const o of selected) {
    const prefix = o.correct ? "✓" : "✗";
    lines.push(`${prefix} ${o.text}: ${o.feedback}`);
  }
  if (missed.length > 0) {
    lines.push("");
    lines.push("Atlanan doğru seçenekler:");
    for (const o of missed) {
      lines.push(`– ${o.text}`);
    }
  }

  const allCorrect =
    correctVisible.length > 0 &&
    correctVisible.every((o) => selectedIdSet.has(o.id)) &&
    selected.every((o) => o.correct);

  // Dallanma hedefi: seçilenler arasında (adım sırası) önce DOĞRU olanların
  // next_step_id'si, yoksa herhangi birininki. Deterministik.
  const branch =
    selected.find((o) => o.correct && o.next_step_id) ??
    selected.find((o) => o.next_step_id);

  return {
    selected_options: selected,
    missed_correct_options: missed,
    points: totalPoints,
    feedback: lines.join("\n") || "Seçim değerlendirildi.",
    all_correct: allCorrect,
    next_step_id: branch?.next_step_id ?? null,
  };
}

// ------------------------------------------------------------
// Sonraki adımı bulma
// ------------------------------------------------------------

export function pickNextStep(
  scenario: Scenario,
  currentStepId: string,
  unlocks: string[],
  difficulty?: Difficulty
): string | null {
  const selectedDiff: Difficulty = difficulty ?? scenario.difficulty;

  // Unlock varsa: listedeki ilk uygun adımı bul
  if (unlocks.length > 0) {
    for (const id of unlocks) {
      const s = scenario.steps.find((x) => x.id === id);
      if (
        s &&
        isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, selectedDiff)
      ) {
        return id;
      }
    }
    // Unlock listesinde zorluğa uygun adım yok — linear akışa düş
  }

  const idx = scenario.steps.findIndex((s) => s.id === currentStepId);
  if (idx === -1) return null;

  // Sıradaki adımlardan zorluğa uygun olan ilkini bul
  for (let i = idx + 1; i < scenario.steps.length; i++) {
    const s = scenario.steps[i];
    if (
      isVisibleAtDifficulty(s.min_difficulty, s.max_difficulty, selectedDiff)
    ) {
      return s.id;
    }
  }

  return null;
}
