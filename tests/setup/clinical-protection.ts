// ============================================================
// MediSim TR — Klinik Dosya Koruma (Test Setup)
// ============================================================
// Test koşumu sırasında klinik veri dosyalarına yazma denemesi
// olursa hata fırlatır. Senaryo, ilaç ve ekipman dosyaları
// test'lerden hiçbir koşulda değişmemeli — bir test "veriyi
// düzeltmem gerekiyor" diyorsa testi düzelt, veriyi değil.
//
// Pre-commit hook'ta da git diff ile ek koruma var (.husky/pre-commit).
// ============================================================

import fs from "node:fs";
import path from "node:path";
import { beforeAll } from "vitest";

const PROTECTED_PATTERNS: RegExp[] = [
  /[\\/]src[\\/]data[\\/]scenarios[\\/]/,
  /[\\/]src[\\/]data[\\/]medications\.ts$/,
  /[\\/]src[\\/]data[\\/]medications-extended\.ts$/,
  /[\\/]src[\\/]data[\\/]equipment\.ts$/,
  /[\\/]src[\\/]data[\\/]lab-panels\.ts$/,
  /[\\/]src[\\/]data[\\/]imaging\.ts$/,
];

function isProtected(target: fs.PathLike | number): boolean {
  if (typeof target === "number") return false;
  const raw = target instanceof URL ? target.pathname : target.toString();
  const abs = path.isAbsolute(raw) ? raw : path.resolve(raw);
  return PROTECTED_PATTERNS.some((re) => re.test(abs));
}

function fail(op: string, target: fs.PathLike | number): never {
  const label = typeof target === "number" ? `<fd:${target}>` : target.toString();
  throw new Error(
    `KLİNİK DOSYA KORUMASI — '${op}' engellendi: ${label}\n` +
      `Bu dosya senaryo/ilaç/ekipman klinik verisi içeriyor. Testler bu dosyalara yazamaz.\n` +
      `Test başarısız oluyorsa testi düzelt; klinik veriyi DEĞİŞTİRME.`
  );
}

beforeAll(() => {
  const originalWriteSync = fs.writeFileSync.bind(fs);
  const originalAppendSync = fs.appendFileSync.bind(fs);
  const originalWrite = fs.promises.writeFile.bind(fs.promises);
  const originalAppend = fs.promises.appendFile.bind(fs.promises);

  fs.writeFileSync = ((file: fs.PathLike | number, ...rest: unknown[]) => {
    if (isProtected(file)) fail("writeFileSync", file);
    return (originalWriteSync as unknown as (...a: unknown[]) => unknown)(
      file,
      ...rest
    );
  }) as typeof fs.writeFileSync;

  fs.appendFileSync = ((file: fs.PathLike | number, ...rest: unknown[]) => {
    if (isProtected(file)) fail("appendFileSync", file);
    return (originalAppendSync as unknown as (...a: unknown[]) => unknown)(
      file,
      ...rest
    );
  }) as typeof fs.appendFileSync;

  fs.promises.writeFile = (async (
    file: fs.PathLike | fs.promises.FileHandle,
    ...rest: unknown[]
  ) => {
    if (typeof file !== "object" || file instanceof URL) {
      if (isProtected(file as fs.PathLike)) fail("promises.writeFile", file as fs.PathLike);
    }
    return (originalWrite as unknown as (...a: unknown[]) => Promise<void>)(
      file as fs.PathLike,
      ...rest
    );
  }) as typeof fs.promises.writeFile;

  fs.promises.appendFile = (async (
    file: fs.PathLike | fs.promises.FileHandle,
    ...rest: unknown[]
  ) => {
    if (typeof file !== "object" || file instanceof URL) {
      if (isProtected(file as fs.PathLike)) fail("promises.appendFile", file as fs.PathLike);
    }
    return (originalAppend as unknown as (...a: unknown[]) => Promise<void>)(
      file as fs.PathLike,
      ...rest
    );
  }) as typeof fs.promises.appendFile;
});

export const __PROTECTED_PATTERNS_FOR_TEST = PROTECTED_PATTERNS;
export const __isProtectedForTest = isProtected;
