// ============================================================
// useMarkerOverrides — Unit testler (Sprint B.5+)
// ============================================================
// localStorage CRUD: load/save/clear + updateMarker/resetMarker/resetAll
// regions: baseRegions üzerine override merge
// ============================================================

import { describe, expect, test, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMarkerOverrides } from "@/hooks/useMarkerOverrides";
import type { PatientRegion } from "@/components/patient-3d/regions";

const STORAGE_KEY = "medisim.marker_overrides_v1";

// happy-dom v20'de Storage tam değil — kendi minimal localStorage mock'umuz
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

const BASE_REGIONS: PatientRegion[] = [
  {
    id: "test-1",
    label: "Test 1",
    position: [0, 0.5, 0.1],
    placeholderNote: "",
    side: "anterior",
  },
  {
    id: "test-2",
    label: "Test 2",
    position: [0.1, 0.4, 0.1],
    placeholderNote: "",
    side: "anterior",
  },
];

beforeEach(() => {
  mockStore.clear();
  vi.stubGlobal("localStorage", mockStorage);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockStore.clear();
});

describe("useMarkerOverrides — başlangıç", () => {
  test("localStorage boşken regions=baseRegions, overrides={}", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    expect(result.current.regions).toEqual(BASE_REGIONS);
    expect(result.current.overrides).toEqual({});
  });

  test("localStorage'ta veri varsa hook başlangıçta yükler", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ "test-1": [0.05, 0.6, 0.13] }),
    );
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    expect(result.current.overrides).toEqual({
      "test-1": [0.05, 0.6, 0.13],
    });
    expect(result.current.regions[0].position).toEqual([0.05, 0.6, 0.13]);
    expect(result.current.regions[1].position).toEqual([0.1, 0.4, 0.1]); // unchanged
  });

  test("localStorage bozuk JSON ise sessiz fallback (overrides={})", () => {
    localStorage.setItem(STORAGE_KEY, "{not valid json");
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    expect(result.current.overrides).toEqual({});
  });
});

describe("useMarkerOverrides — updateMarker", () => {
  test("updateMarker yeni override ekler + localStorage'a yazar", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.updateMarker("test-1", [0.01, 0.55, 0.12]);
    });
    expect(result.current.overrides).toEqual({
      "test-1": [0.01, 0.55, 0.12],
    });
    expect(result.current.regions[0].position).toEqual([0.01, 0.55, 0.12]);

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(stored).toEqual({ "test-1": [0.01, 0.55, 0.12] });
  });

  test("updateMarker mevcut override'ı günceller", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.updateMarker("test-1", [0.01, 0.55, 0.12]);
    });
    act(() => {
      result.current.updateMarker("test-1", [0.02, 0.56, 0.13]);
    });
    expect(result.current.overrides).toEqual({
      "test-1": [0.02, 0.56, 0.13],
    });
  });

  test("birden çok marker override edilebilir", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.updateMarker("test-1", [0.01, 0.55, 0.12]);
      result.current.updateMarker("test-2", [0.11, 0.41, 0.11]);
    });
    expect(Object.keys(result.current.overrides)).toHaveLength(2);
    expect(result.current.regions[0].position).toEqual([0.01, 0.55, 0.12]);
    expect(result.current.regions[1].position).toEqual([0.11, 0.41, 0.11]);
  });
});

describe("useMarkerOverrides — resetMarker", () => {
  test("resetMarker tek bir override'ı kaldırır", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.updateMarker("test-1", [0.01, 0.55, 0.12]);
      result.current.updateMarker("test-2", [0.11, 0.41, 0.11]);
    });
    act(() => {
      result.current.resetMarker("test-1");
    });
    expect(result.current.overrides).toEqual({
      "test-2": [0.11, 0.41, 0.11],
    });
    expect(result.current.regions[0].position).toEqual(BASE_REGIONS[0].position); // restore
  });

  test("resetMarker bilinmeyen id sessiz no-op", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.resetMarker("unknown-id");
    });
    expect(result.current.overrides).toEqual({});
  });
});

describe("useMarkerOverrides — resetAll", () => {
  test("resetAll tüm override'ları siler + localStorage temizler", () => {
    const { result } = renderHook(() => useMarkerOverrides(BASE_REGIONS));
    act(() => {
      result.current.updateMarker("test-1", [0.01, 0.55, 0.12]);
      result.current.updateMarker("test-2", [0.11, 0.41, 0.11]);
    });
    act(() => {
      result.current.resetAll();
    });
    expect(result.current.overrides).toEqual({});
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(result.current.regions).toEqual(BASE_REGIONS);
  });
});

describe("useMarkerOverrides — baseRegions değişimi", () => {
  test("baseRegions değişirse merged regions yeni base + override ile yeniden hesaplanır", () => {
    const { result, rerender } = renderHook(
      ({ base }) => useMarkerOverrides(base),
      { initialProps: { base: BASE_REGIONS } },
    );

    act(() => {
      result.current.updateMarker("test-1", [0.05, 0.6, 0.13]);
    });

    // Base region'ın label'ı değişti (örnek senaryo değişimi)
    const newBase: PatientRegion[] = [
      { ...BASE_REGIONS[0], label: "Test 1 Updated" },
      BASE_REGIONS[1],
    ];
    rerender({ base: newBase });

    // Override hâlâ test-1 için aktif
    expect(result.current.regions[0].position).toEqual([0.05, 0.6, 0.13]);
    expect(result.current.regions[0].label).toBe("Test 1 Updated");
  });
});
