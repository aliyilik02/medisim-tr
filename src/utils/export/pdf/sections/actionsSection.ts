import type { jsPDF } from "jspdf";
import type { ActionRef, ActionStep, DecisionStep, Step } from "@/engine/types";
import { C } from "../colors";
import { fillRect, ensureSpace } from "../primitives/page";
import { drawCheckmark, drawCross } from "../primitives/icon";
import { sectionHeader } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";
import { actionTypeLabel } from "../../helpers";

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

// Engine'deki actionsMatch'in PDF kopyası (engine import edemeyiz — saf TS modülü değil)
function actionsMatch(taken: ActionRef, expected: ActionRef): boolean {
  if (taken.type !== expected.type) return false;
  if (taken.target_id !== expected.target_id) return false;
  if (expected.dose && taken.dose !== expected.dose) return false;
  if (expected.site && taken.site !== expected.site) return false;
  return true;
}

interface ActionMeta {
  label: string;
  correct: boolean;
  points: number;
  feedback: string;
  critical: boolean;
}

function resolveActionMeta(action: ActionRef, step: Step, difficulty: number): ActionMeta {
  if (step.kind !== "action") {
    return { label: actionTypeLabel(action.type) + ": " + action.target_id, correct: false, points: 0, feedback: "", critical: false };
  }
  const actionStep = step as ActionStep;
  const matched = actionStep.expected_outcomes.find((o) => {
    if (o.min_difficulty !== undefined && difficulty < o.min_difficulty) return false;
    if (o.max_difficulty !== undefined && difficulty > o.max_difficulty) return false;
    return actionsMatch(action, o.action);
  });

  const label = `${actionTypeLabel(action.type)}: ${action.target_id}${action.dose ? ` (${action.dose})` : ""}`;

  if (matched) {
    return {
      label,
      correct: matched.points >= 0,
      points: matched.points,
      feedback: matched.feedback,
      critical: matched.critical ?? false,
    };
  }

  // Eşleşme yok — yanlış aksiyon
  return {
    label,
    correct: false,
    points: actionStep.default_wrong_penalty ?? -5,
    feedback: actionStep.default_wrong_feedback ?? "Bu aksiyon şu an için uygun değil.",
    critical: false,
  };
}

function renderDecisionStepBlock(
  doc: jsPDF, step: DecisionStep, pts: number, critErrors: number,
  fontName: string, layout: Layout, y: number
): number {
  y = ensureSpace(doc, y, 10, layout);

  // Başlık band
  fillRect(doc, layout.ML, y, layout.CW, 7.5, C.bgStripe, 1.5);
  fillRect(doc, layout.ML, y, 2.5, 7.5, [8, 145, 178] as [number,number,number]);
  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(...C.inkDark);
  doc.text(truncate(step.title, 55), layout.ML + 5, y + 5);
  const ptsTxt = pts >= 0 ? `+${pts}` : `${pts}`;
  doc.setTextColor(...(pts >= 0 ? C.gradeA : C.gradeF));
  doc.text(ptsTxt, layout.PW - layout.MR - 2, y + 5, { align: "right" });
  y += 9.5;

  // Karar özeti
  y = ensureSpace(doc, y, 6, layout);
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.inkLight);
  const summaryTxt = critErrors > 0
    ? `Karar Adımı — ${critErrors} kritik hata`
    : pts === 0
    ? "Karar Adımı — puan kazanılamadı"
    : `Karar Adımı — ${ptsTxt} puan`;
  doc.text(summaryTxt, layout.ML + 5, y);
  y += 7;

  return y;
}

export function renderActionsSection(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const hasContent = data.session.results.length > 0;
  if (!hasContent) return y;

  y = ensureSpace(doc, y, 22, layout);
  y = sectionHeader(doc, y, "Aksiyon Dökümü", fontName, layout);

  const difficulty = data.selected_difficulty;

  for (const r of data.session.results) {
    const step = data.scenario.steps.find((s) => s.id === r.step_id);
    if (!step) continue;

    // ── Decision step: özet blok ──────────────────────────────
    if (step.kind === "decision") {
      y = renderDecisionStepBlock(doc, step as DecisionStep, r.points_earned, r.critical_errors, fontName, layout, y);
      continue;
    }

    // ── Info step: atla ──────────────────────────────────────
    if (step.kind === "info" || r.actions_taken.length === 0) continue;

    // ── Action step: adım başlık bandı ───────────────────────
    y = ensureSpace(doc, y, 14, layout);

    const stepPts  = r.points_earned;
    const stepPtsTxt = stepPts >= 0 ? `+${stepPts}` : `${stepPts}`;
    fillRect(doc, layout.ML, y, layout.CW, 8, C.bgStripe, 1.5);
    fillRect(doc, layout.ML, y, 2.5, 8, C.teal);
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.inkDark);
    doc.text(truncate(step.title, 55), layout.ML + 5, y + 5.5);
    doc.setTextColor(...(stepPts >= 0 ? C.gradeA : C.gradeF));
    doc.text(stepPtsTxt, layout.PW - layout.MR - 2, y + 5.5, { align: "right" });
    y += 10;

    // ── Her aksiyon satırı ────────────────────────────────────
    for (const action of r.actions_taken) {
      const meta = resolveActionMeta(action, step, difficulty);

      y = ensureSpace(doc, y, 8, layout);

      const iconX = layout.ML + 2;
      const textX = layout.ML + 7;
      const ptsTxt2 = meta.points >= 0 ? `+${meta.points}` : `${meta.points}`;

      // İkon
      if (meta.correct) {
        drawCheckmark(doc, iconX, y - 1.2, 1.6, C.gradeA);
      } else {
        drawCross(doc, iconX, y - 1.2, 1.6, meta.critical ? C.critical : C.gradeF);
      }

      // Aksiyon etiketi
      doc.setFont(fontName, meta.critical ? "bold" : "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...(meta.correct ? C.inkDark : (meta.critical ? C.critical : C.gradeF)));
      doc.text(truncate(meta.label, 72), textX, y);

      // Puan (sağ)
      doc.setFont(fontName, "bold");
      doc.setFontSize(7);
      doc.setTextColor(...(meta.points >= 0 ? C.gradeA : (meta.critical ? C.critical : C.gradeF)));
      doc.text(ptsTxt2, layout.PW - layout.MR - 2, y, { align: "right" });

      y += 5;

      // Feedback satırı
      if (meta.feedback) {
        const fbLines = doc.splitTextToSize("  " + meta.feedback, layout.CW - 14) as string[];
        for (const line of fbLines) {
          y = ensureSpace(doc, y, 4.5, layout);
          doc.setFont(fontName, "normal");
          doc.setFontSize(6.5);
          doc.setTextColor(...C.inkLight);
          doc.text(line, textX + 2, y);
          y += 4;
        }
        y += 1;
      }
    }

    // Kritik hata banner
    if (r.critical_errors > 0) {
      y = ensureSpace(doc, y, 8, layout);
      fillRect(doc, layout.ML, y - 0.5, layout.CW, 7, C.criticalBg, 1);
      fillRect(doc, layout.ML, y - 0.5, 2.5, 7, C.critical);
      doc.setFont(fontName, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.critical);
      doc.text(`${r.critical_errors} kritik hata`, layout.ML + 5, y + 4);
      drawCross(doc, layout.ML + 1.8, y + 2.5, 1.5, C.critical);
      y += 9;
    }

    y += 3;
  }

  return y + 2;
}
