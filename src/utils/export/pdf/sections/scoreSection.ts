import type { jsPDF } from "jspdf";
import { C, gradeColor, gradeBgColor } from "../colors";
import { fillRect } from "../primitives/page";
import { drawGradeBar } from "../primitives/gradeBar";
import { hLine } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

export function renderScore(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const BOX_H    = 38;
  const gc        = gradeColor(data.grade);
  const gb        = gradeBgColor(data.grade);
  const splitX    = layout.ML + layout.CW * 0.35;

  // Ana kart zemin
  fillRect(doc, layout.ML, y, layout.CW, BOX_H, gb, 3);

  // Sol: Grade harfi (büyük)
  doc.setFont(fontName, "bold");
  doc.setFontSize(48);
  doc.setTextColor(...gc);
  doc.text(data.grade, splitX - layout.CW * 0.35 / 2, y + 27, { align: "center" });

  // Dikey ayırıcı
  hLine(doc, y + BOX_H / 2, { ...layout, ML: splitX - 1, PW: splitX + 1, MR: 0 }, C.gridLine, 0.3);
  doc.setDrawColor(...C.gridLine);
  doc.setLineWidth(0.3);
  doc.line(splitX, y + 5, splitX, y + BOX_H - 5);

  // Sağ: puan + yüzde + pass/fail
  const rx = splitX + 6;

  // Puan büyük
  doc.setFont(fontName, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...C.inkDark);
  doc.text(`${data.session.total_score}`, rx, y + 14);
  doc.setFont(fontName, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.inkMid);
  doc.text(` / ${data.scenario.scoring.max_points} puan`, rx + doc.getTextWidth(`${data.session.total_score}`) + 1, y + 14);

  // Yüzde
  doc.setFont(fontName, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...gc);
  doc.text(`%${data.percent}`, rx, y + 23);

  // Pass/Fail rozet
  const passColor: [number, number, number] = data.passed ? C.gradeA : C.gradeF;
  const passText  = data.passed ? "GECTİ" : "KALDI";
  fillRect(doc, rx, y + 26, 22, 7, passColor, 1.5);
  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(passText, rx + 11, y + 31, { align: "center" });

  y += BOX_H + 6;

  // Grade bar
  y = drawGradeBar(doc, y, data.grade, fontName, layout);

  return y + 4;
}
