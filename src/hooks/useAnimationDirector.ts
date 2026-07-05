// ============================================================
// useAnimationDirector — animasyon yönetmeni motorunun React bağı
// ============================================================
// engine/animation-director (saf, deterministik) her tick'te çağrılır;
// hook zaman/previous/speechCount/event defterini tutar. vitalsToClip'in
// anlık eşlemesinin yerine geçer: histerezis + minHold + katman önceliği
// motorda — UI sadece girdileri aynalar.
//
// Zaman: performance.now tabanlı gerçek saniye (deterioration tick'i de
// gerçek zamanda akar — simüle/gerçek 1:1). Motor Date.now KULLANMAZ;
// nowSec buradan parametreyle gider (engine saflığı korunur).
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import {
  decideAnimation,
  DEFAULT_MIN_HOLD_SEC,
  type AnimationDecision,
  type DirectorClip,
  type DirectorEvent,
  type DirectorEventType,
  type PatientVitals,
  type PhaseSignal,
} from "@/engine";

/** Karar görsel çıktıyı değiştiriyor mu? (reason/decidedAt değişimi render
    gerektirmez — 4Hz tick'te gereksiz re-render önlenir.) */
export function decisionVisuallyChanged(
  a: AnimationDecision | null,
  b: AnimationDecision,
): boolean {
  if (!a) return true;
  return (
    a.clip !== b.clip ||
    a.speed !== b.speed ||
    a.loop !== b.loop ||
    a.crossfadeSec !== b.crossfadeSec ||
    (a.overlay?.clip ?? null) !== (b.overlay?.clip ?? null) ||
    (a.overlay?.weight ?? 0) !== (b.overlay?.weight ?? 0)
  );
}

/** Penceresi kesin kapanmış olayları at (defter büyümesin). */
export function pruneEvents(events: DirectorEvent[], nowSec: number, maxAgeSec = 10): DirectorEvent[] {
  return events.filter((e) => nowSec - e.atSec < maxAgeSec);
}

export interface UseAnimationDirectorOpts {
  vitals: PatientVitals;
  /** runner.phaseSignal — faz-senkron arrest/overlay için. */
  phaseSignal?: PhaseSignal | null;
  /** Hasta konuşuyor mu (TTS aktif). */
  speaking?: boolean;
  /** Varyantın klipleri — motor fallback zinciriyle düşer. */
  availableClips?: DirectorClip[];
  /** Karar tazeleme aralığı ms (varsayılan 250 — insan gözü için yeterli). */
  tickMs?: number;
  minHoldSec?: number;
}

export interface AnimationDirectorApi {
  decision: AnimationDecision;
  /** Senaryo-tetikli anlık olay bildir (öksürük/kusma/hap/inhaler). */
  pushEvent: (type: DirectorEventType) => void;
}

const INITIAL_DECISION: AnimationDecision = {
  clip: "laying_idle",
  crossfadeSec: 0.6,
  speed: 1,
  loop: true,
  layer: "base",
  decidedAtSec: 0,
  holdUntilSec: 0,
  reason: "başlangıç",
};

export function useAnimationDirector(opts: UseAnimationDirectorOpts): AnimationDirectorApi {
  const { tickMs = 250 } = opts;

  // Girdiler ref'te — interval closure'ı hep taze okur, interval yeniden kurulmaz.
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const t0Ref = useRef<number | null>(null);
  const prevRef = useRef<AnimationDecision | null>(null);
  const eventsRef = useRef<DirectorEvent[]>([]);
  const speechCountRef = useRef(0);
  const wasSpeakingRef = useRef(false);

  const [decision, setDecision] = useState<AnimationDecision>(INITIAL_DECISION);

  // Konuşma yükselen kenarı → rotasyon sayacı (talk_gesture/talk_shrug).
  if (opts.speaking && !wasSpeakingRef.current) speechCountRef.current += 1;
  wasSpeakingRef.current = !!opts.speaking;

  useEffect(() => {
    const recompute = () => {
      const o = optsRef.current;
      if (t0Ref.current === null) t0Ref.current = performance.now();
      const nowSec = (performance.now() - t0Ref.current) / 1000;
      eventsRef.current = pruneEvents(eventsRef.current, nowSec);
      const next = decideAnimation({
        vitals: o.vitals,
        phaseSignal: o.phaseSignal,
        isSpeaking: o.speaking,
        speechCount: speechCountRef.current,
        events: eventsRef.current,
        nowSec,
        previous: prevRef.current,
        minHoldSec: o.minHoldSec ?? DEFAULT_MIN_HOLD_SEC,
        availableClips: o.availableClips,
      });
      const changed = decisionVisuallyChanged(prevRef.current, next);
      prevRef.current = next;
      if (changed) setDecision(next);
    };
    recompute();
    const id = setInterval(recompute, tickMs);
    return () => clearInterval(id);
  }, [tickMs]);

  const pushEvent = useMemo(
    () => (type: DirectorEventType) => {
      if (t0Ref.current === null) t0Ref.current = performance.now();
      const nowSec = (performance.now() - t0Ref.current) / 1000;
      eventsRef.current = [...pruneEvents(eventsRef.current, nowSec), { type, atSec: nowSec }];
    },
    [],
  );

  return { decision, pushEvent };
}
