// ============================================================
// OrganModel — Sprint B.5+ generic tek organ wrapper
// ============================================================
// Z-Anatomy Splanchnology mesh'i generic ("Default.001", "Organ.001")
// organ ayrımı zayıf. Bu component tek tek CC BY organ modellerini
// (Sketchfab/BodyParts3D) bağımsız yüklemek için iskelet sağlar.
//
// Asset bağımsız: dosya yoksa silent null render (404 → fallback).
// Kullanım örneği (asset hazır olunca):
//
//   <OrganModel
//     url="/3d/organs/heart.glb"
//     scale={0.05}
//     position={[0, 0.50, 0.05]}
//     color={0xc73824}
//     animation={{ kind: "pulse", rate: 75 }}
//   />
//
// İndirme rehberi: src/components/patient-3d/LICENSE-3D.md "Önerilen
// CC BY organ kaynakları" bölümü.
// ============================================================

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { MeshStandardMaterial, type Group, type Mesh } from "three";

export type OrganAnimation =
  | { kind: "pulse"; rate: number }   // BPM → kalp gibi sistolik scale
  | { kind: "breathe"; rate: number } // /dk → akciğer gibi sakin AP genişleme
  | { kind: "none" };

interface Props {
  /** public/ altında veya tam URL. Asset yoksa component null döner. */
  url: string;
  scale?: number;
  position?: [number, number, number];
  /** Hex rengi (örn. 0xc73824 → kalp kırmızısı). undefined → orijinal material. */
  color?: number;
  /** Organ animasyonu. Vital'lere bağlı dinamik rate. */
  animation?: OrganAnimation;
  /** Görünür mü? (clipping kapalıyken false). */
  visible?: boolean;
}

export function OrganModel({
  url,
  scale = 1.0,
  position = [0, 0, 0],
  color,
  animation = { kind: "none" },
  visible = true,
}: Props) {
  const groupRef = useRef<Group>(null);
  const [loadFailed, setLoadFailed] = useState(false);

  // useGLTF Suspense throw eder; HEAD ile var mı kontrol et, yoksa fallback null.
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

  useFrame((state) => {
    if (!visible || !groupRef.current || animation.kind === "none") return;
    const t = state.clock.getElapsedTime();
    const phase = Math.sin(t * 2 * Math.PI * (animation.rate / 60));
    const amp = animation.kind === "pulse" ? 0.08 : 0.05;
    groupRef.current.scale.setScalar(scale * (1 + phase * amp));
  });

  if (loadFailed || !visible) return null;

  return (
    <OrganMeshInner
      url={url}
      groupRef={groupRef}
      scale={scale}
      position={position}
      color={color}
    />
  );
}

interface InnerProps {
  url: string;
  groupRef: React.RefObject<Group>;
  scale: number;
  position: [number, number, number];
  color?: number;
}

function OrganMeshInner({ url, groupRef, scale, position, color }: InnerProps) {
  const { scene } = useGLTF(url);

  useEffect(() => {
    if (color === undefined) return;
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;
      const mat = mesh.material;
      if (Array.isArray(mat) || !mat) return;
      const stdMat = mat as MeshStandardMaterial;
      const cloned = stdMat.clone();
      cloned.color.setHex(color);
      cloned.needsUpdate = true;
      mesh.material = cloned;
    });
  }, [scene, color]);

  return (
    <group ref={groupRef} scale={scale} position={position}>
      <primitive object={scene} />
    </group>
  );
}
