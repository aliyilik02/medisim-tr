import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { MeshStandardMaterial, SkinnedMesh, type Group, type AnimationClip } from "three";
import {
  SKIN_TONE_PRESETS,
  DEFAULT_SKIN_TONE,
  type SkinTone,
} from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";

// ============================================================
// Animasyonlu hasta modeli — Faz 2/3 (iskelet animasyon)
// ============================================================
// Asset: public/3d/patient-animated.glb (Mixamo auto-rig, 65 kemik, meshopt).
// MPFB rig'i bu mesh'te patolojik ters deformasyon veriyordu (Blender 5.1.1) →
// Mixamo auto-rigger ile çözüldü (kollar doğal yanda, temiz deformasyon).
// 4 klip: idle (3.3s, ayakta), pain (5.7s, ağrıyla kıvranma), cough_mild/severe
// (yatarak öksürme — supine senaryolar için). Mimik (52 ARKit blendshape) Mixamo
// soydu → proximity (KDTree en-yakın-vertex) transfer ile MPFB master'dan geri
// aktarıldı (bbox birebir örtüşüyor, aynı MakeHuman base). İskelet animasyon
// (gövde) + morph (yüz mimik: göz kırpma + lipsync) AYNI modelde birlikte.
// ============================================================

const ANIMATED_URL = "/3d/patient-animated.glb";
// Mixamo standing yüksekliği ~1.59 birim → app canonical (~1.02, ayak -0.243, baş 0.778)
const STANDING_SCALE = 0.642;
const SKIN_MATERIAL_NAMES = ["Skin_Head", "Skin_Body", "Skin_Arm", "Skin_Leg"];

const SKIN_TINT_PRESETS: Record<SkinTint, [number, number, number]> = {
  normal: [1.0, 1.0, 1.0],
  cyanosis: [0.65, 0.75, 0.95],
  jaundice: [1.15, 1.05, 0.55],
  pallor: [0.85, 0.8, 0.78],
};

useGLTF.preload(ANIMATED_URL);

/** Oynatılabilir animasyon klipleri (GLB içindeki NLA track adları). */
export type PatientClip =
  | "laying_idle"
  | "idle"
  | "talk_gesture"
  | "talk_shrug"
  | "pain"
  | "cough_mild"
  | "cough_severe";
export const PATIENT_CLIPS: PatientClip[] = [
  "laying_idle",
  "idle",
  "talk_gesture",
  "talk_shrug",
  "pain",
  "cough_mild",
  "cough_severe",
];

interface Props {
  /** Oynatılacak animasyon klibi. Değişince crossfade ile geçer. */
  clip?: PatientClip;
  /** Etnik ten tonu (Skin_Body baseColor). */
  skinTone?: SkinTone;
  /** Vital tabanlı cilt tonu (siyanoz/sarılık/solgunluk) — baseColor üstüne çarpımsal. */
  skinTint?: SkinTint;
  /** Hasta konuşuyor mu? true iken ağız morph'u (jawOpen) lipsync osilasyonu yapar. */
  speaking?: boolean;
  /** Wrapper scale (varsayılan canonical eşitleme). */
  scale?: number;
  /** Wrapper konum (yatak/supine hizalama için). */
  position?: [number, number, number];
}

export const AnimatedPatientModel = forwardRef<Group, Props>(
  (
    {
      clip = "idle",
      skinTone = DEFAULT_SKIN_TONE,
      skinTint = "normal",
      speaking = false,
      scale = STANDING_SCALE,
      position = [0, -0.243, 0],
    },
    ref,
  ) => {
    const { scene, animations } = useGLTF(ANIMATED_URL) as unknown as {
      scene: Group;
      animations: AnimationClip[];
    };
    // SkinnedMesh + iskelet birlikte klonlanmalı → SkeletonUtils
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { actions } = useAnimations(animations, clone);

    // Cilt tonu × vital tint → material baseColor (çarpımsal)
    useMemo(() => {
      const [sr, sg, sb] = SKIN_TONE_PRESETS[skinTone];
      const [tr, tg, tb] = SKIN_TINT_PRESETS[skinTint];
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const mat = (obj as any).material as MeshStandardMaterial;
          if (mat && SKIN_MATERIAL_NAMES.includes(mat.name)) {
            mat.color.setRGB(sr * tr, sg * tg, sb * tb);
            mat.needsUpdate = true;
          }
        }
      });
    }, [clone, skinTone, skinTint]);

    // Klip geçişi — crossfade
    const prevClip = useRef<PatientClip | null>(null);
    useEffect(() => {
      const next = actions[clip];
      if (!next) return;
      next.reset().fadeIn(0.35).play();
      const prev = prevClip.current;
      if (prev && prev !== clip && actions[prev]) {
        actions[prev]!.fadeOut(0.35);
      }
      prevClip.current = clip;
      return () => {
        next.fadeOut(0.35);
      };
    }, [clip, actions]);

    // Morph-capable mesh'leri bir kez topla (göz kırpma + lipsync için)
    const morphMeshes = useMemo(() => {
      const meshes: SkinnedMesh[] = [];
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const m = obj as SkinnedMesh;
          if (m.morphTargetDictionary && m.morphTargetInfluences) meshes.push(m);
        }
      });
      return meshes;
    }, [clone]);

    const setMorph = (name: string, value: number) => {
      for (const m of morphMeshes) {
        const idx = m.morphTargetDictionary![name];
        if (idx !== undefined) m.morphTargetInfluences![idx] = value;
      }
    };

    const mouthRef = useRef(0);
    useFrame((state) => {
      // Göz kırpma — 4sn'de bir hızlı kapanıp açılma (eyeBlinkLeft/Right ARKit)
      const t = state.clock.getElapsedTime();
      const cyc = t % 4.0;
      const blink = cyc < 0.18 ? Math.sin((cyc / 0.18) * Math.PI) : 0;
      setMorph("eyeBlinkLeft", blink);
      setMorph("eyeBlinkRight", blink);

      // Lipsync — konuşurken ağız (jawOpen) organik osilasyon
      let target = 0;
      if (speaking) {
        target = Math.sin(t * 14) * 0.3 + Math.sin(t * 6) * 0.3 + 0.25;
        target = Math.max(0, Math.min(0.7, target));
      }
      mouthRef.current += (target - mouthRef.current) * 0.2;
      setMorph("jawOpen", mouthRef.current);
    });

    return (
      <group ref={ref} scale={scale} position={position}>
        <primitive object={clone} />
      </group>
    );
  },
);

AnimatedPatientModel.displayName = "AnimatedPatientModel";
