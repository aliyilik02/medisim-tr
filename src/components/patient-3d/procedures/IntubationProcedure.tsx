import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// IntubationProcedure — endotrakeal entübasyon (P1)
// ============================================================
// Laringoskop (kavisli Macintosh bleyd + sap + ışık) + endotrakeal tüp
// (ETT, ince saydam silindir + pilot balon + konnektör). Tamamı R3F
// primitif (GLB yok). Animasyon: ağzın ~22 cm önünden ağız hattına
// 1.3 sn ease-out lerp + yerleşirken hafif aşağı-ileri eğim (bleyd dil
// tabanını kaldırma hissi). Tüp tabanda ağıza doğru ilerler.
//
// PERSISTENT DEĞİL — anlık eylem (yerleştirme manevrasını gösterir;
// kalıcı "takılı ekipman" katmanına taşınmaz). Şablon: StethoscopeProcedure.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.3;
const APPROACH_OFFSET_Y = 0.10; // hafif yukarıdan yaklaşır (operatör açısı)
const APPROACH_OFFSET_Z = 0.22;
const REST_OFFSET_Z = 0.03;

export function IntubationProcedure({ targetPosition, onComplete }: Props) {
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
    const p = animRef.current.progress;
    groupRef.current.position.lerpVectors(startPos, endPos, p);
    // Yerleşirken laringoskop sapını hafif geriye eğ (dil kaldırma manevrası).
    groupRef.current.rotation.x = -0.25 * p;
  });

  return (
    <group ref={groupRef}>
      {/* === Laringoskop === */}
      {/* Sap (handle) — dik tutulan silindir (üstte) */}
      <mesh position={[0.035, 0.05, -0.01]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.009, 0.009, 0.07, 14]} />
        <meshStandardMaterial color="#5a5f66" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Macintosh bleyd — kavisli (torus parçası), ağza giren */}
      <mesh position={[0.01, 0.01, 0.02]} rotation={[Math.PI / 2, 0, 0.4]}>
        <torusGeometry args={[0.03, 0.0035, 8, 20, Math.PI / 1.6]} />
        <meshStandardMaterial color="#b8bdc2" metalness={0.65} roughness={0.3} />
      </mesh>
      {/* Bleyd ucu ışığı — emissive küçük nokta */}
      <mesh position={[-0.012, -0.006, 0.03]}>
        <sphereGeometry args={[0.003, 8, 6]} />
        <meshStandardMaterial color="#fff4c0" emissive="#ffe98a" emissiveIntensity={1.2} />
      </mesh>

      {/* === Endotrakeal tüp (ETT) === */}
      {/* Tüp gövdesi — ince saydam silindir, ağıza doğru uzanır */}
      <mesh position={[-0.006, 0.0, 0.0]} rotation={[Math.PI / 2.2, 0, 0.1]}>
        <cylinderGeometry args={[0.005, 0.005, 0.11, 12]} />
        <meshStandardMaterial color="#e8eef2" transparent opacity={0.7} roughness={0.25} />
      </mesh>
      {/* 15 mm konnektör — tüp üst ucu (mavi) */}
      <mesh position={[-0.012, 0.055, -0.018]} rotation={[Math.PI / 2.2, 0, 0.1]}>
        <cylinderGeometry args={[0.0075, 0.0075, 0.016, 12]} />
        <meshStandardMaterial color="#3a6ea8" roughness={0.4} />
      </mesh>
      {/* Pilot balon — kaf şişirme balonu (yanda küçük küre) */}
      <mesh position={[0.012, 0.02, -0.005]}>
        <sphereGeometry args={[0.006, 10, 8]} />
        <meshStandardMaterial color="#d8c8c0" transparent opacity={0.6} roughness={0.4} />
      </mesh>
    </group>
  );
}
