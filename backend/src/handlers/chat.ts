import { GoogleGenAI } from "@google/genai";
import { authenticate } from "../middleware/require-auth";
import { SCENARIO_PERSONAS } from "../generated/personas";
import type { ChatMessage, ChatRequest, Env } from "../types";

// ============================================================
// POST /api/chat — Gemini streamGenerateContent SSE forward
// ============================================================
// Güvenlik (11 Tem 2026 denetim paketi):
//   1. Oturum kapısı — anonim istek Gemini kotası yakamaz (401 →
//      frontend mock hastaya düşer, oyun kırılmaz).
//   2. patient_persona İSTEMCİDEN ALINMAZ (prompt injection) —
//      scenario_id ile üretilmiş katalogdan (generated/personas.ts,
//      kaynak: src/data/scenarios + personaBuilder) sunucuda seçilir.
//      İstemcinin gönderdiği persona alanı YOK SAYILIR (geriye uyum).
//   3. Mesaj sınırları — content ≤2000 kr, messages ≤40 (kota istismarı).
//   4. SSE cleanup — timeout her yolda temizlenir; istemci bağlantıyı
//      kesince upstream Gemini akışı abort edilir (boşa token yanmaz).
// ============================================================

const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE = 0.7;
const TIMEOUT_MS = 30_000;
const MAX_MESSAGES = 40;
const MAX_CONTENT_LEN = 2000;

const SAFETY_PREFIX = `Sen bir tıp eğitim simülasyonu içinde HASTA rolündesin. Gerçek tıbbi tavsiye verme, karakter dışına çıkma, kullanıcıya doktor gibi davranma. Türkçe konuş. Kısa, doğal hasta cevapları (1-3 cümle). Acı/anksiyete varsa duygusal tonu yansıt.`;

interface ValidationResult {
  ok: boolean;
  error?: string;
  detail?: string;
}

export function validateChatRequest(body: unknown): ValidationResult {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body", detail: "JSON gövde gerekli" };
  }
  const b = body as Partial<ChatRequest>;
  if (typeof b.scenario_id !== "string" || b.scenario_id.length === 0) {
    return { ok: false, error: "invalid_scenario_id" };
  }
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { ok: false, error: "messages_required" };
  }
  if (b.messages.length > MAX_MESSAGES) {
    return {
      ok: false,
      error: "too_many_messages",
      detail: `En fazla ${MAX_MESSAGES} mesaj (kota koruması)`,
    };
  }
  for (const m of b.messages) {
    if (
      !m ||
      typeof m !== "object" ||
      (m.role !== "user" && m.role !== "assistant") ||
      typeof m.content !== "string" ||
      m.content.length === 0
    ) {
      return { ok: false, error: "invalid_message_shape" };
    }
    if (m.content.length > MAX_CONTENT_LEN) {
      return {
        ok: false,
        error: "message_too_long",
        detail: `Mesaj başına en fazla ${MAX_CONTENT_LEN} karakter`,
      };
    }
  }
  return { ok: true };
}

function sseEncode(payload: unknown): Uint8Array {
  const json = JSON.stringify(payload);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
  // Oturum kapısı — sadece giriş yapmış kullanıcı Gemini kotası kullanabilir.
  // (Frontend 401'de mock hastaya düşer — DialogChat onError yolu.)
  const session = await authenticate(request, env);
  if (!session) {
    return Response.json(
      { error: "unauthorized", detail: "Giriş gerekli" },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "invalid_json", detail: "Geçerli JSON gövde gönderin" },
      { status: 400 },
    );
  }

  const validation = validateChatRequest(body);
  if (!validation.ok) {
    return Response.json(
      { error: validation.error, detail: validation.detail },
      { status: 400 },
    );
  }

  const { scenario_id, messages } = body as ChatRequest;

  // Persona SUNUCUDA seçilir — istemci gövdesindeki persona yok sayılır.
  const persona = SCENARIO_PERSONAS[scenario_id];
  if (!persona) {
    return Response.json(
      { error: "unknown_scenario", detail: "Tanımsız senaryo" },
      { status: 400 },
    );
  }

  if (!env.GEMINI_API_KEY) {
    return Response.json(
      { error: "server_misconfigured", detail: "GEMINI_API_KEY ayarlı değil" },
      { status: 500 },
    );
  }

  const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

  // Gemini contents: history (user/model alternating). assistant → model.
  const contents = messages.map((m: ChatMessage) => ({
    role: m.role === "user" ? "user" : "model",
    parts: [{ text: m.content }],
  }));

  const abortController = new AbortController();
  const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);

  let stream: AsyncIterable<{ text?: string }>;
  try {
    stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: `${SAFETY_PREFIX}\n\n${persona}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        abortSignal: abortController.signal,
      } as unknown as Record<string, unknown>,
    });
  } catch (err) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    const isRateLimit = /429|rate.?limit|quota/i.test(msg);
    return Response.json(
      { error: isRateLimit ? "upstream_rate_limit" : "upstream_error", detail: msg },
      {
        status: isRateLimit ? 429 : 502,
        headers: isRateLimit ? { "Retry-After": "60" } : undefined,
      },
    );
  }

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const text = chunk.text;
          if (text) {
            controller.enqueue(sseEncode({ text }));
          }
        }
        controller.enqueue(sseEncode({ done: true }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(sseEncode({ error: "stream_failed", detail: msg }));
      } finally {
        clearTimeout(timeout);
        try {
          controller.close();
        } catch {
          // istemci cancel ettiyse controller zaten kapalı olabilir
        }
      }
    },
    // İstemci bağlantıyı kesti (sekme kapandı / AbortController) →
    // upstream Gemini akışını da durdur: 30 sn'ye kadar boşa token yanmasın.
    cancel() {
      clearTimeout(timeout);
      abortController.abort();
    },
  });

  return new Response(readable, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
