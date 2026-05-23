import { memo, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Environment } from "@react-three/drei";
import {
  ACESFilmicToneMapping,
  Box3,
  PCFSoftShadowMap,
  PerspectiveCamera,
  Plane,
  SRGBColorSpace,
  Vector3,
  type Group,
} from "three";
import { AnatomicPatientModel, type SkinTint } from "./AnatomicPatientModel";
import { HospitalRoom } from "./HospitalRoom";
import { IndividualOrgans, type OrganOverrideMap } from "./IndividualOrgans";
import { PatientEquipment, type EquipmentState } from "./PatientEquipment";
import { PatientVitalSigns } from "./PatientVitalSigns";
import { MedicationBolus } from "./MedicationBolus";
import type { PatientVitals } from "@/engine/types";
import type { PatientProfile } from "@/clinical/patient-profile";
import { RegionMarker } from "./RegionMarker";
import { InspectionPanel } from "./InspectionPanel";
import { ProcedureOverlay } from "./procedures/ProcedureOverlay";
import type { ProcedureContext, ProcedureKind } from "./procedures/types";
import type { PatientRegion } from "./regions";
import type { ActionRef } from "@/engine/types";
import { playAuscultation, stopAuscultation } from "./auscultationAudio";

interface Props {
  regions: PatientRegion[];
  breathing?: boolean;
  /** Sprint B.4.1: Cilt tonu — vital değişimine göre senaryo motorundan gelir. */
  skinTint?: SkinTint;
  /** Sprint B.2 entegrasyon: hasta konuşurken ağız bölgesi shader oscillation. */
  speaking?: boolean;
  /**
   * Sprint B.4 — Cilt kesim seviyesi (0.0-1.0).
   * 1.0 = cilt tamamen kapalı (default).
   * 0.0 = cilt tamamen açık, iç organlar görünür.
   * Slider ile yukarıdan aşağıya kademeli açılma.
   */
  skinClipLevel?: number;
  /** B.4 — Kalp/akciğer animasyon hızı için vital'ler. */
  organVitals?: { hr: number; rr: number };
  /** B.5+ — IndividualOrgans runtime scale/pozisyon override (OrganDevPanel). */
  organOverrides?: OrganOverrideMap;
  /** B.6 — Hastaya giydirilmiş klinik ekipman (O2 mask, IV, EKG patches, BP cuff, vs.) */
  equipmentState?: EquipmentState;
  /** B.6.1 — Vital'lere göre gövde üstü görsel bulgular (pupilla, terleme, JVD, göz kapağı). */
  vitals?: PatientVitals;
  /** B.6.2 — Son ilaç verildi timestamp (ms). Değişince 2sn pulsing animasyonu. */
  lastMedicationTs?: number | null;
  /** B.6.2 — Son ilaç id (renk seçimi: kırmızı vazopresör, mor opioid, vs.) */
  lastMedicationDrugId?: string | null;
  /** B.7 — Hasta profili (yaş kategori + cinsiyet + scaleFactor). */
  profile?: PatientProfile;
  /** B.5+ — Kamera açı preset (anterior/posterior/right/left/superior/inferior). */
  cameraView?: CameraView;
  /** Test ortamında onSelect'i dışarıdan dinleyebilmek için opsiyonel callback. */
  onRegionSelect?: (region: PatientRegion) => void;
  /** Sprint B.2.1: Prosedür animasyonu tamamlandığında engine'e iletilecek ActionRef. */
  onProcedureComplete?: (action: ActionRef) => void;
  className?: string;
}

/** Önceden tanımlı kamera açıları — 8-head canon, model center y=0.27. */
export type CameraView =
  | "anterior"
  | "posterior"
  | "right"
  | "left"
  | "superior"
  | "inferior";

interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  fov: number;
}

export const CAMERA_PRESETS: Record<CameraView, CameraPreset> = {
  anterior:  { position: [0, 0.27, 2.73],   target: [0, 0.27, 0], fov: 32 },
  posterior: { position: [0, 0.27, -2.73],  target: [0, 0.27, 0], fov: 32 },
  right:     { position: [2.73, 0.27, 0.01], target: [0, 0.27, 0], fov: 32 },
  left:      { position: [-2.73, 0.27, 0.01], target: [0, 0.27, 0], fov: 32 },
  superior:  { position: [0, 3.2, 0.05],     target: [0, 0.27, 0], fov: 32 },
  inferior:  { position: [0, -2.6, 0.05],    target: [0, 0.27, 0], fov: 32 },
};

/** OrbitControls'ı ref ile kontrol eden kamera yöneticisi.
    `view` değişimi → camera.position + controls.target + fov güncellenir.
    Mouse drag ile orbit drei OrbitControls tarafından handled. */
interface OrbitControlsLike {
  target: Vector3;
  update: () => void;
}

function CameraController({ view }: { view: CameraView }) {
  // drei OrbitControls ref tipi three-stdlib OrbitControls class; alt küme
  // (target/update) için runtime cast yeterli — useRef<unknown>.
  const controlsRef = useRef<unknown>(null);
  const { camera, size } = useThree();
  const preset = CAMERA_PRESETS[view];

  // Target ref'leri — preset değişiminde güncellenir, useFrame lerp eder.
  // Bu sayede A/P/R/L buton tıklaması anlık ekran değişimi değil, ~600ms
  // yumuşak orbit geçişi.
  const targetPosRef = useRef(
    new Vector3(preset.position[0], preset.position[1], preset.position[2]),
  );
  const targetLookRef = useRef(
    new Vector3(preset.target[0], preset.target[1], preset.target[2]),
  );
  const transitioningRef = useRef(false);

  // Preset değişimi: yeni target'lar set, transition başlat. FOV/aspect
  // hemen güncellenir (görüntü oranı kayması anlık daha iyi).
  useEffect(() => {
    targetPosRef.current.set(
      preset.position[0],
      preset.position[1],
      preset.position[2],
    );
    targetLookRef.current.set(
      preset.target[0],
      preset.target[1],
      preset.target[2],
    );
    transitioningRef.current = true;
    if (camera instanceof PerspectiveCamera) {
      camera.fov = preset.fov;
      camera.near = 0.1;
      camera.far = 50;
      camera.aspect = size.width / size.height;
      camera.updateProjectionMatrix();
    }
  }, [camera, size.width, size.height, preset]);

  // Lerp kamera + controls.target. delta-tabanlı hız → frame rate'den bağımsız
  // ~3.5Hz lerp ≈ 0.4-0.6sn full transition. Mesafe küçük olunca snap + flag off.
  useFrame((_, delta) => {
    if (!transitioningRef.current) return;
    const lerpSpeed = Math.min(delta * 3.5, 1);
    camera.position.lerp(targetPosRef.current, lerpSpeed);
    const c = controlsRef.current as OrbitControlsLike | null;
    if (c && c.target && typeof c.update === "function") {
      c.target.lerp(targetLookRef.current, lerpSpeed);
      c.update();
    } else {
      camera.lookAt(targetLookRef.current);
    }
    // Bitiş — kullanıcı mouse drag yaparsa transitioning durur,
    // OrbitControls kontrol alır.
    if (camera.position.distanceTo(targetPosRef.current) < 0.005) {
      camera.position.copy(targetPosRef.current);
      if (c?.target) c.target.copy(targetLookRef.current);
      transitioningRef.current = false;
    }
  });

  return (
    <OrbitControls
      // @ts-expect-error — drei ref tipi tam OrbitControls class; alt küme cast'i
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.6}
      maxDistance={6}
      target={preset.target}
    />
  );
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="flex items-center gap-3 text-ink-300 font-mono text-[11px] uppercase tracking-[0.15em]">
        <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
        Hasta yükleniyor…
      </div>
    </Html>
  );
}

// Sahne dump için window'a scene + objeleri yansıtır (browser eval ile bbox/pos
// inspect için). useThree Canvas çocuk component'inde kullanılmalı.
function DebugExposer() {
  const { scene } = useThree();
  useEffect(() => {
    const w = window as unknown as {
      __r3fScene: typeof scene;
      __r3fDump: () => Record<string, unknown>;
    };
    w.__r3fScene = scene;
    w.__r3fDump = () => {
      const result: Record<string, unknown> = {};
      const named = ["HospitalRoom"];
      for (const name of named) {
        let found: import("three").Object3D | null = null;
        scene.traverse((o) => {
          if (o.name === name) found = o;
        });
        if (found) {
          const obj = found as import("three").Object3D;
          const bbox = new Box3().setFromObject(obj);
          result[name] = {
            pos: [obj.position.x.toFixed(2), obj.position.y.toFixed(2), obj.position.z.toFixed(2)],
            min: [bbox.min.x.toFixed(2), bbox.min.y.toFixed(2), bbox.min.z.toFixed(2)],
            max: [bbox.max.x.toFixed(2), bbox.max.y.toFixed(2), bbox.max.z.toFixed(2)],
          };
        }
      }
      // Tüm root child'lar
      const roots: Array<Record<string, unknown>> = [];
      for (const child of scene.children) {
        try {
          const bbox = new Box3().setFromObject(child);
          if (bbox.isEmpty()) continue;
          roots.push({
            type: child.type,
            name: child.name || "(unnamed)",
            min: [bbox.min.x.toFixed(2), bbox.min.y.toFixed(2), bbox.min.z.toFixed(2)],
            max: [bbox.max.x.toFixed(2), bbox.max.y.toFixed(2), bbox.max.z.toFixed(2)],
          });
        } catch {/* skip */}
      }
      result.roots = roots;
      return result;
    };
  }, [scene]);
  return null;
}

// Prosedür tamamlandıktan sonra overlay sahnede kaç ms daha kalsın
// (kullanıcı sonucu görsün, ses cue çalsın). Sonra unmount.
const PROCEDURE_REST_MS = 800;

function PatientBody3DImpl({
  regions,
  breathing = true,
  skinTint = "normal",
  speaking = false,
  skinClipLevel = 1.0,
  organVitals,
  organOverrides,
  equipmentState,
  vitals,
  lastMedicationTs,
  lastMedicationDrugId,
  profile,
  cameraView = "anterior",
  onRegionSelect,
  onProcedureComplete,
  className,
}: Props) {
  const [selected, setSelected] = useState<PatientRegion | null>(null);
  const [activeProcedure, setActiveProcedure] = useState<ProcedureContext | null>(null);
  const bodyRef = useRef<Group>(null);

  // Sprint B.4 — Anatomik atlas tarzı clipping:
  // Anterior cilt kaldırılır, baş + kollar + bacaklar + sırt görünür kalır.
  // Model world z bbox ≈ [-0.08, 0.09]. Plane normal (0, 0, -1) anterior'a bakar.
  // skinClipLevel=1.0 → zClip=0.09 (etkisiz, hiçbir şey clip)
  // skinClipLevel=0.0 → zClip=-0.08 (tüm anterior clip, sadece sırt görünür)
  //
  // Bonus üst sınır: clip sadece chest+abdomen seviyesinde (y 0.20-0.65 arası).
  // Bunun için ikinci bir plane (y normal) eklemek gerekir. Şimdilik tek plane
  // yeterli — kafa kısmen clip olur ama görsel olarak daha iyi y range kontrolü
  // ileride eklenebilir.
  const zClip = useMemo(() => {
    return 0.09 - (1 - skinClipLevel) * 0.17;
  }, [skinClipLevel]);

  const clippingPlanes = useMemo(() => {
    if (skinClipLevel >= 0.99) return undefined; // clipping yok
    // Plane normal (0, 0, -1), z > zClip clipped (anterior tarafı kalkar)
    return [new Plane(new Vector3(0, 0, -1), zClip)];
  }, [zClip, skinClipLevel]);

  // skinClipLevel 1.0 → cilt kapalı, organlar render edilmez (performans).
  // 1.0 altında IndividualOrgans içindeki computeOrganOpacity ile yumuşak
  // fade — tam görünürlük 0.45 ve altında. Bu sayede 0.45'te smooth geçiş.
  const showOrgans = skinClipLevel < 0.999;

  const handleSelect = (region: PatientRegion) => {
    setSelected(region);
    onRegionSelect?.(region);
  };

  const handleStartProcedure = (kind: ProcedureKind, region: PatientRegion) => {
    setSelected(null);
    setActiveProcedure({
      kind,
      regionId: region.id,
      targetPosition: region.position,
    });
  };

  const handleProcedureComplete = (context: ProcedureContext) => {
    const action: ActionRef = {
      type: "procedure",
      target_id: context.kind,
      site: context.regionId,
    };
    onProcedureComplete?.(action);

    // Sprint B.4.7: Stetoskop için region'un ses ID'sini çal (5 saniye).
    if (context.kind === "stethoscope") {
      const region = regions.find((r) => r.id === context.regionId);
      if (region?.auscultationSoundId) {
        playAuscultation(region.auscultationSoundId, 5000);
      }
    }

    window.setTimeout(() => setActiveProcedure(null), PROCEDURE_REST_MS);
  };

  // Component unmount'ta çalan sesi durdur (memory leak önle).
  useEffect(() => {
    return () => stopAuscultation();
  }, []);

  return (
    <div className={`relative w-full h-full ${className ?? ""}`}>
      <Canvas
        data-testid="patient-3d-canvas"
        frameloop={breathing || activeProcedure || speaking ? "always" : "demand"}
        dpr={[1, 2]}
        gl={{
          localClippingEnabled: true,
          antialias: true,
          powerPreference: "high-performance",
          toneMapping: ACESFilmicToneMapping,
          toneMappingExposure: 0.85, // patlak ışık yerine doğal
          outputColorSpace: SRGBColorSpace,
        }}
        shadows={{ type: PCFSoftShadowMap }}
      >
        <color attach="background" args={["#0a0a0c"]} />
        <CameraController view={cameraView} />

        {/* Apartment HDR — klinik nötr (studio'dan daha az parlak, yumuşak
            yansımalar). Cildin plastik patlamasını engeller. */}
        <Environment preset="apartment" background={false} environmentIntensity={0.4} />

        {/* Klinik aydınlatma — soft key + fill + hemi */}
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[2, 3, 4]}
          intensity={1.0}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-radius={6}
          shadow-bias={-0.0001}
        />
        <directionalLight position={[-2, 1, 1]} intensity={0.25} color="#bcd4e6" />
        <hemisphereLight args={["#ffffff", "#1a1a1f", 0.35]} />

        <DebugExposer />
        <Suspense fallback={<LoadingFallback />}>
          {/* Hastane odası — R3F primitif deterministic klinik oda.
              Y rotation +90°: hasta wrapper rotation [-π/2, 0, 0] T-pose boy
              ekseni Y'yi world -Z'ye taşır (kafa -Z, ayak +Z). Oda mesh
              eksenleri (yatak LEN=X ekseni) +90° Y rotation ile -Z eksenine
              hizalanır → yatak boyu hasta boyu aynı yönde.
              B.7: yatak hastaya orantılı küçülür (profile.scaleFactor). */}
          <group rotation={[0, Math.PI / 2, 0]}>
            <HospitalRoom visible={true} patientScale={profile?.scaleFactor ?? 1} />
          </group>

          {/* Hasta + markerlar yatay pozisyona rotate edilir — model T-pose'da
              ayakta üretildi, supine için -90° X (kafa +X yönüne yatar). */}
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
            <AnatomicPatientModel
              ref={bodyRef}
              breathing={breathing}
              skinTint={skinTint}
              speaking={speaking}
              clippingPlanes={clippingPlanes}
              scaleFactor={profile?.scaleFactor ?? 1}
            />
            {/* B.6 — Hastaya giydirilmiş klinik ekipman (O2 mask, EKG patches,
                IV kateter, BP cuff, pulse oximeter, bandage). */}
            {equipmentState && <PatientEquipment state={equipmentState} />}
            {/* B.6.1 — Vital bulgular (pupilla, göz kapağı, terleme, JVD).
                vitals değişiminde otomatik güncellenir. */}
            {vitals && <PatientVitalSigns vitals={vitals} />}
            {/* B.6.2 — İlaç verme görsel cue (IV kateter konumunda 2sn pulse).
                drugId'ye göre renk: kırmızı vazopresör, mor opioid, mavi metabolik. */}
            <MedicationBolus triggerTs={lastMedicationTs} drugId={lastMedicationDrugId} />
          {/* Organlar şimdilik gizli — ileri faz'da ayrı "Anatomi" sayfasına
              taşınacak (öğretici mod). Hasta simülasyon akışında yüzey
              gözlemine odaklanılır (Body Interact yaklaşımı). Kod, asset ve
              skill referansları PR'da korunur, kolay reaktivasyon için aşağı
              koşul kapalı. */}
          {false && showOrgans && (
            <IndividualOrgans
              hr={organVitals?.hr ?? 75}
              rr={organVitals?.rr ?? 14}
              visible={showOrgans}
              overrides={organOverrides}
              skinClipLevel={skinClipLevel}
            />
          )}
            {regions.map((region) => (
              <RegionMarker
                key={region.id}
                region={region}
                selected={selected?.id === region.id}
                onSelect={handleSelect}
              />
            ))}
            <ProcedureOverlay active={activeProcedure} onComplete={handleProcedureComplete} />
          </group>
        </Suspense>
      </Canvas>

      <InspectionPanel
        region={selected}
        onClose={() => setSelected(null)}
        onStartProcedure={handleStartProcedure}
      />
    </div>
  );
}

// React.memo — props değişmedikçe yeniden render etme. Vital tick (333ms-1s)
// PatientDialog3DPage'i tetikler ama organVitals object her tick'te yeni
// reference oluşturur. PatientDialog3DPage'de useMemo({hr, rr}) ile veya
// hr/rr değişmedikçe stabil tutulmalı. Mevcut prop'lar (regions, breathing,
// skinTint, ...) primitive veya stable reference → memo etkili.
export const PatientBody3D = memo(PatientBody3DImpl);
