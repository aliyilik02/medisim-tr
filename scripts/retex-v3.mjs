// ============================================================
// retex-v3 — Hasta v3 doku/malzeme geçişi (texpass_v3.py çıktılarını takar)
// ============================================================
// Kullanım: node scripts/retex-v3.mjs <girdi.glb> <cikti.glb> <tex_dir>
//   Skin_Body : skin_base.png (dikişsiz) + skin_normal.png (gözenek/kırışık)
//   Hair_Mat  : hair_gray.png (62 yaş kır)
//   Gown_Mat  : gown_hospital.png (hastane önlüğü)
//   Kaş/kirpik: BLEND (MASK sert siyah çizgi veriyordu — 10 Kas ekran ölçümü)
// ============================================================
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const [inPath, outPath, texDir] = process.argv.slice(2);
if (!texDir) {
  console.error("kullanım: node scripts/retex-v3.mjs <girdi.glb> <cikti.glb> <tex_dir>");
  process.exit(1);
}
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const doc = await io.read(inPath);
const mats = new Map(doc.getRoot().listMaterials().map((m) => [m.getName(), m]));
const tex = (file) => doc.createTexture(file.replace(".png", ""))
  .setImage(readFileSync(join(texDir, file))).setMimeType("image/png");

const need = (name) => {
  const m = mats.get(name);
  if (!m) throw new Error(`materyal yok: ${name} (var: ${[...mats.keys()].join(", ")})`);
  return m;
};

need("Skin_Body")
  .setBaseColorTexture(tex("skin_base.png"))
  .setNormalTexture(tex("skin_normal.png"))
  .setNormalScale(0.32)
  .setRoughnessFactor(0.62)
  .setMetallicFactor(0);
need("Hair_Mat").setBaseColorTexture(tex("hair_gray.png"));
need("Eyebrows_Mat").setBaseColorTexture(tex("brow_gray.png"));
need("Gown_Mat").setBaseColorTexture(tex("gown_hospital.png")).setRoughnessFactor(0.9);
for (const n of ["Eyebrows_Mat", "Eyelashes_Mat"]) need(n).setAlphaMode("BLEND");
// Göz akı dokuda çok parlak ("bakakalmış" görünüm) → bir kademe kıs, parlamayı yumuşat.
need("Eyes_Mat").setBaseColorFactor([0.8, 0.78, 0.76, 1]).setRoughnessFactor(0.18);

await io.write(outPath, doc);
console.log("yazıldı:", outPath);
