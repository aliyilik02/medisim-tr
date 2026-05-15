import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Bounds } from "@react-three/drei";
import type { Group } from "three";
import { TorsoMesh } from "./TorsoMesh";
import { RegionMarker } from "./RegionMarker";
import { BreathingController } from "./BreathingController";
import { InspectionPanel } from "./InspectionPanel";
import type { PatientRegion } from "./regions";

interface Props {
  regions: PatientRegion[];
  breathing?: boolean;
  /** Test ortamında onSelect'i dışarıdan dinleyebilmek için opsiyonel callback. */
  onRegionSelect?: (region: PatientRegion) => void;
  className?: string;
}

export function PatientBody3D({
  regions,
  breathing = true,
  onRegionSelect,
  className,
}: Props) {
  const [selected, setSelected] = useState<PatientRegion | null>(null);
  const chestRef = useRef<Group>(null);
  const abdomenRef = useRef<Group>(null);

  const handleSelect = (region: PatientRegion) => {
    setSelected(region);
    onRegionSelect?.(region);
  };

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-3d-canvas"
        camera={{ position: [0, 0.3, 4.5], fov: 32 }}
        frameloop={breathing ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <color attach="background" args={["#0a0a0c"]} />

        <ambientLight intensity={0.45} />
        <directionalLight
          position={[2, 3, 4]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-2, 1, 1]} intensity={0.3} color="#7cb342" />
        <hemisphereLight args={["#ffffff", "#1a1a1f", 0.35]} />

        <Suspense fallback={null}>
          {/* Bounds: torso bbox'una göre kamera auto-fit. Markerlar Bounds
              dışında render ediliyor ki bbox onları kapsamasın ama transform
              torso ile ortak world space'te kaldığı için doğru yerde dururlar. */}
          <Bounds fit clip margin={1.15}>
            <TorsoMesh chestRef={chestRef} abdomenRef={abdomenRef} />
          </Bounds>
          <BreathingController
            chestRef={chestRef}
            abdomenRef={abdomenRef}
            enabled={breathing}
          />
          {regions.map((region) => (
            <RegionMarker
              key={region.id}
              region={region}
              selected={selected?.id === region.id}
              onSelect={handleSelect}
            />
          ))}
        </Suspense>
      </Canvas>

      <InspectionPanel region={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
