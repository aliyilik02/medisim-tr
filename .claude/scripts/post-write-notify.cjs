#!/usr/bin/env node
// PostToolUse — Write/Edit sonrası senaryo değişikliği bildirimi.
// .cjs uzantısı: package.json "type":"module" olsa da CommonJS olarak çalışır.

const raw = require("fs").readFileSync(0, "utf8");

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const path = input?.tool_input?.file_path ?? "";
if (path.includes("src/data/scenarios/") && path.endsWith(".ts")) {
  console.log(`[hook] Senaryo değiştirildi: ${path} — /senaryo-sema-dogrulayici çalıştır`);
}

process.exit(0);
