// ============================================================
// MediSim TR Backend — paylaşılan tipler
// ============================================================

export interface Env {
  GEMINI_API_KEY: string;
  RATE_LIMIT: KVNamespace;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  scenario_id: string;
  patient_persona: string;
  messages: ChatMessage[];
}

export interface ChatError {
  error: string;
  detail?: string;
}
