#!/usr/bin/env node
// PreToolUse hook — Bash komutlarında tehlikeli pattern'leri yakalar.
// Çıkış kodu 2 → komutu blokla (Claude Code protokolü).

const raw = require("fs").readFileSync(0, "utf8");

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const cmd = input?.tool_input?.command ?? "";

const DANGEROUS = [
  "rm -rf /",
  "rm -rf ~",
  "rm -rf ..",
  "sudo rm",
  "chmod 777",
  "dd if=",
  "mkfs",
  ":(){ :|:& };:",
  "format c:",
  "deltree",
];

const hit = DANGEROUS.find((d) => cmd.includes(d));
if (hit) {
  console.error(`[GUARD] Tehlikeli komut engellendi: "${hit}"`);
  console.error(`Komut: ${cmd}`);
  process.exit(2); // exit 2 = BLOCK
}

process.exit(0);
