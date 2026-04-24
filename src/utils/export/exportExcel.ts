import * as XLSX from "xlsx";
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

// ── Hücre stilleri ────────────────────────────────────────────────
// xlsx@0.18 community sürümünde .s mülkü desteklenmektedir;
// görünürlük uygulama desteğine bağlıdır (LibreOffice / Google Sheets).
type CellStyle = {
  font?: { bold?: boolean; color?: { rgb: string }; sz?: number };
  fill?: { fgColor: { rgb: string } };
  alignment?: { horizontal?: string; vertical?: string };
};

function applyStyle(ws: XLSX.WorkSheet, ref: string, s: CellStyle): void {
  if (ws[ref]) ws[ref].s = s;
}

const S_HEADER: CellStyle = {
  font: { bold: true, color: { rgb: "FFFFFFFF" } },
  fill: { fgColor: { rgb: "FF7CB342" } },
  alignment: { horizontal: "center", vertical: "center" },
};
const S_SECTION: CellStyle = {
  font: { bold: true },
  fill: { fgColor: { rgb: "FFECF0E8" } },
};
const S_GREEN: CellStyle = { font: { color: { rgb: "FF10B981" } } };
const S_RED: CellStyle = { font: { color: { rgb: "FFDC3545" }, bold: true } };
const S_RED_BG: CellStyle = { fill: { fgColor: { rgb: "FFFFEBEB" } } };
const S_BOLD: CellStyle = { font: { bold: true } };
const S_LARGE_BOLD: CellStyle = { font: { bold: true, sz: 13 } };

function colW(wch: number): XLSX.ColInfo { return { wch }; }

// ── Sayfa 1: Özet ─────────────────────────────────────────────────
function buildOzetSheet(session: SessionState, scenario: Scenario): XLSX.WorkSheet {
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

  const ws = XLSX.utils.aoa_to_sheet(data);

  applyStyle(ws, "A1", S_LARGE_BOLD);
  applyStyle(ws, "A3", S_SECTION);
  applyStyle(ws, "A11", S_SECTION);
  applyStyle(ws, "A16", S_SECTION);

  // Puan renklendir
  const scoreRowIdx = data.findIndex((r) => r[0] === "Toplam Puan") + 1;
  if (scoreRowIdx > 0) applyStyle(ws, `B${scoreRowIdx}`, S_BOLD);

  // Sonuç rengi
  const passRowIdx = data.findIndex((r) => r[0] === "Sonuç") + 1;
  if (passRowIdx > 0) applyStyle(ws, `B${passRowIdx}`, passed ? S_GREEN : S_RED);

  // Not rengi
  const gradeRowIdx = data.findIndex((r) => r[0] === "Harf Notu") + 1;
  if (gradeRowIdx > 0) applyStyle(ws, `B${gradeRowIdx}`, grade === "A" ? S_GREEN : grade === "F" ? S_RED : S_BOLD);

  // Kritik hata rengi
  const errRowIdx = data.findIndex((r) => r[0] === "Kritik Hata Sayısı") + 1;
  if (errRowIdx > 0 && totalErrors > 0) applyStyle(ws, `B${errRowIdx}`, S_RED);

  ws["!cols"] = [colW(30), colW(38)];
  return ws;
}

// ── Sayfa 2: Adımlar ──────────────────────────────────────────────
function buildAdimlarSheet(session: SessionState, scenario: Scenario): XLSX.WorkSheet {
  const header = [
    "Sıra", "Adım ID", "Başlık", "Tip",
    "Puan", "Kümülatif Süre (sn)", "Adım Süresi (sn)", "Kritik Hata",
  ];

  const rows = session.results.map((r, i) => {
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

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  cols.forEach((c) => applyStyle(ws, `${c}1`, S_HEADER));

  rows.forEach((r, i) => {
    const rowN = i + 2;
    const crit = r[7] as number;
    const pts  = r[4] as number;
    if (crit > 0) {
      cols.forEach((c) => applyStyle(ws, `${c}${rowN}`, S_RED_BG));
      applyStyle(ws, `H${rowN}`, S_RED);
    }
    if (pts > 0) applyStyle(ws, `E${rowN}`, S_GREEN);
    else if (pts < 0) applyStyle(ws, `E${rowN}`, S_RED);
  });

  ws["!cols"] = [colW(6), colW(22), colW(40), colW(12), colW(10), colW(22), colW(20), colW(14)];
  return ws;
}

// ── Sayfa 3: Aksiyonlar ───────────────────────────────────────────
function buildAksiyonlarSheet(session: SessionState, scenario: Scenario): XLSX.WorkSheet {
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

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);

  const cols = ["A", "B", "C", "D", "E", "F", "G", "H"];
  cols.forEach((c) => applyStyle(ws, `${c}1`, S_HEADER));

  rows.forEach((r, i) => {
    const rowN = i + 2;
    const crit = r[7];
    const pts  = r[6];
    if (typeof crit === "number" && crit > 0) {
      cols.forEach((c) => applyStyle(ws, `${c}${rowN}`, S_RED_BG));
      applyStyle(ws, `H${rowN}`, S_RED);
    }
    if (typeof pts === "number") {
      if (pts > 0) applyStyle(ws, `G${rowN}`, S_GREEN);
      else if (pts < 0) applyStyle(ws, `G${rowN}`, S_RED);
    }
  });

  ws["!cols"] = [colW(6), colW(22), colW(35), colW(20), colW(22), colW(12), colW(14), colW(18)];
  return ws;
}

// ── Ana export fonksiyonu ─────────────────────────────────────────

export function exportToExcel(session: SessionState, scenario: Scenario): Blob {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, buildOzetSheet(session, scenario), "Özet");
  XLSX.utils.book_append_sheet(wb, buildAdimlarSheet(session, scenario), "Adımlar");
  XLSX.utils.book_append_sheet(wb, buildAksiyonlarSheet(session, scenario), "Aksiyonlar");

  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new Blob([buf], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export function excelFilename(session: SessionState, scenario: Scenario): string {
  return `medisim-${scenario.id}-${formatFileDatetime(session.started_at)}.xlsx`;
}
