#!/usr/bin/env node
// PreToolUse — Bash tehlikeli komut guard.
// ES module (package.json "type":"module" uyumlu).
// exit 2 = BLOCK (Claude Code protokolü).

import { readFileSync } from "fs";

const raw = readFileSync(0, "utf8");

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const fullCmd = input?.tool_input?.command ?? "";

// Heredoc başlarsa öncesini al — commit mesajı false positive'lerini önler
const heredocMatch = fullCmd.match(/^([\s\S]*?)\s*<<\s*['"]?EOF/);
const cmd = heredocMatch ? heredocMatch[1] : fullCmd;

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
