// ============================================================
// Seans denemesi API client (Tier-2 inc-3)
// ============================================================
// Backend imzaları (backend/src/handlers/attempts.ts):
//   POST /api/attempts  { scenario_id, score, max_score, started_at,
//                         finished_at, summary_json } → { attempt: { id } }
//   GET  /api/attempts                                → { attempts }
// user_id JWT'den; gövdede gönderilse bile yok sayılır.
// ============================================================

import { authFetch, readError } from "./http";

export interface AttemptInput {
  scenario_id: string;
  score?: number | null;
  max_score?: number | null;
  started_at: number; // UNIX saniye
  finished_at?: number | null;
  summary_json?: unknown; // obje veya string — backend serialize eder
}

export interface AttemptRecord {
  id: string;
  scenario_id: string;
  score: number | null;
  max_score: number | null;
  started_at: number;
  finished_at: number | null;
  summary_json: string | null;
}

export async function submitAttempt(input: AttemptInput): Promise<string> {
  const res = await authFetch("/api/attempts", { method: "POST", body: JSON.stringify(input) });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { attempt: { id: string } };
  return data.attempt.id;
}

export async function listMyAttempts(): Promise<AttemptRecord[]> {
  const res = await authFetch("/api/attempts", { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { attempts: AttemptRecord[] };
  return data.attempts;
}
