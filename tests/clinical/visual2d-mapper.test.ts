// ============================================================
// visual2d-mapper unit testleri — sürekli VisualState → ayrık 2D durum
// ============================================================
// 2D pivot pilotu: mapper saf TS, %100 birim test edilmeli (3D shader'da
// edilemiyordu — pivot değerlendirmesi §2'nin vaat ettiği net kazanç).
// Değerler GERÇEK STEMI motor seyrinden alınmıştır (visual2d-integration
// testi zinciri motorla uçtan uca kilitler; burası kanal/eşik davranışı).
// ============================================================

import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { VisualState } from "@/clinical/clinicalVisualMapping";
import {
  resolveStage2D,
  severityScore,
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

describe("resolveStage2D — temel eşleme (STEMI seyrinden gerçek değerler)", () => {
  test("sakin hasta → baseline", () => {
    expect(resolveStage2D(calm)).toBe("baseline");
  });

  test("iskemi fazı (yalnız terleme — ağrı 8) → hâlâ baseline (görsel 01 zaten distresli)", () => {
    // iskemi: diaphoresis ~0.7 (painRamp 0.6 + boost 0.1), gerisi ~0 → skor ~0.25
    expect(resolveStage2D(vs({ diaphoresis: 0.7 }))).toBe("baseline");
  });

  test("şok fazı (cyanosis 0.33, pallor boost 0.15, terleme 0.9) → sok", () => {
    // skor ~0.77
    expect(
      resolveStage2D(vs({ cyanosis: 0.33, pallor: 0.15, diaphoresis: 0.9 })),
    ).toBe("sok");
  });

  test("kötüleşme girişi (boost sıçraması, skor ~1.2) → siyanoz", () => {
    expect(
      resolveStage2D(
        vs({ cyanosis: 0.53, pallor: 0.25, mottled: 0.2, diaphoresis: 0.95 }),
      ),
    ).toBe("siyanoz");
  });

  test("geç kötüleşme (cyanosis doymuş, skor ~1.85) → derin-sok", () => {
    expect(
      resolveStage2D(
        vs({
          cyanosis: 1,
          pallor: 0.42,
          mottled: 0.2,
          diaphoresis: 0.95,
          consciousness: 0.96,
        }),
      ),
    ).toBe("derin-sok");
  });

  test("breath_stopped (breathingRate 0) → arrest, skor ne olursa olsun", () => {
    expect(resolveStage2D(vs({ breathingRate: 0 }))).toBe("arrest");
    expect(resolveStage2D(vs({ breathingRate: 0 }), "baseline")).toBe("arrest");
  });
});

describe("severityScore — kanal ağırlıkları", () => {
  test("siyanoz en ağır kanal, terleme en hafif", () => {
    expect(severityScore(vs({ cyanosis: 1 }))).toBeGreaterThan(
      severityScore(vs({ pallor: 1 })),
    );
    expect(severityScore(vs({ pallor: 1 }))).toBeGreaterThan(
      severityScore(vs({ diaphoresis: 1 })),
    );
  });

  test("tek başına terleme (ağrı) hiçbir eşiği aşamaz — skor < 0.45", () => {
    expect(severityScore(vs({ diaphoresis: 1 }))).toBeLessThan(0.45);
  });
});

describe("resolveStage2D — histerezis (çift eşik)", () => {
  test("sınır skor zıplatmaz: 0.5 baseline'dan yükselmez (enter 0.6), sok'tan düşmez (exit 0.45)", () => {
    const border = vs({ cyanosis: 0.5 }); // skor 0.5
    expect(resolveStage2D(border, "baseline")).toBe("baseline");
    expect(resolveStage2D(border, "sok")).toBe("sok");
  });

  test("exit altına inince düşer: skor 0.4 → sok'tan baseline'a", () => {
    expect(resolveStage2D(vs({ cyanosis: 0.4 }), "sok")).toBe("baseline");
  });

  test("siyanoz kalma koşulu gevşek: skor 1.0 siyanozda tutar, baseline'dan yalnız sok'a çıkarır", () => {
    const border = vs({ cyanosis: 1 }); // skor 1.0 (siyanoz enter 1.1, exit 0.9)
    expect(resolveStage2D(border, "siyanoz")).toBe("siyanoz");
    expect(resolveStage2D(border, "baseline")).toBe("sok");
  });
});

describe("resolveStage2D — reperfüzyon (iyileşme yönü)", () => {
  test("recovery: skor geri çekildikçe merdiven aşağı iner", () => {
    // derin-sok'tan skor 1.2 (exit 1.5 altı, siyanoz exit 0.9 üstü) → siyanoz
    expect(
      resolveStage2D(vs({ cyanosis: 1, pallor: 0.25 }), "derin-sok"),
    ).toBe("siyanoz");
    // siyanozdan skor 0.5 → sok (sok exit 0.45 üstü)
    expect(resolveStage2D(vs({ cyanosis: 0.5 }), "siyanoz")).toBe("sok");
    // tam düzelme → baseline
    expect(resolveStage2D(vs({ diaphoresis: 0.6 }), "sok")).toBe("baseline");
  });

  test("arrest'ten çıkış: nefes dönerse durum skora göre çözülür", () => {
    expect(
      resolveStage2D(vs({ breathingRate: 12, pallor: 0.6 }), "arrest"),
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
