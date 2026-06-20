// ============================================================
// Sınıf / öğrenci API client (Tier-2 inc-3) — eğitmen paneli
// ============================================================
// Backend imzaları (backend/src/handlers/classes.ts):
//   POST /api/classes               { name }              → { class }
//   GET  /api/classes                                     → { classes }
//   GET  /api/classes/:id                                 → { class, institution_slug, roster, attempts }
//   POST /api/classes/:id/students  { handle, password }  → { student }
// Tümü instructor/admin rol-kapılı + sınıf sahipliği (instructor_id=JWT.sub).
// ============================================================

import { authFetch, readError } from "./http";

export interface ClassSummary {
  id: string;
  name: string;
  join_code: string;
  created_at: number;
  student_count: number;
}

export interface RosterStudent {
  id: string;
  handle: string;
  created_at: number;
}

export interface ClassAttempt {
  id: string;
  user_id: string;
  handle: string;
  scenario_id: string;
  score: number | null;
  max_score: number | null;
  started_at: number;
  finished_at: number | null;
  summary_json: string | null;
}

export interface ClassDetail {
  class: ClassSummary;
  institution_slug: string | null;
  roster: RosterStudent[];
  attempts: ClassAttempt[];
}

export interface CreatedStudent {
  id: string;
  handle: string;
  institution_slug: string | null;
}

export async function createClass(name: string): Promise<ClassSummary> {
  const res = await authFetch("/api/classes", { method: "POST", body: JSON.stringify({ name }) });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { class: ClassSummary };
  return data.class;
}

export async function listClasses(): Promise<ClassSummary[]> {
  const res = await authFetch("/api/classes", { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { classes: ClassSummary[] };
  return data.classes;
}

export async function getClass(classId: string): Promise<ClassDetail> {
  const res = await authFetch(`/api/classes/${encodeURIComponent(classId)}`, { method: "GET" });
  if (!res.ok) throw new Error(await readError(res));
  return (await res.json()) as ClassDetail;
}

export async function createStudent(
  classId: string,
  handle: string,
  password: string,
): Promise<CreatedStudent> {
  const res = await authFetch(`/api/classes/${encodeURIComponent(classId)}/students`, {
    method: "POST",
    body: JSON.stringify({ handle, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { student: CreatedStudent };
  return data.student;
}
