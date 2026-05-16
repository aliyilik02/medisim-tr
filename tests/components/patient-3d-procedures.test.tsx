// ============================================================
// Patient 3D — Prosedür altyapısı testleri (Sprint B.2.1)
// ============================================================
// Kapsam:
//   1) InspectionPanel — availableProcedures'a göre buton listesi
//      ve onStartProcedure callback'i.
//   2) ProcedureOverlay — generic dispatcher davranışı (null,
//      tanınan kind, tanınmayan kind → null).
//   3) regions.ts data integrity — chest-* stetoskop destekler,
//      abdomen-* desteklemez.
//
// StethoscopeProcedure içinde useFrame + three.js intrinsic JSX
// (`mesh`, `cylinderGeometry`...) var. ProcedureOverlay'i Canvas
// dışında izole test ediyoruz; üç boyutlu mesh gürültüsünü
// engellemek için StethoscopeProcedure'ı stub'lıyoruz.
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { InspectionPanel } from "@/components/patient-3d/InspectionPanel";

vi.mock("@/components/patient-3d/procedures/StethoscopeProcedure", () => ({
  StethoscopeProcedure: (props: {
    targetPosition: [number, number, number];
    onComplete: () => void;
  }) => (
    <div
      data-testid="stethoscope-procedure-mock"
      data-target={props.targetPosition.join(",")}
    />
  ),
}));

import { ProcedureOverlay } from "@/components/patient-3d/procedures/ProcedureOverlay";

describe("InspectionPanel — prosedür butonları", () => {
  test("availableProcedures varsa procedure-list render edilir", () => {
    const region = DEFAULT_REGIONS.find((r) => r.id === "chest-front")!;
    render(<InspectionPanel region={region} onClose={() => undefined} />);
    expect(screen.getByTestId("procedure-list")).toBeInTheDocument();
    expect(screen.getByTestId("procedure-button-stethoscope")).toBeInTheDocument();
    expect(screen.getByText(/stetoskop ile dinle/i)).toBeInTheDocument();
  });

  test("availableProcedures yoksa procedure-list render edilmez", () => {
    const region = DEFAULT_REGIONS.find((r) => r.id === "abdomen-upper")!;
    render(<InspectionPanel region={region} onClose={() => undefined} />);
    expect(screen.queryByTestId("procedure-list")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("procedure-button-stethoscope"),
    ).not.toBeInTheDocument();
  });

  test("buton tıklaması onStartProcedure'u doğru parametrelerle çağırır", () => {
    const region = DEFAULT_REGIONS.find((r) => r.id === "chest-left")!;
    const onStart = vi.fn();
    render(
      <InspectionPanel
        region={region}
        onClose={() => undefined}
        onStartProcedure={onStart}
      />,
    );
    fireEvent.click(screen.getByTestId("procedure-button-stethoscope"));
    expect(onStart).toHaveBeenCalledTimes(1);
    expect(onStart).toHaveBeenCalledWith("stethoscope", region);
  });

  test("onStartProcedure verilmediğinde tıklama crash etmez", () => {
    const region = DEFAULT_REGIONS.find((r) => r.id === "chest-right")!;
    render(<InspectionPanel region={region} onClose={() => undefined} />);
    expect(() =>
      fireEvent.click(screen.getByTestId("procedure-button-stethoscope")),
    ).not.toThrow();
  });
});

describe("ProcedureOverlay — dispatcher", () => {
  test("active=null ise hiçbir şey render etmez", () => {
    const { container } = render(
      <ProcedureOverlay active={null} onComplete={() => undefined} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("active.kind=stethoscope ise StethoscopeProcedure mount edilir", () => {
    render(
      <ProcedureOverlay
        active={{
          kind: "stethoscope",
          regionId: "chest-front",
          targetPosition: [0, 0.55, 0.115],
        }}
        onComplete={() => undefined}
      />,
    );
    const mock = screen.getByTestId("stethoscope-procedure-mock");
    expect(mock).toBeInTheDocument();
    expect(mock.dataset.target).toBe("0,0.55,0.115");
  });

  test("active.kind switch'te yoksa null döner (B.2.1: oxygen_mask henüz yok)", () => {
    const { container } = render(
      <ProcedureOverlay
        active={{
          kind: "oxygen_mask",
          regionId: "face-mouth",
          targetPosition: [0, 0.71, 0.1],
        }}
        onComplete={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("regions data integrity — prosedür eşlemesi", () => {
  test("chest-front / chest-left / chest-right stetoskop destekler", () => {
    const chestIds = ["chest-front", "chest-left", "chest-right"];
    for (const id of chestIds) {
      const region = DEFAULT_REGIONS.find((r) => r.id === id);
      expect(region, `region ${id} bulunamadı`).toBeDefined();
      expect(region!.availableProcedures ?? []).toContain("stethoscope");
    }
  });

  test("abdomen-* bölgelerinde stetoskop yok", () => {
    const abdomenIds = ["abdomen-upper", "abdomen-lower"];
    for (const id of abdomenIds) {
      const region = DEFAULT_REGIONS.find((r) => r.id === id);
      expect(region, `region ${id} bulunamadı`).toBeDefined();
      expect(region!.availableProcedures ?? []).not.toContain("stethoscope");
    }
  });
});
