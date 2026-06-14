// ============================================================
// Klinik Review — yerel çalışma takibi (localStorage)
// ============================================================
// Ali Bey'in /klinik-review dashboard'daki review SÜRECİNİ saklar: elle
// işaretlenen checklist maddeleri, notlar ve vermek İSTEDİĞİ hedef durum.
// OTORİTER durum hep senaryo TS dosyasındaki clinical_review alanıdır —
// burası sadece çalışma defteri. Dashboard "kalıcılaştır" için kopyalanacak
// TS snippet'ini bu yerel veriden üretir; kodu otomatik DEĞİŞTİRMEZ.
// ============================================================

import type { ClinicalReviewStatus } from "@/engine/types";

const STORAGE_KEY = "medisim.clinical_review";

export interface LocalReview {
  scenario_id: string;
  /** Elle doğrulanan checklist maddeleri (key → işaretli). */
  manual_checks: Record<string, boolean>;
  notes?: string;
  /** Ali Bey'in vermek istediği hedef durum (henüz koda yazılmamış olabilir). */
  intended_status?: ClinicalReviewStatus;
  updated_at: number;
}

type Store = Record<string, LocalReview>;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Store) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* kota/erişim hatası — sessiz geç (çalışma defteri kritik değil) */
  }
}

export function getLocalReview(scenarioId: string): LocalReview | null {
  return readStore()[scenarioId] ?? null;
}

export function getAllLocalReviews(): Store {
  return readStore();
}

export function saveLocalReview(
  scenarioId: string,
  patch: Partial<Omit<LocalReview, "scenario_id" | "updated_at">>,
  now: number = Date.now()
): LocalReview {
  const store = readStore();
  const prev: LocalReview = store[scenarioId] ?? {
    scenario_id: scenarioId,
    manual_checks: {},
    updated_at: now,
  };
  const next: LocalReview = {
    ...prev,
    ...patch,
    manual_checks: { ...prev.manual_checks, ...(patch.manual_checks ?? {}) },
    scenario_id: scenarioId,
    updated_at: now,
  };
  store[scenarioId] = next;
  writeStore(store);
  return next;
}

export function clearLocalReview(scenarioId: string): void {
  const store = readStore();
  delete store[scenarioId];
  writeStore(store);
}
