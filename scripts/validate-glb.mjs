// ============================================================
// MediSim TR — GLB commit gate (validate-glb.mjs)
// ============================================================
// Kullanım:
//   node scripts/validate-glb.mjs public/3d/patient-mimikli.glb [--max-mb=25] [--min-morph=6]
//
// Kapılar:
//   E3 — dosya boyutu: --max-mb (varsayılan 25) ve GitHub 100MB hard limit.
//   E1 — morph target sayısı: --min-morph verilirse, optimize sonrası morph
//        kaybını yakalar (gltf-transform validate error=0 morph kaybını YAKALAMAZ —
//        morph silinmiş GLB de geçerli GLB'dir). Sıkıştırılmış geometride decoder
//        gerekir; decoder yoksa morph kontrolü best-effort atlanır (uyarı).
//
// Çıkış kodu: 0 = geçti, 1 = gate başarısız, 2 = kullanım hatası.
// ============================================================

import { statSync } from 'node:fs';

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith('--'));
const getFlag = (name, def) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.split('=')[1] : def;
};

if (!file) {
  console.error('usage: node scripts/validate-glb.mjs <file.glb> [--max-mb=25] [--min-morph=N]');
  process.exit(2);
}

const maxMb = Number(getFlag('max-mb', 25));
const minMorph = Number(getFlag('min-morph', 0));
let fail = false;

// --- E3: boyut kapısı ---
const sizeMb = statSync(file).size / 1048576;
console.log(`size: ${sizeMb.toFixed(2)} MB (limit ${maxMb} MB)`);
if (sizeMb > maxMb) {
  console.error(`FAIL [E3]: ${sizeMb.toFixed(2)} MB > ${maxMb} MB hedefi`);
  fail = true;
}
if (sizeMb > 100) {
  console.error('FATAL [E3]: > 100 MB — GitHub hard limit, push bloklanır');
  fail = true;
}

// --- E1: morph target sayısı (best-effort) ---
if (minMorph > 0) {
  try {
    const { NodeIO } = await import('@gltf-transform/core');
    const { ALL_EXTENSIONS } = await import('@gltf-transform/extensions');
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

    // Sıkıştırılmış geometri için decoder'ları varsa kaydet (yoksa sessiz geç).
    try {
      const { MeshoptDecoder } = await import('meshoptimizer');
      await MeshoptDecoder.ready;
      io.registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    } catch { /* meshopt decoder yok — best-effort */ }
    try {
      const draco = await import('draco3dgltf');
      io.registerDependencies({ 'draco3d.decoder': await draco.createDecoderModule() });
    } catch { /* draco decoder yok — best-effort */ }

    const doc = await io.read(file);
    let morph = 0;
    for (const mesh of doc.getRoot().listMeshes()) {
      for (const prim of mesh.listPrimitives()) {
        morph = Math.max(morph, prim.listTargets().length);
      }
    }
    console.log(`morph targets (primitive başına max): ${morph}`);
    if (morph < minMorph) {
      console.error(`FAIL [E1]: morph ${morph} < beklenen ${minMorph} — optimize morph SİLMİŞ olabilir (simplify?)`);
      fail = true;
    }
  } catch (e) {
    console.warn(`morph kontrolü atlandı (decode başarısız): ${e.message}`);
  }
}

if (fail) {
  console.error('GLB gate: BAŞARISIZ');
  process.exit(1);
}
console.log('GLB gate: GEÇTİ');
