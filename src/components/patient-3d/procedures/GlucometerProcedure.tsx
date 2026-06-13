import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh, type MeshStandardMaterial } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// GlucometerProcedure — kan şekeri ölçümü (P2 — basit, anlık)
// ============================================================
// Parmak ucu kapiller kan şekeri: lanset kalemi (parmak ucuna dokunan
// kısa silindir) + test stribi (ince plaka) + glukometre gövdesi
// (küçük box + emissive ekran). Tamamı R3F primitif (GLB yok).
// Animasyon: parmağın ~8 cm önünden parmak ucuna 0.9 sn ease-out lerp
// (delme dokunuşu). Yerleşince ekran kısa süre "okuyor" pulsasyonu
// yapar (emissiveIntensity ref mutasyonu — useFrame'de setState YOK).
//
// PERSISTENT DEĞİL — anlık eylem (ölç → sonuç → kaldır). Hedef
// finger-left-tip landmark'ı. Şablon: PulseOxProcedure (parmak + LED).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 0.9;
const APPROACH_OFFSET_Z = 0.08;
const REST_OFFSET_Z = 0.01;

export function GlucometerProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const screenRef = useRef<Mesh>(null);
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
    // Yerleşince ekran "ölçüyor" yanıp söner (emissive pulsasyon).
    if (screenRef.current && animRef.current.progress > 0.85) {
      const mat = screenRef.current.material as MeshStandardMaterial;
      mat.emissiveIntensity = 0.5 + 0.5 * Math.abs(Math.sin(state.clock.getElapsedTime() * 4.0));
    }
  });

  return (
    <group ref={groupRef}>
      {/* Glukometre gövdesi — küçük dikdörtgen cihaz */}
      <mesh position={[0, 0.0, -0.005]}>
        <boxGeometry args={[0.024, 0.04, 0.008]} />
        <meshStandardMaterial color="#2a2e33" roughness={0.5} />
      </mesh>
      {/* Ekran — emissive yeşilimsi LCD */}
      <mesh ref={screenRef} position={[0, 0.008, -0.0005]}>
        <boxGeometry args={[0.016, 0.014, 0.001]} />
        <meshStandardMaterial
          color="#0e3a2a"
          emissive="#2ad88a"
          emissiveIntensity={0.6}
          roughness={0.3}
        />
      </mesh>
      {/* Test stribi — cihaz altından parmağa uzanan ince beyaz plaka */}
      <mesh position={[0, -0.026, 0.001]}>
        <boxGeometry args={[0.006, 0.016, 0.0012]} />
        <meshStandardMaterial color="#f0f2f3" roughness={0.6} />
      </mesh>
      {/* Lanset dokunuş ucu — strip ucunda parmağa değen kırmızımsı nokta
          (kapiller damla) */}
      <mesh position={[0, -0.035, 0.002]}>
        <sphereGeometry args={[0.002, 8, 6]} />
        <meshStandardMaterial color="#b01818" roughness={0.4} />
      </mesh>
    </group>
  );
}
