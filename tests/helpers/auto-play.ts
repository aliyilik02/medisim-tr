// ============================================================
// Auto-Play Helper
// ============================================================
// Verilen senaryoyu "en iyi yol" stratejisiyle motor üzerinden
// oynar. Her step için maksimum pozitif puanlı outcome/option'ı
// seçer. Toplam puanı + final session'ı döner.
//
// "En iyi yol" hipotezi: senaryo dengesine göre, optimal kararları
// alan öğrenci en az A bandı puanını almalı. Aksi halde senaryo
// dengesi bozuktur (max_points / grade_bands.A çok yüksek tutulmuş
// veya yeterince pozitif puan yok).
// ============================================================

import {
  evaluateAction,
  evaluateDecision,
  getStep,
  isVisibleAtDifficulty,
  pickNextStep,
  startSession,
} from "@/engine";
import type {
  Scenario,
  SessionState,
  Difficulty,
  Step,
  ActionStep,
  DecisionStep,
} from "@/engine";

const MAX_STEPS = 50; // sonsuz döngü guard

export interface AutoPlayResult {
  totalPoints: number;
  visitedSteps: string[];
  finalSession: SessionState;
  warnings: string[];
}

export function autoPlayBestPath(
  scenario: Scenario,
  difficulty: Difficulty = 1
): AutoPlayResult {
  let session = startSession(scenario, "klinik", difficulty);
  let totalPoints = 0;
  const visited: string[] = [];
  const warnings: string[] = [];

  for (let i = 0; i < MAX_STEPS; i++) {
    if (!session.current_step_id) break;
    const step = getStep(scenario, session.current_step_id);
    if (!step) {
      warnings.push(`step bulunamadı: ${session.current_step_id}`);
      break;
    }
    visited.push(step.id);

    if (step.kind === "action") {
      const { points, unlockId } = playActionStep(step, scenario, difficulty, warnings);
      totalPoints += points;
      session = advance(session, scenario, step, unlockId, difficulty);
    } else if (step.kind === "decision") {
      const { points, unlockId } = playDecisionStep(step, scenario, difficulty, warnings);
      totalPoints += points;
      session = advance(session, scenario, step, unlockId, difficulty);
    } else {
      // info step
      session = advance(session, scenario, step, null, difficulty);
    }

    if (!session.current_step_id) break;
  }

  return { totalPoints, visitedSteps: visited, finalSession: session, warnings };
}

function playActionStep(
  step: ActionStep,
  scenario: Scenario,
  difficulty: Difficulty,
  warnings: string[]
): { points: number; unlockId: string | null } {
  const visible = step.expected_outcomes.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
  );
  const positives = visible.filter((o) => (o.points ?? 0) > 0);
  if (positives.length === 0) {
    warnings.push(`${scenario.id}/${step.id}: pozitif outcome yok — adım atlanıyor`);
    return { points: 0, unlockId: null };
  }
  // Öğrenci max_actions'a kadar pozitif aksiyon yapabilir (örn. tetkik
  // istemi adımı: 3 doğru tetkik istenebilir). Theoretical en iyi: tüm
  // pozitif outcome'ları puana ekle, max_actions ile sınırla.
  const cap = step.max_actions ?? positives.length;
  const ordered = [...positives].sort((a, b) => b.points - a.points);
  const chosen = ordered.slice(0, cap);

  let total = 0;
  let unlock: string | null = null;
  for (const o of chosen) {
    const ev = evaluateAction(step, o.action, scenario, difficulty);
    if (!ev.matched_outcome) {
      warnings.push(`${scenario.id}/${step.id}: outcome eşleşmedi`);
      continue;
    }
    total += ev.points;
    if (!unlock && ev.unlocks.length > 0) unlock = ev.unlocks[0];
  }
  return { points: total, unlockId: unlock };
}

function playDecisionStep(
  step: DecisionStep,
  scenario: Scenario,
  difficulty: Difficulty,
  warnings: string[]
): { points: number; unlockId: string | null } {
  const visible = step.options.filter((o) =>
    isVisibleAtDifficulty(o.min_difficulty, o.max_difficulty, difficulty)
  );
  const correct = visible.filter((o) => o.correct);
  if (correct.length === 0) {
    warnings.push(`${scenario.id}/${step.id}: hiç correct opsiyon yok`);
    return { points: 0, unlockId: null };
  }
  const best = [...correct].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))[0];
  const evaluation = evaluateDecision(step, best.id, difficulty, scenario);
  return {
    points: evaluation?.points ?? 0,
    // Dallanan karar: runtime (finishStep) dal hedefini izler — walker da
    // izlemeli, yoksa best-path lineer akıp komplikasyon koluna girer.
    unlockId: evaluation?.next_step_id ?? null,
  };
}

function advance(
  session: SessionState,
  scenario: Scenario,
  step: Step,
  unlockId: string | null,
  difficulty: Difficulty
): SessionState {
  const next = pickNextStep(
    scenario,
    step.id,
    unlockId ? [unlockId] : [],
    difficulty
  );
  return {
    ...session,
    current_step_id: next,
    completed_step_ids: [...session.completed_step_ids, step.id],
    finished: next === null,
  };
}
