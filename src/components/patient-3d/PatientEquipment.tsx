// ============================================================
// PatientEquipment — hastaya giydirilmiş klinik ekipman (Sprint B.6)
// ============================================================
// Prosedür tamamlandığında ilgili ekipman kalıcı olarak görünür kalır.
// PatientBody3D'nin hasta wrapper'ı içinde render edilir, yani T-pose
// koordinatlarında konuşlandırılır (wrapper rotation [-π/2, 0, 0] hasta
// supine'a çevirir; biz yine T-pose XYZ kullanırız).
//
// Klinik anatomik landmark referansları (regions.ts'den uyumlu):
//   Yüz:        Y≈0.68, X=0, Z=+0.10 (anterior)
//   Burun:      Y≈0.66
//   Boyun:      Y≈0.62
//   Göğüs:      Y≈0.50-0.58 (V1-V6 EKG bölgeleri)
//   Sağ omuz:   X≈+0.085 (hasta sağı = anatomik sağ, gözlemci için sol)
//   Sol omuz:   X≈-0.085
//   Kol üst:    X≈±0.18, Y≈0.50
//   Önkol:      X≈±0.28, Y≈0.42
//   El:         X≈±0.34, Y≈0.36
//   Karın:      Y≈0.35-0.45
// ============================================================

import { memo } from "react";

export interface EquipmentState {
  /** Yüz oksijen maskesi — high-flow / non-rebreather */
  oxygenMask?: boolean;
  /** Nazal kanül — düşük akış O2 */
  nasalCannula?: boolean;
  /** EKG monitor elektrodları — göğüs lead'leri */
  ekgPatches?: boolean;
  /** IV kateter — sol önkol (klinik standart) */
  ivCatheter?: boolean;
  /** Kan basıncı manşonu — sağ kol üst */
  bpCuff?: boolean;
  /** Pulse oksimetre — sağ el işaret parmağı */
  pulseOximeter?: boolean;
  /** Sargı/pansuman — generic, lokal pozisyon */
  bandage?: { position: [number, number, number]; radius?: number };
}

// =============== O2 Maskesi (yüz) =================
function OxygenMask() {
  return (
    <group position={[0, 0.68, 0.10]}>
      {/* Mask shell — yarı saydam */}
      <mesh>
        <sphereGeometry args={[0.055, 20, 16, 0, Math.PI * 2, 0, Math.PI / 2.1]} />
        <meshStandardMaterial color="#b8d8e3" transparent opacity={0.5} roughness={0.2} metalness={0.05} />
      </mesh>
      {/* İç çerçeve */}
      <mesh>
        <torusGeometry args={[0.05, 0.004, 10, 32]} />
        <meshStandardMaterial color="#5c7882" roughness={0.4} />
      </mesh>
      {/* Üst elastik bant — kafanın etrafından */}
      <mesh position={[0, 0.045, -0.04]} rotation={[Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.045, 0.0025, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.7} />
      </mesh>
      {/* Alt elastik bant */}
      <mesh position={[0, -0.04, -0.04]} rotation={[-Math.PI / 2.2, 0, 0]}>
        <torusGeometry args={[0.045, 0.0025, 6, 16, Math.PI]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.7} />
      </mesh>
      {/* O2 konnektör tüp */}
      <mesh position={[0, -0.05, 0.02]} rotation={[Math.PI / 2.5, 0, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 0.05, 12]} />
        <meshStandardMaterial color="#3a5460" roughness={0.4} />
      </mesh>
      {/* Rezervuar torba — non-rebreather için alt kısımda */}
      <mesh position={[0, -0.13, 0.02]}>
        <sphereGeometry args={[0.035, 12, 12]} />
        <meshStandardMaterial color="#d4d4d4" transparent opacity={0.55} roughness={0.3} />
      </mesh>
    </group>
  );
}

// =============== Nazal Kanül (burun + kulak) =================
function NasalCannula() {
  return (
    <group position={[0, 0.665, 0.095]}>
      {/* İki burun prong */}
      <mesh position={[-0.008, 0.005, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.012, 8]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
      <mesh position={[0.008, 0.005, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.012, 8]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
      {/* Yatay üst dudak gövdesi */}
      <mesh position={[0, -0.005, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.045, 8]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
      {/* Sol kulağa giden tüp (curve simplified) */}
      <mesh position={[-0.05, -0.025, -0.02]} rotation={[0, 0, -Math.PI / 4]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.10, 6]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
      {/* Sağ kulağa giden tüp */}
      <mesh position={[0.05, -0.025, -0.02]} rotation={[0, 0, Math.PI / 4]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.10, 6]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
    </group>
  );
}

// =============== EKG Elektrodları (göğüs) =================
function EkgPatches() {
  // 10-lead klinik standart pozisyonlar (T-pose koordinat, V1-V6 + LA/RA/LL/RL)
  // Hasta sağı = +X (anatomik), hasta solu = -X
  // Anterior göğüs Z ≈ +0.10
  const patches: Array<{ pos: [number, number, number]; lead: string }> = [
    // Limb leads (kollar/bacaklar) — kontroller burada gövdeye konur (Mason-Likar 12-lead pozisyonu)
    { pos: [-0.085, 0.585, 0.095], lead: "LA" },  // sol omuz altı
    { pos: [0.085, 0.585, 0.095], lead: "RA" },   // sağ omuz altı
    { pos: [-0.085, 0.305, 0.095], lead: "LL" },  // sol alt kostal
    { pos: [0.085, 0.305, 0.095], lead: "RL" },   // sağ alt kostal
    // Precordial V1-V6 (4. ICS sternal kenarı boyunca)
    { pos: [0.030, 0.555, 0.105], lead: "V1" },  // 4. ICS sağ sternal
    { pos: [-0.030, 0.555, 0.105], lead: "V2" }, // 4. ICS sol sternal
    { pos: [-0.060, 0.535, 0.105], lead: "V3" }, // V2-V4 arası
    { pos: [-0.090, 0.520, 0.105], lead: "V4" }, // 5. ICS mid-klavikular
    { pos: [-0.115, 0.520, 0.090], lead: "V5" }, // 5. ICS anterior axiller
    { pos: [-0.130, 0.520, 0.070], lead: "V6" }, // 5. ICS mid-axiller
  ];
  return (
    <group>
      {patches.map((p, i) => (
        <group key={p.lead} position={p.pos}>
          {/* Yapışkan disk */}
          <mesh>
            <cylinderGeometry args={[0.011, 0.011, 0.002, 16]} />
            <meshStandardMaterial color="#f0e8d8" roughness={0.6} />
          </mesh>
          {/* Snap konnektör — metal nokta */}
          <mesh position={[0, 0.0012, 0]}>
            <cylinderGeometry args={[0.0035, 0.0035, 0.0025, 10]} />
            <meshStandardMaterial color="#cccccc" roughness={0.3} metalness={0.85} />
          </mesh>
          {/* Tel — kısa parça, klinik karışıklık simülasyonu */}
          {i < 4 && (
            <mesh position={[0, 0, 0.015]} rotation={[Math.PI / 2.5, 0, 0]}>
              <cylinderGeometry args={[0.0008, 0.0008, 0.03, 4]} />
              <meshStandardMaterial color={i === 0 ? "#dc2626" : i === 1 ? "#f59e0b" : i === 2 ? "#22c55e" : "#1a1a1f"} roughness={0.5} />
            </mesh>
          )}
        </group>
      ))}
    </group>
  );
}

// =============== IV Kateter (sol önkol) =================
function IvCatheter() {
  // Hasta sol önkol — anatomik sol = -X (gözlemci sağı)
  return (
    <group position={[-0.24, 0.42, 0.05]}>
      {/* Kateter göbeği — beyaz plastik */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.005, 0.005, 0.018, 10]} />
        <meshStandardMaterial color="#f5f5f0" roughness={0.4} />
      </mesh>
      {/* IV line tüpü — şeffaf, kola dik */}
      <mesh position={[-0.02, 0.04, 0.02]} rotation={[Math.PI / 3, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.10, 6]} />
        <meshStandardMaterial color="#e0eaf0" transparent opacity={0.5} roughness={0.3} />
      </mesh>
      {/* Tegaderm benzeri yapışkan film — saydam disk */}
      <mesh position={[0, 0, -0.001]}>
        <boxGeometry args={[0.04, 0.025, 0.001]} />
        <meshStandardMaterial color="#f5f5f0" transparent opacity={0.35} roughness={0.5} />
      </mesh>
    </group>
  );
}

// =============== BP Cuff (sağ kol üst) =================
function BpCuff() {
  // Hasta sağ kol üst = +X (anatomik sağ)
  return (
    <group position={[0.20, 0.52, 0]}>
      {/* Cuff gövdesi — koyu mavi geniş bant */}
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.052, 0.052, 0.10, 16]} />
        <meshStandardMaterial color="#2a3a48" roughness={0.85} />
      </mesh>
      {/* Velkro ek — açık gri */}
      <mesh position={[0.05, 0, 0.04]}>
        <boxGeometry args={[0.005, 0.10, 0.04]} />
        <meshStandardMaterial color="#6a7080" roughness={0.7} />
      </mesh>
      {/* Air tüp — alttan çıkan ince tüp */}
      <mesh position={[0, -0.08, 0.03]} rotation={[Math.PI / 2.5, 0, 0]}>
        <cylinderGeometry args={[0.003, 0.003, 0.10, 6]} />
        <meshStandardMaterial color="#2a3a48" roughness={0.4} />
      </mesh>
    </group>
  );
}

// =============== Pulse Oksimetre (sağ işaret parmağı) =================
function PulseOximeter() {
  // Hasta sağ el parmağı — +X yönü ucu
  return (
    <group position={[0.34, 0.36, 0]}>
      {/* Klip gövdesi — açık koyu plastik klips */}
      <mesh>
        <boxGeometry args={[0.025, 0.022, 0.030]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.2} />
      </mesh>
      {/* Kırmızı LED — emissive */}
      <mesh position={[0, 0, 0.016]}>
        <boxGeometry args={[0.018, 0.015, 0.001]} />
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.6} roughness={0.3} />
      </mesh>
      {/* Tel — koldan gelir */}
      <mesh position={[-0.03, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.002, 0.002, 0.04, 6]} />
        <meshStandardMaterial color="#1a1a1f" roughness={0.6} />
      </mesh>
    </group>
  );
}

// =============== Pansuman (generic, lokal) =================
function Bandage({ position, radius = 0.04 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position}>
      {/* Gazlı sargı — disk şekli, krem rengi */}
      <mesh>
        <cylinderGeometry args={[radius, radius, 0.004, 16]} />
        <meshStandardMaterial color="#f0e8d0" roughness={0.85} />
      </mesh>
      {/* Yapışkan kenarlık — daha açık */}
      <mesh position={[0, 0.0022, 0]}>
        <torusGeometry args={[radius * 1.05, 0.002, 6, 24]} />
        <meshStandardMaterial color="#e8d8b8" roughness={0.7} />
      </mesh>
    </group>
  );
}

interface Props {
  state: EquipmentState;
}

function PatientEquipmentImpl({ state }: Props) {
  return (
    <group name="PatientEquipment">
      {state.oxygenMask && <OxygenMask />}
      {state.nasalCannula && <NasalCannula />}
      {state.ekgPatches && <EkgPatches />}
      {state.ivCatheter && <IvCatheter />}
      {state.bpCuff && <BpCuff />}
      {state.pulseOximeter && <PulseOximeter />}
      {state.bandage && <Bandage position={state.bandage.position} radius={state.bandage.radius} />}
    </group>
  );
}

export const PatientEquipment = memo(PatientEquipmentImpl);
