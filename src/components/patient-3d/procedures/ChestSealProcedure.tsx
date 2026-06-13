import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// ChestSealProcedure — iğne torakostomi + göğüs mührü (P1 ekipman)
// ============================================================
// Tansiyon pnömotoraks dekompresyonu: 2. ICS midklaviküler hatta
// yerleştirilen büyük çaplı dekompresyon iğnesi/kateteri (kalır) +
// üzerine yapışan kare göğüs mührü (chest seal, valfli). Tamamı R3F
// primitif (GLB yok). Animasyon: cildin ~12 cm önünden insertion
// noktasına 1.1 sn ease-out lerp (iğne batırma hissi). Tamamlanınca
// kateter göğüste kalır, mühür yapışık durur.
//
// PERSISTENT — takıldıktan sonra göğüste KALIR (hava tahliyesi sürer).
// Şablon: IVCannulaProcedure (cilde batan kateter + flaster).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.1;
const APPROACH_OFFSET_Z = 0.12;
const REST_OFFSET_Z = 0.006;

export function ChestSealProcedure({ targetPosition, onComplete }: Props) {
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
      {/* === Göğüs mührü (chest seal) — cilde yapışan kare örtü === */}
      <mesh position={[0, 0, -0.001]}>
        <boxGeometry args={[0.05, 0.05, 0.0015]} />
        <meshStandardMaterial color="#1c1c20" transparent opacity={0.85} roughness={0.6} />
      </mesh>
      {/* Mühür şeffaf merkez (giriş yerini gösteren pencere) */}
      <mesh position={[0, 0, 0.0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.001, 24]} />
        <meshStandardMaterial color="#9aa6ac" transparent opacity={0.4} roughness={0.3} />
      </mesh>
      {/* Tek yönlü valf yarıkları — mührün üst kısmında 3 küçük tahliye çıkıntısı */}
      {[-0.012, 0, 0.012].map((vx) => (
        <mesh key={vx} position={[vx, 0.018, 0.003]}>
          <cylinderGeometry args={[0.0035, 0.0035, 0.006, 10]} />
          <meshStandardMaterial color="#3a4046" roughness={0.5} />
        </mesh>
      ))}

      {/* === Dekompresyon kateteri (mührün ortasından cilde) === */}
      {/* Kateter göbeği (hub) — renk kodlu (14G turuncu büyük çap) */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.006, 0.0055, 0.018, 12]} />
        <meshStandardMaterial color="#e08a3a" roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Kateter gövdesi — cilde giren saydam silindir */}
      <mesh position={[0, 0, -0.006]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0022, 0.0018, 0.022, 10]} />
        <meshStandardMaterial color="#cfd8de" transparent opacity={0.7} roughness={0.25} />
      </mesh>
      {/* Flutter valf kuyruğu — hub'dan öne çıkan küçük tahliye flaplı parça */}
      <mesh position={[0, 0.004, 0.012]} rotation={[Math.PI / 2.5, 0, 0]}>
        <boxGeometry args={[0.008, 0.012, 0.0008]} />
        <meshStandardMaterial color="#d8d4c8" transparent opacity={0.6} roughness={0.5} />
      </mesh>
    </group>
  );
}
