import { forwardRef } from "react";
import type { Group } from "three";

// Procedural torso: göğüs (sphere) + karın (cylinder) + omuz uçları (sphere).
// CapsuleGeometry kullanılmıyor — three.js sürümleri arası uyumluluk için
// sadece Sphere + Cylinder kombinasyonu. Toplam vertex ~ 1.5k.

export const TorsoMesh = forwardRef<Group>((_props, ref) => {
  const skinColor = "#d4a487";
  return (
    <group ref={ref}>
      {/* Göğüs kafesi — hafif yatay elipsoid */}
      <mesh position={[0, 0.55, 0]} scale={[0.95, 0.85, 0.55]} castShadow receiveShadow>
        <sphereGeometry args={[0.55, 24, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Karın — sphere → cylinder geçişi için hafif daraltılmış silindir */}
      <mesh position={[0, -0.05, 0]} scale={[0.95, 1, 0.55]} castShadow receiveShadow>
        <cylinderGeometry args={[0.48, 0.42, 0.85, 24, 1, false]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Alt karın yuvarlatma */}
      <mesh position={[0, -0.55, 0]} scale={[0.85, 0.5, 0.5]} castShadow receiveShadow>
        <sphereGeometry args={[0.5, 20, 14]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sol omuz */}
      <mesh position={[-0.62, 0.78, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Sağ omuz */}
      <mesh position={[0.62, 0.78, 0]} castShadow receiveShadow>
        <sphereGeometry args={[0.22, 16, 12]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>

      {/* Boyun tabanı (cylinder, kısa) */}
      <mesh position={[0, 1.05, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.2, 0.25, 16]} />
        <meshStandardMaterial color={skinColor} roughness={0.85} metalness={0.05} />
      </mesh>
    </group>
  );
});

TorsoMesh.displayName = "TorsoMesh";
