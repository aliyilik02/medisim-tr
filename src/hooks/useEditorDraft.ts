import { useState, useEffect, useCallback, useRef } from "react";
import {
  getDraft,
  saveDraft,
  clearDraft as clearStorageDraft,
  type StoredScenario,
} from "@/storage/scenarioStorage";

type Draft = Partial<StoredScenario>;

export function useEditorDraft(
  initialDraft?: Draft
): [Draft, (patch: Partial<Draft>) => void, () => void] {
  const [draft, setDraft] = useState<Draft>(() => initialDraft ?? getDraft() ?? {});

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const updateDraft = useCallback((patch: Partial<Draft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => saveDraft(next), 500);
      return next;
    });
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    clearStorageDraft();
    setDraft({});
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return [draft, updateDraft, clearDraft];
}
