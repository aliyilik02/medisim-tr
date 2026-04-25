import type { jsPDF } from "jspdf";
import { C, gradeColor, gradeBgColor } from "../colors";
import { fillRect } from "../primitives/page";
import { drawGradeBar } from "../primitives/gradeBar";
import { drawDonut } from "../primitives/donutChart";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

function metricCard(
  doc: jsPDF, fontName: string,
  x: number, y: number, w: number, h: number,
  label: string, value: string, sub: string,
  valueColor: [number, number, number]
) {
  fillRect(doc, x, y, w, h, C.bgStripe, 2);
  doc.setFont(fontName, "normal");
  doc.setFontSize(5.5);
  doc.setTextColor(...C.inkMid);
  doc.text(label.toUpperCase(), x + w / 2, y + 4.5, { align: "center" });
  doc.setFont(fontName, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...valueColor);
  doc.text(value, x + w / 2, y + 13, { align: "center" });
  if (sub) {
    doc.setFont(fontName, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.inkLight);
    doc.text(sub, x + w / 2, y + 18.5, { align: "center" });
  }
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function renderScore(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const COCKPIT_H = 40;
  const DONUT_R   = 13;
  const DONUT_LW  = 3.5;
  const donutCX   = layout.ML + 18;
  const donutCY   = y + COCKPIT_H / 2;

  const gc  = data.grade === "—" ? C.inkMid : gradeColor(data.grade);
  const gb  = data.grade === "—" ? C.bgStripe : gradeBgColor(data.grade);

  // Cockpit arka plan
  fillRect(doc, layout.ML, y, layout.CW, COCKPIT_H, gb, 3);

  // Donut
  drawDonut(doc, {
    cx:         donutCX,
    cy:         donutCY,
    radius:     DONUT_R,
    lineWidth:  DONUT_LW,
    percent:    data.percent,
    fillColor:  gc,
    bgColor:    C.gridLine,
    grade:      data.grade,
    percentStr: `%${data.percent}`,
    fontName,
  });

  // Dikey ayırıcı
  const divX = layout.ML + 38;
  doc.setDrawColor(...C.gridLine);
  doc.setLineWidth(0.3);
  doc.line(divX, y + 5, divX, y + COCKPIT_H - 5);

  // ── 3 metrik kart ──────────────────────────────────────────
  const cardGap  = 3;
  const cardsX   = divX + cardGap;
  const cardsW   = layout.CW - (divX - layout.ML) - cardGap * 2;
  const cardW    = (cardsW - cardGap * 2) / 3;
  const cardH    = COCKPIT_H - 6;
  const cardY    = y + 3;

  // Kart 1: Puan
  const scoreStr = `${data.session.total_score}`;
  const subScore = `/ ${data.scenario.scoring.max_points}`;
  metricCard(doc, fontName, cardsX, cardY, cardW, cardH,
    "Puan", scoreStr, subScore, data.session.total_score >= 0 ? C.inkDark : C.critical);

  // Kart 2: Kritik hata / doğru adım
  const stepsDone  = data.session.results.length;
  const stepsOK    = data.session.results.filter(r => r.points_earned > 0).length;
  const critColor  = data.totalErrors > 0 ? C.critical : C.gradeA;
  metricCard(doc, fontName, cardsX + cardW + cardGap, cardY, cardW, cardH,
    "Adimlar", `${stepsOK}/${stepsDone}`, `${data.totalErrors} kritik`, critColor);

  // Kart 3: Süre
  const passBanner = data.passed ? "GECTI" : (data.is_abandoned ? "YARIM" : "KALDI");
  const passColor: [number, number, number] = data.passed ? C.gradeA : (data.is_abandoned ? C.inkMid : C.gradeF);
  metricCard(doc, fontName, cardsX + (cardW + cardGap) * 2, cardY, cardW, cardH,
    "Sure", formatTime(data.totalSeconds), passBanner, passColor);

  y += COCKPIT_H + 6;

  // Grade bar
  y = drawGradeBar(doc, y, data.grade, fontName, layout);

  return y + 4;
}
