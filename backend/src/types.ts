// ============================================================
// MediSim TR Backend — paylaşılan tipler
// ============================================================

import type { Role } from "./auth/jwt";

export interface Env {
  GEMINI_API_KEY: string;
  /** "1" → /api/tts Gemini Flash TTS aktif (varsayılan kapalı — ücretsiz tarayıcı sesi). */
  GEMINI_TTS_ENABLED?: string;
  RATE_LIMIT: KVNamespace;
  // Tier-2 auth/persistence:
  DB: D1Database;
  JWT_SECRET: string;
  // Açık kayıt yasak (KVKK) — ilk eğitmen/admin bu kodla oluşturulur.
  SIGNUP_INVITE_CODE?: string;
}

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export interface ChatRequest {
  scenario_id: string;
  /** GERİYE UYUM: eski istemciler gönderir ama sunucu YOK SAYAR — persona
   *  scenario_id ile generated/personas.ts kataloğundan seçilir (injection kapalı). */
  patient_persona?: string;
  messages: ChatMessage[];
}

export interface ChatError {
  error: string;
  detail?: string;
}

// ── Auth / kullanıcı (KVKK: pseudonim, PII minimal) ──
export type { Role };

export interface UserRow {
  id: string;
  institution_id: string | null;
  role: Role;
  handle: string;
  email: string | null;
  password_hash: string;
  consent_at: number | null;
  status: "active" | "disabled";
  created_at: number;
}

/** Frontend'e dönen güvenli kullanıcı görünümü (hash YOK). */
export interface UserPublic {
  id: string;
  role: Role;
  handle: string;
  email: string | null;
  institution_id: string | null;
  consent: boolean;
}

export function toUserPublic(u: UserRow): UserPublic {
  return {
    id: u.id,
    role: u.role,
    handle: u.handle,
    email: u.email,
    institution_id: u.institution_id,
    consent: u.consent_at != null,
  };
}
