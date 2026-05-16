// ============================================================
// Frontend transport — backend.ts unit testleri (Sprint B.0)
// ============================================================
// 2 smoke:
//   1. streamChat doğru URL/body ile fetch çağırır + ReadableStream döner
//   2. checkBackendHealth 200'de true, hata'da false
// ============================================================

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

// import.meta.env.VITE_BACKEND_URL'i stub'la. Vite test environment'da
// genelde undefined; explicit set ediyoruz.
const ORIGINAL_ENV = import.meta.env.VITE_BACKEND_URL;
beforeEach(() => {
  (import.meta.env as Record<string, string>).VITE_BACKEND_URL =
    "http://test-backend.local";
});
afterEach(() => {
  if (ORIGINAL_ENV === undefined) {
    delete (import.meta.env as Record<string, string | undefined>)
      .VITE_BACKEND_URL;
  } else {
    (import.meta.env as Record<string, string>).VITE_BACKEND_URL =
      ORIGINAL_ENV;
  }
  vi.unstubAllGlobals();
});

async function importBackend() {
  // Module env reading happens at import time → re-import per test
  vi.resetModules();
  return import("@/api/backend");
}

describe("streamChat", () => {
  test("doğru URL + body ile fetch çağırır, ReadableStream döner", async () => {
    const fakeStream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode('data: {"text":"hi"}\n\n'));
        c.close();
      },
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(fakeStream, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { streamChat } = await importBackend();
    const params = {
      scenario_id: "stemi-001",
      patient_persona:
        "58 yaşında erkek STEMI hasta, retrosternal ağrı 8/10, anksiyeteli",
      messages: [{ role: "user" as const, content: "Adınız ne?" }],
    };
    const stream = await streamChat(params);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("http://test-backend.local/api/chat");
    expect((init as RequestInit).method).toBe("POST");
    expect(JSON.parse((init as RequestInit).body as string)).toEqual(params);
    expect(stream).toBeInstanceOf(ReadableStream);
  });

  test("backend 400 dönerse error detail ile throw eder", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({ error: "messages_required", detail: "messages boş" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { streamChat } = await importBackend();
    await expect(
      streamChat({
        scenario_id: "x",
        patient_persona: "yeterince uzun persona metni",
        messages: [],
      }),
    ).rejects.toThrow(/Backend 400/);
  });
});

describe("checkBackendHealth", () => {
  test("200 OK → true", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("{}", { status: 200 })),
    );
    const { checkBackendHealth } = await importBackend();
    expect(await checkBackendHealth()).toBe(true);
  });

  test("network hatası → false (throw etmez)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")),
    );
    const { checkBackendHealth } = await importBackend();
    expect(await checkBackendHealth()).toBe(false);
  });

  test("VITE_BACKEND_URL boşken → false", async () => {
    delete (import.meta.env as Record<string, string | undefined>)
      .VITE_BACKEND_URL;
    const { checkBackendHealth } = await importBackend();
    expect(await checkBackendHealth()).toBe(false);
  });
});
