// v2 dersi: Blender exporter skinned mesh node'larını köke S=0.01 ile
// koyuyor; three bunu bind'e ek olarak uygulayıp 100x patlatıyor.
// Eski (çalışan) desen: mesh node = rig'in çocuğu, S=1. Patch bunu kurar.
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
const [inPath, outPath] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });
const d = await io.read(inPath);
const scene = d.getRoot().getDefaultScene();
const rig = scene.listChildren().find((n) => n.getName() === "PatientRig");
if (!rig) throw new Error("PatientRig yok");
for (const n of [...scene.listChildren()]) {
  if (n === rig) continue;
  if (!n.getMesh()) continue;
  scene.removeChild(n);
  rig.addChild(n);
  n.setScale([1, 1, 1]);
  n.setTranslation([0, 0, 0]);
  n.setRotation([0, 0, 0, 1]);
  console.log("rig altına:", n.getName());
}
await io.write(outPath, d);
console.log("yazıldı:", outPath);
