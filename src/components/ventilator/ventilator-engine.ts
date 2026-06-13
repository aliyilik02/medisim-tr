/* =========================================================================
   ventilator-engine.ts — MediSim TR mekanik ventilatör dalga formu motoru.

   SAF / framework-bağımsız (React import YOK; mimari kural 1: src/engine
   benzeri saf modül). Referans MANTIK: github.com/fedebarra/open-vent-sim
   (MIT) — kod KOPYALANMADI, ventilasyon mantığı yeniden modellendi.

   `waveform-engine.ts` (monitör) deseniyle aynı çatı: faz∈[0,1) → normalize
   genlik döndüren saf sampler fonksiyonlar. Lane'ler bu örnekleri kanvas Y'ye
   baseline + gain ile eşler.

   Dalga formları (solunum fazı u∈[0,1) üzerinden, u=0 inspirasyon başı):
   - pressure: havayolu basıncı (cmH₂O) → [0..1] (PEEP tabanı + plato/ramp)
   - flow: hava akışı (L/dk) → [-1..1] (inspirasyon +, ekspirasyon −)
   - volume: tidal hacim (mL) → [0..1] (yükselip baseline'a dönen trapez/üçgen)

   Modlar: VCV, PCV, SIMV, PSV, CPAP. Parametreler: FiO2, PEEP, RR, Vt,
   I:E oranı, Ppeak, Pplateau. Presetler: Normal / ARDS / COPD.
   ========================================================================= */

/* ---------- tipler ---------- */
export type VentMode = "VCV" | "PCV" | "SIMV" | "PSV" | "CPAP";
export type VentWaveKind = "pressure" | "flow" | "volume";
export type VentPresetKey = "normal" | "ards" | "copd";

export interface VentSettings {
  mode: VentMode;
  fio2: number; // % oksijen (21–100)
  peep: number; // cmH₂O — pozitif ekspirasyon sonu basınç
  rr: number; // /dk — set solunum hızı
  vt: number; // mL — tidal hacim hedefi
  ie: number; // I:E ekspirasyon kolu (1:ie); ör. 2 → I:E = 1:2
  pPeak: number; // cmH₂O — tepe (inspiratuvar) basınç
  pPlateau: number; // cmH₂O — plato basıncı
}

/** Türetilen/ölçülen değerler — numerik kutular bunları gösterir. */
export interface VentDerived {
  minuteVolume: number; // L/dk = Vt(mL)·RR / 1000
  iTime: number; // sn — inspirasyon süresi
  eTime: number; // sn — ekspirasyon süresi
  cycleTime: number; // sn — toplam solunum döngüsü
  iPercent: number; // % — inspirasyonun döngüye oranı
  compliance: number; // mL/cmH₂O — statik kompliyans
  pDriving: number; // cmH₂O — sürücü basınç (Pplateau − PEEP)
}

/* ---------- sayısal yardımcılar (waveform-engine ile aynı imza) ---------- */
export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
// a..b arası smoothstep (yumuşak geçiş kenarları için)
export const smooth = (a: number, b: number, x: number): number => {
  const t = clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
export const wrap01 = (p: number): number => p - Math.floor(p);

/* ---------- klinik dalga paleti (Dräger / Hamilton konvansiyonu) ----------
   Basınç sarı, akış camgöbeği, hacim yeşil — yaygın ventilatör renk şeması. */
export const VENT_WAVE: Record<VentWaveKind, string> = {
  pressure: "#f5c43a", // sarı (Paw)
  flow: "#2ad4ee", // camgöbeği (Flow)
  volume: "#36e07a", // yeşil (Volume)
};

export const VENT_WAVE_LABEL: Record<VentWaveKind, { label: string; unit: string }> = {
  pressure: { label: "Basınç · Paw", unit: "cmH₂O" },
  flow: { label: "Akış · Flow", unit: "L/dk" },
  volume: { label: "Hacim · Volume", unit: "mL" },
};

export const MODE_LABEL: Record<VentMode, string> = {
  VCV: "Hacim Kontrol (VCV)",
  PCV: "Basınç Kontrol (PCV)",
  SIMV: "SIMV (Senkronize Aralıklı)",
  PSV: "Basınç Destek (PSV)",
  CPAP: "CPAP (Sürekli Pozitif)",
};

export const MODE_SHORT: Record<VentMode, string> = {
  VCV: "VCV",
  PCV: "PCV",
  SIMV: "SIMV",
  PSV: "PSV",
  CPAP: "CPAP",
};

/* ---------- preset parametre setleri ----------
   Normal: erişkin akciğeri. ARDS: düşük Vt akciğer-koruyucu (ARDSNet:
   6 mL/kg, yüksek PEEP, yüksek FiO2). COPD: hava hapsi → uzun ekspirasyon
   (düşük I:E, düşük PEEP, orta Vt). Eğitim amaçlı yaklaşık değerler. */
export interface VentPreset {
  key: VentPresetKey;
  label: string;
  note: string;
  settings: VentSettings;
}

export const VENT_PRESETS: Record<VentPresetKey, VentPreset> = {
  normal: {
    key: "normal",
    label: "Normal Akciğer",
    note: "Erişkin standart — VCV, Vt ~500 mL, PEEP 5",
    settings: {
      mode: "VCV",
      fio2: 40,
      peep: 5,
      rr: 14,
      vt: 500,
      ie: 2, // 1:2
      pPeak: 20,
      pPlateau: 16,
    },
  },
  ards: {
    key: "ards",
    label: "ARDS",
    note: "Akciğer-koruyucu — düşük Vt (~6 mL/kg), yüksek PEEP/FiO₂",
    settings: {
      mode: "PCV",
      fio2: 80,
      peep: 12,
      rr: 24,
      vt: 380,
      ie: 1, // 1:1 (uzamış inspirasyon)
      pPeak: 30,
      pPlateau: 28,
    },
  },
  copd: {
    key: "copd",
    label: "KOAH",
    note: "Hava hapsi riski — uzun ekspirasyon, düşük PEEP",
    settings: {
      mode: "VCV",
      fio2: 35,
      peep: 5,
      rr: 12,
      vt: 480,
      ie: 3, // 1:3 (uzun ekspirasyon, oto-PEEP'ten kaçın)
      pPeak: 26,
      pPlateau: 18,
    },
  },
};

export const DEFAULT_VENT_SETTINGS: VentSettings = VENT_PRESETS.normal.settings;

/* ---------- güvenli parametre sınırları (slider clamp + alarm) ---------- */
export interface VentParamSpec {
  min: number;
  max: number;
  step: number;
  warnLo: number;
  warnHi: number;
  unit: string;
  label: string;
}

export type VentParamKey = "fio2" | "peep" | "rr" | "vt" | "ie";

export const VENT_PARAM: Record<VentParamKey, VentParamSpec> = {
  fio2: { min: 21, max: 100, step: 1, warnLo: 21, warnHi: 60, unit: "%", label: "FiO₂" },
  peep: { min: 0, max: 24, step: 1, warnLo: 0, warnHi: 15, unit: "cmH₂O", label: "PEEP" },
  rr: { min: 4, max: 40, step: 1, warnLo: 8, warnHi: 30, unit: "/dk", label: "RR" },
  vt: { min: 200, max: 800, step: 10, warnLo: 300, warnHi: 650, unit: "mL", label: "Vt" },
  ie: { min: 1, max: 4, step: 1, warnLo: 1, warnHi: 4, unit: ":1", label: "I:E (1:x)" },
};

/* ---------- türetilen değer hesaplayıcı ----------
   I:E = 1:ie. inspirasyon kolu sabit 1 birim, ekspirasyon ie birim. */
export function deriveVentValues(s: VentSettings): VentDerived {
  const rr = Math.max(1, s.rr);
  const cycleTime = 60 / rr; // sn
  const iFraction = 1 / (1 + s.ie); // inspirasyonun döngüye oranı
  const iTime = cycleTime * iFraction;
  const eTime = cycleTime - iTime;
  const minuteVolume = (s.vt * rr) / 1000; // L/dk
  const pDriving = Math.max(0, s.pPlateau - s.peep);
  // statik kompliyans = Vt / (Pplateau − PEEP)
  const compliance = pDriving > 0 ? s.vt / pDriving : 0;
  return {
    minuteVolume,
    iTime,
    eTime,
    cycleTime,
    iPercent: iFraction * 100,
    compliance,
    pDriving,
  };
}

/* =========================================================================
   DALGA FORMU ÖRNEKLEYİCİLERİ
   Her biri solunum fazı u∈[0,1) (u=0 inspirasyon başı) + ayarları alır ve
   normalize genlik döndürür. Lane çizimi:
   - pressure → [0..1]    (baseline alta yakın; PEEP tabanı + tepe)
   - flow     → [-1..1]   (orta baseline; insp + / eksp −)
   - volume   → [0..1]    (baseline alta yakın; yükselip dönen eğri)
   `iFraction` = inspirasyonun döngüye oranı (deriveVentValues'tan; I:E'den).
   ========================================================================= */

/* Havayolu basıncı (Paw). VCV → ramp-up sonra plato; PCV/PSV → kare basınç
   platosu; CPAP → sabit PEEP'e yakın küçük dalgalanma. PEEP zemin değeridir.
   Genlik dışarıda pPeak ile [0..1]'e normalize edilir; burada [0..1] döner. */
export function sampleVentPressure(
  u: number,
  mode: VentMode,
  iFraction: number,
  peepNorm: number, // PEEP / pPeak  (taban yüksekliği, 0..1)
  plateauNorm: number // pPlateau / pPeak (plato yüksekliği, 0..1)
): number {
  const uu = wrap01(u);
  const insp = uu < iFraction;
  const baseline = clamp(peepNorm, 0, 1);

  if (mode === "CPAP") {
    // sürekli pozitif basınç: PEEP düzeyinde ufak spontan dalgalanma
    const ripple = 0.03 * Math.sin(2 * Math.PI * uu * 2);
    return clamp(baseline + ripple, 0, 1);
  }

  if (!insp) {
    // ekspirasyon: plato/tepe basıncından PEEP tabanına üstel iniş
    const e = (uu - iFraction) / Math.max(1e-3, 1 - iFraction);
    const top = mode === "PSV" ? lerp(baseline, plateauNorm, 0.85) : plateauNorm;
    return clamp(lerp(top, baseline, smooth(0, 0.45, e)), 0, 1);
  }

  // inspirasyon
  const i = uu / Math.max(1e-3, iFraction);
  if (mode === "VCV") {
    // sabit akış → basınçta lineer ramp, sonra plato (klasik VCV "sabit akış" izi)
    const ramp = lerp(baseline, plateauNorm, smooth(0, 0.55, i));
    const peakBump = 1.0 - baseline; // tepe ~ tam genlik (Ppeak)
    // rezistif tepe: erken zirve sonra plato düşüşü
    const resist = (peakBump) * Math.exp(-Math.pow((i - 0.6) / 0.18, 2)) * 0.18;
    return clamp(ramp + resist, 0, 1);
  }
  // PCV / PSV / SIMV(basınç) → hızlı yükselen kare plato
  const rise = smooth(0, 0.12, i);
  const fall = 1 - smooth(0.9, 1.0, i);
  return clamp(lerp(baseline, plateauNorm, rise * fall), 0, 1);
}

/* Hava akışı (Flow). İnspirasyon +, ekspirasyon −. VCV → kare (sabit) akış;
   PCV/PSV → azalan (desselerating) inspiratuvar akış. Ekspirasyon her zaman
   pasif üstel iniş. [-1..1] döner. */
export function sampleVentFlow(u: number, mode: VentMode, iFraction: number): number {
  const uu = wrap01(u);
  const insp = uu < iFraction;

  if (mode === "CPAP") {
    // spontan: küçük sinüzoidal akış
    return 0.25 * Math.sin(2 * Math.PI * uu);
  }

  if (insp) {
    const i = uu / Math.max(1e-3, iFraction);
    if (mode === "VCV" || mode === "SIMV") {
      // sabit (kare) akış: hızlı açılır, hedefte sabit, kapanışta düşer
      const on = smooth(0, 0.06, i);
      const off = 1 - smooth(0.92, 1.0, i);
      return on * off;
    }
    // PCV / PSV: azalan akış (başta tepe, üstel düşüş)
    return Math.exp(-i * 2.6) * (1 - smooth(0.95, 1.0, i));
  }

  // ekspirasyon: keskin negatif tepe sonra pasif üstel dönüş
  const e = (uu - iFraction) / Math.max(1e-3, 1 - iFraction);
  const peak = -Math.exp(-e * 3.2);
  return peak * (1 - smooth(0.9, 1.0, e));
}

/* Tidal hacim (Volume). İnspirasyonda Vt'ye yükselir, ekspirasyonda
   baseline'a (0) döner. VCV → lineer dolum (sabit akış integralı);
   PCV/PSV → hızlı dolup yavaşlayan eğri. [0..1] döner. */
export function sampleVentVolume(u: number, mode: VentMode, iFraction: number): number {
  const uu = wrap01(u);
  const insp = uu < iFraction;

  if (mode === "CPAP") {
    // spontan hacim salınımı
    return clamp(0.5 + 0.42 * Math.sin(2 * Math.PI * uu - Math.PI / 2), 0, 1);
  }

  if (insp) {
    const i = uu / Math.max(1e-3, iFraction);
    if (mode === "VCV" || mode === "SIMV") {
      return smooth(0, 1, i); // sabit akış → ~lineer dolum (yumuşatılmış)
    }
    // azalan akış → konkav (hızlı başlangıç, plato yaklaşımı)
    return clamp(1 - Math.exp(-i * 2.6), 0, 1);
  }

  // ekspirasyon: pasif üstel boşalma → 0
  const e = (uu - iFraction) / Math.max(1e-3, 1 - iFraction);
  return clamp(Math.exp(-e * 3.0), 0, 1);
}

/* Tek çağrı dispatcher — lane bunu kind'a göre çağırır. peepNorm/plateauNorm
   yalnız pressure için anlamlı; diğerleri yoksayar. */
export function sampleVentWave(
  kind: VentWaveKind,
  u: number,
  mode: VentMode,
  iFraction: number,
  peepNorm: number,
  plateauNorm: number
): number {
  if (kind === "pressure")
    return sampleVentPressure(u, mode, iFraction, peepNorm, plateauNorm);
  if (kind === "flow") return sampleVentFlow(u, mode, iFraction);
  return sampleVentVolume(u, mode, iFraction);
}
