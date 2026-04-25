import type { jsPDF } from "jspdf";
import type { RGB } from "../colors";
import { fillRect } from "./page";

export interface TimelineBar {
  label:   string;
  startSec: number;
  endSec:   number;
  points:   number;
  maxPoints: number;
  stepNum:  number;
  kind:     "action" | "decision" | "info";
  color:    RGB;
  bgColor:  RGB;
}

export function drawTimeline(
  doc: jsPDF,
  bars: TimelineBar[],
  totalSec: number,
  fontName: string,
  x: number, y: number,
  width: number,
  inkMid: RGB, inkLight: RGB, gridLine: RGB
): number {
  if (bars.length === 0) return y;

  const BAR_H    = 5;
  const ROW_GAP  = 3;
  const LABEL_W  = 38;
  const META_W   = 26;
  const AXIS_W   = width - LABEL_W - META_W - 4;
  const AXIS_X   = x + LABEL_W + 2;

  // X ekseni çizgisi
  doc.setDrawColor(...gridLine);
  doc.setLineWidth(0.2);
  doc.line(AXIS_X, y + 2, AXIS_X + AXIS_W, y + 2);

  // Zaman işaretleri (her 2 dakika)
  const intervalSec = totalSec <= 120 ? 30 : totalSec <= 300 ? 60 : 120;
  const intervals = Math.ceil(totalSec / intervalSec);
  for (let i = 0; i <= intervals; i++) {
    const sec = i * intervalSec;
    if (sec > totalSec) break;
    const px = AXIS_X + (sec / totalSec) * AXIS_W;
    doc.setDrawColor(...gridLine);
    doc.setLineWidth(0.15);
    doc.line(px, y, px, y + 4);
    doc.setFont(fontName, "normal");
    doc.setFontSize(5.5);
    doc.setTextColor(...inkLight);
    const min = Math.floor(sec / 60);
    const s   = sec % 60;
    doc.text(`${min}:${s.toString().padStart(2, "0")}`, px, y + 1, { align: "center" });
  }

  let rowY = y + 6;

  bars.forEach(bar => {
    // Etiket (sol)
    const label = bar.label.length > 22 ? bar.label.slice(0, 21) + "…" : bar.label;
    doc.setFont(fontName, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...inkMid);
    doc.text(label, x, rowY + BAR_H - 0.5);

    // Bar
    const bx = AXIS_X + (bar.startSec / totalSec) * AXIS_W;
    const bw = Math.max(1, ((bar.endSec - bar.startSec) / totalSec) * AXIS_W);
    fillRect(doc, bx, rowY, bw, BAR_H, bar.bgColor, 1);
    // Doluluk oranı (puan / maxPoints)
    const ratio = bar.maxPoints > 0 ? Math.max(0, bar.points / bar.maxPoints) : 0;
    if (ratio > 0) {
      fillRect(doc, bx, rowY, bw * ratio, BAR_H, bar.color, 1);
    }

    // Puan meta (sağ)
    const ptsStr = bar.points > 0 ? `+${bar.points}` : `${bar.points}`;
    doc.setFont(fontName, "bold");
    doc.setFontSize(6);
    doc.setTextColor(...bar.color);
    doc.text(ptsStr, AXIS_X + AXIS_W + 2, rowY + BAR_H - 0.5);

    rowY += BAR_H + ROW_GAP;
  });

  return rowY + 2;
}
