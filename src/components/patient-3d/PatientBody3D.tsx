import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { PerspectiveCamera, type Group } from "three";
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

/** Canvas içinde default kamerayı manuel pozisyon + fov ile zorla.
    Drei <PerspectiveCamera makeDefault> + Suspense + lazy chunk kombinasyonu
    bazen yarış yapıyor; useEffect senkron pattern garantili. */
function CameraRig({ position, fov }: { position: [number, number, number]; fov: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0.5, 0);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
      camera.near = 0.1;
      camera.far = 50;
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height, position, fov]);
  return null;
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
        frameloop={breathing ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        shadows
      >
        <color attach="background" args={["#0a0a0c"]} />
        <CameraRig position={[0, 0.5, 7.0]} fov={32} />

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
          <TorsoMesh chestRef={chestRef} abdomenRef={abdomenRef} />
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
