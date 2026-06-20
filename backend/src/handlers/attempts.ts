// ============================================================
// Seans denemesi handler'ları (Tier-2 inc-3)
// ============================================================
// POST /api/attempts  — oturum sahibinin (öğrenci/eğitmen) seans sonucu kaydı.
// GET  /api/attempts  — yalnızca kendi denemeleri.
// user_id JWT'den alınır (gövdeden DEĞİL — başkası adına kayıt engellenir).
// KVKK rıza (consent) authorize() içinde sunucuda zorlanır.
// Sınıf atfı: tek sınıfa kayıtlı öğrencide deneme o sınıfa bağlanır (#1);
// 0/çoklu kayıtta class_id NULL → hiçbir eğitmen panelinde görünmez.
// Skor sunucuda sınırlanır (#2 — istemci skor uydurmasına karşı).
// ============================================================

import { authorize } from "../middleware/require-auth";
import { insertAttempt, listAttemptsByUser, listEnrollmentClassIds } from "../db/attempts";
import type { Env } from "../types";

const MAX_SUMMARY_BYTES = 64 * 1024; // 64 KB (gerçek bayt — TextEncoder)
const ATTEMPT_ROLES = ["student", "instructor", "admin"] as const;

function bad(error: string, detail?: string, status = 400): Response {
  return Response.json({ error, detail }, { status });
}

/** 500'lerde ham DB mesajını istemciye sızdırma (#10) — sadece log + generic. */
function serverError(context: string, e: unknown): Response {
  console.error(`[attempts] ${context}:`, e instanceof Error ? e.message : String(e));
  return Response.json({ error: "server_error", detail: "Sunucu hatası" }, { status: 500 });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

// ── POST /api/attempts ──
export async function handleCreateAttempt(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env, [...ATTEMPT_ROLES]);
  if (auth instanceof Response) return auth;
  const userId = auth.payload.sub;

  const body = await readJson(request);
  if (!body) return bad("invalid_json");

  const scenarioId = typeof body.scenario_id === "string" ? body.scenario_id.trim() : "";
  if (!scenarioId) return bad("scenario_required", "scenario_id gerekli");

  const startedAt = numOrNull(body.started_at) ?? Math.floor(Date.now() / 1000);
  const finishedAt = numOrNull(body.finished_at);
  const score = numOrNull(body.score);
  const maxScore = numOrNull(body.max_score);

  // Skor tutarlılığı (#2): negatif yok, max>0, score<=max, finished>=started.
  if (maxScore != null && maxScore <= 0) return bad("invalid_score", "max_score > 0 olmalı");
  if (score != null && score < 0) return bad("invalid_score", "score negatif olamaz");
  if (score != null && maxScore != null && score > maxScore) {
    return bad("invalid_score", "score, max_score'u aşamaz");
  }
  if (finishedAt != null && finishedAt < startedAt) {
    return bad("invalid_time", "finished_at, started_at'tan önce olamaz");
  }

  // summary: obje veya string; gerçek BAYT sınırı (#9 — çok baytlı TR metni).
  let summaryJson: string | null = null;
  if (body.summary_json != null) {
    summaryJson =
      typeof body.summary_json === "string"
        ? body.summary_json
        : JSON.stringify(body.summary_json);
    if (new TextEncoder().encode(summaryJson).length > MAX_SUMMARY_BYTES) {
      return bad("summary_too_large", `summary_json ${MAX_SUMMARY_BYTES} bayttan büyük`, 413);
    }
  }

  // Sınıf atfı (#1): yalnız tek sınıfa kayıtlıysa o sınıfa bağla; aksi halde NULL.
  let classId: string | null = null;
  try {
    const classIds = await listEnrollmentClassIds(env.DB, userId);
    if (classIds.length === 1) classId = classIds[0];
  } catch (e) {
    return serverError("enrollment lookup", e);
  }

  const id = crypto.randomUUID();
  try {
    await insertAttempt(env.DB, {
      id,
      userId,
      classId,
      scenarioId,
      score,
      maxScore,
      startedAt,
      finishedAt,
      summaryJson,
    });
  } catch (e) {
    return serverError("insert", e);
  }
  return Response.json({ attempt: { id } });
}

// ── GET /api/attempts — kendi denemeleri ──
export async function handleListAttempts(request: Request, env: Env): Promise<Response> {
  const auth = await authorize(request, env, [...ATTEMPT_ROLES]);
  if (auth instanceof Response) return auth;
  try {
    const attempts = await listAttemptsByUser(env.DB, auth.payload.sub);
    return Response.json({ attempts });
  } catch (e) {
    return serverError("list", e);
  }
}
