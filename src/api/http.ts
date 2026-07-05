// ============================================================
// Backend HTTP yardımcıları (Tier-2 inc-3) — paylaşılan
// ============================================================
// credentials:'include' (httpOnly cookie medisim_session) + JSON header +
// Türkçe hata okuma. classes/attempts client'ları bunu kullanır.
// (auth.ts kendi kopyasını taşıyor — geriye dönük dokunulmadı.)
// ============================================================

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string | undefined;

export function backendBase(): string {
  if (!BACKEND_URL) {
    throw new Error("VITE_BACKEND_URL ayarlanmamış. `.env.local` oluştur (bkz. `.env.example`).");
  }
  return BACKEND_URL;
}

/** credentials:'include' + JSON header sabitleyen fetch sarmalayıcı.
    Ağ-katmanı hatası ("Failed to fetch" — backend kapalı/ulaşılamaz) ham
    İngilizce mesajla UI'a sızıyordu (UI turu bulgusu, 5 Tem) → Türkçe
    yönlendirici mesaja çevrilir. */
export async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${backendBase()}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
      },
    });
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        "Sunucuya ulaşılamıyor — backend çalışmıyor olabilir. (Geliştirmede: `cd backend && npm run dev`)"
      );
    }
    throw e;
  }
}

interface ErrorBody {
  error?: string;
  detail?: string;
}

/** Backend {error, detail} gövdesini okunur Türkçe mesaja çevirir. */
export async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as ErrorBody;
    return body.detail || body.error || `Sunucu hatası (${res.status})`;
  } catch {
    return `Sunucu hatası (${res.status})`;
  }
}
