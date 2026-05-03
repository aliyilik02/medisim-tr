/**
 * Deterministic seeded shuffle.
 * Aynı seed → aynı sıra. Aynı oturumda tutarlı, öğrenci ezberleyemez.
 *
 * Kullanım: karar adımı opsiyonlarını render etmeden önce karıştırmak için.
 * Senaryo yazıldığı sırada doğru cevap genelde 1. sırada bulunur — bu
 * "ilk şık her zaman doğru" pedagojik hilesini engeller.
 */
export function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  // String → 32-bit hash (djb2-benzeri)
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h) + seed.charCodeAt(i);
    h |= 0;
  }

  // LCG PRNG (Numerical Recipes sabitleri)
  let state = Math.abs(h) || 1;
  const rng = (): number => {
    state = (state * 1664525 + 1013904223) & 0x7fffffff;
    return state / 0x7fffffff;
  };

  // Fisher-Yates
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
