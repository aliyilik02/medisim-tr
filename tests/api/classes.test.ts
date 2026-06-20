// ============================================================
// Frontend api/classes — unit testleri (Tier-2 inc-3)
// ============================================================
// fetch mock'lanır; doğru URL/method/body + credentials:'include' +
// hata gövdesinin Türkçe mesaja çevrilmesi doğrulanır.
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

async function importClasses() {
  vi.resetModules();
  return import("@/api/classes");
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("createClass", () => {
  test("POST /api/classes + credentials:'include', class döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes({ class: { id: "c1", name: "Acil", join_code: "ABC123", created_at: 1, student_count: 0 } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createClass } = await importClasses();
    const cls = await createClass("Acil");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test-backend.local/api/classes");
    expect((init as RequestInit).method).toBe("POST");
    expect((init as RequestInit).credentials).toBe("include");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({ name: "Acil" });
    expect(cls.join_code).toBe("ABC123");
  });

  test("hata gövdesi Türkçe mesaja çevrilir (throw)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonRes({ error: "invalid_name", detail: "Sınıf adı ≥2 karakter" }, 400)),
    );
    const { createClass } = await importClasses();
    await expect(createClass("A")).rejects.toThrow("Sınıf adı ≥2 karakter");
  });
});

describe("listClasses", () => {
  test("GET /api/classes, classes dizisi döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonRes({ classes: [{ id: "c1" }, { id: "c2" }] }));
    vi.stubGlobal("fetch", fetchMock);
    const { listClasses } = await importClasses();
    const list = await listClasses();
    expect(list).toHaveLength(2);
    expect((fetchMock.mock.calls[0][1] as RequestInit).method).toBe("GET");
  });
});

describe("getClass", () => {
  test("id URL-encode edilir, detay döner", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes({ class: { id: "c 1" }, institution_slug: "okul", roster: [], attempts: [] }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getClass } = await importClasses();
    const d = await getClass("c 1");
    expect(fetchMock.mock.calls[0][0]).toBe("http://test-backend.local/api/classes/c%201");
    expect(d.institution_slug).toBe("okul");
  });
});

describe("createStudent", () => {
  test("POST /api/classes/:id/students + handle/password gövdesi", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonRes({ student: { id: "s1", handle: "ayse", institution_slug: "okul" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { createStudent } = await importClasses();
    const s = await createStudent("c1", "ayse", "parola1");
    expect(fetchMock.mock.calls[0][0]).toBe("http://test-backend.local/api/classes/c1/students");
    expect(JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string)).toEqual({
      handle: "ayse",
      password: "parola1",
    });
    expect(s.handle).toBe("ayse");
  });
});
