// ============================================================
// ScenarioCard — render + link + meta testleri (Faz 10)
// ============================================================

import { describe, expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ScenarioCard } from "@/components/scenario-list/ScenarioCard";
import { SCENARIOS } from "@/data/scenarios";

function renderInRouter(node: React.ReactElement) {
  return render(<MemoryRouter>{node}</MemoryRouter>);
}

describe("ScenarioCard", () => {
  const stemi = SCENARIOS.find((s) => s.id === "kardiyoloji-stemi-001")!;

  test("title + description görünür", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    expect(screen.getByText(stemi.title)).toBeInTheDocument();
    expect(screen.getByText(stemi.description)).toBeInTheDocument();
  });

  test("iki katman URL'i içerir — 2D /oyna + 3D /hasta", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    const play2d = screen.getByRole("link", { name: /2D Oyna/i });
    const play3d = screen.getByRole("link", { name: /3D Hasta/i });
    expect(play2d.getAttribute("href")).toBe("/oyna/kardiyoloji-stemi-001");
    expect(play3d.getAttribute("href")).toBe("/hasta/kardiyoloji-stemi-001");
  });

  test("zorluk seviyesi aria-label'da", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    const pips = screen.getByLabelText(`Zorluk: ${stemi.difficulty}/5`);
    expect(pips).toBeInTheDocument();
  });

  test("tahmini süre + adım sayısı + max puan render edilir", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    expect(screen.getByText(`~${stemi.estimated_minutes}dk`)).toBeInTheDocument();
    expect(screen.getByText(`${stemi.steps.length} adım`)).toBeInTheDocument();
    expect(screen.getByText(`${stemi.scoring.max_points}p`)).toBeInTheDocument();
  });

  test("senaryo ID büyük harfli olarak görünür", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    expect(
      screen.getByText("KARDIYOLOJI-STEMI-001")
    ).toBeInTheDocument();
  });
});

describe("ScenarioCard — pediatri farklı specialty", () => {
  const bron = SCENARIOS.find((s) => s.id === "pedi-bronsiyolit-001")!;

  test("pediatri başlığı + descriptionyangı yok", () => {
    renderInRouter(<ScenarioCard scenario={bron} />);
    expect(screen.getByText(bron.title)).toBeInTheDocument();
  });

  test("href pediatri senaryosunu hedefler — her iki katman", () => {
    renderInRouter(<ScenarioCard scenario={bron} />);
    expect(
      screen.getByRole("link", { name: /2D Oyna/i }).getAttribute("href")
    ).toBe("/oyna/pedi-bronsiyolit-001");
    expect(
      screen.getByRole("link", { name: /3D Hasta/i }).getAttribute("href")
    ).toBe("/hasta/pedi-bronsiyolit-001");
  });
});
