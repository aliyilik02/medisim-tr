// ============================================================
// visual2d-mapper unit testleri — sürekli VisualState → ayrık 2D durum
// ============================================================
// 2D pivot pilotu: mapper saf TS, %100 birim test edilmeli (3D shader'da
// edilemiyordu — pivot değerlendirmesi §2'nin vaat ettiği net kazanç).
// Senaryo trace'leri STEMI deterioration seyrine göre (stemi.ts).
// ============================================================

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import {
  resolveStage2D,
  stageRank,
  STAGE_ORDER,
  STEMI_2D_FRAMES,
} from "@/clinical/visual2d-mapper";

/** Sağlıklı taban — tüm patoloji 0. */
const calm: VisualState = {
  cyanosis: 0,
  pallor: 0,
  diaphoresis: 0,
  mottled: 0,
  breathingRate: 14,
  consciousness: 1,
};

const vs = (patch: Partial<VisualState>): VisualState => ({ ...calm, ...patch });

describe("resolveStage2D — temel eşleme (STEMI tedavisiz seyir)", () => {
  test("sakin hasta → baseline", () => {
    expect(resolveStage2D(calm)).toBe("baseline");
  });

  test("iskemi fazı (yalnız terleme, ağrı) → hâlâ baseline (görsel 01 zaten distresli)", () => {
    // iskemi: diaphoresis ~0.7, pallor/cyanosis ~0 (SBP floor 100, SpO2 floor 92)
    expect(resolveStage2D(vs({ diaphoresis: 0.7 }))).toBe("baseline");
  });

  test("şok fazı (pallor 0.53, cyanosis 0.33) → sok", () => {
    expect(
      resolveStage2D(vs({ pallor: 0.53, cyanosis: 0.33, diaphoresis: 0.9 })),
    ).toBe("sok");
  });

  test("kötüleşme erken (cyanosis önde) → siyanoz", () => {
    // SpO2 86 + boost → cyanosis ~0.7; mottled henüz eşiğin altında
    expect(
      resolveStage2D(vs({ cyanosis: 0.7, pallor: 0.7, mottled: 0.5 })),
    ).toBe("siyanoz");
  });

  test("kötüleşme geç (mottled + pallor doymuş) → derin-sok", () => {
    expect(
      resolveStage2D(vs({ cyanosis: 1, pallor: 1, mottled: 1, consciousness: 0.87 })),
    ).toBe("derin-sok");
  });

  test("breath_stopped (breathingRate 0) → arrest, diğer değerlerden bağımsız", () => {
    expect(resolveStage2D(vs({ breathingRate: 0 }))).toBe("arrest");
    // histerezis referansı ne olursa olsun arrest kazanır
    expect(resolveStage2D(vs({ breathingRate: 0 }), "baseline")).toBe("arrest");
  });
});

describe("resolveStage2D — histerezis (çift eşik)", () => {
  test("sınır değer zıplatmaz: enter 0.45 altı baseline'dan yükselmez", () => {
    expect(resolveStage2D(vs({ pallor: 0.4 }), "baseline")).toBe("baseline");
  });

  test("sok'a girince exit (0.32) üstünde kalır — pallor 0.4'e inse de sok sürer", () => {
    expect(resolveStage2D(vs({ pallor: 0.4 }), "sok")).toBe("sok");
  });

  test("exit altına inince düşer: pallor 0.2 → sok'tan baseline'a", () => {
    expect(resolveStage2D(vs({ pallor: 0.2 }), "sok")).toBe("baseline");
  });

  test("siyanoz kalma koşulu gevşek: cyanosis 0.45 siyanozda tutar, baseline'dan yükseltmez", () => {
    expect(resolveStage2D(vs({ cyanosis: 0.45 }), "siyanoz")).toBe("siyanoz");
    expect(resolveStage2D(vs({ cyanosis: 0.45 }), "baseline")).toBe("baseline");
  });
});

describe("resolveStage2D — reperfüzyon (iyileşme yönü)", () => {
  test("recovery: değerler geri çekildikçe merdiven aşağı iner", () => {
    // derin-sok'tan: mottled 0.5 (exit 0.6 altı) ama cyanosis hâlâ 0.5 (exit 0.4 üstü) → siyanoz
    expect(
      resolveStage2D(vs({ cyanosis: 0.5, pallor: 0.5, mottled: 0.5 }), "derin-sok"),
    ).toBe("siyanoz");
    // siyanozdan: cyanosis 0.3 (exit altı), pallor 0.35 (sok exit 0.32 üstü) → sok
    expect(
      resolveStage2D(vs({ cyanosis: 0.3, pallor: 0.35 }), "siyanoz"),
    ).toBe("sok");
    // tam düzelme → baseline
    expect(resolveStage2D(vs({ pallor: 0.1 }), "sok")).toBe("baseline");
  });

  test("arrest'ten çıkış: nefes dönerse (recovery) durum vital'e göre çözülür", () => {
    expect(
      resolveStage2D(vs({ breathingRate: 12, pallor: 0.5 }), "arrest"),
    ).toBe("sok");
  });
});

describe("sözleşme — kare seti ve merdiven bütünlüğü", () => {
  test("her durumun bir karesi var ve merdiven 5 basamak", () => {
    expect(STAGE_ORDER).toHaveLength(5);
    for (const s of STAGE_ORDER) {
      expect(STEMI_2D_FRAMES[s]).toMatch(/^\/patients\/stemi\/stemi-\d\d-.+\.png$/);
    }
  });

  test("stageRank merdiven sırasını korur (baseline < sok < siyanoz < derin-sok < arrest)", () => {
    const ranks = STAGE_ORDER.map(stageRank);
    expect(ranks).toEqual([0, 1, 2, 3, 4]);
  });

  test("kare dosyaları public/ altında gerçekten var (PROP_CREDITS kapısı deseni)", () => {
    for (const s of STAGE_ORDER) {
      const rel = STEMI_2D_FRAMES[s].replace(/^\//, "");
      expect(existsSync(join(process.cwd(), "public", rel)), rel).toBe(true);
    }
  });
});
