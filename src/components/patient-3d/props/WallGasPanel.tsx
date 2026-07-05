// ============================================================
// WallGasPanel — yatak başı duvar gaz paneli (prosedürel, GLB yok)
// ============================================================
// Hastane gaz kod renkleri: O2 çıkışı BEYAZ, vakum SARI (TS/ISO
// yerleşik pratik). Panel plakası + 2 çıkış + her çıkışın altında
// yarı saydam flowmetre silindiri. Origin = panelin merkezi
// (position.y'ye montaj yüksekliği verilir). Yerel +Z = odaya bakan yüz.
// Draw call: 5. Küçük parça — gölge yok.
// ============================================================

import {
  MAT_PANEL_WHITE,
  MAT_VAC_YELLOW,
  MAT_METAL_LIGHT,
  MAT_DRIP_GLASS,
} from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function WallGasPanel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* panel plakası — metal ray görünümü */}
      <mesh position={[0, 0, 0]} material={MAT_METAL_LIGHT}>
        <boxGeometry args={[0.75, 0.22, 0.025]} />
      </mesh>
      {/* O2 çıkışı — BEYAZ soket (ekseni duvara dik) */}
      <mesh position={[-0.18, 0.02, 0.025]} rotation={[Math.PI / 2, 0, 0]} material={MAT_PANEL_WHITE}>
        <cylinderGeometry args={[0.022, 0.022, 0.035, 14]} />
      </mesh>
      {/* vakum çıkışı — SARI soket */}
      <mesh position={[0.18, 0.02, 0.025]} rotation={[Math.PI / 2, 0, 0]} material={MAT_VAC_YELLOW}>
        <cylinderGeometry args={[0.022, 0.022, 0.035, 14]} />
      </mesh>
      {/* flowmetre silindirleri — çıkışların altında yarı saydam ölçüm tüpü */}
      <mesh position={[-0.18, -0.115, 0.03]} material={MAT_DRIP_GLASS}>
        <cylinderGeometry args={[0.013, 0.013, 0.1, 10]} />
      </mesh>
      <mesh position={[0.18, -0.115, 0.03]} material={MAT_DRIP_GLASS}>
        <cylinderGeometry args={[0.013, 0.013, 0.1, 10]} />
      </mesh>
    </group>
  );
}
