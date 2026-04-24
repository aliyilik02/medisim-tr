#!/usr/bin/env node
// PostToolUse hook — Write/Edit sonrası senaryo dosyası değişikliğini bildirir.
// stdin'den JSON okur (fd 0 = platform-agnostic), /dev/stdin Windows'ta çalışmaz.

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
