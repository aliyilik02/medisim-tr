// ============================================================
// JWT (HS256) — Web Crypto (Cloudflare Workers + Node 20 uyumlu)
// ============================================================
// Stateless oturum token'ı. Sır JWT_SECRET (Worker secret).
// Kısa ömür (varsayılan 8 saat); revocation gerekirse ileride sessions tablosu.
// ============================================================

export type Role = "admin" | "instructor" | "student";

export interface JwtPayload {
  sub: string; // user id
  role: Role;
  inst: string | null; // institution id
  iat: number;
  exp: number;
}

const enc = new TextEncoder();

function bytesToB64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToBytes(s: string): Uint8Array {
  const norm = s.replace(/-/g, "+").replace(/_/g, "/");
  const pad = norm.length % 4 ? 4 - (norm.length % 4) : 0;
  const bin = atob(norm + "=".repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

const HEADER_B64 = bytesToB64url(enc.encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));

/** Token üret. ttlSec varsayılan 8 saat. */
export async function signJwt(
  payload: Omit<JwtPayload, "iat" | "exp">,
  secret: string,
  ttlSec = 8 * 60 * 60,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<string> {
  const full: JwtPayload = { ...payload, iat: nowSec, exp: nowSec + ttlSec };
  const body = bytesToB64url(enc.encode(JSON.stringify(full)));
  const signingInput = `${HEADER_B64}.${body}`;
  const key = await hmacKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  return `${signingInput}.${bytesToB64url(new Uint8Array(sig))}`;
}

/** Token doğrula. Geçersiz imza / süre dolmuş / bozuk → null. */
export async function verifyJwt(
  token: string,
  secret: string,
  nowSec = Math.floor(Date.now() / 1000),
): Promise<JwtPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, b, s] = parts;
  const signingInput = `${h}.${b}`;
  const key = await hmacKey(secret);
  let valid: boolean;
  try {
    valid = await crypto.subtle.verify("HMAC", key, b64urlToBytes(s), enc.encode(signingInput));
  } catch {
    return null;
  }
  if (!valid) return null;
  let payload: JwtPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(b64urlToBytes(b))) as JwtPayload;
  } catch {
    return null;
  }
  if (typeof payload.exp !== "number" || payload.exp < nowSec) return null;
  return payload;
}
