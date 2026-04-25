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
  const BOX_H  = 42;
  const gc     = gradeColor(data.grade);
  const gb     = gradeBgColor(data.grade);
  const leftW  = 40;
  const splitX = layout.ML + leftW;
  const rx     = splitX + 7;

  // Ana kart zemin
  fillRect(doc, layout.ML, y, layout.CW, BOX_H, gb, 3);

  // Sol: Grade harfi (büyük, dikey ortalı)
  doc.setFont(fontName, "bold");
  doc.setFontSize(52);
  doc.setTextColor(...gc);
  doc.text(data.grade, layout.ML + leftW / 2, y + 30, { align: "center" });

  // Dikey ayırıcı
  doc.setDrawColor(...C.gridLine);
  doc.setLineWidth(0.3);
  doc.line(splitX, y + 6, splitX, y + BOX_H - 6);

  // Sağ — PUAN label
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text("PUAN", rx, y + 9);

  // Puan + max
  doc.setFont(fontName, "bold");
  doc.setFontSize(18);
  doc.setTextColor(...C.inkDark);
  const scoreStr = `${data.session.total_score}`;
  doc.text(scoreStr, rx, y + 20);
  doc.setFont(fontName, "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.inkMid);
  doc.text(` / ${data.scenario.scoring.max_points}`, rx + doc.getTextWidth(scoreStr) + 1, y + 20);

  // Yüzde
  doc.setFont(fontName, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...gc);
  doc.text(`%${data.percent}`, rx, y + 30);

  // Pass/Fail rozet
  const passColor: [number, number, number] = data.passed ? C.gradeA : C.gradeF;
  const passText = data.passed ? "GECTI" : "KALDI"; // NotoSans ile GEÇTİ kullanılabilir; Helvetica fallback için ASCII bırakıldı
  const rozetX = rx + 22;
  fillRect(doc, rozetX, y + 22, 24, 8, passColor, 1.5);
  doc.setFont(fontName, "bold");
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(passText, rozetX + 12, y + 27.5, { align: "center" });

  // Kritik hata sayısı (rozetin sağında)
  const critX = rozetX + 27;
  if (data.totalErrors > 0) {
    fillRect(doc, critX, y + 22, 28, 8, C.criticalBg, 1.5);
    doc.setFont(fontName, "bold");
    doc.setFontSize(7);
    doc.setTextColor(...C.critical);
    doc.text(`${data.totalErrors} kritik`, critX + 14, y + 27.5, { align: "center" });
  }

  // Geçme eşiği bilgisi
  const passingPct = Math.round((data.scenario.scoring.passing_score / data.scenario.scoring.max_points) * 100);
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text(`Gecme siniri %${passingPct} (${data.scenario.scoring.passing_score} puan)`, rx, y + BOX_H - 5);

  y += BOX_H + 6;

  // Grade bar
  hLine(doc, y - 3, layout, C.gridLine, 0.15);
  y = drawGradeBar(doc, y, data.grade, fontName, layout);

  return y + 4;
}
