// ============================================================
// PatientRash — deri lezyonu / döküntü görseli (Sprint B.10++)
// ============================================================
// Çeşitli klinik döküntü tipleri: peteşi (sepsis/menenjit), ekzantem (viral),
// ürtiker (alerjik), purpura (vaskülit/trombositopeni), maküler eritem,
// vezikül (varicella/zona).
//
// PatientBody3D hasta wrapper içinde (T-pose koordinat). Senaryolarda
// initial state olarak set edilir veya akut reaksiyon (anaflaksi ürtiker)
// için runtime trigger.
// ============================================================

import { memo } from "react";

export type RashType =
  | "petechiae"     // 1-3mm kırmızı nokta, basıyla solmaz (trombositopeni, sepsis, menenjit)
  | "purpura"       // 3-10mm mor lekeler (vaskülit, DIC)
  | "macular"       // düz kırmızı alan (viral ekzantem)
  | "urticaria"     // kabarık kaşıntılı plak (alerjik)
  | "vesicle"       // küçük sıvı dolu kese (HSV, varicella)
  | "ecchymosis";   // büyük morarma (travma, koagülopati)

export interface RashSite {
  /** Anatomik konum (T-pose XYZ). */
  position: [number, number, number];
  /** Lezyon tipi — renk + boyut + form farkı. */
  type: RashType;
  /** Yoğunluk 0-1: kaç adet lezyon + opacity. */
  density: number;
  /** Kapladığı alan yarıçapı (default 0.04m). */
  radius?: number;
  /** Label — debug + log için. */
  label?: string;
}

// Tip-bazlı renk + form parametreleri
const TYPE_CONFIG: Record<RashType, {
  color: string;
  emissive: string;
  emissiveIntensity: number;
  dotSize: number;
  count: (density: number) => number;
}> = {
  petechiae: {
    color: "#a8201e",
    emissive: "#a8201e",
    emissiveIntensity: 0.1,
    dotSize: 0.0015,
    count: (d) => Math.round(20 + d * 40),
  },
  purpura: {
    color: "#5a1a4a",
    emissive: "#5a1a4a",
    emissiveIntensity: 0.15,
    dotSize: 0.005,
    count: (d) => Math.round(6 + d * 12),
  },
  macular: {
    color: "#dc4a4a",
    emissive: "#dc4a4a",
    emissiveIntensity: 0.2,
    dotSize: 0.008,
    count: (d) => Math.round(10 + d * 20),
  },
  urticaria: {
    color: "#e87a6a",
    emissive: "#e87a6a",
    emissiveIntensity: 0.25,
    dotSize: 0.012,
    count: (d) => Math.round(4 + d * 8),
  },
  vesicle: {
    color: "#f0e0d0",
    emissive: "#a87060",
    emissiveIntensity: 0.15,
    dotSize: 0.004,
    count: (d) => Math.round(8 + d * 18),
  },
  ecchymosis: {
    color: "#3a1d3a",
    emissive: "#5a2d4a",
    emissiveIntensity: 0.1,
    dotSize: 0.025,
    count: (d) => Math.round(1 + d * 3),
  },
};

// Stable pseudo-random offset for visual spread within rash radius
function seededOffset(seed: number, radius: number): [number, number, number] {
  // Determinstic spread (consistent across renders)
  const a = ((seed * 9301 + 49297) % 233280) / 233280;
  const b = ((seed * 19937 + 7919) % 233280) / 233280;
  const c = ((seed * 4093 + 1543) % 233280) / 233280;
  return [
    (a - 0.5) * 2 * radius,
    (b - 0.5) * 2 * radius,
    (c - 0.5) * 0.4 * radius, // z spread az (yüzeyde kalsın)
  ];
}

function RashCluster({ position, type, density, radius = 0.04 }: RashSite) {
  if (density <= 0.02) return null;
  const config = TYPE_CONFIG[type];
  const count = config.count(density);
  const opacity = Math.min(0.92, 0.5 + density * 0.5);
  const dots = Array.from({ length: count }, (_, i) => {
    const [dx, dy, dz] = seededOffset(i + 1, radius);
    return (
      <mesh key={i} position={[position[0] + dx, position[1] + dy, position[2] + dz]}>
        <sphereGeometry args={[config.dotSize, 6, 6]} />
        <meshStandardMaterial
          color={config.color}
          emissive={config.emissive}
          emissiveIntensity={config.emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.6}
        />
      </mesh>
    );
  });
  return <group>{dots}</group>;
}

interface Props {
  sites?: RashSite[];
}

function PatientRashImpl({ sites }: Props) {
  if (!sites || sites.length === 0) return null;
  return (
    <group name="PatientRash">
      {sites.map((site, i) => (
        <RashCluster key={site.label ?? `rash-${i}`} {...site} />
      ))}
    </group>
  );
}

export const PatientRash = memo(PatientRashImpl);

// =========================================================
// Helper: vitals + senaryoya göre döküntü severity türetimi (computed cue)
// =========================================================
// Anaflaksi senaryoları için runtime trigger:
//   - Anaflaksi (SBP<90, HR>110, SpO2 normal+) + senaryoda allergy varsa
//     ürtiker döküntüsü gövdede dağınık görünür.
//
// Sepsis/menenjit:
//   - Sepsis senaryosu + temp>38.5 → peteşi (mikrohemorajik döküntü) gövde-alt ekstremitede.
// =========================================================
export function deriveAcuteRash(
  scenarioId: string,
  vitals: { hr: number; bp_systolic: number; spo2: number; temp: number },
): RashSite[] {
  // Anaflaksi → ürtiker (4 site)
  if (scenarioId.includes("anaflaksi") && vitals.bp_systolic < 100 && vitals.hr > 100) {
    return [
      { position: [0.05, 0.55, 0.10], type: "urticaria", density: 0.7, radius: 0.06, label: "Sağ üst toraks ürtiker" },
      { position: [-0.05, 0.55, 0.10], type: "urticaria", density: 0.7, radius: 0.06, label: "Sol üst toraks ürtiker" },
      { position: [0.10, 0.40, 0.10], type: "urticaria", density: 0.6, radius: 0.05, label: "Sağ kostal ürtiker" },
      { position: [-0.10, 0.40, 0.10], type: "urticaria", density: 0.6, radius: 0.05, label: "Sol kostal ürtiker" },
    ];
  }
  // Sepsis + yüksek ateş → peteşi (alt ekstremite + gövde)
  if (scenarioId.includes("sepsis") && vitals.temp > 38.5) {
    return [
      { position: [0.06, 0.20, 0.10], type: "petechiae", density: 0.6, radius: 0.08, label: "Sağ uyluk peteşi" },
      { position: [-0.06, 0.20, 0.10], type: "petechiae", density: 0.6, radius: 0.08, label: "Sol uyluk peteşi" },
      { position: [0, 0.40, 0.10], type: "petechiae", density: 0.5, radius: 0.07, label: "Karın peteşi" },
    ];
  }
  return [];
}
