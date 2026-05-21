// ============================================================
// useMarkerOverrides — Sprint B.5+ marker pozisyon dev override
// ============================================================
// Geliştiricinin tarayıcıdan marker pozisyonlarını ayarlayıp
// localStorage'a kaydetmesini sağlar. Production'da etkisiz (override
// yoksa DEFAULT_REGIONS aynen kullanılır). Override silmek için
// resetMarkerOverrides() çağırılır veya MarkerDevPanel'den "Tümünü
// Sıfırla" basılır.
//
// Kullanım:
//   const { regions, updateMarker, resetMarker, resetAll } =
//     useMarkerOverrides(DEFAULT_REGIONS);
// ============================================================

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PatientRegion } from "@/components/patient-3d/regions";

const STORAGE_KEY = "medisim.marker_overrides_v1";

/** id → [x, y, z] override. Sadece değiştirilmiş marker'lar saklanır. */
type OverrideMap = Record<string, [number, number, number]>;

function loadOverrides(): OverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OverrideMap;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveOverrides(map: OverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // sessize geç — storage quota olabilir
  }
}

export interface UseMarkerOverridesResult {
  /** DEFAULT_REGIONS üzerine override uygulanmış final liste. */
  regions: PatientRegion[];
  /** Override map (sadece değiştirilmiş id → [x,y,z]). */
  overrides: OverrideMap;
  /** Bir marker'ın pozisyonunu güncelle (immediate + localStorage). */
  updateMarker: (id: string, position: [number, number, number]) => void;
  /** Tek bir marker'ın override'ını sil. */
  resetMarker: (id: string) => void;
  /** Tüm override'ları sil. */
  resetAll: () => void;
}

export function useMarkerOverrides(
  baseRegions: PatientRegion[],
): UseMarkerOverridesResult {
  const [overrides, setOverrides] = useState<OverrideMap>(() => loadOverrides());

  // localStorage senkronizasyonu — başka tab değişikliği yakala
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setOverrides(loadOverrides());
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const regions = useMemo<PatientRegion[]>(() => {
    return baseRegions.map((r) => {
      const ov = overrides[r.id];
      if (!ov) return r;
      return { ...r, position: ov };
    });
  }, [baseRegions, overrides]);

  const updateMarker = useCallback(
    (id: string, position: [number, number, number]) => {
      setOverrides((prev) => {
        const next = { ...prev, [id]: position };
        saveOverrides(next);
        return next;
      });
    },
    [],
  );

  const resetMarker = useCallback((id: string) => {
    setOverrides((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setOverrides({});
    saveOverrides({});
  }, []);

  return { regions, overrides, updateMarker, resetMarker, resetAll };
}
