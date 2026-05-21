// ============================================================
// CurrentStepPanel — Unit testler (Sprint B.5+)
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrentStepPanel } from "@/components/dialog/CurrentStepPanel";
import type {
  Scenario,
  SessionState,
  Step,
  ActionStep,
  DecisionStep,
  InfoStep,
} from "@/engine/types";

function makeScenario(steps: Step[]): Scenario {
  return {
    id: "test-scenario",
    title: "Test Senaryo",
    specialty: "kardiyoloji",
    difficulty: 3,
    patient: { age: 60, sex: "erkek", weight_kg: 75 },
    initial_vitals: {
      hr: 80,
      rr: 16,
      bp_systolic: 120,
      bp_diastolic: 80,
      spo2: 98,
      temp: 36.7,
    },
    chief_complaint: "Test",
    icd10_codes: ["I21"],
    snomed_codes: [],
    available_medications: [],
    available_equipment: [],
    steps,
    scoring: { max_points: 100, passing_score: 50 },
  } as Scenario;
}

function makeSession(currentStepId: string | null): SessionState {
  return {
    scenario_id: "test-scenario",
    mode: "egitim",
    selected_difficulty: 3,
    started_at: Date.now(),
    current_step_id: currentStepId,
    completed_step_ids: [],
    baseline_vitals: {
      hr: 80,
      rr: 16,
      bp_systolic: 120,
      bp_diastolic: 80,
      spo2: 98,
      temp: 36.7,
    },
    vitals: {
      hr: 80,
      rr: 16,
      bp_systolic: 120,
      bp_diastolic: 80,
      spo2: 98,
      temp: 36.7,
    },
    results: [],
    total_score: 0,
    finished: false,
  } as SessionState;
}

const actionStep: ActionStep = {
  id: "a1",
  kind: "action",
  title: "İlk Eylem",
  prompt: "Hastayı değerlendir",
  expected_outcomes: [],
};

const decisionStep: DecisionStep = {
  id: "d1",
  kind: "decision",
  title: "Karar Adımı",
  prompt: "Hangi tetkiki ister­sin?",
  options: [
    { id: "o1", text: "EKG", correct: true, points: 10, feedback: "Doğru" },
    { id: "o2", text: "Tomografi", correct: false, points: -5, feedback: "Erken" },
  ],
};

const multiDecisionStep: DecisionStep = {
  id: "d2",
  kind: "decision",
  title: "Çoklu Tetkik Seçimi",
  prompt: "Tüm uygun tetkikleri seç",
  allow_multiple: true,
  options: [
    { id: "m1", text: "EKG", correct: true, points: 5, feedback: "Tamam" },
    { id: "m2", text: "Troponin", correct: true, points: 5, feedback: "Tamam" },
  ],
};

const infoStep: InfoStep = {
  id: "i1",
  kind: "info",
  title: "Bilgi",
  prompt: "Önemli not",
  content: "STEMI tanısı için 12-derivasyon EKG şart.",
};

describe("CurrentStepPanel — session yok", () => {
  test("session null ise hiçbir şey render edilmez", () => {
    const { container } = render(
      <CurrentStepPanel
        scenario={makeScenario([actionStep])}
        session={null}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe("CurrentStepPanel — finished state", () => {
  test("session.finished → finished panel", () => {
    const session = makeSession(null);
    session.finished = true;
    session.total_score = 75;
    render(
      <CurrentStepPanel
        scenario={makeScenario([actionStep])}
        session={session}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    const panel = screen.getByTestId("current-step-panel");
    expect(panel.dataset.stepKind).toBe("finished");
    expect(screen.getByText(/Senaryo Tamamlandı/i)).toBeInTheDocument();
    expect(screen.getByText(/75/)).toBeInTheDocument();
  });
});

describe("CurrentStepPanel — action step", () => {
  test("kind=action → hint görünür", () => {
    render(
      <CurrentStepPanel
        scenario={makeScenario([actionStep])}
        session={makeSession("a1")}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    const panel = screen.getByTestId("current-step-panel");
    expect(panel.dataset.stepKind).toBe("action");
    expect(screen.getByText(/İlk Eylem/)).toBeInTheDocument();
    expect(
      screen.getByText(/3D modelde bir bölgeye tıkla/i),
    ).toBeInTheDocument();
  });
});

describe("CurrentStepPanel — info step", () => {
  test("kind=info → content + Devam Et butonu", () => {
    render(
      <CurrentStepPanel
        scenario={makeScenario([infoStep])}
        session={makeSession("i1")}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    const panel = screen.getByTestId("current-step-panel");
    expect(panel.dataset.stepKind).toBe("info");
    expect(screen.getByText(/STEMI tanısı için/)).toBeInTheDocument();
    expect(screen.getByTestId("info-continue")).toBeInTheDocument();
  });

  test("Devam Et butonu onInfoContinue çağırır", () => {
    const onInfoContinue = vi.fn();
    render(
      <CurrentStepPanel
        scenario={makeScenario([infoStep])}
        session={makeSession("i1")}
        onDecisionSubmit={() => undefined}
        onInfoContinue={onInfoContinue}
      />,
    );
    fireEvent.click(screen.getByTestId("info-continue"));
    expect(onInfoContinue).toHaveBeenCalledTimes(1);
    expect(onInfoContinue.mock.calls[0][0].kind).toBe("info");
  });
});

describe("CurrentStepPanel — decision step (tek seçim)", () => {
  test("options listesi görünür", () => {
    render(
      <CurrentStepPanel
        scenario={makeScenario([decisionStep])}
        session={makeSession("d1")}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    const panel = screen.getByTestId("current-step-panel");
    expect(panel.dataset.stepKind).toBe("decision");
    expect(screen.getByText(/EKG/)).toBeInTheDocument();
    expect(screen.getByText(/Tomografi/)).toBeInTheDocument();
  });

  test("option tıklaması onDecisionSubmit'i direkt tetikler (allow_multiple yok)", () => {
    const onDecisionSubmit = vi.fn();
    render(
      <CurrentStepPanel
        scenario={makeScenario([decisionStep])}
        session={makeSession("d1")}
        onDecisionSubmit={onDecisionSubmit}
        onInfoContinue={() => undefined}
      />,
    );
    const options = screen.getAllByTestId("decision-option");
    fireEvent.click(options[0]);
    expect(onDecisionSubmit).toHaveBeenCalledTimes(1);
    const [stepArg, optIds] = onDecisionSubmit.mock.calls[0];
    expect(stepArg.id).toBe("d1");
    expect(optIds).toEqual(["o1"]);
  });
});

describe("CurrentStepPanel — decision step (çoklu seçim)", () => {
  test("allow_multiple ise checkbox + onayla butonu görünür", () => {
    render(
      <CurrentStepPanel
        scenario={makeScenario([multiDecisionStep])}
        session={makeSession("d2")}
        onDecisionSubmit={() => undefined}
        onInfoContinue={() => undefined}
      />,
    );
    expect(screen.getByTestId("decision-submit")).toBeInTheDocument();
    // Çoklu Seçim header'ı
    expect(screen.getByText(/Çoklu Seçim/i)).toBeInTheDocument();
  });

  test("birden çok option seçilip onayla → submit list ile çağrılır", () => {
    const onDecisionSubmit = vi.fn();
    render(
      <CurrentStepPanel
        scenario={makeScenario([multiDecisionStep])}
        session={makeSession("d2")}
        onDecisionSubmit={onDecisionSubmit}
        onInfoContinue={() => undefined}
      />,
    );
    const options = screen.getAllByTestId("decision-option");
    fireEvent.click(options[0]);
    fireEvent.click(options[1]);
    // Çoklu seçimde direkt submit edilmez, butona tıklama gerek
    expect(onDecisionSubmit).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("decision-submit"));
    expect(onDecisionSubmit).toHaveBeenCalledTimes(1);
    const [, optIds] = onDecisionSubmit.mock.calls[0];
    expect(optIds).toEqual(expect.arrayContaining(["m1", "m2"]));
    expect(optIds.length).toBe(2);
  });
});
