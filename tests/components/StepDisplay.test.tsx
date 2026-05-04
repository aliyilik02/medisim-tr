// ============================================================
// StepDisplay — info / decision-single / decision-multi (Faz 10)
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StepDisplay } from "@/components/StepDisplay";
import type { Step, DecisionOption } from "@/engine";

function infoStep(): Step {
  return {
    id: "s_info",
    kind: "info",
    title: "Brifing",
    prompt: "Hastayı tanıyalım",
    content: "62y erkek, retrosternal göğüs ağrısı.",
  };
}

const optionsSingle: DecisionOption[] = [
  { id: "opt_a", text: "Aspirin yükle", correct: true, points: 10, feedback: "Doğru: STEMI'de ASA önce" },
  { id: "opt_b", text: "Beta-bloker IV ver", correct: false, points: -5, feedback: "Yanlış: hemodinamik henüz değerlendirilmedi" },
];

function decisionStep(allow_multiple = false): Step {
  return {
    id: "s_decision",
    kind: "decision",
    title: "İlk reperfüzyon ajanı",
    prompt: "Hangi antiagreganti önce verirsiniz?",
    options: optionsSingle,
    allow_multiple,
  };
}

describe("StepDisplay — InfoStep", () => {
  test("info içeriği + Devam butonu render", () => {
    render(
      <StepDisplay
        step={infoStep()}
        mode="egitim"
        actionsThisStep={0}
        onInfoContinue={() => {}}
      />
    );
    expect(screen.getByText("Brifing")).toBeInTheDocument();
    expect(screen.getByText(/retrosternal göğüs ağrısı/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Devam/ })).toBeInTheDocument();
  });

  test("Devam butonuna tıklayınca callback çalışır", () => {
    const cb = vi.fn();
    render(
      <StepDisplay
        step={infoStep()}
        mode="egitim"
        actionsThisStep={0}
        onInfoContinue={cb}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Devam/ }));
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe("StepDisplay — DecisionStep (tekli)", () => {
  test("seçenekler render edilir", () => {
    render(
      <StepDisplay
        step={decisionStep(false)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionSelect={() => {}}
      />
    );
    expect(screen.getByText(/Aspirin yükle/)).toBeInTheDocument();
    expect(screen.getByText(/Beta-bloker IV/)).toBeInTheDocument();
  });

  test("seçeneğe tıklayınca onDecisionSelect tetiklenir", () => {
    const cb = vi.fn();
    render(
      <StepDisplay
        step={decisionStep(false)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionSelect={cb}
      />
    );
    fireEvent.click(screen.getByText(/Aspirin yükle/));
    expect(cb).toHaveBeenCalledWith(
      expect.objectContaining({ id: "opt_a", correct: true })
    );
  });

  test("decisionAnswered set ise feedback gösterilir (egitim)", () => {
    render(
      <StepDisplay
        step={decisionStep(false)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionSelect={() => {}}
        decisionAnswered={{ optionId: "opt_a", feedback: "Doğru: STEMI'de ASA önce" }}
      />
    );
    expect(screen.getByText(/Doğru: STEMI'de ASA önce/)).toBeInTheDocument();
  });

  test("sınav modunda feedback gizlenir", () => {
    render(
      <StepDisplay
        step={decisionStep(false)}
        mode="sinav"
        actionsThisStep={0}
        onDecisionSelect={() => {}}
        decisionAnswered={{ optionId: "opt_a", feedback: "Doğru: STEMI'de ASA önce" }}
      />
    );
    expect(screen.queryByText(/Doğru: STEMI'de ASA önce/)).not.toBeInTheDocument();
  });
});

describe("StepDisplay — DecisionStep (çoklu)", () => {
  test("checkbox grup render", () => {
    render(
      <StepDisplay
        step={decisionStep(true)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionMultiConfirm={() => {}}
      />
    );
    const boxes = screen.getAllByRole("checkbox");
    expect(boxes).toHaveLength(2);
  });

  test("seçim yapıp Onayla'ya tıklayınca seçili id'ler döner", () => {
    const cb = vi.fn();
    render(
      <StepDisplay
        step={decisionStep(true)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionMultiConfirm={cb}
      />
    );
    const boxes = screen.getAllByRole("checkbox");
    fireEvent.click(boxes[0]);
    fireEvent.click(boxes[1]);
    fireEvent.click(screen.getByRole("button", { name: /Seçimi Onayla/ }));
    expect(cb).toHaveBeenCalledTimes(1);
    const ids = cb.mock.calls[0][0] as string[];
    expect(ids.sort()).toEqual(["opt_a", "opt_b"]);
  });

  test("hiçbir seçim yokken Onayla butonu disabled", () => {
    render(
      <StepDisplay
        step={decisionStep(true)}
        mode="egitim"
        actionsThisStep={0}
        onDecisionMultiConfirm={() => {}}
      />
    );
    const btn = screen.getByRole("button", { name: /Seçimi Onayla/ });
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });
});
