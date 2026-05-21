// ============================================================
// ActionHistoryPanel — Unit testler (Sprint B.5+)
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  ActionHistoryPanel,
  type ActionLogEntry,
} from "@/components/dialog/ActionHistoryPanel";
import type { ActionRef } from "@/engine/types";

function entry(overrides: Partial<ActionLogEntry> = {}): ActionLogEntry {
  const action: ActionRef = {
    type: "procedure",
    target_id: "stethoscope",
    site: "chest-aortic",
  };
  return {
    action,
    points: 5,
    feedback: "Test feedback metni",
    critical: false,
    matched: true,
    ts: Date.now(),
    ...overrides,
  };
}

describe("ActionHistoryPanel — render", () => {
  test("entries boşken empty state göstergesi", () => {
    render(<ActionHistoryPanel entries={[]} />);
    expect(screen.getByTestId("action-history-panel")).toBeInTheDocument();
    expect(screen.getByText(/Henüz eylem yok/i)).toBeInTheDocument();
  });

  test("tek entry render edilir + count gösterilir", () => {
    render(<ActionHistoryPanel entries={[entry()]} />);
    const items = screen.getAllByTestId("action-history-entry");
    expect(items).toHaveLength(1);
    expect(screen.getByText(/Eylem Geçmişi \(1\)/i)).toBeInTheDocument();
  });

  test("birden çok entry sayısı doğru", () => {
    const entries = [entry(), entry({ points: -5, matched: false }), entry()];
    render(<ActionHistoryPanel entries={entries} />);
    expect(screen.getAllByTestId("action-history-entry")).toHaveLength(3);
  });
});

describe("ActionHistoryPanel — kind ve renk", () => {
  test("+puan + matched → +N label görünür", () => {
    render(
      <ActionHistoryPanel entries={[entry({ points: 12, matched: true })]} />,
    );
    expect(screen.getByText(/^\+12$/)).toBeInTheDocument();
  });

  test("-puan → negatif label", () => {
    render(
      <ActionHistoryPanel
        entries={[entry({ points: -7, matched: false })]}
      />,
    );
    expect(screen.getByText(/^-7$/)).toBeInTheDocument();
  });

  test("critical → KRİTİK label", () => {
    render(
      <ActionHistoryPanel
        entries={[entry({ critical: true, points: -15 })]}
      />,
    );
    expect(screen.getByText(/KRİTİK/i)).toBeInTheDocument();
  });

  test("0 puan + matched değil → notr (—)", () => {
    render(
      <ActionHistoryPanel
        entries={[entry({ points: 0, matched: false, critical: false })]}
      />,
    );
    expect(screen.getByText(/^—$/)).toBeInTheDocument();
  });
});

describe("ActionHistoryPanel — feedback ve action target", () => {
  test("feedback metni gösterilir", () => {
    render(
      <ActionHistoryPanel
        entries={[entry({ feedback: "Aortik odakta doğru oskültasyon noktası" })]}
      />,
    );
    expect(
      screen.getByText(/Aortik odakta doğru oskültasyon noktası/i),
    ).toBeInTheDocument();
  });

  test("action target + site label'ında görünür", () => {
    render(<ActionHistoryPanel entries={[entry()]} />);
    expect(screen.getByText(/stethoscope/)).toBeInTheDocument();
    expect(screen.getByText(/@ chest-aortic/i)).toBeInTheDocument();
  });
});
