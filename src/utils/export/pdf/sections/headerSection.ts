import type { jsPDF } from "jspdf";
import { C } from "../colors";
import { fillRect } from "../primitives/page";
import { hLine } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

export function renderHeader(doc: jsPDF, data: SectionData, layout: Layout, fontName: string): number {
  const BAND_H = 10;

  // Üst teal band
  fillRect(doc, 0, 0, layout.PW, BAND_H, C.teal);

  // Logo metni (sol)
  doc.setFont(fontName, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...C.white);
  doc.text("MediSim TR", layout.ML, 6.5);

  // Rapor etiketi (sağ)
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...([200, 240, 238] as [number, number, number]));
  doc.text("OTURUM RAPORU", layout.PW - layout.MR, 6.5, { align: "right" });

  // Altında ince teal çizgi (beyaz zemin başlıyor)
  const lineY = BAND_H + 0.5;
  hLine(doc, lineY, layout, C.teal, 0.5);

  // Protokol satırı (band altında)
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text(data.protocol, layout.PW - layout.MR, BAND_H + 5, { align: "right" });
  doc.text(`${data.dateStr} ${data.timeStr}`, layout.ML, BAND_H + 5);

  return BAND_H + 9;
}
