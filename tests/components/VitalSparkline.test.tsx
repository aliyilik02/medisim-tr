// ============================================================
// VitalSparkline — Unit testler (Sprint B.5+)
// ============================================================
// Kapsam:
//   - values<2 → boş SVG (path yok)
//   - values≥2 → SVG path d attribute generate edilir
//   - Custom range clamp out-of-range değerleri sınırlar
//   - Otomatik range (no range prop) min/max'tan hesaplar
//   - Width/height props uygulanır
//   - data-testid prop iletilir
// ============================================================

import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { VitalSparkline } from "@/components/patient-3d/VitalSparkline";

describe("VitalSparkline — render", () => {
  test("values<2 ise path render edilmez", () => {
    const { container } = render(<VitalSparkline values={[80]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector("path")).toBeNull();
  });

  test("boş array — sadece SVG container", () => {
    const { container } = render(<VitalSparkline values={[]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
    expect(svg?.querySelector("path")).toBeNull();
  });

  test("values≥2 — path d attribute non-empty", () => {
    const { container } = render(
      <VitalSparkline values={[70, 75, 72, 80, 78]} />,
    );
    const path = container.querySelector("svg path");
    expect(path).not.toBeNull();
    const d = path?.getAttribute("d");
    expect(d).toBeTruthy();
    expect(d).toMatch(/^M /);
    // 5 nokta = "M x1,y1 L x2,y2 L x3,y3 L x4,y4 L x5,y5"
    const lineCount = (d?.match(/L /g) ?? []).length;
    expect(lineCount).toBe(4);
  });

  test("width/height props SVG'ye uygulanır", () => {
    const { container } = render(
      <VitalSparkline values={[1, 2]} width={100} height={20} />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("100");
    expect(svg?.getAttribute("height")).toBe("20");
  });

  test("data-testid prop iletilir", () => {
    const { container } = render(
      <VitalSparkline values={[1, 2]} data-testid="hr-spark" />,
    );
    const svg = container.querySelector('[data-testid="hr-spark"]');
    expect(svg).not.toBeNull();
  });
});

describe("VitalSparkline — math", () => {
  test("custom range clamp: out-of-range yukarı clamp edilir", () => {
    // range 50-100, ama values 30-150 → clamped 50-100
    const { container } = render(
      <VitalSparkline
        values={[30, 150, 70]}
        range={{ min: 50, max: 100 }}
        width={60}
        height={20}
      />,
    );
    const d = container.querySelector("svg path")?.getAttribute("d") ?? "";
    // d formatı: "M x1,y1 L x2,y2 L x3,y3"
    const points = d
      .replace(/^M /, "")
      .split(" L ")
      .map((p) => p.split(",").map(Number));
    // values=30 (clamped 50, en alt = max y), 150 (clamped 100, en üst = min y)
    // ratio: (50-50)/(100-50) = 0 → y = pad + innerH * 1 = 19 (height=20, pad=1)
    // ratio: (100-50)/(100-50) = 1 → y = pad + innerH * 0 = 1
    expect(points[0][1]).toBeCloseTo(19, 0);
    expect(points[1][1]).toBeCloseTo(1, 0);
  });

  test("otomatik range (no prop) min/max'tan türetir", () => {
    const { container } = render(
      <VitalSparkline values={[60, 100]} width={60} height={20} />,
    );
    const d = container.querySelector("svg path")?.getAttribute("d") ?? "";
    const points = d
      .replace(/^M /, "")
      .split(" L ")
      .map((p) => p.split(",").map(Number));
    // İlk değer (60, lo) en altta, ikinci (100, hi) en üstte
    expect(points[0][1]).toBeGreaterThan(points[1][1]);
  });

  test("aynı değerler — hi-lo<epsilon → safe (NaN/Infinity yok)", () => {
    const { container } = render(
      <VitalSparkline values={[75, 75, 75]} width={60} height={20} />,
    );
    const d = container.querySelector("svg path")?.getAttribute("d") ?? "";
    // d'de NaN/Infinity yer almamalı
    expect(d).not.toContain("NaN");
    expect(d).not.toContain("Infinity");
  });

  test("x koordinatları eşit aralıklı", () => {
    const { container } = render(
      <VitalSparkline values={[1, 2, 3, 4, 5]} width={80} height={20} />,
    );
    const d = container.querySelector("svg path")?.getAttribute("d") ?? "";
    const xs = d
      .replace(/^M /, "")
      .split(" L ")
      .map((p) => parseFloat(p.split(",")[0]));
    // 5 nokta için dx = 80 / 4 = 20
    expect(xs[0]).toBeCloseTo(0, 1);
    expect(xs[1]).toBeCloseTo(20, 1);
    expect(xs[4]).toBeCloseTo(80, 1);
  });
});
