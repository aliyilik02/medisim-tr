import type { jsPDF } from "jspdf";
import { fillRect } from "./page";

export function drawBadge(
  doc: jsPDF,
  x: number, y: number,
  text: string,
  bg: [number, number, number],
  textColor: [number, number, number],
  fontName: string,
  fontSize = 7
) {
  const w = doc.getTextWidth(text) + 8;
  const h = 6;
  fillRect(doc, x, y - h + 1.5, w, h, bg, 2);
  doc.setFont(fontName, "bold");
  doc.setFontSize(fontSize);
  doc.setTextColor(...textColor);
  doc.text(text, x + 4, y);
}
