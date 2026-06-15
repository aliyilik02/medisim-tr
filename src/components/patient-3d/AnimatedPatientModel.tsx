import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { MeshStandardMaterial, SkinnedMesh, type Group, type Object3D, type AnimationClip } from "three";
import {
  SKIN_TONE_PRESETS,
  DEFAULT_SKIN_TONE,
  type SkinTone,
  type PatientVariant,
} from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { VisualState } from "@/clinical/clinicalVisualMapping";

// Sürekli klinik görsel renk faktörleri (per-frame harman, shader değil —
// bed sahnesi MeshStandardMaterial; GLSL derleme riski yok).
const CYANOSIS_FACTOR: [number, number, number] = [0.6, 0.7, 0.96];
import { buildEquipment, EQUIPMENT_BONE, type EquipmentKind } from "./equipmentMeshes";

// ============================================================
// Animasyonlu hasta modeli — Faz 2/3 (iskelet animasyon + mimik)
// ============================================================
// Asset: public/3d/patient-animated{,-child}.glb (Mixamo auto-rig, 65 kemik, meshopt).
// MPFB rig'i bu mesh'lerde patolojik ters deformasyon veriyordu (Blender 5.1.1) →
// Mixamo auto-rigger ile çözüldü. Klipler Mixamo "Laying *" FBX'lerinden tek rig'e
// (NLA) birleştirildi; konuşma kliplerinde kafa düz (Head+Neck rotasyon silindi).
// Mimik (52 ARKit blendshape) Mixamo soydu → proximity (KDTree en-yakın-vertex)
// transfer ile MPFB master'dan geri aktarıldı (bbox birebir, aynı MakeHuman base).
// İskelet animasyon (gövde) + morph (göz kırpma + lipsync) AYNI modelde.
// Varyant boyu: çocuk mesh Mixamo'da kadından KISA üretildi (Blender rest ölçümü
// 1.211 vs 1.594 = %76 ≈ 7-8 yaş antropometrisi) → AYNI MODEL_SCALE ile çocuk
// doğal olarak küçük görünür, ekstra ölçek gerekmez.
// ============================================================

const MODEL_SCALE = 0.642; // tüm varyantlar aynı faktör → mesh'in gerçek boy oranı korunur
const SKIN_MATERIAL_NAMES = ["Skin_Head", "Skin_Body", "Skin_Arm", "Skin_Leg"];

const SKIN_TINT_PRESETS: Record<SkinTint, [number, number, number]> = {
  normal: [1.0, 1.0, 1.0],
  cyanosis: [0.65, 0.75, 0.95],
  jaundice: [1.15, 1.05, 0.55],
  pallor: [0.85, 0.8, 0.78],
};

/** Oynatılabilir animasyon klipleri (GLB içindeki NLA track adları). */
export type PatientClip =
  | "laying_idle"
  | "laying_breathless"
  | "idle"
  | "talk_gesture"
  | "talk_shrug"
  | "pain"
  | "moaning"
  | "vomiting"
  | "cough_mild"
  | "cough_severe"
  | "take_pill"
  | "use_inhaler";

/** Klip → Türkçe etiket (demo + senaryo UI). */
export const CLIP_LABELS: Record<PatientClip, string> = {
  laying_idle: "Sakin yatıyor",
  laying_breathless: "Nefes darlığı",
  idle: "Ayakta sakin",
  talk_gesture: "Konuşuyor (el)",
  talk_shrug: "Konuşuyor (omuz)",
  pain: "Ağrı (kıvranma)",
  moaning: "İnliyor",
  vomiting: "Kusuyor",
  cough_mild: "Hafif öksürük",
  cough_severe: "Şiddetli öksürük",
  take_pill: "İlaç alıyor",
  use_inhaler: "İnhaler",
};

/** Yatakta (supine) anlamsız olan klipler — bed sahnesinde gizlenir. */
export const NON_SUPINE_CLIPS: PatientClip[] = ["idle", "pain"];

/** Animasyonlu modeli olan varyantlar — url + klipler + yatak hizalama metadata. */
export interface AnimatedModelMeta {
  url: string;
  label: string;
  clips: PatientClip[];
  /** Yatak (supine) sahnesinde dünya ölçeği — çocuk küçük. */
  bedScale: number;
  /**
   * Yatak sahnesinde wrapper Y konumu (world). laying_idle'da hasta sırtı mattress'a
   * oturacak şekilde screenshot ile kalibre. TÜM klipler aynı posY kullanır →
   * pelvis sabit kalır, animasyon (öksürük/kusma/inleme) gövdeyi doğal oynatır.
   * (Per-klip min-Z denendi: uzuv sarkan kliplerde gövdeyi havalandırdı → terk edildi.)
   */
  bedPosY: number;
}

export const ANIMATED_MODELS: Partial<Record<PatientVariant, AnimatedModelMeta>> = {
  "female-adult": {
    url: "/3d/patient-animated.glb",
    label: "Kadın",
    clips: ["laying_idle", "idle", "talk_gesture", "talk_shrug", "pain", "cough_mild", "cough_severe"],
    bedScale: 0.62,
    bedPosY: -0.337, // objektif ölçüm + ayak yükseltme nudge (scripts/measure-bed-place.mjs)
  },
  "male-adult": {
    url: "/3d/patient-animated-male.glb",
    label: "Erkek",
    clips: ["laying_idle", "laying_breathless", "talk_gesture", "talk_shrug", "cough_mild", "cough_severe", "moaning", "vomiting", "take_pill", "use_inhaler"],
    bedScale: 0.62,
    bedPosY: -0.505, // objektif ölçüm + ayak yükseltme nudge
  },
  child: {
    url: "/3d/patient-animated-child.glb",
    label: "Çocuk",
    clips: ["laying_idle", "laying_breathless", "talk_gesture", "talk_shrug", "cough_mild", "cough_severe", "take_pill", "use_inhaler"],
    bedScale: 0.5, // çocuk küçük (kullanıcı: fazla uzundu)
    bedPosY: -0.113, // objektif ölçüm + çocuk yatak-içi yükseltme (+0.035)
  },
  elderly: {
    url: "/3d/patient-animated-elderly.glb",
    label: "Yaşlı",
    clips: ["laying_idle", "laying_breathless", "talk_gesture", "talk_shrug", "cough_mild", "cough_severe", "moaning", "vomiting", "take_pill", "use_inhaler"],
    bedScale: 0.62,
    bedPosY: -0.446, // objektif ölçüm + ayak yükseltme nudge
  },
};
export const ANIMATED_VARIANTS = Object.keys(ANIMATED_MODELS) as PatientVariant[];
const DEFAULT_ANIMATED_VARIANT: PatientVariant = "female-adult";

function resolveModel(variant: PatientVariant) {
  return ANIMATED_MODELS[variant] ?? ANIMATED_MODELS[DEFAULT_ANIMATED_VARIANT]!;
}

// Tüm animasyonlu varyantları preload et — varyant değişiminde anlık geçiş.
ANIMATED_VARIANTS.forEach((v) => useGLTF.preload(ANIMATED_MODELS[v]!.url));

interface Props {
  /** Hasta varyantı (animasyonlu model olan: female-adult, child). */
  variant?: PatientVariant;
  /** Oynatılacak animasyon klibi. Değişince crossfade ile geçer. Varyantta yoksa no-op. */
  clip?: PatientClip;
  /** Etnik ten tonu (Skin_Body baseColor). */
  skinTone?: SkinTone;
  /** Vital tabanlı cilt tonu (siyanoz/sarılık/solgunluk) — baseColor üstüne çarpımsal. */
  skinTint?: SkinTint;
  /** Hasta konuşuyor mu? true iken ağız morph'u (jawOpen) lipsync osilasyonu yapar. */
  speaking?: boolean;
  /** Hastaya takılı ekipman (kemik-bağlı, animasyonu takip eder). */
  equipment?: EquipmentKind[];
  /** Wrapper scale (varsayılan canonical eşitleme). */
  scale?: number;
  /** Wrapper konum (yatak/supine hizalama için). */
  position?: [number, number, number];
  /** Sürekli klinik görsel durum (clinicalVisualMapping). Verilirse cilt rengi
      per-frame siyanoz/solgunluk ile harmanlanır, terleme parlaklık katar —
      ayrık skinTint'in ÜSTÜNE. Verilmezse ayrık skinTint davranışı korunur. */
  visualState?: VisualState;
}

export const AnimatedPatientModel = forwardRef<Group, Props>(
  (
    {
      variant = DEFAULT_ANIMATED_VARIANT,
      clip = "laying_idle",
      skinTone = DEFAULT_SKIN_TONE,
      skinTint = "normal",
      speaking = false,
      equipment,
      scale = MODEL_SCALE,
      position = [0, -0.243, 0],
      visualState,
    },
    ref,
  ) => {
    const model = resolveModel(variant);
    const { scene, animations } = useGLTF(model.url) as unknown as {
      scene: Group;
      animations: AnimationClip[];
    };
    // SkinnedMesh + iskelet birlikte klonlanmalı → SkeletonUtils
    const clone = useMemo(() => SkeletonUtils.clone(scene), [scene]);
    const { actions } = useAnimations(animations, clone);

    // Cilt tonu × vital tint → material baseColor (çarpımsal). Ayrıca base
    // rengi + cilt materyallerini ref'e topla (per-frame sürekli görsel için).
    const skinMatsRef = useRef<MeshStandardMaterial[]>([]);
    const baseSkinRef = useRef<[number, number, number]>([1, 1, 1]);
    useMemo(() => {
      const [sr, sg, sb] = SKIN_TONE_PRESETS[skinTone];
      const [tr, tg, tb] = SKIN_TINT_PRESETS[skinTint];
      const base: [number, number, number] = [sr * tr, sg * tg, sb * tb];
      baseSkinRef.current = base;
      const mats: MeshStandardMaterial[] = [];
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const mat = (obj as any).material as MeshStandardMaterial;
          if (mat && SKIN_MATERIAL_NAMES.includes(mat.name)) {
            mat.color.setRGB(base[0], base[1], base[2]);
            mat.needsUpdate = true;
            mats.push(mat);
          }
        }
      });
      skinMatsRef.current = mats;
    }, [clone, skinTone, skinTint]);

    // Sürekli klinik görsel — render'da ref'e aynala (stale-closure önleme),
    // useFrame içinde yumuşatılmış değerle cilt rengini sür.
    const visualStateRef = useRef<VisualState | undefined>(visualState);
    visualStateRef.current = visualState;
    const clinicalRef = useRef({ cyanosis: 0, pallor: 0, diaphoresis: 0, mottled: 0 });

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
    useFrame((state, delta) => {
      // ── Sürekli klinik görsel — cilt rengi harmanı (visualState varsa) ──
      const vs = visualStateRef.current;
      const mats = skinMatsRef.current;
      if (vs && mats.length) {
        const cl = clinicalRef.current;
        const k = Math.min(delta / 1.2, 1.0);
        cl.cyanosis += (vs.cyanosis - cl.cyanosis) * k;
        cl.pallor += (vs.pallor - cl.pallor) * k;
        cl.diaphoresis += (vs.diaphoresis - cl.diaphoresis) * k;
        cl.mottled += (vs.mottled - cl.mottled) * k;

        const [br, bg, bb] = baseSkinRef.current;
        // Siyanoz — base → base × mavi-mor faktör
        let r = br * (1 - cl.cyanosis) + br * CYANOSIS_FACTOR[0] * cl.cyanosis;
        let g = bg * (1 - cl.cyanosis) + bg * CYANOSIS_FACTOR[1] * cl.cyanosis;
        let b = bb * (1 - cl.cyanosis) + bb * CYANOSIS_FACTOR[2] * cl.cyanosis;
        // Solgunluk — luminansa (griye) doğru, hafif açık
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        r = r * (1 - cl.pallor) + lum * 1.06 * cl.pallor;
        g = g * (1 - cl.pallor) + lum * 1.06 * cl.pallor;
        b = b * (1 - cl.pallor) + lum * 1.06 * cl.pallor;
        // Mottled — koyu-mor (uniform yaklaşım; desenli sürüm shader yolunda)
        const mf = cl.mottled * 0.5;
        r = r * (1 - mf) + r * 0.72 * mf;
        g = g * (1 - mf) + g * 0.58 * mf;
        b = b * (1 - mf) + b * 0.66 * mf;

        for (const mat of mats) {
          mat.color.setRGB(r, g, b);
          // Diaforez — roughness düşür (terli parlama). Base bir kez yakalanır.
          if (mat.userData.__baseRough === undefined) {
            mat.userData.__baseRough = mat.roughness;
          }
          const baseRough = mat.userData.__baseRough as number;
          mat.roughness = baseRough * (1 - cl.diaphoresis) + 0.25 * cl.diaphoresis;
        }
      }

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

    // Ekipman — kemiğe ekle (animasyonu otomatik takip eder)
    useEffect(() => {
      if (!equipment?.length) return;
      const added: { parent: Object3D; obj: Object3D }[] = [];
      for (const kind of equipment) {
        const spec = EQUIPMENT_BONE[kind];
        const bone = clone.getObjectByName(spec.bone);
        if (!bone) continue;
        const obj = buildEquipment(kind);
        obj.position.set(spec.offset[0], spec.offset[1], spec.offset[2]);
        if (spec.rotation) obj.rotation.set(spec.rotation[0], spec.rotation[1], spec.rotation[2]);
        obj.scale.setScalar(spec.scale ?? 1);
        bone.add(obj);
        added.push({ parent: bone, obj });
      }
      return () => added.forEach(({ parent, obj }) => parent.remove(obj));
    }, [clone, equipment]);

    return (
      <group ref={ref} scale={scale} position={position}>
        <primitive object={clone} />
      </group>
    );
  },
);

AnimatedPatientModel.displayName = "AnimatedPatientModel";
