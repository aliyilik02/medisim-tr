// ============================================================
// Kalıcı iz katmanı testleri (D kararı — maske görsel, gerisi çip)
// ============================================================

import { describe, expect, test } from "vitest";
import {
  addTrace,
  resolveDurumAsset,
  traceForAction,
  TRACE_LABELS,
  type TraceKey,
} from "@/visuals/persistent-traces";
import type { VisualSet } from "@/visuals/visual-manifest";

// Sahte set — varyant seçim mantığı manifest içeriğinden bağımsız test edilir.
const asset = (src: string) => ({ src, alt: src });
const FAKE_SET: VisualSet = {
  durum: {
    baseline: asset("base-baseline"),
    sok: asset("base-sok"),
    siyanoz: asset("base-siyanoz"),
    "derin-sok": asset("base-derin-sok"),
    arrest: asset("base-arrest"),
  },
  durumMaske: {
    baseline: asset("maske-baseline"),
    sok: asset("maske-sok"),
    // siyanoz/derin-sok varyantı YOK → zarif düşüş test edilir
  },
  durumMaskeEkg: {
    baseline: asset("kombo-baseline"),
    // sok kombosu YOK → maske varyantına düşüş test edilir
  },
  aksiyon: {},
};

describe("traceForAction — aksiyon → kalıcı iz triyajı", () => {
  test("takılı kalan ekipmanlar iz bırakır", () => {
    expect(traceForAction("oksijen-maske")).toBe("maske");
    expect(traceForAction("iv-takma")).toBe("iv");
    expect(traceForAction("ekg-takma")).toBe("ekg");
    expect(traceForAction("monitor-baglama")).toBe("monitor");
    expect(traceForAction("tansiyon-olcme")).toBe("tansiyon");
  });

  test("anlık işlemler iz bırakmaz", () => {
    for (const key of ["ilac-iv", "ilac-po", "dilalti", "kan-alma", "oskultasyon", "defibrilasyon", "eko", "transfer-pci"] as const) {
      expect(traceForAction(key), key).toBeNull();
    }
  });

  test("her izin TR çip etiketi var", () => {
    for (const [key, label] of Object.entries(TRACE_LABELS)) {
      expect(label.length, key).toBeGreaterThan(1);
    }
  });
});

describe("addTrace — idempotent, sıra korur", () => {
  test("tekrar takılan ekipman çift çip üretmez", () => {
    let t: TraceKey[] = [];
    t = addTrace(t, "iv");
    t = addTrace(t, "maske");
    t = addTrace(t, "iv");
    expect(t).toEqual(["iv", "maske"]);
  });
});

describe("resolveDurumAsset — maske varyant seçimi", () => {
  test("maske izi yokken base kare", () => {
    expect(resolveDurumAsset(FAKE_SET, "baseline", []).src).toBe("base-baseline");
    expect(resolveDurumAsset(FAKE_SET, "baseline", ["iv", "ekg"]).src).toBe("base-baseline");
  });

  test("maske takılı + varyant var → maskeli kare", () => {
    expect(resolveDurumAsset(FAKE_SET, "baseline", ["maske"]).src).toBe("maske-baseline");
    expect(resolveDurumAsset(FAKE_SET, "sok", ["iv", "maske"]).src).toBe("maske-sok");
  });

  test("maske + EKG/monitör → kombo varyant öncelikli", () => {
    expect(resolveDurumAsset(FAKE_SET, "baseline", ["maske", "ekg"]).src).toBe("kombo-baseline");
    expect(resolveDurumAsset(FAKE_SET, "baseline", ["monitor", "maske"]).src).toBe("kombo-baseline");
  });

  test("kombo üretilmemiş evrede maske varyantına düşüş", () => {
    expect(resolveDurumAsset(FAKE_SET, "sok", ["maske", "ekg"]).src).toBe("maske-sok");
  });

  test("EKG var ama maske yok → kombo SEÇİLMEZ, base kalır", () => {
    expect(resolveDurumAsset(FAKE_SET, "baseline", ["ekg", "monitor"]).src).toBe("base-baseline");
  });

  test("varyant üretilmemişse base'e zarif düşüş", () => {
    expect(resolveDurumAsset(FAKE_SET, "siyanoz", ["maske"]).src).toBe("base-siyanoz");
  });

  test("ARREST'te maske görselden düşer (BVM/entübasyon)", () => {
    const withArrestVariant: VisualSet = {
      ...FAKE_SET,
      durumMaske: { ...FAKE_SET.durumMaske, arrest: asset("maske-arrest") },
    };
    // Varyant yanlışlıkla eklense bile arrest base kalır — çifte emniyet.
    expect(resolveDurumAsset(withArrestVariant, "arrest", ["maske"]).src).toBe("base-arrest");
  });

  test("durumMaske alanı hiç yoksa (eski set) base döner", () => {
    const noVariant: VisualSet = { durum: FAKE_SET.durum, aksiyon: {} };
    expect(resolveDurumAsset(noVariant, "baseline", ["maske"]).src).toBe("base-baseline");
  });
});
