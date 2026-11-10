// ============================================================
// inject-v3 — Hasta v3 (B yolu) parçalarını ÇALIŞAN v2 GLB'ye takar
// ============================================================
// Kullanım: node scripts/inject-v3.mjs <taban.glb> <v3-vmaster.glb> <cikti.glb>
//
// inject-parts.mjs'ten farkı (10 Kas 2026):
//  1. Tabandaki eski parçalar SÖKÜLÜR (göz/kaş/kirpik/saç/önlük) → yenisi takılır
//     (+ YENİ diş ve dil).
//  2. Uzay çevirisi vertex SIRASINA güvenmez: kaynak gövde → taban gövde en-yakın
//     nokta farklarının medyanı (gövdeler aynı ham kaynaktan, bölünme farklı).
//     Yayılım (MAD) raporlanır — büyükse çeviri güvenilmez demektir.
//  3. YÜZ ŞEKLİ AKTARIMI: gövdenin 52 ARKit morph'u kirpik/kaş'a (vertex başına
//     kNN), diş/dile (çene anahtarları, bileşen-rijit) taşınır → göz kırpınca
//     kirpik kapağı izler, ağız açılınca alt diş + dil iner.
//  4. Göz/diş/dil OPAK; saç/kaş/kirpik MASK (BLEND sıralama titremesi yok).
// Gövde, iskelet, animasyonlar, gövde morph'ları tabandan AYNEN kalır.
// ============================================================
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { dequantize, prune } from "@gltf-transform/functions";

const [basePath, srcPath, outPath] = process.argv.slice(2);
if (!outPath) {
  console.error("kullanım: node scripts/inject-v3.mjs <taban.glb> <v3-vmaster.glb> <cikti.glb>");
  process.exit(1);
}
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const base = await io.read(basePath);
await base.transform(dequantize());
const src = await io.read(srcPath);
await src.transform(dequantize());

const OLD_PARTS = ["PatientEyes", "PatientEyebrows", "PatientEyelashes", "PatientHair", "PatientGown"];
const NEW_PARTS = ["PatientEyes", "PatientEyebrows", "PatientEyelashes", "PatientHair",
  "PatientTeeth", "PatientTongue", "PatientGown"];
const MORPH_FULL = new Set(["PatientEyebrows", "PatientEyelashes"]); // vertex başına kNN
const MORPH_JAW = new Set(["PatientTeeth", "PatientTongue"]);        // çene anahtarları, rijit
const JAW_KEYS = new Set(["jawOpen", "jawForward", "jawLeft", "jawRight", "mouthClose"]);
const OPAQUE = new Set(["PatientTeeth", "PatientTongue", "PatientGown"]);
const MASKED = new Set(["PatientHair", "PatientEyebrows", "PatientEyelashes"]);

const norm = (n) => (n ?? "").replace(/:/g, "");
const bRoot = base.getRoot();
const bNodes = bRoot.listNodes();
const bBody = bNodes.find((n) => n.getName() === "PatientBody");
const bSkin = bBody.getSkin();
const bJointIdx = new Map(bSkin.listJoints().map((j, i) => [norm(j.getName()), i]));
const bodyParent = bNodes.find((n) => n.listChildren().includes(bBody)) ?? null;
const bScene = bRoot.listScenes()[0];
const buffer = bRoot.listBuffers()[0];

// ── 1. eski parçaları sök ──
for (const name of OLD_PARTS) {
  const n = bNodes.find((x) => x.getName() === name);
  if (!n) { console.log("taban parça yok:", name); continue; }
  n.getMesh()?.dispose();
  n.dispose();
  console.log("SÖKÜLDÜ:", name);
}

// ── 2. uzay çevirisi: en-yakın nokta medyanı (sıradan bağımsız) ──
let bPrim = bBody.getMesh().listPrimitives()[0];
let bPos = bPrim.getAttribute("POSITION").getArray();
const sBody = src.getRoot().listNodes().find((n) => n.getName() === "PatientBody");
const sPos = sBody.getMesh().listPrimitives()[0].getAttribute("POSITION").getArray().slice();
const nB = bPos.length / 3;

// basit ızgara (uniform grid) en-yakın sorgusu
function buildGrid(arr, cell) {
  const g = new Map();
  for (let i = 0; i < arr.length / 3; i++) {
    const k = `${Math.floor(arr[i * 3] / cell)},${Math.floor(arr[i * 3 + 1] / cell)},${Math.floor(arr[i * 3 + 2] / cell)}`;
    let b = g.get(k); if (!b) g.set(k, (b = [])); b.push(i);
  }
  return { g, cell, arr };
}
function kNearest(grid, p, k, maxRing = 6) {
  const { g, cell, arr } = grid;
  const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
  const res = [];
  for (let r = 0; r <= maxRing; r++) {
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
      if (Math.max(Math.abs(x - cx), Math.abs(y - cy), Math.abs(z - cz)) !== r) continue;
      const b = g.get(`${x},${y},${z}`); if (!b) continue;
      for (const i of b) {
        const d = (arr[i * 3] - p[0]) ** 2 + (arr[i * 3 + 1] - p[1]) ** 2 + (arr[i * 3 + 2] - p[2]) ** 2;
        res.push([d, i]);
      }
    }
    if (res.length >= k && r >= 1) break;
  }
  res.sort((a, b) => a[0] - b[0]);
  return res.slice(0, k);
}
// bbox ile kaba ölçek kontrolü + ilk tahmin
function bbox(arr) {
  const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < arr.length; i += 3) for (let a = 0; a < 3; a++) {
    mn[a] = Math.min(mn[a], arr[i + a]); mx[a] = Math.max(mx[a], arr[i + a]);
  }
  return { mn, mx, size: mx.map((v, a) => v - mn[a]) };
}
// Taban KHR_mesh_quantization'lı: dequantize sonrası gövde konumları normalize
// uzayda, ölçek skin inverseBindMatrices'e gömülü. Parçalar aynı skin'i
// paylaşacağı için AYNI normalize uzaya taşınır: p' = p·K − T (K tekdüze).
const bb = bbox(bPos), sb0 = bbox(sPos);
const ratios = bb.size.map((v, a) => v / sb0.size[a]);
const K = (ratios[0] + ratios[1] + ratios[2]) / 3;
console.log("ölçek K (taban/kaynak):", +K.toFixed(5), "eksen:", ratios.map((v) => +v.toFixed(5)));
for (let i = 0; i < sPos.length; i++) sPos[i] *= K;
const sb = bbox(sPos);
const T0 = [0, 1, 2].map((a) => (sb.mn[a] + sb.mx[a]) / 2 - (bb.mn[a] + bb.mx[a]) / 2);
const cell = Math.max(...bb.size) / 120;
let bGrid = buildGrid(bPos, cell);
const dx = [], dy = [], dz = [];
for (let i = 0; i < sPos.length / 3; i += 7) {
  const p = [sPos[i * 3] - T0[0], sPos[i * 3 + 1] - T0[1], sPos[i * 3 + 2] - T0[2]];
  const [[, j]] = kNearest(bGrid, p, 1);
  dx.push(sPos[i * 3] - bPos[j * 3]); dy.push(sPos[i * 3 + 1] - bPos[j * 3 + 1]); dz.push(sPos[i * 3 + 2] - bPos[j * 3 + 2]);
}
const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const T = [med(dx), med(dy), med(dz)];
const mad = (a, m) => med(a.map((v) => Math.abs(v - m)));
const spread = [mad(dx, T[0]), mad(dy, T[1]), mad(dz, T[2])];
console.log("UZAY ÇEVİRİSİ T:", T.map((v) => +v.toFixed(5)), "yayılım(MAD):", spread.map((v) => +v.toExponential(2)),
  "| gövde boyu:", +Math.max(...bb.size).toFixed(4));
if (Math.max(...spread) > Math.max(...bb.size) * 0.002) {
  console.error("UYARI: çeviri yayılımı boyun %0.2'sinden büyük — gövdeler örtüşmüyor olabilir");
}

// ── 2b. GÖVDE AĞINI YENİDEN KUR (UV dikişi onarımı) ──
// Taban gövdede UV dikişleri bölünmemiş (yalnız 34 çakışık köşe): v2'nin
// köşe-başına UV kopyası, iki adaya ait köşeyi tek UV'ye zorlamış → boyundaki
// üçgen sırası dokuda baş adasından gövde adasına uzanıp aradaki her şeyi
// örnekliyordu (koyu boyun halkası, 10 Kas 2026 ölçümü). Kaynak gövde Blender
// çıktısı: dikişler doğru bölünmüş. Aynı ham gövde, aynı 52 morph (ad sırası
// doğrulandı) → kaynak primitive tabanın normalize uzayına taşınıp eskisinin
// yerine konur. İskelet/skin/animasyon tabanın kanıtlanmış hali kalır.
{
  const sPrimB = sBody.getMesh().listPrimitives()[0];
  const sJointsB = sBody.getSkin().listJoints().map((j) => norm(j.getName()));
  const sTN = sBody.getMesh().getExtras()?.targetNames ?? [];
  const bTN = bBody.getMesh().getExtras()?.targetNames ?? [];
  if (JSON.stringify(sTN) !== JSON.stringify(bTN)) throw new Error("gövde morph adları/sırası farklı — yeniden kurulmaz");
  const np = base.createPrimitive();
  np.setIndices(base.createAccessor().setType("SCALAR").setArray(sPrimB.getIndices().getArray().slice()).setBuffer(buffer));
  for (const sem of sPrimB.listSemantics()) {
    const acc = sPrimB.getAttribute(sem);
    let arr = acc.getArray().slice();
    if (sem === "POSITION") {
      for (let i = 0; i < arr.length; i += 3) {
        arr[i] = arr[i] * K - T[0]; arr[i + 1] = arr[i + 1] * K - T[1]; arr[i + 2] = arr[i + 2] * K - T[2];
      }
    } else if (sem === "JOINTS_0") {
      const remap = sJointsB.map((jn) => {
        const t = bJointIdx.get(jn);
        if (t === undefined) throw new Error(`gövde joint tabanda yok: ${jn}`);
        return t;
      });
      const out = new Uint16Array(arr.length);
      for (let i = 0; i < arr.length; i++) out[i] = remap[arr[i]];
      arr = out;
    }
    np.setAttribute(sem, base.createAccessor().setType(acc.getType()).setArray(arr).setBuffer(buffer));
  }
  for (const t of sPrimB.listTargets()) {
    const nt = base.createPrimitiveTarget(t.getName());
    for (const sem of t.listSemantics()) {
      const arr = t.getAttribute(sem).getArray().slice();
      if (sem === "POSITION") for (let i = 0; i < arr.length; i++) arr[i] *= K; // delta: yalnız ölçek
      nt.setAttribute(sem, base.createAccessor().setType("VEC3").setArray(arr).setBuffer(buffer));
    }
    np.addTarget(nt);
  }
  np.setMaterial(bPrim.getMaterial());
  const bMesh = bBody.getMesh();
  bMesh.removePrimitive(bPrim);
  bMesh.addPrimitive(np);
  bPrim = np;
  bPos = np.getAttribute("POSITION").getArray();
  bGrid = buildGrid(bPos, cell);
  console.log("GÖVDE YENİDEN KURULDU: köşe", bPos.length / 3, "| morph", np.listTargets().length,
    "| hedef semantikleri", np.listTargets()[0].listSemantics().join(","));
}

// ── gövde morph deltaları (yeni gövde) ──
const targetNames = bBody.getMesh().getExtras()?.targetNames ?? [];
const bTargets = bPrim.listTargets().map((t) => t.getAttribute("POSITION").getArray());
console.log("gövde morph:", bTargets.length, "ad:", targetNames.length);

// ── 3. yeni parçaları tak ──
const sNodes = src.getRoot().listNodes();
for (const name of NEW_PARTS) {
  const sNode = sNodes.find((n) => n.getName() === name);
  if (!sNode) { console.log("KAYNAKTA YOK:", name); continue; }
  const sSkin = sNode.getSkin();
  const sJoints = sSkin ? sSkin.listJoints().map((j) => norm(j.getName())) : [];
  const dMesh = base.createMesh(name);
  for (const prim of sNode.getMesh().listPrimitives()) {
    const dPrim = base.createPrimitive();
    const idx = prim.getIndices();
    if (idx) dPrim.setIndices(base.createAccessor().setType("SCALAR").setArray(idx.getArray().slice()).setBuffer(buffer));
    let posOut = null;
    for (const sem of prim.listSemantics()) {
      const acc = prim.getAttribute(sem);
      let arr = acc.getArray().slice();
      if (sem === "POSITION") {
        const nrm = prim.getAttribute("NORMAL")?.getArray();
        const puff = name === "PatientGown" ? 0.02 : 0; // v2.1 dersi: kalça clipping
        for (let i = 0; i < arr.length; i += 3) {
          arr[i] = arr[i] * K - T[0]; arr[i + 1] = arr[i + 1] * K - T[1]; arr[i + 2] = arr[i + 2] * K - T[2];
          if (puff && nrm) { arr[i] += nrm[i] * puff * K; arr[i + 1] += nrm[i + 1] * puff * K; arr[i + 2] += nrm[i + 2] * puff * K; }
        }
        arr = new Float32Array(arr);
        posOut = arr;
      } else if (sem === "JOINTS_0") {
        const remap = sJoints.map((jn) => {
          const t = bJointIdx.get(jn);
          if (t === undefined) throw new Error(`joint tabanda yok: ${jn}`);
          return t;
        });
        const out = new Uint16Array(arr.length);
        for (let i = 0; i < arr.length; i++) out[i] = remap[arr[i]];
        arr = out;
      } else if (sem.startsWith("TEXCOORD_1") || sem.startsWith("COLOR_")) {
        continue;
      }
      dPrim.setAttribute(sem, base.createAccessor().setType(acc.getType()).setArray(arr).setBuffer(buffer));
    }

    // ── yüz şekli aktarımı ──
    if (posOut && (MORPH_FULL.has(name) || MORPH_JAW.has(name)) && bTargets.length) {
      const nv = posOut.length / 3;
      const deltas = bTargets.map(() => new Float32Array(nv * 3));
      const nearest = [];
      for (let i = 0; i < nv; i++) {
        const nn = kNearest(bGrid, [posOut[i * 3], posOut[i * 3 + 1], posOut[i * 3 + 2]], 6);
        nearest.push(nn.map(([d, j]) => [1 / (Math.sqrt(d) + 1e-5) ** 2, j]));
      }
      const interp = (ti, i) => {
        let ws = 0; const o = [0, 0, 0]; const D = bTargets[ti];
        for (const [w, j] of nearest[i]) { ws += w; o[0] += D[j * 3] * w; o[1] += D[j * 3 + 1] * w; o[2] += D[j * 3 + 2] * w; }
        return o.map((v) => v / ws);
      };
      if (MORPH_FULL.has(name)) {
        // Kaş göz kapağına komşu: göz anahtarları kaşı da indirirdi (kırpınca kaş
        // düşer). Kaşa yalnız kaş/burun/yanak anahtarları; kirpiğe hepsi.
        const skip = (ti) => name === "PatientEyebrows" && /^eye(Blink|Look|Squint|Wide)/.test(targetNames[ti]);
        for (let ti = 0; ti < bTargets.length; ti++) for (let i = 0; i < nv; i++) {
          if (skip(ti)) continue;
          const o = interp(ti, i);
          deltas[ti][i * 3] = o[0]; deltas[ti][i * 3 + 1] = o[1]; deltas[ti][i * 3 + 2] = o[2];
        }
      } else {
        // Rijit bölge: dikey eksende (Y) medyanın üstü = üst çene (sabit kalmaya
        // meyilli), altı = alt çene. Her bölgeye ORTALAMA öteleme → diş şekli bozulmaz.
        // Dil tümüyle alt çeneyle gider.
        const ys = []; for (let i = 0; i < nv; i++) ys.push(posOut[i * 3 + 1]);
        const yMid = name === "PatientTongue" ? Infinity : med(ys);
        const region = (i) => (posOut[i * 3 + 1] > yMid ? "ust" : "alt");
        for (let ti = 0; ti < bTargets.length; ti++) {
          if (!JAW_KEYS.has(targetNames[ti])) continue;
          const sum = { ust: [0, 0, 0, 0], alt: [0, 0, 0, 0] };
          for (let i = 0; i < nv; i++) {
            const o = interp(ti, i); const r = sum[region(i)];
            r[0] += o[0]; r[1] += o[1]; r[2] += o[2]; r[3]++;
          }
          for (let i = 0; i < nv; i++) {
            const r = sum[region(i)]; const n = r[3] || 1;
            // üst çene: ağız açılırken dudakla birlikte kaymasın (×0.15)
            const k = region(i) === "ust" ? 0.15 : 1;
            deltas[ti][i * 3] = (r[0] / n) * k; deltas[ti][i * 3 + 1] = (r[1] / n) * k; deltas[ti][i * 3 + 2] = (r[2] / n) * k;
          }
        }
      }
      deltas.forEach((d, ti) => {
        const t = base.createPrimitiveTarget(targetNames[ti] ?? `t${ti}`);
        t.setAttribute("POSITION", base.createAccessor().setType("VEC3").setArray(d).setBuffer(buffer));
        dPrim.addTarget(t);
      });
      const jo = targetNames.indexOf("jawOpen"), bl = targetNames.indexOf("eyeBlinkLeft");
      const maxLen = (ti) => { if (ti < 0) return 0; let m = 0; const d = deltas[ti]; for (let i = 0; i < d.length; i += 3) m = Math.max(m, Math.hypot(d[i], d[i + 1], d[i + 2])); return m; };
      console.log("MORPH AKTARIM", name, "hedef:", deltas.length, "| jawOpen maks:", maxLen(jo).toExponential(2), "| eyeBlinkL maks:", maxLen(bl).toExponential(2));
    }

    // materyal
    const sMat = prim.getMaterial();
    if (sMat) {
      const m = base.createMaterial(name.replace("Patient", "") + "_Mat")
        .setBaseColorFactor(sMat.getBaseColorFactor())
        .setRoughnessFactor(name === "PatientEyes" ? 0.08 : name === "PatientTeeth" ? 0.35 : Math.max(0.55, sMat.getRoughnessFactor()))
        .setMetallicFactor(0)
        .setDoubleSided(!OPAQUE.has(name) || name === "PatientGown");
      if (OPAQUE.has(name)) m.setAlphaMode("OPAQUE");
      else if (MASKED.has(name)) m.setAlphaMode("MASK").setAlphaCutoff(name === "PatientHair" ? 0.35 : 0.3);
      else m.setAlphaMode(sMat.getAlphaMode()).setAlphaCutoff(sMat.getAlphaCutoff()); // göz: kornea kabuğu saydam kalmalı
      for (const [get, set] of [["getBaseColorTexture", "setBaseColorTexture"], ["getNormalTexture", "setNormalTexture"]]) {
        const t = sMat[get]();
        if (t) m[set](base.createTexture(t.getName()).setImage(t.getImage()).setMimeType(t.getMimeType()));
      }
      dPrim.setMaterial(m);
    }
    dMesh.addPrimitive(dPrim);
  }
  if (MORPH_FULL.has(name) || MORPH_JAW.has(name)) {
    dMesh.setExtras({ targetNames });
    dMesh.setWeights(new Array(targetNames.length).fill(0));
  }
  const dNode = base.createNode(name).setMesh(dMesh);
  if (sSkin) dNode.setSkin(bSkin);
  if (bodyParent) bodyParent.addChild(dNode); else bScene.addChild(dNode);
  console.log("TAKILDI:", name, "v:", sNode.getMesh().listPrimitives()[0].getAttribute("POSITION").getCount());
}

await base.transform(prune());
await io.write(outPath, base);
console.log("yazıldı:", outPath);
