// ============================================================
// WasteBin — tıbbi atık kovası (prosedürel, küçük dolgu parçası)
// ============================================================
// Konik gövde + üst kenardan taşan KIRMIZI torba şeridi (Türkiye'de
// tıbbi atık torbası kırmızıdır — Tıbbi Atıkların Kontrolü Yön.).
// Origin = sahne y=0 hizası (zemin -0.27; IVPole deseni).
// Draw call: 2, gölge yok.
// ============================================================

import { MAT_PLASTIC_DARK, MAT_CART_RED } from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function WasteBin({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* kova gövdesi — hafif konik */}
      <mesh position={[0, -0.12, 0]} material={MAT_PLASTIC_DARK}>
        <cylinderGeometry args={[0.09, 0.072, 0.3, 14]} />
      </mesh>
      {/* kırmızı atık torbası kenarı — gövde ağzından taşan şerit */}
      <mesh position={[0, 0.032, 0]} material={MAT_CART_RED}>
        <cylinderGeometry args={[0.094, 0.088, 0.025, 14]} />
      </mesh>
    </group>
  );
}
