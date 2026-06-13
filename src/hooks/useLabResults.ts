import { useState, useCallback, useRef, useEffect } from "react";
import type { Scenario, LabPanel, ImagingResult } from "@/engine";
import { resolveLabPanel, getLabHistory, getEffectiveDelaySec } from "@/engine";
import type { PlayMode } from "@/engine";

export type LabStatus = "idle" | "pending" | "ready";

export interface ReadyLabPanel {
  panelId: string;
  panel: LabPanel;
  history: LabPanel[];
}

interface UseLabResultsParams {
  scenario: Scenario | undefined;
  sessionStartedAt?: number;
  sessionMode?: PlayMode;
}

export function useLabResults({
  scenario,
  sessionStartedAt,
  sessionMode,
}: UseLabResultsParams) {
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const [readyPanels, setReadyPanels] = useState<ReadyLabPanel[]>([]);

  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const scenarioRef = useRef(scenario);
  scenarioRef.current = scenario;
  const startedAtRef = useRef(sessionStartedAt);
  startedAtRef.current = sessionStartedAt;
  const modeRef = useRef(sessionMode);
  modeRef.current = sessionMode;

  const computeScenarioTimeMin = useCallback((): number => {
    const startedAt = startedAtRef.current;
    const mode = modeRef.current;
    if (!startedAt) return 0;
    const realMs = Date.now() - startedAt;
    const scale = mode === "egitim" ? 8 : mode === "klinik" ? 3 : 1;
    return (realMs * scale) / 60000;
  }, []);

  const orderLab = useCallback(
    (panelId: string) => {
      if (timersRef.current.has(panelId)) return;
      const sc = scenarioRef.current;
      if (!sc) return;

      const delaySec = getEffectiveDelaySec(sc, panelId, modeRef.current);
      setPendingIds((prev) =>
        prev.includes(panelId) ? prev : [...prev, panelId]
      );

      const timerId = setTimeout(() => {
        const currentMinute = computeScenarioTimeMin();
        const panel = resolveLabPanel(sc, panelId, currentMinute);
        if (panel) {
          const history = getLabHistory(sc, panelId, currentMinute);
          setReadyPanels((prev) =>
            prev.some((r) => r.panelId === panelId)
              ? prev
              : [...prev, { panelId, panel, history }]
          );
        }
        setPendingIds((prev) => prev.filter((id) => id !== panelId));
        timersRef.current.delete(panelId);
      }, delaySec * 1000);

      timersRef.current.set(panelId, timerId);
    },
    [computeScenarioTimeMin]
  );

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const id of timers.values()) clearTimeout(id);
    };
  }, []);

  // Oturum değişti (restart / yeni senaryo) — eski sipariş ve sonuç
  // state'i yeni oturuma sızmasın: timer'ları durdur, listeleri boşalt.
  useEffect(() => {
    for (const id of timersRef.current.values()) clearTimeout(id);
    timersRef.current.clear();
    setPendingIds([]);
    setReadyPanels([]);
  }, [sessionStartedAt]);

  const getLabStatus = useCallback(
    (panelId: string): LabStatus => {
      if (readyPanels.some((r) => r.panelId === panelId)) return "ready";
      if (pendingIds.includes(panelId)) return "pending";
      return "idle";
    },
    [readyPanels, pendingIds]
  );

  const getReadyPanel = useCallback(
    (panelId: string) => readyPanels.find((r) => r.panelId === panelId),
    [readyPanels]
  );

  return {
    getLabStatus,
    orderLab,
    getReadyPanel,
    readyPanels,
    pendingIds,
    imagingResults: Object.values(scenario?.imaging_results ?? {}) as ImagingResult[],
  };
}
