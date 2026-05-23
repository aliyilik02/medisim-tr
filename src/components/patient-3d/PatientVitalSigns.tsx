// ============================================================
// PatientVitalSigns — gövde üzerinde vital bulgular (Sprint B.6.1)
// ============================================================
// PatientVitals'a göre lokal klinik görsel bulgular:
//   - Pupil çapı (pupil_left_mm, pupil_right_mm) — miyoz/midriyaz
//   - Pupil reaktivite (pupil_reactive false → ışık refleksi yok, koyu)
//   - Bilinç (gcs<8 → göz kapalı, gcs 8-13 → yarı kapalı, gcs≥14 → açık)
//   - Terleme (computed: SBP<90 OR temp>38 → sympatik aktivasyon)
//   - JVD juguler ven dolgunluğu (computed: CVP>12 OR sağ kalp yetm
//     proxy → SBP<90 + HR>120)
//
// PatientBody3D hasta wrapper içinde (T-pose koordinat) render edilir.
// regions.ts referans landmarkları:
//   Sol göz:     X=-0.018, Y=0.680, Z=+0.105
//   Sağ göz:     X=+0.018, Y=0.680, Z=+0.105
//   Alın:        X=0,      Y=0.720, Z=+0.100
//   Boyun (sol jugular): X=-0.022, Y=0.620, Z=+0.085
// ============================================================

import { memo } from "react";
import type { PatientVitals } from "@/engine/types";

interface Props {
  vitals?: PatientVitals;
}

// Pupil normal 2-4 mm. Mesh çapı 8mm = ölçek 1.0 (görsel referans).
// scale = pupil_mm / 4.
function Pupil({
  position,
  diameter_mm = 4,
  reactive = true,
}: {
  position: [number, number, number];
  diameter_mm?: number;
  reactive?: boolean;
}) {
  const scale = Math.max(0.3, Math.min(2.5, diameter_mm / 4));
  // Reactive değilse koyu siyah (ışık tepkisi yok), reactive ise normal pupil
  // (hafif kahve halka — iris). Reaktivite görsel cue: pupil renk.
  const pupilColor = reactive ? "#1a1a1a" : "#000000";
  return (
    <group position={position}>
      {/* Iris halkası (sclera üstünde) */}
      <mesh>
        <cylinderGeometry args={[0.005, 0.005, 0.0008, 16]} />
        <meshStandardMaterial color="#5a4a2a" roughness={0.5} />
      </mesh>
      {/* Pupil — siyah disk, scale = pupil çapı */}
      <mesh position={[0, 0.0001, 0]} scale={[scale, 1, scale]}>
        <cylinderGeometry args={[0.0022, 0.0022, 0.0008, 12]} />
        <meshStandardMaterial color={pupilColor} roughness={0.3} />
      </mesh>
    </group>
  );
}

// Göz kapağı — GCS düşükse kapalı görünür (üst kapak iniyor)
function Eyelid({
  position,
  closeness = 0,
}: {
  position: [number, number, number];
  closeness?: number; // 0 = tam açık, 1 = tam kapalı
}) {
  if (closeness <= 0.05) return null;
  return (
    <mesh position={position} scale={[1, Math.max(0.1, closeness), 1]}>
      {/* Yarım daire (üst kapak) — sclera üzerine iniyor */}
      <sphereGeometry args={[0.007, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#d4a896" roughness={0.6} />
    </mesh>
  );
}

// Alın terleme — parlak shiny disk emissive (cilt yansıması taklit)
function SweatSheen({ severity }: { severity: number }) {
  // severity 0 = yok, 1 = ağır terleme
  if (severity <= 0.05) return null;
  const opacity = Math.min(0.65, severity * 0.55);
  return (
    <mesh position={[0, 0.720, 0.105]}>
      <sphereGeometry args={[0.045, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial
        color="#ffffff"
        transparent
        opacity={opacity}
        roughness={0.05}
        metalness={0.0}
        emissive="#ffffff"
        emissiveIntensity={0.1}
      />
    </mesh>
  );
}

// JVD — boyun sol jugular ven dolgunluğu (mavi-mor çizgi)
function JVD({ severity }: { severity: number }) {
  if (severity <= 0.05) return null;
  const opacity = Math.min(0.75, 0.3 + severity * 0.5);
  return (
    <group>
      {/* Sol eksternal jugular ven — açılı tüp (mandibula → klavikula) */}
      <mesh position={[-0.04, 0.625, 0.085]} rotation={[0, 0, Math.PI / 7]}>
        <cylinderGeometry args={[0.0035, 0.0028, 0.085, 8]} />
        <meshStandardMaterial color="#3a2860" transparent opacity={opacity} roughness={0.45} />
      </mesh>
      {/* Sağ eksternal jugular ven */}
      <mesh position={[0.04, 0.625, 0.085]} rotation={[0, 0, -Math.PI / 7]}>
        <cylinderGeometry args={[0.0035, 0.0028, 0.085, 8]} />
        <meshStandardMaterial color="#3a2860" transparent opacity={opacity} roughness={0.45} />
      </mesh>
    </group>
  );
}

// Vitals'tan terleme + JVD severity türetme (computed visual cues).
function deriveSweatSeverity(v: PatientVitals): number {
  let s = 0;
  // Hipotansiyon → sempatik aktivasyon → terleme
  if (v.bp_systolic < 90) s += 0.5;
  if (v.bp_systolic < 70) s += 0.3;
  // Yüksek ateş → terleme
  if (v.temp > 38) s += 0.3;
  if (v.temp > 39) s += 0.2;
  // Şok + bradikardi/taşikardi
  if (v.hr > 130 && v.bp_systolic < 100) s += 0.2;
  return Math.min(1, s);
}

function deriveJvdSeverity(v: PatientVitals): number {
  let s = 0;
  // CVP açık ölçü
  if (typeof v.cvp === "number" && v.cvp > 12) s += 0.5;
  if (typeof v.cvp === "number" && v.cvp > 18) s += 0.3;
  // Sağ kalp yetm proxy — hipotansiyon + taşikardi + düşük SpO2
  if (v.bp_systolic < 90 && v.hr > 120 && v.spo2 < 90) s += 0.4;
  return Math.min(1, s);
}

// GCS → göz kapağı kapalılık oranı
function deriveEyelidCloseness(gcs?: number): number {
  if (typeof gcs !== "number") return 0;
  if (gcs >= 14) return 0; // tam açık
  if (gcs >= 11) return 0.2;
  if (gcs >= 8) return 0.5;
  if (gcs >= 5) return 0.8;
  return 1; // tam kapalı
}

function PatientVitalSignsImpl({ vitals }: Props) {
  if (!vitals) return null;
  const leftPupil = vitals.pupil_left_mm ?? 4;
  const rightPupil = vitals.pupil_right_mm ?? 4;
  const reactive = vitals.pupil_reactive ?? true;
  const sweat = deriveSweatSeverity(vitals);
  const jvd = deriveJvdSeverity(vitals);
  const eyelid = deriveEyelidCloseness(vitals.gcs);

  return (
    <group name="PatientVitalSigns">
      {/* Pupiller — sol + sağ */}
      <Pupil position={[-0.018, 0.680, 0.105]} diameter_mm={leftPupil} reactive={reactive} />
      <Pupil position={[0.018, 0.680, 0.105]} diameter_mm={rightPupil} reactive={reactive} />
      {/* Göz kapağı — GCS düşükse iner */}
      <Eyelid position={[-0.018, 0.682, 0.105]} closeness={eyelid} />
      <Eyelid position={[0.018, 0.682, 0.105]} closeness={eyelid} />
      {/* Terleme alın */}
      <SweatSheen severity={sweat} />
      {/* JVD — boyun jugular ven dolgunluğu */}
      <JVD severity={jvd} />
    </group>
  );
}

export const PatientVitalSigns = memo(PatientVitalSignsImpl);
