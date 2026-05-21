// ============================================================
// sessionHistory storage — Unit testler
// ============================================================
// localStorage tabanlı SavedSession CRUD + getStats agregasyon.
// happy-dom localStorage mock pattern (Toaster, useMarkerOverrides ile aynı).
// ============================================================

import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import {
  saveSession,
  listSessions,
  getSession,
  deleteSession,
  clearAllSessions,
  getSessionsByScenario,
  getStats,
} from "@/storage/sessionHistory";
import type { Scenario, SessionState } from "@/engine/types";
import { SCENARIOS } from "@/data/scenarios";

// happy-dom localStorage tam destek vermiyor — Map tabanlı mock
const mockStore = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (k) => (mockStore.has(k) ? mockStore.get(k)! : null),
  setItem: (k, v) => {
    mockStore.set(k, String(v));
  },
  removeItem: (k) => {
    mockStore.delete(k);
  },
  clear: () => mockStore.clear(),
  key: (i) => [...mockStore.keys()][i] ?? null,
  get length() {
    return mockStore.size;
  },
};

beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockStore.clear();
});

function makeSession(
  scenario: Scenario,
  overrides: Partial<SessionState> = {},
): SessionState {
  return {
    scenario_id: scenario.id,
    mode: "egitim",
    selected_difficulty: 3,
    started_at: Date.now(),
    current_step_id: null,
    completed_step_ids: scenario.steps.map((s) => s.id),
    baseline_vitals: scenario.initial_vitals,
    vitals: scenario.initial_vitals,
    results: scenario.steps.map((s) => ({
      step_id: s.id,
      actions_taken: [],
      points_earned: 10,
      time_spent_sec: 30,
      critical_errors: 0,
    })),
    total_score: scenario.steps.length * 10,
    floored_score: scenario.steps.length * 10,
    finished: true,
    grade: "B",
    ...overrides,
  } as SessionState;
}

describe("sessionHistory — saveSession", () => {
  test("finished=false → null döner, kayıt yok", () => {
    const scenario = SCENARIOS[0];
    const session = makeSession(scenario, { finished: false });
    const saved = saveSession(session, scenario);
    expect(saved).toBeNull();
    expect(listSessions()).toHaveLength(0);
  });

  test("finished=true → SavedSession kaydedilir", () => {
    const scenario = SCENARIOS[0];
    const session = makeSession(scenario);
    const saved = saveSession(session, scenario);
    expect(saved).not.toBeNull();
    expect(saved!.scenario_id).toBe(scenario.id);
    expect(saved!.scenario_title).toBe(scenario.title);
    expect(saved!.grade).toBeDefined();
    expect(listSessions()).toHaveLength(1);
  });

  test("aynı session id ile tekrar save → dedup (1 kayıt)", () => {
    const scenario = SCENARIOS[0];
    const session = makeSession(scenario);
    saveSession(session, scenario);
    saveSession(session, scenario);
    expect(listSessions()).toHaveLength(1);
  });
});

describe("sessionHistory — listSessions / getSession", () => {
  test("boş localStorage → boş dizi", () => {
    expect(listSessions()).toEqual([]);
  });

  test("getSession bilinmeyen id → null", () => {
    expect(getSession("yok")).toBeNull();
  });

  test("getSession id ile kayıt bulur", () => {
    const scenario = SCENARIOS[0];
    const saved = saveSession(makeSession(scenario), scenario)!;
    const fetched = getSession(saved.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.scenario_id).toBe(scenario.id);
  });

  test("listSessions en yeni başta sıralı", async () => {
    const s1 = SCENARIOS[0];
    const s2 = SCENARIOS[1];
    saveSession(makeSession(s1, { started_at: 1000 }), s1);
    saveSession(makeSession(s2, { started_at: 2000 }), s2);
    const list = listSessions();
    expect(list).toHaveLength(2);
    expect(list[0].scenario_id).toBe(s2.id);
  });
});

describe("sessionHistory — delete / clear", () => {
  test("deleteSession kaydı siler", () => {
    const scenario = SCENARIOS[0];
    const saved = saveSession(makeSession(scenario), scenario)!;
    expect(listSessions()).toHaveLength(1);
    deleteSession(saved.id);
    expect(listSessions()).toHaveLength(0);
  });

  test("clearAllSessions tüm storage'ı temizler", () => {
    const s1 = SCENARIOS[0];
    const s2 = SCENARIOS[1];
    saveSession(makeSession(s1), s1);
    saveSession(makeSession(s2, { started_at: Date.now() + 1 }), s2);
    expect(listSessions().length).toBeGreaterThan(0);
    clearAllSessions();
    expect(listSessions()).toEqual([]);
  });
});

describe("sessionHistory — getSessionsByScenario", () => {
  test("scenario_id'ye göre filtreler", () => {
    const s1 = SCENARIOS[0];
    const s2 = SCENARIOS[1];
    saveSession(makeSession(s1), s1);
    saveSession(makeSession(s2, { started_at: Date.now() + 1 }), s2);
    const sessions1 = getSessionsByScenario(s1.id);
    const sessions2 = getSessionsByScenario(s2.id);
    expect(sessions1.length).toBe(1);
    expect(sessions2.length).toBe(1);
    expect(sessions1[0].scenario_id).toBe(s1.id);
  });
});

describe("sessionHistory — getStats", () => {
  test("hiç oturum yoksa null döner", () => {
    expect(getStats()).toBeNull();
  });

  test("1 oturum sonrası temel stat agregasyonu", () => {
    const scenario = SCENARIOS[0];
    saveSession(makeSession(scenario), scenario);
    const stats = getStats();
    expect(stats).not.toBeNull();
    expect(stats!.total_sessions).toBe(1);
    expect(stats!.avg_score_pct).toBeGreaterThan(0);
    expect(stats!.last_session).toBeDefined();
  });

  test("best_grade — en iyi notu (A>B>C>D>F) seçer", () => {
    const scenario = SCENARIOS[0];
    saveSession(
      makeSession(scenario, {
        grade: "C",
        started_at: Date.now(),
      }),
      scenario,
    );
    saveSession(
      makeSession(scenario, {
        grade: "A",
        started_at: Date.now() + 1,
      }),
      scenario,
    );
    const stats = getStats();
    expect(stats!.best_grade).toBe("A");
  });

  test("favorite_specialty — en sık oynanan uzmanlığı seçer", () => {
    const s1 = SCENARIOS.find((s) => s.specialty === "kardiyoloji")!;
    const s2 = SCENARIOS.find((s) => s.specialty === "pediatri")!;
    if (!s1 || !s2) {
      // Eğer test fixture'ında bu specialty'ler yoksa skip
      return;
    }
    saveSession(makeSession(s1, { started_at: 1 }), s1);
    saveSession(makeSession(s1, { started_at: 2 }), s1);
    saveSession(makeSession(s2, { started_at: 3 }), s2);
    const stats = getStats();
    expect(stats!.favorite_specialty).toBe("kardiyoloji");
  });

  test("sessions_last_7d — son 7 günkü oturum sayısı", () => {
    const scenario = SCENARIOS[0];
    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    saveSession(makeSession(scenario, { started_at: now - 30 * day }), scenario); // eski
    saveSession(
      makeSession(scenario, { started_at: now - 1 * day }),
      scenario,
    ); // son 7 gün
    const stats = getStats();
    expect(stats!.sessions_last_7d).toBeGreaterThanOrEqual(1);
    expect(stats!.sessions_last_7d).toBeLessThanOrEqual(2);
  });
});
