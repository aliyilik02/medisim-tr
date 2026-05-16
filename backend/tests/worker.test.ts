// ============================================================
// Backend smoke testleri (Sprint B.0)
// ============================================================
// 3 unit:
//   1. GET /api/health → 200 + JSON shape
//   2. POST /api/chat empty body → 400
//   3. POST /api/chat valid body → SSE stream (mock Gemini)
// ============================================================

import { describe, expect, test, vi, beforeEach } from "vitest";

// Gemini SDK'yi mock'la — gerçek API key gerekmeden test ediyoruz.
// `new GoogleGenAI(...)` ile çağrıldığı için class olarak mock'lanmalı.
vi.mock("@google/genai", () => {
  class GoogleGenAI {
    models = {
      generateContentStream: async () =>
        (async function* () {
          yield { text: "Merhaba" };
          yield { text: ", doktor." };
        })(),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(_opts: any) {}
  }
  return { GoogleGenAI };
});

import worker from "../src/index";
import type { Env } from "../src/types";

function makeEnv(): Env {
  // KV namespace'i null-safe stub'la — rate-limit logic env.RATE_LIMIT
  // varsa kontrol eder, yoksa skip. Burada minimal stub.
  const store = new Map<string, string>();
  return {
    GEMINI_API_KEY: "test-key-AIzaSy_stub",
    RATE_LIMIT: {
      get: async (key: string) => store.get(key) ?? null,
      put: async (key: string, value: string) => {
        store.set(key, value);
      },
    } as unknown as KVNamespace,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/health", () => {
  test("200 + JSON shape (status, model, version)", async () => {
    const req = new Request("http://localhost/api/health", {
      method: "GET",
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      status: "ok",
      model: expect.stringMatching(/^gemini-/),
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
    });
  });
});

describe("POST /api/chat — validation", () => {
  test("empty body → 400 invalid_json", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "",
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_json");
  });

  test("missing messages → 400 messages_required", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: "stemi-001",
        patient_persona: "58 yaşında erkek STEMI hasta, retrosternal ağrı 8/10",
      }),
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("messages_required");
  });

  test("kısa patient_persona (< 10 char) → 400", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: "stemi-001",
        patient_persona: "kısa",
        messages: [{ role: "user", content: "selam" }],
      }),
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("invalid_patient_persona");
  });
});

describe("POST /api/chat — happy path (mock Gemini)", () => {
  test("valid body → 200 SSE stream başlar, text chunk gelir", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: "stemi-001",
        patient_persona:
          "58 yaşında erkek hasta, STEMI, retrosternal ağrı 8/10, anksiyeteli",
        messages: [{ role: "user", content: "Adınız ne?" }],
      }),
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toMatch(/text\/event-stream/);
    expect(res.body).not.toBeNull();

    // Stream'i oku, en az 1 text chunk gelmiş mi doğrula
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let received = "";
    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (result.value) {
        received += decoder.decode(result.value, { stream: true });
      }
    }
    expect(received).toContain("data:");
    expect(received).toContain("Merhaba");
    expect(received).toContain('"done":true');
  });
});

describe("OPTIONS preflight", () => {
  test("204 + Access-Control-Allow-* headers for allowed origin", async () => {
    const req = new Request("http://localhost/api/chat", {
      method: "OPTIONS",
      headers: { Origin: "http://localhost:5173" },
    });
    const res = await worker.fetch(req, makeEnv(), {} as ExecutionContext);
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "http://localhost:5173",
    );
  });
});
