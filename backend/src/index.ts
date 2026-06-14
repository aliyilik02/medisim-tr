// ============================================================
// MediSim TR Backend — Cloudflare Worker entry (Sprint B.0)
// ============================================================
// Routes:
//   GET  /api/health → JSON shape, rate limit yok
//   POST /api/chat   → SSE forward Gemini streamGenerateContent
// Tüm response'larda CORS header. OPTIONS preflight handled.
// ============================================================

import { handleChat } from "./handlers/chat";
import { handleLogin, handleMe, handleLogout, handleConsent, handleRegister } from "./handlers/auth";
import { corsHeaders, handlePreflight, withCors } from "./middleware/cors";
import { checkRateLimit, rateLimitResponse } from "./middleware/rate-limit";
import type { Env } from "./types";

const VERSION = "0.1.0";
const MODEL = "gemini-2.5-flash";

function healthResponse(): Response {
  return Response.json({
    status: "ok",
    model: MODEL,
    version: VERSION,
  });
}

function notFoundResponse(): Response {
  return Response.json(
    { error: "not_found", detail: "Endpoint tanımlı değil" },
    { status: 404 },
  );
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return handlePreflight(request);
    }

    // Health (rate-limit'siz)
    if (url.pathname === "/api/health" && request.method === "GET") {
      return withCors(healthResponse(), request);
    }

    // ── Auth (Tier-2) — JSON, cookie tabanlı oturum ──
    if (url.pathname === "/api/auth/login" && request.method === "POST") {
      return withCors(await handleLogin(request, env), request);
    }
    if (url.pathname === "/api/auth/me" && request.method === "GET") {
      return withCors(await handleMe(request, env), request);
    }
    if (url.pathname === "/api/auth/logout" && request.method === "POST") {
      return withCors(handleLogout(), request);
    }
    if (url.pathname === "/api/auth/consent" && request.method === "POST") {
      return withCors(await handleConsent(request, env), request);
    }
    if (url.pathname === "/api/auth/register" && request.method === "POST") {
      return withCors(await handleRegister(request, env), request);
    }

    // Chat
    if (url.pathname === "/api/chat" && request.method === "POST") {
      // KV binding eksikse local dev'de undefined olabilir; o durumda
      // rate-limit'i atla ama log düş.
      if (env.RATE_LIMIT) {
        const rl = await checkRateLimit(request, env);
        if (!rl.allowed) {
          return withCors(rateLimitResponse(rl), request);
        }
      } else {
        console.warn("[rate-limit] RATE_LIMIT KV binding yok — atlanıyor");
      }

      const response = await handleChat(request, env);
      // SSE response body stream — corsHeaders'ı manuel append et
      // (withCors body stream'i kopyalayabiliyor; bu durumda re-emit
      // edilen Response stream başlatma noktasını koruyor).
      const headers = new Headers(response.headers);
      for (const [k, v] of Object.entries(corsHeaders(request))) {
        headers.set(k, v);
      }
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
      });
    }

    return withCors(notFoundResponse(), request);
  },
} satisfies ExportedHandler<Env>;
