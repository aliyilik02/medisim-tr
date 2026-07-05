// ============================================================
// propMaterials — acil odası prop'ları için PAYLAŞIMLI malzemeler
// ============================================================
// Modül-düzeyi tekil (singleton) MeshStandardMaterial'lar: tüm prop
// bileşenleri aynı örnekleri kullanır → GPU'da malzeme/shader tekrarı
// yok, draw call başına state değişimi az. useMemo'ya gerek kalmaz
// (modül bir kez yüklenir). Texture YOK — düz renk + roughness.
// Renk dili: dark clinical (ink tonları) + brand teal #0d9488 vurgu.
// ============================================================

import { DoubleSide, MeshStandardMaterial } from "three";

/** Koyu metal — cihaz gövdesi/çerçeve (VentilatorDevice ile aynı ton). */
export const MAT_METAL_DARK = new MeshStandardMaterial({
  color: "#3a3f47", metalness: 0.6, roughness: 0.5,
});

/** Açık metal — direk/ray/krom parçalar (IVPole ile aynı ton). */
export const MAT_METAL_LIGHT = new MeshStandardMaterial({
  color: "#8a939b", metalness: 0.7, roughness: 0.35,
});

/** Koyu plastik — konsol/kova/taban parçaları. */
export const MAT_PLASTIC_DARK = new MeshStandardMaterial({
  color: "#23272e", metalness: 0.3, roughness: 0.65,
});

/** Arrest arabası kırmızısı (klinik critical kırmızı). */
export const MAT_CART_RED = new MeshStandardMaterial({
  color: "#b91c1c", metalness: 0.25, roughness: 0.55,
});

/** Arrest arabası çekmece önü — gövdeden bir ton koyu (derinlik hissi). */
export const MAT_CART_RED_DARK = new MeshStandardMaterial({
  color: "#8f1616", metalness: 0.2, roughness: 0.6,
});

/** Beyaz panel/kasa — duvar gaz paneli, O2 çıkışı, malzeme kutusu. */
export const MAT_PANEL_WHITE = new MeshStandardMaterial({
  color: "#d7dce0", roughness: 0.6,
});

/** Vakum sarısı (hastane gaz kod rengi). */
export const MAT_VAC_YELLOW = new MeshStandardMaterial({
  color: "#d9a514", roughness: 0.5,
});

/** Parlayan teal ekran (defibrilatör vb.) — brand rengi. */
export const MAT_SCREEN_TEAL = new MeshStandardMaterial({
  color: "#0d9488", emissive: "#0d9488", emissiveIntensity: 0.9, roughness: 0.3,
});

/** Dolap camı — yarı saydam. */
export const MAT_GLASS = new MeshStandardMaterial({
  color: "#b8c8cc", transparent: true, opacity: 0.18, roughness: 0.12, metalness: 0.1,
});

/** Serum torbası — yarı saydam sıvı (IVPole'daki tonla aynı). */
export const MAT_FLUID_BAG = new MeshStandardMaterial({
  color: "#dbe9e0", transparent: true, opacity: 0.75, roughness: 0.3,
});

/** Damla haznesi — daha saydam cam-plastik. */
export const MAT_DRIP_GLASS = new MeshStandardMaterial({
  color: "#cfe8e4", transparent: true, opacity: 0.5, roughness: 0.2,
});

/** IV hattı/hortum. */
export const MAT_TUBE = new MeshStandardMaterial({
  color: "#cfd6da", roughness: 0.5,
});

/** Paravan kumaşı — mat, çift yüzlü (klinik yeşil-teal, brand'e yakın sakin ton). */
export const MAT_CURTAIN = new MeshStandardMaterial({
  color: "#5f8f88", roughness: 0.95, metalness: 0, side: DoubleSide,
});

/** Tabure oturağı — koyu, hafif teal alt ton. */
export const MAT_SEAT = new MeshStandardMaterial({
  color: "#2a3f3c", roughness: 0.85,
});

/** Malzeme kutusu renkleri — dolap raflarında "stok" hissi. Mor YOK. */
export const MAT_BOX_TEAL = new MeshStandardMaterial({ color: "#0d9488", roughness: 0.7 });
export const MAT_BOX_BLUE = new MeshStandardMaterial({ color: "#38637a", roughness: 0.7 });
export const MAT_BOX_AMBER = new MeshStandardMaterial({ color: "#d9a514", roughness: 0.7 });
