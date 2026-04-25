import type { jsPDF } from "jspdf";
import { C } from "../colors";
import { fillRect } from "../primitives/page";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

export function renderHeader(doc: jsPDF, data: SectionData, layout: Layout, fontName: string): number {
  const BAND_H = 11;

  // Üst teal band
  fillRect(doc, 0, 0, layout.PW, BAND_H, C.teal);

  // Logo (sol)
  doc.setFont(fontName, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text("MEDiSiM TR", layout.ML, 7.5);

  // Rapor etiketi (sağ) — ASCII safe uppercase
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(200, 240, 238);
  doc.text("OTURUM RAPORU", layout.PW - layout.MR, 7.5, { align: "right" });

  // Specialty accent çizgisi (teal bantın altında)
  const lineY = BAND_H + 0.5;
  doc.setDrawColor(...C.teal);
  doc.setLineWidth(0.5);
  doc.line(layout.ML, lineY, layout.PW - layout.MR, lineY);

  // Tarih / protokol satırı
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text(`${data.dateStr}  ${data.timeStr}`, layout.ML, BAND_H + 6);
  doc.text(data.protocol, layout.PW - layout.MR, BAND_H + 6, { align: "right" });

  return BAND_H + 11;
}
