const CLAUDE_API_URL = "https://api.anthropic.com/v1/messages";
export const API_KEY_STORAGE = "medisim_claude_api_key";

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

export async function callClaude(opts: {
  system: string;
  userMessage: string;
  maxTokens?: number;
}): Promise<string> {
  const key = getApiKey();
  if (!key) throw new Error("NO_KEY");

  const res = await fetch(CLAUDE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: "user", content: opts.userMessage }],
    }),
  });

  if (!res.ok) {
    const body: { error?: { message?: string } } = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message ?? `HTTP ${res.status}`);
  }

  const data: { content: Array<{ text: string }> } = await res.json();
  return data.content[0]?.text ?? "";
}

export function extractJSON<T>(text: string): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Yanıt formatı hatalı — JSON bulunamadı");
  return JSON.parse(match[0]) as T;
}

export function extractJSONArray<T>(text: string): T[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) throw new Error("Yanıt formatı hatalı — JSON dizisi bulunamadı");
  return JSON.parse(match[0]) as T[];
}
