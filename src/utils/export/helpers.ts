import type { Difficulty, PlayMode } from "@/engine/types";

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString("tr-TR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatFileDatetime(ts: number): string {
  const d = new Date(ts);
  const p = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

export function formatDuration(totalSec: number): string {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function formatPercent(score: number, max: number): number {
  return Math.round((score / max) * 100);
}

export function difficultyLabel(d: Difficulty): string {
  const labels: Record<Difficulty, string> = {
    1: "S1 - Başlangıç",
    2: "S2 - Temel",
    3: "S3 - Orta",
    4: "S4 - İleri",
    5: "S5 - Uzman",
  };
  return labels[d] ?? `S${d}`;
}

export function modeLabel(mode: PlayMode): string {
  const labels: Record<PlayMode, string> = {
    egitim: "Eğitim",
    klinik: "Klinik",
    sinav: "Sınav",
  };
  return labels[mode];
}

export function actionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    give_medication: "İlaç Ver",
    use_equipment: "Ekipman Kullan",
    examine: "Muayene",
    order_test: "Tetkik İste",
    consult: "Konsültasyon",
    decision: "Karar",
    procedure: "Prosedür",
    communicate: "İletişim",
  };
  return labels[type] ?? type;
}

export function specialtyLabel(s: string): string {
  const labels: Record<string, string> = {
    kardiyoloji: "Kardiyoloji",
    dahiliye: "Dahiliye",
    acil: "Acil Tıp",
    pediatri: "Pediatri",
    cerrahi: "Cerrahi",
    anestezi: "Anestezi",
    kadin_dogum: "Kadın Doğum",
    hemsirelik: "Hemşirelik",
    askeri_tccc: "Askeri / TCCC",
  };
  return labels[s] ?? s;
}
