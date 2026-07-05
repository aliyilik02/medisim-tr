// ============================================================
// Ekipman onset eğrisi — tick-tabanlı lineer ramp (Hat A #7)
// ============================================================
// onset_sec>0 ekipman etkisi anlık değil, onset boyunca lineer uygulanır.
// startTimedEquipmentDelta (ramp'e alma) + tickTimedEquipmentDeltas
// (tick tüketimi) kanıtları. Sentetik çözümler — katalog değerine bağımsız.
// ============================================================

import { describe, expect, test } from "vitest";
import {
  startTimedEquipmentDelta,
  tickTimedEquipmentDeltas,
} from "@/engine/equipment/engine";
import type {
  EquipmentResolution,
  TimedEquipmentDelta,
} from "@/engine/equipment/types";

function makeResolution(over: Partial<EquipmentResolution> = {}): EquipmentResolution {
  return {
    equipment_id: "test-ekipman",
    applied: true,
    delta: { spo2: 12 },
    onset_sec: 30,
    airway_secured: false,
    opens_iv_route: false,
    note: "test",
    ...over,
  };
}

describe("startTimedEquipmentDelta — ramp'e alma kuralları", () => {
  test("onset_sec>0 + delta dolu → TimedEquipmentDelta üretir", () => {
    const t = startTimedEquipmentDelta(makeResolution());
    expect(t).toEqual({
      equipment_id: "test-ekipman",
      total: { spo2: 12 },
      onset_sec: 30,
      applied_sec: 0,
    });
  });

  test("onset_sec=0 → null (anlık uygulama yolu)", () => {
    expect(startTimedEquipmentDelta(makeResolution({ onset_sec: 0 }))).toBeNull();
  });

  test("applied=false → null", () => {
    expect(startTimedEquipmentDelta(makeResolution({ applied: false }))).toBeNull();
  });

  test("delta boş → null (izlem ekipmanı)", () => {
    expect(startTimedEquipmentDelta(makeResolution({ delta: {} }))).toBeNull();
  });
});

describe("tickTimedEquipmentDeltas — lineer ramp tüketimi", () => {
  const ramp: TimedEquipmentDelta = {
    equipment_id: "test-ekipman",
    total: { spo2: 12, hr: -6 },
    onset_sec: 30,
    applied_sec: 0,
  };

  test("tek tick oransal delta uygular: dt/onset × total", () => {
    const r = tickTimedEquipmentDeltas([ramp], 1);
    expect(r.delta.spo2).toBeCloseTo(12 / 30, 10);
    expect(r.delta.hr).toBeCloseTo(-6 / 30, 10);
    expect(r.remaining).toHaveLength(1);
    expect(r.remaining[0].applied_sec).toBe(1);
  });

  test("onset toplamı kayıpsız: 30×1sn tick → toplam delta tam 12", () => {
    let pending: TimedEquipmentDelta[] = [ramp];
    let toplam = 0;
    for (let i = 0; i < 30; i++) {
      const r = tickTimedEquipmentDeltas(pending, 1);
      toplam += r.delta.spo2 ?? 0;
      pending = r.remaining;
    }
    expect(toplam).toBeCloseTo(12, 10);
    expect(pending).toHaveLength(0); // ramp bitti — listeden düştü
  });

  test("onset'i aşan büyük tick kalan miktarı uygular, fazlasını değil", () => {
    const yarim: TimedEquipmentDelta = { ...ramp, applied_sec: 20 };
    const r = tickTimedEquipmentDeltas([yarim], 60); // kalan 10 sn
    expect(r.delta.spo2).toBeCloseTo(12 * (10 / 30), 10);
    expect(r.remaining).toHaveLength(0);
  });

  test("çoklu ramp birleşik delta üretir, biten düşer süren kalır", () => {
    const bitiyor: TimedEquipmentDelta = {
      equipment_id: "a",
      total: { spo2: 4 },
      onset_sec: 10,
      applied_sec: 9,
    };
    const suruyor: TimedEquipmentDelta = {
      equipment_id: "b",
      total: { spo2: 12 },
      onset_sec: 30,
      applied_sec: 0,
    };
    const r = tickTimedEquipmentDeltas([bitiyor, suruyor], 1);
    expect(r.delta.spo2).toBeCloseTo(4 / 10 + 12 / 30, 10);
    expect(r.remaining).toHaveLength(1);
    expect(r.remaining[0].equipment_id).toBe("b");
  });

  test("boş liste → boş delta, boş remaining", () => {
    const r = tickTimedEquipmentDeltas([], 1);
    expect(r.delta).toEqual({});
    expect(r.remaining).toEqual([]);
  });

  test("girdi mutasyona uğramaz (functional setSession güvenliği)", () => {
    const input = [{ ...ramp }];
    tickTimedEquipmentDeltas(input, 1);
    expect(input[0].applied_sec).toBe(0);
  });
});
