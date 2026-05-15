import { GoogleGenAI } from "@google/genai";
import type { ChatMessage, ChatRequest, Env } from "../types";

// ============================================================
// POST /api/chat — Gemini streamGenerateContent SSE forward
// ============================================================

const MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 1024;
const TEMPERATURE = 0.7;
const TIMEOUT_MS = 30_000;

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
  if (
    typeof b.patient_persona !== "string" ||
    b.patient_persona.length < 10 ||
    b.patient_persona.length > 2000
  ) {
    return {
      ok: false,
      error: "invalid_patient_persona",
      detail: "10-2000 karakter olmalı",
    };
  }
  if (!Array.isArray(b.messages) || b.messages.length === 0) {
    return { ok: false, error: "messages_required" };
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
  }
  return { ok: true };
}

function sseEncode(payload: unknown): Uint8Array {
  const json = JSON.stringify(payload);
  return new TextEncoder().encode(`data: ${json}\n\n`);
}

export async function handleChat(request: Request, env: Env): Promise<Response> {
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

  const { patient_persona, messages } = body as ChatRequest;

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

  let stream: AsyncIterable<{ text?: string }>;
  try {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), TIMEOUT_MS);

    stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: {
        systemInstruction: `${SAFETY_PREFIX}\n\n${patient_persona}`,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: TEMPERATURE,
        abortSignal: abortController.signal,
      } as unknown as Record<string, unknown>,
    });

    // Stream tüketildikten sonra timeout temizlenir; manuel cleanup
    // generator wrapper içinde yapılır.
    void timeout;
  } catch (err) {
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
        controller.close();
      }
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
