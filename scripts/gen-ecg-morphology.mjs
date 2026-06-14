/* =========================================================================
   gen-ecg-morphology.mjs — Fizyolojik EKG tek-çevrim üreteci (saf Node, ESM).

   McSharry, Clifford, Tarassenko & Smith (2003), "A Dynamical Model for
   Generating Synthetic Electrocardiogram Signals", IEEE Trans. Biomed. Eng.
   50(3):289–294 (ECGSYN) modelini portlar. PYTHON YOK — neurokit2/scipy
   gerekmez; ODE saf JS'te RK4 ile entegre edilir.

   Model (referans / akademik; bu kod özgün implementasyon):
     PQRST'in 5 ekstremumu, kalp çevrimi açısı θ ∈ [-π, π) üzerinde birer
     Gauss "çekici"dir. EKG sinyali z şu ODE ile sürülür:

       dθ/dt = ω                                   (sabit açısal hız)
       dz/dt = -Σ_i a_i · Δθ_i · exp(-Δθ_i²/(2 b_i²)) - (z - z0)

     Δθ_i = (θ - θ_i) mod 2π, [-π, π) aralığına sarılır.
     z0 ≈ 0 (taban kayması ihmal — biz solunum salınımı eklemiyoruz, tek çevrim).

   Parametreler (McSharry 2003, Tablo 1 — ω = 2π, yani 1 çevrim/s temel):
     dalga :   P       Q       R       S       T
     θ (rad): -π/3   -π/12    0     π/12   π/2
     a (mV) : 1.2    -5.0    30.0  -7.5    0.75
     b (rad): 0.25   0.1     0.1   0.1    0.4

   Çıktı: tek çevrim N=500 örnekte, R-tepe = +1.0 olacak şekilde normalize
   edilmiş number[]. Faz dizilimi [0,1): u=0 çevrim başı (P öncesi taban),
   R-tepesi waveform-engine konvansiyonuyla uyumlu olması için kaydırılır
   (R ~ u≈0.252, mevcut pqrstWave ile aynı hizada).

   Kullanım:  node scripts/gen-ecg-morphology.mjs
   Yazar     :  src/components/monitor/waveform-data.ts
   ========================================================================= */

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

/* ---------- McSharry 2003 PQRST çekici parametreleri ---------- */
// θ açıları radyan; a genlik (keyfi mV); b Gauss genişliği (radyan).
const TWO_PI = Math.PI * 2;
const WAVES = [
  { name: "P", theta: -Math.PI / 3, a: 1.2, b: 0.25 },
  { name: "Q", theta: -Math.PI / 12, a: -5.0, b: 0.1 },
  { name: "R", theta: 0.0, a: 30.0, b: 0.1 },
  { name: "S", theta: Math.PI / 12, a: -7.5, b: 0.1 },
  { name: "T", theta: (Math.PI * 1) / 2, a: 0.75, b: 0.4 },
];

const OMEGA = TWO_PI; // 1 çevrim / saniye (temel hız)

// Δθ'yı [-π, π) aralığına sar.
function wrapPi(d) {
  let x = d % TWO_PI;
  if (x > Math.PI) x -= TWO_PI;
  if (x < -Math.PI) x += TWO_PI;
  return x;
}

/* dz/dt — McSharry ODE'sinin sinyal bileşeni. */
function dzdt(theta, z) {
  let sum = 0;
  for (const w of WAVES) {
    const dth = wrapPi(theta - w.theta);
    sum += w.a * dth * Math.exp(-(dth * dth) / (2 * w.b * w.b));
  }
  // z0 = 0 (taban). McSharry'deki -(z - z0) geri-çekme terimi.
  return -sum - z;
}

/* ---------- ODE'yi bir tam çevrim (θ: -π → +π) boyunca RK4 ile entegre et ----------
   θ sabit ω ile ilerlediği için zamanı θ ile parametrize ederiz:
     dz/dθ = (dz/dt) / ω
   Yüksek çözünürlükte (oversample) entegre edip sonra N örneğe indirgeriz. */
function integrateCycle(oversample = 8000) {
  const dTheta = TWO_PI / oversample;
  let theta = -Math.PI;
  let z = 0;

  // Geçici taban etkisini söndürmek için iki tam çevrim "ısıtma" yap,
  // limit-çevrime yakınsayan üçüncü çevrimi kaydet.
  for (let warm = 0; warm < 2; warm++) {
    theta = -Math.PI;
    for (let i = 0; i < oversample; i++) {
      z = rk4Step(theta, z, dTheta);
      theta += dTheta;
    }
  }

  // Kayıt çevrimi.
  const thetas = [];
  const zs = [];
  theta = -Math.PI;
  for (let i = 0; i < oversample; i++) {
    thetas.push(theta);
    zs.push(z);
    z = rk4Step(theta, z, dTheta);
    theta += dTheta;
  }
  return { thetas, zs };
}

// θ-uzayında tek RK4 adımı (dz/dθ = dzdt(θ, z) / ω).
function rk4Step(theta, z, h) {
  const f = (th, zz) => dzdt(th, zz) / OMEGA;
  const k1 = f(theta, z);
  const k2 = f(theta + h / 2, z + (h / 2) * k1);
  const k3 = f(theta + h / 2, z + (h / 2) * k2);
  const k4 = f(theta + h, z + h * k3);
  return z + (h / 6) * (k1 + 2 * k2 + 2 * k3 + k4);
}

/* ---------- oversample edilmiş çevrimi N örneğe yeniden örnekle ----------
   θ ∈ [-π, π) → faz u ∈ [0,1). R-tepesi θ=0'da; mevcut waveform-engine
   konvansiyonunda R ~ u≈0.252'de. Bu yüzden R'yi 0.252'ye taşıyan bir faz
   kaydırması uygularız → tabloya u=0..1 dümdüz indekslenebilir. */
function resample(thetas, zs, N, rTarget) {
  // θ → ham faz u_raw = (θ + π) / 2π  ∈ [0,1)
  // İstenen: R'nin (θ=0 → u_raw=0.5) yeni faz u=rTarget'a gelmesi.
  // shift = rTarget - 0.5
  const shift = rTarget - 0.5;
  const out = new Array(N);
  const M = zs.length;
  for (let k = 0; k < N; k++) {
    const u = k / N; // hedef faz [0,1)
    // hedef faz → ham faz (kaydırmayı geri al)
    let uRaw = u - shift;
    uRaw -= Math.floor(uRaw); // wrap01
    // ham fazdan oversample indeksine lineer interpolasyon
    const fidx = uRaw * M;
    const i0 = Math.floor(fidx) % M;
    const i1 = (i0 + 1) % M;
    const frac = fidx - Math.floor(fidx);
    out[k] = zs[i0] * (1 - frac) + zs[i1] * frac;
  }
  return out;
}

/* ---------- normalize: taban (P öncesi) ≈ 0, R-tepe = +1 ---------- */
function normalize(cycle) {
  // Taban tahmini: en sık görülen düşük-eğim bölge yerine, çevrim
  // başındaki diyastolik düz kısmı (faz ~0.05) referans al.
  const N = cycle.length;
  const baseIdx = Math.floor(0.05 * N);
  const base = cycle[baseIdx];
  const shifted = cycle.map((v) => v - base);
  const peak = Math.max(...shifted);
  return shifted.map((v) => v / peak);
}

/* ---------- üret ---------- */
const N = 500;
const R_TARGET = 0.252; // pqrstWave R konumu ile hizalı
const { thetas, zs } = integrateCycle(8000);
const resampled = resample(thetas, zs, N, R_TARGET);
const cycle = normalize(resampled);

/* ---------- doğrulama özetini stdout'a yaz ---------- */
const rIdx = cycle.indexOf(Math.max(...cycle));
const sVal = Math.min(...cycle);
const sIdx = cycle.indexOf(sVal);
// P bölgesini R'den ÖNCE, T'yi R'den SONRA tarayarak tepe indeksleri bul.
function localMaxIn(lo, hi) {
  let best = -Infinity;
  let bi = lo;
  for (let i = lo; i < hi; i++) {
    if (cycle[i] > best) {
      best = cycle[i];
      bi = i;
    }
  }
  return { idx: bi, val: best };
}
const pPeak = localMaxIn(Math.floor(0.08 * N), Math.floor(0.2 * N));
const tPeak = localMaxIn(Math.floor(0.34 * N), Math.floor(0.6 * N));

console.log("ECGSYN tek-çevrim üretildi:");
console.log(`  N            = ${N}`);
console.log(`  R-tepe       = idx ${rIdx} (u=${(rIdx / N).toFixed(3)}), val=${cycle[rIdx].toFixed(4)}`);
console.log(`  P-tepe       = idx ${pPeak.idx} (u=${(pPeak.idx / N).toFixed(3)}), val=${pPeak.val.toFixed(4)}`);
console.log(`  S-çukur      = idx ${sIdx} (u=${(sIdx / N).toFixed(3)}), val=${sVal.toFixed(4)}`);
console.log(`  T-tepe       = idx ${tPeak.idx} (u=${(tPeak.idx / N).toFixed(3)}), val=${tPeak.val.toFixed(4)}`);
console.log(`  sıra P<R, S<R, T<R, P<T : ${pPeak.idx < rIdx && sIdx > rIdx && tPeak.idx > rIdx ? "OK" : "HATA"}`);

/* ---------- TS dosyasını yaz ---------- */
function fmt(v) {
  // 5 anlamlı haneye yuvarla, gereksiz sıfırları at.
  return Number(v.toFixed(5)).toString();
}
const rows = [];
for (let i = 0; i < cycle.length; i += 8) {
  rows.push("  " + cycle.slice(i, i + 8).map(fmt).join(", "));
}

const tsContent = `/* =========================================================================
   waveform-data.ts — ÜRETİLEN DOSYA. Elle düzenleme.

   Kaynak üreteç: scripts/gen-ecg-morphology.mjs  (\`node scripts/gen-ecg-morphology.mjs\`)
   Model        : McSharry, Clifford, Tarassenko & Smith (2003),
                  "A Dynamical Model for Generating Synthetic ECG Signals",
                  IEEE Trans. Biomed. Eng. 50(3):289–294 (ECGSYN).

   5-Gauss PQRST çekici ODE'si RK4 ile bir tam kalp çevriminde entegre edildi,
   sonra ${N} örneğe yeniden örneklendi ve R-tepe = +1.0 olacak şekilde
   (taban ≈ 0) normalize edildi. Faz konvansiyonu waveform-engine ile aynı:
   u ∈ [0,1), R-tepesi u≈${R_TARGET}.

   PQRST parametreleri (McSharry 2003, Tablo 1):
     dalga   θ(rad)    a       b(rad)
     P      -π/3      1.2     0.25
     Q      -π/12    -5.0     0.10
     R       0       30.0     0.10
     S       π/12    -7.5     0.10
     T       π/2      0.75    0.40
   ========================================================================= */

/** Fizyolojik sinüs EKG tek çevrimi (${N} örnek, faz [0,1), R-tepe=+1). */
export const ECG_SINUS_CYCLE: number[] = [
${rows.join(",\n")},
];

/** Tablo uzunluğu (faz→indeks interpolasyonu için). */
export const ECG_SINUS_LEN = ECG_SINUS_CYCLE.length;
`;

const outPath = resolve(__dirname, "../src/components/monitor/waveform-data.ts");
writeFileSync(outPath, tsContent, "utf8");
console.log(`Yazıldı: ${outPath} (${cycle.length} örnek)`);
