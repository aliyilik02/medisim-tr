// ============================================================
// Face Meshes — kemik-bağlı prosedürel göz + kaş (Hat B2 insanlaştırma)
// ============================================================
// Ali Bey bulgusu (6 Tem): "hastanın gözleri yok" — yatak modelleri
// dokusuz (tek düz Skin materyali), göz çukurları boş. Yüz mesh'inde
// ARKit blink morph'ları VAR (kapaklar kapanıyor) → çukur içine oturan
// prosedürel göz küreleri doğru yaklaşım: kırpmada kapaklar örter.
// hairMeshes/equipmentMeshes deseniyle aynı: mixamorigHead'e bone.add().
// Konumlar kemik-local eksende screenshot ile kalibre edilir
// (equipmentMeshes kalibrasyon ekseni: +Y kraniyal, +Z anterior).
// Kalıcı çözüm: Blender/MPFB2 varlık ekleme turu (yol haritasında).
// ============================================================

import {
  Group,
  Mesh,
  MeshStandardMaterial,
  SphereGeometry,
  CylinderGeometry,
  BoxGeometry,
} from "three";

// Paylaşımlı materyaller (modül tekil — draw state tekrarı yok)
const MAT_SCLERA = new MeshStandardMaterial({
  color: 0xf2efe9, // hafif kırık beyaz — kar beyazı ürkütücü durur
  roughness: 0.25,
});
const MAT_IRIS = new MeshStandardMaterial({ color: 0x5b4630, roughness: 0.35 }); // koyu ela
const MAT_PUPIL = new MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.3 });
const MAT_BROW = new MeshStandardMaterial({ color: 0x2a2019, roughness: 0.9 });

export interface FaceSpec {
  /** Göz merkezi kemik-local konum (sağ göz; sol X aynalanır). */
  eye: [number, number, number];
  /** Göz küresi yarıçapı (kemik-local birim). */
  eyeRadius: number;
  /** Kaş merkez konumu (sağ; sol aynalanır). */
  brow: [number, number, number];
  /** Kaş uzunluğu. */
  browLen: number;
}

/** Yüz yerleşimi — SAYISAL kalibrasyon (6 Tem __faceCalib probu):
    Head-kemik-local kafa bbox: X ±9.18, Y -2.96..22.84 (tepe), Z -9.11..14.12
    (burun ucu). Göz hizası ≈ tepe-oranıyla y≈12.5, göz yüzeyi z≈11.5 (çukur
    merkezi 10.6); interpupiller ≈ genişliğin %34'ü → x ±3.1; göz r≈1.55
    (1 birim ≈ 8mm). Tüm varyantlar aynı MakeHuman tabanı → tek spec. */
const FACE_DEFAULT: FaceSpec = {
  eye: [3.1, 12.5, 10.6],
  eyeRadius: 1.55,
  brow: [3.3, 15.2, 11.6],
  browLen: 4.4,
};
export const FACE_BY_VARIANT: Record<string, FaceSpec> = {
  "female-adult": FACE_DEFAULT,
  "male-adult": FACE_DEFAULT,
  child: { ...FACE_DEFAULT, eyeRadius: 1.45, browLen: 3.6 },
  elderly: FACE_DEFAULT,
};

function buildEye(spec: FaceSpec, side: 1 | -1): Group {
  const g = new Group();
  const r = spec.eyeRadius;
  // Sklera — tam küre (çukur içinde, kapak morph'u önünü örtebilir)
  const sclera = new Mesh(new SphereGeometry(r, 20, 14), MAT_SCLERA);
  g.add(sclera);
  // İris — öne bakan basık disk (küre yüzeyine oturur)
  const iris = new Mesh(new CylinderGeometry(r * 0.48, r * 0.48, r * 0.08, 20), MAT_IRIS);
  iris.rotation.x = Math.PI / 2;
  iris.position.z = r * 0.92;
  g.add(iris);
  // Pupilla
  const pupil = new Mesh(new CylinderGeometry(r * 0.22, r * 0.22, r * 0.1, 16), MAT_PUPIL);
  pupil.rotation.x = Math.PI / 2;
  pupil.position.z = r * 0.95;
  g.add(pupil);
  g.position.set(spec.eye[0] * side, spec.eye[1], spec.eye[2]);
  return g;
}

function buildBrow(spec: FaceSpec, side: 1 | -1): Mesh {
  const brow = new Mesh(new BoxGeometry(spec.browLen, 0.32, 0.35), MAT_BROW);
  brow.position.set(spec.brow[0] * side, spec.brow[1], spec.brow[2]);
  // hafif eğim — dış uç yukarı (doğal kaş açısı); yanlarda kafaya doğru kıvrım
  brow.rotation.z = side * -0.12;
  brow.rotation.y = side * 0.35;
  return brow;
}

/** Varyant için göz+kaş grubu. Bilinmeyen varyant → null (degrade). */
export function buildFace(variant: string): Group | null {
  const spec = FACE_BY_VARIANT[variant];
  if (!spec) return null;
  const g = new Group();
  g.name = `face-${variant}`;
  g.add(buildEye(spec, 1), buildEye(spec, -1), buildBrow(spec, 1), buildBrow(spec, -1));
  return g;
}

export const FACE_BONE = "mixamorigHead";
