// ============================================================
// StaffStool — personel taburesi (prosedürel, küçük dolgu parçası)
// ============================================================
// Yuvarlak tabanlı klinik tabure: taban diski + gaz amortisör
// kolonu + oturak. Origin = sahne y=0 hizası (zemin -0.27'ye
// negatif ofsetle iner; IVPole deseni). Draw call: 3, gölge yok.
// ============================================================

import { MAT_METAL_LIGHT, MAT_PLASTIC_DARK, MAT_SEAT } from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function StaffStool({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* taban diski (zemin y=-0.27 üstünde) */}
      <mesh position={[0, -0.258, 0]} material={MAT_PLASTIC_DARK}>
        <cylinderGeometry args={[0.14, 0.15, 0.024, 14]} />
      </mesh>
      {/* gaz amortisör kolonu */}
      <mesh position={[0, -0.1, 0]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.018, 0.022, 0.29, 10]} />
      </mesh>
      {/* oturak — koyu teal-alt-tonlu döşeme (yerden ~52cm) */}
      <mesh position={[0, 0.06, 0]} material={MAT_SEAT}>
        <cylinderGeometry args={[0.15, 0.13, 0.05, 16]} />
      </mesh>
    </group>
  );
}
