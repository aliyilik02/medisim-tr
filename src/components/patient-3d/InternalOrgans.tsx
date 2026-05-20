// ============================================================
// InternalOrgans — Sprint B.4 (Z-Anatomy Splanchnology mesh)
// ============================================================
// Asset: public/3d/anatomy-internal.glb (~3.55 MB, ~100k vertex)
// Lisans: CC BY-SA 4.0 — atıf src/components/patient-3d/LICENSE-3D.md
// Kaynak: "Splanchnology" by Z-Anatomy
//
// FILTER STRATEJİSİ (b1b6b96 organ kaybolma fix sonrası):
//   1. HIDE_PATTERNS: kemik/kas/bağ/peritoneum/suture/teeth → kesin gizle
//   2. SHOW_PATTERNS whitelist (generic organ + spesifik organ adları):
//      organ, default, lung, heart, liver, stomach, spleen, intestine,
//      colon, pancreas, kidney, bladder, esophagus, trachea, gland,
//      thyroid, mucosa, ductus, bronchi
//   3. alphaMode=BLEND + vertex>100k = cavity/membran → gizle
//      (Peritoneum, büyük serous membran, anatomik organ değil)
//   4. Debug log dev modunda her mesh için (DEBUG_MESH=true)
//
// Önceden MAX_MESH_SIZE=0.35 raw birim filter vardı; gerçek karaciğer/
// akciğer 0.4+ olabildiği için organlar kayboldu. Kaldırıldı.
// ============================================================

import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3 } from "three";
import type { Mesh, Group, MeshStandardMaterial } from "three";

// Raw birim — gerçek anatomik organ < 0.30 (yaklaşık 30 cm).
// Bunu aşan mesh'ler genelde pleura, peritoneum, body cavity shell'i.
// Önceki commit'te kaldırılmıştı, ekran görüntüsünde devasa akciğer
// shell'lerinin patladığı görülünce geri getirildi.
const MAX_ORGAN_SIZE_RAW = 0.30;

const MODEL_URL = "/3d/anatomy-internal.glb";
const MODEL_SCALE = 0.602;
const MODEL_Y_OFFSET = -0.249;

// Debug log — dev console'a mesh kararlarını yaz (problem teşhisi için)
const DEBUG_MESH = import.meta.env.DEV;

useGLTF.preload(MODEL_URL);

interface Props {
  /** Heart rate (BPM) — kalp pulsate frequency. */
  hr?: number;
  /** Respiratory rate (BPM) — akciğer breathing frequency. */
  rr?: number;
  /** Görünür mü? clipping aktifken true, kapalıyken false. */
  visible?: boolean;
  /** Debug: filter bypass et, TÜM mesh'leri göster (ayar için). */
  debugShowAll?: boolean;
}

export function InternalOrgans({
  hr = 75,
  rr = 14,
  visible = true,
  debugShowAll = false,
}: Props) {
  const { scene } = useGLTF(MODEL_URL);
  const groupRef = useRef<Group>(null);
  const heartMeshes = useRef<Mesh[]>([]);
  const lungMeshes = useRef<Mesh[]>([]);

  useEffect(() => {
    const hearts: Mesh[] = [];
    const lungs: Mesh[] = [];

    // Material adına göre kesin gizle (chuma6oy ile çakışan yapılar)
    const HIDE_PATTERNS = [
      "bone", "muscle", "cartilage", "ligament",
      "peritoneum", "suture", "teeth", "fascia",
    ];

    // Görünür organ adları (Splanchnology generic + spesifik)
    const SHOW_PATTERNS = [
      "organ", "default",       // Splanchnology generic adlar
      "lung", "bronchi", "trachea",
      "heart",
      "liver", "hepar",
      "stomach", "gaster",
      "spleen", "lien",
      "intestine", "colon",
      "pancreas",
      "kidney", "ren",
      "bladder", "vesica",
      "esophagus", "esofagus",
      "gland", "thyroid",
      "mucosa", "ductus",
    ];

    const decisions: Array<{ name: string; mat: string; visible: boolean; reason: string }> = [];

    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const mesh = obj as Mesh;
      const mat = mesh.material as MeshStandardMaterial | MeshStandardMaterial[];
      const matName = (Array.isArray(mat) ? mat[0]?.name : mat?.name) ?? "";
      const matLower = matName.toLowerCase();
      const vertexCount = mesh.geometry.attributes.position.count;
      const alphaMode = !Array.isArray(mat) && mat?.transparent ? "BLEND" : "OPAQUE";

      // Mesh bbox boyutu — pleura/cavity shell'lerini yakala
      mesh.geometry.computeBoundingBox();
      const meshBox = mesh.geometry.boundingBox;
      let maxDim = 0;
      if (meshBox) {
        const sizeVec = new Vector3();
        meshBox.getSize(sizeVec);
        maxDim = Math.max(sizeVec.x, sizeVec.y, sizeVec.z);
      }

      let shouldShow = true;
      let reason = "default";

      if (debugShowAll) {
        shouldShow = true;
        reason = "debugShowAll";
      } else if (maxDim > MAX_ORGAN_SIZE_RAW) {
        shouldShow = false;
        reason = `too big (maxDim=${maxDim.toFixed(2)} > ${MAX_ORGAN_SIZE_RAW})`;
      } else if (HIDE_PATTERNS.some((p) => matLower.includes(p))) {
        shouldShow = false;
        reason = "HIDE_PATTERNS";
      } else if (!SHOW_PATTERNS.some((p) => matLower.includes(p))) {
        shouldShow = false;
        reason = "not in SHOW_PATTERNS";
      } else if (alphaMode === "BLEND" && vertexCount > 100_000) {
        shouldShow = false;
        reason = `BLEND+vertex>100k (cavity/membran), v=${vertexCount}`;
      }

      mesh.visible = shouldShow;
      decisions.push({
        name: mesh.name || "(unnamed)",
        mat: matName,
        size: maxDim.toFixed(3),
        visible: shouldShow,
        reason,
      });

      if (!shouldShow) return;

      // Animasyon hedefleri
      if (
        (matLower.includes("heart") ||
          matLower.includes("default") ||
          matLower.includes("organ")) &&
        vertexCount > 20_000
      ) {
        hearts.push(mesh);
      }
      if (matLower.includes("lung") || matLower.includes("bronchi")) {
        lungs.push(mesh);
      }

      // Renk override (specular-glossiness ile uyumlu setHex + needsUpdate)
      if (!Array.isArray(mat) && mat) {
        const cloned = mat.clone();
        if (matLower.includes("lung")) {
          cloned.color.setHex(0xeb8d9e);
        } else if (matLower.includes("heart")) {
          cloned.color.setHex(0xc73824);
        } else if (matLower.includes("intestine") || matLower.includes("colon")) {
          cloned.color.setHex(0xd9a78a);
        } else if (matLower.includes("liver") || matLower.includes("hepar")) {
          cloned.color.setHex(0x935028);
        } else if (matLower.includes("stomach") || matLower.includes("gaster")) {
          cloned.color.setHex(0xd98a96);
        } else if (matLower.includes("spleen") || matLower.includes("lien")) {
          cloned.color.setHex(0x8b4570);
        } else if (matLower.includes("kidney") || matLower.includes("ren")) {
          cloned.color.setHex(0x8c4a3a);
        } else if (matLower.includes("bronchi") || matLower.includes("trachea")) {
          cloned.color.setHex(0xe0c4ad);
        } else if (matLower.includes("gland") || matLower.includes("thyroid")) {
          cloned.color.setHex(0xc88a72);
        } else if (matLower.includes("mucosa")) {
          cloned.color.setHex(0xe8a8a8);
        } else if (matLower.includes("ductus")) {
          cloned.color.setHex(0xc4a48c);
        } else if (matLower.includes("organ") || matLower.includes("default")) {
          // Splanchnology generic — büyük mesh genelde kalp/akciğer kombo
          cloned.color.setHex(0xb86056);
        }
        cloned.needsUpdate = true;
        mesh.material = cloned;
      }
    });

    heartMeshes.current = hearts;
    lungMeshes.current = lungs;

    if (DEBUG_MESH) {
      // eslint-disable-next-line no-console
      console.table(decisions);
      // eslint-disable-next-line no-console
      console.log(
        `[InternalOrgans] heart targets: ${hearts.length}, lung targets: ${lungs.length}`,
      );
    }
  }, [scene, debugShowAll]);

  useFrame((state) => {
    if (!visible) return;
    const t = state.clock.getElapsedTime();

    if (heartMeshes.current.length > 0) {
      const phase = Math.sin(t * 2 * Math.PI * (hr / 60));
      const scale = 1 + phase * 0.08;
      for (const mesh of heartMeshes.current) {
        mesh.scale.setScalar(scale);
      }
    }

    if (lungMeshes.current.length > 0) {
      const phase = Math.sin(t * 2 * Math.PI * (rr / 60));
      const scale = 1 + phase * 0.05;
      for (const mesh of lungMeshes.current) {
        mesh.scale.setScalar(scale);
      }
    }
  });

  const sceneInstance = useMemo(() => scene, [scene]);

  if (!visible) return null;

  return (
    <group ref={groupRef} scale={MODEL_SCALE} position={[0, MODEL_Y_OFFSET, 0]}>
      <primitive object={sceneInstance} />
    </group>
  );
}
