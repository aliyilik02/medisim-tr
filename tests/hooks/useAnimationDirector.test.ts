// ============================================================
// useAnimationDirector saf mantık testleri
// ============================================================
// Hook'un React/interval makinesi tarayıcı doğrulamasında; burada saf
// parçalar test edilir: görsel-değişim karşılaştırması, olay budaması ve
// motorla (decideAnimation) tick-dizisi entegrasyonu (previous zinciri).
// ============================================================

import { describe, expect, test } from "vitest";
import {
  decisionVisuallyChanged,
  pruneEvents,
} from "@/hooks/useAnimationDirector";
import {
  decideAnimation,
  type AnimationDecision,
  type DirectorEvent,
  type PatientVitals,
} from "@/engine";

const base: AnimationDecision = {
  clip: "laying_idle",
  crossfadeSec: 0.6,
  speed: 1,
  loop: true,
  layer: "base",
  decidedAtSec: 0,
  holdUntilSec: 2,
  reason: "sakin yatış",
};

const calmVitals: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 97, temp: 36.8, rr: 14, pain: 0,
};

describe("decisionVisuallyChanged", () => {
  test("null önceki → her zaman değişti", () => {
    expect(decisionVisuallyChanged(null, base)).toBe(true);
  });

  test("sadece reason/decidedAt/hold değişimi → görsel değişim DEĞİL", () => {
    const b = { ...base, reason: "farklı gerekçe", decidedAtSec: 5, holdUntilSec: 7 };
    expect(decisionVisuallyChanged(base, b)).toBe(false);
  });

  test("klip / hız / loop / crossfade değişimi → değişti", () => {
    expect(decisionVisuallyChanged(base, { ...base, clip: "moaning" })).toBe(true);
    expect(decisionVisuallyChanged(base, { ...base, speed: 0.4 })).toBe(true);
    expect(decisionVisuallyChanged(base, { ...base, loop: false })).toBe(true);
    expect(decisionVisuallyChanged(base, { ...base, crossfadeSec: 0.2 })).toBe(true);
  });

  test("overlay ekleme/çıkarma/ağırlık değişimi → değişti", () => {
    const withOv = { ...base, overlay: { clip: "pain" as const, weight: 0.35 } };
    expect(decisionVisuallyChanged(base, withOv)).toBe(true);
    expect(decisionVisuallyChanged(withOv, base)).toBe(true);
    expect(
      decisionVisuallyChanged(withOv, { ...withOv, overlay: { clip: "pain", weight: 0.45 } }),
    ).toBe(true);
    expect(decisionVisuallyChanged(withOv, { ...withOv })).toBe(false);
  });
});

describe("pruneEvents", () => {
  test("eski olaylar atılır, tazeler kalır", () => {
    const events: DirectorEvent[] = [
      { type: "cough", atSec: 0 },
      { type: "vomiting", atSec: 8 },
      { type: "cough", atSec: 11 },
    ];
    const out = pruneEvents(events, 12); // maxAge 10 → atSec 0 düşer
    expect(out).toHaveLength(2);
    expect(out[0].atSec).toBe(8);
  });

  test("boş liste güvenli", () => {
    expect(pruneEvents([], 5)).toEqual([]);
  });
});

describe("motor entegrasyonu — previous zinciriyle tick dizisi", () => {
  test("sakin → takipne → histerezisle breathless'ta kalır → düzelme", () => {
    // t=0 sakin
    let prev = decideAnimation({ vitals: calmVitals, nowSec: 0, previous: null });
    expect(prev.clip).toBe("laying_idle");

    // t=3 RR 26 → hafif takipne, breathless
    prev = decideAnimation({
      vitals: { ...calmVitals, rr: 26 }, nowSec: 3, previous: prev,
    });
    expect(prev.clip).toBe("laying_breathless");

    // t=6 RR 23'e indi (giriş eşiği 24 altı ama çıkış eşiği 22 üstü) → KALIR
    prev = decideAnimation({
      vitals: { ...calmVitals, rr: 23 }, nowSec: 6, previous: prev,
    });
    expect(prev.clip).toBe("laying_breathless");

    // t=9 RR 16 → çıkış eşiği sağlandı → sakin
    prev = decideAnimation({
      vitals: { ...calmVitals, rr: 16 }, nowSec: 9, previous: prev,
    });
    expect(prev.clip).toBe("laying_idle");
  });

  test("olay defteri: öksürük penceresi kararı ele geçirir, pencere bitince düşer", () => {
    const events: DirectorEvent[] = [{ type: "cough", atSec: 5 }];
    let prev = decideAnimation({ vitals: calmVitals, nowSec: 4, previous: null });
    prev = decideAnimation({ vitals: calmVitals, nowSec: 5.1, previous: prev, events });
    expect(prev.clip).toBe("cough_mild");
    expect(prev.loop).toBe(false);
    // pencere (2.5s) kapandı
    prev = decideAnimation({ vitals: calmVitals, nowSec: 8, previous: prev, events });
    expect(prev.clip).toBe("laying_idle");
  });

  test("varyant fallback — kadında moaning yok → pain'e düşer", () => {
    const d = decideAnimation({
      vitals: { ...calmVitals, pain: 8 },
      nowSec: 0,
      previous: null,
      availableClips: ["laying_idle", "idle", "talk_gesture", "talk_shrug", "pain", "cough_mild", "cough_severe"],
    });
    expect(d.clip).toBe("pain");
  });
});
