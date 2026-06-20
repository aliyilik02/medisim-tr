// ============================================================
// aggregateProgress — öğrenci ilerleme agregasyonu (Tier-2 inc-3)
// ============================================================
// attempts (user bazında) → deneme sayısı / en iyi % / son deneme.
// ============================================================

import { describe, expect, test } from "vitest";
import { aggregateProgress } from "@/pages/InstructorPage";
import type { ClassDetail, ClassAttempt } from "@/api/classes";

function detailWith(attempts: ClassAttempt[]): ClassDetail {
  return {
    class: { id: "c1", name: "S", join_code: "ABC123", created_at: 0, student_count: 0 },
    institution_slug: "okul",
    roster: [],
    attempts,
  };
}

function attempt(p: Partial<ClassAttempt>): ClassAttempt {
  return {
    id: "a",
    user_id: "u1",
    handle: "ali",
    scenario_id: "stemi",
    score: null,
    max_score: null,
    started_at: 0,
    finished_at: null,
    summary_json: null,
    ...p,
  };
}

describe("aggregateProgress", () => {
  test("deneme sayısı, en iyi yüzde ve son deneme doğru hesaplanır", () => {
    const d = detailWith([
      attempt({ id: "1", user_id: "u1", score: 50, max_score: 100, started_at: 100 }),
      attempt({ id: "2", user_id: "u1", score: 90, max_score: 100, started_at: 300 }),
      attempt({ id: "3", user_id: "u1", score: 70, max_score: 100, started_at: 200 }),
    ]);
    const p = aggregateProgress(d);
    expect(p.u1.attempts).toBe(3);
    expect(p.u1.bestPercent).toBe(90); // en yüksek
    expect(p.u1.lastAt).toBe(300); // en son started_at
  });

  test("birden fazla öğrenci ayrı ayrı gruplanır", () => {
    const d = detailWith([
      attempt({ id: "1", user_id: "u1", score: 40, max_score: 100, started_at: 1 }),
      attempt({ id: "2", user_id: "u2", score: 80, max_score: 100, started_at: 2 }),
    ]);
    const p = aggregateProgress(d);
    expect(Object.keys(p)).toHaveLength(2);
    expect(p.u1.bestPercent).toBe(40);
    expect(p.u2.bestPercent).toBe(80);
  });

  test("skoru olmayan deneme bestPercent null bırakır ama sayılır", () => {
    const d = detailWith([
      attempt({ id: "1", user_id: "u1", score: null, max_score: null, started_at: 5 }),
    ]);
    const p = aggregateProgress(d);
    expect(p.u1.attempts).toBe(1);
    expect(p.u1.bestPercent).toBeNull();
    expect(p.u1.lastAt).toBe(5);
  });

  test("max_score 0 → sıfıra bölme yok (bestPercent null)", () => {
    const d = detailWith([
      attempt({ id: "1", user_id: "u1", score: 10, max_score: 0, started_at: 1 }),
    ]);
    const p = aggregateProgress(d);
    expect(p.u1.bestPercent).toBeNull();
  });
});
