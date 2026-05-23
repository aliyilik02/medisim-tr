// ============================================================
// PatientFaceExpression — yüz mimikleri (Sprint B.8)
// ============================================================
// Karakter tepkileri: ağız hareketi (speaking lipsync + ağrı/koma açık ağız),
// kaş çatma (pain), yanak kızarması (ateş/alerjik). PatientVitals + speaking
// prop'larına göre dinamik. R3F primitif mesh — Rocketbox blendshape yok.
//
// T-pose koordinat referansı (yüz bölgesi):
//   Ağız:        X=0,     Y=0.660, Z=+0.108
//   Sol kaş:     X=-0.020, Y=0.700, Z=+0.105
//   Sağ kaş:     X=+0.020, Y=0.700, Z=+0.105
//   Sol yanak:   X=-0.028, Y=0.660, Z=+0.102
//   Sağ yanak:   X=+0.028, Y=0.660, Z=+0.102
// ============================================================

import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import type { PatientVitals } from "@/engine/types";

interface Props {
  vitals?: PatientVitals;
  /** AI diyalog konuşma anı — ağız oscillation lipsync. */
  speaking?: boolean;
}

// Ağız — speaking + pain + GCS'ye göre açıklık.
// Mesh: yatay oval (alt+üst dudak proxy). Scale.y = openness (0-1).
function Mouth({
  speaking = false,
  painLevel = 0,
  eyelidCloseness = 0,
}: {
  speaking?: boolean;
  painLevel?: number;
  eyelidCloseness?: number;
}) {
  const meshRef = useRef<Mesh>(null);

  // Base openness (statik):
  //   - pain > 6 → ağrı grimace açık (0.6)
  //   - eyelid > 0.8 → koma açık ağız (0.3)
  //   - default kapalı (0.05)
  const baseOpenness =
    painLevel > 6 ? 0.6 : eyelidCloseness > 0.8 ? 0.3 : 0.05;

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    let openness = baseOpenness;
    if (speaking) {
      // Lipsync — 3Hz oscillation, 0.1-0.5 arası
      const t = clock.getElapsedTime();
      openness = 0.30 + Math.sin(t * 6) * 0.20; // 0.10-0.50 arası
    }
    meshRef.current.scale.y = Math.max(0.05, Math.min(1, openness));
  });

  // Pain > 4 → ağrı kenarları aşağı çekilir (frown). Renk daha koyu.
  const lipColor = painLevel > 4 ? "#a8463a" : "#c8584a";

  return (
    <mesh ref={meshRef} position={[0, 0.660, 0.108]} rotation={[0, 0, 0]}>
      {/* Yatay oval — ellipsoid kullanır gibi sphereGeometry scale */}
      <sphereGeometry args={[0.018, 16, 8]} />
      <meshStandardMaterial color={lipColor} roughness={0.5} />
    </mesh>
  );
}

// Kaş çatma — painLevel'a göre 2 kaş çizgisi inner-down tilt (frown furrow).
function EyebrowFurrow({ painLevel = 0 }: { painLevel?: number }) {
  // Pain 0-3: kayda değer değil
  // Pain 4-7: hafif kaş çatma
  // Pain 8-10: belirgin frown (inner brow aşağı)
  if (painLevel < 3) return null;
  const intensity = Math.min(1, (painLevel - 3) / 7);
  const tilt = (Math.PI / 14) * intensity; // 0-13° iç köşe aşağı
  const yOff = -0.005 * intensity; // 0-5mm iç köşe çöker
  const opacity = 0.5 + intensity * 0.45;
  return (
    <group>
      {/* Sol kaş (X<0) — sağ tarafta tilt (medial down) */}
      <mesh
        position={[-0.022, 0.700 + yOff, 0.106]}
        rotation={[0, 0, -tilt]}
      >
        <boxGeometry args={[0.018, 0.003, 0.005]} />
        <meshStandardMaterial color="#3a2820" transparent opacity={opacity} roughness={0.7} />
      </mesh>
      {/* Sağ kaş (X>0) — sol tarafta tilt */}
      <mesh
        position={[0.022, 0.700 + yOff, 0.106]}
        rotation={[0, 0, tilt]}
      >
        <boxGeometry args={[0.018, 0.003, 0.005]} />
        <meshStandardMaterial color="#3a2820" transparent opacity={opacity} roughness={0.7} />
      </mesh>
    </group>
  );
}

// Yanak kızarması — ateş (>38) veya allerjik reaksiyon (computed sweat severity proxy).
// Severity 0-1, opacity ile uygulanır.
function CheekFlush({ severity = 0 }: { severity?: number }) {
  if (severity <= 0.1) return null;
  const opacity = Math.min(0.55, severity * 0.5);
  return (
    <group>
      {/* Sol yanak */}
      <mesh position={[-0.030, 0.660, 0.103]}>
        <circleGeometry args={[0.014, 16]} />
        <meshStandardMaterial
          color="#e84a4a"
          transparent
          opacity={opacity}
          roughness={0.7}
          emissive="#e84a4a"
          emissiveIntensity={0.15}
        />
      </mesh>
      {/* Sağ yanak */}
      <mesh position={[0.030, 0.660, 0.103]}>
        <circleGeometry args={[0.014, 16]} />
        <meshStandardMaterial
          color="#e84a4a"
          transparent
          opacity={opacity}
          roughness={0.7}
          emissive="#e84a4a"
          emissiveIntensity={0.15}
        />
      </mesh>
    </group>
  );
}

// Vitals'tan yanak kızarma severity türetimi (ateş + alerjik).
export function deriveCheekFlushSeverity(v: PatientVitals): number {
  let s = 0;
  if (v.temp > 38) s += 0.4;
  if (v.temp > 39) s += 0.3;
  if (v.temp > 40) s += 0.2;
  // Alerjik reaksiyon proxy: anaflaksi SBP düşük + HR yüksek + cilt kızarık
  // (cyanosis yerine alerjik flush — SpO2 normal ama BP düşük)
  if (v.bp_systolic < 90 && v.hr > 110 && v.spo2 >= 90) s += 0.3;
  return Math.min(1, s);
}

// GCS → eyelid closeness derivation (PatientVitalSigns ile aynı eşik).
function deriveEyelidLocal(gcs?: number): number {
  if (typeof gcs !== "number") return 0;
  if (gcs >= 14) return 0;
  if (gcs >= 11) return 0.2;
  if (gcs >= 8) return 0.5;
  if (gcs >= 5) return 0.8;
  return 1;
}

function PatientFaceExpressionImpl({ vitals, speaking = false }: Props) {
  const pain = vitals?.pain ?? 0;
  const eyelid = deriveEyelidLocal(vitals?.gcs);
  const cheekFlush = vitals ? deriveCheekFlushSeverity(vitals) : 0;
  return (
    <group name="PatientFaceExpression">
      <Mouth speaking={speaking} painLevel={pain} eyelidCloseness={eyelid} />
      <EyebrowFurrow painLevel={pain} />
      <CheekFlush severity={cheekFlush} />
    </group>
  );
}

export const PatientFaceExpression = memo(PatientFaceExpressionImpl);
