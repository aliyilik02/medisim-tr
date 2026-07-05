// ============================================================
// TubingLayer — IV hattı / O₂ hortumu catenary sarkması (Hat B)
// ============================================================
// Kemik-bağlı ekipman (iv_cannula, oxygen_mask, nasal_cannula) ile sahnedeki
// sabit kaynağı (IV askısı, duvar gaz paneli) arasına sarkan hortum çizer.
// Uç nokta her frame ekipman objesinin world konumundan okunur; yumuşatılmış
// takip (exp damp) hasta hareketinde hafif gecikme/salınım hissi verir
// (roadmap: "catenary eğrisi veya hafif rope constraint").
// TubeGeometry her frame yeniden kurulur — 24 seg × 6 radyal ≈ küçük;
// eski geometri dispose edilir (GC baskısı ölçülebilir değil).
// ============================================================

import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import {
  CatmullRomCurve3,
  Mesh,
  MeshStandardMaterial,
  TubeGeometry,
  Vector3,
} from "three";
import type { EquipmentKind } from "../equipmentMeshes";
import { buildTubePoints, type TubeSpec, type Vec3Tuple } from "./tubing";

// Kaynak uçlar PatientRoomScene sabitleriyle hizalı:
// IVPole [0.52,0,-0.35] + IVBagSet [0.13,0.66,0] → damla haznesi altı.
// WallGasPanel [0, 0.62, -1.25] → O₂ (beyaz) çıkış ağzı.
const TUBE_SPECS: Partial<Record<EquipmentKind, TubeSpec>> = {
  iv_cannula: {
    targetName: "equip_iv_cannula",
    source: [0.65, 0.52, -0.35],
    color: 0xdce8ee,
    radius: 0.0045,
    opacity: 0.75,
  },
  oxygen_mask: {
    targetName: "equip_oxygen_mask",
    source: [-0.06, 0.55, -1.23],
    color: 0xbfe8d2,
    radius: 0.006,
  },
  nasal_cannula: {
    targetName: "equip_nasal_cannula",
    source: [-0.06, 0.55, -1.23],
    color: 0xe8f2ee,
    radius: 0.004,
  },
};

const FLOOR_Y = -0.26; // oda zemini -0.27 + pay

function SaggingTube({ spec }: { spec: TubeSpec }) {
  const meshRef = useRef<Mesh>(null);
  const { scene } = useThree();
  // Yumuşatılmış hedef uç — hasta hareketini hafif gecikmeyle izler (rope hissi)
  const smoothEnd = useRef<Vector3 | null>(null);
  const target = useRef(new Vector3());
  const material = useMemo(
    () =>
      new MeshStandardMaterial({
        color: spec.color,
        roughness: 0.35,
        metalness: 0,
        transparent: spec.opacity !== undefined,
        opacity: spec.opacity ?? 1,
      }),
    [spec],
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const targetObj = scene.getObjectByName(spec.targetName);
    if (!targetObj) {
      mesh.visible = false;
      return;
    }
    targetObj.getWorldPosition(target.current);
    if (!smoothEnd.current) smoothEnd.current = target.current.clone();
    // exp damp (~8 Hz) — çerçeve hızından bağımsız yumuşak takip
    smoothEnd.current.lerp(target.current, 1 - Math.exp(-8 * delta));

    const end: Vec3Tuple = [smoothEnd.current.x, smoothEnd.current.y, smoothEnd.current.z];
    const pts = buildTubePoints(spec.source, end, { floorY: FLOOR_Y });
    const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(p[0], p[1], p[2])));
    const geo = new TubeGeometry(curve, 24, spec.radius, 6, false);
    mesh.geometry.dispose();
    mesh.geometry = geo;
    mesh.visible = true;
  });

  return <mesh ref={meshRef} material={material} frustumCulled={false} />;
}

export function TubingLayer({ equipment }: { equipment?: EquipmentKind[] }) {
  const active = (equipment ?? []).filter((k) => TUBE_SPECS[k]);
  return (
    <>
      {active.map((k) => (
        <SaggingTube key={k} spec={TUBE_SPECS[k]!} />
      ))}
    </>
  );
}
