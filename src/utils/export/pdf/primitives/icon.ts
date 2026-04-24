import type { jsPDF } from "jspdf";

// jsPDF primitive ile çizilen küçük ikonlar (Unicode emoji değil)

export function drawCheckmark(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r, "S");
  // Tick mark
  doc.line(cx - r * 0.4, cy, cx - r * 0.05, cy + r * 0.4);
  doc.line(cx - r * 0.05, cy + r * 0.4, cx + r * 0.5, cy - r * 0.4);
}

export function drawCross(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.6);
  doc.circle(cx, cy, r, "S");
  doc.line(cx - r * 0.4, cy - r * 0.4, cx + r * 0.4, cy + r * 0.4);
  doc.line(cx + r * 0.4, cy - r * 0.4, cx - r * 0.4, cy + r * 0.4);
}

export function drawWarningTriangle(doc: jsPDF, cx: number, cy: number, r: number, color: [number, number, number]) {
  doc.setDrawColor(...color);
  doc.setLineWidth(0.5);
  doc.triangle(cx, cy - r, cx - r * 0.9, cy + r * 0.6, cx + r * 0.9, cy + r * 0.6, "S");
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(5);
  doc.setTextColor(...color);
  doc.text("!", cx, cy + r * 0.3, { align: "center" });
}
