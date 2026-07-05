// ============================================================
// tubing — catenary sarkma eğrisi saf testleri
// ============================================================

import { describe, expect, test } from "vitest";
import { buildTubePoints } from "@/components/patient-3d/props/tubing";

describe("buildTubePoints", () => {
  test("uç noktalar birebir korunur", () => {
    const pts = buildTubePoints([0, 1, 0], [1, 0.5, 0.5]);
    expect(pts[0]).toEqual([0, 1, 0]);
    const last = pts[pts.length - 1];
    expect(last[0]).toBeCloseTo(1, 6);
    expect(last[1]).toBeCloseTo(0.5, 6);
    expect(last[2]).toBeCloseTo(0.5, 6);
  });

  test("orta nokta düz hattın ALTINDA sarkar, sarkma mesafeyle büyür", () => {
    const short = buildTubePoints([0, 1, 0], [0.2, 1, 0], { segments: 21 });
    const long = buildTubePoints([0, 1, 0], [1.0, 1, 0], { segments: 21 });
    const midShort = short[10][1];
    const midLong = long[10][1];
    expect(midShort).toBeLessThan(1);
    expect(midLong).toBeLessThan(midShort); // uzun hat daha çok sarkar
  });

  test("sagMax sarkmayı sınırlar", () => {
    const pts = buildTubePoints([0, 1, 0], [3, 1, 0], { segments: 21, sagMax: 0.1 });
    // orta: 1 - 0.1*4*0.5*0.5 = 0.9
    expect(pts[10][1]).toBeCloseTo(0.9, 6);
  });

  test("floorY altına inmez", () => {
    const pts = buildTubePoints([0, 0.1, 0], [1, 0.1, 0], { floorY: 0.05 });
    for (const p of pts) expect(p[1]).toBeGreaterThanOrEqual(0.05);
  });

  test("segments sayısı kadar nokta, monoton x ilerleme", () => {
    const pts = buildTubePoints([0, 1, 0], [1, 1, 1], { segments: 12 });
    expect(pts).toHaveLength(12);
    for (let i = 1; i < pts.length; i++) expect(pts[i][0]).toBeGreaterThan(pts[i - 1][0]);
  });
});
