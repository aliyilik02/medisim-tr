import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { MeshStandardMaterial, SkinnedMesh, type Group } from "three";
import {
  patientVertexCommon,
  patientVertexDisplacement,
  patientFragmentCommon,
  patientFragmentColor,
} from "./shaders/patientShader";
import {
  PATIENT_MODELS,
  DEFAULT_PATIENT_VARIANT,
  SKIN_TONE_PRESETS,
  DEFAULT_SKIN_TONE,
  type PatientVariant,
  type SkinTone,
} from "./patientModels";

// onBeforeCompile callback'inin Three.js dahili shader objesinin tipi.
type ShaderRef = {
  uniforms: Record<string, { value: any }>;
  vertexShader: string;
  fragmentShader: string;
};

// ============================================================
// Anatomik glTF model — Sprint B.4.1+ (cilt tonu + diafragma solunum)
// ============================================================
// Asset: public/3d/patient-{female-adult,male-adult,child,elderly}.glb (MPFB2 CC0).
// Varyant + wrapper scale/yOffset `patientModels.ts`'de. Tüm varyantlar AYNI canonical
// world kutusuna oturur (ayak -0.243, baş 0.778) → breathing merkezi (patientShader,
// WORLD koord) + regions.ts marker'ları DEĞİŞMEDEN geçerli kalır.
// 52 ARKit blendshape (eyeBlinkLeft/Right + jawOpen vb. app'te sürülür).
// ============================================================

const BREATH_AMPLITUDE_WORLD = 0.010; // 1 cm AP expansion (fizyolojik sakin)

// Tüm varyantları preload et — varyant değişiminde anlık geçiş.
Object.values(PATIENT_MODELS).forEach((m) => useGLTF.preload(m.url));

/** Cilt tonu preset'leri (vital tabanlı görsel feedback). */
export type SkinTint = "normal" | "cyanosis" | "jaundice" | "pallor";

const SKIN_TINT_PRESETS: Record<SkinTint, [number, number, number]> = {
  normal:    [1.00, 1.00, 1.00],
  cyanosis:  [0.65, 0.75, 0.95],
  jaundice:  [1.15, 1.05, 0.55],
  pallor:    [0.85, 0.80, 0.78],
};

const SKIN_MATERIAL_NAMES = ["Skin_Head", "Skin_Body", "Skin_Arm", "Skin_Leg"];

interface Props {
  breathing?: boolean;
  /** Solunum Hızı (RR - Breaths Per Minute). Şayder solunum hızını senkronize eder. */
  rr?: number;
  /** Cilt tonu preset'i. Vital değişimine göre PatientBody3D'den geçilir. */
  skinTint?: SkinTint;
  /** Hasta konuşuyor mu? true iken ağız bölgesinde 3D blendshape oscillations aktiftir. */
  speaking?: boolean;
  /** Hasta model varyantı (yaş/cinsiyet). Senaryo hastasından türetilir. */
  variant?: PatientVariant;
  /** Etnik ten tonu (Skin_Body baseColor). Cyanosis/pallor tint üzerine biner. */
  skinTone?: SkinTone;
}

export const AnatomicPatientModel = forwardRef<Group, Props>(
  (
    {
      breathing = true,
      rr = 14,
      skinTint = "normal",
      speaking = false,
      variant = DEFAULT_PATIENT_VARIANT,
      skinTone = DEFAULT_SKIN_TONE,
    },
    ref,
  ) => {
    const model = PATIENT_MODELS[variant] ?? PATIENT_MODELS[DEFAULT_PATIENT_VARIANT];
    const breathAmplitudeLocal = BREATH_AMPLITUDE_WORLD / model.scale;
    const { scene } = useGLTF(model.url);
    // GLTF scene caching'i bozmamak için güvenli clone
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);

    const shaderRefs = useRef<ShaderRef[]>([]);

    useMemo(() => {
      shaderRefs.current = [];
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const mesh = obj as SkinnedMesh;
          const mat = mesh.material as MeshStandardMaterial;

          // Etnik ten tonu — Skin_Body baseColor (cyanosis/pallor tint çarpımsal üstüne biner)
          if (SKIN_MATERIAL_NAMES.includes(mat.name)) {
            const [tr, tg, tb] = SKIN_TONE_PRESETS[skinTone];
            mat.color.setRGB(tr, tg, tb);
          }

          // Hook onBeforeCompile
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uBreathAmplitude = { value: breathAmplitudeLocal };
            shader.uniforms.uSkinTint = { value: SKIN_TINT_PRESETS[skinTint] };
            shader.uniforms.uSpeaking = { value: speaking ? 1.0 : 0.0 };
            shader.uniforms.uBreathSpeed = { value: (rr / 60) * 2 * Math.PI };

            // Vertex shader modifikasyonları (solunum için)
            shader.vertexShader = shader.vertexShader
              .replace("#include <common>", patientVertexCommon)
              .replace("#include <begin_vertex>", patientVertexDisplacement);

            // Fragment shader modifikasyonları (sadece cilt materyallerine uygula)
            if (SKIN_MATERIAL_NAMES.includes(mat.name)) {
              shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", patientFragmentCommon)
                .replace("#include <dithering_fragment>", patientFragmentColor);
            }

            shaderRefs.current.push(shader as unknown as ShaderRef);
          };

          // Materyal önbellek anahtarını zorla değiştirip yeniden derlemeyi garanti ediyoruz
          mat.customProgramCacheKey = () => {
            return `${mat.name}_${skinTint}`;
          };
          mat.needsUpdate = true;
        }
      });
    }, [clone, skinTint, skinTone]);

    // Solunum Açık/Kapalı kontrolü
    useEffect(() => {
      shaderRefs.current.forEach((shader) => {
        if (shader.uniforms.uBreathAmplitude) {
          shader.uniforms.uBreathAmplitude.value = breathing ? breathAmplitudeLocal : 0;
        }
      });
    }, [breathing, breathAmplitudeLocal]);

    // Cilt tonu yumuşak geçiş — current → target lerp (~1.5sn)
    const currentTintRef = useRef<[number, number, number]>([1, 1, 1]);
    const targetTintRef = useRef<[number, number, number]>(SKIN_TINT_PRESETS[skinTint]);

    useEffect(() => {
      targetTintRef.current = SKIN_TINT_PRESETS[skinTint];
    }, [skinTint]);

    // Konuşma durumu (shader oscillation yerine blendshape kullandığımız için uSpeaking opsiyonel kalır)
    useEffect(() => {
      shaderRefs.current.forEach((shader) => {
        if (shader.uniforms.uSpeaking) {
          shader.uniforms.uSpeaking.value = speaking ? 1.0 : 0.0;
        }
      });
    }, [speaking]);

    // Morph-capable mesh'leri clone değişince BİR KEZ topla (perf: her frame
    // ~8× clone.traverse() yerine küçük memo listesi üzerinde dön).
    const morphMeshes = useMemo(() => {
      const meshes: SkinnedMesh[] = [];
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const mesh = obj as SkinnedMesh;
          if (mesh.morphTargetDictionary && mesh.morphTargetInfluences) {
            meshes.push(mesh);
          }
        }
      });
      return meshes;
    }, [clone]);

    // Blendshape yardımcı fonksiyonu — memo listesi üzerinde (traverse yok)
    const setMorphInfluence = (name: string, value: number) => {
      for (const mesh of morphMeshes) {
        const index = mesh.morphTargetDictionary![name];
        if (index !== undefined) {
          mesh.morphTargetInfluences![index] = value;
        }
      }
    };

    // Yumuşak mimik animasyonları için ref'ler
    const currentMouthRef = useRef(0);
    const currentJawRef = useRef(0);

    useFrame((state, delta) => {
      // 1. Shader zaman ve hız güncellemeleri
      shaderRefs.current.forEach((shader) => {
        if (shader.uniforms.uTime) shader.uniforms.uTime.value = state.clock.getElapsedTime();
        if (shader.uniforms.uBreathSpeed) shader.uniforms.uBreathSpeed.value = (rr / 60) * 2 * Math.PI;
      });

      // 2. Cilt tonu lerp geçişi
      const lerpSpeed = Math.min(delta / 1.5, 1.0);
      const cur = currentTintRef.current;
      const tgt = targetTintRef.current;
      cur[0] += (tgt[0] - cur[0]) * lerpSpeed;
      cur[1] += (tgt[1] - cur[1]) * lerpSpeed;
      cur[2] += (tgt[2] - cur[2]) * lerpSpeed;

      shaderRefs.current.forEach((shader) => {
        if (shader.uniforms.uSkinTint) shader.uniforms.uSkinTint.value = cur;
      });

      // 3. Göz kırpma (Blink) animasyonu (4 saniyede bir hızlı kapanıp açılma)
      const blinkCycle = 4.0;
      const blinkDuration = 0.18; // 180 ms
      const timeInCycle = state.clock.getElapsedTime() % blinkCycle;
      let blinkVal = 0;
      if (timeInCycle < blinkDuration) {
        blinkVal = Math.sin((timeInCycle / blinkDuration) * Math.PI);
      }

      setMorphInfluence("Eyes_Blink", blinkVal);
      setMorphInfluence("Eye_Blink_L", blinkVal);
      setMorphInfluence("Eye_Blink_R", blinkVal);
      setMorphInfluence("A14_Eye_Blink_Left", blinkVal);
      setMorphInfluence("A15_Eye_Blink_Right", blinkVal);
      setMorphInfluence("eyeBlinkLeft", blinkVal); // MPFB/ARKit
      setMorphInfluence("eyeBlinkRight", blinkVal); // MPFB/ARKit

      // 4. Konuşma (Speech lipsync) animasyonu
      let targetMouth = 0;
      let targetJaw = 0;
      if (speaking) {
        const elapsed = state.clock.getElapsedTime();
        // İki farklı frekans kombinasyonu ile organik konuşma titreşimi
        targetMouth = Math.sin(elapsed * 14.0) * 0.3 + Math.sin(elapsed * 6.0) * 0.3 + 0.25;
        targetMouth = Math.max(0, Math.min(0.7, targetMouth));
        targetJaw = targetMouth * 0.45;
      }

      // Yumuşak geçiş için lerp uygula
      currentMouthRef.current += (targetMouth - currentMouthRef.current) * 0.2;
      currentJawRef.current += (targetJaw - currentJawRef.current) * 0.2;

      setMorphInfluence("Mouth_Open", currentMouthRef.current);
      setMorphInfluence("V_Open", currentMouthRef.current);
      setMorphInfluence("A25_Jaw_Open", currentJawRef.current);
      setMorphInfluence("jawOpen", currentMouthRef.current); // MPFB/ARKit — ağız açılması
    });

    return (
      <group ref={ref} scale={model.scale} position={[0, model.yOffset, 0]}>
        <primitive object={clone} />
      </group>
    );
  },
);

AnatomicPatientModel.displayName = "AnatomicPatientModel";

