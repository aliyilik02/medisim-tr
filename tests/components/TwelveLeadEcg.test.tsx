// ============================================================
// TwelveLeadEcg — Unit smoke testler (Sprint B.3.1)
// ============================================================
// 12 lead × EcgStrip grid. happy-dom Canvas tam destek vermez —
// sadece mount + 12 lead başlığı + grid yapısı validation.
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { TwelveLeadEcg } from "@/components/TwelveLeadEcg";

describe("TwelveLeadEcg — render smoke", () => {
  test("12 lead başlığı DOM'da görünür", () => {
    render(<TwelveLeadEcg hr={75} pattern="normal" />);
    const leadNames = [
      "I", "II", "III",
      "aVR", "aVL", "aVF",
      "V1", "V2", "V3", "V4", "V5", "V6",
    ];
    for (const name of leadNames) {
      // Lead label'ları text node olarak görünür
      const matches = screen.getAllByText(name);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  test("12 canvas (her lead için bir EcgStrip) DOM'da render edilir", () => {
    const { container } = render(<TwelveLeadEcg hr={75} pattern="normal" />);
    const canvases = container.querySelectorAll("canvas");
    expect(canvases.length).toBe(12);
  });

  test("STEMI pattern ile mount eder", () => {
    const { container } = render(<TwelveLeadEcg hr={110} pattern="stemi" />);
    expect(container.querySelectorAll("canvas").length).toBe(12);
  });

  test("VF pattern ile crash etmez", () => {
    const { container } = render(<TwelveLeadEcg hr={0} pattern="vf" />);
    expect(container.querySelectorAll("canvas").length).toBe(12);
  });

  test("ecgParams (ilaç etkisi) ile mount eder", () => {
    const { container } = render(
      <TwelveLeadEcg
        hr={75}
        pattern="normal"
        ecgParams={{
          qtc_delta_ms: 50,
          pr_delta_ms: 10,
          qrs_delta_ms: 5,
          st_elevation_delta: 0,
          rhythm_change: undefined,
        }}
      />,
    );
    expect(container.querySelectorAll("canvas").length).toBe(12);
  });
});
