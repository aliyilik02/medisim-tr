import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// CervicalCollarProcedure — servikal yaka / C-collar (P3 ekipman)
// ============================================================
// Servikal immobilizasyon: boynu önden saran sert kavisli band (rijit
// yaka gövdesi) + çene desteği (öne çıkan çıkıntı) + yan tespit kayışı.
// Tamamı R3F primitif (GLB yok). Kavis için yarık torus (açılı) +
// çene/oksiput destek box'ları. Animasyon: boynun ~10 cm önünden boyna
// 1.0 sn ease-out lerp (yerleştirme hissi).
//
// PERSISTENT — takıldıktan sonra hastada KALIR (immobilizasyon sürer).
// Hedef YENİ neck-anterior landmark'ı (boyun ön-orta). Şablon:
// TourniquetProcedure (boynu saran band — yarık torus + tokalar).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.0;

export function CervicalCollarProcedure({ targetPosition, onComplete }: Props) {
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
      {/* Sert yaka gövdesi — boynu önden saran kavisli band (yarık torus).
          Ön ~220° kavis, arka açık (tek parça ön yaka görünümü). Z ekseni
          etrafında dönük → kavis yatay düzlemde boynu sarar. */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.05, 0.013, 16, 28, Math.PI * 1.25]} />
        <meshStandardMaterial color="#e8e4d8" roughness={0.55} metalness={0.0} />
      </mesh>
      {/* Çene desteği — yakanın önünde yukarı/öne çıkan destek plakası
          (mandibula altını taşır). */}
      <mesh position={[0, 0.022, 0.05]} rotation={[Math.PI / 8, 0, 0]}>
        <boxGeometry args={[0.05, 0.022, 0.012]} />
        <meshStandardMaterial color="#eceade" roughness={0.5} />
      </mesh>
      {/* Sternum/göğüs üstü oturma plakası — yakanın alt ön kısmı */}
      <mesh position={[0, -0.024, 0.046]} rotation={[-Math.PI / 9, 0, 0]}>
        <boxGeometry args={[0.058, 0.02, 0.01]} />
        <meshStandardMaterial color="#e4e0d4" roughness={0.55} />
      </mesh>
      {/* Yan tespit tokası — yakanın sağ yanında küçük cırt-cırt blok */}
      <mesh position={[0.048, 0, -0.012]}>
        <boxGeometry args={[0.012, 0.018, 0.01]} />
        <meshStandardMaterial color="#2e333a" roughness={0.7} />
      </mesh>
    </group>
  );
}
