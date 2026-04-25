import type { jsPDF } from "jspdf";
import { C } from "../colors";
import { fillRect, ensureSpace } from "../primitives/page";
import { sectionHeader } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";

export function renderDebriefSection(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const debrief = data.scenario.debrief ?? { key_learnings: [], references: [] };
  const keyLearnings = debrief.key_learnings ?? [];
  const references   = debrief.references ?? [];
  const redFlags     = debrief.red_flags ?? [];

  // ── Temel öğrenim noktaları ─────────────────────────────────────
  y = ensureSpace(doc, y, 22, layout);
  y = sectionHeader(doc, y, "Temel Öğrenim Noktaları", fontName, layout);

  keyLearnings.forEach((item, i) => {
    const lines  = doc.splitTextToSize(`      ${item}`, layout.CW - 6) as string[];
    const blockH = lines.length * 4.6 + 6;
    y = ensureSpace(doc, y, blockH, layout);

    fillRect(doc, layout.ML, y, layout.CW, blockH, C.bgStripe, 2);
    // Numara baloncuğu
    fillRect(doc, layout.ML + 3, y + (blockH - 5) / 2, 5, 5, C.teal, 2.5);
    doc.setFont(fontName, "bold");
    doc.setFontSize(5.5);
    doc.setTextColor(...C.white);
    doc.text((i + 1).toString(), layout.ML + 5.5, y + (blockH - 5) / 2 + 3.5, { align: "center" });

    doc.setFont(fontName, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.inkDark);
    doc.text(lines, layout.ML + 3, y + 5);
    y += blockH + 2;
  });
  y += 3;

  // ── Red flags ──────────────────────────────────────────────────
  if (redFlags.length > 0) {
    y = ensureSpace(doc, y, 22, layout);
    y = sectionHeader(doc, y, "Dikkat Edilmesi Gerekenler", fontName, layout);

    for (const flag of redFlags) {
      const lines  = doc.splitTextToSize(`     ${flag}`, layout.CW - 6) as string[];
      const blockH = lines.length * 4.6 + 6;
      y = ensureSpace(doc, y, blockH, layout);

      fillRect(doc, layout.ML, y, layout.CW, blockH, C.criticalBg, 2);
      fillRect(doc, layout.ML, y, 2.5, blockH, C.critical);
      doc.setFont(fontName, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...C.critical);
      doc.text(lines, layout.ML + 5, y + 5);
      y += blockH + 2;
    }
    y += 3;
  }

  // ── Kaynaklar ──────────────────────────────────────────────────
  y = ensureSpace(doc, y, 18, layout);
  y = sectionHeader(doc, y, "Kaynaklar", fontName, layout);

  for (const ref of references) {
    const lines  = doc.splitTextToSize(`· ${ref}`, layout.CW - 4) as string[];
    const blockH = lines.length * 4.2 + 1;
    y = ensureSpace(doc, y, blockH, layout);

    fillRect(doc, layout.ML, y - 0.5, 1.5, blockH + 1, C.teal);
    doc.setFont(fontName, "normal");
    doc.setFontSize(7);
    doc.setTextColor(...C.inkMid);
    doc.text(lines, layout.ML + 4, y + 3);
    y += blockH + 2;
  }

  return y + 2;
}
