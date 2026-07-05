import { GoogleGenAI } from "@google/genai";
import type { Env } from "../types";

// ============================================================
// POST /api/tts — Gemini Flash TTS (OPSİYONEL, bayrak-korumalı)
// ============================================================
// MALİYET KORUMASI: GEMINI_TTS_ENABLED !== "1" ise 501 döner — frontend
// tarayıcı-içi speechSynthesis'e düşer (ücretsiz varsayılan, Ali Bey
// kararı 6 Tem 2026: "şimdilik ücretsiz"). Bayrak SADECE Gemini API
// anahtarının free-tier olduğu doğrulanınca açılır.
// Free tier sıkı limitli (RPM/RPD düşük) → 429'da frontend yine tarayıcı
// sesine düşer; sınıf kullanımı için değil, demo/kalite önizleme için.
//
// KVKK NOTU: bu yol hasta YANITI metnini (sentetik içerik — öğrenci PII
// değil) Google'a gönderir. Öğrenci mikrofonu Whisper ile TARAYICIDA kalır.
// ============================================================

const TTS_MODEL = "gemini-2.5-flash-preview-tts";
const MAX_TEXT_LEN = 300; // hasta yanıtları 1-3 cümle — uzun metin maliyet/limit koruması
const TIMEOUT_MS = 15_000;
const VOICE_NAME = "Kore"; // sakin/doğal prebuilt ses

interface TtsValidation {
  ok: boolean;
  error?: string;
  detail?: string;
}

export function validateTtsRequest(body: unknown): TtsValidation {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "invalid_body", detail: "JSON gövde gerekli" };
  }
  const text = (body as { text?: unknown }).text;
  if (typeof text !== "string" || text.trim().length === 0) {
    return { ok: false, error: "text_required" };
  }
  if (text.length > MAX_TEXT_LEN) {
    return {
      ok: false,
      error: "text_too_long",
      detail: `En fazla ${MAX_TEXT_LEN} karakter (maliyet koruması)`,
    };
  }
  return { ok: true };
}

function json(status: number, payload: unknown): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export async function handleTts(request: Request, env: Env): Promise<Response> {
  if (env.GEMINI_TTS_ENABLED !== "1") {
    // Varsayılan: kapalı → frontend tarayıcı TTS'ine düşer (ücretsiz yol).
    return json(501, { error: "tts_disabled" });
  }
  if (!env.GEMINI_API_KEY) {
    return json(500, { error: "server_misconfigured" });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json(400, { error: "invalid_body" });
  }
  const v = validateTtsRequest(body);
  if (!v.ok) return json(400, { error: v.error, detail: v.detail });

  const text = (body as { text: string }).text.trim();

  try {
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await ai.models.generateContent({
      model: TTS_MODEL,
      contents: [{ role: "user", parts: [{ text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE_NAME } },
        },
        abortSignal: controller.signal,
      },
    });
    clearTimeout(timer);

    const part = res.candidates?.[0]?.content?.parts?.find(
      (p) => (p as { inlineData?: { data?: string } }).inlineData?.data,
    ) as { inlineData?: { data?: string; mimeType?: string } } | undefined;
    const audio = part?.inlineData?.data;
    if (!audio) return json(502, { error: "tts_no_audio" });

    // Gemini TTS çıkışı: PCM s16le mono. Örnekleme hızı mimeType'tan
    // (audio/L16;rate=24000) — bulunamazsa 24000 varsayılan.
    const rateMatch = /rate=(\d+)/.exec(part?.inlineData?.mimeType ?? "");
    return json(200, {
      audio, // base64 PCM s16le
      sample_rate: rateMatch ? Number(rateMatch[1]) : 24000,
      voice: VOICE_NAME,
    });
  } catch (e) {
    // 429 (free-tier limit) dahil her hata → frontend tarayıcı sesine düşer.
    const msg = e instanceof Error ? e.message : "unknown";
    const status = /429|quota|RESOURCE_EXHAUSTED/i.test(msg) ? 429 : 502;
    return json(status, { error: "tts_failed", detail: msg.slice(0, 200) });
  }
}
