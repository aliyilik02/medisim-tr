// ============================================================
// CrashCart — arrest arabası (prosedürel, GLB yok)
// ============================================================
// Kırmızı çekmeceli acil arabası + üstünde defibrilatör ünitesi
// (teal ekran + 2 kaşık). Dünya birimi: 1 birim ≈ 1.57m → araba
// ~0.55 birim ≈ 86cm yüksek. Origin = zemin seviyesi (position.y'ye
// oda zemini verilir). Yerel +Z = arabanın önü (çekmece yüzü).
// Draw call: 13 (4 teker, gövde, 3 çekmece, üst tabla, defib gövde,
// ekran, 2 kaşık). Gölge sadece büyük gövdede.
// ============================================================

import {
  MAT_CART_RED,
  MAT_CART_RED_DARK,
  MAT_METAL_DARK,
  MAT_PLASTIC_DARK,
  MAT_SCREEN_TEAL,
  MAT_PANEL_WHITE,
} from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function CrashCart({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  // Teker konumları (gövde altı 4 köşe)
  const wheels: [number, number][] = [
    [-0.13, -0.08], [0.13, -0.08], [-0.13, 0.08], [0.13, 0.08],
  ];
  // Çekmece önleri (alttan üste)
  const drawerYs = [0.16, 0.3, 0.44];
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* tekerler — eksen X yönünde (rulet görünümü) */}
      {wheels.map(([x, z], i) => (
        <mesh key={`w${i}`} position={[x, 0.03, z]} rotation={[0, 0, Math.PI / 2]} material={MAT_PLASTIC_DARK}>
          <cylinderGeometry args={[0.025, 0.025, 0.02, 10]} />
        </mesh>
      ))}
      {/* kırmızı gövde */}
      <mesh position={[0, 0.31, 0]} material={MAT_CART_RED} castShadow>
        <boxGeometry args={[0.34, 0.5, 0.24]} />
      </mesh>
      {/* çekmece önleri — gövdeden hafif dışarı, koyu kırmızı */}
      {drawerYs.map((y, i) => (
        <mesh key={`d${i}`} position={[0, y, 0.125]} material={MAT_CART_RED_DARK}>
          <boxGeometry args={[0.3, 0.11, 0.012]} />
        </mesh>
      ))}
      {/* üst tabla (metal) */}
      <mesh position={[0, 0.57, 0]} material={MAT_METAL_DARK}>
        <boxGeometry args={[0.36, 0.02, 0.26]} />
      </mesh>
      {/* defibrilatör ünitesi — koyu kasa */}
      <mesh position={[0, 0.645, -0.02]} material={MAT_PLASTIC_DARK} castShadow>
        <boxGeometry args={[0.2, 0.13, 0.15]} />
      </mesh>
      {/* defib ekranı — öne hafif eğik, parlayan teal */}
      <mesh position={[0, 0.655, 0.056]} rotation={[-0.18, 0, 0]} material={MAT_SCREEN_TEAL}>
        <planeGeometry args={[0.14, 0.08]} />
      </mesh>
      {/* 2 kaşık (paddle) — üstte yan yana yatık diskler */}
      <mesh position={[-0.055, 0.72, -0.02]} material={MAT_PANEL_WHITE}>
        <cylinderGeometry args={[0.028, 0.028, 0.022, 12]} />
      </mesh>
      <mesh position={[0.055, 0.72, -0.02]} material={MAT_PANEL_WHITE}>
        <cylinderGeometry args={[0.028, 0.028, 0.022, 12]} />
      </mesh>
    </group>
  );
}
