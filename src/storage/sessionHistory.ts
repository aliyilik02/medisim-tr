import type {
  Scenario,
  SessionState,
  PlayMode,
  Difficulty,
  StepResult,
  Step,
  Patient,
  PatientVitals,
  ScoringConfig,
  Debrief,
  Specialty,
} from "@/engine/types";

const STORAGE_KEY = "medisim.session_history";
const MAX_SESSIONS = 100;

// ── Slim snapshot tipleri (aktif farmakoloji & vitals yükü hariç) ──

export interface SessionSnapshot {
  scenario_id: string;
  mode: PlayMode;
  selected_difficulty: Difficulty;
  variant_id?: string;
  started_at: number;
  completed_step_ids: string[];
  results: StepResult[];
  total_score: number;
  floored_score?: number;
  finished: boolean;
  grade?: "A" | "B" | "C" | "D" | "F";
  completion_status?: "in_progress" | "completed" | "partial" | "abandoned";
}

export interface ScenarioSnapshot {
  id: string;
  version: string;
  title: string;
  specialty: Specialty;
  patient: Patient;
  initial_vitals: PatientVitals;
  steps: Step[];
  scoring: ScoringConfig;
  debrief: Debrief;
}

export interface SavedSession {
  id: string;
  scenario_id: string;
  scenario_title: string;
  scenario_specialty: Specialty;
  played_at: string;              // ISO
  mode: PlayMode;
  difficulty: Difficulty;
  duration_seconds: number;
  total_score: number;
  max_points: number;
  grade: "A" | "B" | "C" | "D" | "F";
  critical_errors: number;
  session_snapshot: SessionSnapshot;
  scenario_snapshot: ScenarioSnapshot;
}

// ── Yardımcılar ───────────────────────────────────────────────────

function computeGrade(session: SessionState, scenario: Scenario): "A" | "B" | "C" | "D" | "F" {
  if (session.grade) return session.grade;
  const { grade_bands } = scenario.scoring;
  const s = session.total_score;
  if (s >= grade_bands.A) return "A";
  if (s >= grade_bands.B) return "B";
  if (s >= grade_bands.C) return "C";
  if (s >= grade_bands.D) return "D";
  return "F";
}

function computeDuration(session: SessionState): number {
  if (session.results.length > 0) {
    return session.results[session.results.length - 1].time_spent_sec;
  }
  return Math.floor((Date.now() - session.started_at) / 1000);
}

function slimSession(s: SessionState): SessionSnapshot {
  return {
    scenario_id: s.scenario_id,
    mode: s.mode,
    selected_difficulty: s.selected_difficulty,
    variant_id: s.variant_id,
    started_at: s.started_at,
    completed_step_ids: s.completed_step_ids,
    results: s.results,
    total_score: s.total_score,
    floored_score: s.floored_score,
    finished: s.finished,
    grade: s.grade,
    completion_status: s.completion_status,
  };
}

function slimScenario(sc: Scenario): ScenarioSnapshot {
  return {
    id: sc.id,
    version: sc.version,
    title: sc.title,
    specialty: sc.specialty,
    patient: sc.patient,
    initial_vitals: sc.initial_vitals,
    steps: sc.steps,
    scoring: sc.scoring,
    debrief: sc.debrief,
  };
}

function tryWrite(sessions: SavedSession[]): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
    return true;
  } catch {
    return false;
  }
}

// ── API ───────────────────────────────────────────────────────────

export function saveSession(
  session: SessionState,
  scenario: Scenario
): SavedSession | null {
  if (!session.finished) return null;

  const grade    = computeGrade(session, scenario);
  const duration = computeDuration(session);
  const critical = session.results.reduce((a, r) => a + r.critical_errors, 0);

  const saved: SavedSession = {
    id:                `${session.started_at}-${scenario.id}`,
    scenario_id:        scenario.id,
    scenario_title:     scenario.title,
    scenario_specialty: scenario.specialty,
    played_at:          new Date(session.started_at).toISOString(),
    mode:               session.mode,
    difficulty:         session.selected_difficulty,
    duration_seconds:   duration,
    total_score:        session.total_score,
    max_points:         scenario.scoring.max_points,
    grade,
    critical_errors:    critical,
    session_snapshot:   slimSession(session),
    scenario_snapshot:  slimScenario(scenario),
  };

  let sessions = listSessions();
  if (sessions.some((s) => s.id === saved.id)) return saved; // dedup

  sessions = [saved, ...sessions].slice(0, MAX_SESSIONS);

  // Quota aşılınca eski kayıtları buda
  if (!tryWrite(sessions)) {
    let trimmed = sessions.slice(0, Math.floor(sessions.length * 0.7));
    while (trimmed.length > 5 && !tryWrite(trimmed)) {
      trimmed = trimmed.slice(0, Math.floor(trimmed.length * 0.7));
    }
  }

  return saved;
}

export function listSessions(): SavedSession[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as SavedSession[]).sort(
      (a, b) => new Date(b.played_at).getTime() - new Date(a.played_at).getTime()
    );
  } catch {
    return [];
  }
}

export function getSession(id: string): SavedSession | null {
  return listSessions().find((s) => s.id === id) ?? null;
}

export function deleteSession(id: string): void {
  const sessions = listSessions().filter((s) => s.id !== id);
  tryWrite(sessions);
}

export function clearAllSessions(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
}

export function getSessionsByScenario(scenarioId: string): SavedSession[] {
  return listSessions().filter((s) => s.scenario_id === scenarioId);
}

export interface SessionStats {
  total_sessions: number;
  avg_score_pct: number;
  sessions_last_7d: number;
  best_grade: "A" | "B" | "C" | "D" | "F";
  favorite_specialty: string;
  last_session?: SavedSession;
}

export function getStats(): SessionStats | null {
  const sessions = listSessions();
  if (sessions.length === 0) return null;

  const avg = Math.round(
    sessions.reduce((a, s) => a + Math.round((s.total_score / s.max_points) * 100), 0) /
      sessions.length
  );

  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const last7d  = sessions.filter((s) => new Date(s.played_at).getTime() > cutoff).length;

  const gradeOrder = ["A", "B", "C", "D", "F"] as const;
  const bestGrade  = gradeOrder.find((g) => sessions.some((s) => s.grade === g)) ?? "F";

  const specialtyCount: Record<string, number> = {};
  for (const s of sessions) {
    specialtyCount[s.scenario_specialty] = (specialtyCount[s.scenario_specialty] ?? 0) + 1;
  }
  const favSpecialty =
    Object.entries(specialtyCount).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    total_sessions:     sessions.length,
    avg_score_pct:      avg,
    sessions_last_7d:   last7d,
    best_grade:         bestGrade,
    favorite_specialty: favSpecialty,
    last_session:       sessions[0],
  };
}
