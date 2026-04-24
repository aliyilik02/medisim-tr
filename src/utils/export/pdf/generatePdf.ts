import { jsPDF } from "jspdf";
import type { SavedSession, SessionSnapshot, ScenarioSnapshot } from "@/storage/sessionHistory";
import { PAGE } from "./layout";
import { registerFont } from "./fonts";
import { drawPageBg } from "./primitives/page";
import { renderHeader } from "./sections/headerSection";
import { renderSummary } from "./sections/summarySection";
import { renderScore } from "./sections/scoreSection";
import { renderStepsSummaryTable } from "./sections/stepsSummaryTable";
import { renderActionsSection } from "./sections/actionsSection";
import { renderDebriefSection } from "./sections/debriefSection";
import { renderAllFooters } from "./sections/footerSection";

// ── Paylaşılan veri tipi — tüm section fonksiyonlarının argümanı ──

export interface SectionData {
  session:      SessionSnapshot;
  scenario:     ScenarioSnapshot;
  grade:        "A" | "B" | "C" | "D" | "F";
  percent:      number;
  passed:       boolean;
  totalSeconds: number;
  totalErrors:  number;
  protocol:     string;
  dateStr:      string;
  timeStr:      string;
}

function buildSectionData(saved: SavedSession): SectionData {
  const { session_snapshot: session, scenario_snapshot: scenario } = saved;

  const percent = Math.round((session.total_score / scenario.scoring.max_points) * 100);
  const passed  = session.total_score >= scenario.scoring.passing_score;
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);

  const totalSeconds = session.results.length > 0
    ? session.results[session.results.length - 1].time_spent_sec
    : Math.floor((Date.now() - session.started_at) / 1000);

  const d    = new Date(session.started_at);
  const p    = (n: number) => n.toString().padStart(2, "0");
  const yy   = d.getFullYear().toString().slice(2);
  const mm   = p(d.getMonth() + 1);
  const dd   = p(d.getDate());
  const hhmm = p(d.getHours()) + p(d.getMinutes());

  return {
    session,
    scenario,
    grade:        saved.grade,
    percent,
    passed,
    totalSeconds,
    totalErrors,
    protocol:     `MST-${yy}${mm}${dd}-${hhmm}`,
    dateStr:      `${dd}.${mm}.${d.getFullYear()}`,
    timeStr:      `${p(d.getHours())}:${p(d.getMinutes())}`,
  };
}

// ── Ana API ──────────────────────────────────────────────────────

export async function generatePdfReport(savedSession: SavedSession): Promise<Blob> {
  const doc    = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  const layout = PAGE;
  const fn     = await registerFont(doc);
  const data   = buildSectionData(savedSession);

  // Sayfa 1 zemini
  drawPageBg(doc, layout);

  let y = renderHeader(doc, data, layout, fn);
  y = renderSummary(doc, data, layout, fn, y);
  y = renderScore(doc, data, layout, fn, y);
  y = renderStepsSummaryTable(doc, data, layout, fn, y);
  y = renderActionsSection(doc, data, layout, fn, y);
  y = renderDebriefSection(doc, data, layout, fn, y);

  renderAllFooters(doc, layout, fn);

  return doc.output("blob");
}

// Eski (session, scenario) çifti API'yi koruyan wrapper — DebriefScreen kullanır
export async function generatePdfFromSession(
  session: SessionSnapshot,
  scenario: ScenarioSnapshot,
  grade: "A" | "B" | "C" | "D" | "F"
): Promise<Blob> {
  const duration = session.results.length > 0
    ? session.results[session.results.length - 1].time_spent_sec
    : Math.floor((Date.now() - session.started_at) / 1000);
  const critical = session.results.reduce((a, r) => a + r.critical_errors, 0);

  const synthetic: SavedSession = {
    id:                 `${session.started_at}-${scenario.id}`,
    scenario_id:        scenario.id,
    scenario_title:     scenario.title,
    scenario_specialty: scenario.specialty,
    played_at:          new Date(session.started_at).toISOString(),
    mode:               session.mode,
    difficulty:         session.selected_difficulty,
    duration_seconds:   duration,
    total_score:        session.total_score,
    max_points:         scenario.scoring.max_points,
    grade,
    critical_errors:    critical,
    session_snapshot:   session,
    scenario_snapshot:  scenario,
  };
  return generatePdfReport(synthetic);
}
