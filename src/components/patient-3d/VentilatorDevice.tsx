// ============================================================
// VentilatorDevice — yatak başı 3D mekanik ventilatör cihazı (prosedürel)
// ============================================================
// GLB YOK — saf prosedürel mesh (lisans sorunu yok, hafif). Acil odası
// sahnesinde (PatientRoomScene) hasta yanında durur; tıklanınca üst katman
// VentilatorScreen panelini açar (onActivate). Hover'da imleç + ekran parlar
// + etiket görünür → keşfedilebilir. Dünya birimi: hasta ~1.02 birim
// (1 birim ≈ 1.57m); kabin ~1.3m ≈ 0.83 birim yüksekliğinde.
// Konum sahneye göre kabaca kalibre — ince ayar 3d-vision-tester ile.
// ============================================================

import { useEffect, useState } from "react";
import type { ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";

interface Props {
  /** Sahnedeki konum (yatak yanına kalibre varsayılan). */
  position?: [number, number, number];
  /** Grup rotasyonu — ekran kameraya baksın diye (genel preset: kamera +X). */
  rotation?: [number, number, number];
  scale?: number;
  /** Cihaza tıklanınca (panel aç). Verilmezse cihaz salt-dekor. */
  onActivate?: () => void;
  /** Çalışıyor mu — ekran/LED rengi (yeşil=aktif, sönük=bekleme). */
  active?: boolean;
}

const SCREEN_ON = "#0d9488"; // brand teal — çalışıyor
const SCREEN_OFF = "#1f2937"; // sönük — bekleme

export function VentilatorDevice({
  position = [-0.7, 0, -0.34],
  rotation = [0, Math.PI / 2, 0],
  scale = 1,
  onActivate,
  active = true,
}: Props) {
  const [hover, setHover] = useState(false);
  const screenColor = active ? SCREEN_ON : SCREEN_OFF;
  const emissiveI = hover ? 1.4 : active ? 0.9 : 0.25;

  // İmleç sızıntısı guard'ı: cihaz hover'dayken unmount/gizlenirse (senaryo
  // değişimi, pediatrik gate) onPointerOut ateşlenmeyebilir → imleç "pointer"
  // takılı kalır. Unmount'ta sıfırla.
  useEffect(() => {
    return () => {
      if (typeof document !== "undefined") document.body.style.cursor = "auto";
    };
  }, []);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={scale}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onActivate?.();
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHover(true);
        if (typeof document !== "undefined") document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHover(false);
        if (typeof document !== "undefined") document.body.style.cursor = "auto";
      }}
    >
      {/* Taban (tekerlekli ayak) */}
      <mesh position={[0, 0.02, 0]} castShadow>
        <boxGeometry args={[0.2, 0.04, 0.2]} />
        <meshStandardMaterial color="#3a3f47" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* 4 teker */}
      {([
        [-0.08, -0.06], [0.08, -0.06], [-0.08, 0.06], [0.08, 0.06],
      ] as const).map(([x, z], i) => (
        <mesh key={i} position={[x, 0.01, z]}>
          <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
          <meshStandardMaterial color="#15171b" roughness={0.8} />
        </mesh>
      ))}
      {/* Direk */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <cylinderGeometry args={[0.018, 0.018, 0.56, 16]} />
        <meshStandardMaterial color="#5a616b" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* Gövde/konsol */}
      <mesh position={[0, 0.68, 0]} castShadow>
        <boxGeometry args={[0.28, 0.22, 0.18]} />
        <meshStandardMaterial color="#23272e" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Ekran çerçevesi */}
      <mesh position={[0, 0.7, 0.092]}>
        <boxGeometry args={[0.24, 0.17, 0.012]} />
        <meshStandardMaterial color="#0b0d10" roughness={0.7} />
      </mesh>
      {/* Ekran yüzeyi — parlayan (hover'da daha parlak) */}
      <mesh position={[0, 0.7, 0.1]}>
        <planeGeometry args={[0.21, 0.14]} />
        <meshStandardMaterial
          color={screenColor}
          emissive={screenColor}
          emissiveIntensity={emissiveI}
          roughness={0.3}
        />
      </mesh>
      {/* Durum LED'i */}
      <mesh position={[0.1, 0.6, 0.092]}>
        <sphereGeometry args={[0.008, 12, 12]} />
        <meshStandardMaterial
          color={active ? "#22c55e" : "#6b7280"}
          emissive={active ? "#22c55e" : "#000000"}
          emissiveIntensity={active ? 1.5 : 0}
        />
      </mesh>

      {/* Hover etiketi — keşfedilebilirlik */}
      {hover && (
        <Html position={[0, 0.92, 0]} center distanceFactor={2.2}>
          <div className="pointer-events-none whitespace-nowrap rounded-md bg-ink-950/90 border border-brand/50 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.12em] text-brand-light shadow-lg">
            Ventilatör · ayarla
          </div>
        </Html>
      )}
    </group>
  );
}
