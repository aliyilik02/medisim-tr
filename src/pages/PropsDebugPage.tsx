// ============================================================
// PropsDebugPage — /dev/props (yalnız DEV) — Sketchfab prop kalibrasyonu
// ============================================================
// 5 CC-BY prop'u 1.5 birim arayla yan yana dizer; 1×1 birim zemin ızgarası
// (1 birim ≈ 1.57 m) + eksen oku ile ölçek/yön SAYISAL doğrulanır.
// Prod build'e girmez (App.tsx'te import.meta.env.DEV kapısı).
// ============================================================

import { Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { Html, OrbitControls, Grid } from "@react-three/drei";
import {
  IVPoleReal,
  BedsideTableProp,
  HospitalChairProp,
  WheelchairProp,
  VitalsMonitorProp,
} from "@/components/patient-3d/props/SketchfabProps";

const ITEMS: { label: string; el: React.ReactNode }[] = [
  { label: "iv-pole", el: <IVPoleReal /> },
  { label: "bedside-table", el: <BedsideTableProp /> },
  { label: "hospital-chair", el: <HospitalChairProp /> },
  { label: "wheelchair", el: <WheelchairProp /> },
  { label: "vitals-monitor", el: <VitalsMonitorProp /> },
];

export function PropsDebugPage() {
  return (
    <div className="w-screen h-screen bg-ink-950">
      <Canvas data-testid="props-debug-canvas" camera={{ position: [3, 2.2, 5], fov: 45 }} shadows>
        <color attach="background" args={["#101014"]} />
        <ambientLight intensity={0.6} />
        <directionalLight position={[3, 5, 4]} intensity={1.1} castShadow />
        <Grid args={[12, 12]} cellSize={0.5} sectionSize={1} sectionColor="#0d9488" cellColor="#2a2a32" position={[0, 0.001, 0]} />
        {/* +Z yön referansı (kırmızı ok yerine kutu — "ön" bu tarafa bakmalı) */}
        <mesh position={[0, 0.02, 2.2]}>
          <boxGeometry args={[6.5, 0.04, 0.04]} />
          <meshBasicMaterial color="#b91c1c" />
        </mesh>
        <Suspense fallback={null}>
          {ITEMS.map((it, i) => {
            const x = (i - (ITEMS.length - 1) / 2) * 1.5;
            return (
              <group key={it.label} position={[x, 0, 0]}>
                {it.el}
                {/* 1×1 birim referans karesi (≈1.57 m) */}
                <mesh position={[0, 0.5, 0]} visible={false}>
                  <boxGeometry args={[1, 1, 1]} />
                </mesh>
                <Html center position={[0, -0.15, 0.7]}>
                  <div className="font-mono text-[10px] text-brand-light whitespace-nowrap">{it.label}</div>
                </Html>
              </group>
            );
          })}
        </Suspense>
        <OrbitControls target={[0, 0.5, 0]} />
      </Canvas>
    </div>
  );
}
