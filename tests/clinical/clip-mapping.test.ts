// ============================================================
// Clip Mapping unit testleri — klinik durum → animasyon klibi
// ============================================================
// visual-mapping deseni: saf TS klip eşlemesi %100 test edilir.
// ============================================================

import { describe, expect, test } from "vitest";
import type { PatientVitals } from "@/engine";
import { vitalsToClip, resolveClipForVariant, describeClipMapping } from "@/clinical/clip-mapping";
import type { PatientClip } from "@/components/patient-3d/AnimatedPatientModel";

const base: PatientVitals = {
  hr: 80, bp_systolic: 120, bp_diastolic: 75, spo2: 98, temp: 36.8, rr: 14, pain: 0,
};

describe("vitalsToClip — öncelik sırası", () => {
  test("normal vital → sakin yatış", () => {
    expect(vitalsToClip(base)).toBe("laying_idle");
  });

  test("SpO2 < 88 → nefes darlığı", () => {
    expect(vitalsToClip({ ...base, spo2: 84 })).toBe("laying_breathless");
  });

  test("RR ≥ 30 → nefes darlığı", () => {
    expect(vitalsToClip({ ...base, rr: 32 })).toBe("laying_breathless");
  });

  test("hafif takipne RR ≥ 24 → nefes darlığı", () => {
    expect(vitalsToClip({ ...base, rr: 26 })).toBe("laying_breathless");
  });

  test("RR 23 sınır altı → sakin", () => {
    expect(vitalsToClip({ ...base, rr: 23 })).toBe("laying_idle");
  });

  test("şiddetli ağrı (≥7) → inleme", () => {
    expect(vitalsToClip({ ...base, pain: 8 })).toBe("moaning");
  });

  test("orta ağrı (≥4) → inleme", () => {
    expect(vitalsToClip({ ...base, pain: 5 })).toBe("moaning");
  });

  test("ağır solunum sıkıntısı ağrıdan öncelikli", () => {
    expect(vitalsToClip({ ...base, spo2: 80, pain: 9 })).toBe("laying_breathless");
  });

  test("konuşma sakinin üstünde ama distres altında", () => {
    expect(vitalsToClip(base, { speaking: true })).toBe("talk_gesture");
    expect(vitalsToClip({ ...base, spo2: 82 }, { speaking: true })).toBe("laying_breathless");
  });

  test("kusma semptomu en yüksek (prosedür hariç)", () => {
    expect(vitalsToClip({ ...base, spo2: 80 }, { symptom: "vomiting" })).toBe("vomiting");
  });

  test("öksürük semptomu — şiddet vitale göre", () => {
    expect(vitalsToClip(base, { symptom: "cough" })).toBe("cough_mild");
    expect(vitalsToClip({ ...base, spo2: 88 }, { symptom: "cough" })).toBe("cough_severe");
  });

  test("tedavi jesti her şeyin üstünde", () => {
    expect(vitalsToClip({ ...base, spo2: 80 }, { procedure: "use_inhaler", symptom: "vomiting" })).toBe("use_inhaler");
  });
});

describe("resolveClipForVariant — varyant fallback", () => {
  const femaleClips: PatientClip[] = ["laying_idle", "idle", "talk_gesture", "talk_shrug", "pain", "cough_mild", "cough_severe"];
  const maleClips: PatientClip[] = ["laying_idle", "laying_breathless", "talk_gesture", "talk_shrug", "cough_mild", "cough_severe", "moaning", "vomiting", "take_pill", "use_inhaler"];

  test("kadında laying_breathless yok → cough_severe'e düşer", () => {
    expect(resolveClipForVariant("laying_breathless", femaleClips)).toBe("cough_severe");
  });

  test("kadında moaning yok → pain'e düşer", () => {
    expect(resolveClipForVariant("moaning", femaleClips)).toBe("pain");
  });

  test("kadında vomiting yok → cough_severe'e düşer", () => {
    expect(resolveClipForVariant("vomiting", femaleClips)).toBe("cough_severe");
  });

  test("erkekte ideal klip mevcut → aynen kalır", () => {
    expect(resolveClipForVariant("laying_breathless", maleClips)).toBe("laying_breathless");
    expect(resolveClipForVariant("moaning", maleClips)).toBe("moaning");
  });

  test("hiç uymazsa laying_idle", () => {
    expect(resolveClipForVariant("vomiting", ["laying_idle"])).toBe("laying_idle");
  });
});

describe("describeClipMapping", () => {
  test("açıklama klibi + gerekçeyi içerir", () => {
    expect(describeClipMapping({ ...base, spo2: 82 })).toContain("laying_breathless");
    expect(describeClipMapping({ ...base, spo2: 82 })).toContain("SpO2");
  });
});
