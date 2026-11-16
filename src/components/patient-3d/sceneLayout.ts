// ============================================================
// Sahne yerleşim kuralı — sol bilgi sütunu + ortalanmış boş alan
// ============================================================
// Oynama ekranında sahnenin sol-üst köşesini başucu monitörü kapatır (altında
// bulgu kartı açılır). Hasta kadrajın tam ortasında durursa sağ kolu ve sola
// açılan muayene etiketleri monitörün ALTINDA kalıyordu (1366 px ölçümü).
// Kural: hasta ve muayene çubuğu, bu sütunun sağında kalan boş alanın
// ortasına hizalanır. Sahne daralınca sütun payı küçülür — sağda her zaman
// en az SCENE_MIN_FREE_PX yer kalır (muayene çubuğu taşmaz).
//
// Aynı kural iki yerde kullanılır: 3B görüş kaydırması (px, JS) ve DOM
// katmanlarının `left` değeri (CSS). İkisi buradan türetilir → ayrışmaz.
// ============================================================

/** Sütunun sağında korunacak en dar boş alan (muayene çubuğu ≈ 476 px + pay). */
export const SCENE_MIN_FREE_PX = 520;

/** Sol sütuna fiilen ayrılan genişlik (px). Dar sahnede küçülür, 0'ın altına inmez. */
export function effectiveLeftInset(sceneWidthPx: number, leftInsetPx: number): number {
  if (!(sceneWidthPx > 0) || !(leftInsetPx > 0)) return 0;
  return Math.max(0, Math.min(leftInsetPx, sceneWidthPx - SCENE_MIN_FREE_PX));
}

/** Görüşün sağa kaydırılacağı miktar (px): boş alanın ortası − sahnenin ortası. */
export function sceneViewShiftPx(sceneWidthPx: number, leftInsetPx: number): number {
  return Math.round(effectiveLeftInset(sceneWidthPx, leftInsetPx) / 2);
}

/** Aynı kuralın CSS karşılığı — sahne kabı içindeki katmanın `left` değeri. */
export function leftInsetCss(leftInsetPx: number): string {
  return `clamp(0px, calc(100% - ${SCENE_MIN_FREE_PX}px), ${leftInsetPx}px)`;
}
