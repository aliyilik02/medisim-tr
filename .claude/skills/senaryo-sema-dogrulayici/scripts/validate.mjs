#!/usr/bin/env node
/**
 * MediSim TR — Senaryo Şema + Kontrat Doğrulayıcı (v2 — Blok 3)
 * Kullanım: node validate.mjs [senaryo-ismi] [--strict]
 *   node validate.mjs stemi        tek senaryo
 *   node validate.mjs              tüm senaryolar
 *   node validate.mjs --strict     kontrat ihlallerini de HATA say (CI)
 *
 * KATMANLI ÇIKTI:
 *   (1) Deterministik PASS/FAIL — şema + kontrat + katalog-id (makine)
 *   (2) Klinik-kaynak-eşleştirme raporu — TODO_KLINIK + DRAFT alanlar (Claude.ai dolduracak)
 *   (3) Kritik/riskli senaryo işaretleme (öncelikli insan review)
 *   (4) Örnekleme listesi
 *
 * Strateji: TS çalıştırmadan string presence + tight regex (hızlı, bağımlılıksız).
 * "Üretim" senaryosu = defineScenario( kullanan dosya → kontrat ihlali ERROR.
 * "Legacy" senaryo = düz Scenario objesi → kontrat ihlali WARNING (grandfather).
 */

import { readFileSync, readdirSync } from "fs";
import { join, basename } from "path";

const ROOT = join(import.meta.dirname, "../../../../");
const SCENARIO_DIR = join(ROOT, "src/data/scenarios");
const MED_FILE = join(ROOT, "src/data/medications.ts");
const MED_EXT_FILE = join(ROOT, "src/data/medications-extended.ts");
const EQUIP_FILE = join(ROOT, "src/data/equipment.ts");

const STRICT = process.argv.includes("--strict");

const c = {
  ok:   (s) => `\x1b[32m${s}\x1b[0m`,
  err:  (s) => `\x1b[31m${s}\x1b[0m`,
  warn: (s) => `\x1b[33m${s}\x1b[0m`,
  info: (s) => `\x1b[36m${s}\x1b[0m`,
  dim:  (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ── Katalog id'lerini çıkar (TS çalıştırmadan) ───────────────
// medications.ts / equipment.ts her giriş `id: "x"` taşır → topla.
function extractIds(file) {
  let content;
  try { content = readFileSync(file, "utf8"); }
  catch { return new Set(); }
  const ids = new Set();
  const re = /\bid:\s*["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(content)) !== null) ids.add(m[1]);
  return ids;
}

const MED_IDS = new Set([...extractIds(MED_FILE), ...extractIds(MED_EXT_FILE)]);
const EQUIP_IDS = extractIds(EQUIP_FILE);

// Bir [ ... ] dizisindeki string literalleri çıkar
function extractArrayStrings(block) {
  if (!block) return [];
  const out = [];
  const re = /["']([^"']+)["']/g;
  let m;
  while ((m = re.exec(block)) !== null) out.push(m[1]);
  return out;
}

function captureArray(content, field) {
  const m = content.match(new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\]`));
  return m ? m[1] : null;
}

// ── Senaryo dosyasını analiz et ──────────────────────────────
function analyzeContent(content, name) {
  const issues = { errors: [], warnings: [], info: [] };
  const isProduction = content.includes("defineScenario(");
  // Kontrat ihlali: üretim senaryosunda HATA, legacy'de UYARI (grandfather).
  const contract = (msg) => {
    if (isProduction || STRICT) issues.errors.push(msg);
    else issues.warnings.push(msg);
  };

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

  // ── 4. KATALOG-ID REFERANS KONTROLÜ (Blok 3 — yeni) ──
  const availMeds = extractArrayStrings(captureArray(content, "available_medications"));
  const availEquip = extractArrayStrings(captureArray(content, "available_equipment"));
  for (const id of availMeds) {
    if (!MED_IDS.has(id)) {
      issues.errors.push(`available_medications: "${id}" ilaç katalogunda YOK (medications.ts)`);
    }
  }
  for (const id of availEquip) {
    if (!EQUIP_IDS.has(id)) {
      issues.errors.push(`available_equipment: "${id}" ekipman katalogunda YOK (equipment.ts)`);
    }
  }

  // 5. Step tespiti — { id: "...", kind: "..." } sırasıyla açılan bloklar
  const stepRegex = /id:\s*["']([^"']+)["'],\s*\n\s*kind:\s*["'](\w+)["']/g;
  const steps = [];
  let m;
  while ((m = stepRegex.exec(content)) !== null) {
    const id = m[1], kind = m[2];
    const blockStart = m.index;
    const nextStepMatch = /id:\s*["'][^"']+["'],\s*\n\s*kind:\s*["']\w+["']/.exec(
      content.slice(blockStart + m[0].length)
    );
    const blockEnd = nextStepMatch
      ? blockStart + m[0].length + nextStepMatch.index
      : content.length;
    steps.push({ id, kind, blockContent: content.slice(blockStart, blockEnd) });
  }
  const stepIds = new Set(steps.map(s => s.id));

  const startMatch = content.match(/start_step_id:\s*["']([^"']+)["']/);
  if (startMatch && !stepIds.has(startMatch[1])) {
    issues.errors.push(`start_step_id "${startMatch[1]}" steps içinde yok (${steps.length} step: ${[...stepIds].join(", ")})`);
  }

  // unlocks → gerçek dallanma sayacı
  const allUnlocks = new Set();
  let positivePointsSum = 0;
  for (const step of steps) {
    const { id, kind, blockContent } = step;

    const nextMatch = blockContent.match(/next_step_id:\s*["']([^"']+)["']/);
    if (nextMatch && !stepIds.has(nextMatch[1])) {
      issues.errors.push(`${id}: next_step_id "${nextMatch[1]}" steps içinde yok`);
    }

    // unlocks topla + geçerlilik
    const unlockRe = /unlocks:\s*\[([\s\S]*?)\]/g;
    let um;
    while ((um = unlockRe.exec(blockContent)) !== null) {
      for (const u of extractArrayStrings(um[1])) {
        allUnlocks.add(u);
        if (!stepIds.has(u)) {
          issues.errors.push(`${id}: unlocks "${u}" steps içinde yok (kırık dallanma)`);
        }
      }
    }

    // pozitif puanları topla (bonus audit için kaba tahmin)
    const ptRe = /points:\s*(-?\d+)/g;
    let pm;
    while ((pm = ptRe.exec(blockContent)) !== null) {
      const p = parseInt(pm[1]);
      if (p > 0) positivePointsSum += p;
    }

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
    if (kind === "action" && !blockContent.includes("expected_outcomes:")) {
      issues.warnings.push(`${id}: expected_outcomes[] yok`);
    }
  }

  // ── KONTRAT: gerçek dallanma var mı (öğrenci kararı yolu değiştirsin) ──
  // start_step_id dışında ≥1 adıma unlocks ile erişiliyorsa dallanma var.
  const reachableByUnlock = [...allUnlocks].filter(u => stepIds.has(u));
  if (steps.length > 1 && reachableByUnlock.length === 0) {
    contract("gerçek dallanma YOK — hiçbir adım unlocks ile açılmıyor (tek-yol/cansız akış)");
  }

  // ── KONTRAT: deterioration (kötüleşme) fazı var mı ──
  const hasDeterioration = /deterioration:\s*\[/.test(content) &&
    /trends:\s*\[/.test(content);
  if (!hasDeterioration) {
    contract("deterioration fazı YOK (statik senaryo — kontrat: en az 1 kötüleşme fazı)");
  }

  // 6. Scoring + bonus audit
  if (content.includes("scoring:")) {
    const mp = content.match(/max_points:\s*(\d+)/);
    const ps = content.match(/passing_score:\s*(\d+)/);
    if (mp && ps && parseInt(ps[1]) > parseInt(mp[1]) * 0.66) {
      issues.warnings.push(`passing_score (${ps[1]}) > max_points×0.66 (${Math.round(parseInt(mp[1]) * 0.66)})`);
    }
    // Bonus audit: deklare max_points, ulaşılabilir pozitif puan toplamından
    // ÇOK büyükse şişik (öğrenci asla max'a ulaşamaz). Kaba: tüm pozitif puan
    // toplamı (dallar dahil) genelde max_points'ten büyük olur; max_points
    // bunun çok ÜSTÜndeyse şişik demektir.
    if (mp && positivePointsSum > 0) {
      const declared = parseInt(mp[1]);
      if (declared > positivePointsSum) {
        issues.warnings.push(
          `bonus audit: max_points (${declared}) > toplam ulaşılabilir pozitif puan (${positivePointsSum}) — şişik/ulaşılamaz skor`
        );
      }
    }
    const scoringBlock = content.split("scoring:")[1] || "";
    const [gA, gB, gC, gD] = [/\bA:\s*(\d+)/, /\bB:\s*(\d+)/, /\bC:\s*(\d+)/, /\bD:\s*(\d+)/]
      .map(re => scoringBlock.match(re));
    if (gA && gB && gC && gD) {
      const [A, B, C, D] = [gA, gB, gC, gD].map(g => parseInt(g[1]));
      if (A < B || B < C || C < D) {
        issues.errors.push(`grade_bands sırası yanlış: A(${A})≥B(${B})≥C(${C})≥D(${D}) olmalı`);
      }
    }
  }

  // 7. Debrief
  if (content.includes("debrief:")) {
    const debriefBlock = content.split("debrief:")[1] || "";
    const klMatch = debriefBlock.match(/key_learnings:\s*\[([\s\S]*?)\]/);
    if (!klMatch || klMatch[1].split(",").filter(s => s.trim().length > 2).length < 2) {
      issues.warnings.push("debrief.key_learnings < 2 madde");
    }
    const refMatch = debriefBlock.match(/references:\s*\[([\s\S]*?)\]/);
    if (!refMatch || !refMatch[1].trim()) {
      contract("debrief.references boş (kontrat: en az 1 klinik kaynak)");
    }
  }

  // ── KONTRAT: clinical_review alanı ──
  const hasClinicalReview = /clinical_review:\s*\{/.test(content);
  if (!hasClinicalReview) {
    contract("clinical_review alanı YOK (kontrat: status DRAFT ile doğmalı)");
  }

  // ── KONTRAT: supported_difficulties ≥3 ──
  const sdNums = (captureArray(content, "supported_difficulties") || "").match(/\d+/g);
  if (sdNums && sdNums.length > 0 && sdNums.length < 3) {
    contract(`supported_difficulties < 3 seviye (${sdNums.length} var)`);
  }

  // ── KLİNİK-KAYNAK RAPORU verileri ──
  const todoKlinik = (content.match(/TODO_KLINIK/g) || []).length;
  const todoGeneric = (content.match(/TODO(?!_KLINIK)|FIXME/g) || []).length;
  const clinicalStatus = (content.match(/status:\s*["'](DRAFT|REVIEWED_PENDING_ACTIVATION|ACTIVE)["']/) || [])[1] || "?";
  const hasCritical = /critical:\s*true/.test(content);
  const isPediatric = /specialty:\s*["']pediatri["']/.test(content) || /"pediatri"|pediatrik/i.test(content);
  const refs = extractArrayStrings(captureArray(content.split("debrief:")[1] || "", "references"));

  return {
    issues,
    stepCount: steps.length,
    isProduction,
    meta: {
      todoKlinik, todoGeneric, clinicalStatus, hasCritical, isPediatric,
      branchCount: reachableByUnlock.length, hasDeterioration,
      medCount: availMeds.length, equipCount: availEquip.length,
      refCount: refs.length, name,
    },
  };
}

// ── Ana çalıştırma ───────────────────────────────────────────
const target = process.argv[2] && !process.argv[2].startsWith("--") ? process.argv[2] : null;
let files = target
  ? [join(SCENARIO_DIR, `${target}.ts`)]
  : readdirSync(SCENARIO_DIR).filter(f => f.endsWith(".ts") && f !== "index.ts").map(f => join(SCENARIO_DIR, f));

console.log(c.dim(`Katalog: ${MED_IDS.size} ilaç id, ${EQUIP_IDS.size} ekipman id yüklendi. ${STRICT ? "[STRICT]" : ""}`));

let totalErrors = 0, totalWarnings = 0;
const reportRows = [];

for (const file of files) {
  let content;
  try { content = readFileSync(file, "utf8"); }
  catch { console.log(c.err(`\n✗ Dosya okunamadı: ${file}`)); totalErrors++; continue; }

  const name = basename(file, ".ts");
  const { issues, stepCount, isProduction, meta } = analyzeContent(content, name);
  const { errors, warnings } = issues;
  reportRows.push(meta);

  const tag = isProduction ? c.info("[ÜRETİM]") : c.dim("[legacy]");
  console.log(`\n── ${c.bold(name)} ${tag} ${c.dim(`(${stepCount} step)`)} ` + "─".repeat(20));
  if (errors.length === 0 && warnings.length === 0) console.log(c.ok("  ✓ OK"));
  for (const e of errors)   { console.log(c.err(`  ✗ ${e}`)); totalErrors++; }
  for (const w of warnings) { console.log(c.warn(`  ⚠ ${w}`)); totalWarnings++; }
}

// ── (2) KLİNİK-KAYNAK-EŞLEŞTİRME RAPORU ──
console.log(`\n${c.bold("═══ KLİNİK-KAYNAK RAPORU (Claude.ai dolduracak boşluklar) ═══")}`);
console.log(c.dim("senaryo                       durum    TODO_KLINIK  dallanma  detr.  ref  ekip/ilaç"));
for (const r of reportRows) {
  const nm = r.name.padEnd(28).slice(0, 28);
  const st = (r.clinicalStatus || "?").padEnd(8);
  const todo = String(r.todoKlinik).padStart(3);
  const br = String(r.branchCount).padStart(4);
  const dt = r.hasDeterioration ? c.ok(" var") : c.warn("yok ");
  const rf = String(r.refCount).padStart(3);
  console.log(`  ${nm} ${st} ${todo}        ${br}     ${dt}  ${rf}  ${r.equipCount}/${r.medCount}`);
}

// ── (3) KRİTİK/RİSKLİ — öncelikli insan review ──
const risky = reportRows.filter(r =>
  r.todoKlinik > 0 || r.clinicalStatus === "DRAFT" || (r.isPediatric && r.hasCritical)
);
console.log(`\n${c.bold("═══ ÖNCELİKLİ İNSAN REVIEW (kritik/DRAFT/pediatrik) ═══")}`);
if (risky.length === 0) {
  console.log(c.dim("  (yok)"));
} else {
  for (const r of risky) {
    const flags = [
      r.clinicalStatus === "DRAFT" ? "DRAFT" : null,
      r.todoKlinik > 0 ? `${r.todoKlinik}×TODO_KLINIK` : null,
      r.isPediatric && r.hasCritical ? "pediatrik+kritik" : null,
    ].filter(Boolean).join(", ");
    console.log(`  ${c.warn("⚑")} ${r.name} — ${flags}`);
  }
}

// ── (4) ÖRNEKLEME LİSTESİ ──
console.log(`\n${c.bold("═══ ÖRNEKLEME (manuel inceleme için) ═══")}`);
console.log(c.dim(`  Toplam ${reportRows.length} senaryo. Üretim: ${reportRows.filter(r => r.todoKlinik > 0 || r.clinicalStatus !== "?").length}. Detaylı klinik review: yukarıdaki ⚑ listesi.`));

// ── ÖZET ──
console.log(`\n${"─".repeat(60)}`);
if (totalErrors === 0 && totalWarnings === 0) {
  console.log(c.ok(`✓ ${files.length} senaryo doğrulandı, sorun yok.`));
} else {
  console.log(`${c.err(`${totalErrors} hata`)}, ${c.warn(`${totalWarnings} uyarı`)} — ${files.length} dosyada`);
  if (totalErrors > 0) process.exit(1);
}
