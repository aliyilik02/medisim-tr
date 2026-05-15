import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PerspectiveCamera, type Group } from "three";
import { AnatomicPatientModel } from "./AnatomicPatientModel";
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
    Drei makeDefault + Suspense + lazy chunk kombinasyonu yarış yapıyor;
    useThree+useEffect pattern garantili. Model bbox y[-0.24, 0.78],
    center y=0.27 → camera y=0.27 lookAt aynı. */
function CameraRig({ position, fov }: { position: [number, number, number]; fov: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    camera.position.set(...position);
    camera.lookAt(0, 0.27, 0);
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

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Hasta yükleniyor…
      </div>
    </Html>
  );
}

export function PatientBody3D({
  regions,
  breathing = true,
  onRegionSelect,
  className,
}: Props) {
  const [selected, setSelected] = useState<PatientRegion | null>(null);
  const bodyRef = useRef<Group>(null);

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
        {/* Model height ~1.02 birim, %65 hedef → view 1.57, fov 32 → dist ≈ 2.73 */}
        <CameraRig position={[0, 0.27, 2.73]} fov={32} />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[2, 3, 4]}
          intensity={0.85}
          castShadow
          shadow-mapSize-width={1024}
          shadow-mapSize-height={1024}
        />
        <directionalLight position={[-2, 1, 1]} intensity={0.3} color="#7cb342" />
        <hemisphereLight args={["#ffffff", "#1a1a1f", 0.35]} />

        <Suspense fallback={<LoadingFallback />}>
          <AnatomicPatientModel ref={bodyRef} />
          <BreathingController chestRef={bodyRef} enabled={breathing} />
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
