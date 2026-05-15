import { useFrame } from "@react-three/fiber";
import type { RefObject } from "react";
import type { Group } from "three";

interface Props {
  chestRef: RefObject<Group>;
  abdomenRef?: RefObject<Group>;
  enabled: boolean;
  /** Solunum hızı (saniye başına döngü). ~0.25 = 15/dk dinlenme */
  rate?: number;
  /** Göğüs scale.y için maksimum sapma (oran). */
  chestAmplitude?: number;
  /** Karın amplitudü — gerçek nefeste göğüs > karın. */
  abdomenAmplitude?: number;
}

export function BreathingController({
  chestRef,
  abdomenRef,
  enabled,
  rate = 0.25,
  chestAmplitude = 0.035,
  abdomenAmplitude = 0.012,
}: Props) {
  useFrame((state) => {
    const chest = chestRef.current;
    const abdomen = abdomenRef?.current;
    if (!enabled) {
      chest?.scale.set(1, 1, 1);
      abdomen?.scale.set(1, 1, 1);
      return;
    }
    const t = state.clock.getElapsedTime();
    const phase = Math.sin(t * rate * Math.PI * 2);
    if (chest) {
      chest.scale.y = 1 + phase * chestAmplitude;
      chest.scale.z = 1 + phase * chestAmplitude * 0.6;
    }
    if (abdomen) {
      abdomen.scale.y = 1 + phase * abdomenAmplitude;
    }
  });

  return null;
}
