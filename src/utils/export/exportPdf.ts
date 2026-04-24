// Mevcut import yolunu bozmadan yeni modüler PDF sistemine yönlendiren wrapper.
// DebriefScreen bu dosyayı: import("@/utils/export/exportPdf") ile yükler.

import type { SessionState, Scenario } from "@/engine/types";
import { generatePdfFromSession } from "./pdf/generatePdf";
import { formatFileDatetime } from "./helpers";

export { generatePdfReport } from "./pdf/generatePdf";

export async function exportToPdf(session: SessionState, scenario: Scenario): Promise<Blob> {
  const grade = session.grade ?? computeGrade(session, scenario);

  // SessionState → SessionSnapshot (slim tip uyumlu — fazla alanlar ignore edilir)
  const snap = {
    scenario_id:         session.scenario_id,
    mode:                session.mode,
    selected_difficulty: session.selected_difficulty,
    variant_id:          session.variant_id,
    started_at:          session.started_at,
    completed_step_ids:  session.completed_step_ids,
    results:             session.results,
    total_score:         session.total_score,
    finished:            session.finished,
    grade:               session.grade,
  };

  const scenSnap = {
    id:             scenario.id,
    version:        scenario.version,
    title:          scenario.title,
    specialty:      scenario.specialty,
    patient:        scenario.patient,
    initial_vitals: scenario.initial_vitals,
    steps:          scenario.steps,
    scoring:        scenario.scoring,
    debrief:        scenario.debrief,
  };

  return generatePdfFromSession(snap, scenSnap, grade);
}

function computeGrade(session: SessionState, scenario: Scenario): "A" | "B" | "C" | "D" | "F" {
  const { grade_bands } = scenario.scoring;
  const s = session.total_score;
  if (s >= grade_bands.A) return "A";
  if (s >= grade_bands.B) return "B";
  if (s >= grade_bands.C) return "C";
  if (s >= grade_bands.D) return "D";
  return "F";
}

export function pdfFilename(session: SessionState, scenario: Scenario): string {
  return `medisim-${scenario.id}-${formatFileDatetime(session.started_at)}.pdf`;
}
