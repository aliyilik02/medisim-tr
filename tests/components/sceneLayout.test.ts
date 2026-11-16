import { describe, it, expect } from "vitest";
import {
  SCENE_MIN_FREE_PX,
  effectiveLeftInset,
  sceneViewShiftPx,
  leftInsetCss,
} from "@/components/patient-3d/sceneLayout";

// Oynama ekranı yerleşim kuralı: hasta + muayene çubuğu, sol bilgi sütununun
// (başucu monitörü) sağında kalan boş alana ortalanır; dar sahnede sütun payı
// küçülür ki çubuk taşmasın.
describe("sceneLayout — sol bilgi sütunu kuralı", () => {
  const INSET = 415; // başucu monitörü: 12 + 560 × 0.72

  it("geniş sahnede sütunun tamamı ayrılır", () => {
    expect(effectiveLeftInset(966, INSET)).toBe(INSET); // 1366 px ekran
    expect(effectiveLeftInset(1460, INSET)).toBe(INSET); // 1920 px ekran
  });

  it("dar sahnede pay küçülür: sağda en az SCENE_MIN_FREE_PX kalır", () => {
    const w = 880; // 1280 px ekran
    const inset = effectiveLeftInset(w, INSET);
    expect(inset).toBe(w - SCENE_MIN_FREE_PX);
    expect(w - inset).toBeGreaterThanOrEqual(SCENE_MIN_FREE_PX);
  });

  it("çok dar sahnede sıfıra iner, eksiye düşmez", () => {
    expect(effectiveLeftInset(400, INSET)).toBe(0);
    expect(effectiveLeftInset(SCENE_MIN_FREE_PX, INSET)).toBe(0);
  });

  it("geçersiz girdide kaydırma yok", () => {
    expect(effectiveLeftInset(0, INSET)).toBe(0);
    expect(effectiveLeftInset(Number.NaN, INSET)).toBe(0);
    expect(effectiveLeftInset(966, 0)).toBe(0);
    expect(effectiveLeftInset(966, -20)).toBe(0);
  });

  it("görüş kaydırması boş alanın ortasını sahne ortasına taşır", () => {
    const w = 966;
    const shift = sceneViewShiftPx(w, INSET);
    const freeCenter = (INSET + w) / 2;
    expect(Math.abs(w / 2 + shift - freeCenter)).toBeLessThanOrEqual(0.5);
    expect(sceneViewShiftPx(w, 0)).toBe(0);
  });

  it("CSS karşılığı aynı sınırları taşır", () => {
    expect(leftInsetCss(INSET)).toBe(
      `clamp(0px, calc(100% - ${SCENE_MIN_FREE_PX}px), ${INSET}px)`,
    );
  });
});
