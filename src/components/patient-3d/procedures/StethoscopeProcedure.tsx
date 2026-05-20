import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// StethoscopeProcedure — oskültasyon animasyonu (Sprint B.2.1)
// ============================================================
// Disk (chestpiece) + diafragma + kısa hortum parçası. Tamamı
// primitive geometri: bandwidth 0, lisans yok, ~200 triangle.
// Animasyon: havadan (~35 cm üst + 15 cm önde) target pozisyonuna
// 1.2 sn ease-out lerp. Tamamlanınca disk göğüse 2 cm önde sabit
// kalır — InspectionPanel feedback / ses cue tetiklenebilir.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.2;
const APPROACH_OFFSET_Y = 0.35;
const APPROACH_OFFSET_Z = 0.15;
const REST_OFFSET_Z = 0.02;

export function StethoscopeProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty + APPROACH_OFFSET_Y, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {/* Disk (chestpiece) — paslanmaz çelik */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.028, 0.028, 0.012, 24]} />
        <meshStandardMaterial color="#c4cdd4" metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Diafragma membran (önde) */}
      <mesh position={[0, 0, 0.007]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.025, 0.025, 0.002, 24]} />
        <meshStandardMaterial color="#1a1a1f" metalness={0.1} roughness={0.85} />
      </mesh>
      {/* Hortum çıkışı (kısa görsel ipucu) */}
      <mesh position={[0, 0.025, -0.006]}>
        <cylinderGeometry args={[0.005, 0.005, 0.05, 12]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.5} />
      </mesh>
    </group>
  );
}
