// ============================================================
// Şifre hash — PBKDF2-SHA256 (Web Crypto, Workers + Node 20)
// ============================================================
// Format: pbkdf2$<iter>$<saltB64>$<hashB64>
// bcrypt/argon Workers'ta native yok → PBKDF2 yüksek iterasyon.
// ============================================================

const enc = new TextEncoder();
const ITER = 120_000;
const KEY_LEN = 32; // bytes

function b64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
function unb64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function derive(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const keyMat = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: iter, hash: "SHA-256" },
    keyMat,
    KEY_LEN * 8,
  );
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derive(password, salt, ITER);
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(hash)}`;
}

/** Sabit-zamanlı karşılaştırma (timing attack azaltma). */
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = parseInt(parts[1], 10);
  if (!Number.isFinite(iter) || iter < 1) return false;
  const salt = unb64(parts[2]);
  const expected = unb64(parts[3]);
  const actual = await derive(password, salt, iter);
  return constantTimeEqual(actual, expected);
}
