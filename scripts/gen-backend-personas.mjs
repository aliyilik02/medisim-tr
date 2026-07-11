// ============================================================
// gen-backend-personas — senaryo → backend persona kataloğu
// ============================================================
// Prompt injection kapanışı: /api/chat artık patient_persona'yı
// İSTEMCİDEN ALMAZ; scenario_id ile bu üretilmiş katalogdan seçer.
// Tek gerçek kaynak src/data/scenarios — bu script personaBuilder'ı
// build-time çalıştırıp backend/src/generated/personas.ts üretir.
// Senaryo eklenince/persona değişince: npm run gen:personas
// Drift bekçisi: tests/regression/backend-persona-parity.test.ts
// ============================================================

import { build } from "esbuild";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outBundle = path.join(root, "node_modules", ".tmp-gen-personas.mjs");

await build({
  stdin: {
    contents: `
      import { SCENARIOS } from "@/data/scenarios";
      import { buildPatientPersona } from "@/components/dialog/personaBuilder";
      export const entries = SCENARIOS.map((s) => [s.id, buildPatientPersona(s)]);
    `,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  format: "esm",
  platform: "node",
  alias: { "@": path.join(root, "src") },
  outfile: outBundle,
  logLevel: "silent",
});

const { entries } = await import(pathToFileURL(outBundle).href);

const map = Object.fromEntries(entries);
const ids = Object.keys(map);
if (ids.length === 0) throw new Error("Hiç senaryo bulunamadı — üretim iptal");

const body = `// ============================================================
// AUTO-GENERATED — scripts/gen-backend-personas.mjs. ELLE DÜZENLEME.
// Kaynak: src/data/scenarios + personaBuilder. Yenile: npm run gen:personas
// ============================================================

export const SCENARIO_PERSONAS: Record<string, string> = ${JSON.stringify(map, null, 2)};
`;

const outDir = path.join(root, "backend", "src", "generated");
mkdirSync(outDir, { recursive: true });
writeFileSync(path.join(outDir, "personas.ts"), body, "utf8");
console.log(`personas.ts üretildi — ${ids.length} senaryo: ${ids.join(", ")}`);
