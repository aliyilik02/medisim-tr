// ============================================================
// AuscultationOverlay — yatak-başı oskültasyon faz-senkron doğrulama
// ============================================================
// Yol-3 (diyalog) tekelindeki oskültasyon ses ayağı ScenarioBedPlayPage'e
// taşındı. Bu test: overlay stetoskop noktalarını gösterir + faz-senkron
// kalp sesini doğru çalar (arrest→ses yok). Klinik mantık buildScenarioRegions
// + heartSoundFile'da (ayrı test edildi); burada overlay TETİK yüzeyi doğrulanır.

import { describe, test, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AuscultationOverlay } from "@/components/patient-3d/AuscultationOverlay";
import { buildScenarioRegions } from "@/components/patient-3d/scenarioRegions";
import { DEFAULT_REGIONS } from "@/components/patient-3d/regions";
import { playAuscultation, stopAuscultation } from "@/components/patient-3d/auscultationAudio";
import type { PhaseSignal } from "@/engine";

// Ses motorunu mock'la (heartSoundFile gerçek kalır → faz eşlemesi test edilir).
vi.mock("@/components/patient-3d/auscultationAudio", async (orig) => {
  const actual =
    await orig<typeof import("@/components/patient-3d/auscultationAudio")>();
  return { ...actual, playAuscultation: vi.fn(), stopAuscultation: vi.fn() };
});

const playMock = vi.mocked(playAuscultation);
const stopMock = vi.mocked(stopAuscultation);

// Minimal faz sinyali (buildScenarioRegions yalnız heartSound okur).
function phase(heartSound: PhaseSignal["heartSound"]): PhaseSignal {
  return {
    phaseId: "test-phase",
    ekg: "st_elevation",
    heartSound,
    visual: {},
    recovering: false,
  } as unknown as PhaseSignal;
}

beforeEach(() => {
  playMock.mockClear();
  stopMock.mockClear();
});

describe("AuscultationOverlay — yatak-başı oskültasyon", () => {
  test("stetoskop noktaları buton olarak görünür (kardiyak 3 nokta)", () => {
    render(<AuscultationOverlay regions={DEFAULT_REGIONS} />);
    expect(screen.getByTestId("auscultation-panel")).toBeInTheDocument();
    // DEFAULT_REGIONS'ta stethoscope: chest-front / chest-left / chest-right
    expect(screen.getByTestId("auscultation-point-chest-front")).toBeInTheDocument();
    expect(screen.getByTestId("auscultation-point-chest-left")).toBeInTheDocument();
    expect(screen.getByTestId("auscultation-point-chest-right")).toBeInTheDocument();
  });

  test("stetoskop noktası olmayan regions → panel render edilmez (null)", () => {
    const { container } = render(
      <AuscultationOverlay regions={DEFAULT_REGIONS.filter((r) => r.id === "face-mouth")} />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("ses tanımlı noktaya tıklayınca playAuscultation çağrılır (5sn)", () => {
    render(<AuscultationOverlay regions={DEFAULT_REGIONS} />);
    fireEvent.click(screen.getByTestId("auscultation-point-chest-front"));
    // DEFAULT chest-front → heart_normal
    expect(playMock).toHaveBeenCalledWith("heart_normal", 5000);
  });

  test("FAZ-SENKRON: arrest (silent) → kardiyak nokta sessiz, ses ÇALINMAZ", () => {
    // buildScenarioRegions arrest fazını kardiyak noktalara yazar → soundId undefined
    const regions = buildScenarioRegions(DEFAULT_REGIONS, undefined, [], phase("silent"));
    render(<AuscultationOverlay regions={regions} />);
    const btn = screen.getByTestId("auscultation-point-chest-front");
    expect(btn).toHaveTextContent(/sessiz/i);
    fireEvent.click(btn);
    expect(playMock).not.toHaveBeenCalled();
    // önceki çalan ses durdurulur (arrest klinik gerçeği)
    expect(stopMock).toHaveBeenCalled();
  });

  test("FAZ-SENKRON: normal faz → kardiyak nokta heart_normal çalar", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, undefined, [], phase("normal"));
    render(<AuscultationOverlay regions={regions} />);
    fireEvent.click(screen.getByTestId("auscultation-point-chest-front"));
    expect(playMock).toHaveBeenCalledWith("heart_normal", 5000);
  });

  test("FAZ-SENKRON: tachy faz → kardiyak nokta heart_61bpm çalar", () => {
    const regions = buildScenarioRegions(DEFAULT_REGIONS, undefined, [], phase("tachy"));
    render(<AuscultationOverlay regions={regions} />);
    fireEvent.click(screen.getByTestId("auscultation-point-chest-front"));
    expect(playMock).toHaveBeenCalledWith("heart_61bpm", 5000);
  });
});
