// ============================================================
// Auth handler'ları — login / me / logout / consent / register
// ============================================================
// KVKK: açık kayıt YOK. register sadece SIGNUP_INVITE_CODE ile (ilk
// eğitmen/admin bootstrap). Öğrenci hesabını eğitmen oluşturur (inc-2).
// Öğrenci girişi: kurum slug + handle + şifre (e-postasız, PII minimal).
// Eğitmen girişi: email + şifre.
// ============================================================

import { hashPassword, verifyPassword } from "../auth/password";
import { signJwt } from "../auth/jwt";
import { serializeSessionCookie, clearSessionCookie } from "../auth/cookies";
import { authenticate } from "../middleware/require-auth";
import { findUserByEmail, findUserByHandle, findUserById, insertUser, setConsent } from "../db/users";
import { toUserPublic, type Env, type Role } from "../types";

const SESSION_TTL_SEC = 8 * 60 * 60; // 8 saat

function bad(error: string, detail?: string, status = 400): Response {
  return Response.json({ error, detail }, { status });
}

async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const b = await request.json();
    return b && typeof b === "object" ? (b as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

function setCookie(res: Response, cookie: string): Response {
  const headers = new Headers(res.headers);
  headers.append("Set-Cookie", cookie);
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
}

// ── POST /api/auth/login ──
export async function handleLogin(request: Request, env: Env): Promise<Response> {
  if (!env.DB || !env.JWT_SECRET) return bad("server_misconfigured", "DB/JWT_SECRET yok", 500);
  const body = await readJson(request);
  if (!body) return bad("invalid_json");
  const password = typeof body.password === "string" ? body.password : "";
  if (password.length < 1) return bad("password_required");

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  // slug kayıtta lowercase saklanıyor → girişte de normalize et (#5).
  const institution = typeof body.institution === "string" ? body.institution.trim().toLowerCase() : "";
  // handle öğrenci girişinde case-insensitive (oluşturmada da lowercase saklanır).
  const handle = typeof body.handle === "string" ? body.handle.trim().toLowerCase() : "";

  const user = email
    ? await findUserByEmail(env.DB, email)
    : institution && handle
      ? await findUserByHandle(env.DB, institution, handle)
      : null;

  // Aynı hata mesajı (kullanıcı sayımı/enumerasyon önleme)
  const FAIL = bad("invalid_credentials", "Kimlik veya şifre hatalı", 401);
  if (!user) {
    // timing: yine de bir hash doğrula (sabit-zaman yaklaşımı)
    await verifyPassword(password, "pbkdf2$120000$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
    return FAIL;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return FAIL;

  const token = await signJwt({ sub: user.id, role: user.role, inst: user.institution_id }, env.JWT_SECRET, SESSION_TTL_SEC);
  const res = Response.json({ user: toUserPublic(user) });
  return setCookie(res, serializeSessionCookie(token, SESSION_TTL_SEC));
}

// ── GET /api/auth/me ──
export async function handleMe(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return bad("unauthorized", "Giriş gerekli", 401);
  const user = await findUserById(env.DB, payload.sub);
  if (!user) return bad("unauthorized", "Kullanıcı bulunamadı", 401);
  return Response.json({ user: toUserPublic(user) });
}

// ── POST /api/auth/logout ──
export function handleLogout(): Response {
  const res = Response.json({ ok: true });
  return setCookie(res, clearSessionCookie());
}

// ── POST /api/auth/consent (KVKK açık rıza) ──
export async function handleConsent(request: Request, env: Env): Promise<Response> {
  const payload = await authenticate(request, env);
  if (!payload) return bad("unauthorized", "Giriş gerekli", 401);
  await setConsent(env.DB, payload.sub, Math.floor(Date.now() / 1000));
  const user = await findUserById(env.DB, payload.sub);
  return Response.json({ user: user ? toUserPublic(user) : null });
}

// ── POST /api/auth/register (davet-kodlu, ilk eğitmen/admin bootstrap) ──
export async function handleRegister(request: Request, env: Env): Promise<Response> {
  if (!env.DB || !env.JWT_SECRET) return bad("server_misconfigured", "DB/JWT_SECRET yok", 500);
  if (!env.SIGNUP_INVITE_CODE) return bad("registration_closed", "Kayıt kapalı", 403);
  const body = await readJson(request);
  if (!body) return bad("invalid_json");

  if (body.invite_code !== env.SIGNUP_INVITE_CODE) return bad("invalid_invite", "Davet kodu hatalı", 403);

  const role = body.role === "admin" ? "admin" : ("instructor" as Role); // davetle sadece admin/instructor
  const handle = typeof body.handle === "string" ? body.handle.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const instSlug = typeof body.institution_slug === "string" ? body.institution_slug.trim().toLowerCase() : "";
  const instName = typeof body.institution_name === "string" ? body.institution_name.trim() : "";

  if (handle.length < 2) return bad("invalid_handle", "handle ≥2 karakter");
  if (!email) return bad("email_required", "Eğitmen/admin için e-posta gerekli");
  if (password.length < 8) return bad("weak_password", "Şifre ≥8 karakter");
  if (!instSlug) return bad("institution_required", "institution_slug gerekli");

  const now = Math.floor(Date.now() / 1000);

  // Kurum: varsa kullan, yoksa oluştur.
  let inst = await env.DB.prepare("SELECT id FROM institutions WHERE slug = ? LIMIT 1").bind(instSlug).first<{ id: string }>();
  if (!inst) {
    const instId = crypto.randomUUID();
    await env.DB.prepare("INSERT INTO institutions (id, name, slug, created_at) VALUES (?, ?, ?, ?)")
      .bind(instId, instName || instSlug, instSlug, now)
      .run();
    inst = { id: instId };
  }

  const passwordHash = await hashPassword(password);
  const userId = crypto.randomUUID();
  try {
    await insertUser(env.DB, {
      id: userId,
      institutionId: inst.id,
      role,
      handle,
      email,
      passwordHash,
      nowSec: now,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/UNIQUE/i.test(msg)) return bad("already_exists", "handle veya e-posta zaten kayıtlı", 409);
    console.error("[auth] register insertUser:", msg); // ham mesaj log'a, istemciye generic (#10)
    return bad("server_error", "Sunucu hatası", 500);
  }

  const token = await signJwt({ sub: userId, role, inst: inst.id }, env.JWT_SECRET, SESSION_TTL_SEC);
  const res = Response.json({
    user: { id: userId, role, handle, email, institution_id: inst.id, consent: false },
  });
  return setCookie(res, serializeSessionCookie(token, SESSION_TTL_SEC));
}
