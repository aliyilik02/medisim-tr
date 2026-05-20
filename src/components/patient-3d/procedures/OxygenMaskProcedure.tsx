import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// OxygenMaskProcedure — yüz maskesi yerleştirme (Sprint B.2.2)
// ============================================================
// Yarı saydam mask shell (sphere segment) + üst/alt elastik bant
// (torus) + konnektör tüp parçası. Animasyon: yüzün önünden
// (~25 cm) yüze yapışma noktasına 1.0 sn ease-out lerp. Sonrasında
// overlay sabit kalır; parent setTimeout ile unmount eder.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.25;
const REST_OFFSET_Z = 0.04;

export function OxygenMaskProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {/* Mask shell — yarı saydam oval kabuk, yüze yapışan ön yüzü */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[0.055, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial
          color="#b8d8e3"
          transparent
          opacity={0.42}
          roughness={0.15}
          metalness={0.05}
        />
      </mesh>
      {/* İç çerçeve — daha koyu kenar */}
      <mesh>
        <torusGeometry args={[0.05, 0.004, 10, 32]} />
        <meshStandardMaterial color="#5c7882" roughness={0.4} />
      </mesh>
      {/* Üst elastik bant */}
      <mesh position={[0, 0.045, -0.03]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.04, 0.0025, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.7} />
      </mesh>
      {/* Alt elastik bant */}
      <mesh position={[0, -0.04, -0.03]} rotation={[-Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.04, 0.0025, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.7} />
      </mesh>
      {/* O2 konnektör tüp — alttan çıkan kısa silindir */}
      <mesh position={[0, -0.05, 0.015]} rotation={[Math.PI / 2.5, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 12]} />
        <meshStandardMaterial color="#3a5460" roughness={0.4} />
      </mesh>
    </group>
  );
}
