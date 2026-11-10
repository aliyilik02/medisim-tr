// ============================================================
// PatientCandidatePage — /dev/hasta-aday (yalnız DEV)
// ============================================================
// Hasta modeli adaylarını CANLI hastayla yan yana, oyundaki ışık ve
// malzeme işlemesiyle (AnimatedPatientModel) karşılaştırır. Kabul ölçüsü
// (docs/DEVIR-OPUS-VARLIK-HATTI.md): göz kırpma · "Göğsüm ağrıyor"da
// dudak · acı ifadesi · ilaç içme klibi · bilinç kaybında yüz gevşemesi.
// Prod build'e girmez (App.tsx'te import.meta.env.DEV kapısı).
// ============================================================

import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import { PMREMGenerator, type Group, type SkinnedMesh, type Vector3 } from "three";
import { RoomEnvironment } from "three-stdlib";
import {
  AnimatedPatientModel,
  ANIMATED_MODELS,
  NON_SUPINE_CLIPS,
  CLIP_LABELS,
  type PatientClip,
  type ClipDecision,
} from "@/components/patient-3d/AnimatedPatientModel";

const LIVE_URL = ANIMATED_MODELS["male-adult"]!.url;
const DEFAULT_CANDIDATE = "/3d/candidates/patient-v3-male.glb";
const SPEECH = "Göğsüm çok ağrıyor, nefes alamıyorum.";

type Expression = "notr" | "aci" | "bilincsiz";

// ARKit morph ağırlıkları — yalnız görsel test için (klinik veri değil).
const EXPRESSIONS: Record<Expression, Record<string, number>> = {
  notr: {},
  aci: {
    browDownLeft: 0.75,
    browDownRight: 0.75,
    browInnerUp: 0.55,
    eyeSquintLeft: 0.7,
    eyeSquintRight: 0.7,
    noseSneerLeft: 0.35,
    noseSneerRight: 0.35,
    mouthStretchLeft: 0.45,
    mouthStretchRight: 0.45,
    mouthFrownLeft: 0.35,
    mouthFrownRight: 0.35,
    cheekSquintLeft: 0.4,
    cheekSquintRight: 0.4,
  },
  bilincsiz: {
    eyeBlinkLeft: 0.92,
    eyeBlinkRight: 0.92,
    jawOpen: 0.22,
    mouthRollLower: 0.15,
  },
};
const ALL_EXPR_KEYS = Array.from(
  new Set(Object.values(EXPRESSIONS).flatMap((e) => Object.keys(e))),
);

// Prob ölçümü (__candProbe): kafa kemiği ≈ (x, 0.286, 0.326), kalça ≈ (x, 0.279, 0),
// ayak ≈ z -0.62. Yüz yukarı (+Y) bakar → kamera yukarıdan, ayak tarafından.
const CAMERAS = {
  yuz: { pos: [0.0, 1.15, 0.12] as const, target: [0, 0.29, 0.33] as const },
  yakinA: { pos: [-0.33, 0.72, 0.29] as const, target: [-0.33, 0.29, 0.345] as const },
  yakinB: { pos: [0.33, 0.72, 0.29] as const, target: [0.33, 0.29, 0.345] as const },
  govde: { pos: [0.0, 2.0, -0.12] as const, target: [0, 0.25, -0.12] as const },
  yan: { pos: [1.45, 0.55, -0.1] as const, target: [0.33, 0.25, -0.1] as const },
};
type CameraKey = keyof typeof CAMERAS;

function StudioEnvironment() {
  const { gl, scene } = useThree();
  useEffect(() => {
    const pmrem = new PMREMGenerator(gl);
    const rt = pmrem.fromScene(RoomEnvironment(), 0.04);
    scene.environment = rt.texture;
    (scene as unknown as { environmentIntensity?: number }).environmentIntensity = 0.22;
    return () => {
      scene.environment = null;
      rt.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);
  return null;
}

/** Ölçüm probu (GÖZ yerine SAYI): kafa/kalça kemiklerinin dünya konumu +
    kamera durumu → window.__candProbe (Playwright okur). */
function Probe() {
  const { scene, camera, controls } = useThree() as unknown as {
    scene: { traverse: (f: (o: { name: string; getWorldPosition: (v: Vector3) => Vector3 }) => void) => void };
    camera: { position: Vector3 };
    controls: { target: Vector3 } | null;
  };
  const tmp = useMemo(() => new (camera.position.constructor as new () => Vector3)(), [camera]);
  useFrame(() => {
    const out: Record<string, number[][]> = {};
    scene.traverse((o) => {
      if (o.name === "mixamorigHead" || o.name === "mixamorigHips" || o.name === "mixamorigLeftFoot") {
        o.getWorldPosition(tmp);
        (out[o.name] ??= []).push([+tmp.x.toFixed(3), +tmp.y.toFixed(3), +tmp.z.toFixed(3)]);
      }
    });
    (window as unknown as { __candProbe?: unknown }).__candProbe = {
      ...out,
      cam: [camera.position.x, camera.position.y, camera.position.z].map((n) => +n.toFixed(3)),
      target: controls ? [controls.target.x, controls.target.y, controls.target.z].map((n) => +n.toFixed(3)) : null,
    };
  });
  return null;
}

function CameraRig({ cam }: { cam: CameraKey }) {
  const { camera, controls } = useThree() as unknown as {
    camera: { position: Vector3 };
    controls: { target: Vector3; update: () => void } | null;
  };
  useEffect(() => {
    const c = CAMERAS[cam];
    camera.position.set(c.pos[0], c.pos[1], c.pos[2]);
    controls?.target.set(c.target[0], c.target[1], c.target[2]);
    controls?.update();
  }, [cam, camera, controls]);
  return null;
}

/** Model useFrame'inden SONRA koşar (kardeş, sonra kayıtlı) → ifade ağırlıkları kazanır. */
function ExpressionDriver({ targetRef, expr }: { targetRef: React.RefObject<Group | null>; expr: Expression }) {
  const meshes = useRef<SkinnedMesh[] | null>(null);
  useFrame(() => {
    const root = targetRef.current;
    if (!root) return;
    if (!meshes.current || meshes.current.length === 0) {
      const found: SkinnedMesh[] = [];
      root.traverse((o) => {
        const m = o as SkinnedMesh;
        if (m.morphTargetDictionary && m.morphTargetInfluences) found.push(m);
      });
      meshes.current = found;
    }
    // TEŞHİS (?cull=0): skinned parça mesh'lerinin görünürlük küresi yanlışsa
    // yakın kamerada kesilirler — kapatıp karşılaştır.
    if (new URLSearchParams(window.location.search).get("cull") === "0") {
      root.traverse((o) => {
        (o as unknown as { frustumCulled: boolean }).frustumCulled = false;
      });
    }
    const want = EXPRESSIONS[expr];
    for (const m of meshes.current) {
      for (const key of ALL_EXPR_KEYS) {
        const idx = m.morphTargetDictionary![key];
        if (idx === undefined) continue;
        if (key in want) m.morphTargetInfluences![idx] = want[key];
        else if (!key.startsWith("eyeBlink") && key !== "jawOpen") m.morphTargetInfluences![idx] = 0;
      }
    }
  });
  return null;
}

class SlotBoundary extends Component<{ children: ReactNode; label: string }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <Html center>
          <div className="font-mono text-[11px] text-clinical-warning whitespace-nowrap">
            {this.props.label}: model yüklenemedi
          </div>
        </Html>
      );
    }
    return this.props.children;
  }
}

function Slot({
  url,
  label,
  x,
  clip,
  expr,
  speech,
}: {
  url: string;
  label: string;
  x: number;
  clip: PatientClip;
  expr: Expression;
  speech: string | null;
}) {
  const meta = ANIMATED_MODELS["male-adult"]!;
  const ref = useRef<Group>(null);
  const decision = useMemo<ClipDecision>(
    () =>
      expr === "bilincsiz"
        ? { clip: "laying_idle", speed: 0.25 }
        : { clip, loop: true },
    [clip, expr],
  );
  return (
    <group position={[x, meta.bedPosY, 0]} rotation={[0, Math.PI, 0]} scale={meta.bedScale}>
      <SlotBoundary label={label}>
        <Suspense fallback={null}>
          <AnimatedPatientModel
            ref={ref}
            variant="male-adult"
            modelUrlOverride={url}
            decision={decision}
            speaking={!!speech}
            speechText={speech}
            scale={1}
            position={[0, 0, 0]}
          />
          <ExpressionDriver targetRef={ref} expr={expr} />
        </Suspense>
      </SlotBoundary>
    </group>
  );
}

export function PatientCandidatePage() {
  const params = new URLSearchParams(window.location.search);
  const candidate = params.get("b") ?? DEFAULT_CANDIDATE;
  const [cam, setCam] = useState<CameraKey>((params.get("cam") as CameraKey) ?? "yuz");
  const [clip, setClip] = useState<PatientClip>("laying_idle");
  const [expr, setExpr] = useState<Expression>((params.get("expr") as Expression) ?? "notr");
  const [speech, setSpeech] = useState<string | null>(null);
  const clips = (ANIMATED_MODELS["male-adult"]!.clips ?? []).filter((c) => !NON_SUPINE_CLIPS.includes(c));

  const speak = () => {
    setSpeech(null);
    window.setTimeout(() => setSpeech(SPEECH), 30);
    window.setTimeout(() => setSpeech(null), 4200);
  };

  const btn = (active: boolean) =>
    `px-2 py-1 rounded border text-[11px] font-mono transition ${
      active ? "bg-brand/25 border-brand-light/70 text-ink-50" : "border-ink-600 text-ink-200 hover:border-brand/50"
    }`;

  return (
    <div className="w-screen h-screen bg-ink-950 relative">
      <Canvas
        data-testid="candidate-canvas"
        camera={{ position: [0, 0.62, -0.62], fov: 32 }}
        shadows
        dpr={[1, 2]}
      >
        <color attach="background" args={["#0a0a0c"]} />
        <ambientLight intensity={0.4} />
        <directionalLight position={[2, 4, 3]} intensity={0.95} castShadow />
        <directionalLight position={[-2, 2, -1]} intensity={0.3} color="#9fb6c9" />
        <hemisphereLight args={["#dfeaf2", "#15151a", 0.35]} />
        <StudioEnvironment />
        {/* Basit şilte — iki hasta yan yana (x = ∓0.33) */}
        {[-0.33, 0.33].map((x) => (
          <mesh key={x} position={[x, 0.139, 0]} receiveShadow>
            <boxGeometry args={[0.6, 0.08, 1.32]} />
            <meshStandardMaterial color="#c6d0d4" roughness={0.75} />
          </mesh>
        ))}
        <Slot url={LIVE_URL} label="Canlı (v2)" x={-0.33} clip={clip} expr={expr} speech={speech} />
        <Slot url={candidate} label="Aday" x={0.33} clip={clip} expr={expr} speech={speech} />
        <Html position={[-0.33, 0.2, 0.6]} center>
          <div className="font-mono text-[11px] text-ink-200 whitespace-nowrap">CANLI (v2)</div>
        </Html>
        <Html position={[0.33, 0.2, 0.6]} center>
          <div className="font-mono text-[11px] text-brand-light whitespace-nowrap">ADAY</div>
        </Html>
        <OrbitControls makeDefault />
        <CameraRig cam={cam} />
        <Probe />
      </Canvas>

      <div className="absolute top-3 left-3 right-3 flex flex-wrap gap-2 items-center bg-ink-900/85 border border-ink-700 rounded-lg p-2">
        <span className="font-mono text-[10px] text-ink-400 uppercase">Kamera</span>
        {(Object.keys(CAMERAS) as CameraKey[]).map((k) => (
          <button key={k} type="button" data-testid={`cand-cam-${k}`} className={btn(cam === k)} onClick={() => setCam(k)}>
            {k}
          </button>
        ))}
        <span className="font-mono text-[10px] text-ink-400 uppercase ml-3">İfade</span>
        {(Object.keys(EXPRESSIONS) as Expression[]).map((k) => (
          <button key={k} type="button" data-testid={`cand-expr-${k}`} className={btn(expr === k)} onClick={() => setExpr(k)}>
            {k}
          </button>
        ))}
        <button type="button" data-testid="cand-speak" className={btn(!!speech)} onClick={speak}>
          konuş
        </button>
        <span className="font-mono text-[10px] text-ink-400 uppercase ml-3">Klip</span>
        <select
          data-testid="cand-clip"
          value={clip}
          onChange={(e) => setClip(e.target.value as PatientClip)}
          className="bg-ink-900 border border-ink-600 rounded px-2 py-1 text-[11px] text-ink-100"
        >
          {clips.map((c) => (
            <option key={c} value={c}>
              {CLIP_LABELS[c]} ({c})
            </option>
          ))}
        </select>
        <span className="font-mono text-[10px] text-ink-500 ml-auto truncate max-w-[40%]">aday: {candidate}</span>
      </div>
    </div>
  );
}
