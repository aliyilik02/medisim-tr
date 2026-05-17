import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { MeshStandardMaterial, type Group } from "three";

// onBeforeCompile callback'inin Three.js dahili shader objesinin tipi.
// Three.js v0.170 bunu direkt export etmiyor; ihtiyacımız olan iki alan
// için minimum tip tanımlıyoruz.
type ShaderRef = {
  uniforms: Record<string, { value: number }>;
  vertexShader: string;
};

// ============================================================
// Anatomik glTF model — Sprint B.1 / B.1.1 / B.2.3
// ============================================================
// Sprint B.2.3: Tam beden modele geçildi.
// Asset: public/3d/patient-v2.glb (~1.33 MB, 154k vertex)
// Lisans: CC BY 4.0 — atıf src/components/patient-3d/LICENSE-3D.md
// Yazar: chuma6oy (Sketchfab "Male full body anatomy")
// Raw bbox: x[-1.88, 1.88], y[-6.84, 2.69], z[-0.76, 0.79]
// Wrapper transform: scale 0.107 + y offset 0.49 → world bbox v1
// ile yaklaşık aynı (y[-0.24, 0.78]). Mevcut regions.ts ve
// breathing chest center koordinatları çoğunlukla uyumlu kalır.
// ============================================================
// Solunum animasyonu shader-tabanlı vertex displacement. Anatomik
// üçgen referans noktası:
//   chest-front [0, 0.55, 0.115] (sternum)
//   chest-left  [-0.16, 0.4, 0.085] (kardiyak)
//   chest-right [0.16, 0.4, 0.085] (pulmoner)
// Bu üçgenin merkezinden 3D mesafe ile falloff — sadece göğüs ön
// duvarı oscillation yapar; omuz/kol/karın/kalça SABİT.
// CPU vertex manipulation YOK (60fps koruması).
// ============================================================

const MODEL_URL = "/3d/patient-v2.glb";
const MODEL_SCALE = 0.107;           // 9.53 birim → 1.02 birim (v1 ile aynı)
const MODEL_Y_OFFSET = 0.49;         // bbox center'ı world y=0.27'ye çek (v1 center)
const BREATH_RATE_HZ = 0.25; // ~15/dk solunum
const BREATH_AMPLITUDE_WORLD = 0.010; // göğüs duvarı AP genişlemesi world space (~1 cm)
                                       // Sprint B.2.3'te 1.5 cm idi, hala görsel olarak fazla
                                       // ("çok alçalıp yükseliyor"). 1 cm normal sakin solunum
                                       // (gerçek 0.5-1 cm AP genişleme aralığında).
// Shader displacement local space'te uygulanır, sonra modelMatrix scale wrap'lar.
// World space'te 0.038 birim hareket için local amplitude = 0.038 / MODEL_SCALE.
const BREATH_AMPLITUDE_LOCAL = BREATH_AMPLITUDE_WORLD / MODEL_SCALE;

useGLTF.preload(MODEL_URL);

interface Props {
  /** Solunum animasyonu açık mı? */
  breathing?: boolean;
}

export const AnatomicPatientModel = forwardRef<Group, Props>(
  ({ breathing = true }, ref) => {
    const { scene } = useGLTF(MODEL_URL);
    const shaderRef = useRef<ShaderRef | null>(null);

    // Material'i runtime'da uniform ten tonuna ayarla + breathing shader
    // chunk'ını inject et. onBeforeCompile her material compile'da
    // çağrılır; shader referansını saklayıp useFrame'den uniform günceller.
    useMemo(() => {
      scene.traverse((obj) => {
        if ("isMesh" in obj && (obj as { isMesh: boolean }).isMesh) {
          const mesh = obj as unknown as { material: MeshStandardMaterial };
          const mat = new MeshStandardMaterial({
            color: "#d4a896",
            roughness: 0.72,
            metalness: 0.0,
          });
          mat.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = { value: 0 };
            shader.uniforms.uBreathAmplitude = { value: BREATH_AMPLITUDE_LOCAL };
            shader.vertexShader = shader.vertexShader
              .replace(
                "#include <common>",
                `#include <common>
                 uniform float uTime;
                 uniform float uBreathAmplitude;`,
              )
              .replace(
                "#include <begin_vertex>",
                `#include <begin_vertex>
                 // Göğüs ortası world-space referans + 3D mesafe falloff.
                 // Sprint B.2.3 (v2 tam beden): falloff radius daraltıldı
                 // (eski 0.10-0.25 → 0.05-0.11) çünkü v2'de göğüs alanı
                 // total vücutun küçük bir parçası, geniş radius omuz/karın/
                 // boyun'u da kapsıyordu ("tüm üst vücut şişiyor" bug).
                 vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);
                 // Chest center: anatomik 4. ICS / nipple hizası (Vitruvian
                 // 0.75 oranı → world y=0.523). Falloff göğüs kafesi sınırları
                 // (yaklaşık ±5 cm) içinde. Referans:
                 // memory/medisim_anatomik_landmark.md
                 vec3 bChestCenter = vec3(0.0, 0.523, 0.085);
                 float bDist = distance(bWorldPos.xyz, bChestCenter);
                 float bWeight = 1.0 - smoothstep(0.03, 0.07, bDist);
                 float bPhase = sin(uTime * ${(BREATH_RATE_HZ * 2 * Math.PI).toFixed(4)});
                 transformed += normal * bWeight * bPhase * uBreathAmplitude;`,
              );
            shaderRef.current = shader;
          };
          mesh.material = mat;
        }
      });
    }, [scene]);

    // Toggle: breathing kapalıyken amplitude 0 (statik, useFrame yine
    // çalışır ama displacement sıfır → görsel etki yok)
    useEffect(() => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uBreathAmplitude.value = breathing
          ? BREATH_AMPLITUDE_LOCAL
          : 0;
      }
    }, [breathing]);

    useFrame((state) => {
      if (shaderRef.current) {
        shaderRef.current.uniforms.uTime.value = state.clock.getElapsedTime();
      }
    });

    // Wrapper group: v2 raw model 9.5x büyük + y aşağı kayık;
    // burada scale + offset uygulayıp v1 koordinat alanına çekiyoruz.
    // breathing shader modelMatrix kullanır → wrapper transform'ı
    // otomatik dahil eder, chest center koordinatları world-space'te
    // aynı kalır.
    return (
      <group ref={ref} scale={MODEL_SCALE} position={[0, MODEL_Y_OFFSET, 0]}>
        <primitive object={scene} />
      </group>
    );
  },
);

AnatomicPatientModel.displayName = "AnatomicPatientModel";
