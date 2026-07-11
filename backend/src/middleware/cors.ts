// ============================================================
// CORS — allowlist (Sprint B.0)
// ============================================================
// Sadece bilinen origin'lere izin. `*.pages.dev` Cloudflare Pages
// preview deploy'larına dinamik izin için pattern match.
// ============================================================

const ALLOWED_ORIGINS = [
  "https://medisim.tr",
  "https://www.medisim.tr",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

// Pages preview + lokal dev (Vite portu 5173 doluysa 5174/5175… seçer).
// localhost/127.0.0.1 origin'i yalnız kullanıcının kendi makinesinde oluşur →
// uzak saldırgan taklit edemez; oturum cookie'si kısa ömürlü + httpOnly.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.pages\.dev$/i,
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/127\.0\.0\.1:\d+$/i,
];

/** CSRF guard'ı da kullanır (index.ts) — origin allowlist tek kaynak. */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  return ALLOWED_ORIGIN_PATTERNS.some((re) => re.test(origin));
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("Origin");
  if (!origin || !isOriginAllowed(origin)) {
    return {
      Vary: "Origin",
    };
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    // Oturum cookie'si çapraz-origin gönderilebilsin (auth). Origin spesifik
    // olmalı (yukarıda allowlist'ten geliyor — '*' ile credentials çalışmaz).
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export function handlePreflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request),
  });
}

export function withCors(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  const cors = corsHeaders(request);
  for (const [k, v] of Object.entries(cors)) {
    headers.set(k, v);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
