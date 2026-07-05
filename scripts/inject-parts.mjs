// ============================================================
// inject-parts — MPFB parçalarını ÇALIŞAN eski GLB'ye enjekte et
// ============================================================
// v2 matris savaşının dersi: Blender 5.1 skinned-export'u three'yle
// uyumsuz hiyerarşi üretiyor. Deterministik çözüm: eski (kanıtlanmış)
// GLB taban alınır; v2-master'dan SADECE parça mesh'leri alınır,
// vertexleri gövde-uzayına (kaynaktaki node matrisleriyle) çevrilir,
// hedef gövdenin SKIN'i paylaşılır (joint indeksleri isimle remap).
// Kullanım: node scripts/inject-parts.mjs <eski.glb> <v2master.glb> <cikti.glb>
// ============================================================
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { dequantize } from "@gltf-transform/functions";

const [basePath, srcPath, outPath] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS)
  .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

const base = await io.read(basePath); // çalışan eski
// Eski dosya KHR_mesh_quantization'lı (i16_norm POSITION) — pozisyon-hash
// eşlemesi için float uzayına aç (optimize adımı sonda yeniden sıkıştırır).
await base.transform(dequantize());
const src = await io.read(srcPath);   // v2 master (parçalar + dokular)

const PARTS = ["PatientEyes", "PatientEyebrows", "PatientEyelashes", "PatientHair", "PatientGown"];

// ── yardımcılar ──
const norm = (n) => (n ?? "").replace(/:/g, "");
function nodeWorld(n) {
  // 4x4 world matris (column-major) — parent zinciri
  let m = n.getMatrix();
  let p = n.getParentNode?.() ?? null;
  // getParentNode yok; listParents üzerinden Node ebeveyni bul
  const parentOf = (node) => node.listParents().find((x) => x.propertyType === "Node") ?? null;
  m = n.getMatrix();
  p = parentOf(n);
  while (p) { m = mul(p.getMatrix(), m); p = parentOf(p); }
  return m;
}
function mul(a, b) { // a*b, column-major 16
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++)
    for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
}
function inv(m) { // genel 4x4 ters (affine varsayımı yeterli ama genel yaz)
  // basit Gauss — 4x4
  const a = [...m], I = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const M = [];
  for (let r = 0; r < 4; r++) M.push([a[r], a[4+r], a[8+r], a[12+r], I[r], I[4+r], I[8+r], I[12+r]]);
  for (let c = 0; c < 4; c++) {
    let piv = c;
    for (let r = c + 1; r < 4; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    const d = M[c][c];
    for (let k = 0; k < 8; k++) M[c][k] /= d;
    for (let r = 0; r < 4; r++) if (r !== c) {
      const f = M[r][c];
      for (let k = 0; k < 8; k++) M[r][k] -= f * M[c][k];
    }
  }
  const o = new Array(16);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) o[c * 4 + r] = M[r][4 + c];
  return o;
}
const xformP = (m, v) => [
  m[0]*v[0]+m[4]*v[1]+m[8]*v[2]+m[12],
  m[1]*v[0]+m[5]*v[1]+m[9]*v[2]+m[13],
  m[2]*v[0]+m[6]*v[1]+m[10]*v[2]+m[14],
];
const xformN = (m, v) => { // normal: üst-sol 3x3 (uniform-scale varsayımı sonra normalize)
  const o = [m[0]*v[0]+m[4]*v[1]+m[8]*v[2], m[1]*v[0]+m[5]*v[1]+m[9]*v[2], m[2]*v[0]+m[6]*v[1]+m[10]*v[2]];
  const l = Math.hypot(...o) || 1;
  return [o[0]/l, o[1]/l, o[2]/l];
};

// ── hedef: gövde node + skin + joint isim→indeks ──
const baseNodes = base.getRoot().listNodes();
const baseBody = baseNodes.find((n) => n.getName() === "PatientBody");
const baseSkin = baseBody.getSkin();
const baseJoints = baseSkin.listJoints().map((j) => norm(j.getName()));
const baseJointIdx = new Map(baseJoints.map((n, i) => [n, i]));
const rig = baseNodes.find((n) => n.getName() === "PatientRig");
console.log("hedef skin joint:", baseJoints.length);

// ── kaynak→hedef uzay dönüşümü: AMPİRİK (gövde vertexlerinden türetilir) ──
// Ölçüm (6 Tem): ölçek 1:1, fark saf ÇEVİRİ (kaynak taban-pivot + öne
// kaymış: T≈(0, 0.894, 0.154)). Node matrisleri bu farkı TAŞIMIYOR
// (Blender import/export pivot normalizasyonu) → vertexten hesapla:
// ilk 1000 ortak vertexin medyan deltası (split ekleri sona geldiğinden
// baş kısım birebir eşleşir — v0/v100 doğrulandı).
const srcNodes = src.getRoot().listNodes();
const srcBody = srcNodes.find((n) => n.getName() === "PatientBody");
const srcBodyWorldInv = inv(nodeWorld(srcBody)); // (artık kullanılmıyor — iz için)
const _sB = srcBody.getMesh().listPrimitives()[0].getAttribute("POSITION").getArray();
const _dB = base.getRoot().listNodes().find((n) => n.getName() === "PatientBody")
  .getMesh().listPrimitives()[0].getAttribute("POSITION").getArray();
const _n = Math.min(1000, _sB.length / 3, _dB.length / 3);
const _dx = [], _dy = [], _dz = [];
for (let i = 0; i < _n; i++) {
  _dx.push(_sB[i*3] - _dB[i*3]);
  _dy.push(_sB[i*3+1] - _dB[i*3+1]);
  _dz.push(_sB[i*3+2] - _dB[i*3+2]);
}
const med = (a) => a.sort((x, y) => x - y)[Math.floor(a.length / 2)];
const T = [med(_dx), med(_dy), med(_dz)]; // kaynak = hedef + T → hedef = kaynak - T
console.log("UZAY ÇEVİRİSİ T:", T.map((v) => +v.toFixed(4)));

const baseBuffer = base.getRoot().listBuffers()[0];

for (const partName of PARTS) {
  const sNode = srcNodes.find((n) => n.getName() === partName);
  if (!sNode) { console.log("YOK:", partName); continue; }
  const M = [1,0,0,0, 0,1,0,0, 0,0,1,0, -T[0],-T[1],-T[2],1]; // saf çeviri: kaynak→hedef uzayı
  const sMesh = sNode.getMesh();
  const sSkin = sNode.getSkin();
  const sJoints = sSkin ? sSkin.listJoints().map((j) => norm(j.getName())) : [];

  const dMesh = base.createMesh(partName);
  for (const prim of sMesh.listPrimitives()) {
    const dPrim = base.createPrimitive();
    // indeksler
    const idx = prim.getIndices();
    if (idx) {
      const a = base.createAccessor().setType("SCALAR").setArray(idx.getArray()).setBuffer(baseBuffer);
      dPrim.setIndices(a);
    }
    for (const sem of prim.listSemantics()) {
      const acc = prim.getAttribute(sem);
      let arr = acc.getArray().slice();
      if (sem === "POSITION") {
        // Tunik: subsurf export edilmedi (morph koruması) → low-poly dar
        // kesim gövdeyi deliyor; normal boyunca şişir (1.4cm).
        const puff = partName === "PatientGown" ? 0.014 : 0;
        const nrmAcc = prim.getAttribute("NORMAL");
        const nrmArr = nrmAcc ? nrmAcc.getArray() : null;
        for (let i = 0; i < arr.length; i += 3) {
          const p = xformP(M, [arr[i], arr[i+1], arr[i+2]]);
          const off = puff && nrmArr ? [nrmArr[i]*puff, nrmArr[i+1]*puff, nrmArr[i+2]*puff] : [0,0,0];
          arr[i] = p[0]+off[0]; arr[i+1] = p[1]+off[1]; arr[i+2] = p[2]+off[2];
        }
        arr = new Float32Array(arr);
      } else if (sem === "NORMAL") {
        for (let i = 0; i < arr.length; i += 3) {
          const p = xformN(M, [arr[i], arr[i+1], arr[i+2]]);
          arr[i] = p[0]; arr[i+1] = p[1]; arr[i+2] = p[2];
        }
        arr = new Float32Array(arr);
      } else if (sem === "JOINTS_0") {
        // kaynak skin indeksi → hedef skin indeksi (isimle)
        const remap = sJoints.map((jn) => {
          const t = baseJointIdx.get(jn);
          if (t === undefined) throw new Error(`joint yok hedefte: ${jn}`);
          return t;
        });
        const out = new Uint16Array(arr.length);
        for (let i = 0; i < arr.length; i++) out[i] = remap[arr[i]];
        arr = out;
      }
      const a = base.createAccessor().setType(acc.getType()).setArray(arr).setBuffer(baseBuffer);
      dPrim.setAttribute(sem, a);
    }
    // materyal — doku/faktörleri kopyala
    const sMat = prim.getMaterial();
    if (sMat) {
      const dMat = base.createMaterial(sMat.getName());
      dMat.setBaseColorFactor(sMat.getBaseColorFactor());
      dMat.setRoughnessFactor(sMat.getRoughnessFactor());
      dMat.setMetallicFactor(sMat.getMetallicFactor());
      dMat.setAlphaMode(sMat.getAlphaMode());
      dMat.setAlphaCutoff(sMat.getAlphaCutoff());
      dMat.setDoubleSided(sMat.getDoubleSided());
      const tex = sMat.getBaseColorTexture();
      if (tex) {
        const dTex = base.createTexture(tex.getName())
          .setImage(tex.getImage()).setMimeType(tex.getMimeType());
        dMat.setBaseColorTexture(dTex);
      }
      const nrm = sMat.getNormalTexture();
      if (nrm) {
        const dTex = base.createTexture(nrm.getName())
          .setImage(nrm.getImage()).setMimeType(nrm.getMimeType());
        dMat.setNormalTexture(dTex);
      }
      dPrim.setMaterial(dMat);
    }
    dMesh.addPrimitive(dPrim);
  }
  const dNode = base.createNode(partName).setMesh(dMesh);
  if (sSkin) dNode.setSkin(baseSkin); // gövdenin kanıtlanmış skin'i
  rig.addChild(dNode); // eski desen: rig çocuğu, transformsuz
  console.log("ENJEKTE:", partName, "prim:", sMesh.listPrimitives().length, "skin:", !!sSkin);
}

// ── Gövde: düzeltilmiş UV + cilt dokusu (kaynak gövdeden, vertex sırası birebir) ──
{
  const sPrim = srcBody.getMesh().listPrimitives()[0];
  const dPrim = baseBody.getMesh().listPrimitives()[0];
  console.log("dPrim semantics:", dPrim.listSemantics(), "sPrim:", sPrim.listSemantics());
  const sUV = sPrim.getAttribute("TEXCOORD_0");
  const dPosCount = dPrim.getAttribute("POSITION").getCount();
  console.log("UV count kaynak:", sUV?.getCount(), "hedef POSITION:", dPosCount);
  if (sUV) {
    // UZAY-BAĞIMSIZ eşleme: topoloji aynı → indeks dizileri üzerinden
    // köşe-köşe UV taşı (pozisyon uzayları farklı: quantization + Blender
    // eksen çevirisi pos-hash'i imkânsız kılmıştı).
    const sIdx = sPrim.getIndices().getArray();
    const dIdx = dPrim.getIndices().getArray();
    if (sIdx.length === dIdx.length) {
      const sUVArr = sUV.getArray();
      const out = new Float32Array(dPosCount * 2);
      for (let k = 0; k < dIdx.length; k++) {
        const di = dIdx[k], si = sIdx[k];
        out[di*2] = sUVArr[si*2];
        out[di*2+1] = sUVArr[si*2+1];
      }
      const a = base.createAccessor().setType("VEC2").setArray(out).setBuffer(baseBuffer);
      dPrim.setAttribute("TEXCOORD_0", a);
      console.log("GOVDE UV indeks-eşleme OK — üçgen köşesi:", dIdx.length);
    } else {
      console.log("GOVDE UV: indeks uzunlukları farklı", sIdx.length, dIdx.length, "— doku atlandı");
    }
  }
  const sMat = sPrim.getMaterial();
  if (sMat) {
    const dMat = base.createMaterial("Skin_Body");
    dMat.setBaseColorFactor(sMat.getBaseColorFactor());
    dMat.setRoughnessFactor(sMat.getRoughnessFactor());
    dMat.setMetallicFactor(sMat.getMetallicFactor());
    const bct = sMat.getBaseColorTexture();
    if (bct) dMat.setBaseColorTexture(base.createTexture(bct.getName()).setImage(bct.getImage()).setMimeType(bct.getMimeType()));
    const nt = sMat.getNormalTexture();
    if (nt) dMat.setNormalTexture(base.createTexture(nt.getName()).setImage(nt.getImage()).setMimeType(nt.getMimeType()));
    dPrim.setMaterial(dMat);
    console.log("GOVDE materyali: Skin_Body (dokulu)");
  }
}

await io.write(outPath, base);
console.log("yazıldı:", outPath);
