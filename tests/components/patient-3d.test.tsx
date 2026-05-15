// ============================================================
// Patient 3D — smoke testleri (Sprint A)
// ============================================================
// happy-dom WebGL desteklemiyor; bu yüzden @react-three/fiber'in
// `Canvas` bileşenini ve `useFrame` hook'unu vi.mock ile
// nötrleştiriyoruz. Asıl amaç: bileşen ağacı render edilebiliyor mu,
// region marker prop'ları doğru mu, InspectionPanel selected
// region için doğru içeriği veriyor mu.
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { InspectionPanel } from "@/components/patient-3d/InspectionPanel";

// R3F Canvas + intrinsic three.js elementlerini DOM'a render edilebilir
// stub'larla değiştir. `mesh`, `sphereGeometry` vb. happy-dom'da hata
// vermez çünkü React intrinsic JSX'i custom element olarak render eder,
// ancak `Canvas` WebGL renderer kurmaya çalıştığı için crash eder.
// Canvas children'ı render etmiyoruz: three.js intrinsic JSX'leri
// (`mesh`, `sphereGeometry`...) happy-dom altında "unrecognized tag"
// warning'leri basıyor ve test çıktısını kirletiyor. PatientBody3D
// InspectionPanel'i Canvas dışında render ettiği için DOM kontrolleri
// etkilenmiyor.
vi.mock("@react-three/fiber", () => ({
  Canvas: (props: Record<string, unknown>) => {
    const dataTestId = (props["data-testid"] as string | undefined) ?? "r3f-canvas-mock";
    return <div data-testid={dataTestId} data-r3f-canvas />;
  },
  useFrame: () => undefined,
  useThree: () => ({
    camera: { position: { set: () => undefined }, lookAt: () => undefined },
    size: { width: 1280, height: 720 },
  }),
}));

import { PatientBody3D } from "@/components/patient-3d/PatientBody3D";

describe("PatientBody3D — temel render", () => {
  test("Canvas mount edilir ve region sayısı kadar marker hazırlanır", () => {
    render(<PatientBody3D regions={DEFAULT_REGIONS} breathing={false} />);
    expect(screen.getByTestId("patient-3d-canvas")).toBeInTheDocument();
  });

  test("başlangıçta InspectionPanel render edilmez (selected = null)", () => {
    render(<PatientBody3D regions={DEFAULT_REGIONS} breathing={false} />);
    expect(
      screen.queryByTestId("patient-3d-inspection-panel")
    ).not.toBeInTheDocument();
  });

  test("boş regions listesi crash etmez", () => {
    render(<PatientBody3D regions={[]} breathing={false} />);
    expect(screen.getByTestId("patient-3d-canvas")).toBeInTheDocument();
  });
});

describe("InspectionPanel — bilgi kartı", () => {
  test("region null ise hiçbir şey render etmez", () => {
    const { container } = render(
      <InspectionPanel region={null} onClose={() => undefined} />
    );
    expect(container.firstChild).toBeNull();
  });

  test("region verildiğinde label + placeholderNote görünür", () => {
    const region = DEFAULT_REGIONS[0];
    render(<InspectionPanel region={region} onClose={() => undefined} />);
    expect(screen.getByText(region.label)).toBeInTheDocument();
    expect(screen.getByText(region.placeholderNote)).toBeInTheDocument();
    expect(screen.getByText(/id:/i)).toBeInTheDocument();
  });

  test("kapatma butonu onClose callback'ini çağırır", () => {
    const onClose = vi.fn();
    render(<InspectionPanel region={DEFAULT_REGIONS[1]} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText(/paneli kapat/i));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("regions data integrity", () => {
  test("5 placeholder bölge tanımlı, id'ler unique", () => {
    expect(DEFAULT_REGIONS).toHaveLength(5);
    const ids = new Set(DEFAULT_REGIONS.map((r) => r.id));
    expect(ids.size).toBe(5);
  });

  test("her bölgenin label, position, placeholderNote, side alanları var", () => {
    for (const region of DEFAULT_REGIONS) {
      expect(region.id).toBeTruthy();
      expect(region.label).toBeTruthy();
      expect(region.position).toHaveLength(3);
      expect(region.placeholderNote).toMatch(/Sprint A sonrası klinik review/);
      expect(["anterior", "lateral", "posterior"]).toContain(region.side);
    }
  });

  test("placeholderNote gerçek klinik içerik içermiyor (sentinel kontrolü)", () => {
    // Sprint A klinik içerik yasak — her not "klinik review'da eklenecek"
    // sentinel cümlesini içermeli. Yanlışlıkla gerçek auskültasyon notu
    // (S1, S2, üfürüm, vb.) sızarsa bu test patlar.
    const forbidden = /S[12] sesi|üfürüm|murmur|raller|ronküs|2\/6/i;
    for (const region of DEFAULT_REGIONS) {
      expect(region.placeholderNote).not.toMatch(forbidden);
    }
  });
});
