// ============================================================
// PolyclinicScene — poliklinik muayene odası + sedyede hasta (CANONICAL)
// ============================================================
// 16 Kas 2026 "sıfırdan" kararı: eski acil odası sahnesi kapatıldı, oynama
// ekranı bu sahneyi kullanır. Oda GERÇEK METRE ile prosedürel kurulur
// (polyclinic/buildPolyclinic — dosya indirmez, malzeme başına tek mesh).
// Hasta yığını (model + kemik-bağlı ekipman + serum seti) `patient-space`
// grubunda eski kalibrasyonuyla yaşar; yeni hasta modeli gelince yalnız o
// grubun içi değişir.
//
// Maket kesiti: kamera bir duvarın ya da tavanın DIŞINA çıkınca o parça
// (ve üstüne asılı her şey) gizlenir → her açıdan içerisi görünür.
// ============================================================

import { Suspense, memo, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, OrbitControls, PerformanceMonitor } from "@react-three/drei";
import { Bloom, EffectComposer, N8AO, SMAA, Vignette } from "@react-three/postprocessing";
import { RectAreaLightUniformsLib } from "three-stdlib";
import type { Group, RectAreaLight, Vector3 } from "three";
import {
  BedPatient,
  CAMERA_PRESETS_PS,
  CAMERA_PRESET_LABELS,
  CameraReadout,
  CameraRig,
  DEFAULT_CAMERA_PRESET,
  LoadingFallback,
  StudioEnvironment,
  ViewShift,
  visualFxEnabled,
  type CameraPose,
  type CameraPreset,
} from "./sceneRig";
import type { ClipDecision, PatientClip } from "./AnimatedPatientModel";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import { DEFAULT_SKIN_TONE, type PatientVariant, type SkinTone } from "./patientModels";
import type { SkinTint } from "./AnatomicPatientModel";
import type { EquipmentKind } from "./equipmentMeshes";
import { VentilatorDevice } from "./VentilatorDevice";
import { IVBagSet } from "./props/IVBagSet";
import { TubingLayer } from "./props/TubingLayer";
import { PropGLB } from "./props/SketchfabProps";
import { ExamHotspotLayer, type ExamHotspot } from "./ExamHotspotLayer";
import { buildPolyclinic } from "./polyclinic/buildPolyclinic";
import { getPolyclinicMaterials } from "./polyclinic/materials";
import {
  COUCH_CENTER_WORLD,
  IV_BAG_PS,
  IV_TUBE_SOURCE,
  MONITOR_STAND,
  O2_TUBE_SOURCE,
  PS,
  PS_Y,
  ROOM,
  ROOM_ORIGIN,
  WINDOW,
  roomToWorld,
  toMetric,
} from "./polyclinic/layout";

const E2E = import.meta.env.VITE_E2E === "1";

/** Kamera presetleri (dünya, metre).
 *  Tepeden iki muayene açısı ("önden", "tüm beden") hasta biriminde kalibre —
 *  metreye çevrilir, kadraj eskisiyle birebir aynı (muayene yerleşimi buna bağlı).
 *  Oda içi üç açı poliklinik için yeniden kuruldu; hepsi duvarların İÇİNDE. */
const legacy = (k: CameraPreset): CameraPose => ({
  pos: toMetric(CAMERA_PRESETS_PS[k].pos),
  target: toMetric(CAMERA_PRESETS_PS[k].target),
});
const CAMERA_PRESETS: Record<CameraPreset, CameraPose> = {
  onden: legacy("onden"),
  tum_beden: legacy("tum_beden"),
  // Kapı tarafı-muayene eden köşeden tüm oda: sedye çapraz, arkada baş ucu duvarı + pencere.
  genel: { pos: [2.0, 2.0, -2.3], target: [0.1, 0.8, 0.1] },
  // Muayene eden taraftan baş + göğüs yakın 3/4.
  bas_ucu: { pos: [0.95, 1.45, 1.0], target: [-0.05, 0.9, 0.45] },
  // Muayene eden taraftan yan profil (göğüs/solunum); arkada pencere.
  yan: { pos: [2.35, 1.25, -0.2], target: [0, 0.85, 0] },
};

/** Hortum kaynakları (metre): serum → damla haznesi altı, O₂ → tüpün nemlendiricisi. */
const TUBE_SOURCES = {
  iv_cannula: IV_TUBE_SOURCE,
  oxygen_mask: O2_TUBE_SOURCE,
  nasal_cannula: O2_TUBE_SOURCE,
} as const;

/** Pencere yönünden dolgu ışığının konumu (dünya) — zayıf cihaz kademesi. */
const WINDOW_FILL_POS = roomToWorld([ROOM.xE + 2, 2.2, (WINDOW.z0 + WINDOW.z1) / 2]);

/** Oda merkezi (dünya) — temas gölgesi düzleminin ortası. */
const ROOM_CENTER_WORLD = roomToWorld([(ROOM.xW + ROOM.xE) / 2, 0.006, (ROOM.zN + ROOM.zS) / 2]);

type CutPlane = "n" | "e" | "s" | "w" | "ceil";

/** Maket kesiti — kamera bu düzlemin dışındaysa içerik gizlenir. */
function Cutaway({ plane, children }: { plane: CutPlane; children: React.ReactNode }) {
  const ref = useRef<Group>(null);
  useFrame(({ camera }) => {
    const g = ref.current;
    if (!g) return;
    // Kamera dünya konumu → oda-yerel (layout.worldToRoom ile aynı; tahsissiz).
    const x = ROOM_ORIGIN.x - camera.position.x;
    const z = ROOM_ORIGIN.z - camera.position.z;
    const inside =
      plane === "n" ? z > ROOM.zN
      : plane === "s" ? z < ROOM.zS
      : plane === "w" ? x > ROOM.xW
      : plane === "e" ? x < ROOM.xE
      : camera.position.y < ROOM.h;
    if (g.visible !== inside) g.visible = inside;
  });
  return <group ref={ref}>{children}</group>;
}

/** Oda kabuğu + mobilya — bir kez kurulur (malzeme başına tek mesh). */
function PolyclinicRoom() {
  const parts = useMemo(() => buildPolyclinic(getPolyclinicMaterials()), []);
  useEffect(
    () => () => {
      // Geometriler bu örneğe özel; malzemeler paylaşımlı (dispose edilmez).
      for (const g of Object.values(parts) as Group[]) {
        g.traverse((o) => (o as unknown as { geometry?: { dispose: () => void } }).geometry?.dispose());
      }
    },
    [parts],
  );
  return (
    <>
      <primitive object={parts.floor} />
      <primitive object={parts.furniture} />
      <Cutaway plane="ceil"><primitive object={parts.ceiling} /></Cutaway>
      <Cutaway plane="n"><primitive object={parts.wallN} /></Cutaway>
      <Cutaway plane="e"><primitive object={parts.wallE} /></Cutaway>
      <Cutaway plane="s"><primitive object={parts.wallS} /></Cutaway>
      <Cutaway plane="w">
        <primitive object={parts.wallW} />
        <primitive object={parts.wallWProps} />
        <primitive object={parts.wallWGlass} />
      </Cutaway>
    </>
  );
}

/** Pencereden giren yumuşak gün ışığı (alan ışığı — gölgesiz, geniş). */
function WindowLight() {
  const ref = useRef<RectAreaLight>(null);
  useMemo(() => RectAreaLightUniformsLib.init(), []);
  const zc = (WINDOW.z0 + WINDOW.z1) / 2;
  const yc = (WINDOW.y0 + WINDOW.y1) / 2;
  const pos = useMemo(() => roomToWorld([ROOM.xE - 0.06, yc, zc]), [yc, zc]);
  useEffect(() => {
    const [tx, ty, tz] = roomToWorld([ROOM.xE - 3, yc - 0.5, zc - 0.2]);
    ref.current?.lookAt(tx, ty, tz);
  }, [yc, zc]);
  return (
    <rectAreaLight
      ref={ref}
      position={pos}
      width={WINDOW.z1 - WINDOW.z0}
      height={WINDOW.y1 - WINDOW.y0}
      intensity={7}
      color="#e6f1ff"
    />
  );
}

interface Props {
  /** Hasta varyantı (senaryodan türetilir; geçici dönemde tek modele çözülür). */
  variant?: PatientVariant;
  skinTone?: SkinTone;
  skinTint?: SkinTint;
  /** Sürekli klinik görsel (siyanoz/solgun/terleme/benekli) — vital→shader/renk. */
  visualState?: VisualState;
  /** Prosedürel hareket katmanı (tremor/huzursuzluk). */
  agitation?: { tremor: number; restlessness: number };
  /** Oynatılacak klip (senaryo durumundan). */
  clip?: PatientClip;
  /** Animasyon yönetmeni kararı — verilirse clip'i ezer. */
  decision?: ClipDecision | null;
  /** Hasta konuşuyor mu (dudak senkronu). */
  speaking?: boolean;
  /** Seslendirilen metin — fonetik dudak senkronu. */
  speechText?: string | null;
  /** Takılı ekipman (kemik-bağlı). */
  equipment?: EquipmentKind[];
  cameraPreset?: CameraPreset;
  /** Canlı kamera okuyucu — orbit ederken pos+target göster (kalibrasyon). */
  cameraDebug?: boolean;
  /** Ventilatör cihazını göster (tıklanınca onVentilatorActivate). */
  showVentilator?: boolean;
  onVentilatorActivate?: () => void;
  ventilatorActive?: boolean;
  /** Bedende tıklanır muayene noktaları (kemik-bağlı). Verilmezse katman yok. */
  examHotspots?: ExamHotspot[];
  selectedExamId?: string | null;
  onExamSelect?: (id: string) => void;
  /** Muayene noktası etiketleri hep görünsün mü (false → üstüne gelince). */
  examLabels?: boolean;
  /** Sahnenin sol kenarında başka katmanın kapattığı şerit (px) — hasta kalan
      boş alanın ortasına kaydırılır. */
  leftInsetPx?: number;
  className?: string;
}

function PolyclinicSceneImpl({
  variant = "male-adult",
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
  examHotspots,
  selectedExamId = null,
  onExamSelect,
  examLabels = true,
  leftInsetPx = 0,
  className,
}: Props) {
  const controlsRef = useRef<{ target: Vector3; update: () => void } | null>(null);
  const [camLive, setCamLive] = useState<CameraPose | null>(null);
  // Görsel üçlü kapısı — mount'ta bir kez okunur (?fx paramı + VITE_E2E)
  const fx = useMemo(() => visualFxEnabled(), []);
  // Zayif cihaz kademesi: kare hizi dusukse (PerformanceMonitor) pahali katmanlar
  // (ortam kararmasi, kenar yumusatma gecisi, alan isigi, yuksek cozunurluk)
  // KALICI olarak kapanir - geri acilmaz, gidip gelme (titreme) olmaz.
  // Olcum (16 Kas 2026, Intel UHD, 1366x768): tam kademe 16-32 fps.
  const [lowTier, setLowTier] = useState(false);
  const [activePreset, setActivePreset] = useState<CameraPreset>(cameraPreset);
  useEffect(() => setActivePreset(cameraPreset), [cameraPreset]);
  // Monitör standı sedye ortasına döner (model önü +Z; açı atan2(dx, dz)).
  const monitorRotY = Math.atan2(COUCH_CENTER_WORLD[0] - MONITOR_STAND[0], COUCH_CENTER_WORLD[2] - MONITOR_STAND[2]);
  return (
    /* isolate: muayene noktalarının (Html) z-index'i sahne içinde kalır —
       sayfadaki monitör/kart katmanlarının üstüne taşmaz. */
    <div className={`relative isolate w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-room-canvas"
        frameloop="always"
        /* E2E (yazılım-GL): dpr 1 + AA kapalı + gölgesiz — kare süresi düşer,
           Playwright'ın rAF tabanlı bulucuları boğulmaz. Gerçek tarayıcı etkilenmez. */
        dpr={E2E || lowTier ? 1 : [1, 1.5]}
        gl={{ antialias: !E2E, powerPreference: "high-performance" }}
        camera={{ position: CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].pos, fov: 38, near: 0.08, far: 40 }}
        shadows={!E2E}
      >
        <color attach="background" args={["#0b0d10"]} />

        {/* Gün ışığı alan muayene odası: gökyüzü/zemin dolgusu + tavan panellerini
            temsil eden üst ana ışık (tek gölge kaynağı) + pencere alan ışığı. */}
        <hemisphereLight args={["#f2f6fa", "#8d8a82", 0.85]} />
        <directionalLight
          position={[0.9, 5.2, 2.2]}
          intensity={1.1}
          color="#fff6ea"
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-bias={-0.0003}
          shadow-normalBias={0.02}
          shadow-radius={5}
        >
          <orthographicCamera attach="shadow-camera" args={[-4.2, 4.2, 4.2, -4.2, 0.5, 12]} />
        </directionalLight>
        {!E2E && !lowTier && <PerformanceMonitor onDecline={() => setLowTier(true)} />}
        {!E2E && (lowTier ? (
          /* alan isiginin ucuz karsiligi: pencere yonunden golgesiz dolgu */
          <directionalLight position={WINDOW_FILL_POS} intensity={0.55} color="#e6f1ff" />
        ) : (
          <WindowLight />
        ))}

        <Suspense fallback={<LoadingFallback />}>
          <PolyclinicRoom />

          {/* Tekerlekli hasta monitörü (Sketchfab CC-BY — atıf /atiflar) */}
          <PropGLB file="vitals-monitor.glb" scale={0.213 * PS} position={MONITOR_STAND} rotation={[0, monitorRotY, 0]} />

          {/* ── Hasta uzayı: eski kalibrasyon birimi → metre ── */}
          <group name="patient-space" position={[0, PS_Y, 0]} scale={PS}>
            <BedPatient
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
              probeUnit={PS}
              probeOriginY={PS_Y}
            />
            {/* serum seti — askı kolu ucunda; hortum çapası bu konuma kalibre */}
            <IVBagSet position={IV_BAG_PS} line={false} />
            {showVentilator && <VentilatorDevice onActivate={onVentilatorActivate} active={ventilatorActive} />}
          </group>

          {/* Hortumlar — serum hattı (askı→ön kol) + O₂ (tüp→maske/kanül) */}
          <TubingLayer equipment={equipment} sources={TUBE_SOURCES} floorY={0.012} />

          {/* Muayene noktaları — kemik-bağlı, hasta hareketini takip eder */}
          {examHotspots && examHotspots.length > 0 && (
            <ExamHotspotLayer
              hotspots={examHotspots}
              selectedId={selectedExamId}
              onSelect={onExamSelect}
              resetKey={variant}
              showLabels={examLabels}
            />
          )}

          {/* Zemine temas gölgesi — mobilya "havada durmasın". frames={1}: bir kez
              çizilir, döngüden çıkar. */}
          <ContactShadows
            position={ROOM_CENTER_WORLD}
            frames={1}
            scale={7.5}
            resolution={1024}
            blur={2.4}
            opacity={0.5}
            far={1.3}
            color="#0a0d10"
          />
        </Suspense>

        {/* ── Görsel üçlü: IBL + ortam kararması + ışıma (fx kapılı) ── */}
        {fx && <StudioEnvironment intensity={0.32} />}
        {fx && !lowTier && (
          <EffectComposer multisampling={0}>
            <N8AO aoRadius={0.45} intensity={2.2} distanceFalloff={0.7} halfRes quality="medium" />
            <Bloom mipmapBlur intensity={0.3} luminanceThreshold={0.86} luminanceSmoothing={0.2} />
            <Vignette offset={0.3} darkness={0.4} />
            <SMAA />
          </EffectComposer>
        )}

        <OrbitControls
          ref={controlsRef as never}
          target={CAMERA_PRESETS[DEFAULT_CAMERA_PRESET].target}
          minDistance={0.9}
          maxDistance={7}
          enablePan
        />
        <CameraRig pose={CAMERA_PRESETS[activePreset]} controlsRef={controlsRef} />
        <ViewShift leftInsetPx={leftInsetPx} />
        {cameraDebug && <CameraReadout controlsRef={controlsRef} onUpdate={setCamLive} />}
      </Canvas>

      {/* Kamera açısı düğmeleri — ikincil kontrol: soluk durur, üstüne gelince belirir. */}
      <div className="absolute top-3 right-3 flex gap-1 bg-ink-900/80 border border-ink-700/70 rounded-lg p-1 backdrop-blur-md opacity-50 hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
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

      {/* Canlı kamera değerleri (kalibrasyon) — metre */}
      {cameraDebug && camLive && (
        <div className="absolute bottom-3 left-3 font-mono text-[10px] bg-ink-900/90 border border-brand/40 rounded-lg px-3 py-2 text-ink-100 backdrop-blur-md">
          <div className="text-brand-light uppercase tracking-[0.15em] text-[8px] mb-1">Kamera (metre)</div>
          <div>pos: [{camLive.pos.join(", ")}]</div>
          <div>target: [{camLive.target.join(", ")}]</div>
        </div>
      )}
    </div>
  );
}

// memo: vitals tick'i (125-1000 ms) sayfayı yeniden çizer; prop'lar kimlik-
// kararlı → içerik değişmedikçe R3F ağacı yeniden uzlaştırılmaz.
export const PolyclinicScene = memo(PolyclinicSceneImpl);
