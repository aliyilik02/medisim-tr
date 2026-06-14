// ============================================================
// PatientRoomScene — Faz 2 Klinik Sahne (supine hasta + acil odası)
// ============================================================
// Acil servis odası (public/3d/er-room.glb, metre) + supine yatan hasta.
// Oda metre ölçeğinde; hasta ~1.02 world birimi (1 birim ≈ 1.57m) → oda
// ROOM_SCALE ile küçültülüp eşitlenir. Hasta -90°X döndürülerek (anterior
// yukarı = supine) yatağa yatırılır. Standing /dialog-3d-demo etkilenmez.
// Konum sabitleri screenshot ile kalibre edildi.
// ============================================================

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Group, type Object3D, type SkinnedMesh, type Mesh } from "three";
import { AnimatedPatientModel, ANIMATED_MODELS, type PatientClip } from "./AnimatedPatientModel";
import { type SkinTone, DEFAULT_SKIN_TONE, type PatientVariant } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { EquipmentKind } from "./equipmentMeshes";
import { VentilatorDevice } from "./VentilatorDevice";

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

// Kamera presetleri. Hasta supine Z ekseninde: baş ≈ -Z (-0.47), ayak ≈ +Z,
// gövde-sırt Y 0.19, göğüs Y 0.39. Pozlar hasta bbox'ından kalibre.
export type CameraPreset = "onden" | "genel" | "bas_ucu" | "yan";
export const CAMERA_PRESET_LABELS: Record<CameraPreset, string> = {
  onden: "Önden",
  genel: "Genel",
  bas_ucu: "Baş ucu",
  yan: "Yan",
};
// Varsayılan açılış görünümü (Body Interact tarzı karşıdan/anterior).
export const DEFAULT_CAMERA_PRESET: CameraPreset = "onden";
const CAMERA_PRESETS: Record<CameraPreset, { pos: [number, number, number]; target: [number, number, number] }> = {
  // Karşıdan/anterior — yüksekten tepe-anterior bakış (Body Interact).
  // Kullanıcının elle orbit edip verdiği değer (canlı okuyucu).
  onden: { pos: [0.01, 1.78, 0.2], target: [0.01, 0.25, 0.31] },
  // 3/4 genel görünüm (tüm yatak + hasta)
  genel: { pos: [2.0, 1.4, -1.1], target: [0, 0.25, 0] },
  // Baş bölgesi yakın 3/4 (genel tarzı, baş-odaklı; güvenilir)
  bas_ucu: { pos: [1.3, 0.95, -1.2], target: [0, 0.33, -0.35] },
  // Yan profil (göğüs/solunum) — +X yandan, gövde ortasına
  yan: { pos: [1.75, 0.5, 0.05], target: [0, 0.3, 0.0] },
};

useGLTF.preload(ROOM_URL);

// Kamera + OrbitControls hedefini preset'e taşır. Per-frame lerp +
// OrbitControls çakışması kamerayı güvenilmez yapıyordu → preset değişince
// SNAP (useEffect bir kez): camera.position + controls.target set + update.
// OrbitControls spherical'ı yeni durumdan senkronize eder (idempotent).
function CameraRig({
  preset,
  controlsRef,
}: {
  preset: CameraPreset;
  controlsRef: React.MutableRefObject<{ target: Vector3; update: () => void } | null>;
}) {
  const { camera } = useThree();
  const want = CAMERA_PRESETS[preset];
  useEffect(() => {
    camera.position.set(want.pos[0], want.pos[1], want.pos[2]);
    const c = controlsRef.current;
    if (c) {
      c.target.set(want.target[0], want.target[1], want.target[2]);
      c.update();
    }
  }, [preset, want, camera, controlsRef]);
  return null;
}

// Canlı kamera okuyucu — orbit ederken pos+target'ı throttle'lı bildirir
// (kullanıcı istediği açıyı bulup değerleri okusun/kopyalasın).
const r2 = (n: number) => Math.round(n * 100) / 100;
function CameraReadout({
  controlsRef,
  onUpdate,
}: {
  controlsRef: React.MutableRefObject<{ target: Vector3 } | null>;
  onUpdate: (v: { pos: [number, number, number]; target: [number, number, number] }) => void;
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
  /** Canlı kamera okuyucu — orbit ederken pos+target göster (kalibrasyon). */
  cameraDebug?: boolean;
  /** Yatak başı 3D ventilatör cihazını göster (tıklanınca onVentilatorActivate). */
  showVentilator?: boolean;
  /** Ventilatör cihazına tıklanınca (panel aç). */
  onVentilatorActivate?: () => void;
  /** Ventilatör çalışıyor mu (ekran/LED durumu). */
  ventilatorActive?: boolean;
  className?: string;
}

export function PatientRoomScene({
  variant = "female-adult",
  skinTone = DEFAULT_SKIN_TONE,
  skinTint = "normal",
  clip = "laying_idle",
  speaking = false,
  equipment,
  cameraPreset = DEFAULT_CAMERA_PRESET,
  cameraDebug = false,
  showVentilator = false,
  onVentilatorActivate,
  ventilatorActive = true,
  className,
}: Props) {
  const controlsRef = useRef<{ target: Vector3; update: () => void } | null>(null);
  const [camLive, setCamLive] = useState<{ pos: [number, number, number]; target: [number, number, number] } | null>(null);
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop="always"
        dpr={[1, 2]}
        gl={{ antialias: true, powerPreference: "high-performance" }}
        camera={{ position: CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].pos, fov: 38 }}
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
          {/* Yatak başı 3D ventilatör cihazı — tıklanınca panel açar */}
          {showVentilator && (
            <VentilatorDevice onActivate={onVentilatorActivate} active={ventilatorActive} />
          )}
        </Suspense>

        <OrbitControls ref={controlsRef as never} target={[0, 0.2, 0]} minDistance={0.6} maxDistance={4} enablePan />
        <CameraRig preset={cameraPreset} controlsRef={controlsRef} />
        {cameraDebug && <CameraReadout controlsRef={controlsRef} onUpdate={setCamLive} />}
      </Canvas>

      {/* Canlı kamera değerleri (kalibrasyon) — orbit et, oku, kopyala */}
      {cameraDebug && camLive && (
        <div className="absolute bottom-3 left-3 font-mono text-[10px] bg-ink-900/90 border border-brand/40 rounded-lg px-3 py-2 text-ink-100 backdrop-blur-md">
          <div className="text-brand-light uppercase tracking-[0.15em] text-[8px] mb-1">Kamera (orbit et + kopyala)</div>
          <div>pos: [{camLive.pos.join(", ")}]</div>
          <div>target: [{camLive.target.join(", ")}]</div>
          <button
            type="button"
            onClick={() =>
              navigator.clipboard?.writeText(
                `pos: [${camLive.pos.join(", ")}], target: [${camLive.target.join(", ")}]`,
              )
            }
            className="mt-1.5 px-2 py-0.5 rounded bg-brand/20 text-brand-light border border-brand/40 hover:bg-brand/30 transition text-[9px] uppercase tracking-[0.08em]"
          >
            Kopyala
          </button>
        </div>
      )}
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
