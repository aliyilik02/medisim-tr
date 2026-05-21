// ============================================================
// MarkerDevPanel — Unit testler (Sprint B.5+)
// ============================================================
// Geliştirici aracı: marker dropdown + X/Y/Z slider + reset + JSON export
// + Alt+D keyboard shortcut. Clipboard API mock'lu.
// ============================================================

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MarkerDevPanel } from "@/components/patient-3d/MarkerDevPanel";
import type { PatientRegion } from "@/components/patient-3d/regions";

const REGIONS: PatientRegion[] = [
  {
    id: "test-a",
    label: "Test A",
    position: [0, 0.5, 0.1],
    placeholderNote: "",
    side: "anterior",
  },
  {
    id: "test-b",
    label: "Test B",
    position: [0.1, 0.4, 0.12],
    placeholderNote: "",
    side: "anterior",
  },
];

let writeTextMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  // navigator.clipboard happy-dom'da yok; mock
  writeTextMock = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    value: { writeText: writeTextMock },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("MarkerDevPanel — kapalı state", () => {
  test("URL ?dev=1 yoksa toggle butonu görünür, panel kapalı", () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    expect(screen.getByTestId("marker-dev-toggle")).toBeInTheDocument();
    expect(screen.queryByTestId("marker-dev-panel")).not.toBeInTheDocument();
  });

  test("override sayısı toggle butonunda gösterilir", () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{ "test-a": [0.01, 0.51, 0.11] }}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    const toggle = screen.getByTestId("marker-dev-toggle");
    // 1 override rozet
    expect(toggle.textContent).toContain("1");
  });
});

describe("MarkerDevPanel — açma/kapama", () => {
  test("toggle butonu tıklanınca panel açılır", () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));
    expect(screen.getByTestId("marker-dev-panel")).toBeInTheDocument();
    expect(screen.getByTestId("marker-dev-select")).toBeInTheDocument();
    expect(screen.getByTestId("marker-dev-slider-x")).toBeInTheDocument();
    expect(screen.getByTestId("marker-dev-slider-y")).toBeInTheDocument();
    expect(screen.getByTestId("marker-dev-slider-z")).toBeInTheDocument();
  });

  test("Alt+D keyboard shortcut panel'i toggle eder", () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    // Açık değil
    expect(screen.queryByTestId("marker-dev-panel")).not.toBeInTheDocument();
    // Alt+D
    fireEvent.keyDown(window, { key: "d", altKey: true });
    expect(screen.getByTestId("marker-dev-panel")).toBeInTheDocument();
    // Tekrar Alt+D → kapanır
    fireEvent.keyDown(window, { key: "d", altKey: true });
    expect(screen.queryByTestId("marker-dev-panel")).not.toBeInTheDocument();
  });
});

describe("MarkerDevPanel — slider değişimi", () => {
  test("Y slider input onUpdate'i tetikler", () => {
    const onUpdate = vi.fn();
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={onUpdate}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));

    const ySlider = screen.getByTestId("marker-dev-slider-y") as HTMLInputElement;
    fireEvent.change(ySlider, { target: { value: "0.6" } });

    expect(onUpdate).toHaveBeenCalledTimes(1);
    const [id, pos] = onUpdate.mock.calls[0];
    expect(id).toBe("test-a"); // ilk region
    expect(pos[1]).toBeCloseTo(0.6, 2);
  });
});

describe("MarkerDevPanel — reset butonları", () => {
  test("'Bu marker' butonu seçili marker için onResetMarker çağırır", () => {
    const onResetMarker = vi.fn();
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{ "test-a": [0.01, 0.51, 0.11] }}
        onUpdate={() => undefined}
        onResetMarker={onResetMarker}
        onResetAll={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));
    fireEvent.click(screen.getByTestId("marker-dev-reset-current"));
    expect(onResetMarker).toHaveBeenCalledWith("test-a");
  });

  test("'Bu marker' override yoksa disabled", () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));
    const btn = screen.getByTestId("marker-dev-reset-current");
    expect(btn).toBeDisabled();
  });

  test("'Tümünü sıfırla' onResetAll çağırır", () => {
    const onResetAll = vi.fn();
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{ "test-a": [0.01, 0.51, 0.11] }}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={onResetAll}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));
    fireEvent.click(screen.getByTestId("marker-dev-reset-all"));
    expect(onResetAll).toHaveBeenCalledTimes(1);
  });
});

describe("MarkerDevPanel — JSON export", () => {
  test("JSON Export butonu clipboard'a tüm regions'ı yazar", async () => {
    render(
      <MarkerDevPanel
        regions={REGIONS}
        overrides={{}}
        onUpdate={() => undefined}
        onResetMarker={() => undefined}
        onResetAll={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("marker-dev-toggle"));
    fireEvent.click(screen.getByTestId("marker-dev-export"));

    // clipboard.writeText çağrılmalı
    expect(writeTextMock).toHaveBeenCalledTimes(1);
    const arg = writeTextMock.mock.calls[0][0] as string;
    expect(arg).toContain("test-a");
    expect(arg).toContain("test-b");
    expect(arg).toContain("position:");
    // 3 ondalık format
    expect(arg).toMatch(/0\.\d{3}/);
  });
});
