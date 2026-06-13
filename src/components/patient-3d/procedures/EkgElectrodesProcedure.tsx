import { useMemo, useRef } from "react";
import { Vector3, CatmullRomCurve3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// EkgElectrodesProcedure — göğüs EKG elektrotları (P0 ekipman)
// ============================================================
// 5 yapışkan elektrot diski (snap-button'lı) + her birinden monitöre
// giden renk kodlu kablo (tube geometri). Yerleşim AHA 5-lead torso
// konvansiyonu (RA/LA/RL/LL + V) target (göğüs merkezi) etrafına
// göreli offset'lerle. Tüm grup birlikte cilt önünden 1.0 sn ease-out
// lerp ile yapışır; elektrotlar göreli pozisyonlarını korur.
// Tamamlanınca persistent katmanda kalır. Şablon: OxygenMaskProcedure.
//
// Renk kodu (AHA): RA=beyaz, LA=siyah, RL=yeşil, LL=kırmızı, V=kahve.
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.13;
const REST_OFFSET_Z = 0.006;

// Elektrot göreli offset'leri (target = göğüs merkezi). x: sağ/sol,
// y: yukarı/aşağı. AHA torso placement'ın sadeleştirilmiş hali —
// monitör elektrot yerleşimi (tanısal 12-derivasyon değil).
const ELECTRODES: Array<{
  id: string;
  offset: [number, number, number];
  color: string;
}> = [
  { id: "RA", offset: [0.075, 0.075, 0], color: "#f0f0f0" }, // sağ üst (beyaz)
  { id: "LA", offset: [-0.075, 0.075, 0], color: "#1a1a1a" }, // sol üst (siyah)
  { id: "RL", offset: [0.075, -0.085, 0], color: "#3aa84a" }, // sağ alt (yeşil)
  { id: "LL", offset: [-0.075, -0.085, 0], color: "#d83030" }, // sol alt (kırmızı)
  { id: "V", offset: [-0.02, -0.01, 0.004], color: "#9a6a3a" }, // göğüs (kahve)
];

export function EkgElectrodesProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  // Grup pozisyonu target'a lerp; elektrotlar grup-local offset'te durur.
  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  // Her elektrottan üste (monitöre) çıkan kablonun tube geometrisi.
  // Hafif sarkma için orta kontrol noktası dışarı/öne kavislendirilir.
  const cableCurves = useMemo(() => {
    return ELECTRODES.map((e) => {
      const [ex, ey, ez] = e.offset;
      const start = new Vector3(ex, ey, ez + 0.004);
      const mid = new Vector3(ex * 0.4, ey + 0.06, ez + 0.03);
      const end = new Vector3(0.0, 0.14, 0.02); // ortak monitör çıkış noktası
      return new CatmullRomCurve3([start, mid, end]);
    });
  }, []);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {ELECTRODES.map((e) => (
        <group key={e.id} position={e.offset}>
          {/* Yapışkan ped — beyaz disk (cilde yapışan taban) */}
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.002, 20]} />
            <meshStandardMaterial color="#eef0ef" roughness={0.7} />
          </mesh>
          {/* Snap-button — renk kodlu metal düğme (kablo bağlantısı) */}
          <mesh position={[0, 0, 0.003]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.004, 0.005, 0.004, 14]} />
            <meshStandardMaterial color={e.color} metalness={0.4} roughness={0.4} />
          </mesh>
        </group>
      ))}
      {/* Kablolar — grup-local (curve noktaları zaten offset'i içeriyor),
          her elektrottan ortak monitör çıkış noktasına renk kodlu tube. */}
      {ELECTRODES.map((e, i) => (
        <mesh key={`cable-${e.id}`}>
          <tubeGeometry args={[cableCurves[i], 16, 0.0014, 6, false]} />
          <meshStandardMaterial color={e.color} roughness={0.5} />
        </mesh>
      ))}
    </group>
  );
}
