// ============================================================
// SupplyCabinet — malzeme dolabı (prosedürel, GLB yok)
// ============================================================
// Duvar kenarı camlı dolap: metal kasa + yarı saydam cam kapak +
// 2 raf + rafların üstünde renkli malzeme kutuları (stok hissi).
// ~1.15 birim ≈ 1.8m yüksek. Origin = zemin. Yerel +Z = dolabın önü
// (cam yüzü) — duvara karşı yerleştirirken rotation ile odaya döndür.
// Draw call: 8 (kasa, cam, 2 raf, 4 kutu). Gölge sadece kasada.
// ============================================================

import {
  MAT_PANEL_WHITE,
  MAT_GLASS,
  MAT_METAL_LIGHT,
  MAT_BOX_TEAL,
  MAT_BOX_BLUE,
  MAT_BOX_AMBER,
  MAT_CART_RED,
} from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function SupplyCabinet({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* kasa — açık gri hastane dolabı */}
      <mesh position={[0, 0.575, 0]} material={MAT_PANEL_WHITE} castShadow>
        <boxGeometry args={[0.6, 1.15, 0.28]} />
      </mesh>
      {/* cam kapak — kasanın önünde yarı saydam düzlem */}
      <mesh position={[0, 0.62, 0.145]} material={MAT_GLASS}>
        <planeGeometry args={[0.52, 0.92]} />
      </mesh>
      {/* 2 raf — camın arkasında görünür çizgi */}
      <mesh position={[0, 0.48, 0.08]} material={MAT_METAL_LIGHT}>
        <boxGeometry args={[0.52, 0.014, 0.12]} />
      </mesh>
      <mesh position={[0, 0.78, 0.08]} material={MAT_METAL_LIGHT}>
        <boxGeometry args={[0.52, 0.014, 0.12]} />
      </mesh>
      {/* raflarda renkli malzeme kutuları (sarf stok hissi) */}
      <mesh position={[-0.14, 0.545, 0.08]} material={MAT_BOX_TEAL}>
        <boxGeometry args={[0.13, 0.1, 0.1]} />
      </mesh>
      <mesh position={[0.1, 0.535, 0.08]} material={MAT_BOX_AMBER}>
        <boxGeometry args={[0.14, 0.08, 0.1]} />
      </mesh>
      <mesh position={[-0.1, 0.85, 0.08]} material={MAT_BOX_BLUE}>
        <boxGeometry args={[0.15, 0.11, 0.1]} />
      </mesh>
      <mesh position={[0.13, 0.84, 0.08]} material={MAT_CART_RED}>
        <boxGeometry args={[0.11, 0.09, 0.1]} />
      </mesh>
    </group>
  );
}
