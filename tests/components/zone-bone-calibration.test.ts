// ============================================================
// measureZoneFromBones — kemik bind kalibrasyonu testleri
// ============================================================
// İki-nokta doğrusal harita: omuz (canon 0.83) + uyluk ortası (canon 0.375).
// Sahte iskelet: bilinen bind Y'ler → beklenen yMin/height kapalı-form.
// ============================================================

import { describe, expect, test } from "vitest";
import { Matrix4 } from "three";
import type { SkinnedMesh } from "three";
import { measureZoneFromBones } from "@/components/patient-3d/AnimatedPatientModel";

/** name→bind-Y çiftlerinden sahte SkinnedMesh (skeleton alanı yeterli). */
function fakeMesh(bindYs: Record<string, number>): SkinnedMesh {
  const names = Object.keys(bindYs);
  const bones = names.map((name) => ({ name }));
  const boneInverses = names.map((name) =>
    // boneInverse = bind matrisinin tersi → ters çevrilince translation geri gelir
    new Matrix4().makeTranslation(0, bindYs[name], 0).invert(),
  );
  return { skeleton: { bones, boneInverses } } as unknown as SkinnedMesh;
}

const FULL = {
  mixamorigLeftArm: 1.2,
  mixamorigRightArm: 1.2,
  mixamorigLeftUpLeg: 0.2,
  mixamorigRightUpLeg: 0.2,
  mixamorigLeftLeg: -0.6,
  mixamorigRightLeg: -0.6,
};

describe("measureZoneFromBones", () => {
  test("iki-nokta haritası: omuz→0.83, uyluk ortası→0.375", () => {
    const z = measureZoneFromBones(fakeMesh(FULL));
    expect(z).not.toBeNull();
    // midThigh = (0.2 + -0.6)/2 = -0.2; H = (1.2 - (-0.2)) / (0.83-0.375)
    const H = 1.4 / 0.455;
    expect(z!.height).toBeCloseTo(H, 5);
    expect(z!.yMin).toBeCloseTo(1.2 - 0.83 * H, 5);
    // doğrulama: haritada omuz ve uyluk ortası canon oranlara düşer
    expect((1.2 - z!.yMin) / z!.height).toBeCloseTo(0.83, 5);
    expect((-0.2 - z!.yMin) / z!.height).toBeCloseTo(0.375, 5);
  });

  test("tek taraf kemik yeterli (sol yok → sağdan ölçer)", () => {
    const { mixamorigLeftArm: _a, mixamorigLeftUpLeg: _b, mixamorigLeftLeg: _c, ...right } = FULL;
    const z = measureZoneFromBones(fakeMesh(right));
    expect(z).not.toBeNull();
    expect(z!.height).toBeCloseTo(1.4 / 0.455, 5);
  });

  test("gerekli kemik eksikse null (bbox fallback'e düşülür)", () => {
    expect(measureZoneFromBones(fakeMesh({ mixamorigLeftArm: 1.2 }))).toBeNull();
    expect(measureZoneFromBones({ skeleton: { bones: [], boneInverses: [] } } as unknown as SkinnedMesh)).toBeNull();
  });

  test("dejenere iskelet (omuz ≤ uyluk) null", () => {
    const z = measureZoneFromBones(
      fakeMesh({ ...FULL, mixamorigLeftArm: -0.5, mixamorigRightArm: -0.5 }),
    );
    expect(z).toBeNull();
  });
});
