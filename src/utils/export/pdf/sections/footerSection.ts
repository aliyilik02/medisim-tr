import type { jsPDF } from "jspdf";
import { C } from "../colors";
import type { Layout } from "../layout";

export function renderAllFooters(doc: jsPDF, layout: Layout, fontName: string) {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);

    // Teal üst çizgi
    doc.setDrawColor(...C.teal);
    doc.setLineWidth(0.3);
    doc.line(layout.ML, layout.PH - 12, layout.PW - layout.MR, layout.PH - 12);

    doc.setFont(fontName, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.inkLight);
    doc.text("MediSim TR — Klinik Simülasyon Platformu", layout.ML, layout.PH - 7.5);
    doc.text(
      "Bu rapor eğitim amaçlıdır, klinik karar yerine geçmez.",
      layout.PW / 2, layout.PH - 7.5,
      { align: "center" }
    );
    doc.text(`${p} / ${total}`, layout.PW - layout.MR, layout.PH - 7.5, { align: "right" });
  }
}
