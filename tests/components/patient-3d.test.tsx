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

// Drei useGLTF jsdom/happy-dom altında glTF parse edemez (fetch + binary
// decode). Test ortamında stub'lıyoruz. preload no-op.
vi.mock("@react-three/drei", () => {
  const useGLTF = Object.assign(() => ({ scene: { traverse: () => undefined } }), {
    preload: () => undefined,
  });
  return {
    useGLTF,
    Html: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    OrbitControls: () => null,
    Environment: () => null,
    ContactShadows: () => null,
    RoundedBox: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
    MeshTransmissionMaterial: () => null,
    MeshReflectorMaterial: () => null,
  };
});

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
  test("32 anatomik bölge tanımlı, id'ler unique", () => {
    // 20 baz marker (B.5) + 6 periferik nabız (B.7+): radial ×2,
    // dorsalis pedis ×2, posterior tibial ×2 + 6 DTR refleks (B.10+):
    // biceps ×2, patellar ×2, achilles ×2
    expect(DEFAULT_REGIONS).toHaveLength(32);
    const ids = new Set(DEFAULT_REGIONS.map((r) => r.id));
    expect(ids.size).toBe(32);
  });

  test("yeni periferik nabız marker'ları (B.7+) tanımlı", () => {
    const ids = new Set(DEFAULT_REGIONS.map((r) => r.id));
    expect(ids.has("radial-right")).toBe(true);
    expect(ids.has("radial-left")).toBe(true);
    expect(ids.has("dorsalis-pedis-right")).toBe(true);
    expect(ids.has("dorsalis-pedis-left")).toBe(true);
    expect(ids.has("posterior-tibial-right")).toBe(true);
    expect(ids.has("posterior-tibial-left")).toBe(true);
  });

  test("DTR refleks marker'ları (B.10+) tanımlı", () => {
    const ids = new Set(DEFAULT_REGIONS.map((r) => r.id));
    expect(ids.has("reflex-biceps-right")).toBe(true);
    expect(ids.has("reflex-biceps-left")).toBe(true);
    expect(ids.has("reflex-patellar-right")).toBe(true);
    expect(ids.has("reflex-patellar-left")).toBe(true);
    expect(ids.has("reflex-achilles-right")).toBe(true);
    expect(ids.has("reflex-achilles-left")).toBe(true);
  });

  test("her bölgenin label, position, placeholderNote, side alanları var", () => {
    for (const region of DEFAULT_REGIONS) {
      expect(region.id).toBeTruthy();
      expect(region.label).toBeTruthy();
      expect(region.position).toHaveLength(3);
      expect(region.placeholderNote).toBeTruthy();
      expect(["anterior", "lateral", "posterior"]).toContain(region.side);
    }
  });

  test("region pozisyonları model bbox sınırları içinde", () => {
    // v2 model bbox: y[-0.243, 0.778], x[-0.20, 0.20].
    // B.7+ radial/pedis/tibial alt ekstremitede — x[-0.32, 0.32] genişledi (bilek)
    // ve y[-0.25, 0.78] (ayak ucu).
    for (const region of DEFAULT_REGIONS) {
      const [x, y] = region.position;
      expect(y).toBeGreaterThanOrEqual(-0.25);
      expect(y).toBeLessThanOrEqual(0.78);
      expect(Math.abs(x)).toBeLessThanOrEqual(0.35); // bilek için genişledi
    }
  });
});
