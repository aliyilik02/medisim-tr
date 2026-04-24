import type { jsPDF } from "jspdf";
import { C } from "../colors";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";
import { specialtyLabel, difficultyLabel, modeLabel, formatDuration } from "../../helpers";

export function renderSummary(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const { scenario, session } = data;

  // Senaryo başlığı
  doc.setFont(fontName, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...C.inkDark);
  const titleLines = doc.splitTextToSize(scenario.title, layout.CW - 40) as string[];
  doc.text(titleLines, layout.ML, y);
  y += titleLines.length * 6 + 2;

  // Senaryo ID + versiyon
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.inkLight);
  doc.text(`${scenario.id}  v${scenario.version}`, layout.ML, y);
  y += 5;

  // Meta 2-kolon grid
  const ROW_H = 7;
  const COL_W = layout.CW / 2 - 2;
  const rows: [string, string][] = [
    ["Uzmanlık",     specialtyLabel(scenario.specialty)],
    ["Mod · Zorluk", `${modeLabel(session.mode)} · ${difficultyLabel(session.selected_difficulty)}`],
    ["Süre",         formatDuration(data.totalSeconds)],
    ["Hasta",        `${scenario.patient.age} yaş · ${scenario.patient.sex === "M" ? "Erkek" : "Kadın"} · ${scenario.patient.weight_kg} kg`],
    ["Ana Şikayet",  scenario.patient.chief_complaint.slice(0, 50) + (scenario.patient.chief_complaint.length > 50 ? "…" : "")],
    ["Kritik Hata",  data.totalErrors.toString()],
  ];

  y += 2;
  rows.forEach((row, i) => {
    const col = i % 2;
    const rowY = y + Math.floor(i / 2) * ROW_H;
    const x    = layout.ML + col * (COL_W + 4);

    // Label
    doc.setFont(fontName, "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(...C.inkMid);
    doc.text(row[0].toUpperCase(), x, rowY);

    // Value
    doc.setFont(fontName, "bold");
    doc.setFontSize(7.5);
    const textCol = row[0] === "Kritik Hata" && data.totalErrors > 0 ? C.critical : C.inkDark;
    doc.setTextColor(...textCol);
    doc.text(row[1], x, rowY + 4);
  });

  y += Math.ceil(rows.length / 2) * ROW_H + 6;
  return y;
}
