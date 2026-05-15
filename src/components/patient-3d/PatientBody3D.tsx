import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
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
  const torsoRef = useRef<Group>(null);

  const handleSelect = (region: PatientRegion) => {
    setSelected(region);
    onRegionSelect?.(region);
  };

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-3d-canvas"
        camera={{ position: [0, 0.2, 2.6], fov: 38 }}
        frameloop={breathing ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <color attach="background" args={["#0a0a0c"]} />

        <ambientLight intensity={0.4} />
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
          <group>
            <TorsoMesh ref={torsoRef} />
            <BreathingController targetRef={torsoRef} enabled={breathing} />
            {regions.map((region) => (
              <RegionMarker
                key={region.id}
                region={region}
                selected={selected?.id === region.id}
                onSelect={handleSelect}
              />
            ))}
          </group>
        </Suspense>
      </Canvas>

      <InspectionPanel region={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
