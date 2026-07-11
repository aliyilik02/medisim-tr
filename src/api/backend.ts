// ============================================================
// Backend transport layer (Sprint B.0)
// ============================================================
// Frontend → Cloudflare Worker proxy → Google Gemini. API key
// Worker secret'inde; frontend hiç görmez.
// ============================================================

export interface BackendChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ChatParams {
  scenario_id: string;
  patient_persona: string;
  messages: BackendChatMessage[];
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function backendUrl(): string {
  if (!BACKEND_URL) {
    throw new Error(
      "VITE_BACKEND_URL ayarlanmamış. `.env.local` veya `.env.example` bak.",
    );
  }
  return BACKEND_URL;
}

/**
 * /api/chat POST. SSE body stream döner — caller `data: {...}\n\n` chunk'larını
 * decode etmekle yükümlü.
 */
export async function streamChat(params: ChatParams): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${backendUrl()}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // /api/chat auth kapili (11 Tem)
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    let detail = "";
    try {
      const errBody = (await res.json()) as { error?: string; detail?: string };
      detail = errBody.detail ?? errBody.error ?? "";
    } catch {
      /* JSON parse fail — boş detail */
    }
    throw new Error(`Backend ${res.status}${detail ? `: ${detail}` : ""}`);
  }
  if (!res.body) {
    throw new Error("Backend boş body döndü");
  }
  return res.body;
}

/**
 * /api/health GET. Backend ayakta mı kontrol et — config eksikse veya
 * network başarısızsa false.
 */
export async function checkBackendHealth(): Promise<boolean> {
  if (!BACKEND_URL) return false;
  try {
    const res = await fetch(`${BACKEND_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
