// ============================================================
// PrivacyCurtain — paravan/perde (prosedürel, GLB yok)
// ============================================================
// Tavana asılı ray + yarı toplanmış kumaş perde. Kumaş, yatay
// yönde sinüs kıvrımlı düzlem (PlaneGeometry vertex displace,
// useMemo'da BİR KEZ hesaplanır — per-frame maliyet yok).
// Origin = zemin hizası (position.y'ye oda-taban ofseti VERİLMEZ,
// sahnede y=0 grubuyla kullanılır; IVPole deseni). Ray yerel Z
// boyunca uzanır; kumaş rayın foot-ucu yarısında toplanmış durur.
// Draw call: 4 (ray, 2 tavan askısı, kumaş). Gölge sadece kumaşta.
// ============================================================

import { useMemo } from "react";
import { PlaneGeometry } from "three";
import { MAT_METAL_LIGHT, MAT_CURTAIN } from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

// Kıvrımlı perde geometrisi — genişlik boyunca sık sinüs dalgası
// (yarı toplanmış kumaş hissi). Kenarlarda genlik sıfırlanır ki
// perde uçları raya "tutunmuş" görünsün.
function makeCurtainGeometry(width: number, height: number): PlaneGeometry {
  const geo = new PlaneGeometry(width, height, 48, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i) / width + 0.5; // 0..1
    const edge = Math.sin(u * Math.PI); // kenarlarda 0 → uçlar rayda
    pos.setZ(i, Math.sin(u * Math.PI * 9) * 0.035 * edge);
  }
  geo.computeVertexNormals();
  return geo;
}

export function PrivacyCurtain({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  const fabric = useMemo(() => makeCurtainGeometry(0.55, 0.95), []);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* ray — yerel Z boyunca yatay boru */}
      <mesh position={[0, 1.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.012, 0.012, 1.7, 10]} />
      </mesh>
      {/* tavan askıları — ray uçlarından tavana ince çubuk */}
      <mesh position={[0, 1.28, -0.7]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
      </mesh>
      <mesh position={[0, 1.28, 0.7]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.006, 0.006, 0.2, 6]} />
      </mesh>
      {/* kumaş — yarı toplanmış, rayın foot-ucu yarısında; düzlem
          XY'de üretildi → 90° Y dönüşüyle Z boyunca durur */}
      <mesh
        geometry={fabric}
        material={MAT_CURTAIN}
        position={[0, 0.69, 0.5]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      />
    </group>
  );
}
