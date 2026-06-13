import { useMemo, useRef } from "react";
import { Vector3, CatmullRomCurve3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// NGTubeProcedure — nazogastrik sonda (P3 ekipman)
// ============================================================
// Burun deliğinden girip mideye uzanan ince tüp: burun girişindeki
// tespit bandı (flaster) + burundan epigastriuma inen uzun ince
// eğri tüp (CatmullRom curve → tubeGeometry) + dış uçta huni/konnektör.
// Tamamı R3F primitif (GLB yok). Animasyon: yüzün ~10 cm önünden burun
// girişine 1.0 sn ease-out lerp (yerleştirme/ilerletme hissi).
//
// PERSISTENT — takıldıktan sonra hastada KALIR (dekompresyon/beslenme
// sürer). Hedef face-mouth landmark'ı (ağız); giriş burun deliğine denk
// gelsin diye grup hafif yukarı (+y) offset'lenir. Tüp eğrisi local-space:
// burun deliğinden başlar, yüz/boyun önünden epigastriuma iner.
// Şablon: NasalCannulaProcedure (CatmullRom tube + NOSE_OFFSET_Y).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.014;
// Ağız landmark'ından burun deliğine yukarı kayma (8-head canon: mouth
// y=0.666, nostril taban ~y=0.69 → ~+0.025 birim). Bkz. NasalCannula.
const NOSE_OFFSET_Y = 0.025;

export function NGTubeProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    const ny = ty + NOSE_OFFSET_Y;
    return {
      startPos: new Vector3(tx, ny, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ny, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  // İnce sonda eğrisi: burun deliği girişinden (sağ nostril, x hafif sağ)
  // yüz önünden boyun/göğüs hattından epigastriuma iner. Local-space —
  // grup origin'i burun deliğindedir; aşağı iniş büyük -y ile mideye denk
  // gelir (mouth y=0.666, epigastrium y=0.431 → ~-0.235 birim aşağı).
  const tubeCurve = useMemo(
    () =>
      new CatmullRomCurve3([
        new Vector3(0.006, 0.002, 0.004), // burun deliği girişi
        new Vector3(0.004, -0.06, 0.012), // üst dudak / çene önü
        new Vector3(0.0, -0.13, 0.006), // boyun önü
        new Vector3(0.0, -0.20, 0.002), // sternum üstü
        new Vector3(0.0, -0.235, -0.002), // epigastrium (mide hizası)
      ]),
    [],
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group ref={groupRef}>
      {/* İnce sonda gövdesi — burundan mideye inen uzun eğri tüp */}
      <mesh>
        <tubeGeometry args={[tubeCurve, 40, 0.0018, 6, false]} />
        <meshStandardMaterial color="#e6ecee" transparent opacity={0.85} roughness={0.3} />
      </mesh>
      {/* Burun tespit bandı (flaster) — giriş noktasının üstünde küçük örtü */}
      <mesh position={[0.004, 0.008, 0.005]}>
        <boxGeometry args={[0.014, 0.012, 0.001]} />
        <meshStandardMaterial color="#eef2f4" transparent opacity={0.4} roughness={0.5} />
      </mesh>
      {/* Dış uç konnektörü (huni/Y-port) — burun girişinin hemen önünde */}
      <mesh position={[0.012, 0.006, 0.012]} rotation={[0, 0, Math.PI / 5]}>
        <cylinderGeometry args={[0.0035, 0.0022, 0.012, 10]} />
        <meshStandardMaterial color="#c8d0d4" roughness={0.4} metalness={0.05} />
      </mesh>
    </group>
  );
}
