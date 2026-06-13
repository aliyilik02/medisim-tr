import { Suspense, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import {
  AnimatedPatientModel,
  PATIENT_CLIPS,
  type PatientClip,
} from "@/components/patient-3d/AnimatedPatientModel";

const CLIP_LABELS: Record<PatientClip, string> = {
  idle: "Sakin (ayakta)",
  pain: "Ağrıyla kıvranma",
  cough_mild: "Hafif öksürük (yatarak)",
  cough_severe: "Şiddetli öksürük (yatarak)",
};

function Loading() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Model yükleniyor…
      </div>
    </Html>
  );
}

// Faz 2/3 — Mixamo iskelet animasyon doğrulama demosu.
export function AnimasyonDemoPage() {
  const [clip, setClip] = useState<PatientClip>("idle");

  return (
    <div className="fixed inset-0 bg-ink-950 flex flex-col">
      <header className="flex items-center justify-between px-4 py-2 border-b border-ink-700/50 bg-ink-950/90">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-ink-400 hover:text-ink-100 transition" aria-label="Ana sayfa">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
            Animasyon Demo — İskelet Hareket (Mixamo)
          </span>
        </div>
        <span className="font-mono text-[9px] text-ink-500">
          Eğitim amaçlıdır, klinik karar destek değildir
        </span>
      </header>

      <div className="flex-1 min-h-0 relative">
        <Canvas
          data-testid="animation-canvas"
          dpr={[1, 2]}
          gl={{ antialias: true, powerPreference: "high-performance" }}
          camera={{ position: [0, 0.4, 2.4], fov: 38 }}
          shadows
        >
          <color attach="background" args={["#0a0a0c"]} />
          <ambientLight intensity={0.55} />
          <directionalLight position={[2, 4, 3]} intensity={1.0} castShadow />
          <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#9fb6c9" />
          <hemisphereLight args={["#ffffff", "#1a1a1f", 0.4]} />

          <Suspense fallback={<Loading />}>
            <AnimatedPatientModel clip={clip} />
            {/* zemin */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.243, 0]} receiveShadow>
              <planeGeometry args={[6, 6]} />
              <meshStandardMaterial color="#15151a" />
            </mesh>
          </Suspense>

          <OrbitControls target={[0, 0.1, 0]} minDistance={0.8} maxDistance={5} enablePan />
        </Canvas>

        {/* Klip seçici */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-wrap gap-1.5 justify-center px-3 py-2 rounded-lg bg-ink-900/85 border border-ink-700/60 backdrop-blur-md">
          {PATIENT_CLIPS.map((c) => (
            <button
              key={c}
              onClick={() => setClip(c)}
              className={`px-3 py-1.5 rounded font-mono text-[10px] uppercase tracking-[0.08em] transition ${
                clip === c
                  ? "bg-brand/20 text-brand-light border border-brand/40"
                  : "text-ink-400 hover:text-ink-100 hover:bg-ink-800 border border-transparent"
              }`}
            >
              {CLIP_LABELS[c]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
