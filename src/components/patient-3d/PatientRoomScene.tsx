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
import { AnimatedPatientModel, type PatientClip } from "./AnimatedPatientModel";
import { type SkinTone, DEFAULT_SKIN_TONE } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";

const ROOM_URL = "/3d/er-room.glb";
// metre → hasta world birimi (hasta ~1.6m ≈ 1.02 birim → 1 birim ≈ 1.57m)
const ROOM_SCALE = 0.64;
const ROOM_FLOOR_Y = -0.27; // oda zeminini sahne tabanına indir
// Animasyonlu hasta supine (laying_idle klibi ZATEN yatay → -90° döndürme YOK).
// Three.js'de gövde Z ekseni boyunca yatıyor (baş -z, ayak +z), y'de yüzüyor.
// Mattress üstüne indirmek + yatağa ortalamak için aşağıdaki sabitler kalibre edildi.
const PATIENT_SCALE = 0.62; // canonical eşitleme (animasyonlu model standing ~1.6u)
const PATIENT_POS: [number, number, number] = [0, -0.35, 0.1]; // mattress + yatak ortası (kalibre)
const PATIENT_ROT: [number, number, number] = [0, Math.PI, 0]; // baş başlık ucuna (180° flip)

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
  skinTone?: SkinTone;
  skinTint?: SkinTint;
  /** Oynatılacak klip (senaryo durumundan: laying_idle, talk, cough, pain). */
  clip?: PatientClip;
  /** Hasta konuşuyor mu (lipsync jawOpen). */
  speaking?: boolean;
  className?: string;
}

export function PatientRoomScene({
  skinTone = DEFAULT_SKIN_TONE,
  skinTint = "normal",
  clip = "laying_idle",
  speaking = false,
  className,
}: Props) {
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop="always"
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
          {/* Supine hasta — animasyonlu (laying_idle klibi yatay yatırıyor) */}
          <group position={PATIENT_POS} rotation={PATIENT_ROT} scale={PATIENT_SCALE}>
            <AnimatedPatientModel
              clip={clip}
              skinTone={skinTone}
              skinTint={skinTint}
              speaking={speaking}
              scale={1}
              position={[0, 0, 0]}
            />
          </group>
        </Suspense>

        <OrbitControls target={[0, 0.2, 0]} minDistance={0.6} maxDistance={4} enablePan />
      </Canvas>
    </div>
  );
}
