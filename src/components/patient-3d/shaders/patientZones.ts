/**
 * MediSim TR — Anatomik bölge (zonal) ağırlık fonksiyonları
 *
 * Cilt shader'ındaki bölgesel siyanoz/beneklenme ve hasta önlüğü maskesi için
 * SAF TypeScript ayna fonksiyonları. GLSL'deki formüllerle BİREBİR aynıdır:
 * patientShader.ts sabitleri bu dosyadan interpolasyonla alır, formüller
 * satır satır eşlenir. Böylece GLSL derlenebilirliği test edilemese de
 * bölge matematiği vitest ile doğrulanır.
 *
 * Koordinat sistemi: canonical ayakta-poz world (pre-skinning).
 * Tüm hasta varyantları wrapper scale/yOffset ile AYNI kutuya oturur
 * (patientModels.ts): ayak y=-0.243, baş tepesi y=0.778, boy 1.021.
 * Anterior (yüz/göğüs önü) = +z. Kaynak: docs/memory/medisim_anatomik_landmark.md
 * (8-head canon, formula: world_y = -0.243 + ratio × 1.021).
 *
 * React import YOK — saf fonksiyonel modül.
 */

// ── Canonical vücut kutusu (landmark dokümanından) ──
export const CANON_Y_MIN = -0.243;
export const CANON_HEIGHT = 1.021;

/** World Y → 0-1 boy oranı (0 = topuk, 1 = kafa tepesi). */
export function normalizedY(worldY: number): number {
  return (worldY - CANON_Y_MIN) / CANON_HEIGHT;
}

/** GLSL smoothstep birebir karşılığı. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1);
  return t * t * (3 - 2 * t);
}

// ── Bölge eşikleri (8-head canon y-oranları + yaklaşık uzuv x-mesafeleri) ──
// yNorm referansları: mouth 0.89, chin 0.875, suprasternal notch 0.85,
// wrist ≈ 0.55, mid-thigh 0.375, knee 0.25, mid-calf 0.125, heel 0.
export const ZONE = {
  // Perioral (ağız çevresi) — mouth ratio 0.89 merkezli dar bant, midline'a
  // yakın (|x| küçük) ve yüzün ÖN tarafı (z > 0).
  perioralY: 0.89,
  perioralYIn: 0.012,
  perioralYOut: 0.045,
  perioralXIn: 0.035,
  perioralXOut: 0.075,
  perioralZIn: 0.01,
  perioralZOut: 0.05,

  // El (akral) — kollar yanda; bilek ratio ≈ 0.55, el bandı 0.40-0.66,
  // gövdeden uzak (|x| > ~0.16, IV tablosu el üstü ±0.24 / radial ±0.22).
  handXIn: 0.16,
  handXOut: 0.2,
  handYLo0: 0.4,
  handYLo1: 0.46,
  handYHi0: 0.58,
  handYHi1: 0.66,

  // Ayak (akral) — mid-calf 0.125 altında tam, ayak bileğine doğru artar.
  footYIn: 0.06,
  footYOut: 0.13,

  // Siyanoz zonal taban: gövdede de hafif görünür (santral siyanoz),
  // perioral + akral bölgeler tavana çıkar.
  cyanBase: 0.3,

  // Mottling (livedo) — ekstremite baskın, gövdede az, yüzde yok.
  mottleBase: 0.2,
  legY0: 0.44,
  legY1: 0.56,
  armXIn: 0.14,
  armXOut: 0.19,
  armYHi0: 0.8,
  armYHi1: 0.86,
  faceGate0: 0.84,
  faceGate1: 0.88,

  // Hasta önlüğü — gövde + kalça + uyluk üstü. Etek ucu mid-thigh (0.375)
  // hizası; yaka arkada 0.82, önde 0.05 daha aşağı (ön yaka oyuğu);
  // yanal sınır |x| ≈ 0.13 (kollar cilt kalır, kolsuz önlük görünümü).
  gownHem0: 0.34,
  gownHem1: 0.38,
  gownNeckBack: 0.82,
  gownNeckDrop: 0.05,
  gownNeckFeather: 0.03,
  gownZ0: 0.0,
  gownZ1: 0.05,
  gownX0: 0.115,
  gownX1: 0.15,

  // Önlük kumaş detayları (dikiş çizgileri)
  gownHemSeamY: 0.39,
  gownSideSeamX: 0.1,
} as const;

// ── Önlük varsayılan rengi: #6fa8a0 — hastane teali. Brand teal
// (#0d9488) değil; bilinçli olarak DAHA soluk/açık, marka renginden ayrışır.
export const GOWN_DEFAULT_COLOR: readonly [number, number, number] = [
  0.4353, 0.6588, 0.6275,
];

/**
 * Perioral (ağız çevresi) bölge ağırlığı 0-1.
 * @param xAbs |canonical world x| (midline'dan uzaklık)
 * @param yNorm 0-1 boy oranı
 * @param zFront canonical world z (anterior +)
 */
export function perioralWeight(xAbs: number, yNorm: number, zFront: number): number {
  const bandY = 1 - smoothstep(ZONE.perioralYIn, ZONE.perioralYOut, Math.abs(yNorm - ZONE.perioralY));
  const central = 1 - smoothstep(ZONE.perioralXIn, ZONE.perioralXOut, xAbs);
  const front = smoothstep(ZONE.perioralZIn, ZONE.perioralZOut, zFront);
  return bandY * central * front;
}

/** El bölgesi ağırlığı 0-1 (kollar yanda varsayımı — bind pose). */
export function handWeight(xAbs: number, yNorm: number): number {
  return (
    smoothstep(ZONE.handXIn, ZONE.handXOut, xAbs) *
    smoothstep(ZONE.handYLo0, ZONE.handYLo1, yNorm) *
    (1 - smoothstep(ZONE.handYHi0, ZONE.handYHi1, yNorm))
  );
}

/** Ayak bölgesi ağırlığı 0-1. */
export function footWeight(yNorm: number): number {
  return 1 - smoothstep(ZONE.footYIn, ZONE.footYOut, yNorm);
}

/** Akral (el + ayak) birleşik ağırlık 0-1. */
export function acralWeight(xAbs: number, yNorm: number): number {
  return Math.max(handWeight(xAbs, yNorm), footWeight(yNorm));
}

/**
 * Siyanoz zonal çarpanı 0.3-1: gövdede taban (santral bileşen),
 * perioral + akral bölgelerde 1'e çıkar. Efektif siyanoz = uCyanosis × bu.
 */
export function cyanosisZoneWeight(xAbs: number, yNorm: number, zFront: number): number {
  return (
    ZONE.cyanBase +
    (1 - ZONE.cyanBase) * Math.max(perioralWeight(xAbs, yNorm, zFront), acralWeight(xAbs, yNorm))
  );
}

/**
 * Mottling (livedo) zonal çarpanı 0-1: bacak/kol ekstremitelerinde belirgin,
 * gövdede taban (0.2), yüzde sıfıra iner (livedo yüzü tutmaz).
 */
export function mottleZoneWeight(xAbs: number, yNorm: number): number {
  const leg = 1 - smoothstep(ZONE.legY0, ZONE.legY1, yNorm);
  const arm =
    smoothstep(ZONE.armXIn, ZONE.armXOut, xAbs) *
    (1 - smoothstep(ZONE.armYHi0, ZONE.armYHi1, yNorm));
  const faceGate = 1 - smoothstep(ZONE.faceGate0, ZONE.faceGate1, yNorm);
  return (ZONE.mottleBase + (1 - ZONE.mottleBase) * Math.max(leg, arm)) * faceGate;
}

/**
 * Hasta önlüğü maskesi 0-1 (shader bölge maskesi — giysi mesh'i DEĞİL).
 * Kapsam: gövde + kalça + uyluk üstü; etek ucu mid-thigh hizası, yaka önde
 * daha aşağıda (ön yaka oyuğu), kollar/boyun/baş/bacak-altı cilt kalır.
 */
export function gownMask(xAbs: number, yNorm: number, zFront: number): number {
  const hem = smoothstep(ZONE.gownHem0, ZONE.gownHem1, yNorm);
  const front = smoothstep(ZONE.gownZ0, ZONE.gownZ1, zFront);
  const neckTop = ZONE.gownNeckBack - ZONE.gownNeckDrop * front;
  const top = 1 - smoothstep(neckTop, neckTop + ZONE.gownNeckFeather, yNorm);
  const lateral = 1 - smoothstep(ZONE.gownX0, ZONE.gownX1, xAbs);
  return hem * top * lateral;
}

/** Tüm bölge ağırlıklarını tek çağrıda döner (test/debug kolaylığı). */
export function zoneWeights(xAbs: number, yNorm: number, zFront: number) {
  return {
    perioral: perioralWeight(xAbs, yNorm, zFront),
    hand: handWeight(xAbs, yNorm),
    foot: footWeight(yNorm),
    acral: acralWeight(xAbs, yNorm),
    cyanosis: cyanosisZoneWeight(xAbs, yNorm, zFront),
    mottle: mottleZoneWeight(xAbs, yNorm),
    gown: gownMask(xAbs, yNorm, zFront),
  };
}

/**
 * Önlük uniform'ları için hazır fabrika — entegrasyon noktasında
 * (AnatomicPatientModel onBeforeCompile) shader.uniforms'a spread edilir:
 *   Object.assign(shader.uniforms, createGownUniforms());
 * Uniform'lar HİÇ set edilmezse GLSL varsayılanı 0 → önlük kapalı
 * (geriye uyumlu: mevcut çağrılar/görünüm değişmez).
 */
export function createGownUniforms(
  enabled = true,
  color: readonly [number, number, number] = GOWN_DEFAULT_COLOR,
): { uGownEnable: { value: number }; uGownColor: { value: number[] } } {
  return {
    uGownEnable: { value: enabled ? 1 : 0 },
    uGownColor: { value: [color[0], color[1], color[2]] },
  };
}
