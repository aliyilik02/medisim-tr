import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// IVCannulaProcedure — antekübital IV kanül yerleştirme (P0 ekipman)
// ============================================================
// Tamamı R3F primitif (GLB yok, lisans yok). İki katman:
//   1) Sabit grup (lerp dışı): serum poşeti + askı + uzun IV hattı —
//      sahnede hep aynı yerde durur (yataktan/askıdan inen hat hissi).
//   2) Hareketli grup (lerp): kanül göbeği (hub) + kateter + flaster +
//      kısa konnektör tüp. Cilt yüzeyinin ~12 cm önünden insertion
//      noktasına 1.1 sn ease-out lerp. Tamamlanınca persistent katmana
//      taşınır (PatientBody3D), sahnede kalır.
// Şablon: OxygenMaskProcedure (mesh + useProcedureAnimation lerp).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.1;
const APPROACH_OFFSET_Z = 0.12; // kanül cilt önünden yaklaşır
const REST_OFFSET_Z = 0.012; // cilt yüzeyine oturma offset'i

export function IVCannulaProcedure({ targetPosition, onComplete }: Props) {
  const hubGroupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  // Serum poşeti, target noktasının ~45 cm üstünde sabit asılı durur.
  // Kanül grubu hareket ederken poşet sabit kalır (askıdan inen hat).
  const { startPos, endPos, bagPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
      bagPos: new Vector3(tx, ty + 0.45, tz - 0.02),
    };
  }, [targetPosition]);

  useFrame(() => {
    if (!hubGroupRef.current) return;
    hubGroupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group>
      {/* === Sabit katman: serum poşeti + askı === */}
      <group position={bagPos.toArray()}>
        {/* Serum poşeti — saydam, hafif sarımsı sıvı dolu kese */}
        <mesh>
          <boxGeometry args={[0.05, 0.09, 0.018]} />
          <meshStandardMaterial
            color="#dfe8df"
            transparent
            opacity={0.5}
            roughness={0.25}
          />
        </mesh>
        {/* Poşet üst askı deliği */}
        <mesh position={[0, 0.055, 0]}>
          <torusGeometry args={[0.008, 0.0022, 8, 16]} />
          <meshStandardMaterial color="#3a4046" roughness={0.6} />
        </mesh>
        {/* Damla haznesi (drip chamber) — poşet altı kısa silindir */}
        <mesh position={[0, -0.055, 0]}>
          <cylinderGeometry args={[0.006, 0.006, 0.022, 12]} />
          <meshStandardMaterial color="#cfe0e6" transparent opacity={0.55} roughness={0.2} />
        </mesh>
        {/* Uzun IV hattı — poşetten insertion noktasına inen ince hat.
            Hattın üst yarısı sabit grupta; alt ucu kanüle birleşir (görsel
            kabul: tek düz hat). Y boyu poşet ile target arası ~0.42. */}
        <mesh position={[0, -0.235, 0]}>
          <cylinderGeometry args={[0.0016, 0.0016, 0.38, 8]} />
          <meshStandardMaterial color="#d8e4ea" transparent opacity={0.75} roughness={0.3} />
        </mesh>
      </group>

      {/* === Hareketli katman: kanül hub + kateter + flaster === */}
      <group ref={hubGroupRef}>
        {/* Kanül göbeği (hub) — renk kodlu (20G pembe yaygın acil) */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.0055, 0.022, 12]} />
          <meshStandardMaterial color="#e08aa8" roughness={0.4} metalness={0.1} />
        </mesh>
        {/* Kateter ucu — cilde giren ince saydam parça */}
        <mesh position={[0, -0.004, 0.012]} rotation={[Math.PI / 2.6, 0, 0]}>
          <cylinderGeometry args={[0.0018, 0.0012, 0.016, 8]} />
          <meshStandardMaterial color="#cfd8de" transparent opacity={0.7} roughness={0.25} />
        </mesh>
        {/* Tespit flasteri — şeffaf yapışkan örtü (Tegaderm) */}
        <mesh position={[0, 0, -0.001]}>
          <boxGeometry args={[0.03, 0.022, 0.001]} />
          <meshStandardMaterial color="#eef2f4" transparent opacity={0.28} roughness={0.5} />
        </mesh>
        {/* Kısa konnektör tüp — hub'dan üste çıkıp sabit hatta bağlanır */}
        <mesh position={[0, 0.03, 0.004]}>
          <cylinderGeometry args={[0.0018, 0.0018, 0.05, 8]} />
          <meshStandardMaterial color="#d8e4ea" transparent opacity={0.8} roughness={0.3} />
        </mesh>
      </group>
    </group>
  );
}
