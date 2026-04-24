import type { jsPDF } from "jspdf";
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

export function renderActionsSection(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const hasActions = data.session.results.some((r) => r.actions_taken.length > 0);
  if (!hasActions) return y;

  y = ensureSpace(doc, y, 22, layout);
  y = sectionHeader(doc, y, "Aksiyon Dökümü", fontName, layout);

  for (const r of data.session.results) {
    if (r.actions_taken.length === 0) continue;

    const step  = data.scenario.steps.find((s) => s.id === r.step_id);
    const label = step?.title ?? r.step_id;

    y = ensureSpace(doc, y, 14, layout);

    // Adım başlık bandı
    fillRect(doc, layout.ML, y, layout.CW, 8, C.bgStripe, 1.5);
    fillRect(doc, layout.ML, y, 2.5, 8, C.teal);
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.inkDark);
    doc.text(truncate(label, 60), layout.ML + 5, y + 5.5);
    const pts = r.points_earned;
    doc.setTextColor(...(pts >= 0 ? C.gradeA : C.gradeF));
    doc.text(pts >= 0 ? `+${pts} puan` : `${pts} puan`, layout.PW - layout.MR - 2, y + 5.5, { align: "right" });
    y += 10;

    for (const action of r.actions_taken) {
      y = ensureSpace(doc, y, 6, layout);
      const text = `${actionTypeLabel(action.type)}: ${action.target_id}${action.dose ? ` (${action.dose})` : ""}`;
      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.inkMid);
      doc.text(truncate(text, 85), layout.ML + 5, y);

      // Küçük ikon (sol)
      drawCheckmark(doc, layout.ML + 1.8, y - 1.5, 1.5, C.gradeA);

      y += 5;
    }

    if (r.critical_errors > 0) {
      y = ensureSpace(doc, y, 7, layout);
      fillRect(doc, layout.ML, y - 0.5, layout.CW, 6, C.criticalBg, 1);
      fillRect(doc, layout.ML, y - 0.5, 2.5, 6, C.critical);
      doc.setFont(fontName, "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.critical);
      doc.text(`${r.critical_errors} kritik hata`, layout.ML + 5, y + 3.5);
      drawCross(doc, layout.ML + 1.8, y + 2, 1.5, C.critical);
      y += 8;
    }
    y += 2;
  }
  return y + 2;
}
