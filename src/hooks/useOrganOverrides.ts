// ============================================================
// useOrganOverrides — Sprint B.5+ organ scale/pozisyon dev override
// ============================================================
// IndividualOrgans için runtime override map'i; localStorage'a
// kaydedilir. OrganDevPanel ile slider'lar üzerinden ayarlanır,
// "JSON Export" final değerleri clipboard'a kopyalar → kullanıcı
// IndividualOrgans.tsx DEFAULT_ORGAN_CONFIGS'e yapıştırıp sabitler.
//
// Marker overrides pattern'inin organ versiyonu (useMarkerOverrides
// referans alındı).
// ============================================================

import { useCallback, useEffect, useState } from "react";
import type {
  OrganId,
  OrganOverride,
  OrganOverrideMap,
} from "@/components/patient-3d/IndividualOrgans";

const STORAGE_KEY = "medisim.organ_overrides_v1";

function loadOverrides(): OrganOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OrganOverrideMap;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed;
  } catch {
    return {};
  }
}

function saveOverrides(map: OrganOverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // storage quota olabilir — sessizce geç
  }
}

export interface UseOrganOverridesResult {
  /** id → override (sadece değiştirilmiş organlar). */
  overrides: OrganOverrideMap;
  /** Tek bir organın bir alanını güncelle (immediate + localStorage). */
  updateOrgan: (id: OrganId, patch: OrganOverride) => void;
  /** Tek bir organın tüm override'larını sil. */
  resetOrgan: (id: OrganId) => void;
  /** Tüm override'ları sil. */
  resetAll: () => void;
}

export function useOrganOverrides(): UseOrganOverridesResult {
  const [overrides, setOverrides] = useState<OrganOverrideMap>(() => loadOverrides());

  // Başka tab değişikliklerini yakala (storage event)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setOverrides(loadOverrides());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updateOrgan = useCallback((id: OrganId, patch: OrganOverride) => {
    setOverrides((prev) => {
      const current = prev[id] ?? {};
      const merged: OrganOverride = { ...current, ...patch };
      const next: OrganOverrideMap = { ...prev, [id]: merged };
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetOrgan = useCallback((id: OrganId) => {
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

  return { overrides, updateOrgan, resetOrgan, resetAll };
}
