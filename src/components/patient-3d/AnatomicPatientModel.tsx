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
// Sprint B.1.1 (revize): solunum animasyonu shader-tabanlı vertex
// displacement. Anatomik üçgen referans noktası:
//   chest-front [0, 0.55, 0.115] (sternum)
//   chest-left  [-0.16, 0.4, 0.085] (kardiyak)
//   chest-right [0.16, 0.4, 0.085] (pulmoner)
// Bu üçgenin merkezinden 3D mesafe ile falloff — sadece göğüs ön
// duvarı oscillation yapar; omuz/kol/karın/kalça SABİT (gerçek
// fizyolojide inspirium omuzu kaldırmaz, paradoksal nefes hariç).
// CPU vertex manipulation YOK (60fps koruması).
// ============================================================

const MODEL_URL = "/3d/patient-v1.glb";
const BREATH_RATE_HZ = 0.25; // ~15/dk solunum
const BREATH_AMPLITUDE = 0.038; // göğüs duvarı AP genişlemesi (~3.8 cm)
                                // Üçgen alan dar olduğu için bu değer
                                // gözle ayırt edilebilir kalıyor ama
                                // hâlâ fizyolojik sınırda (abartmıyor).

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
                 // Göğüs üçgen merkezi etrafında 3D mesafe falloff.
                 // World space distance gerekir — vertex local position
                 // Sketchfab transform chain'i yüzünden chest center
                 // (scene-space) koordinatlarıyla doğrudan eşleşmiyordu.
                 vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);
                 vec3 bChestCenter = vec3(0.0, 0.45, 0.095);
                 float bDist = distance(bWorldPos.xyz, bChestCenter);
                 float bWeight = 1.0 - smoothstep(0.10, 0.25, bDist);
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
