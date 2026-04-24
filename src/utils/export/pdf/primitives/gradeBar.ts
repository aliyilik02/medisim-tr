import type { jsPDF } from "jspdf";
import { C, gradeColor } from "../colors";
import { fillRect } from "./page";
import type { Layout } from "../layout";

const GRADE_ORDER = ["F", "D", "C", "B", "A"] as const; // sol=kötü, sağ=iyi

export function drawGradeBar(
  doc: jsPDF,
  y: number,
  currentGrade: string,
  fontName: string,
  layout: Layout
): number {
  const barH  = 8;
  const labelH = 5;
  const totalH = barH + labelH + 6; // ok için ekstra

  const segW  = layout.CW / GRADE_ORDER.length;

  // Grade bandları
  GRADE_ORDER.forEach((g, i) => {
    const x    = layout.ML + i * segW;
    const col  = gradeColor(g);
    const isCurrent = g === currentGrade;

    fillRect(doc, x, y, segW, barH, col);

    // Aktif band üzerine beyaz kenarlık
    if (isCurrent) {
      doc.setDrawColor(255, 255, 255);
      doc.setLineWidth(1);
      doc.rect(x, y, segW, barH, "S");
    }

    // Harf etiketi (bant üstünde)
    doc.setFont(fontName, isCurrent ? "bold" : "normal");
    doc.setFontSize(isCurrent ? 8 : 7);
    doc.setTextColor(255, 255, 255);
    doc.text(g, x + segW / 2, y + 5.5, { align: "center" });
  });

  // Ok / üçgen işaret (aktif bandın altında)
  const idx    = GRADE_ORDER.indexOf(currentGrade as typeof GRADE_ORDER[number]);
  const arrowX = layout.ML + (idx + 0.5) * segW;
  const arrowY = y + barH;

  doc.setFillColor(...gradeColor(currentGrade));
  doc.triangle(
    arrowX - 3, arrowY + 0.5,
    arrowX + 3, arrowY + 0.5,
    arrowX,     arrowY + 4.5,
    "F"
  );

  // Açıklama etiketi (ok altında)
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.inkMid);
  doc.text("Kötü →", layout.ML, y + barH + 6, { align: "left" });
  doc.text("→ İyi",  layout.ML + layout.CW, y + barH + 6, { align: "right" });

  return y + totalH;
}
