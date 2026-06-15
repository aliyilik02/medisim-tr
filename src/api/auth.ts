// ============================================================
// Auth API client (Tier-2 inc-2) — Cloudflare Worker auth spine'a bağlanır
// ============================================================
// Backend imzaları (backend/src/handlers/auth.ts + index.ts):
//   POST /api/auth/login    { email, password }            → { user }  | 401 invalid_credentials
//   GET  /api/auth/me                                       → { user }  | 401 unauthorized
//   POST /api/auth/logout                                   → { ok }
//   POST /api/auth/consent  (auth gerekli, payload yok)     → { user }
//   POST /api/auth/register { invite_code, email, password,
//                             handle, institution_slug, institution_name? } → { user }
// Oturum: httpOnly cookie "medisim_session" (SameSite=None; Secure).
// → fetch'te credentials:'include' ZORUNLU (token JS'ten okunamaz, XSS güvenli).
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

function base(): string {
  if (!BACKEND_URL) {
    throw new Error(
      "VITE_BACKEND_URL ayarlanmamış. `.env.local` oluştur (bkz. `.env.example`).",
    );
  }
  return BACKEND_URL;
}

/** Backend toUserPublic() çıktısının birebir aynası (hash YOK). */
export interface UserPublic {
  id: string;
  role: "admin" | "instructor" | "student";
  handle: string;
  email: string | null;
  institution_id: string | null;
  consent: boolean;
}

export interface SignupParams {
  email: string;
  password: string;
  inviteCode: string;
  handle: string;
  institutionSlug: string;
  institutionName?: string;
}

interface ErrorBody {
  error?: string;
  detail?: string;
}

/** credentials:'include' + JSON header sabitleyen fetch sarmalayıcı. */
function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${base()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
}

/** Backend {error, detail} gövdesini okunur Türkçe mesaja çevirir. */
async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ErrorBody;
    return body.detail || body.error || `Sunucu hatası (${res.status})`;
  } catch {
    return `Sunucu hatası (${res.status})`;
  }
}

// ── GET /api/auth/me — 401 → null (oturum yok), diğer hata → throw ──
export async function getMe(): Promise<UserPublic | null> {
  const res = await authFetch("/api/auth/me", { method: "GET" });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { user: UserPublic };
  return data.user;
}

// ── POST /api/auth/login — başarıda user, hatada throw ──
export async function login(
  email: string,
  password: string,
): Promise<UserPublic> {
  const res = await authFetch("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { user: UserPublic };
  return data.user;
}

// ── POST /api/auth/logout — hata yutulur (her durumda yerel state temizlenir) ──
export async function logout(): Promise<void> {
  try {
    await authFetch("/api/auth/logout", { method: "POST" });
  } catch {
    /* network hatası olsa bile çağıran yerel oturumu kapatır */
  }
}

// ── POST /api/auth/consent — KVKK açık rıza; backend consent_at damgalar ──
// Backend payload beklemiyor; granular bayraklar ileri-uyumluluk için
// gönderilir (şu an yok sayılır), dönen user.consent=true olur.
export async function submitConsent(payload?: {
  dataProcessing: boolean;
  explicitConsent: boolean;
}): Promise<UserPublic | null> {
  const res = await authFetch("/api/auth/consent", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });
  if (res.status === 401) return null;
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { user: UserPublic | null };
  return data.user;
}

// ── POST /api/auth/register — davet-kodlu eğitmen/admin kaydı ──
export async function signup(params: SignupParams): Promise<UserPublic> {
  const res = await authFetch("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({
      invite_code: params.inviteCode,
      email: params.email,
      password: params.password,
      handle: params.handle,
      institution_slug: params.institutionSlug,
      institution_name: params.institutionName,
    }),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { user: UserPublic };
  return data.user;
}
