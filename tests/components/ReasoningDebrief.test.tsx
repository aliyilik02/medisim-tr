// ============================================================
// ReasoningDebrief — debrief Klinik Muhakeme bölümü render
// ============================================================
// İzole render (ağır DebriefScreen/AIDebriefPanel/auth olmadan).
// ReasoningDebrief yalnız session.mode + session.reasoning_answers okur.

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReasoningDebrief } from "@/components/DebriefScreen";
import { getScenario } from "@/data/scenarios";
import type { SessionState } from "@/engine";

const scenario = getScenario("kardiyoloji-stemi-001")!;

// ReasoningDebrief sadece mode + reasoning_answers okur → minimal cast yeterli.
function session(mode: SessionState["mode"], answers: SessionState["reasoning_answers"]): SessionState {
  return { mode, reasoning_answers: answers } as SessionState;
}

describe("ReasoningDebrief", () => {
  test("egitim + cevap → bölüm render (soru + ✓ + açıklama + kaynak)", () => {
    render(
      <ReasoningDebrief
        scenario={scenario}
        session={session("egitim", [
          { prompt_id: "rp-aspirin", selected_index: 0, correct: true, answered_at: 0 },
        ])}
      />,
    );
    expect(screen.getByTestId("reasoning-debrief")).toBeInTheDocument();
    expect(screen.getByText(/Neden aspirin/)).toBeInTheDocument();
    expect(screen.getByText(/trombolitik \(pıhtı eritici\) DEĞİLDİR/)).toBeInTheDocument(); // explanation
    expect(screen.getByText(/Kaynak:.*ISIS-2/)).toBeInTheDocument(); // source (Kaynak: prefix tekil)
    expect(screen.getByText(/Senin gerekçen:/)).toBeInTheDocument();
  });

  test("yanlış cevap → öğretici 'Aksiyonun doğruydu' + doğru gerekçe", () => {
    render(
      <ReasoningDebrief
        scenario={scenario}
        session={session("egitim", [
          { prompt_id: "rp-oksijen", selected_index: 1, correct: false, answered_at: 0 },
        ])}
      />,
    );
    expect(screen.getByText(/Aksiyonun doğruydu/)).toBeInTheDocument();
    // doğru gerekçe (rutin gerekmez) gösterilir
    expect(screen.getByText(/rutin oksijen GEREKMEZ/i)).toBeInTheDocument();
  });

  test("klinik modunda → bölüm RENDER EDİLMEZ (null)", () => {
    render(
      <ReasoningDebrief
        scenario={scenario}
        session={session("klinik", [
          { prompt_id: "rp-aspirin", selected_index: 0, correct: true, answered_at: 0 },
        ])}
      />,
    );
    expect(screen.queryByTestId("reasoning-debrief")).not.toBeInTheDocument();
  });

  test("sinav modunda → bölüm RENDER EDİLMEZ", () => {
    render(
      <ReasoningDebrief
        scenario={scenario}
        session={session("sinav", [
          { prompt_id: "rp-aspirin", selected_index: 0, correct: true, answered_at: 0 },
        ])}
      />,
    );
    expect(screen.queryByTestId("reasoning-debrief")).not.toBeInTheDocument();
  });

  test("egitim ama cevap yok → bölüm RENDER EDİLMEZ", () => {
    render(<ReasoningDebrief scenario={scenario} session={session("egitim", [])} />);
    expect(screen.queryByTestId("reasoning-debrief")).not.toBeInTheDocument();
  });
});
