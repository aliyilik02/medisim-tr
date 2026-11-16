// ============================================================
// buildPolyclinic — poliklinik muayene odasını parça parça kurar
// ============================================================
// Türk kamu polikliniği / ASM muayene odası: muayene sedyesi (kağıt rulolu),
// hekim masası + bilgisayar, 2 hasta sandalyesi, paravan, pansuman arabası,
// camlı malzeme dolabı, boy-kilo ölçer, lavabo + fayans, panel radyatör,
// jaluzili pencere, asma tavan + LED panel, taşınabilir oksijen tüpü.
// Ölçüler GERÇEK METRE (layout.ts). Çıktı: kesit grupları — sahne, kamera
// duvarın/tavanın dışına çıkınca o grubu gizler (maket görünümü).
// ============================================================

import { CylinderGeometry, Matrix4, type Group } from "three";
import { Kit } from "./roomKit";
import { COUCH, DOOR, IV_HOOK_Y, IV_POLE, LED_PANELS, O2_CYLINDER, PILLOW_DZ, ROOM, ROOM_ORIGIN, WINDOW } from "./layout";
import type { PolyMats } from "./materials";

export interface PolyclinicParts {
  floor: Group;
  ceiling: Group;
  wallN: Group;
  wallE: Group;
  wallS: Group;
  wallW: Group;
  /** B duvarına yaslı yüksek mobilya (dolap, boy-kilo) — duvarla birlikte gizlenir. */
  wallWProps: Group;
  wallWGlass: Group;
  furniture: Group;
}

const PI = Math.PI;
const HALF = PI / 2;
/** Duvar alt bant yüksekliği + ayırıcı ray kalınlığı. */
const BAND = 1.15;
const RAIL = 0.045;

export function buildPolyclinic(M: PolyMats): PolyclinicParts {
  const { xW, xE, zN, zS, h: H } = ROOM;
  const lenX = xE - xW;
  const lenZ = zS - zN;
  const cx = (xW + xE) / 2;
  const cz = (zN + zS) / 2;
  // Oda-yerel → dünya: 180° Y dönüşü + öteleme (layout.roomToWorld ile aynı).
  const base = new Matrix4().makeRotationY(PI).setPosition(ROOM_ORIGIN.x, 0, ROOM_ORIGIN.z);
  const kit = () => new Kit(base.clone());

  // ── Zemin ───────────────────────────────────────────────────
  const floorKit = kit();
  floorKit.quad(M.floor, lenX, lenZ, [cx, 0, cz], [-HALF, 0, 0], 1);
  floorKit.box(M.slab, [lenX + 0.24, 0.12, lenZ + 0.24], [cx, -0.061, cz]);

  // ── Tavan (asma tavan + LED paneller) ───────────────────────
  const ceilKit = kit();
  ceilKit.quad(M.ceiling, lenX, lenZ, [cx, H, cz], [HALF, 0, 0], 0.6);
  for (const [x, z] of LED_PANELS) {
    ceilKit.box(M.epoxy, [0.6, 0.012, 0.6], [x, H - 0.004, z]);
    ceilKit.quad(M.led, 0.55, 0.55, [x, H - 0.011, z], [HALF, 0, 0]);
  }
  // duman dedektörü
  ceilKit.cyl(M.plasticLight, [0.045, 0.055], 0.035, [-0.75, H - 0.018, 1.0]);

  // ── Duvarlar ────────────────────────────────────────────────
  // Duvar-yerel çerçeve: +Z içeri (odaya), +X duvar boyunca, y yükseklik.
  /** Boyalı duvar parçası: alt bant / ray / üst boya kendiliğinden bölünür. */
  const wallSpan = (k: Kit, u0: number, u1: number, v0 = 0, v1: number = H) => {
    const part = (a: number, b: number, mat: PolyMats[keyof PolyMats]) => {
      const lo = Math.max(a, v0);
      const hi = Math.min(b, v1);
      if (hi - lo > 1e-4) k.quad(mat, u1 - u0, hi - lo, [(u0 + u1) / 2, (lo + hi) / 2, 0]);
    };
    part(0, BAND, M.wallLower);
    part(BAND, BAND + RAIL, M.wallRail);
    part(BAND + RAIL, H, M.wallUpper);
    if (v0 < 0.01) k.box(M.skirting, [u1 - u0, 0.1, 0.012], [(u0 + u1) / 2, 0.05, 0.006]);
  };
  /** Kesit üst kapağı — tepeden bakışta duvar kalınlığı okunur. */
  const wallCap = (k: Kit, u0: number, u1: number) =>
    k.box(M.slab, [u1 - u0 + 0.24, 0.03, 0.12], [(u0 + u1) / 2, H + 0.015, -0.06]);

  // Kuzey duvarı (baş ucu) — u = x
  const nKit = kit();
  const n = nKit.at([0, 0, zN], 0);
  wallSpan(n, xW, xE);
  wallCap(n, xW, xE);
  wallDiagnosticSet(n, M, -0.72);
  // eldiven kutuları + kesici-delici atık kutusu (sedye baş ucu, hasta solu)
  [M.boxTeal, M.boxBlue, M.boxWhite].forEach((mat, i) => {
    n.box(mat, [0.24, 0.12, 0.075], [0.62, 1.5 - i * 0.14, 0.04]);
    n.box(M.paper, [0.1, 0.03, 0.004], [0.62, 1.5 - i * 0.14, 0.08]);
  });
  n.rbox(M.yellow, [0.16, 0.2, 0.13], [1.02, 1.2, 0.07], 0.012);
  n.box(M.red, [0.165, 0.03, 0.135], [1.02, 1.315, 0.07]);
  // negatoskop (film okuma kutusu)
  n.rbox(M.epoxy, [0.44, 0.48, 0.07], [-1.32, 1.56, 0.035], 0.01);
  n.quad(M.lightbox, 0.38, 0.42, [-1.32, 1.56, 0.072]);
  // hekim masası arkası: çerçeveli belgeler
  for (const u of [-2.42, -1.98]) {
    n.box(M.frame, [0.36, 0.28, 0.02], [u, 1.78, 0.01]);
    n.quad(M.certificate, 0.31, 0.23, [u, 1.78, 0.0215]);
  }

  // Güney duvarı (kapı) — u = −x
  const sKit = kit();
  const s = sKit.at([0, 0, zS], PI);
  const dU0 = -DOOR.x1;
  const dU1 = -DOOR.x0;
  wallSpan(s, -xE, dU0);
  wallSpan(s, dU0, dU1, DOOR.h, H);
  wallSpan(s, dU1, -xW);
  wallCap(s, -xE, -xW);
  wallDoor(s, M, dU0, dU1);
  // el antiseptiği dispanseri (kapı yanı)
  s.rbox(M.plasticLight, [0.1, 0.22, 0.09], [dU0 - 0.2, 1.2, 0.045], 0.012);
  s.box(M.plasticDark, [0.07, 0.02, 0.06], [dU0 - 0.2, 1.08, 0.05]);
  // ışık anahtarı
  s.box(M.plasticLight, [0.085, 0.085, 0.012], [dU1 + 0.14, 1.1, 0.006]);
  // göz tahtası
  s.box(M.epoxy, [0.46, 0.68, 0.012], [-0.25, 1.55, 0.006]);
  s.quad(M.eyeChart, 0.42, 0.63, [-0.25, 1.55, 0.0135]);

  // Batı duvarı (dolap tarafı) — u = −z
  const wKit = kit();
  const w = wKit.at([xW, 0, 0], HALF);
  wallSpan(w, -zS, -zN);
  wallCap(w, -zS, -zN);
  // duvar saati
  w.cyl(M.plasticDark, 0.16, 0.04, [-0.45, 2.22, 0.02], [HALF, 0, 0], 28);
  w.quad(M.clock, 0.29, 0.29, [-0.45, 2.22, 0.0415]);
  // hasta hakları panosu
  w.box(M.frame, [0.54, 0.74, 0.014], [-0.45, 1.6, 0.007]);
  w.quad(M.rights, 0.5, 0.7, [-0.45, 1.6, 0.0155]);
  // askılık
  w.box(M.steelDark, [0.42, 0.04, 0.015], [-2.8, 1.7, 0.008]);
  for (const du of [-0.14, 0, 0.14]) w.cyl(M.chrome, 0.006, 0.07, [-2.8 + du, 1.69, 0.045], [HALF, 0, 0], 8);

  // Doğu duvarı (pencere + lavabo) — u = z
  const eKit = kit();
  const e = eKit.at([xE, 0, 0], -HALF);
  wallSpan(e, zN, WINDOW.z0);
  wallSpan(e, WINDOW.z0, WINDOW.z1, 0, WINDOW.y0);
  wallSpan(e, WINDOW.z0, WINDOW.z1, WINDOW.y1, H);
  wallSpan(e, WINDOW.z1, zS);
  wallCap(e, zN, zS);
  wallWindow(e, M);
  wallSink(e, M, 2.6);

  // ── Mobilya (gölge düşürür) + cam ───────────────────────────
  const fKit = kit();
  const gKit = kit();
  const wpKit = kit();
  examCouch(fKit.at([COUCH.x, 0, COUCH.z]), M);
  ivPole(fKit.at(IV_POLE), M);
  oxygenCylinder(fKit.at(O2_CYLINDER), M);
  dressingTrolley(fKit.at([-0.95, 0, 1.2]), M);
  stepStool(fKit.at([-0.62, 0, 0.45]), M);
  // paravan — ayak ucu, pencere tarafında park halinde (kamera hatlarını kapatmaz)
  privacyScreen(fKit.at([0.72, 0, 2.0]), M);
  doctorDesk(fKit.at([-2.1, 0, -0.25]), M);
  officeChair(fKit.at([-2.1, 0, -0.8]), M);
  visitorChair(fKit.at([-2.46, 0, 0.66], PI), M);
  visitorChair(fKit.at([-1.76, 0, 0.66], PI), M);
  supplyCabinet(wpKit.at([-2.78, 0, 1.75]), gKit.at([-2.78, 0, 1.75]), M);
  heightScale(wpKit.at([-2.7, 0, 2.72]), M);
  // lavabo yanı, kapı duvarı dibi: tıbbi atık (kırmızı kapak) + evsel atık
  pedalBin(fKit.at([0.78, 0, 2.86]), M, M.red);
  pedalBin(fKit.at([0.44, 0, 2.86]), M, M.plasticDark);

  return {
    floor: floorKit.build({ name: "poly-floor" }),
    ceiling: ceilKit.build({ name: "poly-ceiling", receive: false }),
    wallN: nKit.build({ name: "poly-wall-n" }),
    wallE: eKit.build({ name: "poly-wall-e" }),
    wallS: sKit.build({ name: "poly-wall-s" }),
    wallW: wKit.build({ name: "poly-wall-w" }),
    wallWProps: wpKit.build({ name: "poly-wall-w-props", cast: true }),
    wallWGlass: gKit.build({ name: "poly-wall-w-glass", receive: false }),
    furniture: fKit.build({ name: "poly-furniture", cast: true }),
  };
}

// ── Duvara bağlı parçalar (duvar-yerel: +Z içeri) ─────────────

/** Duvar tanı seti: otoskop + oftalmoskop sapları, aneroid tansiyon aleti, manşon sepeti. */
function wallDiagnosticSet(k: Kit, M: PolyMats, u: number) {
  k.rbox(M.plasticLight, [0.5, 0.26, 0.028], [u, 1.45, 0.014], 0.01);
  for (const du of [-0.17, -0.07]) {
    k.cyl(M.plasticDark, 0.017, 0.15, [u + du, 1.43, 0.062]);
    k.cyl(M.chrome, [0.012, 0.016], 0.045, [u + du, 1.527, 0.062]);
    k.cyl(M.plasticDark, 0.02, 0.03, [u + du, 1.56, 0.068], [HALF, 0, 0], 12);
  }
  k.cyl(M.plasticLight, 0.078, 0.045, [u + 0.12, 1.47, 0.05], [HALF, 0, 0], 28);
  k.quad(M.gauge, 0.14, 0.14, [u + 0.12, 1.47, 0.074]);
  k.box(M.steelDark, [0.22, 0.13, 0.09], [u + 0.12, 1.24, 0.05]);
  k.rbox(M.vinyl, [0.19, 0.09, 0.075], [u + 0.12, 1.27, 0.052], 0.02);
}

/** Kapı: kasa + ahşap kaplama kanat + tekmelik + kol + kapı kapatıcı. */
function wallDoor(k: Kit, M: PolyMats, u0: number, u1: number) {
  const uc = (u0 + u1) / 2;
  const wd = u1 - u0;
  for (const u of [u0 + 0.03, u1 - 0.03]) k.box(M.doorFrame, [0.06, DOOR.h, 0.16], [u, DOOR.h / 2, -0.04]);
  k.box(M.doorFrame, [wd, 0.06, 0.16], [uc, DOOR.h - 0.03, -0.04]);
  k.box(M.wood, [wd - 0.12, DOOR.h - 0.07, 0.04], [uc, (DOOR.h - 0.06) / 2, -0.04]);
  k.box(M.steel, [wd - 0.12, 0.22, 0.003], [uc, 0.12, -0.0185]);
  // kol + ayna
  k.box(M.chrome, [0.05, 0.16, 0.006], [u1 - 0.14, 1.03, -0.017]);
  k.cyl(M.chrome, 0.009, 0.05, [u1 - 0.14, 1.05, 0.008], [HALF, 0, 0], 10);
  k.cyl(M.chrome, 0.008, 0.12, [u1 - 0.195, 1.05, 0.03], [0, 0, HALF], 10);
  // kapı kapatıcı
  k.box(M.steelDark, [0.22, 0.05, 0.045], [u0 + 0.22, DOOR.h - 0.11, 0.004]);
}

/** Pencere: PVC doğrama, gökyüzü arka planı, yarı açık jaluzi, mermer denizlik, panel radyatör. */
function wallWindow(k: Kit, M: PolyMats) {
  const { z0, z1, y0, y1 } = WINDOW;
  const uc = (z0 + z1) / 2;
  const wd = z1 - z0;
  const ht = y1 - y0;
  const vc = (y0 + y1) / 2;
  // dış manzara (duvarın 16 cm dışında, içeri bakar)
  k.quad(M.sky, wd + 0.5, ht + 0.4, [uc, vc, -0.16]);
  // duvar içi (söve)
  k.box(M.wallUpper, [0.012, ht, 0.16], [z0 - 0.006, vc, -0.08]);
  k.box(M.wallUpper, [0.012, ht, 0.16], [z1 + 0.006, vc, -0.08]);
  k.box(M.wallUpper, [wd, 0.012, 0.16], [uc, y1 + 0.006, -0.08]);
  // PVC kasa + orta kayıt
  for (const u of [z0 + 0.03, z1 - 0.03, uc]) k.box(M.pvc, [0.06, ht, 0.065], [u, vc, -0.09]);
  for (const v of [y0 + 0.03, y1 - 0.03]) k.box(M.pvc, [wd, 0.06, 0.065], [uc, v, -0.09]);
  k.box(M.chrome, [0.018, 0.11, 0.03], [uc + 0.045, vc - 0.1, -0.05]);
  k.quad(M.glass, wd - 0.12, ht - 0.12, [uc, vc, -0.09]);
  // jaluzi — başlık + yarı açık lameller
  k.box(M.blind, [wd - 0.03, 0.035, 0.045], [uc, y1 - 0.02, 0.03]);
  const slats = 30;
  for (let i = 0; i < slats; i++) {
    const v = y0 + 0.03 + (i * (ht - 0.08)) / (slats - 1);
    k.box(M.blind, [wd - 0.05, 0.0016, 0.026], [uc, v, 0.03], [0.62, 0, 0]);
  }
  for (const du of [-0.55, 0.55]) k.cyl(M.blind, 0.0015, ht - 0.06, [uc + du, vc, 0.03], undefined, 5);
  // mermer denizlik
  k.box(M.marble, [wd + 0.12, 0.03, 0.22], [uc, y0 - 0.015, 0.05]);
  // panel radyatör (pencere altı)
  const rw = 1.2;
  k.rbox(M.radiator, [rw, 0.6, 0.075], [uc, 0.47, 0.075], 0.008);
  for (let i = 0; i < 30; i++) k.box(M.radiator, [0.012, 0.54, 0.008], [uc - rw / 2 + 0.03 + i * ((rw - 0.06) / 29), 0.47, 0.115]);
  k.box(M.steelDark, [rw - 0.02, 0.006, 0.06], [uc, 0.772, 0.075]);
  for (const du of [-rw / 2 + 0.06, rw / 2 - 0.06]) k.cyl(M.radiator, 0.009, 0.17, [uc + du, 0.085, 0.075], undefined, 8);
  k.cyl(M.plasticLight, 0.02, 0.05, [uc + rw / 2 + 0.03, 0.7, 0.075], [0, 0, HALF], 10);
}

/** Lavabo: fayans arkalık, seramik hazne + ayak, batarya, sabunluk, kağıt havluluk, el hijyeni afişi. */
function wallSink(k: Kit, M: PolyMats, u: number) {
  k.quad(M.tile, 0.9, 1.0, [u, 1.22, 0.003], undefined, 0.4);
  k.rbox(M.ceramic, [0.5, 0.15, 0.4], [u, 0.8, 0.2], 0.03);
  k.add(M.ceramicShade, cylGeo(0.17, 0.008), [u, 0.8765, 0.215], undefined, [1, 1, 0.78]);
  k.cyl(M.chrome, 0.018, 0.006, [u, 0.881, 0.215], undefined, 10);
  k.box(M.ceramic, [0.17, 0.725, 0.15], [u, 0.3625, 0.11]);
  k.cyl(M.chrome, 0.013, 0.13, [u, 0.94, 0.05], undefined, 10);
  k.cyl(M.chrome, 0.011, 0.14, [u, 1.0, 0.115], [HALF, 0, 0], 10);
  k.box(M.chrome, [0.012, 0.012, 0.07], [u + 0.035, 0.96, 0.06]);
  // sabunluk + kağıt havluluk
  k.rbox(M.plasticLight, [0.09, 0.2, 0.09], [u - 0.3, 1.28, 0.045], 0.012);
  k.box(M.glassSolid, [0.05, 0.09, 0.012], [u - 0.3, 1.27, 0.092]);
  k.rbox(M.plasticLight, [0.28, 0.36, 0.11], [u + 0.3, 1.42, 0.055], 0.012);
  k.box(M.paper, [0.2, 0.05, 0.004], [u + 0.3, 1.235, 0.06]);
  // el hijyeni afişi (fayans üstü)
  k.box(M.epoxy, [0.4, 0.54, 0.008], [u, 2.06, 0.004]);
  k.quad(M.hygiene, 0.37, 0.51, [u, 2.06, 0.0095]);
}

// ── Mobilya (yerel: zemin y=0, merkez verilen nokta) ──────────

/** Muayene sedyesi — döşemeli şilte, kağıt örtü + rulo, boyalı çelik şasi, yastık. */
function examCouch(k: Kit, M: PolyMats) {
  const { w, l, top } = COUCH;
  const th = 0.085;
  k.rbox(M.vinyl, [w, th, l], [0, top - th / 2, 0], 0.028);
  k.box(M.paper, [w - 0.2, 0.003, l - 0.05], [0, top + 0.0015, 0]);
  k.box(M.epoxy, [w - 0.06, 0.035, l - 0.08], [0, top - th - 0.0175, 0]);
  const legH = top - th - 0.035;
  const lx = w / 2 - 0.07;
  const lz = l / 2 - 0.14;
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      k.cyl(M.epoxy, 0.019, legH, [sx * lx, legH / 2, sz * lz]);
      k.cyl(M.rubber, 0.024, 0.03, [sx * lx, 0.015, sz * lz], undefined, 12);
    }
    k.cyl(M.epoxy, 0.012, 2 * lz, [sx * lx, 0.2, 0], [HALF, 0, 0], 10);
  }
  for (const sz of [-1, 1]) k.cyl(M.epoxy, 0.012, 2 * lx, [0, 0.2, sz * lz], [0, 0, HALF], 10);
  // kağıt rulosu (baş ucu, şilte altı)
  k.cyl(M.paper, 0.055, 0.5, [0, top - th - 0.1, -l / 2 + 0.03], [0, 0, HALF], 20);
  k.cyl(M.steel, 0.007, 0.6, [0, top - th - 0.1, -l / 2 + 0.03], [0, 0, HALF], 8);
  // yastık — baş kemiğinin altı (ölçüm: layout.PILLOW_DZ)
  k.rbox(M.pillow, [0.5, 0.14, 0.33], [0, top + 0.07, PILLOW_DZ], 0.05);
}

/** Tekerlekli serum askısı — 5 ayak, iki kademeli boru, 4 kancalı tepe. */
function ivPole(k: Kit, M: PolyMats) {
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * PI) / 5 + 0.3;
    k.box(M.steelDark, [0.27, 0.022, 0.032], [Math.cos(a) * 0.135, 0.062, Math.sin(a) * 0.135], [0, -a, 0]);
    k.ball(M.rubber, 0.024, [Math.cos(a) * 0.26, 0.024, Math.sin(a) * 0.26]);
  }
  k.cyl(M.steelDark, 0.03, 0.05, [0, 0.085, 0], undefined, 12);
  k.cyl(M.steel, 0.014, 1.0, [0, 0.59, 0], undefined, 12);
  k.cyl(M.plasticDark, 0.021, 0.05, [0, 1.09, 0], undefined, 12);
  const upper = IV_HOOK_Y - 1.09;
  k.cyl(M.chrome, 0.0095, upper, [0, 1.09 + upper / 2, 0], undefined, 10);
  // 4 kancalı tepe — j=0 kolu oda-yerel +X'e (sedyeye) uzanır
  for (let j = 0; j < 4; j++) {
    const a = (j * PI) / 2;
    k.box(M.chrome, [0.2, 0.008, 0.008], [Math.cos(a) * 0.1, IV_HOOK_Y - 0.004, Math.sin(a) * 0.1], [0, -a, 0]);
    k.cyl(M.chrome, 0.004, 0.035, [Math.cos(a) * 0.2, IV_HOOK_Y - 0.02, Math.sin(a) * 0.2], undefined, 6);
  }
}

/** Taşınabilir oksijen tüpü — arabalı; regülatör + akış ölçer + nemlendirici şişe. */
function oxygenCylinder(k: Kit, M: PolyMats) {
  k.box(M.steelDark, [0.26, 0.02, 0.26], [0, 0.07, 0]);
  for (const sx of [-1, 1]) {
    k.cyl(M.rubber, 0.055, 0.03, [sx * 0.15, 0.055, -0.08], [0, 0, HALF], 16);
    k.cyl(M.steelDark, 0.009, 0.98, [sx * 0.09, 0.56, -0.12], undefined, 8);
  }
  k.cyl(M.steelDark, 0.009, 0.2, [0, 1.05, -0.12], [0, 0, HALF], 8);
  k.cyl(M.o2Body, 0.07, 0.62, [0, 0.39, 0], undefined, 24);
  k.ball(M.o2White, 0.07, [0, 0.7, 0], [1, 0.75, 1]);
  k.cyl(M.o2White, 0.028, 0.06, [0, 0.77, 0], undefined, 12);
  k.box(M.brass, [0.05, 0.06, 0.05], [0, 0.83, 0]);
  k.cyl(M.steel, 0.034, 0.05, [0.05, 0.84, 0], [0, 0, HALF], 16);
  k.cyl(M.plasticLight, 0.03, 0.02, [0.06, 0.845, 0.04], [HALF, 0, 0], 16);
  k.cyl(M.glassSolid, 0.012, 0.12, [0.1, 0.93, 0], undefined, 10);
  k.cyl(M.glassSolid, 0.032, 0.1, [0.1, 0.81, 0.02], undefined, 14);
  k.cyl(M.boxTeal, 0.034, 0.02, [0.1, 0.87, 0.02], undefined, 14);
}

/** Pansuman arabası — 2 raflı paslanmaz; üstte böbrek küvet, eldiven, antiseptik; altta EKG cihazı. */
function dressingTrolley(k: Kit, M: PolyMats) {
  const sx = 0.19;
  const sz = 0.29;
  for (const x of [-sx, sx]) {
    for (const z of [-sz, sz]) {
      k.cyl(M.steel, 0.011, 0.8, [x, 0.45, z], undefined, 10);
      k.ball(M.rubber, 0.028, [x, 0.028, z]);
    }
  }
  for (const y of [0.3, 0.84]) {
    k.box(M.steel, [0.42, 0.012, 0.62], [0, y, 0]);
    for (const z of [-0.305, 0.305]) k.box(M.steel, [0.42, 0.028, 0.008], [0, y + 0.02, z]);
    for (const x of [-0.205, 0.205]) k.box(M.steel, [0.008, 0.028, 0.62], [x, y + 0.02, 0]);
  }
  k.add(M.steel, cylGeo(0.075, 0.03, 0.062), [0.02, 0.862, -0.17], undefined, [1.35, 1, 1]);
  k.box(M.boxBlue, [0.12, 0.07, 0.22], [-0.11, 0.882, 0.13]);
  k.box(M.paper, [0.05, 0.004, 0.1], [-0.11, 0.919, 0.13]);
  k.cyl(M.amber, 0.028, 0.12, [0.1, 0.907, 0.2], undefined, 14);
  k.cyl(M.plasticLight, 0.02, 0.025, [0.1, 0.98, 0.2], undefined, 12);
  k.cyl(M.steel, 0.045, 0.09, [0.1, 0.892, 0.04], undefined, 16);
  k.cyl(M.steel, [0.02, 0.047], 0.02, [0.1, 0.947, 0.04], undefined, 16);
  // EKG cihazı (alt raf)
  k.rbox(M.device, [0.3, 0.1, 0.36], [0, 0.362, 0], 0.015);
  k.box(M.plasticDark, [0.16, 0.003, 0.11], [0.02, 0.4135, -0.08]);
  k.box(M.boxTeal, [0.05, 0.004, 0.03], [-0.09, 0.414, 0.1]);
}

/** Sedye basamağı. */
function stepStool(k: Kit, M: PolyMats) {
  k.rbox(M.rubber, [0.26, 0.02, 0.42], [0, 0.2, 0], 0.008);
  k.box(M.steel, [0.25, 0.012, 0.41], [0, 0.186, 0]);
  for (const x of [-0.11, 0.11]) for (const z of [-0.19, 0.19]) k.cyl(M.steel, 0.011, 0.18, [x, 0.09, z], undefined, 8);
}

/** Paravan — 3 kanatlı, tekerlekli, kumaş gergili (zikzak). */
function privacyScreen(k: Kit, M: PolyMats) {
  const pw = 0.62;
  const tilt = 0.36;
  const step = pw * Math.cos(tilt);
  [-1, 0, 1].forEach((i) => {
    const rot = i === 0 ? -tilt : tilt;
    const p = k.at([i * step, 0, 0], rot);
    for (const x of [-pw / 2, pw / 2]) {
      p.cyl(M.steel, 0.011, 1.7, [x, 0.9, 0], undefined, 10);
      p.box(M.steelDark, [0.04, 0.02, 0.34], [x, 0.045, 0]);
      for (const z of [-0.15, 0.15]) p.ball(M.rubber, 0.02, [x, 0.02, z]);
    }
    for (const y of [0.3, 1.74]) p.cyl(M.steel, 0.009, pw, [0, y, 0], [0, 0, HALF], 8);
    p.quad(M.screenFabric, pw - 0.04, 1.4, [0, 1.02, 0]);
  });
}

/** Hekim masası — meşe tabla, çekmeceli keson; üstünde bilgisayar, telefon, evrak, kolonya, mendil, masa bayrağı. */
function doctorDesk(k: Kit, M: PolyMats) {
  const top = 0.745;
  k.box(M.wood, [1.5, 0.03, 0.75], [0, top, 0]);
  for (const x of [-0.72, 0.72]) k.box(M.lam, [0.03, 0.73, 0.7], [x, 0.365, 0]);
  k.box(M.lam, [1.41, 0.42, 0.018], [0, 0.5, 0.33]);
  // keson (hekimin sağı = batı) — çekmece önleri hekime (kuzeye) bakar
  k.box(M.lam, [0.42, 0.6, 0.6], [-0.49, 0.43, -0.02]);
  for (const y of [0.63, 0.45, 0.27]) {
    k.box(M.wood, [0.4, 0.165, 0.012], [-0.49, y, -0.326]);
    k.box(M.chrome, [0.12, 0.012, 0.012], [-0.49, y + 0.03, -0.338]);
  }
  const t = top + 0.015;
  // monitör — ekran hekime (kuzey, −Z) bakar
  k.cyl(M.plasticDark, 0.1, 0.012, [0.18, t + 0.006, 0.1], undefined, 20);
  k.box(M.plasticDark, [0.045, 0.16, 0.03], [0.18, t + 0.09, 0.115]);
  k.rbox(M.plasticDark, [0.56, 0.34, 0.03], [0.18, t + 0.26, 0.1], 0.008);
  k.quad(M.screen, 0.52, 0.3, [0.18, t + 0.262, 0.084], [0, PI, 0]);
  k.box(M.plasticDark, [0.42, 0.018, 0.13], [0.18, t + 0.009, -0.17]);
  k.rbox(M.plasticDark, [0.06, 0.03, 0.1], [0.5, t + 0.015, -0.17], 0.012);
  // telefon
  k.box(M.plasticDark, [0.16, 0.045, 0.2], [-0.5, t + 0.022, 0.14], [0.12, 0, 0]);
  k.rbox(M.plasticDark, [0.05, 0.035, 0.19], [-0.555, t + 0.062, 0.14], 0.012);
  // evrak + reçete bloğu + kalemlik
  k.box(M.paper, [0.21, 0.012, 0.297], [-0.2, t + 0.006, -0.1], [0, 0.18, 0]);
  k.box(M.paper, [0.148, 0.02, 0.21], [-0.18, t + 0.022, -0.09], [0, -0.1, 0]);
  k.cyl(M.plasticDark, 0.035, 0.1, [-0.45, t + 0.05, -0.2], undefined, 14);
  [M.boxBlue, M.red, M.plasticDark].forEach((mat, i) =>
    k.cyl(mat, 0.004, 0.14, [-0.46 + i * 0.012, t + 0.11, -0.2 + i * 0.008], [0.12, 0, 0.1 * (i - 1)], 6),
  );
  // kolonya + kağıt mendil
  k.cyl(M.kolonya, 0.03, 0.14, [0.6, t + 0.07, 0.22], undefined, 14);
  k.cyl(M.brass, 0.014, 0.03, [0.6, t + 0.155, 0.22], undefined, 10);
  k.rbox(M.boxTeal, [0.23, 0.08, 0.12], [0.56, t + 0.04, 0.0], 0.01);
  k.box(M.paper, [0.08, 0.035, 0.03], [0.56, t + 0.09, 0.0]);
  // masa bayrağı
  k.cyl(M.brass, 0.03, 0.012, [-0.64, t + 0.006, 0.27], undefined, 14);
  k.cyl(M.chrome, 0.004, 0.3, [-0.64, t + 0.15, 0.27], undefined, 6);
  k.quad(M.flag, 0.15, 0.1, [-0.563, t + 0.24, 0.27]);
}

/** Hekim koltuğu — 5 ayaklı, amortisörlü, kolçaklı; +Z'ye (güneye) bakar. */
function officeChair(k: Kit, M: PolyMats) {
  for (let i = 0; i < 5; i++) {
    const a = (i * 2 * PI) / 5;
    k.box(M.plasticDark, [0.3, 0.03, 0.045], [Math.cos(a) * 0.15, 0.08, Math.sin(a) * 0.15], [0, -a, 0]);
    k.ball(M.rubber, 0.028, [Math.cos(a) * 0.29, 0.028, Math.sin(a) * 0.29]);
  }
  k.cyl(M.chrome, 0.024, 0.3, [0, 0.25, 0], undefined, 12);
  k.rbox(M.vinylBlack, [0.5, 0.09, 0.48], [0, 0.46, 0], 0.035);
  k.rbox(M.vinylBlack, [0.46, 0.56, 0.08], [0, 0.86, -0.25], 0.035, [-0.12, 0, 0]);
  k.box(M.plasticDark, [0.06, 0.3, 0.03], [0, 0.6, -0.26], [-0.12, 0, 0]);
  for (const x of [-0.27, 0.27]) {
    k.rbox(M.plasticDark, [0.05, 0.03, 0.28], [x, 0.67, -0.02], 0.012);
    k.box(M.plasticDark, [0.03, 0.2, 0.04], [x, 0.565, -0.06]);
  }
}

/** Hasta sandalyesi — çelik ayak, döşemeli oturak + sırtlık; +Z'ye bakar. */
function visitorChair(k: Kit, M: PolyMats) {
  for (const x of [-0.2, 0.2]) {
    k.cyl(M.steel, 0.011, 0.44, [x, 0.22, 0.19], undefined, 8);
    k.cyl(M.steel, 0.011, 0.9, [x, 0.45, -0.2], [-0.06, 0, 0], 8);
    k.cyl(M.steel, 0.009, 0.38, [x, 0.42, 0], [HALF, 0, 0], 8);
  }
  k.rbox(M.vinyl, [0.45, 0.06, 0.43], [0, 0.46, 0], 0.025);
  k.rbox(M.vinyl, [0.43, 0.3, 0.045], [0, 0.78, -0.215], 0.022, [-0.06, 0, 0]);
}

/** Camlı malzeme dolabı — ön yüz +X'e (odaya) bakar; üst bölüm camlı raflar, alt bölüm kapaklı. */
function supplyCabinet(k: Kit, g: Kit, M: PolyMats) {
  const d = 0.42;
  const wd = 0.85;
  const y0 = 0.08;
  const ht = 1.72;
  const yc = y0 + ht / 2;
  for (const x of [-0.17, 0.17]) for (const z of [-0.38, 0.38]) k.cyl(M.steelDark, 0.018, y0, [x, y0 / 2, z], undefined, 8);
  k.box(M.epoxy, [0.015, ht, wd], [-d / 2 + 0.0075, yc, 0]);
  for (const z of [-wd / 2 + 0.0075, wd / 2 - 0.0075]) k.box(M.epoxy, [d, ht, 0.015], [0, yc, z]);
  for (const y of [y0 + 0.0075, y0 + ht - 0.0075, y0 + 0.8]) k.box(M.epoxy, [d, 0.015, wd], [0, y, 0]);
  // alt kapaklar
  for (const z of [-0.21, 0.21]) {
    k.box(M.epoxy, [0.015, 0.78, 0.415], [d / 2 - 0.0075, y0 + 0.405, z]);
    k.box(M.chrome, [0.012, 0.1, 0.012], [d / 2 + 0.006, y0 + 0.66, z > 0 ? 0.04 : -0.04]);
  }
  // üst raflar + kapı çerçevesi
  for (const y of [y0 + 1.1, y0 + 1.4]) k.box(M.epoxy, [d - 0.04, 0.012, wd - 0.04], [-0.01, y, 0]);
  for (const z of [-wd / 2 + 0.02, 0, wd / 2 - 0.02]) k.box(M.epoxy, [0.016, 0.9, 0.035], [d / 2 - 0.008, y0 + 1.26, z]);
  g.quad(M.glass, wd - 0.04, 0.9, [d / 2 - 0.004, y0 + 1.26, 0], [0, HALF, 0]);
  // raf içi malzeme
  const stock: [PolyMats[keyof PolyMats], number, number, number, number][] = [
    [M.boxTeal, 0.82, -0.25, 0.2, 0.12],
    [M.boxWhite, 0.82, -0.02, 0.16, 0.16],
    [M.boxBlue, 0.82, 0.22, 0.22, 0.1],
    [M.boxWhite, 1.112, -0.22, 0.24, 0.09],
    [M.boxTeal, 1.112, 0.06, 0.14, 0.14],
    [M.boxBlue, 1.412, -0.18, 0.2, 0.12],
    [M.boxWhite, 1.412, 0.2, 0.18, 0.15],
  ];
  for (const [mat, y, z, bw, bh] of stock) k.box(mat, [0.2, bh, bw], [-0.02, y0 + y + bh / 2 - 0.006, z]);
  for (const z of [0.28, 0.34]) k.cyl(M.amber, 0.025, 0.11, [-0.02, y0 + 1.112 + 0.049, z], undefined, 12);
}

/** Boy-kilo ölçer — basamak, sütun, kadran, boy çubuğu. */
function heightScale(k: Kit, M: PolyMats) {
  k.rbox(M.plasticDark, [0.4, 0.05, 0.3], [0.04, 0.03, 0], 0.012);
  k.box(M.rubber, [0.32, 0.006, 0.26], [0.06, 0.058, 0]);
  k.box(M.epoxy, [0.035, 1.18, 0.045], [-0.12, 0.64, 0]);
  k.cyl(M.epoxy, 0.11, 0.06, [-0.1, 1.28, 0], [0, 0, HALF], 24);
  k.quad(M.gauge, 0.19, 0.19, [-0.069, 1.28, 0], [0, HALF, 0]);
  k.box(M.steel, [0.012, 0.86, 0.022], [-0.14, 1.66, 0]);
  k.box(M.steel, [0.17, 0.01, 0.03], [-0.06, 1.82, 0]);
}

/** Pedallı çöp kovası — kapak rengi atık türünü gösterir (kırmızı: tıbbi atık). */
function pedalBin(k: Kit, M: PolyMats, lid: PolyMats[keyof PolyMats]) {
  k.cyl(M.binGray, [0.14, 0.12], 0.38, [0, 0.19, 0], undefined, 20);
  k.cyl(lid, [0.135, 0.146], 0.03, [0, 0.395, 0], undefined, 20);
  k.box(M.plasticDark, [0.07, 0.012, 0.05], [0, 0.012, 0.15]);
}

// Silindir geometrisi (ölçeklenip elips yapılacak parçalar için ham).
function cylGeo(r: number, h: number, rBottom?: number) {
  return new CylinderGeometry(r, rBottom ?? r, h, 20);
}
