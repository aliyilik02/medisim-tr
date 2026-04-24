import type { jsPDF } from "jspdf";
import { C } from "../colors";
import type { Layout } from "../layout";

export function hLine(
  doc: jsPDF, y: number, layout: Layout,
  color: [number, number, number] = C.gridLine, lw = 0.25
) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(layout.ML, y, layout.PW - layout.MR, y);
}

export function sectionHeader(
  doc: jsPDF, y: number, title: string,
  fontName: string, layout: Layout
): number {
  // Left accent bar
  doc.setFillColor(...C.teal);
  doc.rect(layout.ML, y, 3, 7, "F");
  doc.setFont(fontName, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.inkDark);
  doc.text(title.toUpperCase(), layout.ML + 5.5, y + 5);
  hLine(doc, y + 7, layout, C.gridLine, 0.2);
  return y + 11;
}
