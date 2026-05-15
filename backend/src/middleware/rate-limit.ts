// ============================================================
// Rate limit — IP başına 8 req/dakika (Sprint B.0)
// ============================================================
// Gemini Flash free tier RPM=10, güvenlik payı 2.
// CF KV namespace RATE_LIMIT, TTL 60s.
// Atomic increment yok — KV "eventually consistent", ufak race
// olabilir ama free tier korumasının pratik etkisi yeterli.
// ============================================================

import type { Env } from "../types";

const WINDOW_SEC = 60;
const MAX_REQUESTS = 8;

export interface RateLimitResult {
  allowed: boolean;
  count: number;
  remaining: number;
  retryAfterSec: number;
}

function getClientIp(request: Request): string {
  return (
    request.headers.get("CF-Connecting-IP") ??
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ??
    "unknown"
  );
}

export async function checkRateLimit(
  request: Request,
  env: Env,
): Promise<RateLimitResult> {
  const ip = getClientIp(request);
  const key = `rl:${ip}`;

  const current = await env.RATE_LIMIT.get(key);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= MAX_REQUESTS) {
    return {
      allowed: false,
      count,
      remaining: 0,
      retryAfterSec: WINDOW_SEC,
    };
  }

  const newCount = count + 1;
  // İlk istek için TTL set et; sonraki güncellemeler aynı TTL'i koruyamaz
  // ama window içinde sayaç artmaya devam eder (TTL expire olunca sıfırlanır).
  await env.RATE_LIMIT.put(key, String(newCount), {
    expirationTtl: WINDOW_SEC,
  });

  return {
    allowed: true,
    count: newCount,
    remaining: MAX_REQUESTS - newCount,
    retryAfterSec: 0,
  };
}

export function rateLimitResponse(result: RateLimitResult): Response {
  return Response.json(
    {
      error: "rate_limited",
      detail: `Dakikada en fazla ${MAX_REQUESTS} istek. ${result.retryAfterSec} sn sonra tekrar deneyin.`,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(MAX_REQUESTS),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}
