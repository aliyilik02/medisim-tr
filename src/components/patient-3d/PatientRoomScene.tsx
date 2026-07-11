// ============================================================
// PatientRoomScene — Faz 2 Klinik Sahne (supine hasta + acil odası)
// ============================================================
// Acil servis odası (public/3d/er-room.glb, metre) + supine yatan hasta.
// Oda metre ölçeğinde; hasta ~1.02 world birimi (1 birim ≈ 1.57m) → oda
// ROOM_SCALE ile küçültülüp eşitlenir. Hasta -90°X döndürülerek (anterior
// yukarı = supine) yatağa yatırılır. Standing /dialog-3d-demo etkilenmez.
// Konum sabitleri screenshot ile kalibre edildi.
// ============================================================

import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, useGLTF, ContactShadows } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette, Noise } from "@react-three/postprocessing";
import { Box3, Vector3, PMREMGenerator, type Group, type Object3D, type SkinnedMesh, type Mesh } from "three";
import { RoomEnvironment } from "three-stdlib";
import { AnimatedPatientModel, ANIMATED_MODELS, type PatientClip, type ClipDecision } from "./AnimatedPatientModel";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import { type SkinTone, DEFAULT_SKIN_TONE, type PatientVariant } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { EquipmentKind } from "./equipmentMeshes";
import { VentilatorDevice } from "./VentilatorDevice";
import { CrashCart } from "./props/CrashCart";
import { SupplyCabinet } from "./props/SupplyCabinet";
import { WallGasPanel } from "./props/WallGasPanel";
import { IVBagSet } from "./props/IVBagSet";
import { PrivacyCurtain } from "./props/PrivacyCurtain";
import { StaffStool } from "./props/StaffStool";
import {
  IVPoleReal,
  BedsideTableProp,
  HospitalChairProp,
  WheelchairProp,
  VitalsMonitorProp,
} from "./props/SketchfabProps";
import { WasteBin } from "./props/WasteBin";
import { TubingLayer } from "./props/TubingLayer";
import {
  CeilingLightPanel,
  WallClock,
  SinkUnit,
  RoomDoor,
  SharpsContainer,
  GloveDispenser,
} from "./props/RoomFixtures";

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

// ── Görsel üçlü (Hat B2): IBL + post-processing kapıları ──────────────
// PMREM ön-filtreleme software-GL'de (Playwright/e2e) ~20sn stall yapar
// (13 Haz notu) → VITE_E2E'de varsayılan KAPALI. ?fx=1 ile zorla açılır
// (görsel doğrulama), ?fx=0 ile gerçek tarayıcıda kapatılabilir (zayıf GPU).
function visualFxEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const q = new URLSearchParams(window.location.search).get("fx");
  if (q === "1") return true;
  if (q === "0") return false;
  return import.meta.env.VITE_E2E !== "1";
}

// Stüdyo IBL — RoomEnvironment'tan PMREM (HDRI dosyası indirmeden, prosedürel).
// scene.environment PBR yansımaları/dolgu ışığını besler; mevcut directional
// ışıklar korunur, environmentIntensity düşük tutulur (dark klinik estetik).
function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    // three-stdlib RoomEnvironment: fabrika fonksiyonu (class değil) → Scene
    const envScene = RoomEnvironment();
    const rt = pmrem.fromScene(envScene, 0.04);
    scene.environment = rt.texture;
    // r163+: environmentIntensity; DÜŞÜK tutulur — 0.35 dark-klinik estetiği
    // fazla açıyordu (fx doğrulama screenshot'ı), 0.22 dolgu + yansıma verir
    // ama koyu atmosferi korur.
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = 0.22;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

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

// Sedye/yatak — prosedürel (world birimde hassas konum). Mattress ÜST yüzeyi
// world Y=0.179 (BED_TOP): tüm varyantların sırtı bu düzleme oturacak şekilde
// bedPosY kalibre edilmiş (scripts/measure-bed-place.mjs). Hasta artık zeminde
// değil sedyede yatar. Konum patient ile aynı eksen: x=0, uzun eksen Z, z=BED_Z.
const BED_TOP = 0.179;
function BedStretcher() {
  const metal = "#48535e";
  const rail: [number, number, number][] = [[-0.33, 0.33, 0], [0.33, 0.33, 0]];
  const posts: [number, number][] = [[-0.33, -0.52], [0.33, -0.52], [-0.33, 0.52], [0.33, 0.52]];
  const legs: [number, number][] = [[-0.28, -0.62], [0.28, -0.62], [-0.28, 0.62], [0.28, 0.62]];
  return (
    <group position={[0, 0, BED_Z]}>
      {/* mattress — üst yüzey y=BED_TOP (0.179), kalınlık 0.08 → merkez 0.139 */}
      <mesh position={[0, BED_TOP - 0.04, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 0.08, 1.32]} />
        <meshStandardMaterial color="#c6d0d4" roughness={0.75} metalness={0} />
      </mesh>
      {/* yastık (baş ucu ≈ z -0.47, mattress üstünde) — tepeden net görünür */}
      <mesh position={[0, BED_TOP + 0.035, -0.42]} castShadow>
        <boxGeometry args={[0.34, 0.07, 0.2]} />
        <meshStandardMaterial color="#eef2f4" roughness={0.85} metalness={0} />
      </mesh>
      {/* çelik çerçeve */}
      <mesh position={[0, 0.06, 0]} castShadow>
        <boxGeometry args={[0.64, 0.07, 1.36]} />
        <meshStandardMaterial color={metal} roughness={0.4} metalness={0.65} />
      </mesh>
      {/* bacaklar (zemine kadar: floor y=-0.27 → çerçeve ~0.03) */}
      {legs.map(([x, z], i) => (
        <mesh key={`leg${i}`} position={[x, -0.12, z]} castShadow>
          <boxGeometry args={[0.045, 0.3, 0.045]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.65} />
        </mesh>
      ))}
      {/* yan güvenlik rayları */}
      {rail.map(([x, y, z], i) => (
        <mesh key={`rail${i}`} position={[x, y, z]} castShadow>
          <boxGeometry args={[0.03, 0.03, 1.06]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.65} />
        </mesh>
      ))}
      {/* rayları çerçeveye bağlayan dikmeler */}
      {posts.map(([x, z], i) => (
        <mesh key={`post${i}`} position={[x, 0.2, z]} castShadow>
          <boxGeometry args={[0.025, 0.28, 0.025]} />
          <meshStandardMaterial color={metal} roughness={0.4} metalness={0.65} />
        </mesh>
      ))}
    </group>
  );
}

// IV direği + sıvı torbası — anaflakside merkezi (IV erişim/adrenalin sonrası
// sıvı). Direk: gerçek Sketchfab modeli (CC-BY, SketchfabProps). IVBagSet
// AYNI mutlak konumda kalır → TubingLayer IV kaynağı [0.65,0.52,-0.35] bozulmaz.
function IVPole() {
  return (
    <group position={[0.52, 0, -0.35]}>
      {/* Model İKİ direk içerir (Z ekseninde ~1.2 birim ara, tek mesh —
          bölünemez). Ofset +0.6: direk A çapa noktasına (world z -0.35,
          IVBagSet/tubing hizası), direk B ayak ucuna (world z ~0.85) düşer. */}
      <IVPoleReal position={[0, ROOM_FLOOR_Y, 0.6]} />
      {/* serum seti — torba + damla haznesi + hat (props/IVBagSet; tubing
          çapası bu konuma kalibre, DEĞİŞTİRME) */}
      <IVBagSet position={[0.13, 0.66, 0]} />
    </group>
  );
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
  /** Sürekli klinik görsel (siyanoz/solgun/terleme/benekli) — vital→shader/renk. */
  visualState?: VisualState;
  /** Prosedürel hareket katmanı (tremor/huzursuzluk) — agitation-mapping. */
  agitation?: { tremor: number; restlessness: number };
  /** Oynatılacak klip (senaryo durumundan: laying_idle, talk, cough, pain). */
  clip?: PatientClip;
  /** Animasyon yönetmeni kararı — verilirse clip'i ezer (crossfade/hız/loop/overlay). */
  decision?: ClipDecision | null;
  /** Hasta konuşuyor mu (lipsync jawOpen). */
  speaking?: boolean;
  /** Seslendirilen metin — fonetik viseme lipsync (AnimatedPatientModel). */
  speechText?: string | null;
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

// R4 (11 Tem): memo — vitals tick'i (125-1000ms) sayfayı re-render eder;
// prop'lar artık kimlik-kararlı (useStableValue + useCallback) → içerik
// değişmedikçe R3F ağacı yeniden uzlaştırılmaz (en pahalı alt ağaç).
function PatientRoomSceneImpl({
  variant = "female-adult",
  skinTone = DEFAULT_SKIN_TONE,
  skinTint = "normal",
  visualState,
  agitation,
  clip = "laying_idle",
  decision = null,
  speaking = false,
  speechText = null,
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
  // Görsel üçlü kapısı — mount'ta bir kez okunur (?fx paramı + VITE_E2E)
  const fx = useMemo(() => visualFxEnabled(), []);
  // Kullanıcı kamera açısını değiştirebilsin (varsayılan prop'tan; tepeden "onden"
  // odayı/IV/sedyeyi göstermez → "Genel"/"Yan" ile zengin sahne görünür).
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);
  useEffect(() => setActivePreset(cameraPreset), [cameraPreset]);
  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop="always"
        /* E2E (software-GL/SwiftShader): dpr 1 + AA kapalı + gölgesiz —
           kare süresi düşer, rAF boğulmaz. Playwright locator çözümlemesi
           rAF-polling kullanır; ağır yazılım-render'da TÜM locator'lar
           timeout'a düşüyordu (6 Tem teşhisi). Gerçek tarayıcı etkilenmez. */
        dpr={import.meta.env.VITE_E2E === "1" ? 1 : [1, 2]}
        gl={{ antialias: import.meta.env.VITE_E2E !== "1", powerPreference: "high-performance" }}
        camera={{ position: CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].pos, fov: 38 }}
        shadows={import.meta.env.VITE_E2E !== "1"}
      >
        {/* Canvas default ACESFilmic tonemapping aktif (flat yok). */}
        <color attach="background" args={["#0a0a0c"]} />

        {/* NOT: Environment IBL (Lightformer cubemap) step 2'ye ertelendi —
            PMREM ön-filtrelemesi software-GL'de ~20s stall + düz-renk placeholder
            odada getirisi az. Gerçek PBR oda (step 2) gelince eklenip tune edilecek. */}
        {/* Klinik nötr-soğuk ışık. Gölge için tek directional (key) yeterli. */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[2, 4, 3]}
          intensity={0.95}
          castShadow
          shadow-mapSize={[1024, 1024]}
          shadow-bias={-0.0002}
          shadow-radius={6} /* PCFSoft yumuşak gölge kenarı */
        >
          <orthographicCamera attach="shadow-camera" args={[-3, 3, 3, -3, 0.1, 14]} />
        </directionalLight>
        <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#9fb6c9" />
        <hemisphereLight args={["#dfeaf2", "#15151a", 0.35]} />

        <Suspense fallback={<LoadingFallback />}>
          <ErRoom />
          {/* Sedye — hasta artık zeminde değil, mattress üstünde (y=BED_TOP) yatar */}
          <BedStretcher />
          {/* IV direği + sıvı torbası — sedye başı-sol yanı */}
          <IVPole />
          {/* ── Acil odası prop seti (props/, prosedürel — GLB yok) ──
              Yerleşim yatağa (x=0, z=BED_Z) ve oda duvarlarına göre:
              duvarlar x=±1.6, z=±1.28, tavan y≈1.39 (er-room 5×4×2.6m
              × ROOM_SCALE). Kamera preset hatları boş bırakıldı. */}
          {/* Arrest arabası — sol duvar dibi, ayak ucu tarafı; önü yatağa dönük */}
          <CrashCart position={[-1.15, ROOM_FLOOR_Y, 0.55]} rotation={[0, Math.PI / 2, 0]} />
          {/* Malzeme dolabı — ayak ucu duvarı, cam yüzü odaya bakar */}
          <SupplyCabinet position={[-0.55, ROOM_FLOOR_Y, 1.13]} rotation={[0, Math.PI, 0]} />
          {/* Duvar gaz paneli — baş ucu duvarında (O2 beyaz + vakum sarı) */}
          <WallGasPanel position={[0, 0.62, -1.25]} />
          {/* Paravan/perde — sağ (+X) tarafta, kumaş ayak ucuna toplanmış
              (yan/önden kamera hattını kapatmaz) */}
          <PrivacyCurtain position={[1.25, 0, 0.35]} />
          {/* Tekerlekli vital monitör standı (Sketchfab CC-BY, setten ayrıştırıldı)
              — baş ucu sağ tarafı, ekran yatağa dönük */}
          {/* Ön yüzler +Z (lineup /dev/props ile doğrulandı); rotasyonlar
              atan2(dx,dz) ile hedefe (yatak merkezi) çevrildi. */}
          <VitalsMonitorProp position={[-0.95, ROOM_FLOOR_Y, -0.75]} rotation={[0, 1.13, 0]} />
          {/* Refakatçi koltuğu (Sketchfab CC-BY) — sağ ayak ucu köşesi, yatağa dönük */}
          <HospitalChairProp position={[1.15, ROOM_FLOOR_Y, 0.95]} rotation={[0, -2.2, 0]} />
          {/* Hasta başı ayarlanabilir masa (Sketchfab CC-BY) — sol yan; üst
              tabla +X yönünde uzanır → rotation 0 = tabla yatağa doğru */}
          <BedsideTableProp position={[-0.72, ROOM_FLOOR_Y, 0.55]} rotation={[0, 0, 0]} />
          {/* Tekerlekli sandalye (Sketchfab CC-BY) — baş ucu sağ köşe, odaya dönük */}
          <WheelchairProp position={[1.25, ROOM_FLOOR_Y, -1.0]} rotation={[0, -0.9, 0]} />
          {/* Personel taburesi — sağ ayak ucu köşesine doğru */}
          <StaffStool position={[0.85, 0, 0.8]} />
          {/* Tıbbi atık kovası — sol baş ucu köşesi (ventilatörün gerisi) */}
          <WasteBin position={[-1.05, 0, -0.85]} />
          {/* ── Oda demirbaşları (RoomFixtures — Hat B oda tamamlama) ──
              Tavan ≈ y 1.39; kamera preset ışın hatları boş bırakıldı
              ("önden" tepeden iner: x≈0, z 0.2-0.31 — paneller z=-0.55/0.75). */}
          <CeilingLightPanel position={[0, 1.38, -0.55]} />
          <CeilingLightPanel position={[0, 1.38, 0.75]} />
          {/* Duvar saati — ayak ucu duvarı, kadran odaya (-Z) bakar */}
          <WallClock position={[0.35, 1.0, 1.26]} rotation={[-Math.PI / 2, 0, 0]} />
          {/* Lavabo — sol (-X) duvar, crash cart ile atık kovası arası */}
          <SinkUnit position={[-1.41, 0, 0.05]} rotation={[0, Math.PI / 2, 0]} />
          {/* Kapı — ayak ucu duvarı sağ yarısı, kanat odaya bakar */}
          <RoomDoor position={[0.75, 0, 1.26]} rotation={[0, Math.PI, 0]} />
          {/* Kesici-delici atık (sarı) + eldiven dispanseri — baş ucu duvarı,
              gaz panelinin iki yanı */}
          <SharpsContainer position={[0.45, 0.45, -1.22]} />
          <GloveDispenser position={[-0.45, 0.6, -1.22]} />
          {/* Supine hasta — varyant/klip başına yatak hizalama (gömülmeyi önler) */}
          <BedPatient variant={variant} clip={clip} decision={decision} skinTone={skinTone} skinTint={skinTint} visualState={visualState} agitation={agitation} speaking={speaking} speechText={speechText} equipment={equipment} />
          {/* Hortumlar — IV hattı (askı→ön kol) + O₂ (duvar paneli→maske/kanül),
              catenary sarkma + yumuşatılmış uç takibi (hasta hareketinde doğal) */}
          <TubingLayer equipment={equipment} />
          {/* Yatak başı 3D ventilatör cihazı — tıklanınca panel açar */}
          {showVentilator && (
            <VentilatorDevice onActivate={onVentilatorActivate} active={ventilatorActive} />
          )}
          {/* Zemine temas gölgesi — yatak+hasta "havada durmasın", odaya otursun.
              frames={1}: bir kez render (nefes morph'u zemin gölgesini değiştirmez)
              → render loop'tan çıkar, ReadPixels stall'ı her karede tekrarlamaz. */}
          <ContactShadows
            position={[0, ROOM_FLOOR_Y + 0.005, BED_Z]}
            frames={1}
            scale={6}
            resolution={512}
            blur={2.6}
            opacity={0.55}
            far={3}
            color="#05070a"
          />
        </Suspense>

        {/* ── Görsel üçlü: IBL + post-processing (fx kapılı) ── */}
        {fx && <StudioEnvironment />}
        {fx && (
          <EffectComposer multisampling={0}>
            {/* Monitör/ekran ışıması — yüksek eşik: yalnız parlak emissive'ler */}
            <Bloom mipmapBlur intensity={0.35} luminanceThreshold={0.72} luminanceSmoothing={0.2} />
            {/* Kenar karartma — sinematik odak, klinik dark estetikle uyumlu */}
            <Vignette offset={0.28} darkness={0.42} />
            {/* Çok hafif film greni — düz yüzeylerdeki banding'i kırar */}
            <Noise opacity={0.03} />
          </EffectComposer>
        )}

        <OrbitControls ref={controlsRef as never} target={[0, 0.2, 0]} minDistance={0.6} maxDistance={4} enablePan />
        <CameraRig preset={activePreset} controlsRef={controlsRef} />
        {cameraDebug && <CameraReadout controlsRef={controlsRef} onUpdate={setCamLive} />}
      </Canvas>

      {/* Kamera açısı toggle — tepeden "Önden" oda/IV/sedyeyi göstermez; kullanıcı
          "Genel"/"Yan" ile zengin sahneyi görebilsin. Sağ-üst (monitör sol-üstte). */}
      <div className="absolute top-3 right-3 flex gap-1 bg-ink-900/80 border border-ink-700/70 rounded-lg p-1 backdrop-blur-md">
        {(Object.keys(CAMERA_PRESET_LABELS) as CameraPreset[]).map((p) => (
          <button
            key={p}
            type="button"
            data-testid={`camera-preset-${p}`}
            onClick={() => setActivePreset(p)}
            aria-pressed={activePreset === p}
            className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-[0.08em] transition ${
              activePreset === p
                ? "bg-brand/30 text-brand-light border border-brand/50"
                : "text-ink-400 hover:text-ink-100 border border-transparent"
            }`}
          >
            {CAMERA_PRESET_LABELS[p]}
          </button>
        ))}
      </div>

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

export const PatientRoomScene = memo(PatientRoomSceneImpl);

interface BedPatientProps {
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
}

// Varyant + klip metadata'sından yatak yerleşimini hesaplar.
function BedPatient({ variant, clip, decision, skinTone, skinTint, visualState, agitation, speaking, speechText, equipment }: BedPatientProps) {
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
      <BedMetricsProbe targetRef={groupRef} />
    </group>
  );
}
