// ============================================================
// HD TTS — saf parça testleri (6 Tem sesli diyalog)
// ============================================================
// pcm16ToAudioBuffer: base64 PCM s16le → AudioBuffer örnek dönüşümü.
// validateTtsRequest: backend maliyet korumaları (bayrak testi handler'da
// env gerektirir — burada saf doğrulayıcı test edilir).
// ============================================================

import { describe, expect, test } from "vitest";
import { pcm16ToAudioBuffer } from "@/hooks/useTextToSpeech";
import { validateTtsRequest } from "../../backend/src/handlers/tts";

// Minimal AudioContext stub — createBuffer + getChannelData yeterli.
function fakeCtx() {
  return {
    createBuffer(_ch: number, length: number, sampleRate: number) {
      const data = new Float32Array(length);
      return {
        length,
        sampleRate,
        getChannelData: () => data,
      } as unknown as AudioBuffer;
    },
  } as unknown as AudioContext;
}

describe("pcm16ToAudioBuffer", () => {
  test("s16le örnekler [-1,1] float'a normalize edilir", () => {
    // 3 örnek: 0, +16384 (0.5), -32768 (-1.0)
    const samples = new Int16Array([0, 16384, -32768]);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(samples.buffer)));
    const buf = pcm16ToAudioBuffer(fakeCtx(), b64, 24000);
    const ch = buf.getChannelData(0);
    expect(buf.length).toBe(3);
    expect(buf.sampleRate).toBe(24000);
    expect(ch[0]).toBeCloseTo(0, 5);
    expect(ch[1]).toBeCloseTo(0.5, 3);
    expect(ch[2]).toBeCloseTo(-1.0, 5);
  });

  test("tek bayt artığı (yarım örnek) güvenle atılır", () => {
    const bytes = new Uint8Array([0, 0, 255]); // 1.5 örnek
    const b64 = btoa(String.fromCharCode(...bytes));
    const buf = pcm16ToAudioBuffer(fakeCtx(), b64, 24000);
    expect(buf.length).toBe(1);
  });
});

describe("validateTtsRequest — maliyet korumaları", () => {
  test("geçerli metin kabul", () => {
    expect(validateTtsRequest({ text: "Göğsümde baskı var doktor bey." }).ok).toBe(true);
  });
  test("boş/eksik metin ret", () => {
    expect(validateTtsRequest({}).ok).toBe(false);
    expect(validateTtsRequest({ text: "   " }).ok).toBe(false);
    expect(validateTtsRequest(null).ok).toBe(false);
  });
  test("300 karakter üstü ret (maliyet koruması)", () => {
    const r = validateTtsRequest({ text: "a".repeat(301) });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("text_too_long");
  });
});
