// ============================================================
// DebriefModal — Unit testler (Sprint B.5+)
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DebriefModal } from "@/components/dialog/DebriefModal";
import type { Scenario, SessionState, StepResult } from "@/engine/types";

function makeScenario(overrides: Partial<Scenario> = {}): Scenario {
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
    steps: [
      { id: "s1", kind: "info", title: "İlk", prompt: "p", content: "c" },
      { id: "s2", kind: "info", title: "İkinci", prompt: "p", content: "c" },
      { id: "s3", kind: "info", title: "Üçüncü", prompt: "p", content: "c" },
    ],
    scoring: {
      max_points: 100,
      passing_score: 50,
    },
    ...overrides,
  } as Scenario;
}

function makeSession(overrides: Partial<SessionState> = {}): SessionState {
  return {
    scenario_id: "test-scenario",
    mode: "egitim",
    selected_difficulty: 3,
    started_at: Date.now() - 60_000, // 1 dk önce
    current_step_id: null,
    completed_step_ids: ["s1", "s2"],
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
    results: [
      {
        step_id: "s1",
        actions_taken: [],
        points_earned: 25,
        time_spent_sec: 30,
        critical_errors: 0,
      },
      {
        step_id: "s2",
        actions_taken: [],
        points_earned: 50,
        time_spent_sec: 60,
        critical_errors: 0,
      },
    ] as StepResult[],
    total_score: 75,
    floored_score: 75,
    grade: "B",
    finished: true,
    ...overrides,
  } as SessionState;
}

describe("DebriefModal — open/close", () => {
  test("open=false ise hiçbir şey render edilmez", () => {
    const { container } = render(
      <DebriefModal
        open={false}
        scenario={makeScenario()}
        session={makeSession()}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  test("open=true ise modal görünür", () => {
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession()}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByTestId("debrief-modal")).toBeInTheDocument();
  });
});

describe("DebriefModal — grade rendering", () => {
  test("grade B → 'İyi' label", () => {
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession({ grade: "B", floored_score: 75 })}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/^B$/)).toBeInTheDocument();
    expect(screen.getByText(/İyi/)).toBeInTheDocument();
  });

  test("grade F → 'Başarısız'", () => {
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession({ grade: "F", floored_score: 10 })}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/^F$/)).toBeInTheDocument();
    expect(screen.getByText(/Başarısız/)).toBeInTheDocument();
  });

  test("grade undef → F fallback", () => {
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession({ grade: undefined })}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/^F$/)).toBeInTheDocument();
  });
});

describe("DebriefModal — stat ve içerik", () => {
  test("skor / max_points doğru gösterilir", () => {
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario({ scoring: { max_points: 100, passing_score: 50 } })}
        session={makeSession({ floored_score: 75 })}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    // "75" hem skor cell hem de "%75" percent label'da geçer; en az bir match yeterli
    expect(screen.getAllByText(/75/).length).toBeGreaterThan(0);
    expect(screen.getByText(/\/ 100/)).toBeInTheDocument();
  });

  test("adım sayısı completed / total", () => {
    const scenario = makeScenario();
    const session = makeSession({ completed_step_ids: ["s1", "s2"] });
    render(
      <DebriefModal
        open={true}
        scenario={scenario}
        session={session}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    // 2 / 3 adım
    expect(screen.getByText(/\/ 3/)).toBeInTheDocument();
  });

  test("kritik hata varsa kırmızı panel görünür", () => {
    const session = makeSession({
      results: [
        {
          step_id: "s1",
          actions_taken: [{ type: "give_medication", target_id: "asa" }],
          points_earned: -10,
          time_spent_sec: 30,
          critical_errors: 1,
        },
      ],
    });
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={session}
        onRestart={() => undefined}
        onClose={() => undefined}
      />,
    );
    expect(screen.getByText(/Kritik Hata/i)).toBeInTheDocument();
  });
});

describe("DebriefModal — callbacks", () => {
  test("Yeniden Başla butonu onRestart çağırır", () => {
    const onRestart = vi.fn();
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession()}
        onRestart={onRestart}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByTestId("debrief-restart"));
    expect(onRestart).toHaveBeenCalledTimes(1);
  });

  test("Kapat butonu onClose çağırır", () => {
    const onClose = vi.fn();
    render(
      <DebriefModal
        open={true}
        scenario={makeScenario()}
        session={makeSession()}
        onRestart={() => undefined}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByTestId("debrief-close"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
