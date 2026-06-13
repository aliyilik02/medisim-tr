import { useMemo, useRef } from "react";
import { Vector3, CatmullRomCurve3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// NasalCannulaProcedure — nazal kanül (P2 — basit ekipman)
// ============================================================
// Düşük akış O2: burun deliklerine giren iki kısa pin (prong) +
// burun altında yatay manifold + her iki yanaktan kulak arkasına
// uzanan ince hortum (tube geometri, hafif kavisli). Tamamı R3F
// primitif (GLB yok). Animasyon: yüzün ~10 cm önünden burun altına
// 0.9 sn ease-out lerp. Tamamlanınca persistent katmanda kalır.
//
// PERSISTENT — takıldıktan sonra hastada KALIR (düşük akış O2 sürer).
// Hedef face-mouth landmark'ı (ağız); manifold burun deliklerine denk
// gelsin diye grup hafif yukarı (+y) offset'lenir. Şablon: OxygenMask.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 0.9;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.012;
// Ağız landmark'ından burun deliklerine yaklaşık yukarı kayma (8-head
// canon: mouth y=0.666, nose taban ~y=0.69 → ~+0.025 birim).
const NOSE_OFFSET_Y = 0.025;

export function NasalCannulaProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    const ny = ty + NOSE_OFFSET_Y;
    return {
      startPos: new Vector3(tx, ny, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ny, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  // Her iki yandan kulak arkasına uzanan hortum (yüze sarılma kavisi).
  const tubeCurves = useMemo(() => {
    // Sağ (x>0) ve sol (x<0) simetrik. Manifold ucundan yanağa, oradan
    // kulak hizasına (y biraz aşağı, z geriye) kavis.
    const make = (sign: number) =>
      new CatmullRomCurve3([
        new Vector3(sign * 0.014, -0.004, 0.004),
        new Vector3(sign * 0.05, -0.01, -0.02),
        new Vector3(sign * 0.075, 0.0, -0.06),
      ]);
    return [make(1), make(-1)];
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {/* Yatay manifold — burun altı kısa silindir (iki prong'u taşır) */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.004, 0.004, 0.028, 12]} />
        <meshStandardMaterial color="#e8eef0" transparent opacity={0.85} roughness={0.3} />
      </mesh>
      {/* Burun pinleri (prong) — manifolddan yukarı çıkan iki kısa silindir */}
      {[-0.006, 0.006].map((px) => (
        <mesh key={px} position={[px, 0.008, 0.002]}>
          <cylinderGeometry args={[0.0022, 0.0022, 0.012, 10]} />
          <meshStandardMaterial color="#eef2f4" transparent opacity={0.8} roughness={0.25} />
        </mesh>
      ))}
      {/* İki yan hortum — kulak arkasına uzanan ince tube */}
      {tubeCurves.map((curve, i) => (
        <mesh key={i}>
          <tubeGeometry args={[curve, 16, 0.0016, 6, false]} />
          <meshStandardMaterial color="#e0e6e8" transparent opacity={0.8} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
