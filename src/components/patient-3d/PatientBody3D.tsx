import { Suspense, useEffect, useRef, useState } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { PerspectiveCamera, type Group } from "three";
import { AnatomicPatientModel, type SkinTint } from "./AnatomicPatientModel";
import {
  DEFAULT_PATIENT_VARIANT,
  DEFAULT_SKIN_TONE,
  type PatientVariant,
  type SkinTone,
} from "./patientModels";
import { RegionMarker } from "./RegionMarker";
import { InspectionPanel } from "./InspectionPanel";
import { ProcedureOverlay } from "./procedures/ProcedureOverlay";
import { AttachedEquipmentLayer } from "./procedures/AttachedEquipmentLayer";
import type { ProcedureContext, ProcedureKind } from "./procedures/types";
import type { PatientRegion } from "./regions";
import type { ActionRef } from "@/engine/types";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import { playAuscultation, stopAuscultation } from "./auscultationAudio";

interface Props {
  regions: PatientRegion[];
  breathing?: boolean;
  /** Sprint B.4.1: Cilt tonu — vital değişimine göre senaryo motorundan gelir. */
  skinTint?: SkinTint;
  /** Sprint B.2 entegrasyon: hasta konuşurken ağız bölgesi shader oscillation. */
  speaking?: boolean;
  /** Solunum hızı (rr) için vital — breathing shader'a beslenir. */
  organVitals?: { hr: number; rr: number };
  /** Test ortamında onSelect'i dışarıdan dinleyebilmek için opsiyonel callback. */
  onRegionSelect?: (region: PatientRegion) => void;
  /** Sprint B.2.1: Prosedür animasyonu tamamlandığında engine'e iletilecek ActionRef. */
  onProcedureComplete?: (action: ActionRef) => void;
  /** Hasta model varyantı (yaş/cinsiyet) — senaryo hastasından türetilir. */
  variant?: PatientVariant;
  /** Etnik ten tonu — senaryo hastasından türetilir. */
  skinTone?: SkinTone;
  /** Sürekli klinik görsel (clinicalVisualMapping + faz dramatik katman).
      Verilirse shader uniform'ları (cyanosis/pallor/diaphoresis/mottled +
      faz-senkron nefes durması) sürülür — ayrık skinTint üstüne biner. */
  visualState?: VisualState;
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

// Takıldıktan sonra hastanın üzerinde KALAN (persistent) prosedürler.
// Takma animasyonu bitince AttachedEquipmentLayer'a taşınır; böylece
// maske + IV + pulse-ox + kaf + EKG + turnike + göğüs mührü + nazal
// kanül aynı anda durabilir.
// Anlık eylem (persistent DEĞİL): stethoscope, defibrillator, bvm
// (elle ventilasyon), intubation (yerleştirme manevrası), glucometer
// (ölç-kaldır).
const PERSISTENT_KINDS: ReadonlySet<ProcedureKind> = new Set<ProcedureKind>([
  "oxygen_mask",
  "iv_line",
  "pulse_ox",
  "bp_cuff",
  "ekg_electrodes",
  "tourniquet",
  "chest_seal",
  "nasal_cannula",
  // P2/P3: NG sonda, nebülizatör maske, servikal yaka, göğüs tüpü kalıcı.
  // suction (aspiratör) anlık — listede yok.
  "ng_tube",
  "nebulizer_mask",
  "cervical_collar",
  "chest_tube",
]);

export function PatientBody3D({
  regions,
  breathing = true,
  skinTint = "normal",
  speaking = false,
  organVitals,
  onRegionSelect,
  onProcedureComplete,
  variant = DEFAULT_PATIENT_VARIANT,
  skinTone = DEFAULT_SKIN_TONE,
  visualState,
  className,
}: Props) {
  const [selected, setSelected] = useState<PatientRegion | null>(null);
  const [activeProcedure, setActiveProcedure] = useState<ProcedureContext | null>(null);
  // P0 ekipman: takma animasyonu biten persistent ekipman burada birikir,
  // AttachedEquipmentLayer ile sahnede kalır.
  const [attachedEquipment, setAttachedEquipment] = useState<ProcedureContext[]>([]);
  const bodyRef = useRef<Group>(null);

  const handleSelect = (region: PatientRegion) => {
    setSelected(region);
    onRegionSelect?.(region);
  };

  const handleStartProcedure = (kind: ProcedureKind, region: PatientRegion) => {
    setSelected(null);
    // Aktif TAKMA anında yine tek prosedür (tek el = tek hareket).
    setActiveProcedure({
      kind,
      regionId: region.id,
      targetPosition: region.position,
      persistent: PERSISTENT_KINDS.has(kind),
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

    // P0 ekipman: persistent ise kalıcı katmana taşı (idempotent:
    // aynı bölgeye aynı ekipman bir kez). Aktif overlay'i kapat —
    // kalıcı render AttachedEquipmentLayer'a devredilir.
    if (context.persistent) {
      setAttachedEquipment((prev) => {
        const exists = prev.some(
          (e) => e.kind === context.kind && e.regionId === context.regionId,
        );
        return exists ? prev : [...prev, context];
      });
      setActiveProcedure(null);
      return;
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
        frameloop={
          // visualState verilince useFrame (nefes amplitüdü lerp + cyanosis/pallor
          // /diaphoresis/mottled lerp + arrest nefes durması) sürekli çalışmalı —
          // aksi halde breathing=false + demand modda useFrame donar, görsel takılır.
          breathing ||
          activeProcedure ||
          speaking ||
          attachedEquipment.length > 0 ||
          visualState
            ? "always"
            : "demand"
        }
        dpr={[1, 2]}
        gl={{
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
            rr={organVitals?.rr ?? 14}
            skinTint={skinTint}
            speaking={speaking}
            variant={variant}
            skinTone={skinTone}
            visualState={visualState}
          />
          {regions.map((region) => (
            <RegionMarker
              key={region.id}
              region={region}
              selected={selected?.id === region.id}
              onSelect={handleSelect}
            />
          ))}
          <ProcedureOverlay active={activeProcedure} onComplete={handleProcedureComplete} />
          {/* P0 — kalıcı ekipman katmanı (maske + IV + pulse-ox + kaf + EKG aynı anda) */}
          <AttachedEquipmentLayer attached={attachedEquipment} />
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
