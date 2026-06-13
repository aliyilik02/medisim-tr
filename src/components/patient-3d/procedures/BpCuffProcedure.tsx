import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// BpCuffProcedure — üst kol NIBP manşonu (P0 ekipman)
// ============================================================
// Üst kolu saran kaf: kavisli ana gövde (genişçe açılı torus parçası,
// kolu sarma hissi) + velkro şerit + iki ince hava tüpü. Animasyon iki
// fazlı, ikisi de useProcedureAnimation progress'ine bağlı:
//   1) Yaklaşma: kolun ~10 cm önünden cilde lerp (group position).
//   2) Şişme: yerleştikten sonra hava kesesi scale-lerp ile hafif
//      şişer (1.0 → 1.06 → 1.0 nabız hissi). Scale doğrudan mesh ref
//      üzerinden mutasyon (setState YOK).
// Tamamlanınca persistent katmanda kalır. Şablon: OxygenMaskProcedure.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.0; // kaf kolu sarar, cilt yüzeyiyle aynı hizada

export function BpCuffProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const bladderRef = useRef<Mesh>(null);
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
    // Yerleştikten sonra hava kesesi nabızlı şişme — z eksende hafif scale.
    // Yaklaşma fazında (progress<0.9) şişme yok; oturunca başlar.
    if (bladderRef.current && animRef.current.progress > 0.9) {
      const inflate = 1.0 + 0.06 * Math.abs(Math.sin(state.clock.getElapsedTime() * 1.6));
      bladderRef.current.scale.z = inflate;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ana kaf gövdesi — kolu saran kavisli bant (yarım torus benzeri).
          torus açısı ~PI*1.3 → kolun ön+yan yüzeyini sarar. */}
      <mesh ref={bladderRef} rotation={[Math.PI / 2, 0, -Math.PI * 0.15]}>
        <torusGeometry args={[0.032, 0.014, 12, 24, Math.PI * 1.3]} />
        <meshStandardMaterial color="#3a4a6a" roughness={0.7} metalness={0.05} />
      </mesh>
      {/* Velkro tespit şeridi — kafın dış yüzeyinde açık renkli bant */}
      <mesh position={[0, 0.018, 0.0]} rotation={[Math.PI / 2, 0, -Math.PI * 0.15]}>
        <torusGeometry args={[0.033, 0.004, 8, 24, Math.PI * 1.1]} />
        <meshStandardMaterial color="#7a8aa0" roughness={0.85} />
      </mesh>
      {/* Hava tüpü 1 — kaftan çıkan ince hortum */}
      <mesh position={[0.028, -0.018, 0.012]} rotation={[Math.PI / 2.3, 0, 0.3]}>
        <cylinderGeometry args={[0.0018, 0.0018, 0.06, 8]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.5} />
      </mesh>
      {/* Hava tüpü 2 — ikinci paralel hortum */}
      <mesh position={[0.034, -0.018, 0.012]} rotation={[Math.PI / 2.3, 0, 0.3]}>
        <cylinderGeometry args={[0.0018, 0.0018, 0.06, 8]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.5} />
      </mesh>
    </group>
  );
}
