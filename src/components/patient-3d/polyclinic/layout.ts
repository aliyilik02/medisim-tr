// ============================================================
// Poliklinik muayene odası — yerleşim sabitleri (SAF, three'siz)
// ============================================================
// İKİ koordinat çerçevesi var; karıştırma:
//
// 1) DÜNYA (metre, zemin y=0) — sahnenin çizildiği çerçeve. Hasta yığını
//    (model, kemik-bağlı ekipman, muayene çapaları) eski "hasta birimi"nde
//    kalibre: 1 birim ≈ 1.5625 m, zemin y=-0.27. `patient-space` grubu bu
//    birimi metreye taşır (PS / PS_Y). ÖLÇÜLDÜ (scripts/scene-shot.mjs,
//    16 Kas 2026): hasta sırtüstü, BAŞ +Z, AYAK −Z, hastanın SAĞI +X.
//    Baş kemiği z≈+0.61, tepe z≈+0.77, parmak ucu z≈−0.89, kalça x≈−0.02.
//
// 2) ODA-YEREL (metre) — odanın tasarlandığı çerçeve: baş ucu duvarı −Z
//    ("kuzey"), kapı +Z ("güney"), pencere +X ("doğu", hastanın SOLU),
//    hekim masası −X ("batı", hastanın SAĞI = muayene eden taraf).
//    Dünya = oda-yerel × 180° (Y ekseni) + ROOM_ORIGIN → `roomToWorld`.
//    (Eski sahnede oda hastaya TERS kurulmuştu: yastık ayak ucundaydı.)
// ============================================================

export type V3 = [number, number, number];

/** Hasta birimi → metre çarpanı. */
export const PS = 1 / 0.64;
/** Hasta biriminde zemin derinliği (eski sahne zemini y=-0.27). */
export const PS_FLOOR = 0.27;
/** `patient-space` grubunun metre cinsinden y konumu. */
export const PS_Y = PS_FLOOR * PS;

/** Hasta birimindeki bir noktayı metre dünyasına çevirir. */
export function toMetric(p: V3): V3 {
  return [p[0] * PS, p[1] * PS + PS_Y, p[2] * PS];
}

/** Metre dünyasındaki bir noktayı hasta birimine çevirir. */
export function toPatientSpace(p: V3): V3 {
  return [p[0] / PS, (p[1] - PS_Y) / PS, p[2] / PS];
}

/** Oda iç ölçüleri (oda-yerel, m): 4.45 × 4.20, tavan 2.70 → 18.7 m².
 *  (ASM asgari 10 m², muayenehane asgari 16 m² — Aile Hekimliği Uyg. Yön. md.23.) */
export const ROOM = { xW: -3.0, xE: 1.45, zN: -1.1, zS: 3.1, h: 2.7 } as const;

/** Muayene sedyesi (oda-yerel). Şilte üstü, hasta sırtının kalibre edildiği
 *  düzlem (hasta birimi y=0.179) ile AYNI yükseklikte olmak zorunda. */
export const COUCH = {
  x: 0,
  z: 0.156,
  w: 0.74,
  l: 1.96,
  top: (0.179 + PS_FLOOR) * PS,
} as const;

/** Sedye merkezinin DÜNYA konumu — hastanın ölçülen kutusuna göre:
 *  baş üstünde ~19 cm, ayak ucunda ~11 cm pay; gövde ekseni x≈−0.04. */
const COUCH_WORLD = { x: -0.04, z: -0.02 } as const;

/** Oda-yerel orijinin dünya konumu (180° dönüşten sonra). */
export const ROOM_ORIGIN = { x: COUCH_WORLD.x + COUCH.x, z: COUCH_WORLD.z + COUCH.z } as const;

/** Oda-yerel → dünya (180° Y dönüşü + öteleme). Kendi tersidir. */
export function roomToWorld(p: V3): V3 {
  return [ROOM_ORIGIN.x - p[0], p[1], ROOM_ORIGIN.z - p[2]];
}
export const worldToRoom = roomToWorld;

/** Yastık merkezi — sedye merkezine göre z (baş kemiğinin altına denk gelir). */
export const PILLOW_DZ = -0.685;

/** Serum askısı (oda-yerel zemin noktası) — hastanın SAĞ omuz hizası;
 *  kanül sağ ön kolda. Askı kolu sedyeye doğru 20 cm uzanır. */
export const IV_POLE: V3 = [-0.76, 0, -0.384];
export const IV_HOOK_Y = 1.83;
/** Serum seti askı noktası (dünya) + hasta birimi karşılığı. */
export const IV_BAG_WORLD: V3 = roomToWorld([IV_POLE[0] + 0.2, IV_HOOK_Y - 0.03, IV_POLE[2]]);
export const IV_BAG_PS: V3 = toPatientSpace(IV_BAG_WORLD);
/** Serum hattının çıkış ucu — damla haznesinin altı (set origin'inden 0.27 hasta birimi aşağı). */
export const IV_TUBE_SOURCE: V3 = [IV_BAG_WORLD[0], IV_BAG_WORLD[1] - 0.27 * PS, IV_BAG_WORLD[2]];

/** Taşınabilir oksijen tüpü (oda-yerel zemin noktası) — baş ucu, hastanın solu. */
export const O2_CYLINDER: V3 = [0.71, 0, -0.814];
/** O₂ hortum çıkışı (dünya) — nemlendirici şişenin altı. */
export const O2_TUBE_SOURCE: V3 = roomToWorld([O2_CYLINDER[0] + 0.1, 0.76, O2_CYLINDER[2] + 0.02]);

/** Tekerlekli hasta monitörü (dünya zemin noktası) — hastanın sol omuz hizası. */
export const MONITOR_STAND: V3 = roomToWorld([0.95, 0, -0.42]);
/** Sedye merkezi (dünya) — monitörün döneceği hedef. */
export const COUCH_CENTER_WORLD: V3 = roomToWorld([COUCH.x, COUCH.top, COUCH.z]);

/** Pencere (D duvarı, oda-yerel): z aralığı + yükseklik aralığı. */
export const WINDOW = { z0: -0.35, z1: 1.35, y0: 0.95, y1: 2.25 } as const;
/** Kapı (G duvarı, oda-yerel): x aralığı + yükseklik. */
export const DOOR = { x0: -2.25, x1: -1.35, h: 2.1 } as const;

/** Tavan LED panelleri (60×60) — oda-yerel x,z merkezleri. */
export const LED_PANELS: [number, number][] = [
  [0.35, 0.1],
  [0.35, 1.9],
  [-1.9, 0.1],
  [-1.9, 1.9],
];
