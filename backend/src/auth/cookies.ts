// ============================================================
// Oturum cookie — httpOnly + Secure + SameSite=None (çapraz-origin)
// ============================================================
// Frontend (medisim.tr / *.pages.dev / localhost:5173) ile Worker farklı
// origin → çapraz-site cookie için SameSite=None; Secure ŞART + CORS'ta
// Access-Control-Allow-Credentials: true (cors.ts) + fetch credentials:'include'.
// httpOnly → XSS token çalamaz (localStorage JWT yerine bilinçli tercih).
// ============================================================

export const SESSION_COOKIE = "medisim_session";

export function serializeSessionCookie(token: string, maxAgeSec: number): string {
  return [
    `${SESSION_COOKIE}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    `Max-Age=${maxAgeSec}`,
  ].join("; ");
}

export function clearSessionCookie(): string {
  return [
    `${SESSION_COOKIE}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=None",
    "Max-Age=0",
  ].join("; ");
}

/** İstek Cookie header'ından oturum token'ını çıkar (yoksa null). */
export function parseSessionToken(request: Request): string | null {
  const header = request.headers.get("Cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const name = part.slice(0, eq).trim();
    if (name === SESSION_COOKIE) {
      const val = part.slice(eq + 1).trim();
      return val.length ? val : null;
    }
  }
  return null;
}
