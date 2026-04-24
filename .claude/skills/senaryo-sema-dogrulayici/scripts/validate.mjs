#!/usr/bin/env node
/**
 * MediSim TR — Senaryo Şema Doğrulayıcı
 * Kullanım: node validate.mjs [senaryo-ismi]
 * Örnek: node validate.mjs stemi
 *        node validate.mjs          (tüm senaryolar)
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dirname, "../../../../");
const SCENARIO_DIR = join(ROOT, "src/data/scenarios");

const c = {
  ok:   (s) => `\x1b[32m${s}\x1b[0m`,
  err:  (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  dim:  (s) => `\x1b[2m${s}\x1b[0m`,
};

// ── Senaryo dosyasını analiz et ──────────────────────────────
// Strateji: TypeScript çalıştırmadan string presence + tight regex.
// Step nesneleri her zaman { id: "...", kind: "..." } sırasını takip eder.

function analyzeContent(content) {
  const issues = { errors: [], warnings: [] };

  // 1. Üst seviye zorunlu alanlar
  for (const f of ["id:", "version:", "title:", "specialty:", "difficulty:",
    "estimated_minutes:", "patient:", "initial_vitals:", "start_step_id:", "steps:", "scoring:", "debrief:"]) {
    if (!content.includes(f)) issues.errors.push(`${f.replace(":", "")} alanı eksik`);
  }

  // 2. Patient alt alanları
  if (content.includes("patient:")) {
    for (const f of ["age:", "sex:", "weight_kg:", "chief_complaint:", "history_items:", "allergies:"]) {
      if (!content.includes(f)) issues.errors.push(`patient.${f.replace(":", "")} eksik`);
    }
  }

  // 3. Vitals alt alanları
  if (content.includes("initial_vitals:")) {
    for (const f of ["hr:", "bp_systolic:", "bp_diastolic:", "spo2:", "temp:", "rr:"]) {
      if (!content.includes(f)) issues.errors.push(`initial_vitals.${f.replace(":", "")} eksik`);
    }
  }

  // 4. Step tespiti — SADECE { id: "...", kind: "..." } sırasıyla açılan bloklar
  // Bu pattern senaryo root objesini yakalamaz çünkü root'ta id'den sonra kind gelmez.
  const stepRegex = /id:\s*["']([^"']+)["'],\s*\n\s*kind:\s*["'](\w+)["']/g;
  const steps = [];
  let m;
  while ((m = stepRegex.exec(content)) !== null) {
    const id = m[1];
    const kind = m[2];
    // Bu step'in bloğunu çıkar — bir sonraki step id'sine veya dosya sonuna kadar
    const blockStart = m.index;
    const nextStepMatch = /id:\s*["'][^"']+["'],\s*\n\s*kind:\s*["']\w+["']/.exec(
      content.slice(blockStart + m[0].length)
    );
    const blockEnd = nextStepMatch
      ? blockStart + m[0].length + nextStepMatch.index
      : content.length;
    const blockContent = content.slice(blockStart, blockEnd);
    steps.push({ id, kind, blockContent });
  }

  const stepIds = new Set(steps.map(s => s.id));

  // start_step_id → steps içinde var mı?
  const startMatch = content.match(/start_step_id:\s*["']([^"']+)["']/);
  if (startMatch) {
    const startId = startMatch[1];
    if (!stepIds.has(startId)) {
      issues.errors.push(`start_step_id "${startId}" steps içinde yok (${steps.length} step bulundu: ${[...stepIds].join(", ")})`);
    }
  }

  for (const step of steps) {
    const { id, kind, blockContent } = step;

    // next_step_id geçerli mi?
    const nextMatch = blockContent.match(/next_step_id:\s*["']([^"']+)["']/);
    if (nextMatch && !stepIds.has(nextMatch[1])) {
      issues.errors.push(`${id}: next_step_id "${nextMatch[1]}" steps içinde yok`);
    }

    // Decision
    if (kind === "decision") {
      if (!blockContent.includes("options:")) {
        issues.errors.push(`${id}: options[] bulunamadı`);
      } else if (!blockContent.includes("correct: true")) {
        issues.errors.push(`${id}: en az 1 correct:true option olmalı`);
      }
      if (blockContent.includes("allow_multiple: true") && !blockContent.includes("partial_credit:")) {
        issues.warnings.push(`${id}: allow_multiple=true ama partial_credit tanımsız`);
      }
    }

    // Action
    if (kind === "action" && !blockContent.includes("expected_outcomes:")) {
      issues.warnings.push(`${id}: expected_outcomes[] yok`);
    }
  }

  // 5. Scoring
  if (content.includes("scoring:")) {
    const mp = content.match(/max_points:\s*(\d+)/);
    const ps = content.match(/passing_score:\s*(\d+)/);
    if (mp && ps && parseInt(ps[1]) > parseInt(mp[1]) * 0.66) {
      issues.warnings.push(`passing_score (${ps[1]}) > max_points×0.66 (${Math.round(parseInt(mp[1]) * 0.66)})`);
    }
    // grade bands sırası
    const scoringBlock = content.split("scoring:")[1] || "";
    const gA = scoringBlock.match(/\bA:\s*(\d+)/);
    const gB = scoringBlock.match(/\bB:\s*(\d+)/);
    const gC = scoringBlock.match(/\bC:\s*(\d+)/);
    const gD = scoringBlock.match(/\bD:\s*(\d+)/);
    if (gA && gB && gC && gD) {
      const [A, B, C, D] = [gA, gB, gC, gD].map(g => parseInt(g[1]));
      if (A < B || B < C || C < D) {
        issues.errors.push(`grade_bands sırası yanlış: A(${A})≥B(${B})≥C(${C})≥D(${D}) olmalı`);
      }
    }
  }

  // 6. Debrief
  if (content.includes("debrief:")) {
    const debriefBlock = content.split("debrief:")[1] || "";
    const klMatch = debriefBlock.match(/key_learnings:\s*\[([\s\S]*?)\]/);
    if (!klMatch || klMatch[1].split(",").filter(s => s.trim().length > 2).length < 2) {
      issues.warnings.push("debrief.key_learnings < 2 madde");
    }
    const refMatch = debriefBlock.match(/references:\s*\[([\s\S]*?)\]/);
    if (!refMatch || !refMatch[1].trim()) {
      issues.warnings.push("debrief.references boş");
    }
  }

  return { issues, stepCount: steps.length, stepIds };
}

// ── Ana çalıştırma ───────────────────────────────────────────

const target = process.argv[2];
let files = [];

if (target) {
  files = [join(SCENARIO_DIR, `${target}.ts`)];
} else {
  files = readdirSync(SCENARIO_DIR)
    .filter(f => f.endsWith(".ts") && f !== "index.ts")
    .map(f => join(SCENARIO_DIR, f));
}

let totalErrors = 0, totalWarnings = 0;

for (const file of files) {
  let content;
  try { content = readFileSync(file, "utf8"); }
  catch { console.log(c.err(`\n✗ Dosya okunamadı: ${file}`)); totalErrors++; continue; }

  const { issues, stepCount } = analyzeContent(content);
  const { errors, warnings } = issues;

  console.log(`\n── ${c.dim(basename(file))} ${c.dim(`(${stepCount} step)`)} ` + "─".repeat(33));
  if (errors.length === 0 && warnings.length === 0) {
    console.log(c.ok("  ✓ OK"));
  }
  for (const e of errors)   { console.log(c.err(`  ✗ ${e}`)); totalErrors++; }
  for (const w of warnings) { console.log(c.warn(`  ⚠ ${w}`)); totalWarnings++; }
}

console.log(`\n${"─".repeat(50)}`);
if (totalErrors === 0 && totalWarnings === 0) {
  console.log(c.ok(`✓ ${files.length} senaryo doğrulandı, sorun yok.`));
} else {
  console.log(`${c.err(`${totalErrors} hata`)}, ${c.warn(`${totalWarnings} uyarı`)} — ${files.length} dosyada`);
  if (totalErrors > 0) process.exit(1);
}
