// ============================================================
// audit-clips — hasta animasyon kliplerinin "temizlik" ölçümü
// ============================================================
// Kullanım: node scripts/audit-clips.mjs <hasta.glb>
// Her klip için (göz yerine SAYI):
//  - dikiş   : son kare ↔ ilk kare en büyük kemik dönüş farkı (derece).
//              Döngüde bu kadar "atlama" görülür. >8° belirgin sıçrama.
//  - tepe hız: ardışık kareler arası en büyük açısal hız (derece/sn) ve
//              hangi kemikte. Yatan hastada >400°/sn kemik "sapıtması"dır
//              (Mixamo yeniden-hedefleme kırığı, eklem takla atması).
//  - kök     : Hips öteleme aralığı (model birimi) — yatakta kayma/havalanma.
//  - ayakta? : Hips yüksekliği değişimi ve gövde eğimi → yatar klip mi.
// ============================================================
import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { MeshoptDecoder } from "meshoptimizer";

const path = process.argv[2];
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
const doc = await io.read(path);

const qAngle = (a, b) => {
  const d = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
  return (2 * Math.acos(Math.min(1, d)) * 180) / Math.PI;
};
const norm = (n) => (n ?? "").replace(/^mixamorig:?/, "");

const rows = [];
for (const anim of doc.getRoot().listAnimations()) {
  let seam = 0, seamBone = "", peak = 0, peakBone = "", peakT = 0, dur = 0;
  let hipsRange = null;
  for (const ch of anim.listChannels()) {
    const s = ch.getSampler();
    const t = s.getInput().getArray();
    // Çıkış KHR_mesh_quantization ile normalize tamsayı olabilir → getElement çözer.
    const outAcc = s.getOutput();
    const comp = outAcc.getElementSize();
    const v = new Float32Array(outAcc.getCount() * comp);
    const tmp = [];
    for (let i = 0; i < outAcc.getCount(); i++) { outAcc.getElement(i, tmp); for (let c = 0; c < comp; c++) v[i * comp + c] = tmp[c]; }
    const bone = norm(ch.getTargetNode()?.getName());
    dur = Math.max(dur, t[t.length - 1]);
    if (ch.getTargetPath() === "rotation") {
      const q = (i) => [v[i * 4], v[i * 4 + 1], v[i * 4 + 2], v[i * 4 + 3]];
      const n = t.length;
      if (n < 2) continue;
      const sa = qAngle(q(0), q(n - 1));
      if (sa > seam) { seam = sa; seamBone = bone; }
      for (let i = 1; i < n; i++) {
        const dt = t[i] - t[i - 1];
        if (dt <= 0) continue;
        const w = qAngle(q(i - 1), q(i)) / dt;
        if (w > peak) { peak = w; peakBone = bone; peakT = t[i]; }
      }
    } else if (ch.getTargetPath() === "translation" && bone === "Hips") {
      const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < v.length; i += 3) for (let a = 0; a < 3; a++) {
        mn[a] = Math.min(mn[a], v[i + a]); mx[a] = Math.max(mx[a], v[i + a]);
      }
      hipsRange = mx.map((x, a) => +(x - mn[a]).toFixed(2));
    }
  }
  rows.push({
    klip: anim.getName(),
    sure_sn: +dur.toFixed(2),
    dikis_derece: +seam.toFixed(1),
    dikis_kemik: seamBone,
    tepe_hiz_dps: Math.round(peak),
    tepe_kemik: peakBone,
    tepe_an_sn: +peakT.toFixed(2),
    hips_oteleme_araligi: hipsRange,
  });
}
console.table(rows);
const flag = rows.filter((r) => r.tepe_hiz_dps > 400 || r.dikis_derece > 8);
console.log("ŞÜPHELİ:", flag.map((r) => `${r.klip} (dikiş ${r.dikis_derece}° ${r.dikis_kemik}, tepe ${r.tepe_hiz_dps}°/sn ${r.tepe_kemik}@${r.tepe_an_sn}s)`).join(" | ") || "yok");
