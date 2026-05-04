// ============================================================
// DifficultySelector — interaction testleri (Faz 10)
// ============================================================

import { describe, expect, test, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DifficultySelector } from "@/components/DifficultySelector";
import type { Difficulty } from "@/engine";

describe("DifficultySelector — temel render", () => {
  test("5 seviye butonu render edilir", () => {
    render(
      <DifficultySelector
        supported={[1, 2, 3, 4, 5]}
        selected={3}
        onSelect={() => {}}
      />
    );
    for (const n of ["1", "2", "3", "4", "5"]) {
      expect(screen.getByText(n)).toBeInTheDocument();
    }
  });

  test("desteklenmeyen seviye disabled", () => {
    render(
      <DifficultySelector
        supported={[2, 3, 4]}
        selected={3}
        onSelect={() => {}}
      />
    );
    const buttons = screen.getAllByRole("button");
    const labels = buttons.map((b) => ({
      label: b.textContent ?? "",
      disabled: (b as HTMLButtonElement).disabled,
    }));
    const lvl1 = labels.find((l) => l.label.includes("1"));
    const lvl5 = labels.find((l) => l.label.includes("5"));
    expect(lvl1?.disabled).toBe(true);
    expect(lvl5?.disabled).toBe(true);
  });

  test("seçili seviyenin audience metni gösterilir", () => {
    render(
      <DifficultySelector
        supported={[1, 2, 3, 4, 5]}
        selected={4}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText(/Kardiyoloji asistanı/)).toBeInTheDocument();
  });
});

describe("DifficultySelector — interaction", () => {
  test("desteklenen seviyeye tıklayınca onSelect tetiklenir", () => {
    const onSelect = vi.fn();
    render(
      <DifficultySelector
        supported={[1, 2, 3, 4, 5]}
        selected={3}
        onSelect={onSelect}
      />
    );
    const buttons = screen.getAllByRole("button");
    const lvl5 = buttons.find((b) => b.textContent?.includes("5"))!;
    fireEvent.click(lvl5);
    expect(onSelect).toHaveBeenCalledWith(5 as Difficulty);
  });

  test("desteklenmeyen seviyeye tıklamak onSelect'i tetiklemez", () => {
    const onSelect = vi.fn();
    render(
      <DifficultySelector
        supported={[2, 3]}
        selected={2}
        onSelect={onSelect}
      />
    );
    const buttons = screen.getAllByRole("button");
    const lvl5 = buttons.find((b) => b.textContent?.includes("5"))!;
    fireEvent.click(lvl5);
    expect(onSelect).not.toHaveBeenCalled();
  });

  test("seçili seviye supported listesinde değilse 'Bir seviye seçin' fallback", () => {
    render(
      <DifficultySelector
        supported={[3, 4]}
        selected={1}
        onSelect={() => {}}
      />
    );
    expect(screen.getByText(/Bir seviye seçin/)).toBeInTheDocument();
  });
});
