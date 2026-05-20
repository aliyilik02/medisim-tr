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

  // Mesh'leri material adına göre kategorize et + chuma6oy ile çakışan
  // yapıları (kemik/kas/bağ/kıkırdak) gizle.
  useEffect(() => {
    const hearts: Mesh[] = [];
    const lungs: Mesh[] = [];

    // Bu material'lardaki mesh'ler chuma6oy dış cildiyle çakışır — gizle:
    const HIDE_PATTERNS = ["bone", "muscle", "cartilage", "ligament"];

    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh) {
        const mesh = obj as Mesh;
        const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
        const matName = (Array.isArray(mat) ? mat[0]?.name : mat?.name) ?? "";
        const matLower = matName.toLowerCase();

        // Görünmeyecek mesh'ler (kemik/kas/bağ/kıkırdak)
        if (HIDE_PATTERNS.some((p) => matLower.includes(p))) {
          mesh.visible = false;
          return;
        }

        // Heart genelde "Default" material + büyük mesh (vertex>30k)
        if (
          (matLower.includes("heart") || matLower.includes("default")) &&
          mesh.geometry.attributes.position.count > 30000
        ) {
          hearts.push(mesh);
        }

        // Akciğer
        if (matLower.includes("lung")) {
          lungs.push(mesh);
        }

        // Material'ı clone et (paylaşımlı material'ları ayır)
        if (!Array.isArray(mat) && mat) {
          const cloned = mat.clone();
          // Anatomik organ rengini biraz canlandır (Sketchfab varsayılan
          // soluk olabilir, klinik atlas görünümü için doygunluk artır)
          if (matLower.includes("lung")) {
            cloned.color.setRGB(0.92, 0.55, 0.62); // pembe akciğer
          } else if (matLower.includes("heart") || matLower.includes("default")) {
            cloned.color.setRGB(0.78, 0.22, 0.18); // koyu kırmızı kalp
          } else if (matLower.includes("intestine")) {
            cloned.color.setRGB(0.85, 0.65, 0.55); // bağırsak ten/pembe
          } else if (matLower.includes("liver") || matLower.includes("hepar")) {
            cloned.color.setRGB(0.58, 0.30, 0.20); // karaciğer kahverengi
          } else if (matLower.includes("stomach") || matLower.includes("gaster")) {
            cloned.color.setRGB(0.85, 0.55, 0.60); // mide pembe
          } else if (matLower.includes("spleen") || matLower.includes("lien")) {
            cloned.color.setRGB(0.55, 0.30, 0.45); // dalak mor
          }
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
