import type { RefObject } from "react";
import { RoundedBox } from "@react-three/drei";
import type { Group } from "three";

// ============================================================
// Procedural torso — anatomik orantı (Sprint A.1)
// ============================================================
// Parçalar: kafa + boyun + göğüs (V-şekli) + karın + omuz/deltoid +
// üst kol stub'ları. Tüm parçalar aynı meshStandardMaterial reçetesi.
// Üst kol'lar görsel — raycast={() => null} ile marker tıklamaya
// karışmıyor. Yüz/saç/el/ayak detayı yok (out of scope).
// chestRef ve abdomenRef breathing animation için ayrı pivot'lar.
// ============================================================

const SKIN = "#d4a896";
const ROUGHNESS = 0.6;
const METALNESS = 0;

interface Props {
  chestRef: RefObject<Group>;
  abdomenRef: RefObject<Group>;
}

export function TorsoMesh({ chestRef, abdomenRef }: Props) {
  return (
    <group>
      {/* Göğüs bloğu — kafa, boyun, göğüs, omuzlar, kollar (breathing: göğüs > karın) */}
      <group ref={chestRef}>
        {/* Kafa */}
        <mesh position={[0, 1.55, 0]} castShadow>
          <sphereGeometry args={[0.3, 32, 24]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>

        {/* Boyun */}
        <mesh position={[0, 1.22, 0]} castShadow>
          <cylinderGeometry args={[0.13, 0.16, 0.3, 20]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>

        {/* Göğüs — RoundedBox, V-şekli üst kısmı */}
        <RoundedBox
          args={[1.0, 0.7, 0.5]}
          radius={0.12}
          smoothness={4}
          position={[0, 0.7, 0]}
          castShadow
        >
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </RoundedBox>

        {/* Sol deltoid */}
        <mesh position={[-0.55, 0.95, 0]} castShadow>
          <sphereGeometry args={[0.22, 20, 16]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>

        {/* Sağ deltoid */}
        <mesh position={[0.55, 0.95, 0]} castShadow>
          <sphereGeometry args={[0.22, 20, 16]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>

        {/* Sol üst kol — omuzdan 25° dışa-aşağı (raycast off)
            Z ekseni rotation negatif → sol omuzdan sola-aşağı */}
        <group position={[-0.55, 0.95, 0]} rotation={[0, 0, -0.42]}>
          <mesh position={[0, -0.4, 0]} castShadow raycast={() => null}>
            <cylinderGeometry args={[0.14, 0.115, 0.75, 18]} />
            <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
          </mesh>
        </group>

        {/* Sağ üst kol — pozitif rotation, sağ omuzdan sağa-aşağı */}
        <group position={[0.55, 0.95, 0]} rotation={[0, 0, 0.42]}>
          <mesh position={[0, -0.4, 0]} castShadow raycast={() => null}>
            <cylinderGeometry args={[0.14, 0.115, 0.75, 18]} />
            <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
          </mesh>
        </group>
      </group>

      {/* Karın bloğu — kostal geçiş + bel + alt karın yuvarlatma */}
      <group ref={abdomenRef}>
        {/* Göğüs-karın geçişi (kostal kemer) */}
        <mesh position={[0, 0.3, 0]} scale={[0.95, 1, 0.55]} castShadow>
          <cylinderGeometry args={[0.46, 0.42, 0.2, 24]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>

        {/* Bel — RoundedBox, V-şeklinin alt darlığı */}
        <RoundedBox
          args={[0.78, 0.65, 0.46]}
          radius={0.1}
          smoothness={4}
          position={[0, -0.15, 0]}
          castShadow
        >
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </RoundedBox>

        {/* Alt karın yuvarlatma (kalça başlangıcı) */}
        <mesh position={[0, -0.6, 0]} scale={[0.85, 0.55, 0.5]} castShadow>
          <sphereGeometry args={[0.46, 24, 16]} />
          <meshStandardMaterial color={SKIN} roughness={ROUGHNESS} metalness={METALNESS} />
        </mesh>
      </group>
    </group>
  );
}
