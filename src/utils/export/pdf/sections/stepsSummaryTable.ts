import type { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { C } from "../colors";
import { drawPageBg } from "../primitives/page";
import { sectionHeader } from "../primitives/divider";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";
import { formatDuration } from "../../helpers";

export function renderStepsSummaryTable(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  if (data.session.results.length === 0) return y;

  y = sectionHeader(doc, y, "Adım Bazlı Performans", fontName, layout);

  const rows = data.session.results.map((r, i) => {
    const step    = data.scenario.steps.find((s) => s.id === r.step_id);
    const prevSec = i > 0 ? data.session.results[i - 1].time_spent_sec : 0;
    const stepSec = r.time_spent_sec - prevSec;
    return [
      (i + 1).toString().padStart(2, "0"),
      step?.title ?? r.step_id,
      step?.kind === "action" ? "Aksiyon" : step?.kind === "decision" ? "Karar" : "Bilgi",
      r.points_earned >= 0 ? `+${r.points_earned}` : `${r.points_earned}`,
      formatDuration(stepSec),
      r.critical_errors > 0 ? `${r.critical_errors}` : "—",
    ];
  });

  const totPts = data.session.results.reduce((a, r) => a + r.points_earned, 0);
  rows.push(["", "TOPLAM", "", totPts >= 0 ? `+${totPts}` : `${totPts}`, "", ""]);

  autoTable(doc, {
    startY: y,
    head:   [["#", "Adım", "Tip", "Puan", "Süre", "Kritik"]],
    body:   rows,
    margin: { left: layout.ML, right: layout.MR },
    tableWidth: layout.CW,
    styles: {
      fontSize:    7.5,
      cellPadding: { top: 3, bottom: 3, left: 3, right: 3 },
      font:        fontName,
      textColor:   C.inkDark,
      lineColor:   C.gridLine,
      lineWidth:   0.15,
    },
    headStyles: {
      fillColor:   C.teal,
      textColor:   C.white,
      fontSize:    7,
      fontStyle:   "bold",
      font:        fontName,
      cellPadding: { top: 4, bottom: 4, left: 3, right: 3 },
    },
    alternateRowStyles: { fillColor: C.bgStripe },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 78 },
      2: { cellWidth: 22, halign: "center" },
      3: { cellWidth: 20, halign: "right" },
      4: { cellWidth: 22, halign: "center" },
      5: { cellWidth: 18, halign: "center" },
    },
    didParseCell: (hookData) => {
      if (hookData.section === "body") {
        const r = data.session.results[hookData.row.index];
        // Kritik hata satırı — hafif kırmızı arka plan
        if (r && r.critical_errors > 0) {
          hookData.cell.styles.fillColor = C.criticalBg;
        }
        // Son satır (toplam) kalın
        if (hookData.row.index === rows.length - 1) {
          hookData.cell.styles.fontStyle = "bold";
        }
        // Puan rengi
        if (hookData.column.index === 3) {
          const v = hookData.cell.raw as string;
          if (v.startsWith("+")) hookData.cell.styles.textColor = C.gradeA;
          else if (v.startsWith("-")) hookData.cell.styles.textColor = C.gradeF;
          hookData.cell.styles.fontStyle = "bold";
        }
        // Kritik sütun
        if (hookData.column.index === 5 && hookData.cell.raw !== "—") {
          hookData.cell.styles.textColor = C.critical;
          hookData.cell.styles.fontStyle = "bold";
        }
      }
    },
    didDrawPage: () => { drawPageBg(doc, layout); },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((doc as any).lastAutoTable?.finalY ?? y) + 8;
}
