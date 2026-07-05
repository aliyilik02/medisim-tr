// ============================================================
// Hair Meshes — kemik-bağlı prosedürel saç (Hat B)
// ============================================================
// Hasta "kel" sorunu: animasyonlu GLB'lerde saç yok. Çözüm equipmentMeshes
// deseniyle aynı: mixamorigHead kemiğine bone.add() ile düşük-poly saç
// kapağı → animasyonu (öksürük/konuşma baş hareketi) otomatik takip eder.
// Kemik-local eksen (equipmentMeshes kalibrasyonundan): +Y kraniyal (tepe),
// +Z anterior (yüz). O₂ maskesi z≈9'da oturuyor → kafatası merkezi ~[0,4,1.5],
// yarıçap ~7.5 kemik-local birim.
//
// Varyant stilleri: kadın (uzun, ense örtülü), erkek (kısa), çocuk (kısa,
// açık kahve), yaşlı (gri, açılmış saç çizgisi). Mesh statik/rijit — saç
// fiziği yok (yatan hastada gereksiz), draw call varyant başına 1-3.
// ============================================================

import { Group, Mesh, MeshStandardMaterial, SphereGeometry } from "three";

export type HairStyle = "kisa" | "uzun" | "cocuk" | "yasli";

export interface HairSpec {
  style: HairStyle;
  /** Saç rengi (hex). */
  color: number;
  /** Kapak yarıçap ölçeği (kafatası ~7.5 birim tabanına çarpan). */
  radius: number;
  /** Saç çizgisi: kapağın öne uzanma açısı (rad, phi start). Büyük = açılmış alın. */
  hairlinePhi: number;
  /** Ense uzantısı (kadın): arkaya sarkan hacim eklensin mi. */
  napeVolume: boolean;
  /** Hafif incelme (yaşlı): opaklık/pürüz artışı yerine daha küçük, yüksek kapak. */
  thinning?: boolean;
}

export const HAIR_BY_VARIANT: Record<string, HairSpec> = {
  "female-adult": {
    style: "uzun",
    color: 0x3a2a1e, // koyu kahve
    radius: 1.04,
    hairlinePhi: 0.32,
    napeVolume: true,
  },
  "male-adult": {
    style: "kisa",
    color: 0x241a12, // çok koyu kahve
    radius: 1.02,
    hairlinePhi: 0.38,
    napeVolume: false,
  },
  child: {
    style: "cocuk",
    color: 0x5a3d24, // açık kahve
    radius: 1.03,
    hairlinePhi: 0.3,
    napeVolume: false,
  },
  elderly: {
    style: "yasli",
    color: 0x9a9aa0, // gri
    radius: 1.0,
    hairlinePhi: 0.52, // açılmış saç çizgisi
    napeVolume: false,
    thinning: true,
  },
};

/** Saç kemiği + bone-local yerleşim (equipmentMeshes kalibrasyon ekseni). */
export const HAIR_BONE = {
  bone: "mixamorigHead",
  /** SAYISAL kalibrasyon (6 Tem __faceCalib probu — göz kararı değil):
      Head-local kafa bbox X ±9.18 / Y tepe 22.84 / Z -9.11..14.12.
      Eski r=7.6 tamamen kafa İÇİNDEYDİ ("saçlar olmamış" bulgusu).
      Merkez (0,12,1.5) + r=10.6 → tepe 22.6 scalp'e oturur, yanlar ±9.2'yi
      1.4 birim aşar (saç hacmi). */
  offset: [0, 11.6, 2.6] as [number, number, number], // hafif öne — alın hattı doğallaşır
  baseRadius: 10.6,
};

/** Varyant için saç grubu üret. Bilinmeyen varyant → null (saçsız degrade). */
export function buildHair(variant: string): Group | null {
  const spec = HAIR_BY_VARIANT[variant];
  if (!spec) return null;

  const g = new Group();
  g.name = `hair-${spec.style}`;

  const mat = new MeshStandardMaterial({
    color: spec.color,
    roughness: 0.85, // mat saç — spekülar plastik görünmesin
    metalness: 0.0,
  });

  const r = HAIR_BONE.baseRadius * spec.radius;

  // Ana kapak: küre dilimi — tepe + arka + yanları örter, yüzü açık bırakır.
  // phiStart/phiLength yerine thetaLength ile üst yarıyı al, sonra öne doğru
  // hairlinePhi kadar kes (rotasyonla alın hattı ayarlanır).
  // thetaLength ≤ 0.5π: kapak kenarı ekvatorda (kulak üstü hattı) biter —
  // 0.58π kenarı çene/boyun hizasına indirip yanlarda siyah dilim
  // (favori-yaması) çıkarıyordu (paket 3 screenshot bulgusu).
  const capTheta = Math.PI * (spec.thinning ? 0.44 : 0.5);
  const cap = new Mesh(
    new SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, capTheta),
    mat
  );
  // Alın hattı: kapağı hafif ARKAYA yatır — ön kenar saç çizgisine çekilir.
  cap.rotation.x = -spec.hairlinePhi;
  cap.position.set(0, 0, 0);
  g.add(cap);

  // Ense hacmi (uzun saç): arkaya-aşağı ikinci dilim — yastığa yayılan saç hissi.
  if (spec.napeVolume) {
    const nape = new Mesh(
      new SphereGeometry(r * 0.92, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5),
      mat
    );
    nape.rotation.x = -Math.PI * 0.55; // arkaya dönük
    nape.position.set(0, -2.2, -3.4);
    nape.scale.set(1.0, 1.15, 0.8);
    g.add(nape);
  }

  g.position.set(...HAIR_BONE.offset);
  return g;
}
