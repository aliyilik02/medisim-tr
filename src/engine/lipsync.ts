// ============================================================
// Lipsync Motoru — Türkçe metin → zaman damgalı viseme timeline
// ============================================================
// SAF motor modülü: React import YOK, Date.now/Math.random YOK.
// Çıktı hedef-BAĞIMSIZ soyut viseme'dir; UI katmanı modelin
// yeteneğine göre eşler:
//   - ARKit 52 morph varsa  → visemeToArkit (patient-mimikli.glb)
//   - Sadece kemik varsa    → visemeToJawAmplitude (mixamorig:Head
//     mikro-nod veya tek jawOpen morph fallback)
//
// TR ses bilgisi gerekçesi (grafem-fonem ~1:1 olduğundan harf
// sınıfı → viseme sınıfı doğrudan eşlenir):
//   acik          a            → çene açık, dudak nötr
//   on-duz        e            → orta açıklık, dudak hafif gergin (ön düz orta ünlü)
//   dar-duz       ı i (y)      → dar açıklık, dudak düz/gergin (kapalı düz ünlüler;
//                                 ı arka / i ön olsa da GÖRSEL olarak ayırt edilemez)
//   orta-yuvarlak o ö          → orta açıklık + dudak huni (yuvarlak orta ünlüler;
//                                 arka/ön ayrımı görsel değil, yuvarlaklık görseldir)
//   dar-yuvarlak  u ü          → dar açıklık + dudak büzük (kapalı yuvarlak ünlüler)
//   dudak-kapali  m b p        → çift dudak kapanması (bilabial) — lipsync'in en
//                                 belirgin görsel işareti
//   dis-dudak     f v (w)      → alt dudak üst dişe değer (labiodental)
//   dar-aralik    c ç d j l n r s ş t z (x)
//                              → diş/dişeti bölgesi, dişler neredeyse kapalı,
//                                 dudak nötr-hafif gergin (görsel olarak tek küme)
//   gevsek        g k h (q) + rakamlar → art damak/gırtlak; dudak görünümü nötr,
//                                 çene hafif açık
//   sil           boşluk + noktalama → duraklama (ağız kapanır)
//
// Özel kural — ğ (yumuşak g): Türkçede önceki ünlüyü uzatır;
// önceki olay ünlü ise onun viseme'ini devralır (uzatma), değilse gevsek.
// ============================================================

export type Viseme =
  | "sil"
  | "acik"
  | "on-duz"
  | "dar-duz"
  | "orta-yuvarlak"
  | "dar-yuvarlak"
  | "dudak-kapali"
  | "dis-dudak"
  | "dar-aralik"
  | "gevsek";

export interface VisemeEvent {
  viseme: Viseme;
  /** Olay başlangıcı (ms, timeline-göreli). */
  startMs: number;
  durationMs: number;
}

export interface VisemeTimeline {
  events: VisemeEvent[];
  totalMs: number;
}

export interface BuildVisemeTimelineOptions {
  /** Konuşulan karakter başına süre (ms). Varsayılan 70 (~14 karakter/sn, doğal TR tempo). */
  msPerChar?: number;
  /** Cümle-sonu noktalama duraklaması (ms). Boşluk bunun yarısı kadar durur. Varsayılan 160. */
  pauseMs?: number;
}

export interface VisemeFrame {
  primary: Viseme;
  /** 0..1 — primary katkısı. primaryWeight + secondaryWeight = 1. */
  primaryWeight: number;
  /** Koartikülasyon karışımındaki komşu viseme. */
  secondary: Viseme;
  secondaryWeight: number;
}

// ------------------------------------------------------------
// Harf sınıflandırma
// ------------------------------------------------------------

/** TR-özel büyük→küçük eşleme; locale API'sine güvenmeden deterministik. */
const TR_UPPER_TO_LOWER: Record<string, string> = {
  I: "ı",
  İ: "i",
  Ç: "ç",
  Ğ: "ğ",
  Ö: "ö",
  Ş: "ş",
  Ü: "ü",
};

function toTrLower(ch: string): string {
  const special = TR_UPPER_TO_LOWER[ch];
  if (special !== undefined) return special;
  return ch.toLowerCase();
}

const VOWEL_VISEMES: ReadonlySet<Viseme> = new Set<Viseme>([
  "acik",
  "on-duz",
  "dar-duz",
  "orta-yuvarlak",
  "dar-yuvarlak",
]);

const CHAR_TO_VISEME: Record<string, Viseme> = {
  a: "acik",
  e: "on-duz",
  ı: "dar-duz",
  i: "dar-duz",
  y: "dar-duz",
  o: "orta-yuvarlak",
  ö: "orta-yuvarlak",
  u: "dar-yuvarlak",
  ü: "dar-yuvarlak",
  m: "dudak-kapali",
  b: "dudak-kapali",
  p: "dudak-kapali",
  f: "dis-dudak",
  v: "dis-dudak",
  w: "dis-dudak",
  c: "dar-aralik",
  ç: "dar-aralik",
  d: "dar-aralik",
  j: "dar-aralik",
  l: "dar-aralik",
  n: "dar-aralik",
  r: "dar-aralik",
  s: "dar-aralik",
  ş: "dar-aralik",
  t: "dar-aralik",
  z: "dar-aralik",
  x: "dar-aralik",
  g: "gevsek",
  k: "gevsek",
  h: "gevsek",
  q: "gevsek",
};

const PAUSE_PUNCTUATION = new Set([".", ",", "!", "?", ";", ":", "…", "—"]);

/**
 * Tek karakteri viseme sınıfına çevirir (bağlam-bağımsız).
 * ğ burada "gevsek" döner; ünlü-uzatma kuralı buildVisemeTimeline içinde
 * bağlamla uygulanır. Bilinmeyen karakter null (timeline'da atlanır).
 */
export function classifyChar(ch: string): Viseme | null {
  const lower = toTrLower(ch);
  if (lower === " " || lower === "\t" || lower === "\n" || lower === "\r") return "sil";
  if (PAUSE_PUNCTUATION.has(lower)) return "sil";
  const direct = CHAR_TO_VISEME[lower];
  if (direct !== undefined) return direct;
  if (lower === "ğ") return "gevsek";
  if (lower >= "0" && lower <= "9") return "gevsek";
  return null;
}

// ------------------------------------------------------------
// Timeline üretimi
// ------------------------------------------------------------

const DEFAULT_MS_PER_CHAR = 70;
const DEFAULT_PAUSE_MS = 160;

/**
 * Türkçe metinden deterministik viseme timeline üretir.
 * - Boşluk → pauseMs/2 duraklama, cümle noktalaması → pauseMs duraklama.
 * - Ardışık aynı viseme olayları birleştirilir (süre toplanır) — "anne"
 *   gibi çift ünsüzlerde tek akıcı olay.
 * - ğ önceki ünlüyü uzatır (viseme devralma).
 */
export function buildVisemeTimeline(
  text: string,
  opts?: BuildVisemeTimelineOptions,
): VisemeTimeline {
  const msPerChar = Math.max(1, opts?.msPerChar ?? DEFAULT_MS_PER_CHAR);
  const pauseMs = Math.max(0, opts?.pauseMs ?? DEFAULT_PAUSE_MS);

  const events: VisemeEvent[] = [];
  let cursorMs = 0;

  const push = (viseme: Viseme, durationMs: number): void => {
    if (durationMs <= 0) return;
    const last = events[events.length - 1];
    if (last !== undefined && last.viseme === viseme) {
      last.durationMs += durationMs;
    } else {
      events.push({ viseme, startMs: cursorMs, durationMs });
    }
    cursorMs += durationMs;
  };

  for (const ch of text) {
    const lower = toTrLower(ch);

    if (lower === " " || lower === "\t" || lower === "\n" || lower === "\r") {
      push("sil", Math.round(pauseMs / 2));
      continue;
    }
    if (PAUSE_PUNCTUATION.has(lower)) {
      push("sil", pauseMs);
      continue;
    }

    let viseme = classifyChar(lower);
    if (viseme === null) continue; // bilinmeyen karakter: ses üretmez

    if (lower === "ğ") {
      const last = events[events.length - 1];
      if (last !== undefined && VOWEL_VISEMES.has(last.viseme)) {
        viseme = last.viseme; // ünlü uzatma — push() birleştirir
      }
    }

    push(viseme, msPerChar);
  }

  return { events, totalMs: cursorMs };
}

// ------------------------------------------------------------
// Örnekleme (koartikülasyon karışımı)
// ------------------------------------------------------------

const SIL_FRAME: VisemeFrame = {
  primary: "sil",
  primaryWeight: 1,
  secondary: "sil",
  secondaryWeight: 0,
};

/** Geçiş penceresi: olay başında önceki viseme'den yumuşak crossfade. */
const MAX_BLEND_MS = 50;

/**
 * Timeline'ı tMs anında örnekler. Sınırlar güvenli:
 * t<0 → ilk kare, t>=totalMs → sil (ağız kapalı).
 * Olay başındaki blend penceresinde önceki viseme ile karışım döner;
 * son olayın sonunda sil'e doğru söner (ağız asla "takılı" kalmaz).
 */
export function sampleViseme(timeline: VisemeTimeline, tMs: number): VisemeFrame {
  const { events, totalMs } = timeline;
  if (events.length === 0 || totalMs <= 0) return SIL_FRAME;
  if (tMs >= totalMs) return SIL_FRAME;
  const t = tMs < 0 ? 0 : tMs;

  // Aktif olayı bul (olaylar sıralı ve bitişik).
  let idx = 0;
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (t >= ev.startMs && t < ev.startMs + ev.durationMs) {
      idx = i;
      break;
    }
    if (i === events.length - 1) idx = i;
  }

  const ev = events[idx];
  const blendMs = Math.min(MAX_BLEND_MS, ev.durationMs * 0.4);
  const local = t - ev.startMs;

  // Olay başı: önceki viseme'den crossfade.
  if (blendMs > 0 && local < blendMs && idx > 0) {
    const alpha = local / blendMs;
    return {
      primary: ev.viseme,
      primaryWeight: alpha,
      secondary: events[idx - 1].viseme,
      secondaryWeight: 1 - alpha,
    };
  }

  // Son olayın kuyruğu: sil'e sönüş.
  if (idx === events.length - 1 && blendMs > 0) {
    const remaining = ev.startMs + ev.durationMs - t;
    if (remaining < blendMs) {
      const alpha = remaining / blendMs;
      return {
        primary: ev.viseme,
        primaryWeight: alpha,
        secondary: "sil",
        secondaryWeight: 1 - alpha,
      };
    }
  }

  return {
    primary: ev.viseme,
    primaryWeight: 1,
    secondary: ev.viseme,
    secondaryWeight: 0,
  };
}

// ------------------------------------------------------------
// Hedefe eşleme — ARKit blendshape
// ------------------------------------------------------------

/** Viseme başına ARKit blendshape hedef ağırlıkları (0..1). */
const VISEME_ARKIT: Record<Viseme, Record<string, number>> = {
  sil: {},
  acik: { jawOpen: 0.7 },
  "on-duz": { jawOpen: 0.35, mouthStretchLeft: 0.4, mouthStretchRight: 0.4 },
  "dar-duz": { jawOpen: 0.15, mouthStretchLeft: 0.25, mouthStretchRight: 0.25 },
  "orta-yuvarlak": { jawOpen: 0.4, mouthFunnel: 0.6 },
  "dar-yuvarlak": { jawOpen: 0.15, mouthPucker: 0.7 },
  "dudak-kapali": { mouthClose: 0.8, mouthPressLeft: 0.5, mouthPressRight: 0.5 },
  "dis-dudak": { jawOpen: 0.1, mouthPressLeft: 0.4, mouthPressRight: 0.4, mouthRollLower: 0.5 },
  "dar-aralik": { jawOpen: 0.12, mouthStretchLeft: 0.2, mouthStretchRight: 0.2 },
  gevsek: { jawOpen: 0.25 },
};

/** Motorun üretebileceği tüm ARKit blendshape anahtarları (UI ön-tahsis için). */
export const LIPSYNC_ARKIT_KEYS: readonly string[] = [
  "jawOpen",
  "mouthFunnel",
  "mouthPucker",
  "mouthClose",
  "mouthStretchLeft",
  "mouthStretchRight",
  "mouthPressLeft",
  "mouthPressRight",
  "mouthRollLower",
];

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/**
 * Frame'i ARKit blendshape ağırlıklarına çevirir (patient-mimikli tipi
 * ARKit 52 morph hedefi). Tüm LIPSYNC_ARKIT_KEYS anahtarları her zaman
 * döner (kullanılmayanlar 0) — UI'da morph sıfırlama derdi kalmaz.
 */
export function visemeToArkit(frame: VisemeFrame): Record<string, number> {
  const out: Record<string, number> = {};
  for (const key of LIPSYNC_ARKIT_KEYS) out[key] = 0;

  const primaryMap = VISEME_ARKIT[frame.primary];
  const secondaryMap = VISEME_ARKIT[frame.secondary];
  const pw = clamp01(frame.primaryWeight);
  const sw = clamp01(frame.secondaryWeight);

  for (const [key, value] of Object.entries(primaryMap)) {
    out[key] += value * pw;
  }
  for (const [key, value] of Object.entries(secondaryMap)) {
    out[key] += value * sw;
  }
  for (const key of Object.keys(out)) out[key] = clamp01(out[key]);
  return out;
}

// ------------------------------------------------------------
// Hedefe eşleme — tek kanal çene fallback
// ------------------------------------------------------------

/** Viseme başına çene açıklık skaları (0..1) — tek kanal fallback. */
const VISEME_JAW: Record<Viseme, number> = {
  sil: 0,
  acik: 1,
  "on-duz": 0.5,
  "dar-duz": 0.2,
  "orta-yuvarlak": 0.6,
  "dar-yuvarlak": 0.25,
  "dudak-kapali": 0.05,
  "dis-dudak": 0.1,
  "dar-aralik": 0.15,
  gevsek: 0.35,
};

/**
 * 0..1 tek kanal çene amplitüdü. Mixamo rig (morph yok) için
 * mixamorig:Head mikro-rotasyonuna ya da tek jawOpen morph'una sürülür.
 */
export function visemeToJawAmplitude(frame: VisemeFrame): number {
  return clamp01(
    VISEME_JAW[frame.primary] * clamp01(frame.primaryWeight) +
      VISEME_JAW[frame.secondary] * clamp01(frame.secondaryWeight),
  );
}
