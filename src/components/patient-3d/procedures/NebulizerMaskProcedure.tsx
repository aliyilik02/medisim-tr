import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// NebulizerMaskProcedure — nebülizatör maske (P3 ekipman)
// ============================================================
// Yüze oturan yarı saydam maske (OxygenMask benzeri kabuk) + altta
// ilaç haznesi (nebül kabı) + maske içinde hafif emissive buhar konisi
// (aerosol/ilaç buharı). Tamamı R3F primitif (GLB yok). Animasyon: yüzün
// ~12 cm önünden yüze 0.9 sn ease-out lerp. Yerleşince buhar konisi
// emissiveIntensity + scale pulsasyonu yapar (nebülizasyon "çalışıyor"
// hissi). Pulsasyon doğrudan mesh/material ref mutasyonu — useFrame'de
// setState YOK.
//
// PERSISTENT — takıldıktan sonra hastada KALIR (nebülizasyon ~5-15 dk
// sürer). Hedef face-mouth landmark'ı (ağız). Şablon: OxygenMaskProcedure
// + BVMProcedure (yerleşim sonrası ritmik mutasyon).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 0.9;
const APPROACH_OFFSET_Z = 0.12;
const REST_OFFSET_Z = 0.03;
// Buhar pulsasyon hızı (rad/sn) — yumuşak "tüten" his.
const MIST_PULSE_SPEED = 2.2;

export function NebulizerMaskProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const mistRef = useRef<Mesh>(null);
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
    // Maske oturduktan sonra (progress>0.85) buhar konisi tüter:
    // emissive + scale yumuşak pulsasyon (ref mutasyonu, setState YOK).
    if (mistRef.current && animRef.current.progress > 0.85) {
      const t = state.clock.getElapsedTime() * MIST_PULSE_SPEED;
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(t));
      const mat = mistRef.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.25 + 0.35 * pulse;
      mat.opacity = 0.15 + 0.18 * pulse;
      const s = 0.9 + 0.18 * pulse;
      mistRef.current.scale.set(s, 1.0, s);
    }
  });

  return (
    <group ref={groupRef}>
      {/* Yarı saydam maske kabuğu (yüze oturan oval) */}
      <mesh>
        <sphereGeometry args={[0.052, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial
          color="#cdd8de"
          transparent
          opacity={0.4}
          roughness={0.18}
          metalness={0.05}
        />
      </mesh>
      {/* Maske yastık kenarı — koyu şişkin halka (yüze sızdırmazlık) */}
      <mesh>
        <torusGeometry args={[0.047, 0.006, 12, 32]} />
        <meshStandardMaterial color="#3a4046" roughness={0.6} />
      </mesh>
      {/* Buhar konisi — maske içinde tüten aerosol (emissive, pulsasyonlu) */}
      <mesh ref={mistRef} position={[0, -0.005, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.03, 0.05, 16, 1, true]} />
        <meshStandardMaterial
          color="#dff3ff"
          emissive="#bfe8ff"
          emissiveIntensity={0.3}
          transparent
          opacity={0.2}
          roughness={0.9}
          depthWrite={false}
        />
      </mesh>
      {/* İlaç haznesi (nebül kabı) — maskenin altından sarkan silindir */}
      <mesh position={[0, -0.05, 0.01]}>
        <cylinderGeometry args={[0.013, 0.016, 0.03, 16]} />
        <meshStandardMaterial color="#d8dde0" transparent opacity={0.7} roughness={0.3} />
      </mesh>
      {/* Hazne alt O2 giriş nipeli — kabın altından kısa silindir */}
      <mesh position={[0, -0.07, 0.01]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.004, 0.004, 0.014, 10]} />
        <meshStandardMaterial color="#2a8a4a" roughness={0.5} />
      </mesh>
    </group>
  );
}
