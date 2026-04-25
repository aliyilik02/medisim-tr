import type { jsPDF } from "jspdf";
import { C } from "../colors";
import { fillRect, ensureSpace } from "../primitives/page";
import { sectionHeader } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

export function renderDebriefSection(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const debrief      = data.scenario.debrief ?? { key_learnings: [], references: [] };
  const keyLearnings = debrief.key_learnings ?? [];
  const references   = debrief.references ?? [];
  const redFlags     = debrief.red_flags ?? [];

  // ── Temel ogrenin noktaları ─────────────────────────────────
  if (keyLearnings.length > 0) {
    y = ensureSpace(doc, y, 22, layout);
    y = sectionHeader(doc, y, "Temel Öğrenim Noktaları", fontName, layout);

    keyLearnings.forEach((item, i) => {
      const lines  = doc.splitTextToSize(item, layout.CW - 16) as string[];
      const blockH = Math.max(12, lines.length * 4.6 + 6);
      y = ensureSpace(doc, y, blockH, layout);

      fillRect(doc, layout.ML, y, layout.CW, blockH, C.bgStripe, 2);

      // Numara baloncugu
      const bubbleY = y + (blockH - 6) / 2;
      fillRect(doc, layout.ML + 3, bubbleY, 6, 6, C.teal, 3);
      doc.setFont(fontName, "bold");
      doc.setFontSize(5.5);
      doc.setTextColor(...C.white);
      doc.text((i + 1).toString(), layout.ML + 6, bubbleY + 4.2, { align: "center" });

      // Madde metni
      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.inkDark);
      doc.text(lines, layout.ML + 12, y + 5.5);
      y += blockH + 3;
    });
    y += 2;
  }

  // ── Red flags ──────────────────────────────────────────────
  if (redFlags.length > 0) {
    y = ensureSpace(doc, y, 22, layout);
    y = sectionHeader(doc, y, "Dikkat Edilmesi Gerekenler", fontName, layout);

    for (const flag of redFlags) {
      const lines  = doc.splitTextToSize(flag, layout.CW - 12) as string[];
      const blockH = Math.max(10, lines.length * 4.6 + 6);
      y = ensureSpace(doc, y, blockH, layout);

      fillRect(doc, layout.ML, y, layout.CW, blockH, C.criticalBg, 2);
      fillRect(doc, layout.ML, y, 2.5, blockH, C.critical);

      // Uyarı ikon — "▲" yerine çizim
      doc.setFont(fontName, "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.critical);
      doc.text("!", layout.ML + 5, y + blockH / 2 + 1, { align: "center" });

      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.critical);
      doc.text(lines, layout.ML + 9, y + 5.5);
      y += blockH + 3;
    }
    y += 2;
  }

  // ── Kaynaklar ──────────────────────────────────────────────
  if (references.length > 0) {
    y = ensureSpace(doc, y, 18, layout);
    y = sectionHeader(doc, y, "Klinik Referanslar", fontName, layout);

    for (const ref of references) {
      const lines  = doc.splitTextToSize(ref, layout.CW - 8) as string[];
      const blockH = lines.length * 4.2 + 2;
      y = ensureSpace(doc, y, blockH + 2, layout);

      doc.setFillColor(...C.teal);
      doc.circle(layout.ML + 2, y + 1.5, 1, "F");

      doc.setFont(fontName, "normal");
      doc.setFontSize(7);
      doc.setTextColor(...C.inkMid);
      doc.text(lines, layout.ML + 6, y + 3);
      y += blockH + 3;
    }
  }

  return y + 2;
}
