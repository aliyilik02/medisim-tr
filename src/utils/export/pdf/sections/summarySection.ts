import type { jsPDF } from "jspdf";
import { C } from "../colors";
import { fillRect } from "../primitives/page";
import type { Layout } from "../layout";
import type { SectionData } from "../generatePdf";
import { specialtyLabel, difficultyLabel, modeLabel, formatDuration } from "../../helpers";

function metaBox(
  doc: jsPDF, fontName: string,
  x: number, y: number, w: number, h: number,
  label: string, value: string,
  valueColor?: [number, number, number]
) {
  fillRect(doc, x, y, w, h, C.bgStripe, 2);
  doc.setFont(fontName, "normal");
  doc.setFontSize(6);
  doc.setTextColor(...C.inkMid);
  doc.text(label.toUpperCase(), x + 4, y + 4.5);
  doc.setFont(fontName, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...(valueColor ?? C.inkDark));
  const lines = doc.splitTextToSize(value, w - 8) as string[];
  doc.text(lines[0], x + 4, y + 10.5);
}

export function renderSummary(
  doc: jsPDF, data: SectionData, layout: Layout, fontName: string, y: number
): number {
  const { scenario, session } = data;

  // ── Protokol numarası (küçük, sağ hizalı) ───────────────────
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text(data.protocol, layout.PW - layout.MR, y, { align: "right" });

  // ── Senaryo başlığı ──────────────────────────────────────────
  doc.setFont(fontName, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...C.inkDark);
  const titleLines = doc.splitTextToSize(scenario.title, layout.CW - 36) as string[];
  doc.text(titleLines, layout.ML, y + 4);
  y += titleLines.length * 6.5 + 2;

  // ── ID + versiyon ────────────────────────────────────────────
  doc.setFont(fontName, "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...C.inkLight);
  doc.text(`${scenario.id}  v${scenario.version}`, layout.ML, y);
  y += 4;

  // ── Hasta özeti (tek satır) ──────────────────────────────────
  doc.setFont(fontName, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.inkMid);
  const sexStr = scenario.patient.sex === "M" ? "Erkek" : "Kadın";
  const patientLine = `${scenario.patient.age} yas · ${sexStr} · ${scenario.patient.weight_kg} kg — "${scenario.patient.chief_complaint.slice(0, 60)}${scenario.patient.chief_complaint.length > 60 ? "…" : ""}"`;
  doc.text(patientLine, layout.ML, y + 4);
  y += 10;

  // ── Meta kutular (4 kolon) ────────────────────────────────────
  const BOX_H  = 16;
  const GAP    = 3;
  const colW   = (layout.CW - GAP * 3) / 4;

  const cols: [string, string, [number,number,number]?][] = [
    ["Uzmanlık",    specialtyLabel(scenario.specialty)],
    ["Mod / Zorluk", `${modeLabel(session.mode)} S${session.selected_difficulty} (${difficultyLabel(session.selected_difficulty)})`],
    ["Sure",        formatDuration(data.totalSeconds)],
    ["Kritik Hata", data.totalErrors.toString(), data.totalErrors > 0 ? C.critical : undefined],
  ];

  cols.forEach(([label, value, color], i) => {
    const x = layout.ML + i * (colW + GAP);
    metaBox(doc, fontName, x, y, colW, BOX_H, label, value, color);
  });

  y += BOX_H + 5;

  // ── Tarih / Saat satırı ──────────────────────────────────────
  doc.setFont(fontName, "normal");
  doc.setFontSize(7);
  doc.setTextColor(...C.inkLight);
  doc.text(`${data.dateStr}  ${data.timeStr}`, layout.ML, y);

  return y + 8;
}
