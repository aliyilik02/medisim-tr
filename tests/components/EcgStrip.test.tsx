// ============================================================
// EcgStrip — Unit smoke testler (Sprint B.3)
// ============================================================
// Canvas tabanlı EKG dalga formu render edici. happy-dom Canvas
// tam destek vermez — sadece mount + prop validation test edilir.
// Tam dalga form testi e2e veya visual regression'da.
// ============================================================

import { describe, expect, test } from "vitest";
import { render } from "@testing-library/react";
import { EcgStrip } from "@/components/EcgStrip";

describe("EcgStrip — render smoke", () => {
  test("canvas element DOM'a düşer", () => {
    const { container } = render(<EcgStrip hr={75} pattern="normal" />);
    const canvas = container.querySelector("canvas");
    expect(canvas).not.toBeNull();
  });

  test("varsayılan pattern olmadan da crash etmez", () => {
    const { container } = render(<EcgStrip hr={80} />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("STEMI pattern ile mount eder", () => {
    const { container } = render(<EcgStrip hr={110} pattern="stemi" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("VF pattern ile mount eder", () => {
    const { container } = render(<EcgStrip hr={0} pattern="vf" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("Bilinmeyen pattern → normal'e fallback", () => {
    const { container } = render(
      <EcgStrip hr={75} pattern="bilinmeyen_patern" />,
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("ecgParams (ilaç etkisi) ile mount eder", () => {
    const { container } = render(
      <EcgStrip
        hr={75}
        pattern="normal"
        ecgParams={{
          qtc_delta_ms: 20,
          pr_delta_ms: 0,
          qrs_delta_ms: 0,
          st_elevation_delta: 0,
          rhythm_change: undefined,
        }}
      />,
    );
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("HR=0 (asistoli) crash etmez", () => {
    const { container } = render(<EcgStrip hr={0} pattern="asistoli" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });

  test("yüksek HR (200+) ile mount eder", () => {
    const { container } = render(<EcgStrip hr={220} pattern="svt" />);
    expect(container.querySelector("canvas")).not.toBeNull();
  });
});
