// ============================================================
// summarizeAttempts — öğrenci ilerleme agregasyonu (Tier-2 inc-3+)
// ============================================================

import { describe, expect, test } from "vitest";
import { summarizeAttempts } from "@/pages/StudentProgressPage";
import type { AttemptRecord } from "@/api/attempts";

function rec(p: Partial<AttemptRecord>): AttemptRecord {
  return {
    id: "a",
    scenario_id: "bilinmeyen-senaryo-xyz",
    score: null,
    max_score: null,
    started_at: 0,
    finished_at: null,
    summary_json: null,
    ...p,
  };
}

describe("summarizeAttempts", () => {
  test("yüzde, ortalama ve en iyi doğru hesaplanır", () => {
    const { views, stats } = summarizeAttempts([
      rec({ id: "1", score: 50, max_score: 100, started_at: 1 }),
      rec({ id: "2", score: 90, max_score: 100, started_at: 2 }),
    ]);
    expect(stats.total).toBe(2);
    expect(stats.avgPercent).toBe(70);
    expect(stats.bestPercent).toBe(90);
    expect(views[0].percent).toBe(50);
  });

  test("bilinmeyen scenario_id başlığa fallback eder", () => {
    const { views } = summarizeAttempts([rec({ scenario_id: "bilinmeyen-senaryo-xyz" })]);
    expect(views[0].title).toBe("bilinmeyen-senaryo-xyz");
  });

  test("grade summary_json'dan parse edilir, bozuksa null", () => {
    const { views } = summarizeAttempts([
      rec({ id: "1", summary_json: JSON.stringify({ grade: "B" }) }),
      rec({ id: "2", summary_json: "bozuk-json{" }),
      rec({ id: "3", summary_json: null }),
    ]);
    expect(views[0].grade).toBe("B");
    expect(views[1].grade).toBeNull();
    expect(views[2].grade).toBeNull();
  });

  test("skoru olmayan/max_score 0 → percent null, ortalamaya katılmaz", () => {
    const { views, stats } = summarizeAttempts([
      rec({ id: "1", score: 80, max_score: 100, started_at: 1 }),
      rec({ id: "2", score: 5, max_score: 0, started_at: 2 }),
      rec({ id: "3", score: null, max_score: null, started_at: 3 }),
    ]);
    expect(views[1].percent).toBeNull();
    expect(views[2].percent).toBeNull();
    expect(stats.avgPercent).toBe(80); // sadece geçerli olan
    expect(stats.total).toBe(3);
  });

  test("boş liste → null istatistikler", () => {
    const { stats } = summarizeAttempts([]);
    expect(stats).toEqual({ total: 0, avgPercent: null, bestPercent: null });
  });
});
