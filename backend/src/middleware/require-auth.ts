// ============================================================
// requireAuth — oturum cookie → JWT doğrula
// ============================================================

import { parseSessionToken } from "../auth/cookies";
import { verifyJwt, type JwtPayload, type Role } from "../auth/jwt";
import { findUserById } from "../db/users";
import type { Env, UserRow } from "../types";

/** Geçerli oturum varsa payload, yoksa null. */
export async function authenticate(request: Request, env: Env): Promise<JwtPayload | null> {
  const token = parseSessionToken(request);
  if (!token) return null;
  if (!env.JWT_SECRET) return null;
  return verifyJwt(token, env.JWT_SECRET);
}

export function unauthorizedResponse(): Response {
  return Response.json({ error: "unauthorized", detail: "Giriş gerekli" }, { status: 401 });
}

export function forbiddenResponse(): Response {
  return Response.json({ error: "forbidden", detail: "Yetki yok" }, { status: 403 });
}

export function consentRequiredResponse(): Response {
  return Response.json(
    { error: "consent_required", detail: "KVKK açık rıza gerekli" },
    { status: 403 },
  );
}

/**
 * Oturum + rol + KVKK rıza kapısı. Başarıda { payload, user } (DB'den taze),
 * başarısızsa hazır Response döner. İstemci ConsentGate'ine ek sunucu savunması:
 * consent_at NULL ise yazma/okuma reddedilir (rıza zorlaması istemciye bırakılmaz).
 * Çağıran: `const a = await authorize(req, env, [...]);
 *           if (a instanceof Response) return a;` → a.payload / a.user kullanılır.
 */
export async function authorize(
  request: Request,
  env: Env,
  roles: Role[],
): Promise<{ payload: JwtPayload; user: UserRow } | Response> {
  const payload = await authenticate(request, env);
  if (!payload) return unauthorizedResponse();
  if (!roles.includes(payload.role)) return forbiddenResponse();
  if (!env.DB) return Response.json({ error: "server_misconfigured", detail: "DB yok" }, { status: 500 });
  const user = await findUserById(env.DB, payload.sub);
  if (!user) return unauthorizedResponse();
  if (user.consent_at == null) return consentRequiredResponse();
  return { payload, user };
}
