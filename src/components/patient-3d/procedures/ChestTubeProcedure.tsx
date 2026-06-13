import { useMemo, useRef } from "react";
import { Vector3, CatmullRomCurve3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// ChestTubeProcedure — göğüs tüpü / toraks dreni (P3 ekipman)
// ============================================================
// Tüp torakostomi: 5. ICS midaksiller hatta cilde giren kalın dren
// tüpü (insertion noktası flasterli) + lateral göğüsten aşağı sarkan
// uzun drenaj hortumu (CatmullRom tube) + altta su altı drenaj şişesi
// (3 hazneli sistem — basit box + sıvı seviyesi). Tamamı R3F primitif
// (GLB yok). Animasyon: cildin ~14 cm önünden insertion noktasına
// 1.2 sn ease-out lerp (tüpün cilde girme hissi).
//
// PERSISTENT — takıldıktan sonra göğüste KALIR (hava/sıvı tahliyesi
// sürer). Hedef YENİ chest-5ics-midaxillary-left landmark'ı (lateral
// göğüs). Şablon: ChestSealProcedure (cilde giren kateter + flaster) +
// IVCannulaProcedure (sabit toplama kabı + hat).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.2;
const APPROACH_OFFSET_Z = 0.14;
const REST_OFFSET_Z = 0.006;

export function ChestTubeProcedure({ targetPosition, onComplete }: Props) {
  const insertGroupRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  // Drenaj şişesi, lateral insertion noktasının yanından/aşağısından
  // sabit durur (yatağın yanına asılı sistem). Tüp insertion noktasına
  // batarken şişe sabit kalır (IVCannula sabit-poşet pateniyle aynı).
  const { startPos, endPos, bottlePos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    // Lateral nokta x dışarıda (sol yan, x<0). Şişe daha da yanda ve
    // belirgin aşağıda (yatak kenarı seviyesi) sabit asılı.
    const lateralSign = tx < 0 ? -1 : 1;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
      bottlePos: new Vector3(tx + lateralSign * 0.06, ty - 0.42, tz + 0.04),
    };
  }, [targetPosition]);

  // Drenaj hortumu: insertion noktasından şişeye inen uzun esnek tube.
  // Local-space (sabit grup origin = insertion noktası world'de değil;
  // burada şişe sabit grubu içinde değil, kendi grubunda — bu yüzden tüp
  // insertion bölgesinden şişe yönüne genel bir kavisle iner).
  const hoseCurve = useMemo(() => {
    const lateralSign = bottlePos.x; // yön referansı; aşağı + yana iner
    const s = lateralSign >= 0 ? 1 : -1;
    return new CatmullRomCurve3([
      new Vector3(0.0, -0.01, 0.004),
      new Vector3(s * 0.03, -0.18, 0.02),
      new Vector3(s * 0.06, -0.40, 0.04),
    ]);
  }, [bottlePos]);

  useFrame(() => {
    if (!insertGroupRef.current) return;
    insertGroupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
  });

  return (
    <group>
      {/* === Sabit katman: su altı drenaj şişesi (3 hazneli) === */}
      <group position={bottlePos.toArray()}>
        {/* Şişe gövdesi — saydam dikdörtgen toplama kabı */}
        <mesh>
          <boxGeometry args={[0.06, 0.08, 0.03]} />
          <meshStandardMaterial color="#cfe0e6" transparent opacity={0.4} roughness={0.2} />
        </mesh>
        {/* Drenaj sıvı seviyesi — kabın altında koyu kırmızımsı sıvı */}
        <mesh position={[0, -0.025, 0]}>
          <boxGeometry args={[0.056, 0.026, 0.028]} />
          <meshStandardMaterial color="#8a2a2a" transparent opacity={0.6} roughness={0.4} />
        </mesh>
        {/* Hazne ayrım duvarları — üstte 2 ince bölme (su mührü + emiş) */}
        {[-0.018, 0.018].map((bx) => (
          <mesh key={bx} position={[bx, 0.02, 0]}>
            <boxGeometry args={[0.0015, 0.036, 0.028]} />
            <meshStandardMaterial color="#9aa6ac" transparent opacity={0.5} roughness={0.3} />
          </mesh>
        ))}
        {/* Şişe üst giriş portu — hortumun bağlandığı kısa nipel */}
        <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.012, 10]} />
          <meshStandardMaterial color="#3a4046" roughness={0.5} />
        </mesh>
      </group>

      {/* === Hareketli katman: dren tüpü insertion + flaster + hortum === */}
      <group ref={insertGroupRef}>
        {/* Tespit flasteri — cilde yapışan örtü (insertion noktası) */}
        <mesh position={[0, 0, -0.001]}>
          <boxGeometry args={[0.04, 0.035, 0.001]} />
          <meshStandardMaterial color="#eef2f4" transparent opacity={0.3} roughness={0.5} />
        </mesh>
        {/* Dren tüpü gövdesi — cilde giren kalın saydam silindir */}
        <mesh position={[0, 0, -0.004]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.0045, 0.024, 12]} />
          <meshStandardMaterial color="#d2dade" transparent opacity={0.75} roughness={0.25} />
        </mesh>
        {/* Tüp dış konnektör (cilt dışındaki bağlantı) */}
        <mesh position={[0, -0.006, 0.008]} rotation={[Math.PI / 3, 0, 0]}>
          <cylinderGeometry args={[0.006, 0.005, 0.014, 12]} />
          <meshStandardMaterial color="#c8d0d4" roughness={0.4} metalness={0.05} />
        </mesh>
        {/* Drenaj hortumu — insertion noktasından şişeye inen uzun tube */}
        <mesh>
          <tubeGeometry args={[hoseCurve, 28, 0.0042, 8, false]} />
          <meshStandardMaterial color="#cfd6da" transparent opacity={0.8} roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}
