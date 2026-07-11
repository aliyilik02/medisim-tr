// ============================================================
// MediSim TR — Klinik Kod Çekim Scripti (manuel tetikleme)
// ============================================================
// Çevrimiçi public API'lerden ICD-10, SNOMED CT ve RxNorm kodlarını
// çeker, src/data/clinical-codes/ altına yazar. CI'da otomatik
// çalışmaz — kullanıcı `npx tsx scripts/fetch-clinical-codes.ts`
// ile manuel tetikler.
//
// Kaynaklar:
// - WHO ICD API (https://icd.who.int/icdapi)
// - NIH RxNav RxNorm REST (https://rxnav.nlm.nih.gov/REST/)
// - SNOMED CT browser API (https://browser.ihtsdotools.org)
//
// NOT: API anahtarları bazı kaynaklar için gerekir. Bu script şu an
// sadece RxNorm public REST'i kullanır (anahtar gerektirmez). ICD-10
// ve SNOMED CT için yerel JSON dosyalarına manuel eklendi (Faz 4
// başlangıç verisi). Otomatik çekim ileride genişletilebilir.
// ============================================================

import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const PROJECT_ROOT = path.resolve(import.meta.dirname, "..");
const OUT_DIR = path.join(PROJECT_ROOT, "src", "data", "clinical-codes");

// 14 senaryomuzu kapsayan minimum subset
const RELEVANT_RXNORM_NAMES = [
  "epinephrine", "norepinephrine", "dopamine", "dobutamine",
  "diphenhydramine", "hydrocortisone", "methylprednisolone",
  "magnesium sulfate", "alteplase", "tenecteplase", "aspirin",
  "clopidogrel", "ticagrelor", "heparin", "enoxaparin",
  "labetalol", "hydralazine", "nifedipine",
  "regular insulin", "glucagon", "octreotide",
  "ketamine", "etomidate", "propofol", "midazolam",
  "succinylcholine", "rocuronium", "vecuronium", "sugammadex",
  "ceftriaxone", "vancomycin", "piperacillin tazobactam",
  "furosemide", "dextrose 50%",
];

interface _RxNormMatch {
  drugConcept?: { rxcui: string; name: string };
}

async function fetchRxNormCUI(name: string): Promise<{ cui: string; canonical: string } | null> {
  const url = `https://rxnav.nlm.nih.gov/REST/approximateTerm.json?term=${encodeURIComponent(name)}&maxEntries=1`;
  try {
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const json = (await res.json()) as { approximateGroup?: { candidate?: Array<{ rxcui: string; name: string }> } };
    const c = json.approximateGroup?.candidate?.[0];
    return c ? { cui: c.rxcui, canonical: c.name } : null;
  } catch (err) {
    console.warn(`RxNorm fetch hatası (${name}):`, err);
    return null;
  }
}

async function refreshRxNorm() {
  console.log(`[RxNorm] ${RELEVANT_RXNORM_NAMES.length} ilaç çekiliyor...`);
  const results: Array<{ query: string; cui: string | null; canonical: string | null }> = [];
  for (const name of RELEVANT_RXNORM_NAMES) {
    const r = await fetchRxNormCUI(name);
    results.push({ query: name, cui: r?.cui ?? null, canonical: r?.canonical ?? null });
    await new Promise((r) => setTimeout(r, 200)); // rate limit
  }
  const out = path.join(OUT_DIR, "rxnorm", "_raw", "fetch-result.json");
  await mkdir(path.dirname(out), { recursive: true });
  await writeFile(
    out,
    JSON.stringify({ fetched_at: new Date().toISOString(), results }, null, 2),
    "utf-8"
  );
  console.log(`[RxNorm] ${results.filter((r) => r.cui).length}/${results.length} bulundu → ${out}`);
}

async function main() {
  const arg = process.argv[2];
  if (arg === "rxnorm" || !arg) {
    await refreshRxNorm();
  }
  if (arg === "icd10") {
    console.log("[ICD-10] WHO API anahtarı gerekir — manuel doğrulama için relevant-codes.json kullanın.");
  }
  if (arg === "snomed") {
    console.log("[SNOMED] Browser API rate-limited — manuel doğrulama için relevant-codes.json kullanın.");
  }
  console.log("Tamam.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
