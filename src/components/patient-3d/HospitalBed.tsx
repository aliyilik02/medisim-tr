// ============================================================
// HospitalBed — Sprint B.5+ klinik yatak (R3F primitive)
// ============================================================
// Hasta dik T-pose'da olan Rocketbox modeli world transform ile yatay
// rotate edilir; yatak hastanın altına konumlandırılır. Tüm boyutlar
// world unit (1 birim ≈ 1.8m). Klinik standart hasta yatağı:
//   200 cm uzunluk × 90 cm genişlik × ~70 cm yükseklik
// Wrapper transform ile model bbox (1.021m) ile uyumlu.
//
// Mesh seviyesi:
//   - Yatak gövdesi (tahta + metal çerçeve, koyu gri)
//   - Şilte (krem beyaz, hafif)
//   - Çarşaf (üst, parlak beyaz)
//   - Yastık (kafa hizasında)
// ============================================================

import { memo } from "react";

interface Props {
  /** Default false (gizli). Senaryo ortamı yatakta ise true. */
  visible?: boolean;
  /** Yatak position offset (eğer manken bbox değişirse fine-tune). */
  yOffset?: number;
}

function HospitalBedImpl({ visible = true, yOffset = 0 }: Props) {
  if (!visible) return null;

  // Yatak dünya koordinatları — manken bbox y[-0.243, 0.778] uyumlu.
  // Manken supine olduğunda boy 1.021 m world uzunluk (z-axis'e yatar).
  const BED_LEN = 1.3;   // 230 cm (hasta + kenar boşluk)
  const BED_WIDTH = 0.55; // 100 cm (hasta omuz + yan)
  const BED_HEIGHT = 0.08;

  // Yatak Y konumu — manken supine'da y ≈ 0 civarı, yatak hemen altında.
  const yBase = -0.27 + yOffset;

  return (
    <group position={[0, yBase, 0]}>
      {/* Yatak çerçevesi — koyu metal gri */}
      <mesh receiveShadow castShadow position={[0, -BED_HEIGHT / 2, 0]}>
        <boxGeometry args={[BED_LEN, BED_HEIGHT, BED_WIDTH]} />
        <meshStandardMaterial color="#2a2d33" roughness={0.7} metalness={0.3} />
      </mesh>

      {/* Şilte — krem */}
      <mesh receiveShadow position={[0, 0.045, 0]}>
        <boxGeometry args={[BED_LEN - 0.04, 0.025, BED_WIDTH - 0.04]} />
        <meshStandardMaterial color="#e8e0d0" roughness={0.95} />
      </mesh>

      {/* Çarşaf — beyaz parlak */}
      <mesh receiveShadow position={[0, 0.06, 0]}>
        <boxGeometry args={[BED_LEN - 0.02, 0.005, BED_WIDTH - 0.02]} />
        <meshStandardMaterial color="#f5f6f8" roughness={0.85} />
      </mesh>

      {/* Yastık — kafa hizasında (+X yönü kafa) */}
      <mesh receiveShadow castShadow position={[BED_LEN / 2 - 0.18, 0.10, 0]}>
        <boxGeometry args={[0.32, 0.07, 0.36]} />
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Yatak ayakları — 4 köşe */}
      {[
        [BED_LEN / 2 - 0.05, -BED_HEIGHT - 0.15, BED_WIDTH / 2 - 0.05],
        [BED_LEN / 2 - 0.05, -BED_HEIGHT - 0.15, -BED_WIDTH / 2 + 0.05],
        [-BED_LEN / 2 + 0.05, -BED_HEIGHT - 0.15, BED_WIDTH / 2 - 0.05],
        [-BED_LEN / 2 + 0.05, -BED_HEIGHT - 0.15, -BED_WIDTH / 2 + 0.05],
      ].map(([x, y, z], i) => (
        <mesh key={i} castShadow position={[x, y, z]}>
          <cylinderGeometry args={[0.025, 0.025, 0.3, 8]} />
          <meshStandardMaterial color="#1a1d22" roughness={0.5} metalness={0.7} />
        </mesh>
      ))}

      {/* Yatak başlık (head rail) — kafa ucu kalkık metal çubuk */}
      <mesh castShadow position={[BED_LEN / 2 + 0.02, 0.18, 0]}>
        <boxGeometry args={[0.03, 0.4, BED_WIDTH - 0.02]} />
        <meshStandardMaterial color="#3a3d43" roughness={0.4} metalness={0.85} />
      </mesh>

      {/* Yatak ayak ucu rail */}
      <mesh castShadow position={[-BED_LEN / 2 - 0.02, 0.12, 0]}>
        <boxGeometry args={[0.03, 0.25, BED_WIDTH - 0.02]} />
        <meshStandardMaterial color="#3a3d43" roughness={0.4} metalness={0.85} />
      </mesh>
    </group>
  );
}

export const HospitalBed = memo(HospitalBedImpl);
