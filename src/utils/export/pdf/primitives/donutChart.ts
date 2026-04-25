import type { jsPDF } from "jspdf";
import type { RGB } from "../colors";

// jsPDF'te native arc yok — çok sayıda kısa line ile donut halkası çiziyoruz.
// steps=48 → yeterince yumuşak, performans sorun değil.
function drawArc(
  doc: jsPDF, cx: number, cy: number, r: number,
  startDeg: number, endDeg: number,
  color: RGB, lineW: number
) {
  if (endDeg <= startDeg) return;
  const steps = 48;
  doc.setDrawColor(...color);
  doc.setLineWidth(lineW);
  for (let i = 0; i < steps; i++) {
    const t0 = ((startDeg + (endDeg - startDeg) * (i / steps) - 90) * Math.PI) / 180;
    const t1 = ((startDeg + (endDeg - startDeg) * ((i + 1) / steps) - 90) * Math.PI) / 180;
    doc.line(
      cx + r * Math.cos(t0), cy + r * Math.sin(t0),
      cx + r * Math.cos(t1), cy + r * Math.sin(t1)
    );
  }
}

export interface DonutOptions {
  cx: number;
  cy: number;
  radius: number;
  lineWidth: number;     // halkası kalınlığı (mm)
  percent: number;       // 0–100
  fillColor: RGB;        // dolgu rengi
  bgColor: RGB;          // arka plan halkası
  grade: string;         // ortada büyük harf
  percentStr: string;    // ortada küçük metin
  fontName: string;
}

export function drawDonut(doc: jsPDF, opt: DonutOptions) {
  const { cx, cy, radius, lineWidth, percent, fillColor, bgColor, grade, percentStr, fontName } = opt;

  // Arka plan halkası (tam çember, açık gri)
  drawArc(doc, cx, cy, radius, 0, 360, bgColor, lineWidth);

  // Dolgu arc (0 → percent × 360)
  const fillDeg = Math.max(0, Math.min(360, percent * 3.6));
  if (fillDeg > 0) {
    drawArc(doc, cx, cy, radius, 0, fillDeg, fillColor, lineWidth);
  }

  // Ortada harf notu (büyük)
  doc.setFont(fontName, "bold");
  doc.setFontSize(grade === "—" ? 18 : 22);
  doc.setTextColor(...fillColor);
  doc.text(grade, cx, cy + 1, { align: "center" });

  // Ortada yüzde (küçük, altında)
  doc.setFont(fontName, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...bgColor.map(v => Math.max(0, v - 80)) as RGB);
  doc.text(percentStr, cx, cy + 7, { align: "center" });
}
