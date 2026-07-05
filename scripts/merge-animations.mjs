// ============================================================
// merge-animations — eski GLB'nin animasyonlarını yeni modele taşı
// ============================================================
// Blender 5.1 action-export'u three'de işlemedi (v2 dersi) → klipler
// KANITLANMIŞ eski dosyadan alınır. Kanal hedefleri düğüm ADIYLA
// eşlenir (':' normalize: Blender 'mixamorig:Head' ↔ eski 'mixamorigHead').
// Kullanım: node scripts/merge-animations.mjs <animKaynak.glb> <hedef.glb> <cikti.glb>
// ============================================================
import { NodeIO } from "@gltf-transform/core";
import { KHRONOS_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";

const [srcPath, dstPath, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error("kullanım: node merge-animations.mjs <animKaynak.glb> <hedef.glb> <cikti.glb>");
  process.exit(1);
}

const io = new NodeIO()
  .registerExtensions(KHRONOS_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const src = await io.read(srcPath);
const dst = await io.read(dstPath);

const norm = (n) => (n ?? "").replace(/:/g, "");
const dstNodes = new Map();
for (const n of dst.getRoot().listNodes()) dstNodes.set(norm(n.getName()), n);

let copied = 0, missed = 0;
for (const anim of src.getRoot().listAnimations()) {
  const newAnim = dst.createAnimation(anim.getName());
  const samplerMap = new Map();
  for (const ch of anim.listChannels()) {
    const tNode = ch.getTargetNode();
    const dNode = tNode ? dstNodes.get(norm(tNode.getName())) : null;
    if (!dNode) { missed++; continue; }
    const s = ch.getSampler();
    let ns = samplerMap.get(s);
    if (!ns) {
      ns = dst.createAnimationSampler();
      const inp = s.getInput();
      const out = s.getOutput();
      const mk = (acc) => {
        const a = dst.createAccessor(acc.getName());
        a.setType(acc.getType());
        a.setArray(acc.getArray());
        return a;
      };
      ns.setInput(mk(inp)).setOutput(mk(out)).setInterpolation(s.getInterpolation());
      samplerMap.set(s, ns);
      newAnim.addSampler(ns);
    }
    const nc = dst.createAnimationChannel();
    nc.setTargetNode(dNode).setTargetPath(ch.getTargetPath()).setSampler(ns);
    newAnim.addChannel(nc);
  }
  copied++;
  console.log("klip:", anim.getName(), "kanal:", newAnim.listChannels().length);
}
console.log(`toplam: ${copied} klip; eşleşmeyen kanal: ${missed}`);
await io.write(outPath, dst);
console.log("yazıldı:", outPath);
