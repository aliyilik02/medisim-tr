import { describe, expect, test } from "vitest";
import {
  CANON_Y_MIN,
  CANON_HEIGHT,
  ZONE,
  GOWN_DEFAULT_COLOR,
  normalizedY,
  smoothstep,
  perioralWeight,
  handWeight,
  footWeight,
  acralWeight,
  cyanosisZoneWeight,
  mottleZoneWeight,
  gownMask,
  zoneWeights,
  createGownUniforms,
} from "@/components/patient-3d/shaders/patientZones";
import {
  patientFragmentCommon,
  patientFragmentColor,
} from "@/components/patient-3d/shaders/patientShader";

// Landmark referans noktaları (docs/memory/medisim_anatomik_landmark.md —
// yNorm = 8-head canon ratio; x/z canonical world).
const P = {
  mouth: { xA: 0.0, yN: 0.89, zF: 0.06 },
  eyes: { xA: 0.03, yN: 0.93, zF: 0.06 },
  chest: { xA: 0.0, yN: 0.75, zF: 0.085 }, // nipple / 4. ICS
  umbilicus: { xA: 0.0, yN: 0.625, zF: 0.07 },
  handDorsum: { xA: 0.22, yN: 0.53, zF: 0.0 }, // el üstü, kollar yanda
  shoulder: { xA: 0.14, yN: 0.83, zF: 0.0 },
  midThigh: { xA: 0.06, yN: 0.375, zF: 0.03 },
  knee: { xA: 0.05, yN: 0.25, zF: 0.03 },
  foot: { xA: 0.04, yN: 0.02, zF: 0.05 },
  napeBack: { xA: 0.0, yN: 0.89, zF: -0.06 }, // ense (arka) — perioral OLMAMALI
};

describe("patientZones — temel yardımcılar", () => {
  test("smoothstep GLSL semantiği: kenarlar + monotonluk", () => {
    expect(smoothstep(0, 1, -0.5)).toBe(0);
    expect(smoothstep(0, 1, 1.5)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBeCloseTo(0.5, 5);
    expect(smoothstep(0.2, 0.8, 0.3)).toBeGreaterThan(0);
    expect(smoothstep(0.2, 0.8, 0.3)).toBeLessThan(smoothstep(0.2, 0.8, 0.6));
  });

  test("normalizedY canonical kutuyla eşleşir (topuk=0, tepe=1, ağız=0.89)", () => {
    expect(normalizedY(-0.243)).toBeCloseTo(0, 5);
    expect(normalizedY(-0.243 + 1.021)).toBeCloseTo(1, 5);
    // Landmark tablosu: mouth world y = 0.666 → ratio 0.89
    expect(normalizedY(0.666)).toBeCloseTo(0.89, 2);
    expect(CANON_Y_MIN).toBe(-0.243);
    expect(CANON_HEIGHT).toBe(1.021);
  });
});

describe("patientZones — perioral / akral siyanoz bölgeleri", () => {
  test("perioral ağız çevresinde güçlü, göğüste/enseda sıfır", () => {
    expect(perioralWeight(P.mouth.xA, P.mouth.yN, P.mouth.zF)).toBeGreaterThan(0.9);
    expect(perioralWeight(P.chest.xA, P.chest.yN, P.chest.zF)).toBe(0);
    // Ense: aynı y-bandı ama z arkada → ön-yüz kapısı sıfırlar
    expect(perioralWeight(P.napeBack.xA, P.napeBack.yN, P.napeBack.zF)).toBe(0);
    // Gözler perioral bandın dışında (zayıf)
    expect(perioralWeight(P.eyes.xA, P.eyes.yN, P.eyes.zF)).toBeLessThan(0.3);
  });

  test("akral: el üstü + ayak yüksek, gövde/omuz sıfır", () => {
    expect(handWeight(P.handDorsum.xA, P.handDorsum.yN)).toBeGreaterThan(0.9);
    expect(footWeight(P.foot.yN)).toBe(1);
    expect(acralWeight(P.chest.xA, P.chest.yN)).toBe(0);
    expect(acralWeight(P.shoulder.xA, P.shoulder.yN)).toBe(0);
    // Diz akral değil
    expect(acralWeight(P.knee.xA, P.knee.yN)).toBe(0);
  });

  test("siyanoz zonal çarpanı: perioral/akral ≈ 1 >> gövde tabanı", () => {
    const mouth = cyanosisZoneWeight(P.mouth.xA, P.mouth.yN, P.mouth.zF);
    const hand = cyanosisZoneWeight(P.handDorsum.xA, P.handDorsum.yN, P.handDorsum.zF);
    const foot = cyanosisZoneWeight(P.foot.xA, P.foot.yN, P.foot.zF);
    const chest = cyanosisZoneWeight(P.chest.xA, P.chest.yN, P.chest.zF);
    expect(mouth).toBeGreaterThan(0.9);
    expect(hand).toBeGreaterThan(0.9);
    expect(foot).toBeGreaterThan(0.9);
    // Gövdede santral taban korunur ama belirgin düşük
    expect(chest).toBeCloseTo(ZONE.cyanBase, 5);
    expect(mouth).toBeGreaterThan(chest * 2);
  });
});

describe("patientZones — mottling (livedo) bölgeleri", () => {
  test("ekstremitede belirgin, gövdede taban, yüzde sıfır", () => {
    const thigh = mottleZoneWeight(P.midThigh.xA, P.midThigh.yN);
    const arm = mottleZoneWeight(P.handDorsum.xA, P.handDorsum.yN);
    const trunk = mottleZoneWeight(P.umbilicus.xA, P.umbilicus.yN);
    const face = mottleZoneWeight(P.mouth.xA, P.mouth.yN);
    expect(thigh).toBeGreaterThan(0.95);
    expect(arm).toBeGreaterThan(0.95);
    expect(trunk).toBeCloseTo(ZONE.mottleBase, 5);
    expect(face).toBe(0);
    expect(thigh).toBeGreaterThan(trunk * 3);
  });
});

describe("patientZones — hasta önlüğü maskesi", () => {
  test("gövde+kalça örtülü; boyun/kol/bacak-altı/yüz cilt kalır", () => {
    // Göğüs ve göbek tam örtülü
    expect(gownMask(P.chest.xA, P.chest.yN, P.chest.zF)).toBeGreaterThan(0.95);
    expect(gownMask(P.umbilicus.xA, P.umbilicus.yN, P.umbilicus.zF)).toBeGreaterThan(0.95);
    // Diz ve ayak açık (etek ucu mid-thigh hizası)
    expect(gownMask(P.knee.xA, P.knee.yN, P.knee.zF)).toBe(0);
    expect(gownMask(P.foot.xA, P.foot.yN, P.foot.zF)).toBe(0);
    // Eller/kollar açık (yanal sınır)
    expect(gownMask(P.handDorsum.xA, P.handDorsum.yN, P.handDorsum.zF)).toBe(0);
    // Yüz açık
    expect(gownMask(P.mouth.xA, P.mouth.yN, P.mouth.zF)).toBe(0);
  });

  test("ön yaka oyuğu: önde yaka daha aşağıda, sırtta daha yukarıda", () => {
    const yUpperChest = 0.8; // manubrium civarı
    const front = gownMask(0.0, yUpperChest, 0.06);
    const back = gownMask(0.0, yUpperChest, -0.06);
    expect(back).toBeGreaterThan(0.9); // sırtta hâlâ örtülü
    expect(front).toBeLessThan(0.1); // önde yaka oyuğu — cilt görünür
  });

  test("etek ucu geçişi yumuşak (hem feather)", () => {
    const above = gownMask(0.0, ZONE.gownHem1 + 0.02, 0.05);
    const mid = gownMask(0.0, (ZONE.gownHem0 + ZONE.gownHem1) / 2, 0.05);
    const below = gownMask(0.0, ZONE.gownHem0 - 0.02, 0.05);
    expect(above).toBeGreaterThan(0.9);
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(1);
    expect(below).toBe(0);
  });
});

describe("patientZones — sınırlar ve varsayılanlar", () => {
  test("tüm ağırlıklar her örnek noktada [0,1] aralığında", () => {
    for (const p of Object.values(P)) {
      const w = zoneWeights(p.xA, p.yN, p.zF);
      for (const v of Object.values(w)) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });

  test("createGownUniforms: varsayılan açık + #6fa8a0; kapalı varyantı 0", () => {
    const u = createGownUniforms();
    expect(u.uGownEnable.value).toBe(1);
    expect(u.uGownColor.value).toEqual([...GOWN_DEFAULT_COLOR]);
    expect(createGownUniforms(false).uGownEnable.value).toBe(0);
    // Önlük rengi brand teal #0d9488'den (0.05,0.58,0.53) belirgin daha soluk/açık
    expect(GOWN_DEFAULT_COLOR[0]).toBeGreaterThan(0.3);
  });
});

describe("patientShader — GLSL zonal parite ve geriye uyumluluk", () => {
  test("fragment common yeni uniform'ları + bölge fonksiyonlarını içerir", () => {
    expect(patientFragmentCommon).toContain("uniform float uGownEnable;");
    expect(patientFragmentCommon).toContain("uniform vec3 uGownColor;");
    expect(patientFragmentCommon).toContain("float msZonePerioral(");
    expect(patientFragmentCommon).toContain("float msZoneAcral(");
    expect(patientFragmentCommon).toContain("float msZoneCyanosis(");
    expect(patientFragmentCommon).toContain("float msZoneMottle(");
    expect(patientFragmentCommon).toContain("float msZoneGown(");
  });

  test("GLSL sabitleri TS sabitleriyle interpolasyon paritesinde", () => {
    // Perioral merkez, akral el eşiği, taban ağırlıklar birebir string olarak
    expect(patientFragmentCommon).toContain(ZONE.perioralY.toFixed(4));
    expect(patientFragmentCommon).toContain(ZONE.handXIn.toFixed(4));
    expect(patientFragmentCommon).toContain(ZONE.cyanBase.toFixed(4));
    expect(patientFragmentCommon).toContain(ZONE.mottleBase.toFixed(4));
    expect(patientFragmentCommon).toContain(ZONE.gownHem0.toFixed(4));
    // Fragment color: canonical kutu + varsayılan önlük rengi
    expect(patientFragmentColor).toContain(CANON_Y_MIN.toFixed(4));
    expect(patientFragmentColor).toContain(CANON_HEIGHT.toFixed(4));
    expect(patientFragmentColor).toContain(GOWN_DEFAULT_COLOR[0].toFixed(4));
  });

  test("fragment color zonal çarpanları ve önlük harmanını uygular", () => {
    expect(patientFragmentColor).toContain("msZoneCyanosis(zXA, zYN, zZF)");
    expect(patientFragmentColor).toContain("uMottled * msZoneMottle(zXA, zYN)");
    expect(patientFragmentColor).toContain("msZoneGown(zXA, zYN, zZF)");
    expect(patientFragmentColor).toContain("clamp(uGownEnable, 0.0, 1.0)");
    // Mevcut davranış korunur (geriye uyumluluk)
    expect(patientFragmentColor).toContain("gl_FragColor.rgb *= uSkinTint;");
    expect(patientFragmentColor).toContain("uDiaphoresis");
    expect(patientFragmentColor).toContain("uPallor");
  });
});
