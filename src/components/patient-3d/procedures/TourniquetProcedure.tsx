import { useMemo, useRef } from "react";
import { Vector3, type Group } from "three";
import { useFrame } from "@react-three/fiber";
import { useProcedureAnimation } from "./useProcedureAnimation";

// ============================================================
// TourniquetProcedure — CAT (Combat Application Tourniquet) (P1 ekipman)
// ============================================================
// Ekstremite proksimaline saran turnike: geniş kayış (kolu/uyluğu saran
// kavisli torus parçası) + windlass çubuğu (sıkma kolu, silindir) +
// windlass tutucu klip. Tamamı R3F primitif (GLB yok). İki fazlı, ikisi
// de tek useProcedureAnimation progress'ine bağlı:
//   1) Yaklaşma: ekstremitenin ~10 cm önünden cilde lerp (group position).
//   2) Sıkma: yerleştikten sonra windlass çubuğu döner (kanama kontrolü
//      "high and tight" sıkma manevrası). Rotasyon doğrudan mesh ref
//      üzerinden mutasyon (useFrame'de setState YOK).
//
// PERSISTENT — takıldıktan sonra ekstremitede KALIR (kanama kontrolü
// sürer). Şablon: BpCuffProcedure (kavisli sarma + ref mutasyonu).
// ============================================================

interface Props {
  targetPosition: [number, number, number];
  onComplete: () => void;
}

const ANIMATION_DURATION_SEC = 1.0;
const APPROACH_OFFSET_Z = 0.10;
const REST_OFFSET_Z = 0.0; // turnike ekstremiteyi sarar, cilt yüzeyiyle aynı hizada

export function TourniquetProcedure({ targetPosition, onComplete }: Props) {
  const groupRef = useRef<Group>(null);
  const windlassRef = useRef<Group>(null);
  const animRef = useProcedureAnimation(ANIMATION_DURATION_SEC, onComplete);

  const { startPos, endPos } = useMemo(() => {
    const [tx, ty, tz] = targetPosition;
    return {
      startPos: new Vector3(tx, ty, tz + APPROACH_OFFSET_Z),
      endPos: new Vector3(tx, ty, tz + REST_OFFSET_Z),
    };
  }, [targetPosition]);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
    }
    // Yerleştikten sonra windlass çubuğu sıkma için döner (progress>0.85).
    // ~1.5 tam tur ile durur (kanama kontrolü hissi) — progress'e bağlı,
    // sürekli dönmez (turnike sabitlenir).
    if (windlassRef.current && animRef.current.progress > 0.85) {
      const turnProgress = (animRef.current.progress - 0.85) / 0.15;
      windlassRef.current.rotation.z = turnProgress * Math.PI * 1.5;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Ana kayış — ekstremiteyi saran geniş bant (kavisli torus parçası).
          BpCuff'tan daha geniş tube (kalın naylon kayış hissi). */}
      <mesh rotation={[Math.PI / 2, 0, -Math.PI * 0.15]}>
        <torusGeometry args={[0.034, 0.016, 12, 24, Math.PI * 1.5]} />
        <meshStandardMaterial color="#2a2a25" roughness={0.85} metalness={0.02} />
      </mesh>
      {/* Kayış kenar dikişi — açık renkli ince şerit (CAT siyah/zeytin) */}
      <mesh position={[0, 0.014, 0]} rotation={[Math.PI / 2, 0, -Math.PI * 0.15]}>
        <torusGeometry args={[0.035, 0.003, 8, 24, Math.PI * 1.4]} />
        <meshStandardMaterial color="#4a4a3a" roughness={0.8} />
      </mesh>

      {/* === Windlass mekanizması (dış yüzeyde) === */}
      <group ref={windlassRef} position={[0, 0.025, 0.035]}>
        {/* Windlass çubuğu — sıkma kolu (yatay silindir) */}
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.004, 0.004, 0.05, 12]} />
          <meshStandardMaterial color="#1a1a18" roughness={0.6} metalness={0.2} />
        </mesh>
      </group>
      {/* Windlass tutucu klip (üçgen plaka, çubuğu sabitler) */}
      <mesh position={[0.022, 0.03, 0.03]}>
        <boxGeometry args={[0.012, 0.018, 0.006]} />
        <meshStandardMaterial color="#3a3a30" roughness={0.7} />
      </mesh>
      {/* Etiket / zaman kartı — turnike üzerindeki açık renk küçük plaka */}
      <mesh position={[-0.025, 0.02, 0.032]} rotation={[0, 0, 0.2]}>
        <boxGeometry args={[0.016, 0.01, 0.001]} />
        <meshStandardMaterial color="#d8d4c0" roughness={0.7} />
      </mesh>
    </group>
  );
}
