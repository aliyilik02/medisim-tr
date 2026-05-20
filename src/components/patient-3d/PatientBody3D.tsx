import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PerspectiveCamera, Plane, Vector3, type Group } from "three";
import { AnatomicPatientModel, type SkinTint } from "./AnatomicPatientModel";
import { InternalOrgans } from "./InternalOrgans";
import { RegionMarker } from "./RegionMarker";
import { InspectionPanel } from "./InspectionPanel";
import { ProcedureOverlay } from "./procedures/ProcedureOverlay";
import type { ProcedureContext, ProcedureKind } from "./procedures/types";
import type { PatientRegion } from "./regions";
import type { ActionRef } from "@/engine/types";
import { playAuscultation, stopAuscultation } from "./auscultationAudio";

interface Props {
  regions: PatientRegion[];
  breathing?: boolean;
  /** Sprint B.4.1: Cilt tonu — vital değişimine göre senaryo motorundan gelir. */
  skinTint?: SkinTint;
  /** Sprint B.2 entegrasyon: hasta konuşurken ağız bölgesi shader oscillation. */
  speaking?: boolean;
  /**
   * Sprint B.4 — Cilt kesim seviyesi (0.0-1.0).
   * 1.0 = cilt tamamen kapalı (default).
   * 0.0 = cilt tamamen açık, iç organlar görünür.
   * Slider ile yukarıdan aşağıya kademeli açılma.
   */
  skinClipLevel?: number;
  /** B.4 — Kalp/akciğer animasyon hızı için vital'ler. */
  organVitals?: { hr: number; rr: number };
  /** Test ortamında onSelect'i dışarıdan dinleyebilmek için opsiyonel callback. */
  onRegionSelect?: (region: PatientRegion) => void;
  /** Sprint B.2.1: Prosedür animasyonu tamamlandığında engine'e iletilecek ActionRef. */
  onProcedureComplete?: (action: ActionRef) => void;
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

// Prosedür tamamlandıktan sonra overlay sahnede kaç ms daha kalsın
// (kullanıcı sonucu görsün, ses cue çalsın). Sonra unmount.
const PROCEDURE_REST_MS = 800;

export function PatientBody3D({
  regions,
  breathing = true,
  skinTint = "normal",
  speaking = false,
  skinClipLevel = 1.0,
  organVitals,
  onRegionSelect,
  onProcedureComplete,
  className,
}: Props) {
  const [selected, setSelected] = useState<PatientRegion | null>(null);
  const [activeProcedure, setActiveProcedure] = useState<ProcedureContext | null>(null);
  const bodyRef = useRef<Group>(null);

  // Sprint B.4 — Anatomik atlas tarzı clipping:
  // Anterior cilt kaldırılır, baş + kollar + bacaklar + sırt görünür kalır.
  // Model world z bbox ≈ [-0.08, 0.09]. Plane normal (0, 0, -1) anterior'a bakar.
  // skinClipLevel=1.0 → zClip=0.09 (etkisiz, hiçbir şey clip)
  // skinClipLevel=0.0 → zClip=-0.08 (tüm anterior clip, sadece sırt görünür)
  //
  // Bonus üst sınır: clip sadece chest+abdomen seviyesinde (y 0.20-0.65 arası).
  // Bunun için ikinci bir plane (y normal) eklemek gerekir. Şimdilik tek plane
  // yeterli — kafa kısmen clip olur ama görsel olarak daha iyi y range kontrolü
  // ileride eklenebilir.
  const zClip = useMemo(() => {
    return 0.09 - (1 - skinClipLevel) * 0.17;
  }, [skinClipLevel]);

  const clippingPlanes = useMemo(() => {
    if (skinClipLevel >= 0.99) return undefined; // clipping yok
    // Plane normal (0, 0, -1), z > zClip clipped (anterior tarafı kalkar)
    return [new Plane(new Vector3(0, 0, -1), zClip)];
  }, [zClip, skinClipLevel]);

  const showOrgans = skinClipLevel < 0.95;

  const handleSelect = (region: PatientRegion) => {
    setSelected(region);
    onRegionSelect?.(region);
  };

  const handleStartProcedure = (kind: ProcedureKind, region: PatientRegion) => {
    setSelected(null);
    setActiveProcedure({
      kind,
      regionId: region.id,
      targetPosition: region.position,
    });
  };

  const handleProcedureComplete = (context: ProcedureContext) => {
    const action: ActionRef = {
      type: "procedure",
      target_id: context.kind,
      site: context.regionId,
    };
    onProcedureComplete?.(action);

    // Sprint B.4.7: Stetoskop için region'un ses ID'sini çal (5 saniye).
    if (context.kind === "stethoscope") {
      const region = regions.find((r) => r.id === context.regionId);
      if (region?.auscultationSoundId) {
        playAuscultation(region.auscultationSoundId, 5000);
      }
    }

    window.setTimeout(() => setActiveProcedure(null), PROCEDURE_REST_MS);
  };

  // Component unmount'ta çalan sesi durdur (memory leak önle).
  useEffect(() => {
    return () => stopAuscultation();
  }, []);

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-3d-canvas"
        frameloop={breathing || activeProcedure || speaking ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{
          localClippingEnabled: true,
          antialias: true,
          powerPreference: "high-performance",
        }}
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
          <AnatomicPatientModel
            ref={bodyRef}
            breathing={breathing}
            skinTint={skinTint}
            speaking={speaking}
            clippingPlanes={clippingPlanes}
          />
          {showOrgans && (
            <InternalOrgans
              hr={organVitals?.hr ?? 75}
              rr={organVitals?.rr ?? 14}
              visible={showOrgans}
            />
          )}
          {regions.map((region) => (
            <RegionMarker
              key={region.id}
              region={region}
              selected={selected?.id === region.id}
              onSelect={handleSelect}
            />
          ))}
          <ProcedureOverlay active={activeProcedure} onComplete={handleProcedureComplete} />
        </Suspense>
      </Canvas>

      <InspectionPanel
        region={selected}
        onClose={() => setSelected(null)}
        onStartProcedure={handleStartProcedure}
      />
    </div>
  );
}
