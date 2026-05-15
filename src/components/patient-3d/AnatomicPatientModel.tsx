import { forwardRef, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { MeshStandardMaterial, type Group } from "three";

// ============================================================
// Anatomik glTF model — Sprint B.1
// ============================================================
// Asset: public/3d/patient-v1.glb (~1.1 MB, 22.879 vertex)
// Lisans: CC BY 4.0 — atıf src/components/patient-3d/LICENSE-3D.md
// Yazar: MaceLogice (Sketchfab)
// Bbox: x[-0.32, 0.32], y[-0.24, 0.78], z[-0.22, 0.10]
// ============================================================

const MODEL_URL = "/3d/patient-v1.glb";

// Preload — App ilk açıldığında /3d-demo route yüklenmeye başlamadan
// önce asset prefetch'lenir. useGLTF cache'i Suspense ile uyumlu.
useGLTF.preload(MODEL_URL);

export const AnatomicPatientModel = forwardRef<Group>((_props, ref) => {
  const { scene } = useGLTF(MODEL_URL);

  // Material'i runtime'da temiz/uniform ten tonuna ayarlayalım — orijinal
  // Sketchfab modeli specular extension kullanıyor, web rendering'de
  // metal/parlak görünüyor. Hekim eğitim materyali için mat ten daha
  // uygun.
  useMemo(() => {
    scene.traverse((obj) => {
      if ("isMesh" in obj && (obj as { isMesh: boolean }).isMesh) {
        const mesh = obj as unknown as { material: MeshStandardMaterial };
        mesh.material = new MeshStandardMaterial({
          color: "#d4a896",
          roughness: 0.72,
          metalness: 0.0,
        });
      }
    });
  }, [scene]);

  return <primitive ref={ref} object={scene} />;
});

AnatomicPatientModel.displayName = "AnatomicPatientModel";
