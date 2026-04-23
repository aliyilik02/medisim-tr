import { useEffect, useRef, useCallback } from "react";

interface UseMonitorSoundsParams {
  hr: number;
  spo2: number;
  enabled: boolean;
}

function playBeep(ctx: AudioContext, freq: number, durationSec: number) {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + durationSec);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + durationSec);
  } catch {
    // AudioContext might be closed or in unexpected state — ignore silently
  }
}

export function useMonitorSounds({ hr, spo2, enabled }: UseMonitorSoundsParams) {
  const ctxRef = useRef<AudioContext | null>(null);
  const beepTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alarmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (beepTimerRef.current) {
      clearTimeout(beepTimerRef.current);
      beepTimerRef.current = null;
    }
    if (alarmTimerRef.current) {
      clearInterval(alarmTimerRef.current);
      alarmTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      return;
    }

    // Lazy AudioContext creation — happens inside user gesture flow (toggle click)
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
    }
    const ctx = ctxRef.current;

    // Resume if suspended (autoplay policy) — silently retry on next document click
    ctx.resume().catch(() => {});
    const resumeOnce = () => ctx.resume().catch(() => {});
    document.addEventListener("click", resumeOnce, { once: true });

    // --- HR-sync beep ---
    const isCriticalHr = hr < 50 || hr > 140;
    const rrMs = Math.max(300, Math.min(3000, 60000 / Math.max(1, hr)));
    const beepFreq = isCriticalHr ? 660 : 880;

    const scheduleBeep = () => {
      if (!ctx || ctx.state !== "running") {
        beepTimerRef.current = setTimeout(scheduleBeep, rrMs);
        return;
      }
      playBeep(ctx, beepFreq, 0.05);
      beepTimerRef.current = setTimeout(scheduleBeep, rrMs);
    };
    scheduleBeep();

    // --- Critical alarm (SpO2 < 90 or HR out of range) ---
    const isCritical = spo2 < 90 || isCriticalHr;
    if (isCritical) {
      alarmTimerRef.current = setInterval(() => {
        if (ctx.state !== "running") return;
        playBeep(ctx, 480, 0.22);
        setTimeout(() => playBeep(ctx, 540, 0.22), 320);
      }, 1600);
    }

    return () => {
      document.removeEventListener("click", resumeOnce);
      clearTimers();
    };
  }, [enabled, hr, spo2, clearTimers]);

  // Close AudioContext on unmount
  useEffect(() => {
    return () => {
      ctxRef.current?.close();
      ctxRef.current = null;
    };
  }, []);
}
