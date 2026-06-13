// ============================================================
// PatientRoomScene — Faz 2 Klinik Sahne (supine hasta + acil odası)
// ============================================================
// Acil servis odası (public/3d/er-room.glb, metre) + supine yatan hasta.
// Oda metre ölçeğinde; hasta ~1.02 world birimi (1 birim ≈ 1.57m) → oda
// ROOM_SCALE ile küçültülüp eşitlenir. Hasta -90°X döndürülerek (anterior
// yukarı = supine) yatağa yatırılır. Standing /dialog-3d-demo etkilenmez.
// Konum sabitleri screenshot ile kalibre edildi.
// ============================================================

import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group, type Object3D, type SkinnedMesh, type Mesh } from "three";
import { AnimatedPatientModel, ANIMATED_MODELS, type PatientClip } from "./AnimatedPatientModel";
import { type SkinTone, DEFAULT_SKIN_TONE, type PatientVariant } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { EquipmentKind } from "./equipmentMeshes";

// ── Yatak yerleşim ölçüm probu (dev-only, GÖZ yerine SAYI) ──────────────
// window.__measureBed=true iken hastanın POZLANMIŞ (skinned) dünya bbox'unu
// her frame hesaplar → window.__bedMetrics. Playwright harness bunu okuyup
// mattress düzlemiyle karşılaştırır (scripts/measure-bed-place.mjs).
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
        sm.applyBoneTransform(i, _v); // skinned (pozlanmış) yerel konum
        _v.applyMatrix4(sm.matrixWorld); // dünya
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

function BedMetricsProbe({ targetRef }: { targetRef: React.RefObject<Group | null> }) {
  const box = useMemo(() => new Box3(), []);
  useFrame(() => {
    const w = window as unknown as { __measureBed?: boolean; __bedMetrics?: object };
    if (typeof window === "undefined" || !w.__measureBed) return;
    const g = targetRef.current;
    if (!g) return;
    computePosedWorldBox(g, box);
    w.__bedMetrics = {
      minY: box.min.y, maxY: box.max.y,
      minX: box.min.x, maxX: box.max.x,
      minZ: box.min.z, maxZ: box.max.z,
    };
  });
  return null;
}

const ROOM_URL = "/3d/er-room.glb";
// metre → hasta world birimi (hasta ~1.6m ≈ 1.02 birim → 1 birim ≈ 1.57m)
const ROOM_SCALE = 0.64;
const ROOM_FLOOR_Y = -0.27; // oda zeminini sahne tabanına indir
// Animasyonlu hasta supine (laying_idle klibi ZATEN yatay → -90° döndürme YOK).
// Three.js'de gövde Z ekseni boyunca yatıyor (baş -z). Yerleşim varyant başına
// metadata'dan (bedScale + bedPosY, laying_idle'da kalibre). TÜM klipler aynı
// posY → pelvis sabit, animasyon gövdeyi doğal oynatır (gömülme/havalanma yok).
const BED_Z = 0.1; // yatak uzun ekseninde konum
const BED_ROT: [number, number, number] = [0, Math.PI, 0]; // baş başlık ucuna

// Kamera presetleri — hasta -Z'de (baş başlık ucu), monitör sağda.
export type CameraPreset = "genel" | "bas_ucu" | "monitor";
export const CAMERA_PRESET_LABELS: Record<CameraPreset, string> = {
  genel: "Genel",
  bas_ucu: "Baş ucu",
  monitor: "Monitör",
};
const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  genel: { pos: [2.0, 1.4, -1.1], target: [0, 0.2, 0] },
  bas_ucu: { pos: [1.0, 0.95, -1.35], target: [0, 0.3, -0.45] },
  monitor: { pos: [2.3, 0.95, 0.35], target: [0.1, 0.25, 0.1] },
};

useGLTF.preload(ROOM_URL);

// Kamera + OrbitControls hedefini preset'e yumuşak taşır.
function CameraRig({ preset, controlsRef }: { preset: CameraPreset; controlsRef: React.MutableRefObject<{ target: Vector3; update: () => void } | null> }) {
  const { camera } = useThree();
  const want = CAMERA_PRESETS[preset];
  const target = useMemo(() => new Vector3(), []);
  const pos = useMemo(() => new Vector3(), []);
  useEffect(() => {
    pos.set(...want.pos);
    target.set(...want.target);
  }, [preset, want, pos, target]);
  useFrame(() => {
    camera.position.lerp(pos, 0.12);
    const c = controlsRef.current;
    if (c) {
      c.target.lerp(target, 0.12);
      c.update();
    }
  });
  return null;
}

function ErRoom() {
  const { scene } = useGLTF(ROOM_URL);
  const clone = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={clone} scale={ROOM_SCALE} position={[0, ROOM_FLOOR_Y, 0]} />;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Sahne yükleniyor…
      </div>
    </Html>
  );
}

interface Props {
  /** Hasta varyantı (female-adult, child …). */
  variant?: PatientVariant;
  skinTone?: SkinTone;
  skinTint?: SkinTint;
  /** Oynatılacak klip (senaryo durumundan: laying_idle, talk, cough, pain). */
  clip?: PatientClip;
  /** Hasta konuşuyor mu (lipsync jawOpen). */
  speaking?: boolean;
  /** Takılı ekipman (kemik-bağlı). */
  equipment?: EquipmentKind[];
  /** Kamera preset (genel/baş-ucu/monitör). */
  cameraPreset?: CameraPreset;
  className?: string;
}

export function PatientRoomScene({
  variant = "female-adult",
  skinTone = DEFAULT_SKIN_TONE,
  skinTint = "normal",
  clip = "laying_idle",
  speaking = false,
  equipment,
  cameraPreset = "genel",
  className,
}: Props) {
  const controlsRef = useRef<{ target: Vector3; update: () => void } | null>(null);
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop="always"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: [2.0, 1.4, -1.1], fov: 38 }}
        shadows
      >
        <color attach="background" args={["#0a0a0c"]} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[2, 4, 3]} intensity={0.9} castShadow />
        <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#9fb6c9" />
        <hemisphereLight args={["#ffffff", "#1a1a1f", 0.4]} />

        <Suspense fallback={<LoadingFallback />}>
          <ErRoom />
          {/* Supine hasta — varyant/klip başına yatak hizalama (gömülmeyi önler) */}
          <BedPatient variant={variant} clip={clip} skinTone={skinTone} skinTint={skinTint} speaking={speaking} equipment={equipment} />
        </Suspense>

        <OrbitControls ref={controlsRef as never} target={[0, 0.2, 0]} minDistance={0.6} maxDistance={4} enablePan />
        <CameraRig preset={cameraPreset} controlsRef={controlsRef} />
      </Canvas>
    </div>
  );
}

interface BedPatientProps {
  variant: PatientVariant;
  clip: PatientClip;
  skinTone: SkinTone;
  skinTint: SkinTint;
  speaking: boolean;
  equipment?: EquipmentKind[];
}

// Varyant + klip metadata'sından yatak yerleşimini hesaplar.
function BedPatient({ variant, clip, skinTone, skinTint, speaking, equipment }: BedPatientProps) {
  const meta = ANIMATED_MODELS[variant] ?? ANIMATED_MODELS["female-adult"]!;
  const s = meta.bedScale;
  const groupRef = useRef<Group>(null);
  return (
    <group ref={groupRef} position={[0, meta.bedPosY, BED_Z]} rotation={BED_ROT} scale={s}>
      {/* key={variant}: varyant değişince temiz remount — eski clone/mixer sızıntısı
          (yerleşim kayması) engellenir. Klip değişimi aynı mixer'da crossfade kalır. */}
      <AnimatedPatientModel
        key={variant}
        variant={variant}
        clip={clip}
        skinTone={skinTone}
        skinTint={skinTint}
        speaking={speaking}
        equipment={equipment}
        scale={1}
        position={[0, 0, 0]}
      />
      <BedMetricsProbe targetRef={groupRef} />
    </group>
  );
}
