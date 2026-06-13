import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// BVMProcedure — Ambu balon-valf-maske ventilasyonu (P1 ekipman)
// ============================================================
// Yüz maskesi (OxygenMaskProcedure benzeri yarı saydam kabuk) + valf
// gövdesi + sıkılabilir ovoid balon (self-inflating bag). Tamamı R3F
// primitif (GLB yok). İki fazlı, ikisi de tek useProcedureAnimation
// progress'ine bağlı:
//   1) Yaklaşma: maske yüzün ~25 cm önünden yüze lerp (group position).
//   2) Balon sıkma: yerleştikten sonra balon scale-lerp ile ritmik
//      sıkılır (1.0 → ~0.82 → 1.0). ~12/dk ventilasyon hissi. Scale
//      doğrudan mesh ref üzerinden mutasyon (useFrame'de setState YOK).
//
// PERSISTENT DEĞİL — anlık eylem (manuel ventilasyon, elle tutulur;
// hasta üzerinde "takılı kalmaz"). Şablon: OxygenMaskProcedure.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.25;
const REST_OFFSET_Z = 0.04;
// Balon sıkma hızı (rad/sn) — ~0.8 Hz → dakikada ~12 ventilasyon hissi.
const BAG_SQUEEZE_SPEED = 5.0;

export function BVMProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const bagRef = useRef<Mesh>(null);
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
    // Maske oturduktan sonra (progress>0.85) balon ritmik sıkılır.
    // sin → 0..1 arası, balon y/x ekseninde hafif büzülür (sıkma hissi).
    if (bagRef.current && animRef.current.progress > 0.85) {
      const t = state.clock.getElapsedTime() * BAG_SQUEEZE_SPEED;
      const squeeze = 1.0 - 0.18 * Math.max(0, Math.sin(t));
      bagRef.current.scale.set(squeeze, 1.0, squeeze);
    }
  });

  return (
    <group ref={groupRef}>
      {/* === Maske kısmı (yüze oturur) === */}
      {/* Yarı saydam oval kabuk */}
      <mesh>
        <sphereGeometry args={[0.055, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial
          color="#c7d6dc"
          transparent
          opacity={0.45}
          roughness={0.18}
          metalness={0.05}
        />
      </mesh>
      {/* Maske yastık kenarı — daha koyu şişkin halka */}
      <mesh>
        <torusGeometry args={[0.05, 0.006, 12, 32]} />
        <meshStandardMaterial color="#3a4046" roughness={0.6} />
      </mesh>

      {/* === Valf gövdesi (maske ile balon arası, önde) === */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.018, 0.018, 0.03, 16]} />
        <meshStandardMaterial color="#d8dde0" roughness={0.35} metalness={0.1} />
      </mesh>
      {/* Hasta valfi disk (basınç tahliye) */}
      <mesh position={[0, 0.022, 0.05]}>
        <cylinderGeometry args={[0.01, 0.01, 0.006, 14]} />
        <meshStandardMaterial color="#2a8a4a" roughness={0.4} />
      </mesh>

      {/* === Self-inflating balon (sıkılan ovoid) === */}
      <mesh ref={bagRef} position={[0, 0, 0.14]}>
        <sphereGeometry args={[0.05, 20, 16]} />
        <meshStandardMaterial color="#1f2730" roughness={0.75} metalness={0.05} />
      </mesh>
      {/* Rezervuar tüpü kuyruğu — balonun arkasından çıkan kısa silindir */}
      <mesh position={[0, 0, 0.205]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.012, 0.012, 0.04, 12]} />
        <meshStandardMaterial color="#2a323a" roughness={0.6} />
      </mesh>
    </group>
  );
}
