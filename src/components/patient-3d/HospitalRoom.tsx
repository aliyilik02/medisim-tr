// ============================================================
// HospitalRoom — R3F primitif klinik oda (drei upgrade)
// ============================================================
// drei.RoundedBox + MeshTransmissionMaterial + MeshReflectorMaterial ile
// köşeli "Minecraft" görüntüsünden archviz seviyesine. Tonemapping ve HDRI
// PatientBody3D.tsx Canvas + Environment'ta zaten ACESFilmic.
//
// Klinik standart (Northwell + HFG single patient room):
//   Oda: 4m × 4m × 2.7m
//   Yatak: 2m × 1m × 0.7m, merkez (0, -0.3, 0)
//   Hasta koordinat: +X kafa yönü, -X ayak, +Z sağ, -Z sol, +Y yukarı
// ============================================================

import { memo } from "react";
import { RoundedBox, MeshTransmissionMaterial, MeshReflectorMaterial } from "@react-three/drei";

interface Props {
  visible?: boolean;
  debug?: boolean;
}

// =============== ZEMİN — parlak vinyl klinik flooring =================
function Floor() {
  return (
    <mesh position={[0, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[5, 5]} />
      {/* MeshReflectorMaterial = yansıtan parlak yüzey (klinik vinyl).
          blur+mixBlur+mixStrength → kontrollü reflection. */}
      <MeshReflectorMaterial
        blur={[400, 200]}
        resolution={512}
        mixBlur={1.5}
        mixStrength={1.2}
        mirror={0.2}
        depthScale={0.15}
        minDepthThreshold={0.5}
        color="#9ba0a6"
        metalness={0.05}
        roughness={0.78}
      />
    </mesh>
  );
}

// =============== DUVARLAR =================
function HeadWall() {
  return (
    <group position={[2.0, 1.0, 0]}>
      {/* Açık krem duvar */}
      <mesh rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.0, 2.7]} />
        <meshStandardMaterial color="#e8e2d6" roughness={0.95} />
      </mesh>
      {/* Headwall console band — dikey metal + cam panel */}
      <RoundedBox args={[0.06, 0.42, 2.6]} radius={0.02} smoothness={4} position={[-0.03, 0.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#dcdfe3" roughness={0.4} metalness={0.3} />
      </RoundedBox>
      {/* Oksijen + vakum + elektrik priz */}
      {[
        { z: -0.7, color: "#3aa872", label: "O2" },
        { z: -0.4, color: "#4a5568", label: "Vac" },
        { z: 0, color: "#1a1d22", label: "Elec" },
        { z: 0.4, color: "#1a1d22", label: "Elec" },
      ].map((p, i) => (
        <RoundedBox key={i} args={[0.025, 0.15, 0.18]} radius={0.015} smoothness={3} position={[-0.06, 0.05, p.z]} castShadow>
          <meshStandardMaterial color={p.color} roughness={0.5} metalness={0.4} />
        </RoundedBox>
      ))}
      {/* Hemşire çağrı düğmesi — emissive kırmızı */}
      <RoundedBox args={[0.022, 0.10, 0.07]} radius={0.012} smoothness={3} position={[-0.06, -0.18, 0.3]} castShadow>
        <meshStandardMaterial color="#dc2626" emissive="#dc2626" emissiveIntensity={0.4} roughness={0.3} />
      </RoundedBox>
      {/* Saat — duvarda dekoratif */}
      <mesh position={[-0.03, 0.8, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <circleGeometry args={[0.18, 32]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} />
      </mesh>
      <mesh position={[-0.04, 0.8, -1.2]} rotation={[0, Math.PI / 2, 0]}>
        <ringGeometry args={[0.16, 0.18, 32]} />
        <meshStandardMaterial color="#1a1d22" roughness={0.4} />
      </mesh>
    </group>
  );
}

function FootWall() {
  return (
    <mesh position={[-2.0, 1.0, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[4.0, 2.7]} />
      <meshStandardMaterial color="#e8e2d6" roughness={0.95} />
    </mesh>
  );
}

function SideWallLeft() {
  return (
    <mesh position={[0, 1.0, -2.0]} receiveShadow>
      <planeGeometry args={[4.0, 2.7]} />
      <meshStandardMaterial color="#e8e2d6" roughness={0.95} side={2} />
    </mesh>
  );
}

// =============== YATAK =================
function Bed() {
  const LEN = 1.9;
  const WID = 0.85;
  // Hasta wrapper Y=0.05, T-pose Z bbox [-0.222, 0.096] → -90°X rotation
  // sonra hasta arka (sırt) world Y ≈ 0.05 - 0.096 = -0.046.
  // Şilte üst yüzeyi (Y=0.10 internal) world Y'sinin -0.046 olması için
  // Bed group position Y = -0.146.
  return (
    <group position={[0, -0.146, 0]}>
      {/* Yatak çerçevesi — yuvarlatılmış metal */}
      <RoundedBox args={[LEN, 0.08, WID]} radius={0.02} smoothness={4} position={[0, -0.04, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1f2125" roughness={0.5} metalness={0.7} />
      </RoundedBox>
      {/* Şilte — yumuşak köşeli */}
      <RoundedBox args={[LEN - 0.04, 0.10, WID - 0.04]} radius={0.04} smoothness={4} position={[0, 0.08, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f5f6f8" roughness={0.85} />
      </RoundedBox>
      {/* Alt çarşaf — açık mavi */}
      <RoundedBox args={[LEN - 0.02, 0.02, WID - 0.02]} radius={0.01} smoothness={3} position={[0, 0.14, 0]} receiveShadow>
        <meshStandardMaterial color="#c8d8e8" roughness={0.92} />
      </RoundedBox>
      {/* Yastık — yumuşak yuvarlatılmış */}
      <RoundedBox args={[0.36, 0.10, 0.50]} radius={0.05} smoothness={4} position={[LEN / 2 - 0.22, 0.20, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#ffffff" roughness={0.9} />
      </RoundedBox>
      {/* Headboard — kafa ucu yuvarlatılmış metal başlık */}
      <RoundedBox args={[0.05, 0.55, WID + 0.06]} radius={0.025} smoothness={4} position={[LEN / 2 + 0.03, 0.22, 0]} castShadow>
        <meshStandardMaterial color="#3a3d43" roughness={0.35} metalness={0.85} />
      </RoundedBox>
      {/* Footboard */}
      <RoundedBox args={[0.05, 0.32, WID + 0.04]} radius={0.025} smoothness={4} position={[-LEN / 2 - 0.03, 0.13, 0]} castShadow>
        <meshStandardMaterial color="#3a3d43" roughness={0.35} metalness={0.85} />
      </RoundedBox>
      {/* Yan ray — sağ */}
      <RoundedBox args={[LEN * 0.7, 0.06, 0.04]} radius={0.018} smoothness={3} position={[0, 0.24, WID / 2 + 0.03]} castShadow>
        <meshStandardMaterial color="#6a7280" roughness={0.3} metalness={0.92} />
      </RoundedBox>
      {/* Yan ray — sol */}
      <RoundedBox args={[LEN * 0.7, 0.06, 0.04]} radius={0.018} smoothness={3} position={[0, 0.24, -WID / 2 - 0.03]} castShadow>
        <meshStandardMaterial color="#6a7280" roughness={0.3} metalness={0.92} />
      </RoundedBox>
      {/* 4 tekerli ayak */}
      {[
        [LEN / 2 - 0.10, -0.22, WID / 2 - 0.10],
        [LEN / 2 - 0.10, -0.22, -WID / 2 + 0.10],
        [-LEN / 2 + 0.10, -0.22, WID / 2 - 0.10],
        [-LEN / 2 + 0.10, -0.22, -WID / 2 + 0.10],
      ].map(([x, y, z], i) => (
        <group key={i} position={[x, y, z]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.03, 0.03, 0.30, 12]} />
            <meshStandardMaterial color="#1a1d22" roughness={0.4} metalness={0.6} />
          </mesh>
          <mesh position={[0, -0.17, 0]} castShadow>
            <sphereGeometry args={[0.05, 16, 16]} />
            <meshStandardMaterial color="#2a2d33" roughness={0.4} metalness={0.7} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// =============== IV POLE + SERUM (cam transmission) =================
function IvPole() {
  return (
    <group position={[0.85, 0, 0.55]}>
      {/* 5-yıldız cross base */}
      {[0, 72, 144, 216, 288].map((deg, i) => {
        const rad = (deg * Math.PI) / 180;
        return (
          <group key={i} rotation={[0, rad, 0]} position={[0, -0.28, 0]}>
            <RoundedBox args={[0.40, 0.03, 0.03]} radius={0.01} smoothness={3} position={[0.20, 0, 0]} castShadow>
              <meshStandardMaterial color="#3a3d43" roughness={0.35} metalness={0.88} />
            </RoundedBox>
            <mesh position={[0.40, -0.015, 0]} castShadow>
              <sphereGeometry args={[0.025, 12, 12]} />
              <meshStandardMaterial color="#1a1d22" roughness={0.4} metalness={0.85} />
            </mesh>
          </group>
        );
      })}
      {/* Ana direk */}
      <mesh position={[0, 0.6, 0]} castShadow>
        <cylinderGeometry args={[0.014, 0.014, 1.75, 16]} />
        <meshStandardMaterial color="#cdd0d4" roughness={0.25} metalness={0.95} />
      </mesh>
      {/* Üst çubuk (T) */}
      <RoundedBox args={[0.35, 0.02, 0.02]} radius={0.008} smoothness={3} position={[0, 1.45, 0]} castShadow>
        <meshStandardMaterial color="#cdd0d4" roughness={0.25} metalness={0.95} />
      </RoundedBox>
      {/* Kancalar (2) */}
      {[-0.12, 0.12].map((x, i) => (
        <mesh key={i} position={[x, 1.43, 0]} castShadow>
          <torusGeometry args={[0.025, 0.005, 8, 16]} />
          <meshStandardMaterial color="#cdd0d4" roughness={0.25} metalness={0.95} />
        </mesh>
      ))}
      {/* Serum poşeti — CAM TRANSMISSION (yarı saydam berrak) */}
      <RoundedBox args={[0.10, 0.22, 0.04]} radius={0.02} smoothness={4} position={[-0.12, 1.30, 0]} castShadow>
        <MeshTransmissionMaterial
          backside
          samples={4}
          resolution={256}
          transmission={0.95}
          roughness={0.1}
          thickness={0.15}
          ior={1.33}
          chromaticAberration={0.02}
          color="#e0eaf0"
        />
      </RoundedBox>
      {/* Serum tüpü */}
      <mesh position={[-0.12, 1.0, 0]} castShadow>
        <cylinderGeometry args={[0.004, 0.004, 0.55, 8]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.4} transparent opacity={0.7} />
      </mesh>
    </group>
  );
}

// =============== VITAL MONITOR (cam ekran) =================
function VitalMonitor() {
  return (
    <group position={[0.85, 1.45, -0.55]}>
      {/* Duvar mount kolu */}
      <RoundedBox args={[0.16, 0.05, 0.05]} radius={0.018} smoothness={3} position={[0.08, 0, 0.05]} castShadow>
        <meshStandardMaterial color="#5a5d63" roughness={0.4} metalness={0.6} />
      </RoundedBox>
      {/* Monitor gövdesi */}
      <RoundedBox args={[0.18, 0.32, 0.44]} radius={0.025} smoothness={4} position={[-0.02, 0, 0.10]} castShadow receiveShadow>
        <meshStandardMaterial color="#1a1d22" roughness={0.4} metalness={0.25} />
      </RoundedBox>
      {/* Ekran — yeşil emissive EKG */}
      <RoundedBox args={[0.012, 0.26, 0.38]} radius={0.008} smoothness={3} position={[-0.11, 0, 0.10]}>
        <meshStandardMaterial color="#0c1418" emissive="#22c55e" emissiveIntensity={0.6} roughness={0.15} metalness={0.1} />
      </RoundedBox>
      {/* EKG dalgası — parlak yeşil çizgi (decorative) */}
      <mesh position={[-0.115, 0.03, 0.10]}>
        <boxGeometry args={[0.002, 0.006, 0.32]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
      {/* Yan kontroller — 3 buton (Y ekseni etrafında flat disc) */}
      {[-0.10, 0, 0.10].map((z, i) => (
        <mesh key={i} position={[-0.115, -0.12, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.012, 0.012, 0.005, 12]} />
          <meshStandardMaterial color="#5a5d63" roughness={0.3} metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

// =============== OVER-BED TABLE =================
function OverBedTable() {
  return (
    <group position={[0.0, 0.20, 0.55]}>
      {/* Masa üstü — açık ahşap */}
      <RoundedBox args={[0.72, 0.03, 0.42]} radius={0.012} smoothness={3} position={[0, 0.20, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#c8a878" roughness={0.55} metalness={0.05} />
      </RoundedBox>
      {/* Telescopic sütun */}
      <mesh position={[0.30, 0.0, -0.15]} castShadow>
        <cylinderGeometry args={[0.025, 0.025, 0.42, 14]} />
        <meshStandardMaterial color="#9aa0a6" roughness={0.3} metalness={0.9} />
      </mesh>
      {/* C-shaped taban */}
      <RoundedBox args={[0.55, 0.04, 0.36]} radius={0.018} smoothness={3} position={[0.30, -0.20, -0.15]} castShadow>
        <meshStandardMaterial color="#3a3d43" roughness={0.4} metalness={0.7} />
      </RoundedBox>
    </group>
  );
}

// =============== BEDSIDE CABINET =================
function BedsideCabinet() {
  return (
    <group position={[0.3, -0.05, 0.95]}>
      {/* Gövde — krem laminate */}
      <RoundedBox args={[0.45, 0.65, 0.45]} radius={0.025} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e0d0" roughness={0.6} />
      </RoundedBox>
      {/* 3 çekmece — yatay separator */}
      {[-0.20, 0.0, 0.20].map((y, i) => (
        <mesh key={i} position={[0.226, y, 0]}>
          <boxGeometry args={[0.005, 0.012, 0.42]} />
          <meshStandardMaterial color="#5a5d63" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}
      {/* Kulpla — yuvarlatılmış metal */}
      {[-0.20, 0.0, 0.20].map((y, i) => (
        <RoundedBox key={i} args={[0.018, 0.018, 0.10]} radius={0.008} smoothness={3} position={[0.232, y - 0.02, 0]} castShadow>
          <meshStandardMaterial color="#cdd0d4" roughness={0.25} metalness={0.92} />
        </RoundedBox>
      ))}
      {/* Üst yüzey — ahşap */}
      <RoundedBox args={[0.48, 0.018, 0.48]} radius={0.012} smoothness={3} position={[0, 0.335, 0]} castShadow>
        <meshStandardMaterial color="#c8a878" roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

// =============== VISITOR CHAIR =================
function VisitorChair() {
  return (
    <group position={[-1.0, -0.05, 0.75]}>
      {/* Oturak */}
      <RoundedBox args={[0.50, 0.10, 0.50]} radius={0.035} smoothness={4} position={[0, 0.22, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#7a9098" roughness={0.85} />
      </RoundedBox>
      {/* Sırt yastığı — yatağa BAKAR (+X tarafı) */}
      <RoundedBox args={[0.10, 0.55, 0.46]} radius={0.035} smoothness={4} position={[-0.20, 0.48, 0]} castShadow>
        <meshStandardMaterial color="#7a9098" roughness={0.85} />
      </RoundedBox>
      {/* 4 ayak */}
      {[
        [0.20, -0.12, 0.20],
        [0.20, -0.12, -0.20],
        [-0.20, -0.12, 0.20],
        [-0.20, -0.12, -0.20],
      ].map(([x, y, z], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <cylinderGeometry args={[0.028, 0.022, 0.44, 10]} />
          <meshStandardMaterial color="#1a1d22" roughness={0.45} metalness={0.6} />
        </mesh>
      ))}
      {/* Kolçaklar — yuvarlatılmış */}
      <RoundedBox args={[0.42, 0.06, 0.08]} radius={0.02} smoothness={3} position={[0.05, 0.42, 0.22]} castShadow>
        <meshStandardMaterial color="#8aa0a8" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.42, 0.06, 0.08]} radius={0.02} smoothness={3} position={[0.05, 0.42, -0.22]} castShadow>
        <meshStandardMaterial color="#8aa0a8" roughness={0.85} />
      </RoundedBox>
    </group>
  );
}

// =============== SOFA — uzak köşe ziyaretçi =================
function Sofa() {
  return (
    <group position={[-1.5, -0.05, 1.45]}>
      {/* Oturma yastığı */}
      <RoundedBox args={[1.35, 0.18, 0.60]} radius={0.05} smoothness={4} position={[0, 0.22, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#7a9098" roughness={0.85} />
      </RoundedBox>
      {/* Sırt — yatağa bakar */}
      <RoundedBox args={[1.35, 0.50, 0.14]} radius={0.06} smoothness={4} position={[0, 0.52, -0.23]} castShadow>
        <meshStandardMaterial color="#7a9098" roughness={0.85} />
      </RoundedBox>
      {/* Kolçaklar */}
      <RoundedBox args={[0.12, 0.34, 0.60]} radius={0.045} smoothness={4} position={[0.64, 0.36, 0]} castShadow>
        <meshStandardMaterial color="#5a7080" roughness={0.85} />
      </RoundedBox>
      <RoundedBox args={[0.12, 0.34, 0.60]} radius={0.045} smoothness={4} position={[-0.64, 0.36, 0]} castShadow>
        <meshStandardMaterial color="#5a7080" roughness={0.85} />
      </RoundedBox>
      {/* Alt baz */}
      <RoundedBox args={[1.35, 0.14, 0.60]} radius={0.04} smoothness={3} position={[0, 0.08, 0]} castShadow>
        <meshStandardMaterial color="#2a3a48" roughness={0.7} />
      </RoundedBox>
    </group>
  );
}

// =============== STORAGE CABINET — uzak köşe karşı =================
function StorageCabinet() {
  return (
    <group position={[-1.5, 0.25, -1.5]}>
      {/* Gövde */}
      <RoundedBox args={[0.45, 1.25, 0.45]} radius={0.025} smoothness={4} castShadow receiveShadow>
        <meshStandardMaterial color="#e8e0d0" roughness={0.6} />
      </RoundedBox>
      {/* 2 kapı (yan yana) */}
      <RoundedBox args={[0.012, 1.15, 0.21]} radius={0.005} smoothness={3} position={[0.231, 0, -0.11]} castShadow>
        <meshStandardMaterial color="#c8c0b0" roughness={0.5} />
      </RoundedBox>
      <RoundedBox args={[0.012, 1.15, 0.21]} radius={0.005} smoothness={3} position={[0.231, 0, 0.11]} castShadow>
        <meshStandardMaterial color="#c8c0b0" roughness={0.5} />
      </RoundedBox>
      {/* Kulplar */}
      {[-0.05, 0.05].map((z, i) => (
        <RoundedBox key={i} args={[0.018, 0.08, 0.018]} radius={0.008} smoothness={3} position={[0.238, 0.0, z]} castShadow>
          <meshStandardMaterial color="#cdd0d4" roughness={0.25} metalness={0.92} />
        </RoundedBox>
      ))}
      {/* Üst yüzey — ahşap */}
      <RoundedBox args={[0.48, 0.018, 0.48]} radius={0.012} smoothness={3} position={[0, 0.63, 0]} castShadow>
        <meshStandardMaterial color="#c8a878" roughness={0.5} />
      </RoundedBox>
    </group>
  );
}

// =============== TAVAN IŞIĞI — emissive disk =================
function CeilingLight() {
  return (
    <group position={[0, 2.40, 0]}>
      {/* Çerçeve */}
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.05, 24]} />
        <meshStandardMaterial color="#dcdfe3" roughness={0.4} metalness={0.3} />
      </mesh>
      {/* Difüzör — emissive sıcak beyaz (dengeli, mesh'i yıkmaz) */}
      <mesh position={[0, -0.03, 0]}>
        <cylinderGeometry args={[0.20, 0.20, 0.02, 24]} />
        <meshStandardMaterial color="#ffffff" emissive="#fffdf0" emissiveIntensity={0.9} roughness={0.4} />
      </mesh>
      {/* Gerçek point light — yatağa yumuşak ışık */}
      <pointLight position={[0, -0.5, 0]} intensity={0.5} distance={5} decay={1.8} color="#fff8e8" castShadow />
    </group>
  );
}

// =============== ANA HOSPITAL ROOM =================
function HospitalRoomImpl({ visible = true, debug = false }: Props) {
  if (!visible) return null;
  return (
    <group name="HospitalRoom">
      <Floor />
      <HeadWall />
      <FootWall />
      <SideWallLeft />
      <Bed />
      <IvPole />
      <VitalMonitor />
      <OverBedTable />
      <BedsideCabinet />
      <VisitorChair />
      <Sofa />
      <StorageCabinet />
      <CeilingLight />
      {debug && <axesHelper args={[1]} />}
    </group>
  );
}

export const HospitalRoom = memo(HospitalRoomImpl);
