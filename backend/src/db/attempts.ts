// ============================================================
// D1 seans denemesi (attempt) sorguları — parametreli
// ============================================================
// KVKK: attempt = user_id ile bağlı performans verisi. summary_json
// sentetik senaryo verisi (hasta gerçek değil) → düşük hassasiyet.
// Eğitmen yalnızca kendi sınıfındaki öğrencilerin denemelerini görür
// (sahiplik + enrollment join handler katmanında zorlanır).
// ============================================================

export interface AttemptRow {
  id: string;
  user_id: string;
  class_id: string | null;
  scenario_id: string;
  score: number | null;
  max_score: number | null;
  started_at: number;
  finished_at: number | null;
  summary_json: string | null;
}

/** Öğrenci görünümü (eğitmen panelinde handle ile birlikte). */
export interface AttemptWithUser extends AttemptRow {
  handle: string;
}

export interface CreateAttemptInput {
  id: string;
  userId: string;
  classId: string | null;
  scenarioId: string;
  score: number | null;
  maxScore: number | null;
  startedAt: number;
  finishedAt: number | null;
  summaryJson: string | null;
}

export async function insertAttempt(db: D1Database, a: CreateAttemptInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO attempts (id, user_id, class_id, scenario_id, score, max_score, started_at, finished_at, summary_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      a.id,
      a.userId,
      a.classId,
      a.scenarioId,
      a.score,
      a.maxScore,
      a.startedAt,
      a.finishedAt,
      a.summaryJson,
    )
    .run();
}

/** Bir kullanıcının kayıtlı olduğu sınıf id'leri (otomatik atıf için). */
export async function listEnrollmentClassIds(db: D1Database, userId: string): Promise<string[]> {
  const res = await db
    .prepare("SELECT class_id FROM enrollments WHERE user_id = ?")
    .bind(userId)
    .all<{ class_id: string }>();
  return (res.results ?? []).map((r) => r.class_id);
}

export async function listAttemptsByUser(
  db: D1Database,
  userId: string,
  limit = 100,
): Promise<AttemptRow[]> {
  const res = await db
    .prepare(
      `SELECT * FROM attempts WHERE user_id = ? ORDER BY started_at DESC LIMIT ?`,
    )
    .bind(userId, limit)
    .all<AttemptRow>();
  return res.results ?? [];
}

/**
 * Bir sınıfta ÜRETİLEN denemeler (eğitmen paneli — sahiplik handler'da).
 * Kapsam a.class_id (denemenin atandığı sınıf), enrollment DEĞİL → öğrenci
 * birden çok sınıfa kayıtlı olsa bile eğitmenler-arası sızıntı yok (#1 fix).
 */
export async function listAttemptsByClass(
  db: D1Database,
  classId: string,
  limit = 1000,
): Promise<AttemptWithUser[]> {
  const res = await db
    .prepare(
      `SELECT a.*, u.handle AS handle
       FROM attempts a
       JOIN users u ON u.id = a.user_id
       WHERE a.class_id = ?
       ORDER BY a.started_at DESC
       LIMIT ?`,
    )
    .bind(classId, limit)
    .all<AttemptWithUser>();
  return res.results ?? [];
}
