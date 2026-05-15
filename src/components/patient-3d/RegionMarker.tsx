import { useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import type { PatientRegion } from "./regions";

interface Props {
  region: PatientRegion;
  selected: boolean;
  onSelect: (region: PatientRegion) => void;
}

export function RegionMarker({ region, selected, onSelect }: Props) {
  const [hovered, setHovered] = useState(false);

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onSelect(region);
  };

  const handleEnter = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setHovered(true);
    document.body.style.cursor = "pointer";
  };

  const handleLeave = () => {
    setHovered(false);
    document.body.style.cursor = "default";
  };

  const baseColor = "#7cb342"; // brand
  const activeColor = "#aef060";
  const emissive = selected ? activeColor : hovered ? baseColor : "#000000";
  const emissiveIntensity = selected ? 1.2 : hovered ? 0.6 : 0;

  return (
    <mesh
      position={region.position}
      onClick={handleClick}
      onPointerOver={handleEnter}
      onPointerOut={handleLeave}
    >
      <sphereGeometry args={[0.035, 16, 12]} />
      <meshStandardMaterial
        color={selected ? activeColor : baseColor}
        emissive={emissive}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={hovered || selected ? 0.95 : 0.65}
      />
    </mesh>
  );
}
