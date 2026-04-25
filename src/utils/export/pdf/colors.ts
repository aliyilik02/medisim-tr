export type RGB = [number, number, number];

// Specialty'ye göre PDF header/footer accent rengi
export function specialtyAccent(specialty: string): RGB {
  const map: Record<string, RGB> = {
    kardiyoloji:   [15,  118, 110],  // teal (brand)
    acil:          [220,  38,  38],  // kırmızı
    dahiliye:      [8,  145, 178],   // cam göbeği
    pediatri:      [234, 88,  12],   // turuncu
    cerrahi:       [107, 114, 128],  // nötr gri
    anestezi:      [88,  28, 135],   // mor
    kadin_dogum:   [168,  85, 247],  // lavanta-mor
    hemsirelik:    [22,  163,  74],  // yeşil
    askeri_tccc:   [101, 163,  13],  // askeri yeşil
  };
  return map[specialty] ?? [15, 118, 110];
}

export const C = {
  teal:       [15,  118, 110] as RGB,   // #0f766e brand accent
  tealDark:   [10,   79,  73] as RGB,
  inkDark:    [26,   29,  31] as RGB,   // #1a1d1f
  inkMid:     [107, 114, 128] as RGB,   // #6b7280
  inkLight:   [156, 163, 175] as RGB,   // #9ca3af
  white:      [255, 255, 255] as RGB,
  gridLine:   [229, 231, 235] as RGB,   // #e5e7eb
  bgStripe:   [248, 250, 252] as RGB,   // #f8fafc
  gradeA:     [5,   150, 105] as RGB,   // #059669
  gradeB:     [8,   145, 178] as RGB,   // #0891b2
  gradeC:     [202, 138,   4] as RGB,   // #ca8a04
  gradeD:     [234,  88,  12] as RGB,   // #ea580c
  gradeF:     [220,  38,  38] as RGB,   // #dc2626
  critical:   [185,  28,  28] as RGB,   // #b91c1c
  criticalBg: [254, 242, 242] as RGB,
  stableBg:   [236, 253, 245] as RGB,
} as const;

export function gradeColor(grade: string): RGB {
  const map: Record<string, RGB> = {
    A: C.gradeA, B: C.gradeB, C: C.gradeC, D: C.gradeD, F: C.gradeF,
  };
  return map[grade] ?? C.inkMid;
}

export function gradeBgColor(grade: string): RGB {
  return grade === "A" ? C.stableBg
       : grade === "B" ? [239, 250, 253] as RGB
       : grade === "C" ? [254, 252, 232] as RGB
       : grade === "D" ? [255, 247, 237] as RGB
       :                 C.criticalBg;
}
