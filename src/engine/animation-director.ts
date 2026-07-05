// ============================================================
// Animation Director — hasta durumu → animasyon klip kararı (SAF motor)
// ============================================================
// vitalsToClip'in (src/clinical/clip-mapping.ts) motora evrimleşmiş hali:
// anlık eşleme yerine ZAMANLI, KATMANLI ve HİSTEREZİSLİ karar üretir.
//
// Katman modeli (öncelik artan sırada):
//   base   (0) — bilinç/idle taban duruşu
//   state  (1) — süreğen durum: solunum sıkıntısı, ağrı
//   event  (2) — anlık olay: prosedür > kusma > öksürük > konuşma
//   arrest (3) — faz sinyali breath_stopped → hareketsizlik (her şeyi bastırır)
//
// Histerezis iki mekanizmayla:
//   1. minHoldSec — karar en az bu kadar simüle-saniye tutulur; SADECE daha
//      yüksek öncelikli katman erken kesebilir.
//   2. Çift eşik — giriş/çıkış eşikleri ayrık (örn. breathless'a SpO2<88'de
//      girilir, SpO2≥90 VE RR<22 olana dek çıkılmaz) → eşik ±1 titremesi yok.
//
// Deterministik: aynı input → aynı output. Date.now/random YOK — zaman
// `nowSec` (simüle saniye) parametresiyle gelir; konuşma klip rotasyonu
// `speechCount` sayacıyla seçilir.
//
// EŞİK KAYNAĞI: vitalsToClip + vitalsToVisual presedanı (SpO2<88, RR≥30/24,
// ağrı≥7/4). Eşikler PRESENTATION içindir, klinik karar verisi DEĞİL — tunable.
// React import YOK (engine kuralı). Klip adları GLB NLA track adlarıyla
// birebir (AnimatedPatientModel PatientClip ile yapısal uyumlu).
// ============================================================

import type { PatientVitals, PhaseSignal } from "./types";

// ------------------------------------------------------------
// Tipler
// ------------------------------------------------------------

/** GLB içindeki oynatılabilir klipler — AnimatedPatientModel.PatientClip ile
    yapısal olarak aynı union (engine components'a bakamaz → burada tanımlı). */
export type DirectorClip =
  | "laying_idle"
  | "laying_breathless"
  | "idle"
  | "talk_gesture"
  | "talk_shrug"
  | "pain"
  | "moaning"
  | "vomiting"
  | "cough_mild"
  | "cough_severe"
  | "take_pill"
  | "use_inhaler";

/** Karar katmanı — öncelik sırası base < state < event < arrest. */
export type DirectorLayer = "base" | "state" | "event" | "arrest";

const LAYER_PRIORITY: Record<DirectorLayer, number> = {
  base: 0,
  state: 1,
  event: 2,
  arrest: 3,
};

/** Senaryo-tetikli anlık olay (simüle saniye damgalı). */
export type DirectorEventType = "cough" | "vomiting" | "take_pill" | "use_inhaler";

export interface DirectorEvent {
  type: DirectorEventType;
  /** Olayın tetiklendiği simüle saniye. */
  atSec: number;
}

/** Ek katman — taban klibin üstüne kısmi ağırlıkla harmanlanır (AnimationMixer
    additive/weight). Örn. ST elevasyonu sürerken pain klibi %35. */
export interface AnimationOverlay {
  clip: DirectorClip;
  /** 0-1 harman ağırlığı. */
  weight: number;
}

export interface AnimationDecision {
  clip: DirectorClip;
  /** Önceki klipten bu klibe geçiş süresi (sn). */
  crossfadeSec: number;
  /** Oynatma hızı çarpanı (1 = normal). */
  speed: number;
  loop: boolean;
  overlay?: AnimationOverlay;
  /** Kararı üreten katman (histerezis + debug). */
  layer: DirectorLayer;
  /** Kararın verildiği simüle saniye. */
  decidedAtSec: number;
  /** Bu saniyeye dek karar, daha yüksek öncelik gelmedikçe korunur. */
  holdUntilSec: number;
  /** Türkçe debug açıklaması. */
  reason: string;
}

export interface DirectorInput {
  vitals: PatientVitals;
  /** physiology.getActivePhaseSignal() çıktısı (faz yoksa null). */
  phaseSignal?: PhaseSignal | null;
  /** Hasta şu an konuşuyor mu (TTS/diyalog aktif). */
  isSpeaking?: boolean;
  /** Konuşma sayacı — talk_gesture/talk_shrug deterministik rotasyonu. */
  speechCount?: number;
  /** Son olaylar (öksürük tetiği vb.) — penceresi geçenler yok sayılır. */
  events?: DirectorEvent[];
  /** Simüle zaman (saniye). Date.now KULLANILMAZ. */
  nowSec: number;
  /** Önceki karar — histerezis/minHold için. */
  previous?: AnimationDecision | null;
  /** Minimum kalış süresi override (varsayılan DEFAULT_MIN_HOLD_SEC). */
  minHoldSec?: number;
  /** Varyantın sahip olduğu klipler — verilirse fallback zinciriyle düşülür. */
  availableClips?: DirectorClip[];
}

// ------------------------------------------------------------
// Sabitler (presentation tuning — klinik veri değil)
// ------------------------------------------------------------

export const DEFAULT_MIN_HOLD_SEC = 2.0;

/** Olay klibinin ekranda kapladığı pencere (sn) — pencere bitince katman düşer. */
const EVENT_DURATION_SEC: Record<DirectorEventType, number> = {
  cough: 2.5,
  vomiting: 3.5,
  take_pill: 3.0,
  use_inhaler: 3.0,
};

/** Aynı anda birden çok olay penceresi açıksa hangisi kazanır. */
const EVENT_PRIORITY: Record<DirectorEventType, number> = {
  take_pill: 3,
  use_inhaler: 3,
  vomiting: 2,
  cough: 1,
};

/** Katman bazlı crossfade — arrest yavaş çöküş, olay çabuk tepki. */
const CROSSFADE_SEC: Record<DirectorLayer, number> = {
  arrest: 0.8,
  event: 0.2,
  state: 0.45,
  base: 0.6,
};
const SPEECH_CROSSFADE_SEC = 0.25;
const SPEECH_HOLD_SEC = 0.6; // rotasyon için kısa kalış

/** Eşikler — vitalsToClip/vitalsToVisual presedanından (giriş) + çıkış marjı. */
const T = {
  spo2SevereEnter: 88, // vitalsToVisual/vitalsToClip presedanı: SpO2 < 88
  spo2Exit: 90, //        breathless'tan çıkış için SpO2 ≥ 90 (marj 2)
  rrSevereEnter: 30, //   vitalsToClip: RR ≥ 30 ağır
  rrMildEnter: 24, //     vitalsToClip: RR ≥ 24 hafif takipne
  rrExit: 22, //          breathless'tan çıkış için RR < 22 (marj 2)
  painSevereEnter: 7, //  vitalsToClip: ağrı ≥ 7 şiddetli
  painModerateEnter: 4, // vitalsToClip: ağrı ≥ 4 orta
  painExit: 3, //         moaning'den çıkış için ağrı < 3 (marj 1)
  gcsUnconscious: 8, //   GCS ≤ 8 bilinç kapalı (konuşma/prosedür bastırılır)
  coughSevereSpo2: 90, // vitalsToClip: öksürük şiddeti SpO2 < 90
  coughSevereRr: 28, //   vitalsToClip: öksürük şiddeti RR > 28
} as const;

/** İskemik ağrı overlay ağırlıkları — faz EKG paterni sürerken. */
const PAIN_OVERLAY_WEIGHT: Partial<Record<PhaseSignal["ekg"], number>> = {
  st_elevation: 0.35,
  st_elev_pvc: 0.45,
};

/** Varyant fallback zinciri — clip-mapping.CLIP_FALLBACKS aynası
    (engine components/clinical'a bakamaz; değişirse SENKRON tut). */
const CLIP_FALLBACKS: Record<DirectorClip, DirectorClip[]> = {
  laying_breathless: ["laying_breathless", "cough_severe", "cough_mild", "laying_idle"],
  moaning: ["moaning", "pain", "cough_severe", "laying_idle"],
  vomiting: ["vomiting", "cough_severe", "laying_idle"],
  cough_severe: ["cough_severe", "cough_mild", "laying_breathless", "laying_idle"],
  cough_mild: ["cough_mild", "cough_severe", "laying_idle"],
  talk_gesture: ["talk_gesture", "talk_shrug", "laying_idle"],
  talk_shrug: ["talk_shrug", "talk_gesture", "laying_idle"],
  take_pill: ["take_pill", "laying_idle"],
  use_inhaler: ["use_inhaler", "laying_idle"],
  pain: ["pain", "moaning", "laying_idle"],
  laying_idle: ["laying_idle"],
  idle: ["idle", "laying_idle"],
};

/** İdeal klibi varyantın kliplerine düşür (ilk uyan; hiçbiri yoksa idle). */
export function resolveDirectorClip(ideal: DirectorClip, available: DirectorClip[]): DirectorClip {
  const chain = CLIP_FALLBACKS[ideal] ?? [ideal];
  for (const c of chain) {
    if (available.includes(c)) return c;
  }
  return available.includes("laying_idle") ? "laying_idle" : (available[0] ?? ideal);
}

// ------------------------------------------------------------
// İç yardımcılar
// ------------------------------------------------------------

interface Candidate {
  clip: DirectorClip;
  layer: DirectorLayer;
  speed: number;
  loop: boolean;
  crossfadeSec: number;
  holdSec: number;
  reason: string;
}

/** Penceresi hâlâ açık en yüksek öncelikli olay (eşitlikte en yenisi). */
function activeEvent(events: DirectorEvent[] | undefined, nowSec: number): DirectorEvent | null {
  if (!events?.length) return null;
  let best: DirectorEvent | null = null;
  for (const ev of events) {
    if (nowSec < ev.atSec) continue; // gelecekteki olay sayılmaz
    if (nowSec >= ev.atSec + EVENT_DURATION_SEC[ev.type]) continue; // pencere kapandı
    if (
      !best ||
      EVENT_PRIORITY[ev.type] > EVENT_PRIORITY[best.type] ||
      (EVENT_PRIORITY[ev.type] === EVENT_PRIORITY[best.type] && ev.atSec > best.atSec)
    ) {
      best = ev;
    }
  }
  return best;
}

/** İskemik ağrı overlay'i — faz EKG'si ST paterniyken, arrest/recovery hariç. */
function computeOverlay(
  primary: DirectorClip,
  layer: DirectorLayer,
  phase: PhaseSignal | null,
): AnimationOverlay | undefined {
  if (!phase || phase.recovering) return undefined;
  if (layer === "arrest") return undefined; // arrest'te kıvranma yok
  if (primary === "moaning" || primary === "pain") return undefined; // ağrı zaten taban
  const weight = PAIN_OVERLAY_WEIGHT[phase.ekg];
  return weight === undefined ? undefined : { clip: "pain", weight };
}

/** Katmanlı aday seçimi — histerezis çıkış eşikleri önceki klibe bakar. */
function pickCandidate(input: DirectorInput, phase: PhaseSignal | null, minHold: number): Candidate {
  const v = input.vitals;
  const gcs = v.gcs ?? 15;
  const unconscious = gcs <= T.gcsUnconscious;
  const prevClip = input.previous?.clip ?? null;

  // ── 3. arrest — faz sinyali solunumu durdurdu → hareketsizlik ──
  if (phase?.visual?.breath_stopped === true) {
    return {
      clip: "laying_idle",
      layer: "arrest",
      speed: 0.15, // neredeyse donuk — arrest duruşu
      loop: true,
      crossfadeSec: CROSSFADE_SEC.arrest,
      holdSec: minHold,
      reason: "faz sinyali breath_stopped — arrest, hareketsiz",
    };
  }

  const severeResp = v.spo2 < T.spo2SevereEnter || v.rr >= T.rrSevereEnter;

  // ── 2. olay katmanı ──
  const ev = activeEvent(input.events, input.nowSec);
  if (ev) {
    const holdSec = ev.atSec + EVENT_DURATION_SEC[ev.type] - input.nowSec;
    if (ev.type === "take_pill" || ev.type === "use_inhaler") {
      if (!unconscious) {
        return {
          clip: ev.type,
          layer: "event",
          speed: 1,
          loop: false,
          crossfadeSec: CROSSFADE_SEC.event,
          holdSec,
          reason: `prosedür jesti: ${ev.type}`,
        };
      }
      // bilinç kapalı → prosedür jesti anlamsız, alt katmanlara düş
    } else if (ev.type === "vomiting") {
      return {
        clip: "vomiting",
        layer: "event",
        speed: 1,
        loop: false,
        crossfadeSec: CROSSFADE_SEC.event,
        holdSec,
        reason: "kusma olayı",
      };
    } else {
      // öksürük — şiddet vitale göre (SpO2 düşük → cough_severe eğilimi)
      const severe = v.spo2 < T.coughSevereSpo2 || v.rr > T.coughSevereRr;
      return {
        clip: severe ? "cough_severe" : "cough_mild",
        layer: "event",
        speed: 1,
        loop: false,
        crossfadeSec: CROSSFADE_SEC.event,
        holdSec,
        reason: severe
          ? `öksürük olayı — şiddetli (SpO2=${v.spo2}/RR=${v.rr})`
          : "öksürük olayı — hafif",
      };
    }
  }

  // ── 2b. konuşma (olay katmanı) — bilinç kapalı VEYA ağır solunum
  //        sıkıntısı bastırır (vitalsToClip presedanı: breathless > speaking) ──
  if (input.isSpeaking && !unconscious && !severeResp) {
    const clip: DirectorClip = (input.speechCount ?? 0) % 2 === 0 ? "talk_gesture" : "talk_shrug";
    return {
      clip,
      layer: "event",
      speed: 1,
      loop: true,
      crossfadeSec: SPEECH_CROSSFADE_SEC,
      holdSec: SPEECH_HOLD_SEC,
      reason: `konuşuyor (rotasyon #${input.speechCount ?? 0})`,
    };
  }

  // ── 1. süreğen durum — çift eşikli histerezis ──
  const pain = v.pain ?? 0;
  // çıkış eşiği: breathless'ta kal → SpO2 < 90 VEYA RR ≥ 22 sürdükçe
  const stayBreathless = prevClip === "laying_breathless" && (v.spo2 < T.spo2Exit || v.rr >= T.rrExit);
  // çıkış eşiği: moaning'de kal → ağrı ≥ 3 sürdükçe
  const stayMoaning = prevClip === "moaning" && pain >= T.painExit;

  if (severeResp) {
    return {
      clip: "laying_breathless",
      layer: "state",
      speed: 1.2, // ağır sıkıntı — hızlı zorlanmalı solunum
      loop: true,
      crossfadeSec: CROSSFADE_SEC.state,
      holdSec: minHold,
      reason: `ağır solunum sıkıntısı (SpO2=${v.spo2}<${T.spo2SevereEnter} veya RR=${v.rr}≥${T.rrSevereEnter})`,
    };
  }
  if (pain >= T.painSevereEnter) {
    return {
      clip: "moaning",
      layer: "state",
      speed: 1,
      loop: true,
      crossfadeSec: CROSSFADE_SEC.state,
      holdSec: minHold,
      reason: `şiddetli ağrı (${pain}≥${T.painSevereEnter})`,
    };
  }
  if (v.rr >= T.rrMildEnter || stayBreathless) {
    return {
      clip: "laying_breathless",
      layer: "state",
      speed: 1,
      loop: true,
      crossfadeSec: CROSSFADE_SEC.state,
      holdSec: minHold,
      reason: stayBreathless && v.rr < T.rrMildEnter
        ? `takipne çıkış eşiği sağlanmadı (SpO2=${v.spo2}<${T.spo2Exit} veya RR=${v.rr}≥${T.rrExit})`
        : `hafif takipne (RR=${v.rr}≥${T.rrMildEnter})`,
    };
  }
  if (pain >= T.painModerateEnter || stayMoaning) {
    return {
      clip: "moaning",
      layer: "state",
      speed: 0.85, // orta ağrı — daha sakin inleme
      loop: true,
      crossfadeSec: CROSSFADE_SEC.state,
      holdSec: minHold,
      reason: stayMoaning && pain < T.painModerateEnter
        ? `ağrı çıkış eşiği sağlanmadı (${pain}≥${T.painExit})`
        : `orta ağrı (${pain}≥${T.painModerateEnter})`,
    };
  }

  // ── 0. taban — bilinç durumuna göre idle ──
  return {
    clip: "laying_idle",
    layer: "base",
    speed: unconscious ? 0.4 : 1, // bilinç kapalı → yavaş, cılız hareket
    loop: true,
    crossfadeSec: CROSSFADE_SEC.base,
    holdSec: minHold,
    reason: unconscious ? `bilinç kapalı (GCS=${gcs}≤${T.gcsUnconscious}) — sakin yatış` : "sakin yatış",
  };
}

// ------------------------------------------------------------
// Ana API
// ------------------------------------------------------------

/**
 * Hasta durumundan animasyon kararı üret.
 *
 * Saf + deterministik: aynı input → aynı output. Çağıran (UI hook) her tick
 * `previous`'a son kararı ve `nowSec`'e simüle zamanı verir; motor histerezis
 * ve minimum kalış kurallarını uygular.
 */
export function decideAnimation(input: DirectorInput): AnimationDecision {
  const phase = input.phaseSignal ?? null;
  const prev = input.previous ?? null;
  const minHold = input.minHoldSec ?? DEFAULT_MIN_HOLD_SEC;

  const cand = pickCandidate(input, phase, minHold);

  // Varyant fallback — ideal klip yoksa en yakın klinik eşdeğere düş
  let clip = cand.clip;
  if (input.availableClips?.length) {
    clip = resolveDirectorClip(cand.clip, input.availableClips);
  }
  let overlay = computeOverlay(clip, cand.layer, phase);
  if (overlay && input.availableClips?.length && !input.availableClips.includes(overlay.clip)) {
    overlay = undefined; // overlay klibi varyantta yok → düşür
  }

  const decision: AnimationDecision = {
    clip,
    crossfadeSec: cand.crossfadeSec,
    speed: cand.speed,
    loop: cand.loop,
    overlay,
    layer: cand.layer,
    decidedAtSec: input.nowSec,
    holdUntilSec: input.nowSec + cand.holdSec,
    reason: cand.reason,
  };

  if (prev) {
    // Aynı klip → süreklilik: karar zamanı/hold korunur (crossfade tekrarı yok)
    if (decision.clip === prev.clip) {
      return {
        ...decision,
        crossfadeSec: prev.crossfadeSec,
        decidedAtSec: prev.decidedAtSec,
        holdUntilSec: prev.holdUntilSec,
      };
    }
    // minHold: süre dolmadıysa SADECE daha yüksek öncelik kesebilir
    const held = input.nowSec < prev.holdUntilSec;
    const interrupts = LAYER_PRIORITY[decision.layer] > LAYER_PRIORITY[prev.layer];
    if (held && !interrupts) {
      const heldOverlay =
        prev.layer === "arrest" ? undefined : computeOverlay(prev.clip, prev.layer, phase);
      return { ...prev, overlay: heldOverlay };
    }
  }

  return decision;
}

/** Test/debug açıklaması. */
export function describeAnimationDecision(d: AnimationDecision): string {
  const parts = [
    `${d.clip} [${d.layer}]`,
    `hız=${d.speed}`,
    d.loop ? "loop" : "tek",
    `xfade=${d.crossfadeSec}s`,
  ];
  if (d.overlay) parts.push(`overlay=${d.overlay.clip}@${d.overlay.weight}`);
  return `${parts.join(" · ")} ← ${d.reason}`;
}
