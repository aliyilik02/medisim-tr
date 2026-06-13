// ============================================================
// PatientRoomScene — Faz 2 Klinik Sahne (supine hasta + acil odası)
// ============================================================
// Acil servis odası (public/3d/er-room.glb, metre) + supine yatan hasta.
// Oda metre ölçeğinde; hasta ~1.02 world birimi (1 birim ≈ 1.57m) → oda
// ROOM_SCALE ile küçültülüp eşitlenir. Hasta -90°X döndürülerek (anterior
// yukarı = supine) yatağa yatırılır. Standing /dialog-3d-demo etkilenmez.
// Konum sabitleri screenshot ile kalibre edildi.
// ============================================================

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { AnatomicPatientModel } from "./AnatomicPatientModel";
import { DEFAULT_PATIENT_VARIANT, type PatientVariant, type SkinTone, DEFAULT_SKIN_TONE } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";

const ROOM_URL = "/3d/er-room.glb";
// metre → hasta world birimi (hasta ~1.6m ≈ 1.02 birim → 1 birim ≈ 1.57m)
const ROOM_SCALE = 0.64;
const ROOM_FLOOR_Y = -0.27; // oda zeminini sahne tabanına indir
// supine hasta yerleşimi (yatak mattress üstü world ≈ ROOM_FLOOR_Y + 0.77*ROOM_SCALE)
const SUPINE_ROT_X = -Math.PI / 2; // anterior yukarı (sırtüstü)
const PATIENT_BED_Y = 0.27; // mattress üstüne kaldır
const PATIENT_BED_Z = 0.27; // yatak uzun ekseninde ortala

useGLTF.preload(ROOM_URL);

function ErRoom() {
  const { scene } = useGLTF(ROOM_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} scale={ROOM_SCALE} position={[0, ROOM_FLOOR_Y, 0]} />;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Sahne yükleniyor…
      </div>
    </Html>
  );
}

interface Props {
  variant?: PatientVariant;
  skinTone?: SkinTone;
  skinTint?: SkinTint;
  breathing?: boolean;
  rr?: number;
  className?: string;
}

export function PatientRoomScene({
  variant = DEFAULT_PATIENT_VARIANT,
  skinTone = DEFAULT_SKIN_TONE,
  skinTint = "normal",
  breathing = true,
  rr = 14,
  className,
}: Props) {
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop={breathing ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [2.0, 1.4, -1.1], fov: 38 }}
        shadows
      >
        <color attach="background" args={["#0a0a0c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} castShadow />
        <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#9fb6c9" />
        <hemisphereLight args={["#ffffff", "#1a1a1f", 0.4]} />

        <Suspense fallback={<LoadingFallback />}>
          <ErRoom />
          {/* Supine hasta — yatağa yatırılmış */}
          <group rotation={[SUPINE_ROT_X, 0, 0]} position={[0, PATIENT_BED_Y, PATIENT_BED_Z]}>
            <AnatomicPatientModel
              variant={variant}
              skinTone={skinTone}
              skinTint={skinTint}
              breathing={breathing}
              rr={rr}
            />
          </group>
        </Suspense>

        <OrbitControls target={[0, 0.2, 0]} minDistance={0.6} maxDistance={4} enablePan />
      </Canvas>
    </div>
  );
}
