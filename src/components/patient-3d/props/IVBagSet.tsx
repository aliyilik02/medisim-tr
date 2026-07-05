// ============================================================
// IVBagSet — serum askısı torbası + damla haznesi (prosedürel)
// ============================================================
// Mevcut IVPole'un askı koluna asılır (direği YENİDEN yapmaz).
// Origin = askı noktası (kolun altı); set aşağı doğru sarkar:
// kanca → yarı saydam sıvı torbası → port → damla haznesi → IV hattı.
// PatientRoomScene IVPole içindeki eski tek-mesh torba/hat bunun ile
// değiştirildi (görsel yükseltme, net +3 draw call).
// Draw call: 5. Küçük parça — gölge sadece torbada.
// ============================================================

import {
  MAT_METAL_LIGHT,
  MAT_FLUID_BAG,
  MAT_DRIP_GLASS,
  MAT_TUBE,
} from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

export function IVBagSet({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* askı kancası — kol ile torba arasında ince halka boynu */}
      <mesh position={[0, -0.015, 0]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.004, 0.004, 0.03, 8]} />
      </mesh>
      {/* sıvı torbası — yarı saydam (içi dolu his: opaklık 0.75) */}
      <mesh position={[0, -0.115, 0]} material={MAT_FLUID_BAG} castShadow>
        <boxGeometry args={[0.09, 0.17, 0.028]} />
      </mesh>
      {/* torba alt portu */}
      <mesh position={[0, -0.21, 0]} material={MAT_TUBE}>
        <cylinderGeometry args={[0.007, 0.007, 0.02, 8]} />
      </mesh>
      {/* damla haznesi — saydam silindir (damlama gözlem odası) */}
      <mesh position={[0, -0.245, 0]} material={MAT_DRIP_GLASS}>
        <cylinderGeometry args={[0.012, 0.012, 0.05, 10]} />
      </mesh>
      {/* IV hattı — hazneden hastaya doğru inen ince hortum */}
      <mesh position={[0, -0.45, 0]} material={MAT_TUBE}>
        <cylinderGeometry args={[0.0028, 0.0028, 0.36, 6]} />
      </mesh>
    </group>
  );
}
