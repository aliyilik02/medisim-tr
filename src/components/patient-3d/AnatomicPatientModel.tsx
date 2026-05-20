import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, type Group, type Plane } from "three";

// onBeforeCompile callback'inin Three.js dahili shader objesinin tipi.
type ShaderRef = {
  uniforms: Record<string, { value: number | [number, number, number] }>;
  vertexShader: string;
  fragmentShader: string;
};

// ============================================================
// Anatomik glTF model — Sprint B.4.1+ (cilt tonu + diafragma solunum)
// ============================================================
// Asset: public/3d/patient-v2.glb (chuma6oy CC BY 4.0)
// Wrapper: scale 0.107 + y+0.49 → world bbox v1 uyumlu.
//
// Sprint B.4.1: uSkinTint uniform (vec3) eklendi.
//   - Normal:  (1.0, 1.0, 1.0)
//   - Siyanoz: (0.65, 0.75, 0.95)  — mavimsi
//   - Jaundice: (1.15, 1.05, 0.55) — sarımsı
//   - Pallor:  (0.85, 0.80, 0.78)  — soluk
//
// Sprint B.4.2: Çift-center solunum (chest + abdomen, diafragma).
//   - Chest center y=0.523 (4. ICS) — primary AP expansion
//   - Abdomen center y=0.40 (göbek üstü) — diafragma'nın forward push'ı
//   - İkisi aynı fazda, abdomen amplitude %60 (subtle)
// Referans: memory/medisim_animasyon_teknikleri.md
// ============================================================

const MODEL_URL = "/3d/patient-v2.glb";
const MODEL_SCALE = 0.107;
const MODEL_Y_OFFSET = 0.49;
const BREATH_RATE_HZ = 0.25; // ~15/dk
const BREATH_AMPLITUDE_WORLD = 0.010; // 1 cm AP expansion (fizyolojik sakin)
const BREATH_AMPLITUDE_LOCAL = BREATH_AMPLITUDE_WORLD / MODEL_SCALE;

useGLTF.preload(MODEL_URL);

/** Cilt tonu preset'leri (vital tabanlı görsel feedback). */
export type SkinTint = "normal" | "cyanosis" | "jaundice" | "pallor";

const SKIN_TINT_PRESETS: Record<SkinTint, [number, number, number]> = {
  normal:    [1.00, 1.00, 1.00],
  cyanosis:  [0.65, 0.75, 0.95],
  jaundice:  [1.15, 1.05, 0.55],
  pallor:    [0.85, 0.80, 0.78],
};

interface Props {
  breathing?: boolean;
  /** Cilt tonu preset'i. Vital değişimine göre PatientBody3D'den geçilir. */
  skinTint?: SkinTint;
  /**
   * Sprint B.2 entegrasyon: hasta konuşuyor mu? true iken ağız bölgesinde
   * shader oscillation (mock lipsync). RPM avatar geldiğinde mouthOpen
   * blendshape ile değiştirilecek.
   */
  speaking?: boolean;
  /**
   * Sprint B.4 — Skin clipping planes. Cilt altı organları görünür yapmak için.
   * Boş array → clipping yok (default).
   */
  clippingPlanes?: Plane[];
}

export const AnatomicPatientModel = forwardRef<Group, Props>(
  ({ breathing = true, skinTint = "normal", speaking = false, clippingPlanes }, ref) => {
    const { scene } = useGLTF(MODEL_URL);
    const shaderRef = useRef<ShaderRef | null>(null);

    useMemo(() => {
      scene.traverse((obj) => {
        if ("isMesh" in obj && (obj as { isMesh: boolean }).isMesh) {
          const mesh = obj as unknown as { material: MeshStandardMaterial };
          const mat = new MeshStandardMaterial({
            color: "#d4a896",
            roughness: 0.72,
            metalness: 0.0,
            // Sprint B.4: clipping planes — cilt altı organlar
            clippingPlanes: clippingPlanes ?? [],
            clipShadows: true,
            side: 2, // DoubleSide — clip iç yüzey görünmesin
            transparent: !!clippingPlanes && clippingPlanes.length > 0,
            opacity: !!clippingPlanes && clippingPlanes.length > 0 ? 0.92 : 1.0,
          });
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uBreathAmplitude = { value: BREATH_AMPLITUDE_LOCAL };
            shader.uniforms.uSkinTint = { value: SKIN_TINT_PRESETS[skinTint] };
            shader.uniforms.uSpeaking = { value: speaking ? 1.0 : 0.0 };

            // Vertex shader: çift-center breathing displacement
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                `#include <common>
                 uniform float uTime;
                 uniform float uBreathAmplitude;
                 uniform float uSpeaking;`,
              )
              .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                 // Sprint B.4.2: çift-center solunum (diafragma simülasyonu).
                 // Chest + abdomen aynı fazda, aynı yön (AP expansion).
                 // Anatomik: inhalasyon → chest dışa + diafragma aşağı (abdomen öne).
                 vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);

                 // Chest (4. ICS) — primary expansion
                 vec3 bChestCenter = vec3(0.0, 0.523, 0.085);
                 float bChestDist = distance(bWorldPos.xyz, bChestCenter);
                 float bChestWeight = 1.0 - smoothstep(0.03, 0.08, bChestDist);

                 // Abdomen (göbek üstü) — diafragma forward push, daha geniş
                 // ama daha düşük amplitude (%60).
                 vec3 bAbdomenCenter = vec3(0.0, 0.40, 0.085);
                 float bAbdomenDist = distance(bWorldPos.xyz, bAbdomenCenter);
                 float bAbdomenWeight = (1.0 - smoothstep(0.04, 0.10, bAbdomenDist)) * 0.60;

                 float bPhase = sin(uTime * ${(BREATH_RATE_HZ * 2 * Math.PI).toFixed(4)});
                 float bTotalWeight = bChestWeight + bAbdomenWeight;
                 transformed += normal * bTotalWeight * bPhase * uBreathAmplitude;

                 // Sprint B.2 entegrasyon: mock lipsync — ağız bölgesinde küçük
                 // oscillation (chuma6oy modelinde ağız ayrı mesh değil, bu yüzden
                 // shader hilesi). RPM avatar geldiğinde mouthOpen blendshape ile
                 // değiştirilecek.
                 vec3 mMouthCenter = vec3(0.0, 0.658, 0.090);  // ağız hizası (8-head 0.89)
                 float mMouthDist = distance(bWorldPos.xyz, mMouthCenter);
                 float mMouthWeight = 1.0 - smoothstep(0.015, 0.035, mMouthDist);
                 // 4-5 Hz hızlı titreşim (konuşma syllable rate'i)
                 float mMouthPhase = sin(uTime * 28.0) * 0.5 + 0.5;
                 float mMouthAmp = 0.012 / 0.107; // 1.2cm world, local space
                 transformed += normal * mMouthWeight * mMouthPhase * mMouthAmp * uSpeaking;`,
              );

            // Fragment shader: cilt tonu tint multiply
            shader.fragmentShader = shader.fragmentShader
              .replace(
                "#include <common>",
                `#include <common>
                 uniform vec3 uSkinTint;`,
              )
              .replace(
                "#include <dithering_fragment>",
                `#include <dithering_fragment>
                 gl_FragColor.rgb *= uSkinTint;`,
              );

            shaderRef.current = shader as unknown as ShaderRef;
          };
          mesh.material = mat;
        }
      });
    }, [scene, skinTint, clippingPlanes]);

    // Breathing toggle
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uBreathAmplitude.value = breathing
          ? BREATH_AMPLITUDE_LOCAL
          : 0;
      }
    }, [breathing]);

    // Skin tint runtime update (preset değişirse compile yeniden olmasın)
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uSkinTint.value = SKIN_TINT_PRESETS[skinTint];
      }
    }, [skinTint]);

    // Speaking flag — hasta konuşurken ağız oscillation aktif
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uSpeaking.value = speaking ? 1.0 : 0.0;
      }
    }, [speaking]);

    useFrame((state) => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      }
    });

    return (
      <group ref={ref} scale={MODEL_SCALE} position={[0, MODEL_Y_OFFSET, 0]}>
        <primitive object={scene} />
      </group>
    );
  },
);

AnatomicPatientModel.displayName = "AnatomicPatientModel";
