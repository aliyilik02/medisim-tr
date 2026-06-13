import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// PulseOxProcedure — parmak ucu pulse oksimetre klipsi (P0 ekipman)
// ============================================================
// Basit kıskaç: üst kanat + alt kanat (iki ince box, menteşede hafif
// açılı) + içte kırmızı LED nokta (emissive sphere). Tamamı R3F
// primitif. Animasyon: parmağın ~8 cm önünden parmak ucuna 0.9 sn
// ease-out lerp. Tamamlanınca persistent katmanda kalır; LED yanık
// durur (görsel "ölçüyor" ipucu). useFrame'de LED nabız pulsasyonu
// uniform değil, doğrudan material ref üzerinden — re-render yok.
// Şablon: OxygenMaskProcedure (mesh + useProcedureAnimation lerp).
// ============================================================

import type { Mesh, MeshStandardMaterial } from "three";

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 0.9;
const APPROACH_OFFSET_Z = 0.08;
const REST_OFFSET_Z = 0.008;

export function PulseOxProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const ledRef = useRef<Mesh>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
    }
    // LED nabız pulsasyonu — emissiveIntensity'i ref üzerinden mutasyon
    // (setState YOK). ~1 Hz sinüs, klips takıldıktan sonra sürer.
    if (ledRef.current) {
      const mat = ledRef.current.material as MeshStandardMaterial;
      const pulse = 0.6 + 0.4 * Math.sin(state.clock.getElapsedTime() * 6.0);
      mat.emissiveIntensity = pulse;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Üst kanat — parmak üstüne oturan gövde (sensör + ekran tarafı) */}
      <mesh position={[0, 0.009, 0]}>
        <boxGeometry args={[0.018, 0.01, 0.032]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.5} />
      </mesh>
      {/* Alt kanat — parmak altına oturan kısım (biraz daha ince) */}
      <mesh position={[0, -0.008, 0.002]} rotation={[0.12, 0, 0]}>
        <boxGeometry args={[0.018, 0.008, 0.03]} />
        <meshStandardMaterial color="#34393f" roughness={0.55} />
      </mesh>
      {/* Menteşe — arka uçta kısa silindir */}
      <mesh position={[0, 0, -0.015]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.02, 10]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.6} />
      </mesh>
      {/* Kırmızı LED — alt kanat içinde, parmak tabanına yönelik emissive nokta */}
      <mesh ref={ledRef} position={[0, -0.003, 0.006]}>
        <sphereGeometry args={[0.0025, 10, 8]} />
        <meshStandardMaterial
          color="#ff2a2a"
          emissive="#ff1010"
          emissiveIntensity={0.9}
          roughness={0.3}
        />
      </mesh>
      {/* Kablo çıkışı — arka uçtan inen kısa silindir (monitöre giden) */}
      <mesh position={[0, -0.006, -0.022]} rotation={[Math.PI / 2.5, 0, 0]}>
        <cylinderGeometry args={[0.0016, 0.0016, 0.04, 8]} />
        <meshStandardMaterial color="#1a1d21" roughness={0.5} />
      </mesh>
    </group>
  );
}
