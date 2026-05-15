import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, type Group } from "three";

// onBeforeCompile callback'inin Three.js dahili shader objesinin tipi.
// Three.js v0.170 bunu direkt export etmiyor; ihtiyacımız olan iki alan
// için minimum tip tanımlıyoruz.
type ShaderRef = {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
};

// ============================================================
// Anatomik glTF model — Sprint B.1 / B.1.1
// ============================================================
// Asset: public/3d/patient-v1.glb (~1.1 MB, 22.879 vertex)
// Lisans: CC BY 4.0 — atıf src/components/patient-3d/LICENSE-3D.md
// Yazar: MaceLogice (Sketchfab)
// Bbox: x[-0.32, 0.32], y[-0.24, 0.78], z[-0.22, 0.10]
// ============================================================
// Sprint B.1.1: solunum animasyonu shader-tabanlı vertex displacement.
// smoothstep(0.0, 0.5, y) ağırlık → kalça 0, karın ~%18, göğüs üst %100.
// Normal yönünde sin(uTime * 2π * rate) × amplitude × weight.
// CPU vertex manipulation YOK (60fps koruması).
// ============================================================

const MODEL_URL = "/3d/patient-v1.glb";
const BREATH_RATE_HZ = 0.25; // ~15/dk solunum
const BREATH_AMPLITUDE = 0.022; // anterior-posterior eksende max displacement
                                // (≈ 2 cm fizyolojik torso AP genişlemesi)

useGLTF.preload(MODEL_URL);

interface Props {
  /** Solunum animasyonu açık mı? */
  breathing?: boolean;
}

export const AnatomicPatientModel = forwardRef<Group, Props>(
  ({ breathing = true }, ref) => {
    const { scene } = useGLTF(MODEL_URL);
    const shaderRef = useRef<ShaderRef | null>(null);

    // Material'i runtime'da uniform ten tonuna ayarla + breathing shader
    // chunk'ını inject et. onBeforeCompile her material compile'da
    // çağrılır; shader referansını saklayıp useFrame'den uniform günceller.
    useMemo(() => {
      scene.traverse((obj) => {
        if ("isMesh" in obj && (obj as { isMesh: boolean }).isMesh) {
          const mesh = obj as unknown as { material: MeshStandardMaterial };
          const mat = new MeshStandardMaterial({
            color: "#d4a896",
            roughness: 0.72,
            metalness: 0.0,
          });
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uBreathAmplitude = { value: BREATH_AMPLITUDE };
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                `#include <common>
                 uniform float uTime;
                 uniform float uBreathAmplitude;`,
              )
              .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                 // Sprint B.1.1: solunum displacement
                 // weight: kalça 0 → karın hafif → göğüs üst tam
                 float bWeight = smoothstep(0.0, 0.5, position.y);
                 float bPhase = sin(uTime * ${(BREATH_RATE_HZ * 2 * Math.PI).toFixed(4)});
                 transformed += normal * bWeight * bPhase * uBreathAmplitude;`,
              );
            shaderRef.current = shader;
          };
          mesh.material = mat;
        }
      });
    }, [scene]);

    // Toggle: breathing kapalıyken amplitude 0 (statik, useFrame yine
    // çalışır ama displacement sıfır → görsel etki yok)
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uBreathAmplitude.value = breathing
          ? BREATH_AMPLITUDE
          : 0;
      }
    }, [breathing]);

    useFrame((state) => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      }
    });

    return <primitive ref={ref} object={scene} />;
  },
);

AnatomicPatientModel.displayName = "AnatomicPatientModel";
