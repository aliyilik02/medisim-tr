// ============================================================
// OrganModel — Sprint B.5+ generic tek organ wrapper
// ============================================================
// Z-Anatomy Splanchnology mesh'i generic ("Default.001", "Organ.001")
// organ ayrımı zayıf. Bu component tek tek CC BY organ modellerini
// bağımsız yüklemek için iskelet sağlar.
//
// Asset bağımsız: dosya yoksa silent null render (404 → fallback).
//
// Özellikler:
//  - Rotation (Euler XYZ radyan)
//  - "secondaryRotation": modelin lokal Y AABB üst kısmı (default %20)
//    için ayrı rotation. Akciğer modelinde trakea/larynx'i ayrı döndürmek
//    için kullanılır. Pivot cutoff Y seviyesinde.
//  - Opacity: 0-1 arasında material transparency. Cilt kesim seviyesine
//    göre fade için kullanılır (IndividualOrgans tarafından geçilir).
//  - Animation:
//      "pulse"   → grup-level scale (kalp)
//      "breathe" → mesh-level scale, alt %80 dokusu (trakea hariç)
//      "none"    → sabit render
//
// İndirme rehberi: src/components/patient-3d/LICENSE-3D.md
// ============================================================

import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Group, MeshStandardMaterial, type Mesh } from "three";

export type OrganAnimation =
  | { kind: "pulse"; rate: number }
  | { kind: "breathe"; rate: number }
  | { kind: "none" };

interface Props {
  /** public/ altında veya tam URL. Asset yoksa component null döner. */
  url: string;
  scale?: number;
  position?: [number, number, number];
  /** Euler XYZ radyan (modelin axis düzeltmesi için). */
  rotation?: [number, number, number];
  /**
   * Modelin üst kısmı (lokal Y AABB üst %splitRatio kısmı) için ayrı rotation.
   * undefined → tek-grup render (mevcut davranış).
   * Verilirse model mesh-by-mesh iki gruba bölünür, üst grup secondary
   * rotation alır; pivot cutoff Y seviyesinde.
   */
  secondaryRotation?: [number, number, number];
  /** Split ratio (0-1). 0.80 = alt %80 primary, üst %20 secondary. */
  splitRatio?: number;
  /** Hex rengi (örn. 0xc73824 → kalp kırmızısı). undefined → orijinal material. */
  color?: number;
  /** Organ animasyonu. Vital'lere bağlı dinamik rate. */
  animation?: OrganAnimation;
  /** Görünür mü? (clipping kapalıyken false). */
  visible?: boolean;
  /** Material opacity (0-1). <1 olunca transparent=true ile fade. Default 1. */
  opacity?: number;
}

export function OrganModel({
  url,
  scale = 1.0,
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  secondaryRotation,
  splitRatio = 0.80,
  color,
  animation = { kind: "none" },
  visible = true,
  opacity = 1.0,
}: Props) {
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(url, { method: "HEAD" })
      .then((r) => {
        if (cancelled) return;
        if (!r.ok) setLoadFailed(true);
      })
      .catch(() => !cancelled && setLoadFailed(true));
    return () => {
      cancelled = true;
    };
  }, [url]);

  if (loadFailed || !visible || opacity <= 0.005) return null;

  return (
    <OrganMeshInner
      url={url}
      scale={scale}
      position={position}
      rotation={rotation}
      secondaryRotation={secondaryRotation}
      splitRatio={splitRatio}
      color={color}
      animation={animation}
      visible={visible}
      opacity={opacity}
    />
  );
}

interface InnerProps {
  url: string;
  scale: number;
  position: [number, number, number];
  rotation: [number, number, number];
  secondaryRotation?: [number, number, number];
  splitRatio: number;
  color?: number;
  animation: OrganAnimation;
  visible: boolean;
  opacity: number;
}

// Breath animation cutoff: alt yüzde X (akciğer dokusu) scale, üst sabit.
const BREATHE_LUNG_CUTOFF_RATIO = 0.80;

function OrganMeshInner({
  url,
  scale,
  position,
  rotation,
  secondaryRotation,
  splitRatio,
  color,
  animation,
  visible,
  opacity,
}: InnerProps) {
  const { scene } = useGLTF(url);
  const groupRef = useRef<Group>(null);
  const breatheMeshesRef = useRef<Mesh[]>([]);

  // Mesh-split for secondary rotation. useMemo + side-effect (Object3D.add reparent).
  // Three.js add() önceki parent'tan otomatik remove → idempotent.
  const splitResult = useMemo(() => {
    if (!secondaryRotation) return null;

    // Lokal AABB hesabı
    const fullBox = new Box3();
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const m = obj as Mesh;
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) fullBox.union(m.geometry.boundingBox);
    });
    const yRange = fullBox.max.y - fullBox.min.y;
    if (yRange <= 0) return null;
    const cutoff = fullBox.min.y + yRange * splitRatio;

    // Mesh listesi
    const meshes: Mesh[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o as Mesh);
    });

    const lower = new Group();
    const upper = new Group();

    for (const m of meshes) {
      const box = m.geometry.boundingBox;
      if (!box) {
        lower.add(m);
        continue;
      }
      const centerY = (box.min.y + box.max.y) / 2;
      if (centerY <= cutoff) lower.add(m);
      else upper.add(m);
    }

    return { lower, upper, cutoff };
  }, [scene, secondaryRotation, splitRatio]);

  // Renk + opacity (material clone)
  useEffect(() => {
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;
      const mat = mesh.material;
      if (Array.isArray(mat) || !mat) return;
      const stdMat = mat as MeshStandardMaterial;
      const cloned = stdMat.clone();
      if (color !== undefined) cloned.color.setHex(color);
      const isTransparent = opacity < 1.0;
      cloned.transparent = isTransparent;
      cloned.opacity = opacity;
      // depthWrite kapalı → alpha layered organ z-fight engellenir
      cloned.depthWrite = !isTransparent;
      cloned.needsUpdate = true;
      mesh.material = cloned;
    });
  }, [scene, color, opacity]);

  // Breathe cache (mesh-level alt %80)
  useEffect(() => {
    if (animation.kind !== "breathe") {
      breatheMeshesRef.current = [];
      return;
    }

    const fullBox = new Box3();
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const m = obj as Mesh;
      m.geometry.computeBoundingBox();
      if (m.geometry.boundingBox) fullBox.union(m.geometry.boundingBox);
    });
    const yRange = fullBox.max.y - fullBox.min.y;
    if (yRange <= 0) {
      breatheMeshesRef.current = [];
      return;
    }
    const cutoff = fullBox.min.y + yRange * BREATHE_LUNG_CUTOFF_RATIO;

    const targets: Mesh[] = [];
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const m = obj as Mesh;
      const box = m.geometry.boundingBox;
      if (!box) return;
      const centerY = (box.min.y + box.max.y) / 2;
      if (centerY <= cutoff) targets.push(m);
    });

    for (const m of targets) m.scale.setScalar(1);
    breatheMeshesRef.current = targets;

    return () => {
      for (const m of targets) m.scale.setScalar(1);
      breatheMeshesRef.current = [];
    };
  }, [scene, animation.kind]);

  useFrame((state) => {
    if (!visible) return;
    if (animation.kind === "none") return;

    const t = state.clock.getElapsedTime();
    const phase = Math.sin(t * 2 * Math.PI * (animation.rate / 60));

    if (animation.kind === "pulse") {
      if (!groupRef.current) return;
      const amp = 0.08;
      groupRef.current.scale.setScalar(scale * (1 + phase * amp));
    } else if (animation.kind === "breathe") {
      const amp = 0.06;
      const meshScale = 1 + phase * amp;
      for (const m of breatheMeshesRef.current) {
        m.scale.setScalar(meshScale);
      }
    }
  });

  const groupProps = useMemo(
    () => ({ scale, position, rotation }),
    [scale, position, rotation],
  );

  // Split mode: lower + (upper @ cutoff pivot, secondary rotation)
  if (splitResult && secondaryRotation) {
    return (
      <group ref={groupRef} {...groupProps}>
        <primitive object={splitResult.lower} />
        <group
          rotation={secondaryRotation}
          position={[0, splitResult.cutoff, 0]}
        >
          <group position={[0, -splitResult.cutoff, 0]}>
            <primitive object={splitResult.upper} />
          </group>
        </group>
      </group>
    );
  }

  // Tek-grup mode (kalp/karaciğer)
  return (
    <group ref={groupRef} {...groupProps}>
      <primitive object={scene} />
    </group>
  );
}
