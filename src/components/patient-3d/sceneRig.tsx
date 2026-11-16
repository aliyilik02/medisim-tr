// ============================================================
// sceneRig — hasta sahnesinin odadan BAĞIMSIZ ortak parçaları
// ============================================================
// Kamera presetleri + kamera sürücüsü, görüş kaydırma, IBL, ölçüm probu ve
// sedyedeki hasta sarmalayıcısı. Eski acil odası sahnesinden (PatientRoomScene,
// 16 Kas 2026'da kapatıldı) ayrıştırıldı; poliklinik sahnesi bunları kullanır.
// Sayılar "hasta birimi"ndedir (1 birim ≈ 1.5625 m, zemin y=-0.27) — hasta
// yığını bu birimde kalibre; metreye çeviri polyclinic/layout.ts'te.
// ============================================================

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import {
  Box3,
  PMREMGenerator,
  Vector3,
  type Group,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  type SkinnedMesh,
} from "three";
import { RoomEnvironment } from "three-stdlib";
import { sceneViewShiftPx } from "./sceneLayout";
import {
  AnimatedPatientModel,
  resolveAnimatedModel,
  type ClipDecision,
  type PatientClip,
} from "./AnimatedPatientModel";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import type { SkinTone, PatientVariant } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { EquipmentKind } from "./equipmentMeshes";

type V3 = [number, number, number];

// ── Kamera presetleri (hasta birimi) ──────────────────────────
// Hasta sırtüstü, Z ekseninde: baş ≈ -Z (-0.47), ayak ≈ +Z, sırt y 0.19,
// göğüs y 0.39. Pozlar hasta bbox'ından kalibre (ölçüm, göz kararı değil).
export type CameraPreset = "onden" | "tum_beden" | "genel" | "bas_ucu" | "yan";
export const CAMERA_PRESET_LABELS: Record<CameraPreset, string> = {
  onden: "Önden",
  tum_beden: "Tüm beden",
  genel: "Genel",
  bas_ucu: "Baş ucu",
  yan: "Yan",
};
export const DEFAULT_CAMERA_PRESET: CameraPreset = "onden";
export interface CameraPose {
  pos: V3;
  target: V3;
}
export const CAMERA_PRESETS_PS: Record<CameraPreset, CameraPose> = {
  // Karşıdan/anterior — yüksekten tepe-anterior bakış (Body Interact).
  onden: { pos: [0.01, 1.78, 0.2], target: [0.01, 0.25, 0.31] },
  // Tepeden, baştan ayağa tüm beden — muayene görünümü.
  tum_beden: { pos: [0.01, 2.45, -0.16], target: [0.01, 0.25, -0.1] },
  // 3/4 genel görünüm (tüm sedye + hasta + oda)
  genel: { pos: [2.0, 1.4, -1.1], target: [0, 0.25, 0] },
  // Baş bölgesi yakın 3/4
  bas_ucu: { pos: [1.3, 0.95, -1.2], target: [0, 0.33, -0.35] },
  // Yan profil (göğüs/solunum) — +X yandan, gövde ortasına
  yan: { pos: [1.75, 0.5, 0.05], target: [0, 0.3, 0.0] },
};

// Sedyedeki hasta: klipler ZATEN yatay (laying_*), gövde Z ekseninde, baş -Z.
export const BED_Z = 0.1;
export const BED_ROT: V3 = [0, Math.PI, 0];

// ── Görsel üçlü kapısı: IBL + post-processing ─────────────────
// PMREM ön-filtreleme yazılım-GL'de (Playwright/e2e) ~20 sn takılır →
// VITE_E2E'de varsayılan KAPALI. ?fx=1 zorla açar, ?fx=0 gerçek tarayıcıda kapatır.
export function visualFxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("fx");
  if (q === "1") return true;
  if (q === "0") return false;
  return import.meta.env.VITE_E2E !== "1";
}

/** Stüdyo IBL — RoomEnvironment'tan PMREM (HDRI dosyası indirmeden). */
export function StudioEnvironment({ intensity = 0.22 }: { intensity?: number }) {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    // three-stdlib RoomEnvironment: fabrika fonksiyonu (class değil) → Scene
    const envScene = RoomEnvironment();
    const rt = pmrem.fromScene(envScene, 0.04);
    scene.environment = rt.texture;
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = intensity;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene, intensity]);
  return null;
}

/** Görüş kaydırma — sahneyi ekranda yatayda kaydırır; dünya ve kamera
 *  presetleri DEĞİŞMEZ. Sol kenardaki katmanın (başucu monitörü) kapattığı
 *  şerit verilir, hasta kalan boş alanın ortasına gelir (kural: sceneLayout).
 *  Projeksiyon matrisi üzerinden çalışır → Html muayene noktaları ve tıklama
 *  ışınları kendiliğinden tutarlı kalır. */
export function ViewShift({ leftInsetPx }: { leftInsetPx: number }) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);
  useEffect(() => {
    const cam = camera as PerspectiveCamera;
    if (!cam.isPerspectiveCamera) return;
    const shift = sceneViewShiftPx(width, leftInsetPx);
    if (shift === 0) {
      cam.clearViewOffset();
      return;
    }
    // Alt-pencere sola kayar → içerik ekranda SAĞA kayar.
    cam.setViewOffset(width, height, -shift, 0, width, height);
    return () => cam.clearViewOffset();
  }, [camera, width, height, leftInsetPx]);
  return null;
}

/** Kamera + OrbitControls hedefini preset'e taşır (preset değişince SNAP —
 *  per-frame lerp OrbitControls ile çakışıp kamerayı güvenilmez yapıyordu). */
export function CameraRig({
  pose,
  controlsRef,
}: {
  pose: CameraPose;
  controlsRef: React.MutableRefObject<{ target: Vector3; update: () => void } | null>;
}) {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(pose.pos[0], pose.pos[1], pose.pos[2]);
    const c = controlsRef.current;
    if (c) {
      c.target.set(pose.target[0], pose.target[1], pose.target[2]);
      c.update();
    }
  }, [pose, camera, controlsRef]);
  return null;
}

/** Canlı kamera okuyucu — orbit ederken pos+target'ı seyrek bildirir (kalibrasyon). */
const r2 = (n: number) => Math.round(n * 100) / 100;
export function CameraReadout({
  controlsRef,
  onUpdate,
}: {
  controlsRef: React.MutableRefObject<{ target: Vector3 } | null>;
  onUpdate: (v: CameraPose) => void;
}) {
  const { camera } = useThree();
  const last = useRef(0);
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (t - last.current < 0.2) return;
    last.current = t;
    const p = camera.position;
    const tg = controlsRef.current?.target;
    onUpdate({
      pos: [r2(p.x), r2(p.y), r2(p.z)],
      target: tg ? [r2(tg.x), r2(tg.y), r2(tg.z)] : [0, 0, 0],
    });
  });
  return null;
}

export function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Sahne yükleniyor…
      </div>
    </Html>
  );
}

// ── Ölçüm probu (yalnız geliştirme; GÖZ yerine SAYI) ──────────
// window.__measureBed=true iken hastanın POZLANMIŞ dünya kutusunu ve seçili
// kemiklerin dünya konumunu her karede yazar:
//   window.__bedMetrics  → hasta biriminde kutu (+ `metric`: metre)
//   window.__boneProbe   → kemik adı → [x, y, z] metre
// scripts/measure-bed-place.mjs bunu okuyup şilte düzlemiyle karşılaştırır.
const _v = new Vector3();
function computePosedWorldBox(root: Object3D, box: Box3): Box3 {
  box.makeEmpty();
  root.traverse((obj) => {
    const sm = obj as SkinnedMesh;
    if ((sm as unknown as { isSkinnedMesh?: boolean }).isSkinnedMesh && sm.geometry?.attributes?.position) {
      const pos = sm.geometry.attributes.position;
      const stride = Math.max(1, Math.floor(pos.count / 1500));
      for (let i = 0; i < pos.count; i += stride) {
        _v.fromBufferAttribute(pos, i);
        sm.applyBoneTransform(i, _v); // pozlanmış yerel konum
        _v.applyMatrix4(sm.matrixWorld);
        box.expandByPoint(_v);
      }
    } else if ((obj as unknown as { isMesh?: boolean }).isMesh && (obj as Mesh).geometry?.attributes?.position) {
      const mm = obj as Mesh;
      const pos = mm.geometry.attributes.position;
      const stride = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += stride) {
        _v.fromBufferAttribute(pos, i);
        _v.applyMatrix4(mm.matrixWorld);
        box.expandByPoint(_v);
      }
    }
  });
  return box;
}

const PROBE_BONES = [
  "mixamorigHead",
  "mixamorigHips",
  "mixamorigLeftHand",
  "mixamorigRightHand",
  "mixamorigLeftFoot",
  "mixamorigRightFoot",
  "mixamorigLeftArm",
  "mixamorigRightArm",
];

function BedMetricsProbe({
  targetRef,
  unit,
  originY,
}: {
  targetRef: React.RefObject<Group | null>;
  /** Dünya birimi → hasta birimi böleni (metre sahnede PS, eski sahnede 1). */
  unit: number;
  /** Hasta-uzayı grubunun dünya y konumu. */
  originY: number;
}) {
  const box = useMemo(() => new Box3(), []);
  useFrame(() => {
    if (typeof window === "undefined") return;
    const w = window as unknown as { __measureBed?: boolean; __bedMetrics?: object; __boneProbe?: object };
    if (!w.__measureBed) return;
    const g = targetRef.current;
    if (!g) return;
    computePosedWorldBox(g, box);
    const ps = (n: number, y = false) => (y ? (n - originY) / unit : n / unit);
    w.__bedMetrics = {
      minY: ps(box.min.y, true), maxY: ps(box.max.y, true),
      minX: ps(box.min.x), maxX: ps(box.max.x),
      minZ: ps(box.min.z), maxZ: ps(box.max.z),
      metric: {
        minY: box.min.y, maxY: box.max.y,
        minX: box.min.x, maxX: box.max.x,
        minZ: box.min.z, maxZ: box.max.z,
      },
    };
    const bones: Record<string, V3> = {};
    for (const name of PROBE_BONES) {
      const b = g.getObjectByName(name);
      if (!b) continue;
      b.getWorldPosition(_v);
      bones[name] = [r2(_v.x * 10) / 10, r2(_v.y * 10) / 10, r2(_v.z * 10) / 10];
    }
    w.__boneProbe = bones;
  });
  return null;
}

// ── Sedyedeki hasta ───────────────────────────────────────────
export interface BedPatientProps {
  variant: PatientVariant;
  clip: PatientClip;
  decision?: ClipDecision | null;
  skinTone: SkinTone;
  skinTint: SkinTint;
  visualState?: VisualState;
  agitation?: { tremor: number; restlessness: number };
  speaking: boolean;
  speechText?: string | null;
  equipment?: EquipmentKind[];
  /** Ölçüm probu için: dünya birimi → hasta birimi böleni + grup y'si. */
  probeUnit?: number;
  probeOriginY?: number;
}

/** Model metadata'sından sedye yerleşimini kurar (hasta birimi uzayında yaşar). */
export function BedPatient({
  variant,
  clip,
  decision,
  skinTone,
  skinTint,
  visualState,
  agitation,
  speaking,
  speechText,
  equipment,
  probeUnit = 1,
  probeOriginY = 0,
}: BedPatientProps) {
  const meta = resolveAnimatedModel(variant);
  const groupRef = useRef<Group>(null);
  return (
    <group ref={groupRef} position={[0, meta.bedPosY, BED_Z]} rotation={BED_ROT} scale={meta.bedScale}>
      {/* key={variant}: varyant değişince temiz remount — eski clone/mixer sızıntısı
          (yerleşim kayması) engellenir. Klip değişimi aynı mixer'da crossfade kalır. */}
      <AnimatedPatientModel
        key={variant}
        variant={variant}
        clip={clip}
        decision={decision}
        skinTone={skinTone}
        skinTint={skinTint}
        visualState={visualState}
        agitation={agitation}
        speaking={speaking}
        speechText={speechText}
        equipment={equipment}
        scale={1}
        position={[0, 0, 0]}
      />
      <BedMetricsProbe targetRef={groupRef} unit={probeUnit} originY={probeOriginY} />
    </group>
  );
}
