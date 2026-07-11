// ============================================================
// MediSim TR Backend — Cloudflare Worker entry (Sprint B.0)
// ============================================================
// Routes:
//   GET  /api/health → JSON shape, rate limit yok
//   POST /api/chat   → SSE forward Gemini streamGenerateContent
// Tüm response'larda CORS header. OPTIONS preflight handled.
//
// Güvenlik katmanları (11 Tem 2026 denetim paketi):
//   1. Global try/catch — D1/handler hatası 1101 yerine CORS'lu 500 JSON.
//   2. CSRF guard — POST'larda Origin allowlist + Content-Type: application/json
//      (SameSite=None cookie'ye karşı; CORS yanıt-okumayı engeller, isteğin
//      İŞLENMESİNİ engellemez — bu guard onu kapatır).
//   3. Auth rate limit — login/register brute-force + davet kodu denemesi
//      (rl:auth:<ip>, 5/dk; chat'in 8/dk sayacından ayrı kapsam).
// ============================================================

import { handleChat } from "./handlers/chat";
import { handleTts } from "./handlers/tts";
import { handleLogin, handleMe, handleLogout, handleConsent, handleRegister } from "./handlers/auth";
import {
  handleCreateClass,
  handleListClasses,
  handleGetClass,
  handleCreateStudent,
} from "./handlers/classes";
import { handleCreateAttempt, handleListAttempts } from "./handlers/attempts";
import { corsHeaders, handlePreflight, withCors, isOriginAllowed } from "./middleware/cors";
import { checkRateLimit, rateLimitResponse } from "./middleware/rate-limit";
import type { Env } from "./types";

const VERSION = "0.1.0";
const MODEL = "gemini-2.5-flash";

const AUTH_RL_MAX = 5; // login/register: 5 deneme/dk (şifre + davet kodu brute-force)

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

// ── CSRF guard (POST) ────────────────────────────────────────
// Tarayıcı çapraz-site isteklerinde Origin HER ZAMAN gönderilir →
// Origin var ama allowlist dışıysa reddet. Origin'siz istek (curl,
// test, sunucu-arası) tarayıcı CSRF vektörü değildir — geçer.
// Content-Type şartı <form enctype="text/plain"> hilesini kapatır.
function csrfReject(request: Request): Response | null {
  const origin = request.headers.get("Origin");
  if (origin && !isOriginAllowed(origin)) {
    return Response.json(
      { error: "forbidden_origin", detail: "İzinsiz kaynak" },
      { status: 403 },
    );
  }
  const ct = request.headers.get("Content-Type") ?? "";
  if (!ct.toLowerCase().includes("application/json")) {
    return Response.json(
      { error: "invalid_content_type", detail: "Content-Type: application/json gerekli" },
      { status: 415 },
    );
  }
  return null;
}

// KV binding eksikse local dev'de undefined olabilir; o durumda
// rate-limit'i atla ama log düş.
async function rateLimited(
  request: Request,
  env: Env,
  scope?: string,
  max?: number,
): Promise<Response | null> {
  if (!env.RATE_LIMIT) {
    console.warn("[rate-limit] RATE_LIMIT KV binding yok — atlanıyor");
    return null;
  }
  const rl = await checkRateLimit(request, env, scope ? { scope, max } : undefined);
  return rl.allowed ? null : rateLimitResponse(rl, max);
}

async function route(request: Request, env: Env, url: URL): Promise<Response> {
  // Health (rate-limit'siz)
  if (url.pathname === "/api/health" && request.method === "GET") {
    return withCors(healthResponse(), request);
  }

  // Tüm POST'lara merkezi CSRF guard'ı (Origin + Content-Type)
  if (request.method === "POST") {
    const rejected = csrfReject(request);
    if (rejected) return withCors(rejected, request);
  }

  // ── Auth (Tier-2) — JSON, cookie tabanlı oturum ──
  if (url.pathname === "/api/auth/login" && request.method === "POST") {
    const rl = await rateLimited(request, env, "auth", AUTH_RL_MAX);
    if (rl) return withCors(rl, request);
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
    const rl = await rateLimited(request, env, "auth", AUTH_RL_MAX);
    if (rl) return withCors(rl, request);
    return withCors(await handleRegister(request, env), request);
  }

  // ── Sınıf / öğrenci (Tier-2 inc-3) — eğitmen rol-kapılı ──
  if (url.pathname === "/api/classes" && request.method === "POST") {
    return withCors(await handleCreateClass(request, env), request);
  }
  if (url.pathname === "/api/classes" && request.method === "GET") {
    return withCors(await handleListClasses(request, env), request);
  }
  // /api/classes/:id  ve  /api/classes/:id/students
  {
    const m = url.pathname.match(/^\/api\/classes\/([A-Za-z0-9-]+)(\/students)?$/);
    if (m) {
      const classId = m[1];
      const isStudents = m[2] === "/students";
      if (isStudents && request.method === "POST") {
        return withCors(await handleCreateStudent(request, env, classId), request);
      }
      if (!isStudents && request.method === "GET") {
        return withCors(await handleGetClass(request, env, classId), request);
      }
    }
  }

  // ── Seans denemeleri (Tier-2 inc-3) ──
  if (url.pathname === "/api/attempts" && request.method === "POST") {
    return withCors(await handleCreateAttempt(request, env), request);
  }
  if (url.pathname === "/api/attempts" && request.method === "GET") {
    return withCors(await handleListAttempts(request, env), request);
  }

  // Chat
  if (url.pathname === "/api/chat" && request.method === "POST") {
    const rl = await rateLimited(request, env);
    if (rl) return withCors(rl, request);

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

  // TTS — opsiyonel Gemini Flash TTS (bayrak-korumalı; kapalıysa 501 →
  // frontend tarayıcı speechSynthesis'e düşer). Chat rate-limit'ini paylaşır.
  if (url.pathname === "/api/tts" && request.method === "POST") {
    const rl = await rateLimited(request, env);
    if (rl) return withCors(rl, request);
    return withCors(await handleTts(request, env), request);
  }

  return withCors(notFoundResponse(), request);
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Preflight
    if (request.method === "OPTIONS") {
      return handlePreflight(request);
    }

    // Global hata siperi: D1/handler istisnası → 1101 + CORS'suz yanıt yerine
    // CORS'lu, generic Türkçe 500 (ham hata sadece log'a — #10 deseni).
    try {
      return await route(request, env, url);
    } catch (e) {
      console.error(
        `[worker] unhandled ${request.method} ${url.pathname}:`,
        e instanceof Error ? e.message : String(e),
      );
      return withCors(
        Response.json({ error: "server_error", detail: "Sunucu hatası" }, { status: 500 }),
        request,
      );
    }
  },
} satisfies ExportedHandler<Env>;
