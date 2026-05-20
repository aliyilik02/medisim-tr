// ============================================================
// InternalOrgans — Sprint B.4 — Placeholder iç organlar
// ============================================================
// Primitive geometri ile kalp, akciğer, karaciğer, mide, dalak.
// Cilt clipping aktifken görünür. Sonra Z-Anatomy CC BY-SA 4.0
// gerçek mesh ile değiştirilir (z-anatomy-binding skill referans).
//
// Koordinatlar: docs/memory/medisim_anatomik_landmark.md +
// medisim_anatomi_klinik.md'den (organ projeksiyon).
// Animasyonlar: kalp pulsate (HR), akciğer breathing (RR).
// ============================================================

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

interface Props {
  /** Heart rate (BPM) — kalp pulsate frequency. */
  hr?: number;
  /** Respiratory rate (BPM) — akciğer breathing frequency. */
  rr?: number;
  /** Görünür mü? clipping aktifken true, kapalıyken false. */
  visible?: boolean;
}

export function InternalOrgans({ hr = 75, rr = 14, visible = true }: Props) {
  const heartRef = useRef<Mesh>(null);
  const lungLeftRef = useRef<Mesh>(null);
  const lungRightRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.getElapsedTime();

    // Kalp pulsate — HR/60 = Hz
    if (heartRef.current) {
      const phase = Math.sin(t * 2 * Math.PI * (hr / 60));
      const scale = 1 + phase * 0.08; // ±%8 boy değişimi
      heartRef.current.scale.set(scale, scale, scale);
    }

    // Akciğer breathing — RR/60 = Hz
    if (lungLeftRef.current && lungRightRef.current) {
      const phase = Math.sin(t * 2 * Math.PI * (rr / 60));
      const scale = 1 + phase * 0.12; // ±%12 boy değişimi
      lungLeftRef.current.scale.set(scale, scale, scale);
      lungRightRef.current.scale.set(scale, scale, scale);
    }
  });

  if (!visible) return null;

  return (
    <group>
      {/* Kalp — 4. ICS sol, sternum arkası */}
      <mesh ref={heartRef} position={[-0.02, 0.50, 0.05]}>
        <sphereGeometry args={[0.04, 24, 16]} />
        <meshStandardMaterial
          color="#a83232"
          roughness={0.4}
          metalness={0.1}
          emissive="#3a0808"
          emissiveIntensity={0.3}
        />
      </mesh>

      {/* Sağ akciğer — sağ hemithoraks (sahnede ekrandan baktığımızda sol) */}
      <mesh ref={lungRightRef} position={[0.10, 0.53, 0.03]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial
          color="#f0a0a0"
          roughness={0.7}
          opacity={0.92}
          transparent
        />
      </mesh>

      {/* Sol akciğer — sol hemithoraks */}
      <mesh ref={lungLeftRef} position={[-0.10, 0.53, 0.03]}>
        <sphereGeometry args={[0.045, 16, 12]} />
        <meshStandardMaterial
          color="#f0a0a0"
          roughness={0.7}
          opacity={0.92}
          transparent
        />
      </mesh>

      {/* Karaciğer — sağ üst kadran (RUQ), sahnede +x */}
      <mesh position={[0.06, 0.40, 0.04]} rotation={[0, 0, -0.2]}>
        <boxGeometry args={[0.10, 0.06, 0.07]} />
        <meshStandardMaterial color="#6b3a1a" roughness={0.6} />
      </mesh>

      {/* Mide — sol üst kadran (LUQ) */}
      <mesh position={[-0.05, 0.40, 0.04]}>
        <sphereGeometry args={[0.035, 16, 12]} />
        <meshStandardMaterial color="#c97b8a" roughness={0.5} />
      </mesh>

      {/* Dalak — LUQ posterolateral */}
      <mesh position={[-0.10, 0.42, 0.02]}>
        <sphereGeometry args={[0.025, 16, 12]} />
        <meshStandardMaterial color="#8b4570" roughness={0.5} />
      </mesh>

      {/* İnce bağırsak — orta abdomen, paketlenmiş tüp */}
      <mesh position={[0, 0.32, 0.04]}>
        <sphereGeometry args={[0.05, 16, 12]} />
        <meshStandardMaterial color="#d4a8a0" roughness={0.6} opacity={0.85} transparent />
      </mesh>
    </group>
  );
}
