// ============================================================
// PatientBleed — kanama görseli (Sprint B.10)
// ============================================================
// Travma / TCCC / cerrahi senaryolarında yara bölgelerinde kan birikimi.
// Mevcut Bandage (PatientEquipment) hemostatik kontrol — bunun tersi:
// aktif kanama mesh'i. Severity 0-1 ile opacity + emissive parlama.
//
// Klinik tip:
//   "arterial" → parlak kırmızı, pulsatil pulse (kalp atışı animation)
//   "venous"   → koyu kırmızı-mor, sabit
//   "capillary" → soluk pembe, yavaş sızdırma
//
// Hemostatik kontrol (handleProcedureComplete'de):
//   tourniquet → arterial sites severity 0.05'e düşer (proksimal kontrol)
//   gauze / packing → severity 0.2'ye düşer
//   direct pressure → severity 0.4'e (kısmi kontrol)
//
// PatientBody3D hasta wrapper içinde (T-pose koordinat) render edilir.
// ============================================================

import { memo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

export type BleedingType = "arterial" | "venous" | "capillary";

export interface BleedingSite {
  /** Anatomik konum (T-pose XYZ). */
  position: [number, number, number];
  /** Kanama şiddeti 0-1. 0 = yok, 1 = ağır. */
  severity: number;
  /** Klinik tip — renk + animasyon farkı. */
  type?: BleedingType;
  /** Disk yarıçapı (default 0.025m = 2.5cm gazlı çevresi). */
  radius?: number;
  /** İsimlendirme — debug + log için. */
  label?: string;
}

interface BleedProps extends BleedingSite {}

function BleedSpot({ position, severity, type = "venous", radius = 0.025 }: BleedProps) {
  const meshRef = useRef<Mesh>(null);
  const ringRef = useRef<Mesh>(null);

  // Animasyon — arteriyel pulse (kalp atışı 1Hz), venöz statik, kapiller hafif
  useFrame(({ clock }) => {
    if (!meshRef.current || severity <= 0) return;
    const t = clock.getElapsedTime();
    let pulse = 1;
    if (type === "arterial") {
      // Pulsatil — sin(t * 6.28) yaklaşık 60 bpm
      pulse = 1 + Math.sin(t * 6.28) * 0.20;
    } else if (type === "capillary") {
      // Yavaş sızma — düşük frekans yumuşak
      pulse = 1 + Math.sin(t * 1.5) * 0.08;
    }
    // Venöz statik
    meshRef.current.scale.setScalar(pulse);
    if (ringRef.current) {
      ringRef.current.scale.setScalar(pulse * 1.2);
    }
  });

  if (severity <= 0.02) return null;

  // Renk + emissive klinik tipe göre:
  const color =
    type === "arterial"
      ? "#dc2626" // canlı kırmızı arteriyel
      : type === "venous"
      ? "#7f1d1d" // koyu mor-kırmızı venöz
      : "#f87171"; // soluk pembe kapiller
  const emissiveIntensity = severity * (type === "arterial" ? 0.5 : 0.3);
  const opacity = Math.min(0.85, severity * 0.85);
  const sizeScale = Math.max(0.4, Math.min(1.3, 0.5 + severity * 0.8));

  return (
    <group position={position}>
      {/* Merkez yoğun kan (yara) */}
      <mesh ref={meshRef} scale={sizeScale}>
        <sphereGeometry args={[radius * 0.7, 16, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.25}
        />
      </mesh>
      {/* Dış halka — birikim/sızıntı çevresi */}
      <mesh ref={ringRef} scale={sizeScale}>
        <cylinderGeometry args={[radius * 1.4, radius * 1.4, 0.004, 24]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity * 0.5}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

interface Props {
  /** Kanama bölgeleri. Senaryo motor'dan veya manuel set edilir. */
  sites?: BleedingSite[];
}

function PatientBleedImpl({ sites }: Props) {
  if (!sites || sites.length === 0) return null;
  return (
    <group name="PatientBleed">
      {sites.map((site, i) => (
        <BleedSpot key={site.label ?? `bleed-${i}`} {...site} />
      ))}
    </group>
  );
}

export const PatientBleed = memo(PatientBleedImpl);

// =========================================================
// Hemostatik kontrol helper — action.target_id'ye göre severity ayarla.
// =========================================================
export function applyHemostasis(
  sites: BleedingSite[],
  actionTargetId: string,
): BleedingSite[] {
  const id = actionTargetId.toLowerCase();
  let factor = 1;
  let scope: "arterial-only" | "all" = "all";

  // CAT/SOFT-T turnike → arteriyel proksimal kontrol (severity 0.05'e)
  if (/turnike|tourniquet|cat[\s_-]?gen|soft[\s_-]?t/.test(id)) {
    factor = 0.05;
    scope = "arterial-only";
  }
  // Quikclot/Combat gauze/wound packing → severity 0.20'ye (orta kontrol)
  else if (/quikclot|combat[\s_-]?gauze|wound[\s_-]?packing|hemostatic|pak|sarg/.test(id)) {
    factor = 0.20;
  }
  // Direkt bası → 0.40 (kısmi)
  else if (/direkt[\s_-]?bas|direct[\s_-]?press|kompres/.test(id)) {
    factor = 0.40;
  } else {
    return sites; // ilgisiz action
  }

  return sites.map((s) => {
    if (scope === "arterial-only" && s.type !== "arterial") return s;
    return { ...s, severity: s.severity * factor };
  });
}
