import type { jsPDF } from "jspdf";
import type { ActionStep, DecisionStep } from "@/engine/types";
import { C, gradeColor, gradeBgColor } from "../colors";
import { ensureSpace } from "../primitives/page";
import { sectionHeader } from "../primitives/divider";
import { drawTimeline, type TimelineBar } from "../primitives/timeline";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

function stepMaxPoints(step: ActionStep | DecisionStep, difficulty: number): number {
  if (step.kind === "action") {
    return step.expected_outcomes
      .filter((o) => {
        if (o.min_difficulty !== undefined && difficulty < o.min_difficulty) return false;
        if (o.max_difficulty !== undefined && difficulty > o.max_difficulty) return false;
        return o.points > 0;
      })
      .reduce((sum, o) => sum + o.points, 0);
  }
  // decision
  return step.options
    .filter((o) => {
      if (o.min_difficulty !== undefined && difficulty < o.min_difficulty) return false;
      if (o.max_difficulty !== undefined && difficulty > o.max_difficulty) return false;
      return o.correct && o.points > 0;
    })
    .reduce((sum, o) => sum + o.points, 0);
}

function buildBars(data: SectionData): TimelineBar[] {
  const bars: TimelineBar[] = [];
  const difficulty = data.selected_difficulty;
  let prevSec = 0;

  data.session.results.forEach((r, idx) => {
    const step = data.scenario.steps.find((s) => s.id === r.step_id);
    if (!step || step.kind === "info") {
      prevSec = r.time_spent_sec;
      return;
    }

    const startSec = prevSec;
    const endSec   = Math.max(startSec + 1, r.time_spent_sec);
    prevSec        = endSec;

    const maxPts = stepMaxPoints(step as ActionStep | DecisionStep, difficulty);
    const pts    = r.points_earned;
    const ratio  = maxPts > 0 ? Math.max(0, pts / maxPts) : 0;

    // Renk: puan oranına göre grade
    const grade = ratio >= 0.9 ? "A" : ratio >= 0.75 ? "B" : ratio >= 0.6 ? "C" : ratio >= 0.4 ? "D" : "F";
    const color   = pts < 0 ? C.gradeF : gradeColor(grade);
    const bgColor = pts < 0 ? C.criticalBg : gradeBgColor(grade);

    const label = step.title.length > 22 ? step.title.slice(0, 21) + "…" : step.title;

    bars.push({
      label,
      startSec,
      endSec,
      points:    pts,
      maxPoints: maxPts,
      stepNum:   idx + 1,
      kind:      step.kind as "action" | "decision",
      color,
      bgColor,
    });
  });

  return bars;
}

export function renderPerformanceTimeline(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const bars = buildBars(data);
  if (bars.length === 0) return y;

  y = ensureSpace(doc, y, 30 + bars.length * 8, layout);
  y = sectionHeader(doc, y, "Performans Zaman Çizelgesi", fontName, layout);

  const totalSec = data.totalSeconds > 0 ? data.totalSeconds : 300;

  y = drawTimeline(
    doc, bars, totalSec, fontName,
    layout.ML, y, layout.CW,
    C.inkMid, C.inkLight, C.gridLine
  );

  return y + 4;
}
