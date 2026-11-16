// ============================================================
// roomKit — prosedürel oda parçalarını MALZEME BAŞINA TEK MESH'te toplar
// ============================================================
// Kutu/silindir/küre/düzlem parçaları dünya dönüşümüyle "fırınlanır" ve
// aynı malzemeyi kullananlar tek BufferGeometry'de birleştirilir → yüzlerce
// parça = malzeme sayısı kadar çizim çağrısı (draw call). React'siz, saf
// three — sahne bileşeni bunu bir kez (useMemo) çağırıp <primitive> basar.
// ============================================================

import {
  BoxGeometry,
  CylinderGeometry,
  Euler,
  Group,
  Matrix4,
  Mesh,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
  type BufferGeometry,
  type Material,
} from "three";
import { RoundedBoxGeometry, mergeBufferGeometries } from "three-stdlib";
import type { V3 } from "./layout";

const ONE = new Vector3(1, 1, 1);

function compose(pos: V3, rot?: V3, scale?: V3): Matrix4 {
  return new Matrix4().compose(
    new Vector3(pos[0], pos[1], pos[2]),
    new Quaternion().setFromEuler(new Euler(rot?.[0] ?? 0, rot?.[1] ?? 0, rot?.[2] ?? 0)),
    scale ? new Vector3(scale[0], scale[1], scale[2]) : ONE,
  );
}

export interface BuildOpts {
  /** Gölge düşürsün mü (mobilya: evet, duvar/tavan: hayır). */
  cast?: boolean;
  /** Gölge alsın mı (varsayılan evet). */
  receive?: boolean;
  name?: string;
}

export class Kit {
  private readonly base: Matrix4;
  private readonly buckets: Map<Material, BufferGeometry[]>;

  constructor(base: Matrix4 = new Matrix4(), buckets: Map<Material, BufferGeometry[]> = new Map()) {
    this.base = base;
    this.buckets = buckets;
  }

  /** Yerel çerçeve: aynı kovaları paylaşan, konum + Y dönüşü eklenmiş alt kit. */
  at(pos: V3, rotY = 0): Kit {
    return new Kit(this.base.clone().multiply(compose(pos, [0, rotY, 0])), this.buckets);
  }

  /** Ham geometri ekle (dönüşüm fırınlanır; geometri kit'e devredilir). */
  add(mat: Material, geo: BufferGeometry, pos: V3, rot?: V3, scale?: V3): this {
    // Yuvarlak kutu indekssiz gelir → birleştirme için hepsi indekssiz yapılır.
    const g = geo.index ? geo.toNonIndexed() : geo;
    if (g !== geo) geo.dispose();
    g.applyMatrix4(new Matrix4().multiplyMatrices(this.base, compose(pos, rot, scale)));
    const list = this.buckets.get(mat);
    if (list) list.push(g);
    else this.buckets.set(mat, [g]);
    return this;
  }

  /** Kutu — size [x, y, z], pos merkez. */
  box(mat: Material, size: V3, pos: V3, rot?: V3): this {
    return this.add(mat, new BoxGeometry(size[0], size[1], size[2]), pos, rot);
  }

  /** Köşesi yuvarlak kutu (şilte, yastık, koltuk — kenar ışık yakalar). */
  rbox(mat: Material, size: V3, pos: V3, radius = 0.02, rot?: V3): this {
    const r = Math.min(radius, Math.min(size[0], size[1], size[2]) / 2 - 1e-4);
    return this.add(mat, new RoundedBoxGeometry(size[0], size[1], size[2], 3, r), pos, rot);
  }

  /** Silindir — r tek sayı ya da [üst, alt]; eksen Y (yatay için rot ver). */
  cyl(mat: Material, r: number | [number, number], h: number, pos: V3, rot?: V3, seg = 16): this {
    const [rt, rb] = typeof r === "number" ? [r, r] : r;
    return this.add(mat, new CylinderGeometry(rt, rb, h, seg), pos, rot);
  }

  /** Küre (scale ile basık/uzun yapılabilir). */
  ball(mat: Material, r: number, pos: V3, scale?: V3): this {
    return this.add(mat, new SphereGeometry(r, 16, 12), pos, undefined, scale);
  }

  /** Tek yüzlü düzlem — dönüşsüz +Z'ye bakar. `tile` verilirse doku her
   *  `tile` metrede bir tekrarlar (dünya ölçekli UV). */
  quad(mat: Material, w: number, h: number, pos: V3, rot?: V3, tile?: number | [number, number]): this {
    const g = new PlaneGeometry(w, h);
    if (tile !== undefined) {
      const [tu, tv] = typeof tile === "number" ? [tile, tile] : tile;
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (w / tu), uv.getY(i) * (h / tv));
    }
    return this.add(mat, g, pos, rot);
  }

  /** Kovaları malzeme başına tek mesh olarak birleştirir. */
  build(opts: BuildOpts = {}): Group {
    const group = new Group();
    if (opts.name) group.name = opts.name;
    for (const [mat, geos] of this.buckets) {
      const merged = mergeBufferGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (!merged) continue;
      const mesh = new Mesh(merged, mat);
      mesh.castShadow = opts.cast ?? false;
      mesh.receiveShadow = opts.receive ?? true;
      group.add(mesh);
    }
    this.buckets.clear();
    return group;
  }
}
