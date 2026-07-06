// PROP_CREDITS ↔ public/3d/props/*.glb senkron kapısı — CC-BY atıf şartı.
// Yeni GLB eklenip kredi satırı unutulursa bu test kırılır (lisans ihlali önlenir).
import { describe, it, expect } from "vitest";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { PROP_CREDITS } from "@/components/patient-3d/props/SketchfabProps";

const PROPS_DIR = join(process.cwd(), "public", "3d", "props");

describe("SketchfabProps CC-BY atıf senkronu", () => {
  it("public/3d/props altındaki her .glb için PROP_CREDITS satırı var", () => {
    const files = readdirSync(PROPS_DIR).filter((f) => f.endsWith(".glb"));
    expect(files.length).toBeGreaterThan(0);
    const credited = new Set(PROP_CREDITS.map((c) => c.file));
    for (const f of files) {
      expect(credited, `${f} için PROP_CREDITS satırı eksik — CC-BY atıf zorunlu`).toContain(f);
    }
  });

  it("her kredi kaydı tam atıf alanlarına sahip (CC-BY-4.0 gereksinimi)", () => {
    for (const c of PROP_CREDITS) {
      expect(c.title).toBeTruthy();
      expect(c.author).toBeTruthy();
      expect(c.authorUrl).toMatch(/^https:\/\/sketchfab\.com\//);
      expect(c.sourceUrl).toMatch(/^https:\/\/sketchfab\.com\/3d-models\//);
      expect(c.license).toBe("CC-BY-4.0");
    }
  });

  it("PROP_CREDITS'te diskte olmayan hayalet dosya yok", () => {
    const files = new Set(readdirSync(PROPS_DIR));
    for (const c of PROP_CREDITS) {
      expect(files, `${c.file} kredisi var ama dosya diskte yok`).toContain(c.file);
    }
  });
});
