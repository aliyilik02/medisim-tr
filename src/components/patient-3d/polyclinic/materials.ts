// ============================================================
// Poliklinik malzemeleri — düz renk + tuvalden üretilen dokular
// ============================================================
// Doku dosyası indirilmez: zemin, asma tavan, ahşap kaplama, fayans ve
// afişler tarayıcıda tuvale (canvas) çizilir. Tuval yoksa (test ortamı)
// düz renge düşer. Malzemeler TEMBEL kurulur — modül yüklenirken değil,
// sahne ilk çizilirken (`getPolyclinicMaterials`).
// Renk dili: sakin, gün ışığı alan Türk kamu polikliniği — kırık beyaz
// duvar, adaçayı yeşili alt bant, petrol mavisi döşeme, teal vurgu.
// ============================================================

import {
  CanvasTexture,
  DoubleSide,
  MeshStandardMaterial,
  RepeatWrapping,
  SRGBColorSpace,
  type Texture,
} from "three";

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** Tekrarlanabilir sözde-rastgele (doku her açılışta aynı çıksın). */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function canvasTexture(w: number, h: number, draw: Draw, repeat = false): Texture | null {
  if (typeof document === "undefined") return null;
  try {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return null;
    draw(ctx, w, h);
    const t = new CanvasTexture(c);
    t.colorSpace = SRGBColorSpace;
    t.anisotropy = 8;
    if (repeat) {
      t.wrapS = RepeatWrapping;
      t.wrapT = RepeatWrapping;
    }
    return t;
  } catch {
    return null;
  }
}

// ── Yüzey dokuları ────────────────────────────────────────────

/** PVC/vinil zemin — açık gri-bej, ince benek + yumuşak ton dalgası (1 m'de tekrar). */
const drawVinyl: Draw = (ctx, w, h) => {
  const r = rng(11);
  ctx.fillStyle = "#b9beb9";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 46; i++) {
    const x = r() * w;
    const y = r() * h;
    const rad = 40 + r() * 110;
    const g = ctx.createRadialGradient(x, y, 0, x, y, rad);
    const light = r() > 0.5;
    g.addColorStop(0, light ? "rgba(214,218,212,0.20)" : "rgba(150,158,154,0.16)");
    g.addColorStop(1, "rgba(185,190,185,0)");
    ctx.fillStyle = g;
    // Kenardan taşan leke karşı kenardan devam etsin → dikişsiz tekrar.
    for (const ox of [-w, 0, w]) for (const oy of [-h, 0, h]) ctx.fillRect(x - rad + ox, y - rad + oy, rad * 2, rad * 2);
  }
  const tones = ["#8f9894", "#d3d7d2", "#a2aaa5", "#e0e3de", "#7f8985"];
  for (let i = 0; i < 5200; i++) {
    ctx.fillStyle = tones[Math.floor(r() * tones.length)];
    ctx.globalAlpha = 0.25 + r() * 0.4;
    const s = 1 + r() * 1.6;
    ctx.fillRect(r() * w, r() * h, s, s);
  }
  ctx.globalAlpha = 1;
};

/** Asma tavan karosu (60×60) — taşıyıcı profil çizgisi + iğne delikleri. */
const drawCeilingTile: Draw = (ctx, w, h) => {
  const r = rng(23);
  ctx.fillStyle = "#e6e8e4";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 520; i++) {
    ctx.fillStyle = r() > 0.5 ? "rgba(170,175,170,0.55)" : "rgba(196,200,195,0.6)";
    const s = 1 + r() * 1.4;
    ctx.fillRect(4 + r() * (w - 8), 4 + r() * (h - 8), s, s);
  }
  ctx.strokeStyle = "#c2c6c1";
  ctx.lineWidth = 5;
  ctx.strokeRect(0, 0, w, h);
};

/** Açık meşe laminat — yatay damar. */
const drawWood: Draw = (ctx, w, h) => {
  const r = rng(37);
  ctx.fillStyle = "#c9ae88";
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 150; i++) {
    const y = r() * h;
    ctx.strokeStyle = r() > 0.35 ? `rgba(150,118,80,${0.08 + r() * 0.2})` : `rgba(226,204,170,${0.1 + r() * 0.2})`;
    ctx.lineWidth = 0.6 + r() * 2.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    const amp = 2 + r() * 5;
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 70 + i) * amp);
    ctx.stroke();
  }
};

/** Beyaz duvar fayansı — 2×2 karo + derz. */
const drawTile: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#cdd3d1";
  ctx.fillRect(0, 0, w, h);
  const g = 4;
  ctx.fillStyle = "#f0f3f1";
  for (const x of [0, w / 2]) for (const y of [0, h / 2]) ctx.fillRect(x + g / 2, y + g / 2, w / 2 - g, h / 2 - g);
};

/** Pencere dışı — soluk gökyüzü + karşı binaların silueti (jaluzi arkası). */
const drawSky: Draw = (ctx, w, h) => {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#cfe2f2");
  g.addColorStop(0.6, "#eaf2f7");
  g.addColorStop(1, "#f4f4ee");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const r = rng(51);
  let x = 0;
  while (x < w) {
    const bw = 50 + r() * 90;
    const bh = h * (0.18 + r() * 0.22);
    ctx.fillStyle = r() > 0.5 ? "#d9d5cb" : "#cfd3d2";
    ctx.fillRect(x, h - bh, bw, bh);
    ctx.fillStyle = "rgba(120,135,145,0.5)";
    for (let wy = h - bh + 8; wy < h - 10; wy += 18) for (let wx = x + 7; wx < x + bw - 10; wx += 16) ctx.fillRect(wx, wy, 8, 10);
    x += bw + 2;
  }
};

// ── Afiş / gösterge / ekran dokuları ──────────────────────────

const FONT = "'Geist', 'Segoe UI', Arial, sans-serif";

/** El hijyeni afişi (DSÖ "5 endikasyon" başlıkları). */
const drawHygiene: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#fbfcfb";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0d9488";
  ctx.fillRect(0, 0, w, 120);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 54px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("EL HİJYENİ", w / 2, 62);
  ctx.font = `400 26px ${FONT}`;
  ctx.fillText("5 Endikasyon", w / 2, 100);
  const rows = [
    "Hasta ile temastan önce",
    "Aseptik işlemden önce",
    "Vücut sıvısı riskinden sonra",
    "Hasta ile temastan sonra",
    "Hasta çevresi ile temastan sonra",
  ];
  rows.forEach((t, i) => {
    const y = 185 + i * 104;
    ctx.fillStyle = "#0d9488";
    ctx.beginPath();
    ctx.arc(70, y, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.font = `700 38px ${FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(i + 1), 70, y + 13);
    ctx.fillStyle = "#1f2b2e";
    ctx.font = `500 25px ${FONT}`;
    ctx.textAlign = "left";
    ctx.fillText(t, 124, y + 9);
  });
};

/** "Hasta Hakları" panosu — başlık + okunmayan gri metin şeritleri. */
const drawRights: Draw = (ctx, w, h) => {
  const r = rng(77);
  ctx.fillStyle = "#f7f8f6";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#24506a";
  ctx.fillRect(0, 0, w, 96);
  ctx.fillStyle = "#ffffff";
  ctx.font = `700 44px ${FONT}`;
  ctx.textAlign = "center";
  ctx.fillText("HASTA HAKLARI", w / 2, 64);
  for (let i = 0; i < 12; i++) {
    const y = 140 + i * 46;
    ctx.fillStyle = "#24506a";
    ctx.fillRect(40, y, 14, 14);
    ctx.fillStyle = "#b8bfc2";
    ctx.fillRect(70, y + 1, 180 + r() * 220, 11);
  }
};

/** Göz tahtası ("E" tahtası) — satır satır küçülen yönlü E harfleri. */
const drawEyeChart: Draw = (ctx, w, h) => {
  const r = rng(91);
  ctx.fillStyle = "#fdfdfb";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#111315";
  let y = 30;
  const sizes = [110, 84, 64, 50, 40, 32, 26, 20];
  sizes.forEach((s, row) => {
    const n = Math.min(row + 1, 7);
    const gap = (w - n * s) / (n + 1);
    for (let i = 0; i < n; i++) {
      const cx = gap + i * (s + gap) + s / 2;
      const cy = y + s / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((Math.floor(r() * 4) * Math.PI) / 2);
      const u = s / 5;
      ctx.fillRect(-s / 2, -s / 2, u, s);
      for (const k of [0, 2, 4]) ctx.fillRect(-s / 2, -s / 2 + k * u, s, u);
      ctx.restore();
    }
    y += s + 22;
  });
};

/** Çerçeveli belge (diploma/ruhsat) — kenarlık + çizgiler. */
const drawCertificate: Draw = (ctx, w, h) => {
  ctx.fillStyle = "#f6f1e4";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#a08a52";
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, w - 28, h - 28);
  ctx.fillStyle = "#6a5a34";
  ctx.fillRect(w / 2 - 90, 44, 180, 12);
  ctx.fillStyle = "#b9b09a";
  for (let i = 0; i < 5; i++) ctx.fillRect(50, 86 + i * 22, w - 100, 6);
  ctx.fillStyle = "#b3261e";
  ctx.beginPath();
  ctx.arc(w - 70, h - 60, 20, 0, Math.PI * 2);
  ctx.fill();
};

/** Masa bilgisayarı ekranı — hastane bilgi sistemi görünümü. */
const drawScreen: Draw = (ctx, w, h) => {
  const r = rng(103);
  ctx.fillStyle = "#eef2f3";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0f766e";
  ctx.fillRect(0, 0, w, 34);
  ctx.fillStyle = "#ffffff";
  ctx.font = `600 17px ${FONT}`;
  ctx.textAlign = "left";
  ctx.fillText("HBYS · Poliklinik Muayene", 12, 23);
  ctx.fillStyle = "#dfe6e8";
  ctx.fillRect(0, 34, 120, h - 34);
  for (let i = 0; i < 7; i++) {
    ctx.fillStyle = i === 1 ? "#0d9488" : "#b4c0c4";
    ctx.fillRect(12, 52 + i * 30, 96, 14);
  }
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? "#f7f9f9" : "#ffffff";
    ctx.fillRect(132, 48 + i * 30, w - 144, 26);
    ctx.fillStyle = "#93a1a6";
    ctx.fillRect(140, 57 + i * 30, 60 + r() * 150, 8);
    ctx.fillStyle = "#c3ccd0";
    ctx.fillRect(w - 110, 57 + i * 30, 70, 8);
  }
};

/** Duvar saati kadranı — 10:10. */
const drawClock: Draw = (ctx, w, h) => {
  const c = w / 2;
  ctx.fillStyle = "#fbfbf9";
  ctx.beginPath();
  ctx.arc(c, h / 2, c - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1f22";
  ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    ctx.lineWidth = i % 3 === 0 ? 7 : 3;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * (c - 30), c - Math.cos(a) * (c - 30));
    ctx.lineTo(c + Math.sin(a) * (c - 14), c - Math.cos(a) * (c - 14));
    ctx.stroke();
  }
  const hand = (a: number, len: number, lw: number) => {
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.moveTo(c, c);
    ctx.lineTo(c + Math.sin(a) * len, c - Math.cos(a) * len);
    ctx.stroke();
  };
  hand((-50 * Math.PI) / 180, c * 0.5, 9);
  hand((60 * Math.PI) / 180, c * 0.72, 6);
};

/** Aneroid gösterge (tansiyon aleti / baskül) — ölçek çizgileri + ibre. */
const drawGauge: Draw = (ctx, w, h) => {
  const c = w / 2;
  ctx.fillStyle = "#fafaf7";
  ctx.beginPath();
  ctx.arc(c, h / 2, c - 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#1c1f22";
  for (let i = 0; i <= 30; i++) {
    const a = ((-135 + i * 9) * Math.PI) / 180;
    ctx.lineWidth = i % 5 === 0 ? 5 : 2;
    const inner = i % 5 === 0 ? c - 34 : c - 24;
    ctx.beginPath();
    ctx.moveTo(c + Math.sin(a) * inner, c - Math.cos(a) * inner);
    ctx.lineTo(c + Math.sin(a) * (c - 12), c - Math.cos(a) * (c - 12));
    ctx.stroke();
  }
  ctx.strokeStyle = "#b3261e";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(c, c);
  ctx.lineTo(c - c * 0.45, c + c * 0.5);
  ctx.stroke();
};

/** Masa bayrağı — Türk Bayrağı Kanunu oranları (G = en, boy 1.5 G). */
const drawFlag: Draw = (ctx, w, h) => {
  const G = h;
  ctx.fillStyle = "#e30a17";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(0.5 * G, 0.5 * G, 0.25 * G, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#e30a17";
  ctx.beginPath();
  ctx.arc(0.5625 * G, 0.5 * G, 0.2 * G, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  const cx = (0.5625 - 0.2 + 1 / 3 + 0.125) * G;
  const R = 0.125 * G;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : R * 0.382;
    const a = Math.PI + (i * Math.PI) / 5; // bir uç ay'a (sola) bakar
    const px = cx + Math.cos(a) * rad;
    const py = 0.5 * G + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
};

// ── Malzeme seti ──────────────────────────────────────────────

function std(color: string, roughness: number, metalness = 0, map: Texture | null = null) {
  return new MeshStandardMaterial({ color: map ? "#ffffff" : color, roughness, metalness, map: map ?? undefined });
}
function poster(map: Texture | null, fallback: string) {
  return new MeshStandardMaterial({ color: map ? "#ffffff" : fallback, roughness: 0.75, map: map ?? undefined });
}
function glow(color: string, intensity: number, map: Texture | null = null) {
  return new MeshStandardMaterial({
    color: map ? "#ffffff" : color,
    emissive: map ? "#ffffff" : color,
    emissiveMap: map ?? undefined,
    emissiveIntensity: intensity,
    map: map ?? undefined,
    roughness: 0.5,
  });
}

function flagMaterial(map: Texture | null) {
  return new MeshStandardMaterial({ color: map ? "#ffffff" : "#e30a17", roughness: 0.8, side: DoubleSide, map: map ?? undefined });
}

function createMaterials() {
  return {
    // Yapı
    wallUpper: std("#e8ebe6", 0.92),
    wallLower: std("#c5d5cd", 0.86),
    wallRail: std("#93a89f", 0.6),
    skirting: std("#6d7775", 0.7),
    floor: std("#b9beb9", 0.5, 0, canvasTexture(512, 512, drawVinyl, true)),
    slab: std("#15171a", 0.9),
    ceiling: std("#e6e8e4", 0.95, 0, canvasTexture(256, 256, drawCeilingTile, true)),
    led: glow("#f3f8fb", 1.25),
    // Metal / boya
    steel: std("#b7bec2", 0.3, 0.85),
    steelDark: std("#5a626a", 0.45, 0.7),
    chrome: std("#dde3e6", 0.16, 1),
    epoxy: std("#e4e7e8", 0.5, 0.1),
    brass: std("#b59a4d", 0.35, 0.9),
    // Döşeme / kumaş / kağıt
    vinyl: std("#1f4a5c", 0.58),
    vinylBlack: std("#1b1f23", 0.55),
    paper: std("#f3f4f0", 0.95),
    pillow: std("#edf0f0", 0.9),
    screenFabric: new MeshStandardMaterial({ color: "#8db5ac", roughness: 0.95, side: DoubleSide }),
    // Mobilya gövdesi
    wood: std("#c9ae88", 0.55, 0, canvasTexture(512, 256, drawWood, true)),
    lam: std("#dbdedd", 0.62),
    plasticDark: std("#22262b", 0.5),
    plasticLight: std("#e2e5e5", 0.48),
    rubber: std("#181a1d", 0.9),
    device: std("#d9dee0", 0.42),
    frame: std("#3b3027", 0.6),
    doorFrame: std("#8b9398", 0.5, 0.4),
    // Islak hacim
    ceramic: std("#f1f3f2", 0.16, 0.02),
    ceramicShade: std("#bfc7c9", 0.3),
    tile: std("#f0f3f1", 0.2, 0, canvasTexture(256, 256, drawTile, true)),
    marble: std("#d8d6cf", 0.32),
    // Pencere
    pvc: std("#f1f2f1", 0.38),
    blind: std("#e3e1d8", 0.55, 0.15),
    radiator: std("#ebeded", 0.45, 0.1),
    sky: glow("#e6f0f7", 1.05, canvasTexture(512, 384, drawSky)),
    glass: new MeshStandardMaterial({ color: "#c4d6da", transparent: true, opacity: 0.14, roughness: 0.08, metalness: 0.1, depthWrite: false }),
    glassSolid: new MeshStandardMaterial({ color: "#cfe3e6", transparent: true, opacity: 0.5, roughness: 0.15 }),
    // Renk kodlu parçalar
    o2Body: std("#3d6c8b", 0.4, 0.5),
    o2White: std("#eef0f0", 0.4, 0.4),
    red: std("#b3261e", 0.55),
    yellow: std("#e0b21c", 0.5),
    binGray: std("#b4babd", 0.55),
    boxBlue: std("#3b6ea5", 0.7),
    boxTeal: std("#0d9488", 0.7),
    boxWhite: std("#eceeed", 0.7),
    amber: std("#5d3418", 0.3),
    kolonya: new MeshStandardMaterial({ color: "#e9e3a4", transparent: true, opacity: 0.72, roughness: 0.12 }),
    // Tuval baskılı yüzeyler
    screen: glow("#dfe8ea", 0.55, canvasTexture(512, 300, drawScreen)),
    lightbox: glow("#eef3f5", 0.5),
    hygiene: poster(canvasTexture(512, 720, drawHygiene), "#f3f6f5"),
    rights: poster(canvasTexture(512, 720, drawRights), "#f1f3f2"),
    eyeChart: poster(canvasTexture(512, 760, drawEyeChart), "#fbfbf9"),
    certificate: poster(canvasTexture(384, 288, drawCertificate), "#f3eedf"),
    clock: poster(canvasTexture(256, 256, drawClock), "#fafaf8"),
    gauge: poster(canvasTexture(256, 256, drawGauge), "#f7f7f4"),
    flag: flagMaterial(canvasTexture(300, 200, drawFlag)),
  };
}

export type PolyMats = ReturnType<typeof createMaterials>;

let cache: PolyMats | null = null;
/** Malzeme seti — ilk çağrıda kurulur, sonra paylaşılır (sayfa ömrü boyunca). */
export function getPolyclinicMaterials(): PolyMats {
  if (!cache) cache = createMaterials();
  return cache;
}
