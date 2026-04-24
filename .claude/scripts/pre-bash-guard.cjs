#!/usr/bin/env node
// PreToolUse — Bash tehlikeli komut guard.
// .cjs uzantısı: package.json "type":"module" olsa da CommonJS olarak çalışır.
// exit 2 = BLOCK (Claude Code protokolü).
//
// Strateji: Heredoc/commit mesajı false positive'lerinden kaçınmak için
// komutun sadece gerçek komut kısmını (heredoc başlamadan öncesini) kontrol ederiz.

const raw = require("fs").readFileSync(0, "utf8");

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const fullCmd = input?.tool_input?.command ?? "";

// Heredoc başlarsa öncesini al ("<<'EOF'" veya "<<EOF" öncesi)
const heredocMatch = fullCmd.match(/^([\s\S]*?)\s*<<\s*['"]?EOF/);
const cmd = heredocMatch ? heredocMatch[1] : fullCmd;

// Tehlikeli pattern'ler — regex ile kesin eşleşme (çok geniş substring değil)
const DANGEROUS_PATTERNS = [
  /\brm\s+-rf\s+(\/|~|\.\.)\s*(&|;|$)/,   // rm -rf / ya da rm -rf ~ ya da rm -rf ..
  /\bsudo\s+rm\b/,                          // sudo rm (herhangi bir)
  /\bchmod\s+777\s+\//,                     // chmod 777 /...
  /\bdd\s+if=\/dev\/zero\s+of=\/dev\//,    // disk silme
  /\bmkfs\b/,                               // dosya sistemi biçimlendirme
  /:\(\)\s*\{\s*:\s*\|/,                    // fork bomb
];

const hit = DANGEROUS_PATTERNS.find((re) => re.test(cmd));
if (hit) {
  console.error(`[GUARD] Tehlikeli komut engellendi.`);
  console.error(`Pattern: ${hit}`);
  process.exit(2);
}

process.exit(0);
