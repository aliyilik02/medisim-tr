// ============================================================
// useRoomLayoutOverrides — hastane odası mesh layout runtime override
// ============================================================
// HospitalRoom mesh'leri için pozisyon/visible override; localStorage'a
// anında kaydedilir. Slider hareketleri kalıcıdır, sayfa yenilense bile
// korunur. RoomLayoutDevPanel ile beraber çalışır.
// ============================================================

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "medisim.room_layout_overrides_v1";

export interface RoomMeshOverride {
  position?: [number, number, number];
  scale?: number;
  visible?: boolean;
}

export type RoomLayoutOverrideMap = Record<string, RoomMeshOverride>;

function loadOverrides(): RoomLayoutOverrideMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as RoomLayoutOverrideMap;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function saveOverrides(map: RoomLayoutOverrideMap): void {
  if (typeof window === "undefined") return;
  try {
    if (Object.keys(map).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch {
    // quota — sessizce geç
  }
}

export interface UseRoomLayoutOverridesResult {
  overrides: RoomLayoutOverrideMap;
  updateMesh: (name: string, patch: RoomMeshOverride) => void;
  resetMesh: (name: string) => void;
  resetAll: () => void;
}

export function useRoomLayoutOverrides(): UseRoomLayoutOverridesResult {
  const [overrides, setOverrides] = useState<RoomLayoutOverrideMap>(() => loadOverrides());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setOverrides(loadOverrides());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const updateMesh = useCallback((name: string, patch: RoomMeshOverride) => {
    setOverrides((prev) => {
      const current = prev[name] ?? {};
      const merged: RoomMeshOverride = { ...current, ...patch };
      const next: RoomLayoutOverrideMap = { ...prev, [name]: merged };
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetMesh = useCallback((name: string) => {
    setOverrides((prev) => {
      if (!(name in prev)) return prev;
      const next = { ...prev };
      delete next[name];
      saveOverrides(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    setOverrides({});
    saveOverrides({});
  }, []);

  return { overrides, updateMesh, resetMesh, resetAll };
}
