// ============================================================
// D1 sınıf / kayıt (enrollment) sorguları — parametreli
// ============================================================
// KVKK: öğrenci PII minimal. roster yalnızca pseudonim handle döner.
// Sınıf sahipliği handler katmanında doğrulanır (instructor_id = JWT.sub).
// ============================================================

export interface ClassRow {
  id: string;
  institution_id: string;
  instructor_id: string;
  name: string;
  join_code: string;
  created_at: number;
}

/** Liste görünümü: sınıf + kayıtlı öğrenci sayısı. */
export interface ClassWithCount extends ClassRow {
  student_count: number;
}

export interface RosterStudent {
  id: string;
  handle: string;
  created_at: number;
}

export interface CreateClassInput {
  id: string;
  institutionId: string;
  instructorId: string;
  name: string;
  joinCode: string;
  nowSec: number;
}

export async function insertClass(db: D1Database, c: CreateClassInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO classes (id, institution_id, instructor_id, name, join_code, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(c.id, c.institutionId, c.instructorId, c.name, c.joinCode, c.nowSec)
    .run();
}

export async function listClassesByInstructor(
  db: D1Database,
  instructorId: string,
): Promise<ClassWithCount[]> {
  const res = await db
    .prepare(
      `SELECT c.*, (SELECT COUNT(*) FROM enrollments e WHERE e.class_id = c.id) AS student_count
       FROM classes c
       WHERE c.instructor_id = ?
       ORDER BY c.created_at DESC`,
    )
    .bind(instructorId)
    .all<ClassWithCount>();
  return res.results ?? [];
}

export async function getClassById(db: D1Database, id: string): Promise<ClassRow | null> {
  const row = await db.prepare("SELECT * FROM classes WHERE id = ? LIMIT 1").bind(id).first<ClassRow>();
  return row ?? null;
}

export async function findClassByJoinCode(db: D1Database, joinCode: string): Promise<ClassRow | null> {
  const row = await db
    .prepare("SELECT * FROM classes WHERE join_code = ? LIMIT 1")
    .bind(joinCode)
    .first<ClassRow>();
  return row ?? null;
}

/** join_code çakışma kontrolü (üretim sırasında benzersizlik garantisi). */
export async function joinCodeExists(db: D1Database, joinCode: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS x FROM classes WHERE join_code = ? LIMIT 1")
    .bind(joinCode)
    .first<{ x: number }>();
  return row != null;
}

/** Sınıfa kayıtlı öğrenciler (pseudonim handle). */
export async function getClassRoster(db: D1Database, classId: string): Promise<RosterStudent[]> {
  const res = await db
    .prepare(
      `SELECT u.id, u.handle, e.created_at AS created_at
       FROM enrollments e
       JOIN users u ON u.id = e.user_id
       WHERE e.class_id = ? AND u.status = 'active'
       ORDER BY u.handle COLLATE NOCASE ASC`,
    )
    .bind(classId)
    .all<RosterStudent>();
  return res.results ?? [];
}

export async function enrollUser(
  db: D1Database,
  classId: string,
  userId: string,
  nowSec: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO enrollments (class_id, user_id, created_at) VALUES (?, ?, ?)
       ON CONFLICT (class_id, user_id) DO NOTHING`,
    )
    .bind(classId, userId, nowSec)
    .run();
}

export async function isEnrolled(db: D1Database, classId: string, userId: string): Promise<boolean> {
  const row = await db
    .prepare("SELECT 1 AS x FROM enrollments WHERE class_id = ? AND user_id = ? LIMIT 1")
    .bind(classId, userId)
    .first<{ x: number }>();
  return row != null;
}

/** Öğrenci giriş bağlamı için kurum slug (eğitmen öğrenciye verir). */
export async function getInstitutionSlug(db: D1Database, institutionId: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT slug FROM institutions WHERE id = ? LIMIT 1")
    .bind(institutionId)
    .first<{ slug: string }>();
  return row?.slug ?? null;
}
