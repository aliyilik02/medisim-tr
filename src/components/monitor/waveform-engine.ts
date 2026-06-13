/* =========================================================================
   waveform-engine.ts — MediSim TR dalga formu motoru.

   Harici monitör repo'sundan (`scratch/eval-monitor/src/core.jsx`) PORTLANDI.
   SAF / framework-bağımsız: dalga örnekleyiciler + alarm değerlendirme +
   renk/limit/ritim sabitleri + RingBuffer. `window.X` yerine ES `export`,
   TypeScript tipleriyle.

   Veri modeli `scratch/eval-monitor/export/medsim-types.ts` ile birebir uyumlu.
   ========================================================================= */

/* ---------- tipler ---------- */
export type Rhythm =
  | "sinus"
  | "tachy"
  | "brady"
  | "afib"
  | "aflutter"
  | "svt"
  | "av1"
  | "av2"
  | "av3"
  | "wpw"
  | "pvc"
  | "bigeminy"
  | "torsades"
  | "pea"
  | "vtach"
  | "vfib"
  | "asystole";

export type ArtifactMode = "none" | "motion" | "wander" | "mains";
export type CapnoMode = "normal" | "obstructive" | "rebreathing" | "esophageal";

export interface VitalState {
  hr: number; // bpm
  spo2: number; // %
  sbp: number; // sistolik mmHg
  dbp: number; // diastolik mmHg
  rr: number; // /dk
  etco2: number; // mmHg
  temp: number; // °C
  rhythm: Rhythm;
  st?: number; // ST sapması (normalize birim; + elevasyon, − depresyon)
  paced?: boolean; // transkutan yakalama aktif
  pulsus?: boolean; // pulsus paradoxus (pleth solunum salınımı abartılı)
  artifact?: ArtifactMode; // EKG sinyal artefaktı
  capno?: CapnoMode; // kapnografi morfolojisi
}

export type AlarmLevel = "normal" | "warn" | "crit";

export interface LimitSpec {
  critLo: number;
  warnLo: number;
  warnHi: number;
  critHi: number;
  dispLo: number;
  dispHi: number;
}

export type LimitKey = "hr" | "spo2" | "sbp" | "rr" | "etco2" | "temp";
export type Limits = Record<LimitKey, LimitSpec>;

export interface AlarmState {
  levels: Record<LimitKey, AlarmLevel>;
  lethal: boolean;
  severity: AlarmLevel;
  bandText: string | null;
}

export type WaveKind = "ecg" | "pleth" | "co2" | "art";

/* ---------- sayısal yardımcılar ---------- */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const gauss = (x: number, mu: number, sig: number): number =>
  Math.exp(-((x - mu) * (x - mu)) / (2 * sig * sig));
// a..b arası smoothstep
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const wrap01 = (p: number): number => p - Math.floor(p);

/* ---------- klinik parametre paleti (uluslararası konvansiyon) ----------
   Bu renkler SABİT klinik standartlar — marka aksanı asla geçersiz kılmaz. */
export const PARAM: Record<
  "hr" | "spo2" | "nibp" | "rr" | "etco2" | "temp",
  { color: string; label: string; unit: string }
> = {
  hr: { color: "#36e07a", label: "HR", unit: "bpm" }, // yeşil
  spo2: { color: "#2ad4ee", label: "SpO₂", unit: "%" }, // camgöbeği
  nibp: { color: "#f4f7f5", label: "NIBP", unit: "mmHg" }, // beyaz (alarm → kırmızı)
  rr: { color: "#f7fafc", label: "RR", unit: "/dk" }, // beyaz
  etco2: { color: "#f5c43a", label: "EtCO₂", unit: "mmHg" }, // sarı
  temp: { color: "#fbbf78", label: "Temp", unit: "°C" }, // yumuşak turuncu
};

/* dalga çizgi renkleri */
export const WAVE: Record<WaveKind, string> = {
  ecg: "#36e07a",
  pleth: "#2ad4ee",
  co2: "#f5c43a",
  art: "#f0556b",
};

export const DEFAULT_ACCENT = "#06b6d4";

/* ---------- alarm eşikleri & değerlendirme ----------
   crit = kırmızı yanıp sönme; warn = amber kenar. */
export const LIMITS: Limits = {
  hr: { critLo: 50, warnLo: 60, warnHi: 100, critHi: 120, dispLo: 50, dispHi: 120 },
  spo2: { critLo: 90, warnLo: 94, warnHi: 100, critHi: 101, dispLo: 90, dispHi: 100 },
  sbp: { critLo: 90, warnLo: 100, warnHi: 160, critHi: 180, dispLo: 90, dispHi: 160 },
  rr: { critLo: 8, warnLo: 10, warnHi: 24, critHi: 30, dispLo: 8, dispHi: 30 },
  etco2: { critLo: 25, warnLo: 30, warnHi: 50, critHi: 60, dispLo: 25, dispHi: 60 },
  temp: { critLo: 35, warnLo: 36, warnHi: 38, critHi: 38.5, dispLo: 35, dispHi: 38.5 },
};

export const RHYTHM_LABEL: Record<Rhythm, string> = {
  sinus: "Sinüs Ritmi",
  tachy: "Sinüs Taşikardi",
  brady: "Sinüs Bradikardi",
  vtach: "Ventriküler Taşikardi",
  vfib: "Ventriküler Fibrilasyon",
  asystole: "Asistoli",
  afib: "Atriyal Fibrilasyon",
  aflutter: "Atriyal Flutter",
  svt: "Supraventriküler Taşikardi",
  av1: "1° AV Blok",
  av2: "2° AV Blok (Mobitz I)",
  av3: "Tam (3°) AV Blok",
  wpw: "WPW (Pre-eksitasyon)",
  pea: "Nabızsız Elektriksel Aktivite",
  pvc: "Sinüs + Sık VES (PVC)",
  bigeminy: "Ventriküler Bigemine",
  torsades: "Torsades de Pointes",
};

export const LETHAL_RHYTHMS: Rhythm[] = ["vtach", "vfib", "asystole", "pea", "torsades"];
// Defibrilatörün şoklayabileceği ritimler. (Asistoli & PEA şoklanabilir DEĞİL.)
export const SHOCKABLE_RHYTHMS: Rhythm[] = ["vfib", "vtach"];
export const isShockable = (rhythm: Rhythm): boolean =>
  SHOCKABLE_RHYTHMS.includes(rhythm);
// Etkili kardiyak output olmayan ritimler (nabız yok / perfüzyon yok).
export const PULSELESS_RHYTHMS: Rhythm[] = ["vfib", "asystole", "pea", "torsades"];
export const hasPerfusion = (v: VitalState): boolean =>
  !!v.paced || !PULSELESS_RHYTHMS.includes(v.rhythm);

/* ---------- sinyal artefaktı (v.artifact ayarlıysa EKG'ye eklenir) ----------
   modlar: motion (büyük düzensiz), wander (taban kayması), mains (50 Hz). */
export function artifactValue(mode: ArtifactMode | undefined, t: number): number {
  if (!mode || mode === "none") return 0;
  if (mode === "motion")
    return 0.22 * Math.sin(t * 11.3) * Math.sin(t * 2.7) + 0.12 * (Math.sin(t * 53.1) * 0.5);
  if (mode === "wander") return 0.18 * Math.sin(t * 0.8) + 0.06 * Math.sin(t * 1.7);
  if (mode === "mains") return 0.05 * Math.sin(t * 2 * Math.PI * 50);
  return 0;
}

// tek bir sayısal parametre için 'normal' | 'warn' | 'crit' döner
export function levelFor(key: LimitKey, value: number, limits?: Limits): AlarmLevel {
  const L = (limits || LIMITS)[key];
  if (!L || value == null || Number.isNaN(value)) return "normal";
  if (value <= L.critLo || value >= L.critHi) return "crit";
  if (value < L.warnLo || value > L.warnHi) return "warn";
  return "normal";
}

// Bir VitalState için tam alarm tablosu. `limits` varsayılan eşikleri ezer.
export function evaluateAlarms(v: VitalState, limits?: Limits): AlarmState {
  const lethal = LETHAL_RHYTHMS.includes(v.rhythm);
  const pulseless = PULSELESS_RHYTHMS.includes(v.rhythm) && !v.paced;
  const lv: Record<LimitKey, AlarmLevel> = {
    hr: lethal ? "crit" : levelFor("hr", v.hr, limits),
    spo2: pulseless ? "crit" : levelFor("spo2", v.spo2, limits),
    sbp: pulseless ? "crit" : levelFor("sbp", v.sbp, limits),
    rr: lethal ? "crit" : levelFor("rr", v.rr, limits),
    etco2: levelFor("etco2", v.etco2, limits),
    temp: levelFor("temp", v.temp, limits),
  };
  const anyCrit = lethal || Object.values(lv).some((x) => x === "crit");
  const anyWarn = Object.values(lv).some((x) => x === "warn");
  return {
    levels: lv,
    lethal,
    severity: anyCrit ? "crit" : anyWarn ? "warn" : "normal",
    bandText: lethal ? RHYTHM_LABEL[v.rhythm].toUpperCase() : null,
  };
}

/* =========================================================================
   DALGA FORMU ÖRNEKLEYİCİLERİ
   Her biri normalize bir genlik döner. Lane'ler bunları kanvas Y'ye lane
   başına baseline + gain ile eşler. EKG ~ [-0.35 .. 1.0], pleth/co2/art ~ [0 .. 1].
   - EKG / pleth / art sürekli "beat phase" (frekans = HR/60) üzerinde ilerler;
     HR değişince morfoloji sürekli kalır (restart / glitch yok).
   - kapnografi "resp phase" (frekans = RR/60) üzerinde ilerler.
   - vfib/asystole kaos / düz çizgi için mutlak zaman `t` kullanır.
   ========================================================================= */

// ventriküler fibrilasyon için pseudo-rastgele ama yumuşak kaos
export function fibNoise(t: number): number {
  return (
    Math.sin(t * 18.7) * 0.55 +
    Math.sin(t * 33.3 + 1.3) * 0.32 +
    Math.sin(t * 71.1 + 0.6) * 0.2 +
    Math.sin(t * 121.7) * 0.1
  );
}

// deterministik beat-başına pseudo-rastgele (düzensiz R-R, PVC yerleşimi)
export function hash01(n: number): number {
  const x = Math.sin(n * 127.1 + 31.7) * 43758.5453;
  return x - Math.floor(x);
}

interface PqrstOpts {
  p?: boolean;
  pAmp?: number;
  pr?: number;
  tAmp?: number;
  st?: number;
}

// Lokal beat fazı u in [0,1) için temel PQRST.
function pqrstWave(u: number, opts?: PqrstOpts): number {
  const o = opts || {};
  let y = 0;
  if (o.p !== false)
    y += (o.pAmp != null ? o.pAmp : 0.11) * gauss(u, o.pr != null ? o.pr : 0.165, 0.024);
  y += -0.085 * gauss(u, 0.232, 0.009); // Q
  y += 1.0 * gauss(u, 0.252, 0.0085); // R
  y += -0.24 * gauss(u, 0.274, 0.011); // S
  // ST segment elevasyonu (+) / depresyonu (-): S ve T arası plato
  if (o.st) y += o.st * smooth(0.285, 0.33, u) * (1 - smooth(0.4, 0.47, u));
  y += (o.tAmp != null ? o.tAmp : 0.3) * gauss(u, 0.44, 0.04); // T
  return y;
}

// geniş ventriküler kompleks (PVC / ventriküler kaçış). dir polariteyi çevirir.
function wideComplex(u: number, dir?: number): number {
  const d = dir == null ? 1 : dir;
  return (
    d * (0.86 * gauss(u, 0.27, 0.024) - 0.34 * gauss(u, 0.34, 0.032)) -
    d * 0.3 * gauss(u, 0.54, 0.06)
  );
}

// EKG morfolojisi. `beat` = SÜREKLI beat fazı (tam kısım = beat index);
// t = mutlak saniye; paced = TCP yakalama; st = ST sapması (norm birim).
export function sampleECG(
  beat: number,
  rhythm: Rhythm,
  t: number,
  paced?: boolean,
  st?: number
): number {
  const stv = st || 0;
  if (rhythm === "vfib") return fibNoise(t) * 0.5;
  if (rhythm === "vtach") {
    const p = wrap01(beat);
    return 0.72 * Math.sin(2 * Math.PI * (p - 0.12)) + 0.12 * Math.sin(4 * Math.PI * p);
  }
  if (paced) {
    const p = wrap01(beat);
    let y = 0;
    y += 1.05 * gauss(p, 0.205, 0.0035); // pacing spike (stimulus artifact)
    y += 0.74 * gauss(p, 0.275, 0.02); // geniş paced R
    y += -0.3 * gauss(p, 0.33, 0.028); // geniş S
    y += 0.26 * gauss(p, 0.52, 0.05); // diskordant T
    return y;
  }
  if (rhythm === "asystole") return Math.sin(t * 1.7) * 0.006;

  const N = Math.floor(beat);
  const u = beat - N;

  if (rhythm === "svt") {
    // dar, hızlı, düzenli; P önceki T'de gömülü, küçük T
    return pqrstWave(u, { p: false, tAmp: 0.18 });
  }
  if (rhythm === "afib") {
    // P yok, kaba fibrilatör taban, düzensiz R-R (beat-başına faz çarpıtma)
    const j = (hash01(N) - 0.5) * 0.4;
    const uu = wrap01(u - j);
    const fwave = 0.045 * Math.sin(t * 21.0) + 0.03 * Math.sin(t * 37.0 + 1.0);
    return pqrstWave(uu, { p: false, tAmp: 0.26, st: stv }) + fwave;
  }
  if (rhythm === "aflutter") {
    // atriyal flutter: testere F-dalgaları (~300/dk) + ~her 2.-4. atımda dar QRS
    const saw = 0.16 * (2 * wrap01(t * 5.0) - 1); // ~300/dk testere
    return pqrstWave(u, { p: false, tAmp: 0.16, st: stv }) * 1 + saw;
  }
  if (rhythm === "torsades") {
    // polimorfik VT: genliği taban etrafında dönen geniş kompleksler
    const env = Math.sin(t * 0.9); // yavaş genlik zarfı (twisting)
    return env * (0.7 * Math.sin(2 * Math.PI * (u - 0.1)) + 0.18 * Math.sin(6 * Math.PI * u));
  }
  if (rhythm === "bigeminy") {
    // her diğer atım PVC (sinüs-PVC-sinüs-PVC ...)
    if (((N % 2) + 2) % 2 === 1) return wideComplex(u, -1);
    return pqrstWave(u, { st: stv });
  }
  if (rhythm === "pvc") {
    // sık PVC'li sinüs (hashed ~%28), geniş & ters polarite
    if (hash01(N) < 0.28) return wideComplex(u, hash01(N * 7.3) < 0.5 ? -1 : 1);
    return pqrstWave(u, { st: stv });
  }
  if (rhythm === "av1") {
    // birinci derece: uzamış PR (P daha erken, QRS'ten uzak)
    return pqrstWave(u, { pr: 0.075, pAmp: 0.12, st: stv });
  }
  if (rhythm === "av2") {
    // Mobitz I (Wenckebach): PR 4-atımlık döngüde uzar, sonra düşen QRS
    const cyc = ((N % 4) + 4) % 4;
    if (cyc === 3) return 0.12 * gauss(u, 0.2, 0.024); // düşen atım: yalnız P dalgası
    const pr = [0.055, 0.1, 0.15][cyc];
    return pqrstWave(u, { pr, st: stv });
  }
  if (rhythm === "av3") {
    // tam blok: bağımsız atriyal P (~95/dk, t üzerinden) + yavaş geniş kaçış
    const pPhase = wrap01(t * (95 / 60));
    const pWave = 0.12 * gauss(pPhase, 0.5, 0.05);
    return pWave + wideComplex(u, 1) * 0.92;
  }
  if (rhythm === "wpw") {
    // WPW: kısa PR + QRS yükselişine karışan slurred delta dalgası
    let y = 0;
    y += 0.1 * gauss(u, 0.135, 0.022); // P (kısa PR)
    y += 0.3 * smooth(0.205, 0.252, u) * (1 - smooth(0.252, 0.3, u)); // delta upslope
    y += 1.0 * gauss(u, 0.262, 0.0085); // R
    y += -0.22 * gauss(u, 0.284, 0.011); // S
    if (stv) y += stv * smooth(0.295, 0.34, u) * (1 - smooth(0.41, 0.48, u));
    y += 0.28 * gauss(u, 0.45, 0.04); // T
    return y;
  }
  if (rhythm === "pea") {
    // organize kompleksler (perfüze görünür) ama nabızsız — laneValue'da işlenir
    return pqrstWave(u, { tAmp: 0.22, st: stv });
  }
  // sinus / tachy / brady (+ opsiyonel ST sapması)
  return pqrstWave(u, { st: stv });
}

/* SpO2 plethysmograph. p = beat fazı; genlik dışarıda SpO2 ile ölçeklenir. */
export function samplePleth(p: number): number {
  const pp = wrap01(p);
  const main = gauss(pp, 0.215, 0.105);
  const dicrotic = 0.34 * gauss(pp, 0.45, 0.07);
  return clamp((main + dicrotic) / 1.06, 0, 1);
}

// Arteriyel basınç dalgası (4. lane). Keskin sistolik + dikrotik çentik.
export function sampleArt(p: number): number {
  const pp = wrap01(p);
  const systolic = gauss(pp, 0.16, 0.052);
  const dicrotic = 0.42 * gauss(pp, 0.34, 0.055);
  const diastolic = 0.18 * (1 - smooth(0.34, 0.95, pp));
  return clamp(systolic + dicrotic + diastolic, 0, 1);
}

// Kapnografi kare-plato. p = resp fazı; yükseklik dışarıda EtCO2 ile ölçeklenir.
// `mode`: normal | obstructive (köpekbalığı yüzgeci) | rebreathing (yükselmiş
//          taban) | esophageal (gerçek CO2 yok — küçük sönen iz).
export function sampleCO2(p: number, mode?: CapnoMode): number {
  const pp = wrap01(p);
  if (mode === "esophageal") return 0.04 * Math.exp(-pp * 6) * Math.max(0, 1 - pp * 3);
  if (mode === "obstructive") {
    // köpekbalığı yüzgeci: slurred yükseliş, keskin plato yok (KOAH/bronkospazm)
    const rise = smooth(0.05, 0.55, pp);
    const fall = 1 - smooth(0.8, 0.9, pp);
    return clamp(rise * fall * (0.7 + 0.5 * pp), 0, 1);
  }
  const rise = smooth(0.06, 0.18, pp);
  const fall = 1 - smooth(0.74, 0.84, pp);
  const tilt = 0.88 + 0.16 * pp; // hafif alveolar plato yokuşu
  let v = rise * fall * tilt;
  if (mode === "rebreathing") v = 0.28 + 0.72 * v; // yükselmiş inspire taban
  return clamp(v, 0, 1);
}

/* ---------- trend sparkline için ring buffer ---------- */
export class RingBuffer {
  size: number;
  buf: number[];
  constructor(size: number) {
    this.size = size;
    this.buf = [];
  }
  push(v: number): void {
    this.buf.push(v);
    if (this.buf.length > this.size) this.buf.shift();
  }
  toArray(): number[] {
    return this.buf.slice();
  }
}
