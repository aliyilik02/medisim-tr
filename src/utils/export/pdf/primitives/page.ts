import type { jsPDF } from "jspdf";
import { C } from "../colors";
import type { Layout } from "../layout";

export function fillRect(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  fill: [number, number, number], r = 0
) {
  doc.setFillColor(...fill);
  r > 0 ? doc.roundedRect(x, y, w, h, r, r, "F") : doc.rect(x, y, w, h, "F");
}

export function drawPageBg(doc: jsPDF, layout: Layout) {
  fillRect(doc, 0, 0, layout.PW, layout.PH, C.white);
}

export function addPageWithBg(doc: jsPDF, layout: Layout) {
  doc.addPage();
  drawPageBg(doc, layout);
}

export function ensureSpace(
  doc: jsPDF, y: number, needed: number, layout: Layout
): number {
  if (y + needed > layout.PH - layout.MB) {
    addPageWithBg(doc, layout);
    return 18;
  }
  return y;
}
