import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { SkeletonUtils } from "three-stdlib";
import { MeshStandardMaterial, type Group, type AnimationClip } from "three";
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
// (yatarak öksürme — supine senaryolar için). Mimik (ARKit blendshape) Mixamo
// tarafından soyuldu → animasyonlu modelde yüz mimik YOK (statik AnatomicPatientModel
// dialog/standing için mimiği korur). İskelet animasyon = gövde hareketi.
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
export type PatientClip = "idle" | "pain" | "cough_mild" | "cough_severe";
export const PATIENT_CLIPS: PatientClip[] = ["idle", "pain", "cough_mild", "cough_severe"];

interface Props {
  /** Oynatılacak animasyon klibi. Değişince crossfade ile geçer. */
  clip?: PatientClip;
  /** Etnik ten tonu (Skin_Body baseColor). */
  skinTone?: SkinTone;
  /** Vital tabanlı cilt tonu (siyanoz/sarılık/solgunluk) — baseColor üstüne çarpımsal. */
  skinTint?: SkinTint;
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

    return (
      <group ref={ref} scale={scale} position={position}>
        <primitive object={clone} />
      </group>
    );
  },
);

AnimatedPatientModel.displayName = "AnimatedPatientModel";
