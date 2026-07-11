// ============================================================
// Sınıf / öğrenci handler'ları (Tier-2 inc-3)
// ============================================================
// Eğitmen: sınıf oluşturur (join_code üretilir), öğrenci hesabı açar
// (handle + şifre, e-postasız — KVKK PII minimal), sınıfa kaydeder,
// öğrenci ilerlemesini görür. Tüm uçlar instructor/admin rol-kapılı +
// sınıf sahipliği (instructor_id = JWT.sub) doğrulanır.
// ============================================================

import { authorize } from "../middleware/require-auth";
import { hashPassword } from "../auth/password";
import { insertUser } from "../db/users";
import {
  insertClass,
  listClassesByInstructor,
  getClassById,
  getClassRoster,
  enrollUser,
  joinCodeExists,
  getInstitutionSlug,
  type ClassRow,
} from "../db/classes";
import { listAttemptsByClass } from "../db/attempts";
import type { Env } from "../types";

function bad(error: string, detail?: string, status = 400): Response {
  return Response.json({ error, detail }, { status });
}

/** 500'lerde ham DB mesajını istemciye sızdırma (#10) — sadece log + generic. */
function serverError(context: string, e: unknown): Response {
  console.error(`[classes] ${context}:`, e instanceof Error ? e.message : String(e));
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

// join_code alfabesi — kafa karıştıran karakterler yok (0/O/1/I/L çıkarıldı).
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomJoinCode(len = 6): string {
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < len; i++) out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return out;
}

/** Çakışmayan join_code üret (birkaç deneme). */
async function uniqueJoinCode(db: D1Database): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const code = randomJoinCode();
    if (!(await joinCodeExists(db, code))) return code;
  }
  // 8 denemede çakışma olasılığı ~sıfır; yine de uzunluğu artır.
  return randomJoinCode(8);
}

function publicClass(c: ClassRow, studentCount: number) {
  return {
    id: c.id,
    name: c.name,
    join_code: c.join_code,
    created_at: c.created_at,
    student_count: studentCount,
  };
}

// ── POST /api/classes — sınıf oluştur (eğitmen) ──
export async function handleCreateClass(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return bad("server_misconfigured", "DB yok", 500);
  const auth = await authorize(request, env, ["instructor", "admin"]);
  if (auth instanceof Response) return auth;
  const { payload } = auth;
  if (!payload.inst) return bad("no_institution", "Eğitmen bir kuruma bağlı değil", 400);

  const body = await readJson(request);
  if (!body) return bad("invalid_json");
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (name.length < 2) return bad("invalid_name", "Sınıf adı ≥2 karakter");

  const now = Math.floor(Date.now() / 1000);
  const id = crypto.randomUUID();

  // join_code üretip yaz; UNIQUE yarışında birkaç kez yeniden dene (#6).
  for (let attempt = 0; attempt < 3; attempt++) {
    const joinCode = await uniqueJoinCode(env.DB);
    try {
      await insertClass(env.DB, {
        id,
        institutionId: payload.inst,
        instructorId: payload.sub,
        name,
        joinCode,
        nowSec: now,
      });
      return Response.json({
        class: { id, name, join_code: joinCode, created_at: now, student_count: 0 },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/UNIQUE/i.test(msg) && attempt < 2) continue; // join_code çakıştı → yeni kod
      return serverError("insertClass", e);
    }
  }
  return Response.json({ error: "join_code_exhausted", detail: "Kod üretilemedi, tekrar deneyin" }, { status: 503 });
}

// ── GET /api/classes — eğitmenin kendi sınıfları ──
export async function handleListClasses(request: Request, env: Env): Promise<Response> {
  if (!env.DB) return bad("server_misconfigured", "DB yok", 500);
  const auth = await authorize(request, env, ["instructor", "admin"]);
  if (auth instanceof Response) return auth;
  const classes = await listClassesByInstructor(env.DB, auth.payload.sub);
  return Response.json({
    classes: classes.map((c) => publicClass(c, c.student_count)),
  });
}

/**
 * Sahiplik doğrula: sınıf var + instructor_id = JWT.sub.
 * admin yalnızca KENDİ kurumundaki sınıflara erişir (#4 — kurum sınırı;
 * global süper-admin gerekirse ayrı rol tanımlanmalı).
 */
async function ownedClassOr404(
  db: D1Database,
  classId: string,
  payload: { sub: string; role: string; inst: string | null },
): Promise<ClassRow | Response> {
  const cls = await getClassById(db, classId);
  if (!cls) return bad("not_found", "Sınıf bulunamadı", 404);
  if (payload.role === "admin") {
    if (cls.institution_id !== payload.inst) return bad("forbidden", "Bu sınıfa erişim yok", 403);
  } else if (cls.instructor_id !== payload.sub) {
    return bad("forbidden", "Bu sınıfa erişim yok", 403);
  }
  return cls;
}

// ── GET /api/classes/:id — sınıf detayı: öğrenciler + denemeler ──
export async function handleGetClass(request: Request, env: Env, classId: string): Promise<Response> {
  if (!env.DB) return bad("server_misconfigured", "DB yok", 500);
  const auth = await authorize(request, env, ["instructor", "admin"]);
  if (auth instanceof Response) return auth;

  const cls = await ownedClassOr404(env.DB, classId, auth.payload);
  if (cls instanceof Response) return cls;

  const [roster, attempts, slug] = await Promise.all([
    getClassRoster(env.DB, classId),
    listAttemptsByClass(env.DB, classId),
    getInstitutionSlug(env.DB, cls.institution_id),
  ]);

  return Response.json({
    class: publicClass(cls, roster.length),
    institution_slug: slug,
    roster,
    attempts,
  });
}

// ── POST /api/classes/:id/students — öğrenci hesabı aç + kaydet (eğitmen) ──
export async function handleCreateStudent(
  request: Request,
  env: Env,
  classId: string,
): Promise<Response> {
  if (!env.DB) return bad("server_misconfigured", "DB yok", 500);
  const auth = await authorize(request, env, ["instructor", "admin"]);
  if (auth instanceof Response) return auth;

  const cls = await ownedClassOr404(env.DB, classId, auth.payload);
  if (cls instanceof Response) return cls;

  const body = await readJson(request);
  if (!body) return bad("invalid_json");
  // handle lowercase saklanır → öğrenci girişi büyük/küçük harf duyarlı olmaz.
  const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (handle.length < 2) return bad("invalid_handle", "handle ≥2 karakter");
  // ≥8: brute-force denetim bulgusu (11 Tem) — 6 karakter + sınırsız deneme kırılabilirdi
  if (password.length < 8) return bad("weak_password", "Şifre ≥8 karakter");

  const now = Math.floor(Date.now() / 1000);
  const userId = crypto.randomUUID();
  const passwordHash = await hashPassword(password);

  try {
    await insertUser(env.DB, {
      id: userId,
      institutionId: cls.institution_id, // öğrenci eğitmenin kurumunda
      role: "student",
      handle,
      email: null, // KVKK: öğrenci e-postasız
      passwordHash,
      nowSec: now,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE/i.test(msg)) return bad("already_exists", "Bu handle kurumda zaten kayıtlı", 409);
    return serverError("insertUser", e);
  }

  await enrollUser(env.DB, classId, userId, now);
  const slug = await getInstitutionSlug(env.DB, cls.institution_id);

  return Response.json({
    student: { id: userId, handle, institution_slug: slug },
  });
}
