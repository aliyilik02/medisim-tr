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

// Microsoft Rocketbox Male_Adult_01 (MIT lisans, klinik sağlık simülasyonu
// için tasarlanmış). Standart PBR: m002_body + m002_head + m002_opacity
// material'ları. 2.86 MB optimize edilmiş (Fab'tan 5x küçük). Reallusion CC
// karmaşıklığı YOK — texture'lar normal baseColor/normal/specular slot'larında.
const MODEL_URL = "/3d/patient-rocketbox.glb";
const MODEL_SCALE = 0.567; // 1.021m world / 1.80m model height
const MODEL_Y_OFFSET = -0.243;
const BREATH_RATE_HZ = 0.25; // ~15/dk
// Sakin solunum AP expansion fizyolojik olarak 4-7 mm; v1'de 1 cm gözle
// abartılı görünüyordu. 0.006 (6mm) daha doğal — chest center'ında belli
// olur ama abdomen'a yayılınca subtle.
const BREATH_AMPLITUDE_WORLD = 0.006;
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

// Rocketbox modeli standart PBR — tüm material'larda gerçek baseColor +
// normalMap + specular texture'ları. Override gerekmez, sadece breathing/
// clipping/tint shader skin material'a inject edilir.

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
  /**
   * Sprint B.7 — Hasta profil scale çarpanı (infant 0.28, pediatric 0.75,
   * adult 1.0, vs.). MODEL_SCALE × scaleFactor → effektif model boyu.
   * MODEL_Y_OFFSET de aynı oranda çarpılır (model bbox merkezi yatağa
   * göre korunur).
   */
  scaleFactor?: number;
  /**
   * Sprint B.9+ — Profile-bazlı temel ten tonu TINT multiplier.
   * SKIN_TINT_PRESETS.normal [1,1,1] üstüne çarpılır. Sadece `skinTint=="normal"`
   * durumunda override eder (cyanosis/jaundice/pallor klinik patolojik tint'ler
   * kendi sabit değerlerini korur). undefined → erkek erişkin default.
   */
  skinBaseRgb?: [number, number, number];
}

export const AnatomicPatientModel = forwardRef<Group, Props>(
  ({ breathing = true, skinTint = "normal", speaking = false, clippingPlanes, scaleFactor = 1, skinBaseRgb }, ref) => {
    // B.9+ — Profile-bazlı normal ten tonu override. `normal` SkinTint için
    // skinBaseRgb varsa onu kullan, pathological (cyanosis/jaundice/pallor)
    // tint'ler için SKIN_TINT_PRESETS sabit kalır.
    const getEffectiveTint = (tint: SkinTint): [number, number, number] => {
      if (tint === "normal" && skinBaseRgb) return skinBaseRgb;
      return SKIN_TINT_PRESETS[tint];
    };
    const { scene } = useGLTF(MODEL_URL);
    const shaderRef = useRef<ShaderRef | null>(null);

    useMemo(() => {
      scene.traverse((obj) => {
        if (!("isMesh" in obj) || !(obj as { isMesh: boolean }).isMesh) return;
        const mesh = obj as unknown as {
          name: string;
          material: MeshStandardMaterial | MeshStandardMaterial[];
        };

        const mats = Array.isArray(mesh.material)
          ? mesh.material
          : [mesh.material];

        mats.forEach((origMat, idx) => {
          if (!origMat) return;
          const matName = origMat.name ?? "";
          // Rocketbox: m002_body + m002_head skin material'ları;
          // m002_opacity = saç/transparent. Fallback v2 chuma6oy uyumluluğu
          // için boş ad da skin sayılır.
          const isSkin =
            /m002_(body|head)/i.test(matName) ||
            /^skin/i.test(matName) ||
            matName === "" ||
            /^material_?\d*$/i.test(matName);

          // Non-skin material'lar (m002_opacity = saç): orijinal material
          // AYNEN korunur — alpha blend + baseColor texture Rocketbox'ta zaten
          // doğru ayarlanmış (BLEND alphaMode).
          if (!isSkin) return;

          // Skin material — orijinali CLONE et, Rocketbox'ın gerçek
          // baseColor + normalMap + specularMap texture'ları KORUNUR.
          // Sadece clipping + breathing/tint shader üstüne inject edilir.
          const mat = (origMat as MeshStandardMaterial).clone() as MeshStandardMaterial;
          mat.clippingPlanes = clippingPlanes ?? [];
          mat.clipShadows = true;
          const hasClip = !!clippingPlanes && clippingPlanes.length > 0;
          mat.transparent = hasClip || (origMat.transparent ?? false);
          mat.opacity = hasClip ? 0.92 : (origMat.opacity ?? 1.0);
          mat.needsUpdate = true;
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            // BUG FIX: cilt kesim slider'ı clippingPlanes değiştirir → bu
            // useMemo'nun deps'i olduğu için material RECREATE olur, onBeforeCompile
            // tekrar çağrılır, uniform'lar default'a döner. uBreathAmplitude
            // initial değeri "breathing" toggle state'ini takip etmeli — yoksa
            // solunum kapalı iken clip slider hareketi solunumu yeniden başlatır.
            shader.uniforms.uBreathAmplitude = {
              value: breathing ? BREATH_AMPLITUDE_LOCAL : 0,
            };
            shader.uniforms.uSkinTint = { value: getEffectiveTint(skinTint) };
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
                 float mMouthAmp = ${(0.012 / MODEL_SCALE).toFixed(4)}; // 1.2cm world → local (model_scale)
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
          // Multi-primitive Body: material array → idx'e yaz.
          // Tek material → doğrudan ata.
          if (Array.isArray(mesh.material)) {
            mesh.material[idx] = mat;
          } else {
            mesh.material = mat;
          }
        });
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

    // Cilt tonu yumuşak geçiş — current → target lerp (~1.5sn)
    // useEffect target güncelliyor; useFrame her frame current'i lerp ediyor.
    const currentTintRef = useRef<[number, number, number]>([1, 1, 1]);
    const targetTintRef = useRef<[number, number, number]>(getEffectiveTint(skinTint));

    useEffect(() => {
      targetTintRef.current = getEffectiveTint(skinTint);
      // skinBaseRgb değişimi de yeni target tetiklemeli (profile değiştiğinde)
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skinTint, skinBaseRgb?.[0], skinBaseRgb?.[1], skinBaseRgb?.[2]]);

    // Speaking flag — hasta konuşurken ağız oscillation aktif
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uSpeaking.value = speaking ? 1.0 : 0.0;
      }
    }, [speaking]);

    useFrame((state, delta) => {
      if (!shaderRef.current) return;
      shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();

      // Skin tint lerp — 1.5sn yumuşak geçiş (clamp delta-based)
      const lerpSpeed = Math.min(delta / 1.5, 1.0);
      const cur = currentTintRef.current;
      const tgt = targetTintRef.current;
      cur[0] += (tgt[0] - cur[0]) * lerpSpeed;
      cur[1] += (tgt[1] - cur[1]) * lerpSpeed;
      cur[2] += (tgt[2] - cur[2]) * lerpSpeed;
      shaderRef.current.uniforms.uSkinTint.value = cur;
    });

    return (
      <group ref={ref} scale={MODEL_SCALE * scaleFactor} position={[0, MODEL_Y_OFFSET * scaleFactor, 0]}>
        <primitive object={scene} />
      </group>
    );
  },
);

AnatomicPatientModel.displayName = "AnatomicPatientModel";
