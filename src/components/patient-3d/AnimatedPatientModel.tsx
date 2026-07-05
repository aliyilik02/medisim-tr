import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF, useAnimations } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { SkeletonUtils } from "three-stdlib";
import { LoopOnce, LoopRepeat, MeshStandardMaterial, SkinnedMesh, type Group, type Object3D, type AnimationClip } from "three";
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
import { buildHair, HAIR_BONE } from "./hairMeshes";
import {
  buildVisemeTimeline,
  sampleViseme,
  visemeToArkit,
  LIPSYNC_ARKIT_KEYS,
  type VisemeTimeline,
} from "@/engine";
import {
  patientVertexCommon,
  patientVertexDisplacement,
  patientFragmentCommon,
  patientFragmentColor,
} from "./shaders/patientShader";
import { Matrix4, type Box3 } from "three";

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

// ── Zonal kalibrasyon: kemik bind pozisyonlarından iki-nokta doğrusal harita ──
// Mixamo oranları 8-head canon'dan farklı (kafa payı büyük) → bbox min/max
// haritası yaka/etek bandlarını kaydırıyordu (çenede önlük sızıntısı).
// Çözüm: bind iskeletinden omuz (glenohumeral ≈ canon 0.83) ve uyluk ortası
// (kalça-diz ortası ≈ canon 0.375, landmark tablosu: 0.50/0.25) LOKAL Y'leri
// ölçülür; yN haritası bu iki noktadan geçirilir. Kafa oranı farklı kalsa da
// önlük yaka/etek bandları anatomik yerine oturur. Kemik yoksa bbox fallback.
const CANON_SHOULDER_RATIO = 0.83;
const CANON_MIDTHIGH_RATIO = 0.375;
const _bindM = new Matrix4();
export function measureZoneFromBones(mesh: SkinnedMesh): { yMin: number; height: number } | null {
  const skel = mesh.skeleton;
  if (!skel?.bones?.length || skel.bones.length !== skel.boneInverses.length) return null;
  // boneInverse: mesh-local → kemik bind uzayı; tersi = kemiğin bind konumu
  // mesh-LOKAL uzayda (position attribute ile aynı uzay — shader zSrc).
  const bindY = (name: string): number | null => {
    const i = skel.bones.findIndex((b) => b.name === name);
    if (i < 0) return null;
    _bindM.copy(skel.boneInverses[i]).invert();
    return _bindM.elements[13];
  };
  const pick = (names: string[]) => names.map(bindY).filter((v): v is number => v !== null);
  const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
  const arms = pick(["mixamorigLeftArm", "mixamorigRightArm"]);
  const hips = pick(["mixamorigLeftUpLeg", "mixamorigRightUpLeg"]);
  const knees = pick(["mixamorigLeftLeg", "mixamorigRightLeg"]);
  if (!arms.length || !hips.length || !knees.length) return null;
  const yShoulder = avg(arms);
  const yMidThigh = (avg(hips) + avg(knees)) / 2;
  const height = (yShoulder - yMidThigh) / (CANON_SHOULDER_RATIO - CANON_MIDTHIGH_RATIO);
  if (!(height > 0.01)) return null;
  return { yMin: yShoulder - CANON_SHOULDER_RATIO * height, height };
}

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

/** Animasyon yönetmeni kararı (engine/animation-director.AnimationDecision
    ile yapısal uyumlu alt küme) — verilirse `clip` prop'unu ezer ve
    crossfade/hız/loop/overlay motor kararından sürülür. */
export interface ClipDecision {
  clip: PatientClip;
  /** Önceki klipten geçiş süresi (sn). */
  crossfadeSec?: number;
  /** Oynatma hızı çarpanı (arrest 0.15, bilinç kapalı 0.4 …). */
  speed?: number;
  /** false → tek oynat + son karede kal (kusma/öksürük olayı). */
  loop?: boolean;
  /** Taban klibin üstüne kısmi ağırlıklı ek katman (iskemik ağrı %35). */
  overlay?: { clip: PatientClip; weight: number };
}

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
  /** Animasyon yönetmeni kararı — verilirse `clip`i ezer; crossfade/hız/
      loop/overlay motor kararından gelir (useAnimationDirector). */
  decision?: ClipDecision | null;
  /** Etnik ten tonu (Skin_Body baseColor). */
  skinTone?: SkinTone;
  /** Vital tabanlı cilt tonu (siyanoz/sarılık/solgunluk) — baseColor üstüne çarpımsal. */
  skinTint?: SkinTint;
  /** Hasta konuşuyor mu? true iken ağız morph'u (jawOpen) lipsync osilasyonu yapar. */
  speaking?: boolean;
  /** Konuşulan metin (TTS ile senkron). Verilirse fonetik viseme lipsync
      (TR grafem→viseme, engine/lipsync) devreye girer — 9 ARKit ağız morph'u
      metne göre şekillenir. Verilmezse speaking=true eski jawOpen osilasyonu. */
  speechText?: string | null;
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
  /** Prosedürel hareket katmanı (agitation-mapping) — mixer pozunun ÜSTÜNE
      additive kemik ofsetleri: tremor (rigor titremesi), restlessness
      (ağrı kıpırdanması). Verilmezse katman kapalı. */
  agitation?: { tremor: number; restlessness: number };
}

export const AnimatedPatientModel = forwardRef<Group, Props>(
  (
    {
      variant = DEFAULT_ANIMATED_VARIANT,
      clip = "laying_idle",
      decision = null,
      skinTone = DEFAULT_SKIN_TONE,
      skinTint = "normal",
      speaking = false,
      speechText = null,
      equipment,
      scale = MODEL_SCALE,
      position = [0, -0.243, 0],
      visualState,
      agitation,
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
    // Önlük shader'ları — uZoneYMin/uZoneHeight LOKAL geometri bbox'ından.
    // DİKKAT: world uzayı KULLANILMAZ — Mixamo cm-rig'de (armature scale 0.01
    // + -90°X) bind-poz world kutusu ~5mm'lik dilime çöker ve boy ekseni
    // Y olmaktan çıkar; lokal geometri uzayında boy ekseni Y ve ölçek sağlam.
    const gownShadersRef = useRef<{ uniforms: Record<string, { value: unknown }> }[]>([]);
    const zoneBoxRef = useRef<{ yMin: number; height: number } | null>(null);
    useMemo(() => {
      const [sr, sg, sb] = SKIN_TONE_PRESETS[skinTone];
      const [tr, tg, tb] = SKIN_TINT_PRESETS[skinTint];
      const base: [number, number, number] = [sr * tr, sg * tg, sb * tb];
      baseSkinRef.current = base;
      const mats: MeshStandardMaterial[] = [];
      // Yeniden koşumda (ton değişimi) eski clone materyal shader'ları bayat — sıfırla.
      gownShadersRef.current = [];
      zoneBoxRef.current = null;
      clone.traverse((obj) => {
        if ("isMesh" in obj && (obj as any).isMesh) {
          const mesh = obj as any;
          const mat = mesh.material as MeshStandardMaterial;
          if (mat && SKIN_MATERIAL_NAMES.includes(mat.name)) {
            if (!zoneBoxRef.current) {
              // Önce kemik kalibrasyonu (anatomik doğru), yoksa bbox fallback.
              if ((mesh as any).isSkinnedMesh) {
                zoneBoxRef.current = measureZoneFromBones(mesh as SkinnedMesh);
              }
              if (!zoneBoxRef.current && mesh.geometry?.attributes?.position) {
                mesh.geometry.computeBoundingBox();
                const bb = mesh.geometry.boundingBox as Box3 | null;
                const h = bb ? bb.max.y - bb.min.y : 0;
                if (bb && h > 0.01) zoneBoxRef.current = { yMin: bb.min.y, height: h };
              }
            }
            // SkeletonUtils.clone materyali REFERANSLA paylaşır (drei useGLTF
            // global cache). Per-frame mat.color/roughness mutasyonu cache'i
            // kalıcı bozar (başka sayfada siyanotik/terli hasta sızar) → klonla.
            const local = mat.clone();
            mesh.material = local;
            local.color.setRGB(base[0], base[1], base[2]);
            // Hasta önlüğü — shader bölge maskesi (giysi mesh'i değil).
            // Zonal/klinik uniform'lar NÖTR (0): cilt rengi per-frame JS
            // yolundan sürülmeye devam eder; shader sadece önlüğü çizer.
            const zone = zoneBoxRef.current;
            local.onBeforeCompile = (shader) => {
              shader.uniforms.uTime = { value: 0 };
              shader.uniforms.uBreathAmplitude = { value: 0 }; // solunum iskelet animasyonundan
              shader.uniforms.uBreathSpeed = { value: 0 };
              shader.uniforms.uSkinTint = { value: [1, 1, 1] };
              shader.uniforms.uCyanosis = { value: 0 };
              shader.uniforms.uPallor = { value: 0 };
              shader.uniforms.uDiaphoresis = { value: 0 };
              shader.uniforms.uMottled = { value: 0 };
              shader.uniforms.uGownEnable = { value: 1 };
              shader.uniforms.uGownColor = { value: [0, 0, 0] }; // 0 → dahili teal
              shader.uniforms.uZoneYMin = { value: zone?.yMin ?? 0 };
              shader.uniforms.uZoneHeight = { value: zone?.height ?? 0 }; // 0 → canonical fallback
              shader.uniforms.uSss = { value: 0.32 }; // rim-translucency (görsel üçlü)
              shader.uniforms.uSssColor = { value: [0, 0, 0] }; // 0 → dahili sıcak ten kızılı
              shader.vertexShader = shader.vertexShader
                .replace("#include <common>", patientVertexCommon)
                .replace("#include <begin_vertex>", patientVertexDisplacement);
              shader.fragmentShader = shader.fragmentShader
                .replace("#include <common>", patientFragmentCommon)
                .replace("#include <dithering_fragment>", patientFragmentColor);
              gownShadersRef.current.push(shader as unknown as { uniforms: Record<string, { value: unknown }> });
            };
            local.customProgramCacheKey = () => "medisim-bed-gown";
            local.needsUpdate = true;
            mats.push(local);
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

    // Klip geçişi — crossfade. decision verilirse süre/hız/loop motordan;
    // verilmezse eski sabit 0.35s davranışı (geriye uyumlu).
    const activeClip: PatientClip = decision?.clip ?? clip;
    const clipParamsRef = useRef({ fade: 0.35, speed: 1, loop: true });
    clipParamsRef.current = {
      fade: decision?.crossfadeSec ?? 0.35,
      speed: decision?.speed ?? 1,
      loop: decision?.loop ?? true,
    };
    const prevClip = useRef<PatientClip | null>(null);
    useEffect(() => {
      const next = actions[activeClip];
      if (!next) return;
      const { fade, speed, loop } = clipParamsRef.current;
      next.reset();
      next.setLoop(loop ? LoopRepeat : LoopOnce, loop ? Infinity : 1);
      next.clampWhenFinished = !loop; // olay klibi son karede kalır (T-poz sıçraması yok)
      next.setEffectiveTimeScale(speed);
      next.fadeIn(fade).play();
      const prev = prevClip.current;
      if (prev && prev !== activeClip && actions[prev]) {
        actions[prev]!.fadeOut(fade);
      }
      prevClip.current = activeClip;
      return () => {
        next.fadeOut(fade);
      };
    }, [activeClip, actions]);

    // Hız değişimi — klip aynı kalırken karar hızı değişebilir (örn. bilinç
    // kapanınca laying_idle 1 → 0.4; arrest'te 0.15 donuklaşma).
    const decisionSpeed = decision?.speed ?? 1;
    useEffect(() => {
      actions[activeClip]?.setEffectiveTimeScale(decisionSpeed);
    }, [decisionSpeed, activeClip, actions]);

    // Overlay katmanı — taban klibin üstüne kısmi ağırlık (iskemik ağrı).
    // Ağırlık useFrame'de yumuşak rampalanır (fadeIn hedefi hep 1 olduğundan
    // kısmi ağırlık için elle sürülür).
    const overlayTargetRef = useRef<ClipDecision["overlay"] | null>(null);
    overlayTargetRef.current = decision?.overlay ?? null;
    const overlayActiveRef = useRef<PatientClip | null>(null);

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

    // Fonetik viseme lipsync — speechText değişince timeline kurulur;
    // t0 ilk frame'de clock'tan alınır (TTS başlangıcıyla ~senkron).
    const speechRef = useRef<{ tl: VisemeTimeline; t0: number | null } | null>(null);
    useEffect(() => {
      if (speechText && speechText.trim().length > 0) {
        speechRef.current = { tl: buildVisemeTimeline(speechText), t0: null };
      } else {
        speechRef.current = null;
      }
    }, [speechText]);

    const mouthRef = useRef(0);
    useFrame((state, delta) => {
      // ── Overlay katmanı — kısmi ağırlık rampası (0.5s'de hedefe) ──
      {
        const want = overlayTargetRef.current;
        let active = overlayActiveRef.current;
        if (active && want && want.clip !== active) {
          // farklı overlay klibi — eskisini anında kapat (tek overlay desteklenir)
          actions[active]?.stop();
          overlayActiveRef.current = active = null;
        }
        if (want && !active) {
          const a = actions[want.clip];
          if (a) {
            a.reset();
            a.setLoop(LoopRepeat, Infinity);
            a.setEffectiveWeight(0);
            a.play();
            overlayActiveRef.current = active = want.clip;
          }
        }
        if (active) {
          const a = actions[active]!;
          const target = want ? want.weight : 0;
          const w = a.getEffectiveWeight();
          const step = Math.min(Math.abs(target - w), delta / 0.5);
          const next = w + Math.sign(target - w) * step;
          a.setEffectiveWeight(next);
          if (!want && next <= 0.001) {
            a.stop();
            overlayActiveRef.current = null;
          }
        }
      }
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

      // Lipsync — öncelik: fonetik viseme (speechText verildiyse), yoksa
      // eski jawOpen osilasyonu (speaking=true), yoksa ağız kapalı.
      const sp = speechRef.current;
      let visemeApplied = false;
      if (sp) {
        if (sp.t0 === null) sp.t0 = t * 1000;
        const tMs = t * 1000 - sp.t0;
        if (tMs <= sp.tl.totalMs + 150) {
          const w = visemeToArkit(sampleViseme(sp.tl, tMs));
          for (const key of LIPSYNC_ARKIT_KEYS) setMorph(key, w[key] ?? 0);
          visemeApplied = true;
        } else {
          speechRef.current = null; // timeline bitti — ağız kapanışa geçer
        }
      }
      if (!visemeApplied) {
        // Viseme kanalları sıfırlanmalı (kalıntı morph donması önlenir)
        for (const key of LIPSYNC_ARKIT_KEYS) {
          if (key !== "jawOpen") setMorph(key, 0);
        }
        let target = 0;
        if (speaking) {
          target = Math.sin(t * 14) * 0.3 + Math.sin(t * 6) * 0.3 + 0.25;
          target = Math.max(0, Math.min(0.7, target));
        }
        mouthRef.current += (target - mouthRef.current) * 0.2;
        setMorph("jawOpen", mouthRef.current);
      }
    });

    // ── Prosedürel hareket katmanı — mixer SONRASI additive kemik ofseti ──
    // useAnimations mixer'ı kendi useFrame'inde (önce kayıtlı → önce koşar)
    // günceller; bu useFrame mixer pozunun üstüne ekler. Mixamo kliplerinde
    // tüm iskelet keyli → mixer her frame mutlak değer yazar, += birikmez.
    const agitationRef = useRef(agitation);
    agitationRef.current = agitation;
    const agitBones = useMemo(() => {
      const get = (n: string) => clone.getObjectByName(n) ?? null;
      return {
        head: get("mixamorigHead"),
        spine: get("mixamorigSpine1"),
        armL: get("mixamorigLeftArm"),
        armR: get("mixamorigRightArm"),
        handL: get("mixamorigLeftHand"),
        handR: get("mixamorigRightHand"),
      };
    }, [clone]);
    useFrame((state) => {
      const ag = agitationRef.current;
      if (!ag || (ag.tremor <= 0.01 && ag.restlessness <= 0.01)) return;
      const t = state.clock.getElapsedTime();
      const b = agitBones;
      // Tremor — yüksek frekans (≈9 Hz), faz kaydırmalı ince sarsıntı
      if (ag.tremor > 0.01) {
        const a = ag.tremor * 0.028;
        if (b.armL) b.armL.rotation.x += a * Math.sin(t * 56);
        if (b.armR) b.armR.rotation.x += a * Math.sin(t * 56 + 2.1);
        if (b.handL) b.handL.rotation.z += a * 1.4 * Math.sin(t * 62 + 0.7);
        if (b.handR) b.handR.rotation.z += a * 1.4 * Math.sin(t * 62 + 3.4);
        if (b.head) b.head.rotation.z += a * 0.5 * Math.sin(t * 48 + 1.3);
      }
      // Restlessness — yavaş (≈0.3 Hz) baş çevirme + gövde kıpırdanması
      if (ag.restlessness > 0.01) {
        const r = ag.restlessness;
        if (b.head) {
          b.head.rotation.y += r * 0.14 * Math.sin(t * 1.7);
          b.head.rotation.x += r * 0.05 * Math.sin(t * 1.1 + 0.8);
        }
        if (b.spine) b.spine.rotation.z += r * 0.035 * Math.sin(t * 1.3 + 2.0);
      }
    });

    // Saç — Head kemiğine kalıcı ekle (hasta kel görünmesin; animasyonu takip eder)
    useEffect(() => {
      const bone = clone.getObjectByName(HAIR_BONE.bone);
      if (!bone) return;
      const hairObj = buildHair(variant);
      if (!hairObj) return;
      bone.add(hairObj);
      return () => {
        bone.remove(hairObj);
      };
    }, [clone, variant]);

    // Ekipman — kemiğe ekle (animasyonu otomatik takip eder)
    useEffect(() => {
      if (!equipment?.length) return;
      const added: { parent: Object3D; obj: Object3D }[] = [];
      for (const kind of equipment) {
        const spec = EQUIPMENT_BONE[kind];
        const bone = clone.getObjectByName(spec.bone);
        if (!bone) continue;
        const obj = buildEquipment(kind);
        obj.name = `equip_${kind}`; // TubingLayer hortum ucunu adla bulur
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
