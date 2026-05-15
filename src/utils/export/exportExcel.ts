import ExcelJS from "exceljs";
import type { SessionState, Scenario } from "@/engine/types";
import {
  formatDateTime,
  formatFileDatetime,
  formatDuration,
  formatPercent,
  difficultyLabel,
  modeLabel,
  specialtyLabel,
  actionTypeLabel,
} from "./helpers";

// ── Hücre stil reçeteleri (ExcelJS) ───────────────────────────────
// xlsx@0.18 community sürümünde `.s` styling LibreOffice/Google'da
// çalışıyordu, MS Excel'de değil. ExcelJS native styling — her ortamda
// görünür.
type StyleRecipe = {
  font?: Partial<ExcelJS.Font>;
  fill?: ExcelJS.Fill;
  alignment?: Partial<ExcelJS.Alignment>;
};

const S_HEADER: StyleRecipe = {
  font: { bold: true, color: { argb: "FFFFFFFF" } },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF7CB342" } },
  alignment: { horizontal: "center", vertical: "middle" },
};
const S_SECTION: StyleRecipe = {
  font: { bold: true },
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFECF0E8" } },
};
const S_GREEN: StyleRecipe = { font: { color: { argb: "FF10B981" } } };
const S_RED: StyleRecipe = { font: { color: { argb: "FFDC3545" }, bold: true } };
const S_RED_BG: StyleRecipe = {
  fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFEBEB" } },
};
const S_BOLD: StyleRecipe = { font: { bold: true } };
const S_LARGE_BOLD: StyleRecipe = { font: { bold: true, size: 13 } };

function applyStyle(cell: ExcelJS.Cell, s: StyleRecipe): void {
  if (s.font) cell.font = { ...cell.font, ...s.font };
  if (s.fill) cell.fill = s.fill;
  if (s.alignment) cell.alignment = { ...cell.alignment, ...s.alignment };
}

// ── Sayfa 1: Özet ─────────────────────────────────────────────────
function buildOzetSheet(wb: ExcelJS.Workbook, session: SessionState, scenario: Scenario): void {
  const pct = formatPercent(session.total_score, scenario.scoring.max_points);
  const totalSec = session.results.length > 0
    ? session.results[session.results.length - 1].time_spent_sec
    : Math.floor((Date.now() - session.started_at) / 1000);
  const totalErrors = session.results.reduce((a, r) => a + r.critical_errors, 0);
  const passed = session.total_score >= scenario.scoring.passing_score;
  const grade = session.grade ?? "F";

  const data: (string | number)[][] = [
    ["MediSim TR — Oturum Raporu"],
    [],
    ["SENARYO BİLGİLERİ", ""],
    ["Senaryo ID", scenario.id],
    ["Başlık", scenario.title],
    ["Uzmanlık", specialtyLabel(scenario.specialty)],
    ["Zorluk", difficultyLabel(session.selected_difficulty)],
    ["Mod", modeLabel(session.mode)],
    ["Oynanma Tarihi", formatDateTime(session.started_at)],
    [],
    ["HASTA", ""],
    ["Yaş", scenario.patient.age],
    ["Cinsiyet", scenario.patient.sex === "M" ? "Erkek" : "Kadın"],
    ["Kilo (kg)", scenario.patient.weight_kg],
    [],
    ["SONUÇLAR", ""],
    ["Toplam Puan", session.total_score],
    ["Maksimum Puan", scenario.scoring.max_points],
    ["Yüzde (%)", pct],
    ["Harf Notu", grade],
    ["Sonuç", passed ? "GEÇTİ" : "KALDI"],
    ["Toplam Süre", formatDuration(totalSec)],
    ["Kritik Hata Sayısı", totalErrors],
    ["Tamamlanan Adım", session.completed_step_ids.length],
  ];

  const ws = wb.addWorksheet("Özet");
  ws.addRows(data);
  ws.columns = [{ width: 30 }, { width: 38 }];

  applyStyle(ws.getCell("A1"), S_LARGE_BOLD);
  applyStyle(ws.getCell("A3"), S_SECTION);
  applyStyle(ws.getCell("A11"), S_SECTION);
  applyStyle(ws.getCell("A16"), S_SECTION);

  // Puan renklendir
  const scoreRowIdx = data.findIndex((r) => r[0] === "Toplam Puan") + 1;
  if (scoreRowIdx > 0) applyStyle(ws.getCell(`B${scoreRowIdx}`), S_BOLD);

  // Sonuç rengi
  const passRowIdx = data.findIndex((r) => r[0] === "Sonuç") + 1;
  if (passRowIdx > 0) applyStyle(ws.getCell(`B${passRowIdx}`), passed ? S_GREEN : S_RED);

  // Not rengi
  const gradeRowIdx = data.findIndex((r) => r[0] === "Harf Notu") + 1;
  if (gradeRowIdx > 0) {
    applyStyle(
      ws.getCell(`B${gradeRowIdx}`),
      grade === "A" ? S_GREEN : grade === "F" ? S_RED : S_BOLD,
    );
  }

  // Kritik hata rengi
  const errRowIdx = data.findIndex((r) => r[0] === "Kritik Hata Sayısı") + 1;
  if (errRowIdx > 0 && totalErrors > 0) applyStyle(ws.getCell(`B${errRowIdx}`), S_RED);
}

// ── Sayfa 2: Adımlar ──────────────────────────────────────────────
function buildAdimlarSheet(wb: ExcelJS.Workbook, session: SessionState, scenario: Scenario): void {
  const header = [
    "Sıra", "Adım ID", "Başlık", "Tip",
    "Puan", "Kümülatif Süre (sn)", "Adım Süresi (sn)", "Kritik Hata",
  ];

  const rows: (string | number)[][] = session.results.map((r, i) => {
    const step = scenario.steps.find((s) => s.id === r.step_id);
    const prevSec = i > 0 ? session.results[i - 1].time_spent_sec : 0;
    const stepSec = r.time_spent_sec - prevSec;
    return [
      i + 1,
      r.step_id,
      step?.title ?? "",
      step?.kind ?? "",
      r.points_earned,
      r.time_spent_sec,
      stepSec,
      r.critical_errors,
    ];
  });

  const ws = wb.addWorksheet("Adımlar");
  ws.addRow(header);
  ws.addRows(rows);
  ws.columns = [
    { width: 6 }, { width: 22 }, { width: 40 }, { width: 12 },
    { width: 10 }, { width: 22 }, { width: 20 }, { width: 14 },
  ];

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  cols.forEach((c) => applyStyle(ws.getCell(`${c}1`), S_HEADER));

  rows.forEach((r, i) => {
    const rowN = i + 2;
    const crit = r[7] as number;
    const pts = r[4] as number;
    if (crit > 0) {
      cols.forEach((c) => applyStyle(ws.getCell(`${c}${rowN}`), S_RED_BG));
      applyStyle(ws.getCell(`H${rowN}`), S_RED);
    }
    if (pts > 0) applyStyle(ws.getCell(`E${rowN}`), S_GREEN);
    else if (pts < 0) applyStyle(ws.getCell(`E${rowN}`), S_RED);
  });
}

// ── Sayfa 3: Aksiyonlar ───────────────────────────────────────────
function buildAksiyonlarSheet(wb: ExcelJS.Workbook, session: SessionState, scenario: Scenario): void {
  const header = [
    "Sıra", "Adım ID", "Adım Başlığı",
    "Aksiyon Tipi", "Hedef", "Doz",
    "Adım Puanı", "Kritik Hata (Adım)",
  ];

  const rows: (string | number)[][] = [];
  let sira = 1;

  for (const r of session.results) {
    const step = scenario.steps.find((s) => s.id === r.step_id);

    if (r.actions_taken.length === 0) {
      rows.push([sira++, r.step_id, step?.title ?? "", "—", "—", "", r.points_earned, r.critical_errors]);
      continue;
    }

    r.actions_taken.forEach((action, ai) => {
      rows.push([
        sira++,
        r.step_id,
        step?.title ?? "",
        actionTypeLabel(action.type),
        action.target_id,
        action.dose ?? "",
        ai === 0 ? r.points_earned : "",
        ai === 0 ? r.critical_errors : "",
      ]);
    });
  }

  const ws = wb.addWorksheet("Aksiyonlar");
  ws.addRow(header);
  ws.addRows(rows);
  ws.columns = [
    { width: 6 }, { width: 22 }, { width: 35 }, { width: 20 },
    { width: 22 }, { width: 12 }, { width: 14 }, { width: 18 },
  ];

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  cols.forEach((c) => applyStyle(ws.getCell(`${c}1`), S_HEADER));

  rows.forEach((r, i) => {
    const rowN = i + 2;
    const crit = r[7];
    const pts = r[6];
    if (typeof crit === "number" && crit > 0) {
      cols.forEach((c) => applyStyle(ws.getCell(`${c}${rowN}`), S_RED_BG));
      applyStyle(ws.getCell(`H${rowN}`), S_RED);
    }
    if (typeof pts === "number") {
      if (pts > 0) applyStyle(ws.getCell(`G${rowN}`), S_GREEN);
      else if (pts < 0) applyStyle(ws.getCell(`G${rowN}`), S_RED);
    }
  });
}

// ── Ana export fonksiyonu ─────────────────────────────────────────

export async function exportToExcel(
  session: SessionState,
  scenario: Scenario,
): Promise<Blob> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MediSim TR";
  wb.created = new Date();

  buildOzetSheet(wb, session, scenario);
  buildAdimlarSheet(wb, session, scenario);
  buildAksiyonlarSheet(wb, session, scenario);

  const buf = await wb.xlsx.writeBuffer();
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function excelFilename(session: SessionState, scenario: Scenario): string {
  return `medisim-${scenario.id}-${formatFileDatetime(session.started_at)}.xlsx`;
}
