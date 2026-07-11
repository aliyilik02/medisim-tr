// ============================================================
// Gemini Backend SSE Client — Sprint B.2 production
// ============================================================
// Backend endpoint: POST /api/chat (Cloudflare Worker)
// Request:  { scenario_id, patient_persona, messages: ChatMessage[] }
// Response: SSE stream — data: {"text": "..."} chunks + data: {"done":true} | {"error":"...","detail":"..."}
//
// Backend: backend/src/handlers/chat.ts (Gemini 2.5 Flash, 1024 max tok, temp 0.7).
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface StreamChatRequest {
  scenario_id: string;
  patient_persona: string;
  messages: ChatMessage[];
}

export interface StreamChatCallbacks {
  /** Her yeni text chunk geldiğinde çağrılır (cumulative değil, delta). */
  onText: (delta: string) => void;
  /** Stream başarıyla tamamlandı. */
  onDone: () => void;
  /** Backend veya stream hatası. */
  onError: (error: string, detail?: string) => void;
}

/**
 * Backend /api/chat endpoint'ine SSE stream çağrı.
 * AbortController desteklenir — caller cancel edebilir.
 */
export async function streamChat(
  req: StreamChatRequest,
  callbacks: StreamChatCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  if (!BACKEND_URL) {
    callbacks.onError("backend_not_configured", "VITE_BACKEND_URL ayarlı değil — .env.local oluştur");
    return;
  }

  let response: Response;
  try {
    response = await fetch(`${BACKEND_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Oturum cookie'si (11 Tem): /api/chat artik auth kapili — cookie
      // gitmezse her istek 401 → kalici mock'a duserdi.
      credentials: "include",
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError("network_error", msg);
    return;
  }

  // 4xx/5xx → JSON error response (backend SSE'den önce abort eder)
  if (!response.ok) {
    try {
      const errBody = (await response.json()) as { error?: string; detail?: string };
      callbacks.onError(errBody.error ?? "http_error", errBody.detail ?? `HTTP ${response.status}`);
    } catch {
      callbacks.onError("http_error", `HTTP ${response.status}`);
    }
    return;
  }

  if (!response.body) {
    callbacks.onError("no_body", "Response body stream gelmedi");
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      // SSE format: "data: {...}\n\n" (event-stream blocks ayrılmış)
      const blocks = buffer.split("\n\n");
      buffer = blocks.pop() ?? "";

      for (const block of blocks) {
        const line = block.trim();
        if (!line.startsWith("data:")) continue;
        const payload = line.slice(5).trim();
        if (!payload) continue;

        let data: { text?: string; done?: boolean; error?: string; detail?: string };
        try {
          data = JSON.parse(payload);
        } catch {
          continue; // bozuk chunk, atla
        }

        if (data.error) {
          callbacks.onError(data.error, data.detail);
          return;
        }
        if (data.text) {
          callbacks.onText(data.text);
        }
        if (data.done) {
          callbacks.onDone();
          return;
        }
      }
    }
    // Stream bitti ama done sinyali gelmediyse implicit done
    callbacks.onDone();
  } catch (err) {
    if (signal?.aborted) return; // intentional cancel
    const msg = err instanceof Error ? err.message : String(err);
    callbacks.onError("stream_error", msg);
  }
}

/** Backend mevcut mu kontrolü — health endpoint hızlı ping. */
export async function pingBackend(): Promise<boolean> {
  if (!BACKEND_URL) return false;
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return res.ok;
  } catch {
    return false;
  }
}
