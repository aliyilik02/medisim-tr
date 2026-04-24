import type { Scenario } from "@/engine";

export interface StoredScenario extends Scenario {
  _local: true;
  _createdAt: string;
  _updatedAt: string;
  _draft?: boolean;
}

const STORAGE_KEY = "medisim_local_scenarios";
const DRAFT_KEY = "medisim_editor_draft";

export function listLocalScenarios(): StoredScenario[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredScenario[]) : [];
  } catch {
    return [];
  }
}

export function getLocalScenario(id: string): StoredScenario | undefined {
  return listLocalScenarios().find((s) => s.id === id);
}

export function saveLocalScenario(s: StoredScenario): void {
  const list = listLocalScenarios().filter((x) => x.id !== s.id);
  list.push({ ...s, _updatedAt: new Date().toISOString() });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function deleteLocalScenario(id: string): void {
  const list = listLocalScenarios().filter((s) => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getDraft(): Partial<StoredScenario> | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Partial<StoredScenario>) : null;
  } catch {
    return null;
  }
}

export function saveDraft(partial: Partial<StoredScenario>): void {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(partial));
}

export function clearDraft(): void {
  localStorage.removeItem(DRAFT_KEY);
}
