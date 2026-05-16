import { useRef } from "react";
import { useFrame } from "@react-three/fiber";

// ============================================================
// useProcedureAnimation — tek-vuruşluk prosedür animasyon hook'u
// ============================================================
// Mevcut breathing shader paterniyle tutarlı: saf useFrame + math.
// react-spring veya framer-motion-3d eklenmedi (bundle koruması).
// Component her mount'ta fresh — useRef startTime null'dan başlar.
// Unmount → animasyon iptal. Done → onComplete bir kez tetiklenir.
// Progress useRef üzerinden expose edilir (re-render etmez,
// useFrame içinde okunmalı).
// ============================================================

export interface ProcedureAnimationState {
  /** easeOutCubic uygulanmış progress (0-1). Mesh transform için. */
  progress: number;
  /** Lineer ham progress (0-1). Faz testi / log için. */
  rawProgress: number;
  /** Tamamlandı mı. */
  done: boolean;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function useProcedureAnimation(
  durationSec: number,
  onComplete?: () => void,
) {
  const stateRef = useRef<ProcedureAnimationState>({
    progress: 0,
    rawProgress: 0,
    done: false,
  });
  const startTimeRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  useFrame((state) => {
    if (completedRef.current) return;
    if (startTimeRef.current === null) {
      startTimeRef.current = state.clock.getElapsedTime();
    }
    const elapsed = state.clock.getElapsedTime() - startTimeRef.current;
    const raw = Math.min(elapsed / durationSec, 1);
    stateRef.current.rawProgress = raw;
    stateRef.current.progress = easeOutCubic(raw);
    if (raw >= 1 && !completedRef.current) {
      completedRef.current = true;
      stateRef.current.done = true;
      onComplete?.();
    }
  });

  return stateRef;
}
