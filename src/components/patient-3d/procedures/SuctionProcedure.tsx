import { useMemo, useRef } from "react";
import { Vector3, CatmullRomCurve3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// SuctionProcedure — aspiratör / Yankauer ucu (P3 — anlık)
// ============================================================
// Hava yolu aspirasyonu: rijit kavisli Yankauer ucu (sert plastik,
// kıvrımlı silindir) + ucunda emiş deliği + arkadan uzanan esnek
// hortum (CatmullRom tube). Tamamı R3F primitif (GLB yok). Animasyon:
// ağzın ~10 cm önünden ağıza 0.8 sn ease-out lerp (ucu yerleştirme).
//
// PERSISTENT DEĞİL — anlık eylem (aspire et → sekresyon temizle →
// kaldır; elle tutulur, hastada kalmaz). Hedef face-mouth landmark'ı.
// Şablon: IntubationProcedure (rijit alet + ağza yerleştirme).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 0.8;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.02;

export function SuctionProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  // Esnek aspirasyon hortumu — Yankauer sapından geriye/yana uzanır.
  const hoseCurve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0.0, 0.0, 0.055),
        new Vector3(0.02, -0.01, 0.10),
        new Vector3(0.05, -0.04, 0.14),
      ]),
    [],
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {/* Yankauer ucu — ağza giren rijit kavisli emiş ucu (kıvrık silindir).
          Hafif açılı yerleştirme (ağız köşesinden farinkse doğru). */}
      <mesh rotation={[Math.PI / 2.4, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.0055, 0.05, 12]} />
        <meshStandardMaterial color="#f2f4f5" transparent opacity={0.9} roughness={0.25} />
      </mesh>
      {/* Emiş deliği — ucun tepesinde küçük açıklık (koyu çukur) */}
      <mesh position={[0, 0.02, -0.005]}>
        <sphereGeometry args={[0.0045, 10, 8]} />
        <meshStandardMaterial color="#1a1d20" roughness={0.4} />
      </mesh>
      {/* Parmak kontrol portu — sapın üstünde küçük yan delik (vakum kesme) */}
      <mesh position={[0, -0.018, 0.04]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.008, 10]} />
        <meshStandardMaterial color="#d8dde0" roughness={0.3} />
      </mesh>
      {/* Esnek aspirasyon hortumu — saptan geriye/yana uzanan tube */}
      <mesh>
        <tubeGeometry args={[hoseCurve, 20, 0.005, 8, false]} />
        <meshStandardMaterial color="#cfd6da" transparent opacity={0.85} roughness={0.4} />
      </mesh>
    </group>
  );
}
