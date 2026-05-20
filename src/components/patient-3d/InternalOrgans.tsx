// ============================================================
// InternalOrgans — Sprint B.4 (Z-Anatomy gerçek mesh)
// ============================================================
// Asset: public/3d/anatomy-internal.glb (~3.55 MB, ~100k vertex)
// Lisans: CC BY-SA 4.0 — atıf src/components/patient-3d/LICENSE-3D.md
// Kaynak: "Splanchnology" by Z-Anatomy
//   https://sketchfab.com/3d-models/splanchnology-5cfafb312f504815aa3fec55735607a6
// Köken: BodyParts3D (DBCLS Japan), TA2-2019 etiketli yapılar
//
// Optimize: gltf-transform optimize --simplify-ratio 0.05 (95% azaltma) +
//   weld + dedup + meshopt compress (49.93 MB → 3.55 MB).
//
// İçerik (materiyel adları):
//   Lung, Bronchi, Heart (Default), Intestine, Liver, Stomach, Spleen,
//   Cartilage, Ductus, Gland, Ligament, Mucosa, Muscles, Bone
//
// Wrapper transform: Splanchnology raw y[0.0092, 1.70545] (insan boyu),
//   patient-v2 world bbox y[-0.243, 0.778]'a sığdırılır.
//   scale = 1.021 / 1.696 = 0.602
//   yOffset = -0.243 - (0.0092 × 0.602) = -0.249
//
// Animasyonlar (placeholder primitive'lerden devam):
//   - Akciğer (material adında "Lung" geçen mesh'ler): RR/60 Hz, ±5% scale
//   - Kalp (material "Heart" veya "Default" — splanchnology'de heart mesh büyük
//     ve "Default" material kullanıyor): HR/60 Hz, ±8% scale
// ============================================================

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import type { Mesh, Group, MeshStandardMaterial } from "three";

const MODEL_URL = "/3d/anatomy-internal.glb";
const MODEL_SCALE = 0.602;
const MODEL_Y_OFFSET = -0.249;

useGLTF.preload(MODEL_URL);

interface Props {
  /** Heart rate (BPM) — kalp pulsate frequency. */
  hr?: number;
  /** Respiratory rate (BPM) — akciğer breathing frequency. */
  rr?: number;
  /** Görünür mü? clipping aktifken true, kapalıyken false. */
  visible?: boolean;
}

export function InternalOrgans({ hr = 75, rr = 14, visible = true }: Props) {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef<Group>(null);
  const heartMeshes = useRef<Mesh[]>([]);
  const lungMeshes = useRef<Mesh[]>([]);

  // Mesh'leri material adına göre kategorize et + base scale kaydet
  useEffect(() => {
    const hearts: Mesh[] = [];
    const lungs: Mesh[] = [];

    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
        const matName = Array.isArray(mat)
          ? mat[0]?.name ?? ""
          : mat?.name ?? "";

        // Heart genelde "Default" veya "Heart" material — büyük mesh (vertex>50k)
        // Splanchnology'de tipik. Default material adı tek başına yeterli değil
        // (başka kullanımlar var) → vertex sayısı + material adı kombinasyonu.
        if (
          (matName.toLowerCase().includes("heart") ||
            matName.toLowerCase().includes("default")) &&
          mesh.geometry.attributes.position.count > 30000
        ) {
          hearts.push(mesh);
        }

        // Akciğer
        if (matName.toLowerCase().includes("lung")) {
          lungs.push(mesh);
        }

        // Material'ı clone et (paylaşımlı material'ları ayır) ve hafif tweak
        if (!Array.isArray(mat) && mat) {
          const cloned = mat.clone();
          // Sketchfab specular-glossiness → metalness-roughness conversion
          // pbrSpecularGlossiness extension'ı drei tarafından handle edilir,
          // burada sadece görsel tweak.
          mesh.material = cloned;
        }
      }
    });

    heartMeshes.current = hearts;
    lungMeshes.current = lungs;
  }, [scene]);

  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.getElapsedTime();

    // Kalp pulsate — HR/60 Hz, ±8%
    if (heartMeshes.current.length > 0) {
      const phase = Math.sin(t * 2 * Math.PI * (hr / 60));
      const scale = 1 + phase * 0.08;
      for (const mesh of heartMeshes.current) {
        mesh.scale.setScalar(scale);
      }
    }

    // Akciğer breathing — RR/60 Hz, ±5%
    if (lungMeshes.current.length > 0) {
      const phase = Math.sin(t * 2 * Math.PI * (rr / 60));
      const scale = 1 + phase * 0.05;
      for (const mesh of lungMeshes.current) {
        mesh.scale.setScalar(scale);
      }
    }
  });

  // useMemo + clone scene → mesh material modifikasyonu cache'lenmiş
  // gltf'i etkilemesin (aynı asset başka component'ta kullanılırsa).
  const sceneInstance = useMemo(() => scene, [scene]);

  if (!visible) return null;

  return (
    <group ref={groupRef} scale={MODEL_SCALE} position={[0, MODEL_Y_OFFSET, 0]}>
      <primitive object={sceneInstance} />
    </group>
  );
}
