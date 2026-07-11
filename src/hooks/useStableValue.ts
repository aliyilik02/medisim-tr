// ============================================================
// useStableValue — değer-eşitse ESKİ referansı koru (R4, 11 Tem)
// ============================================================
// useVitalsTick her tick yeni session objesi yazar → ondan türetilen
// useMemo'lar (visualState, agitation) her tick YENİ kimlikli obje üretir,
// içerik aynı olsa bile. memo'lu görsel katman bu yüzden tick başına
// re-render oluyordu. Bu hook sığ-eşitlikte önceki referansı döndürür —
// phaseSignalsEqual guard'ının genel hali.
// ============================================================

import { useRef } from "react";

/** Sığ eşitlik: aynı anahtar seti + Object.is değerler. Düz obje için. */
export function shallowEqual<T extends object>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  const ra = a as Record<string, unknown>;
  const rb = b as Record<string, unknown>;
  const ka = Object.keys(ra);
  const kb = Object.keys(rb);
  if (ka.length !== kb.length) return false;
  for (const k of ka) {
    if (!Object.is(ra[k], rb[k])) return false;
  }
  return true;
}

/**
 * Yeni değer öncekine eşitse (varsayılan: sığ) önceki REFERANSI döndürür.
 * Böylece memo/useMemo/useEffect bağımlılıkları içerik değişmedikçe tetiklenmez.
 */
export function useStableValue<T extends object>(
  value: T,
  equal: (a: T, b: T) => boolean = shallowEqual,
): T {
  const ref = useRef(value);
  if (!equal(ref.current, value)) {
    ref.current = value;
  }
  return ref.current;
}
