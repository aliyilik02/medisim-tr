// ============================================================
// SketchfabProps — CC-BY-4.0 gerçek 3D oda eşyaları (Mayıs zip'leri)
// ============================================================
// 5 Sketchfab varlığı (glTF → gltf-transform meshopt+webp, public/3d/props/):
// IV direği, hasta başı masası, refakatçi koltuğu, perde+monitör seti,
// tekerlekli sandalye. Hepsi CC-BY-4.0 — ATIF ZORUNLU: PROP_CREDITS bu
// dosyadan dışa verilir, /atiflar sayfası + public/3d/3D-ASSETS-LICENSE.md
// gösterir. Yeni prop eklerken PROP_CREDITS'e satır eklemek zorunludur.
//
// Yerleşim disiplini: model pivotları keyfi (Sketchfab kökenli) → PropGLB
// yükleme sonrası bbox ölçüp XZ-merkezler ve minY'yi 0'a oturtur; böylece
// `position` her zaman ZEMİN temas noktasıdır (oda zemini y=-0.27).
// Ölçekler bbox yüksekliğinden SAYISAL türetildi (1 m ≈ 0.6375 world birimi,
// hasta 1.6 m ≈ 1.02 kalibrasyonu) — gözle tahmin yok.
// ============================================================

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Object3D, type Mesh } from "three";

const PROP_BASE = "/3d/props";

export interface PropCredit {
  /** GLB dosyası (public/3d/props/ altında). */
  file: string;
  title: string;
  author: string;
  authorUrl: string;
  sourceUrl: string;
  license: "CC-BY-4.0";
}

// CC-BY-4.0 atıf kaydı — license.txt metinleriyle birebir (kaynak zip'ler).
export const PROP_CREDITS: PropCredit[] = [
  {
    file: "iv-pole.glb",
    title: "IV Pole",
    author: "Mountrise",
    authorUrl: "https://sketchfab.com/Mountrise",
    sourceUrl: "https://sketchfab.com/3d-models/iv-pole-76521e2f71704b1986cf5ac54368b14f",
    license: "CC-BY-4.0",
  },
  {
    file: "bedside-table.glb",
    title: "Adjustable Bedside Table",
    author: "Ethan Cragun",
    authorUrl: "https://sketchfab.com/EDIIIC",
    sourceUrl: "https://sketchfab.com/3d-models/adjustable-bedside-table-e3ef6fd54af440efa31984214dd6f11d",
    license: "CC-BY-4.0",
  },
  {
    file: "hospital-chair.glb",
    title: "Hospital Chair",
    author: "Ian Gibb",
    authorUrl: "https://sketchfab.com/slyguy",
    sourceUrl: "https://sketchfab.com/3d-models/hospital-chair-6c29e45873c14f7fa9affccd6446db70",
    license: "CC-BY-4.0",
  },
  {
    // Kaynak setten yalnız VitalsMonitor node'u kullanıldı (perde rayı kamera
    // hatlarını kapatıyordu — scripts ile ayrıştırıldı); atıf sete yapılır.
    file: "vitals-monitor.glb",
    title: "Bed Curtain and Vital Signs Monitor",
    author: "Ethan Cragun",
    authorUrl: "https://sketchfab.com/EDIIIC",
    sourceUrl: "https://sketchfab.com/3d-models/bed-curtain-and-vital-signs-monitor-295ed50eeaa249e8bbeed7b305d3da71",
    license: "CC-BY-4.0",
  },
  {
    file: "wheelchair.glb",
    title: "Wheelchair",
    author: "imnuts000",
    authorUrl: "https://sketchfab.com/imnuts000",
    sourceUrl: "https://sketchfab.com/3d-models/wheelchair-2eab99d6e3ec4514a46bca4482746cdd",
    license: "CC-BY-4.0",
  },
];

interface PropGLBProps {
  /** Dosya adı (PROP_BASE altında), ör. "iv-pole.glb". */
  file: string;
  /** Zemin temas noktası (XZ merkez + alt yüz). */
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

// Genel yükleyici: bbox-normalize (XZ merkez, minY→0) + gölge bayrakları.
export function PropGLB({ file, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: PropGLBProps) {
  const { scene } = useGLTF(`${PROP_BASE}/${file}`);
  const { clone, offset } = useMemo(() => {
    const c = scene.clone(true);
    c.traverse((obj: Object3D) => {
      const m = obj as Mesh;
      if ((m as unknown as { isMesh?: boolean }).isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
      }
    });
    const box = new Box3().setFromObject(c);
    const center = box.getCenter(new Vector3());
    return { clone: c, offset: [-center.x, -box.min.y, -center.z] as [number, number, number] };
  }, [scene]);
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <primitive object={clone} position={offset} />
    </group>
  );
}

// ── Kalibre sarmalayıcılar (bbox yükseklik → gerçek boy hedefi) ──────────
// birim dönüşümü: hedef_boy_m × 0.6375 ÷ bbox_yükseklik = scale

/** IV direği (bbox h 11.92; hedef ~1.83 m). Askı seti/tubing çapaları
 *  PatientRoomScene'de AYNI konumda kalır — hortum kaynağı bozulmaz. */
export function IVPoleReal(p: Omit<PropGLBProps, "file">) {
  return <PropGLB file="iv-pole.glb" scale={0.098} {...p} />;
}

/** Hasta başı ayarlanabilir masa (bbox h 3.775; hedef ~1.0 m). */
export function BedsideTableProp(p: Omit<PropGLBProps, "file">) {
  return <PropGLB file="bedside-table.glb" scale={0.169} {...p} />;
}

/** Refakatçi/hasta koltuğu (bbox h 2.0; hedef ~0.95 m). */
export function HospitalChairProp(p: Omit<PropGLBProps, "file">) {
  return <PropGLB file="hospital-chair.glb" scale={0.303} {...p} />;
}

/** Tekerlekli sandalye (bbox h 4.103; hedef ~0.95 m). */
export function WheelchairProp(p: Omit<PropGLBProps, "file">) {
  return <PropGLB file="wheelchair.glb" scale={0.148} {...p} />;
}

/** Tekerlekli vital monitör standı (bbox h 4.492; hedef ~1.5 m).
 *  Kaynak "Bed Curtain and Vital Signs Monitor" setinden ayrıştırılmış
 *  yalnız-monitör GLB (perde rayı kamera hatlarını kapatıyordu). */
export function VitalsMonitorProp(p: Omit<PropGLBProps, "file">) {
  return <PropGLB file="vitals-monitor.glb" scale={0.213} {...p} />;
}

useGLTF.preload(`${PROP_BASE}/iv-pole.glb`);
useGLTF.preload(`${PROP_BASE}/bedside-table.glb`);
useGLTF.preload(`${PROP_BASE}/hospital-chair.glb`);
useGLTF.preload(`${PROP_BASE}/vitals-monitor.glb`);
useGLTF.preload(`${PROP_BASE}/wheelchair.glb`);
