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

  test("doğru oyna URL'i içerir", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    // Kart 2 link içerir: ana /oyna ve sağ üst /dialog-3d-demo
    const oynaLink = screen.getByRole("link", {
      name: /klasik modda aç/i,
    });
    expect(oynaLink.getAttribute("href")).toBe("/oyna/kardiyoloji-stemi-001");
  });

  test("3D Hasta linki /dialog-3d-demo?scenario=... olarak görünür", () => {
    renderInRouter(<ScenarioCard scenario={stemi} />);
    const link3d = screen.getByRole("link", { name: /3D hasta modu/i });
    expect(link3d.getAttribute("href")).toBe(
      "/dialog-3d-demo?scenario=kardiyoloji-stemi-001",
    );
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

  test("href pediatri senaryosunu hedefler", () => {
    renderInRouter(<ScenarioCard scenario={bron} />);
    const oynaLink = screen.getByRole("link", { name: /klasik modda aç/i });
    expect(oynaLink.getAttribute("href")).toBe("/oyna/pedi-bronsiyolit-001");
  });
});
