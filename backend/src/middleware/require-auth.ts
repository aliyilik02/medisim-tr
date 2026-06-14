// ============================================================
// requireAuth — oturum cookie → JWT doğrula
// ============================================================

import { parseSessionToken } from "../auth/cookies";
import { verifyJwt, type JwtPayload } from "../auth/jwt";
import type { Env } from "../types";

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
