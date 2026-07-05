// ============================================================
// Animation Director unit testleri — katmanlı öncelik + histerezis
// ============================================================
// Saf motor: deterministik, simüle zamanlı (Date.now YOK).
// ============================================================

import { describe, expect, test } from "vitest";
import type { PatientVitals, PhaseSignal } from "@/engine";
import {
  decideAnimation,
  resolveDirectorClip,
  describeAnimationDecision,
  DEFAULT_MIN_HOLD_SEC,
  type AnimationDecision,
  type DirectorInput,
} from "@/engine/animation-director";

const base: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 98, temp: 36.8, rr: 14, pain: 0, gcs: 15,
};

function makePhase(over: Partial<PhaseSignal> = {}): PhaseSignal {
  return {
    phaseId: "test",
    phaseIndex: 0,
    ekg: "sinus",
    heartSound: "normal",
    visual: {},
    recovering: false,
    ...over,
  };
}

function decide(over: Partial<DirectorInput> = {}): AnimationDecision {
  return decideAnimation({ vitals: base, nowSec: 0, ...over });
}

// ------------------------------------------------------------
// Katman öncelik sıralaması
// ------------------------------------------------------------

describe("decideAnimation — katman öncelikleri", () => {
  test("normal vital → taban sakin yatış (loop, hız 1)", () => {
    const d = decide();
    expect(d.clip).toBe("laying_idle");
    expect(d.layer).toBe("base");
    expect(d.loop).toBe(true);
    expect(d.speed).toBe(1);
  });

  test("SpO2 < 88 → süreğen nefes darlığı (hızlı solunum)", () => {
    const d = decide({ vitals: { ...base, spo2: 84 } });
    expect(d.clip).toBe("laying_breathless");
    expect(d.layer).toBe("state");
    expect(d.speed).toBeGreaterThan(1);
  });

  test("RR ≥ 30 → nefes darlığı", () => {
    expect(decide({ vitals: { ...base, rr: 32 } }).clip).toBe("laying_breathless");
  });

  test("şiddetli ağrı (≥7) → inleme", () => {
    expect(decide({ vitals: { ...base, pain: 8 } }).clip).toBe("moaning");
  });

  test("hafif takipne (RR ≥ 24) → nefes darlığı, orta ağrı (≥4) → inleme", () => {
    expect(decide({ vitals: { ...base, rr: 26 } }).clip).toBe("laying_breathless");
    expect(decide({ vitals: { ...base, pain: 5 } }).clip).toBe("moaning");
  });

  test("ağır solunum sıkıntısı > şiddetli ağrı (state içi sıra)", () => {
    const d = decide({ vitals: { ...base, spo2: 84, pain: 9 } });
    expect(d.clip).toBe("laying_breathless");
  });

  test("olay katmanı süreğen durumu keser: öksürük > nefes darlığı", () => {
    const d = decide({
      vitals: { ...base, spo2: 84 },
      events: [{ type: "cough", atSec: 0 }],
    });
    expect(d.layer).toBe("event");
    expect(d.clip).toBe("cough_severe"); // SpO2 düşük → şiddetli eğilim
    expect(d.loop).toBe(false);
  });

  test("SpO2 normalken öksürük hafif", () => {
    const d = decide({ events: [{ type: "cough", atSec: 0 }] });
    expect(d.clip).toBe("cough_mild");
  });

  test("prosedür > kusma > öksürük (olay içi öncelik)", () => {
    const events: DirectorInput["events"] = [
      { type: "cough", atSec: 0 },
      { type: "vomiting", atSec: 0 },
      { type: "take_pill", atSec: 0 },
    ];
    expect(decide({ events }).clip).toBe("take_pill");
    expect(decide({ events: events.slice(0, 2) }).clip).toBe("vomiting");
  });

  test("penceresi kapanan olay yok sayılır (cough 2.5sn)", () => {
    const events: DirectorInput["events"] = [{ type: "cough", atSec: 0 }];
    expect(decide({ events, nowSec: 2.0 }).clip).toBe("cough_mild");
    expect(decide({ events, nowSec: 2.6 }).clip).toBe("laying_idle");
  });

  test("gelecekteki olay henüz oynamaz", () => {
    expect(decide({ events: [{ type: "cough", atSec: 5 }], nowSec: 1 }).clip).toBe("laying_idle");
  });
});

// ------------------------------------------------------------
// Konuşma — rotasyon + bastırma
// ------------------------------------------------------------

describe("decideAnimation — konuşma", () => {
  test("konuşma → talk_gesture/talk_shrug deterministik rotasyon (random yok)", () => {
    expect(decide({ isSpeaking: true, speechCount: 0 }).clip).toBe("talk_gesture");
    expect(decide({ isSpeaking: true, speechCount: 1 }).clip).toBe("talk_shrug");
    expect(decide({ isSpeaking: true, speechCount: 2 }).clip).toBe("talk_gesture");
  });

  test("GCS ≤ 8 → konuşma klibi bastırılır", () => {
    const d = decide({ vitals: { ...base, gcs: 6 }, isSpeaking: true });
    expect(d.clip).toBe("laying_idle");
    expect(d.speed).toBeLessThan(1); // bilinç kapalı — cılız hareket
  });

  test("ağır solunum sıkıntısı konuşmayı bastırır (vitalsToClip presedanı)", () => {
    const d = decide({ vitals: { ...base, spo2: 84 }, isSpeaking: true });
    expect(d.clip).toBe("laying_breathless");
  });

  test("hafif takipnede konuşma kazanır (olay > süreğen)", () => {
    const d = decide({ vitals: { ...base, rr: 26 }, isSpeaking: true, speechCount: 0 });
    expect(d.clip).toBe("talk_gesture");
  });

  test("GCS ≤ 8 → prosedür jesti de bastırılır", () => {
    const d = decide({ vitals: { ...base, gcs: 5 }, events: [{ type: "take_pill", atSec: 0 }] });
    expect(d.clip).toBe("laying_idle");
  });
});

// ------------------------------------------------------------
// Arrest — breath_stopped hareketsizliği
// ------------------------------------------------------------

describe("decideAnimation — arrest (breath_stopped)", () => {
  const arrestPhase = makePhase({ ekg: "asystole", visual: { breath_stopped: true } });

  test("breath_stopped → hareketsiz idle (hız çok düşük, en yüksek katman)", () => {
    const d = decide({ phaseSignal: arrestPhase });
    expect(d.clip).toBe("laying_idle");
    expect(d.layer).toBe("arrest");
    expect(d.speed).toBeLessThanOrEqual(0.2);
    expect(d.overlay).toBeUndefined();
  });

  test("arrest olayları da bastırır (öksürük/konuşma oynamaz)", () => {
    const d = decide({
      phaseSignal: arrestPhase,
      events: [{ type: "cough", atSec: 0 }],
      isSpeaking: true,
      vitals: { ...base, spo2: 60, rr: 0 },
    });
    expect(d.layer).toBe("arrest");
    expect(d.clip).toBe("laying_idle");
  });

  test("arrest süreğen durumu anında keser (minHold beklemez)", () => {
    const prev = decide({ vitals: { ...base, spo2: 84 } }); // breathless @0
    const d = decide({ phaseSignal: arrestPhase, nowSec: 0.3, previous: prev });
    expect(d.layer).toBe("arrest");
  });
});

// ------------------------------------------------------------
// Histerezis — çift eşik + minHold
// ------------------------------------------------------------

describe("decideAnimation — histerezis", () => {
  test("eşik ±1 titremesi yok: SpO2 87→88→87 hep breathless (çıkış ≥90)", () => {
    const d1 = decide({ vitals: { ...base, spo2: 87 }, nowSec: 0 });
    expect(d1.clip).toBe("laying_breathless");
    const d2 = decide({ vitals: { ...base, spo2: 88 }, nowSec: 10, previous: d1 });
    expect(d2.clip).toBe("laying_breathless"); // hold bitmiş olsa bile çıkış eşiği sağlanmadı
    const d3 = decide({ vitals: { ...base, spo2: 87 }, nowSec: 20, previous: d2 });
    expect(d3.clip).toBe("laying_breathless");
  });

  test("RR 24→23→24 titremesi yok (çıkış <22)", () => {
    const d1 = decide({ vitals: { ...base, rr: 24 }, nowSec: 0 });
    expect(d1.clip).toBe("laying_breathless");
    const d2 = decide({ vitals: { ...base, rr: 23 }, nowSec: 10, previous: d1 });
    expect(d2.clip).toBe("laying_breathless");
  });

  test("çıkış eşiği sağlanınca idle'a döner (hold sonrası)", () => {
    const d1 = decide({ vitals: { ...base, spo2: 87 }, nowSec: 0 });
    const d2 = decide({ vitals: { ...base, spo2: 95, rr: 14 }, nowSec: DEFAULT_MIN_HOLD_SEC + 0.1, previous: d1 });
    expect(d2.clip).toBe("laying_idle");
  });

  test("ağrı 4→3→4: moaning'de kalır (çıkış <3)", () => {
    const d1 = decide({ vitals: { ...base, pain: 4 }, nowSec: 0 });
    expect(d1.clip).toBe("moaning");
    const d2 = decide({ vitals: { ...base, pain: 3 }, nowSec: 10, previous: d1 });
    expect(d2.clip).toBe("moaning");
    const d3 = decide({ vitals: { ...base, pain: 2 }, nowSec: 20, previous: d2 });
    expect(d3.clip).toBe("laying_idle");
  });

  test("minHold: hold dolmadan aynı katman/alt katman değişimi bekletilir", () => {
    const d1 = decide({ vitals: { ...base, rr: 26 }, nowSec: 0 }); // breathless, hold 2sn
    // 0.5sn sonra vitaller tamamen normale döndü — yine de breathless tutulur
    const d2 = decide({ vitals: base, nowSec: 0.5, previous: d1 });
    expect(d2.clip).toBe("laying_breathless");
    expect(d2.decidedAtSec).toBe(0);
    // hold dolunca serbest
    const d3 = decide({ vitals: base, nowSec: 2.1, previous: d2 });
    expect(d3.clip).toBe("laying_idle");
  });

  test("daha yüksek öncelik minHold'u keser (olay > süreğen)", () => {
    const d1 = decide({ vitals: { ...base, rr: 26 }, nowSec: 0 }); // state
    const d2 = decide({
      vitals: { ...base, rr: 26 },
      nowSec: 0.5,
      previous: d1,
      events: [{ type: "vomiting", atSec: 0.5 }],
    });
    expect(d2.clip).toBe("vomiting"); // hold dolmadan kesti
  });

  test("aynı klip sürerken karar zamanı korunur (crossfade tekrar tetiklenmez)", () => {
    const d1 = decide({ vitals: { ...base, spo2: 84 }, nowSec: 0 });
    const d2 = decide({ vitals: { ...base, spo2: 83 }, nowSec: 1, previous: d1 });
    expect(d2.clip).toBe(d1.clip);
    expect(d2.decidedAtSec).toBe(d1.decidedAtSec);
    expect(d2.holdUntilSec).toBe(d1.holdUntilSec);
  });

  test("minHoldSec override çalışır", () => {
    const d1 = decide({ vitals: { ...base, rr: 26 }, nowSec: 0, minHoldSec: 5 });
    expect(d1.holdUntilSec).toBe(5);
  });
});

// ------------------------------------------------------------
// Pain overlay — faz EKG sinyali
// ------------------------------------------------------------

describe("decideAnimation — iskemik ağrı overlay", () => {
  test("st_elevation fazında pain overlay eklenir", () => {
    const d = decide({ phaseSignal: makePhase({ ekg: "st_elevation" }) });
    expect(d.overlay).toEqual({ clip: "pain", weight: 0.35 });
  });

  test("st_elev_pvc fazında overlay daha ağır", () => {
    const d = decide({ phaseSignal: makePhase({ ekg: "st_elev_pvc" }) });
    expect(d.overlay?.weight).toBeGreaterThan(0.35);
  });

  test("recovering fazda overlay yok", () => {
    const d = decide({ phaseSignal: makePhase({ ekg: "st_elevation", recovering: true }) });
    expect(d.overlay).toBeUndefined();
  });

  test("sinüs ritminde overlay yok", () => {
    expect(decide({ phaseSignal: makePhase() }).overlay).toBeUndefined();
  });

  test("taban klip zaten moaning ise overlay eklenmez (çifte ağrı yok)", () => {
    const d = decide({
      vitals: { ...base, pain: 8 },
      phaseSignal: makePhase({ ekg: "st_elevation" }),
    });
    expect(d.clip).toBe("moaning");
    expect(d.overlay).toBeUndefined();
  });

  test("hold ile bekletilen kararda da overlay güncellenir", () => {
    const d1 = decide({ vitals: { ...base, rr: 26 }, nowSec: 0 }); // overlay yok
    const d2 = decide({
      vitals: base,
      nowSec: 0.5,
      previous: d1,
      phaseSignal: makePhase({ ekg: "st_elevation" }),
    });
    expect(d2.clip).toBe("laying_breathless"); // hold sürüyor
    expect(d2.overlay).toEqual({ clip: "pain", weight: 0.35 });
  });
});

// ------------------------------------------------------------
// Crossfade + varyant fallback + determinizm
// ------------------------------------------------------------

describe("decideAnimation — crossfade değerleri", () => {
  test("tüm katman crossfade'leri makul aralıkta (0.1–1.0 sn)", () => {
    const decisions = [
      decide(),
      decide({ vitals: { ...base, spo2: 84 } }),
      decide({ events: [{ type: "cough", atSec: 0 }] }),
      decide({ isSpeaking: true }),
      decide({ phaseSignal: makePhase({ visual: { breath_stopped: true } }) }),
    ];
    for (const d of decisions) {
      expect(d.crossfadeSec).toBeGreaterThanOrEqual(0.1);
      expect(d.crossfadeSec).toBeLessThanOrEqual(1.0);
    }
  });

  test("arrest geçişi yavaş, olay geçişi çabuk", () => {
    const arrest = decide({ phaseSignal: makePhase({ visual: { breath_stopped: true } }) });
    const event = decide({ events: [{ type: "cough", atSec: 0 }] });
    expect(arrest.crossfadeSec).toBeGreaterThan(event.crossfadeSec);
  });
});

describe("resolveDirectorClip — varyant fallback", () => {
  // female-adult klip seti (AnimatedPatientModel.ANIMATED_MODELS)
  const female = ["laying_idle", "idle", "talk_gesture", "talk_shrug", "pain", "cough_mild", "cough_severe"] as const;

  test("moaning yoksa pain'e düşer (kadın varyantı)", () => {
    expect(resolveDirectorClip("moaning", [...female])).toBe("pain");
  });

  test("laying_breathless yoksa cough_severe'e düşer", () => {
    expect(resolveDirectorClip("laying_breathless", [...female])).toBe("cough_severe");
  });

  test("decideAnimation availableClips ile düşürür", () => {
    const d = decide({ vitals: { ...base, pain: 8 }, availableClips: [...female] });
    expect(d.clip).toBe("pain");
  });

  test("overlay klibi varyantta yoksa overlay düşer", () => {
    const noPain = ["laying_idle", "talk_gesture"] as const;
    const d = decide({
      phaseSignal: makePhase({ ekg: "st_elevation" }),
      availableClips: [...noPain],
    });
    expect(d.overlay).toBeUndefined();
  });
});

describe("decideAnimation — determinizm", () => {
  test("aynı input → aynı output (deep equal, iki çağrı)", () => {
    const input: DirectorInput = {
      vitals: { ...base, spo2: 86, pain: 5 },
      phaseSignal: makePhase({ ekg: "st_elev_pvc" }),
      isSpeaking: true,
      speechCount: 3,
      events: [{ type: "cough", atSec: 1 }],
      nowSec: 2,
      previous: decide({ vitals: { ...base, spo2: 86 }, nowSec: 0 }),
    };
    expect(decideAnimation(input)).toEqual(decideAnimation(input));
  });

  test("describeAnimationDecision okunabilir çıktı verir", () => {
    const txt = describeAnimationDecision(decide({ vitals: { ...base, spo2: 84 } }));
    expect(txt).toContain("laying_breathless");
    expect(txt).toContain("state");
  });
});
