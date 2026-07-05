// ============================================================
// RoomFixtures — oda tamamlama sabit demirbaşları (prosedürel)
// ============================================================
// Hat B "hasta odasını tamamlama": tavan aydınlatma paneli, duvar saati,
// lavabo ünitesi, oda kapısı, kesici-delici atık kutusu (sarı — Tıbbi
// Atıkların Kontrolü Yön.), eldiven kutusu dispanseri. Hepsi düz-renk
// paylaşımlı materyal (propMaterials), texture yok, düşük draw call.
// Origin deseni: zemin propları y=0 sahne hizası (zemin -0.27), duvar
// propları verilen y merkez.
// ============================================================

import {
  MAT_METAL_DARK,
  MAT_METAL_LIGHT,
  MAT_PLASTIC_DARK,
  MAT_PANEL_WHITE,
  MAT_VAC_YELLOW,
  MAT_LIGHT_PANEL,
  MAT_CERAMIC,
  MAT_DOOR,
  MAT_CLOCK_FACE,
  MAT_BOX_TEAL,
  MAT_BOX_BLUE,
  MAT_BOX_AMBER,
} from "./propMaterials";

interface Props {
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: number;
}

/** Gömme tavan aydınlatma paneli — emissive; sahne ışığını taklit eder,
    gerçek ışık kaynağı EKLEMEZ (mevcut directional/ambient dengesi bozulmaz). */
export function CeilingLightPanel({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* çerçeve */}
      <mesh material={MAT_METAL_LIGHT}>
        <boxGeometry args={[0.86, 0.02, 0.56]} />
      </mesh>
      {/* yayıcı panel — çerçevenin 4mm altında */}
      <mesh position={[0, -0.012, 0]} material={MAT_LIGHT_PANEL}>
        <boxGeometry args={[0.78, 0.008, 0.48]} />
      </mesh>
    </group>
  );
}

/** Duvar saati — kadran + akrep/yelkovan (statik 10:10; canlı saat gereksiz maliyet). */
export function WallClock({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh material={MAT_METAL_DARK}>
        <cylinderGeometry args={[0.085, 0.085, 0.02, 24]} />
      </mesh>
      <mesh position={[0, 0.011, 0]} material={MAT_CLOCK_FACE}>
        <cylinderGeometry args={[0.075, 0.075, 0.004, 24]} />
      </mesh>
      {/* akrep (10 yönü) + yelkovan (2 yönü) — kadran üstü ince kutular */}
      <mesh position={[-0.018, 0.016, -0.012]} rotation={[0, Math.PI / 3, 0]} material={MAT_METAL_DARK}>
        <boxGeometry args={[0.04, 0.003, 0.006]} />
      </mesh>
      <mesh position={[0.014, 0.016, -0.02]} rotation={[0, -Math.PI / 5, 0]} material={MAT_METAL_DARK}>
        <boxGeometry args={[0.055, 0.003, 0.005]} />
      </mesh>
    </group>
  );
}

/** Lavabo ünitesi — alt dolap + seramik çanak + musluk (el hijyeni istasyonu). */
export function SinkUnit({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* alt dolap (zemin -0.27'den tezgaha) */}
      <mesh position={[0, -0.045, 0]} material={MAT_PANEL_WHITE} castShadow>
        <boxGeometry args={[0.5, 0.45, 0.34]} />
      </mesh>
      {/* tezgah */}
      <mesh position={[0, 0.19, 0]} material={MAT_PLASTIC_DARK}>
        <boxGeometry args={[0.54, 0.025, 0.38]} />
      </mesh>
      {/* seramik çanak — tezgaha gömük görünüm */}
      <mesh position={[0, 0.215, 0.02]} material={MAT_CERAMIC}>
        <cylinderGeometry args={[0.12, 0.09, 0.05, 18]} />
      </mesh>
      {/* musluk: dikey gövde + öne kıvrık ağız */}
      <mesh position={[0, 0.28, -0.12]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.012, 0.012, 0.13, 10]} />
      </mesh>
      <mesh position={[0, 0.34, -0.06]} rotation={[Math.PI / 2, 0, 0]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.01, 0.01, 0.13, 10]} />
      </mesh>
    </group>
  );
}

/** Oda kapısı — kasa + kanat + kol + küçük pencere (kapalı; dekoratif). */
export function RoomDoor({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* kasa */}
      <mesh position={[0, 0.42, 0]} material={MAT_METAL_DARK}>
        <boxGeometry args={[0.58, 1.38, 0.035]} />
      </mesh>
      {/* kanat — kasadan hafif içeride */}
      <mesh position={[0, 0.41, 0.012]} material={MAT_DOOR}>
        <boxGeometry args={[0.5, 1.3, 0.03]} />
      </mesh>
      {/* pencere (buzlu) */}
      <mesh position={[0, 0.78, 0.03]} material={MAT_CLOCK_FACE}>
        <boxGeometry args={[0.2, 0.26, 0.006]} />
      </mesh>
      {/* kol */}
      <mesh position={[0.19, 0.36, 0.042]} rotation={[0, 0, Math.PI / 2]} material={MAT_METAL_LIGHT}>
        <cylinderGeometry args={[0.009, 0.009, 0.11, 8]} />
      </mesh>
    </group>
  );
}

/** Kesici-delici atık kutusu — SARI (TR tıbbi atık kodu), duvara monte. */
export function SharpsContainer({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh material={MAT_VAC_YELLOW} castShadow>
        <boxGeometry args={[0.13, 0.16, 0.11]} />
      </mesh>
      {/* kapak + atık ağzı */}
      <mesh position={[0, 0.088, 0]} material={MAT_PLASTIC_DARK}>
        <boxGeometry args={[0.135, 0.02, 0.115]} />
      </mesh>
      <mesh position={[0, 0.1, 0.02]} rotation={[0.5, 0, 0]} material={MAT_PLASTIC_DARK}>
        <boxGeometry args={[0.07, 0.015, 0.05]} />
      </mesh>
    </group>
  );
}

/** Eldiven kutusu dispanseri — duvara 3'lü S/M/L (teal/mavi/amber). */
export function GloveDispenser({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }: Props) {
  const boxes = [
    { mat: MAT_BOX_TEAL, y: 0.13 },
    { mat: MAT_BOX_BLUE, y: 0 },
    { mat: MAT_BOX_AMBER, y: -0.13 },
  ];
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {/* taşıyıcı ray */}
      <mesh position={[0, 0, -0.02]} material={MAT_METAL_LIGHT}>
        <boxGeometry args={[0.16, 0.42, 0.01]} />
      </mesh>
      {boxes.map((b, i) => (
        <group key={i} position={[0, b.y, 0]}>
          <mesh material={b.mat}>
            <boxGeometry args={[0.14, 0.075, 0.065]} />
          </mesh>
          {/* çekme ağzı — önde beyaz oval yarık hissi */}
          <mesh position={[0, 0, 0.034]} material={MAT_CLOCK_FACE}>
            <boxGeometry args={[0.06, 0.02, 0.004]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
