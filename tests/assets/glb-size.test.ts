// ============================================================
// MediSim TR — GLB boyut regresyon kapısı (vitest)
// ============================================================
// Neden var: geçmişte worktree'ye 161MB'lik patient-mimikli.glb
// sızdı (GitHub 100MB hard limit'i aşar, push bloklanır). Optimize
// sonrası 16.69MB'a indi. Bu test, herhangi bir GLB'nin yeniden
// şişmesini commit ÖNCESİ yakalar.
//
// Kapılar (scripts/validate-glb.mjs ile aynı 25MB konvansiyonu):
//   • Dosya başına  : < MAX_PER_FILE_MB (25 MB) — GitHub 100MB'ın çok altı.
//   • Toplam bütçe  : < MAX_TOTAL_MB    (60 MB) — tüm public/3d 3D yükü.
//
// Dosya listesi readdirSync ile DİNAMİK alınır: public/3d/ altına yeni
// bir .glb eklenince bu test onu otomatik kapsar (manuel liste yok).
// ============================================================

import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// --- Kapı limitleri ---
const MAX_PER_FILE_MB = 25; // validate-glb.mjs varsayılanıyla aynı
const MAX_TOTAL_MB = 60; // tüm 3D varlık bütçesi için makul üst sınır
const BYTES_PER_MB = 1024 * 1024;

// vitest.config root'tan bağımsız çalışsın diye yolu bu dosyaya göre çöz.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GLB_DIR = path.resolve(__dirname, "../../public/3d");

/** public/3d/ altındaki tüm .glb dosyalarını boyutlarıyla döndürür. */
function listGlbFiles(): Array<{ name: string; bytes: number; mb: number }> {
  return readdirSync(GLB_DIR)
    .filter((f) => f.toLowerCase().endsWith(".glb"))
    .map((name) => {
      const bytes = statSync(path.join(GLB_DIR, name)).size;
      return { name, bytes, mb: bytes / BYTES_PER_MB };
    })
    .sort((a, b) => b.bytes - a.bytes); // büyükten küçüğe
}

describe("GLB boyut regresyon kapısı (public/3d)", () => {
  const glbs = listGlbFiles();

  it("public/3d altında en az bir GLB bulunur (yol/glob sağlığı)", () => {
    // Bu test 0 dosya bulursa kapı sessizce devre dışı kalmış demektir —
    // o yüzden varlık kontrolü de bir regresyon koruması.
    expect(glbs.length).toBeGreaterThan(0);
  });

  // Her GLB için ayrı assertion: hangi dosyanın şiştiği net görünür.
  it.each(glbs.map((g) => [g.name, g.mb] as const))(
    "%s < %s MB olmalı (dosya başına kapı)",
    (name, mb) => {
      expect(
        mb,
        `${name} = ${mb.toFixed(2)} MB, ${MAX_PER_FILE_MB} MB sınırını aştı. ` +
          `Düzeltme: gltf-transform meshopt + texture küçült (npm run glb:* / validate-glb.mjs). ` +
          `Morph target varsa Draco YASAK.`,
      ).toBeLessThan(MAX_PER_FILE_MB);
    },
  );

  it(`tüm GLB'lerin toplamı < ${MAX_TOTAL_MB} MB olmalı (3D bütçe kapısı)`, () => {
    const totalMb = glbs.reduce((sum, g) => sum + g.mb, 0);
    const breakdown = glbs
      .map((g) => `  ${g.name}: ${g.mb.toFixed(2)} MB`)
      .join("\n");
    expect(
      totalMb,
      `Toplam 3D yükü ${totalMb.toFixed(2)} MB, ${MAX_TOTAL_MB} MB bütçesini aştı.\n${breakdown}`,
    ).toBeLessThan(MAX_TOTAL_MB);
  });

  it("hiçbir GLB GitHub 100MB hard limit'ine yaklaşmamalı (fatal kapı)", () => {
    for (const g of glbs) {
      expect(
        g.mb,
        `${g.name} = ${g.mb.toFixed(2)} MB — GitHub 100MB hard limit'i, push bloklanır.`,
      ).toBeLessThan(100);
    }
  });
});
