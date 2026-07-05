// ============================================================
// tubing — IV hattı / O₂ hortumu sarkma eğrisi (SAF, three'siz)
// ============================================================
// İki uç arasında catenary-benzeri sarkma: doğrusal enterpolasyon +
// parabolik sarkma terimi (4t(1-t) — catenary cosh'un görsel eşdeğeri,
// hasta hareketinde uç noktalar canlı güncellenir). Zemin altına inmesin
// diye y clamp'lenir. Saf fonksiyon → vitest ile doğrulanır; TubingLayer
// bunu her frame çağırıp TubeGeometry kurar.
// ============================================================

export type Vec3Tuple = [number, number, number];

export interface TubeCurveOpts {
  /** Nokta sayısı (uçlar dahil). Varsayılan 24. */
  segments?: number;
  /** Sarkma katsayısı — uç mesafesinin oranı (varsayılan 0.35). */
  sagRatio?: number;
  /** Maksimum sarkma (dünya birimi, varsayılan 0.28). */
  sagMax?: number;
  /** Zemin y — hortum bunun altına inmez (varsayılan yok). */
  floorY?: number;
}

/**
 * İki uç arasında sarkan hortum noktaları üretir.
 * Sarkma mesafeyle orantılı (gergin kısa hat az, uzun hat çok sarkar).
 */
export function buildTubePoints(
  start: Vec3Tuple,
  end: Vec3Tuple,
  opts: TubeCurveOpts = {},
): Vec3Tuple[] {
  const n = Math.max(2, opts.segments ?? 24);
  const sagRatio = opts.sagRatio ?? 0.35;
  const sagMax = opts.sagMax ?? 0.28;
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dz = end[2] - start[2];
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const sag = Math.min(sagMax, dist * sagRatio);

  const pts: Vec3Tuple[] = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let y = start[1] + dy * t - sag * 4 * t * (1 - t);
    if (opts.floorY !== undefined) y = Math.max(y, opts.floorY);
    pts.push([start[0] + dx * t, y, start[2] + dz * t]);
  }
  return pts;
}

/** Hangi ekipmanın hortumu var + sahnedeki sabit kaynak ucu (world). */
export interface TubeSpec {
  /** Sahnedeki hedef obje adı (AnimatedPatientModel equip_<kind>). */
  targetName: string;
  /** Sabit kaynak uç (IV askısı / duvar gaz paneli çıkışı) — world. */
  source: Vec3Tuple;
  /** Hortum rengi (hex). */
  color: number;
  /** Yarıçap (dünya birimi). */
  radius: number;
  /** Şeffaflık (IV hattı yarı saydam). */
  opacity?: number;
}
