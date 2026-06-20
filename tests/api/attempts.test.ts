// ============================================================
// Frontend api/attempts — unit testleri (Tier-2 inc-3)
// ============================================================

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

const ORIGINAL_ENV = import.meta.env.VITE_BACKEND_URL;
beforeEach(() => {
  (import.meta.env as Record<string, string>).VITE_BACKEND_URL = "http://test-backend.local";
});
afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete (import.meta.env as Record<string, string | undefined>).VITE_BACKEND_URL;
  } else {
    (import.meta.env as Record<string, string>).VITE_BACKEND_URL = ORIGINAL_ENV;
  }
  vi.unstubAllGlobals();
});

async function importAttempts() {
  vi.resetModules();
  return import("@/api/attempts");
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("submitAttempt", () => {
  test("POST /api/attempts + credentials:'include', attempt id döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ attempt: { id: "a1" } }));
    vi.stubGlobal("fetch", fetchMock);
    const { submitAttempt } = await importAttempts();
    const id = await submitAttempt({
      scenario_id: "stemi",
      score: 80,
      max_score: 100,
      started_at: 1000,
      finished_at: 1300,
      summary_json: { grade: "B" },
    });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test-backend.local/api/attempts");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.scenario_id).toBe("stemi");
    expect(body.summary_json).toEqual({ grade: "B" });
    expect(id).toBe("a1");
  });

  test("backend hata → Türkçe mesaj throw", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonRes({ error: "scenario_required", detail: "scenario_id gerekli" }, 400)),
    );
    const { submitAttempt } = await importAttempts();
    await expect(submitAttempt({ scenario_id: "", started_at: 1 })).rejects.toThrow("scenario_id gerekli");
  });
});

describe("listMyAttempts", () => {
  test("GET /api/attempts, attempts dizisi döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ attempts: [{ id: "a1", scenario_id: "x" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { listMyAttempts } = await importAttempts();
    const list = await listMyAttempts();
    expect(list).toHaveLength(1);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("GET");
  });
});
