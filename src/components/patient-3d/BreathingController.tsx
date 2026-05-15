import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

interface Props {
  targetRef: RefObject<Group>;
  enabled: boolean;
  /** Solunum hızı (saniye başına döngü). ~0.25 = 15/dk dinlenme */
  rate?: number;
  /** Scale.y için maksimum sapma (oran). 0.02 ≈ %2 */
  amplitude?: number;
}

export function BreathingController({
  targetRef,
  enabled,
  rate = 0.25,
  amplitude = 0.025,
}: Props) {
  useFrame((state) => {
    const group = targetRef.current;
    if (!group) return;
    if (!enabled) {
      group.scale.set(1, 1, 1);
      return;
    }
    const t = state.clock.getElapsedTime();
    const phase = Math.sin(t * rate * Math.PI * 2);
    const sy = 1 + phase * amplitude;
    const sz = 1 + phase * amplitude * 0.6;
    group.scale.set(1, sy, sz);
  });

  return null;
}
