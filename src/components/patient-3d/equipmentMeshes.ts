// ============================================================
// Equipment Meshes — supine hasta için kemik-bağlı ekipman primitifleri
// ============================================================
// Animasyonlu hasta (Mixamo iskelet) kemiklerine eklenen basit ekipman
// objeleri. bone.add() ile eklenir → kemiğin world transformunu (animasyon
// dahil) miras alır, hasta hareket edince ekipman da hareket eder.
// Ölçü/offset bone-LOCAL (native model birimi); wrapper bedScale ile birlikte
// ölçeklenir → çocukta küçük ekipman. EQUIPMENT_BONE ile kemik+offset eşlenir.
// ============================================================

import {
  Group,
  Mesh,
  MeshStandardMaterial,
  BoxGeometry,
  CylinderGeometry,
  SphereGeometry,
  TorusGeometry,
  type MeshStandardMaterialParameters,
  type BufferGeometry,
} from "three";

export type EquipmentKind =
  | "oxygen_mask"
  | "nasal_cannula"
  | "pulse_ox"
  | "iv_cannula"
  | "nibp_cuff"
  | "ekg_electrodes";

export const EQUIPMENT_LABELS: Record<EquipmentKind, string> = {
  oxygen_mask: "O₂ Maske",
  nasal_cannula: "Nazal Kanül",
  pulse_ox: "Pulse-Ox",
  iv_cannula: "IV Kanül",
  nibp_cuff: "Tansiyon Kafı",
  ekg_electrodes: "EKG",
};

/**
 * kind → hangi kemiğe + bone-local offset/rotation/scale.
 * Supine `laying_idle` pozunda /faz2-demo'da Playwright screenshot iterasyonu ile
 * kalibre (kollar göğüste katlı). Bone-local eksen yönleri (matrixWorld basis,
 * worldScale ~0.0062) ölçülerek anatomik olarak yerleştirildi:
 *  - Head:    local +Y → kraniyal (baş tepesi), local +Z → anterior (yüz/tavan, world +Y).
 *  - Spine2:  local +Y → kraniyal (göğüs üst), local +Z → anterior (göğüs yüzeyi).
 *  - ForeArm: local +Y → dorsal yüzey (world +Y, kolun üstü); +Z gömer (terk).
 *  - LeftArm: local +Y → omuzdan dirseğe (pazıyı aşağı tarar) → cuff'ı bicep'e oturtur.
 * Bone-local birim; wrapper bedScale ile ölçeklenir → çocukta orantılı küçülür.
 */
export const EQUIPMENT_BONE: Record<
  EquipmentKind,
  { bone: string; offset: [number, number, number]; rotation?: [number, number, number]; scale?: number }
> = {
  // Yüze otur (burun+ağız üzeri). 6 Tem SAYISAL kalibrasyon (__faceCalib
  // probu): kafa head-local Z -9.1..14.1 (burun ucu 14), göz y 12.5 →
  // burun tabanı y≈9.5, ağız y≈7. Eski z=9 yüzün İÇİNDEYDİ ("ekipman
  // hastaya entegre değil" bulgusu, Ali Bey 6 Tem).
  oxygen_mask: { bone: "mixamorigHead", offset: [0, 8.2, 12.4], rotation: [0.55, 0, 0], scale: 1.2 },
  // Burun altı — aynı kalibrasyon.
  nasal_cannula: { bone: "mixamorigHead", offset: [0, 9.4, 13.0], scale: 1.0 },
  // Göğüste duran elin parmak ucuna klips (LED parmağa bakar).
  pulse_ox: { bone: "mixamorigLeftHand", offset: [0, 9, 0], scale: 1 },
  // Ön kolun dorsal (üst) yüzeyine; eski +Z 2.5 kolun altına gömüyordu → -0.5'e çekildi.
  iv_cannula: { bone: "mixamorigRightForeArm", offset: [-1.5, 11, -0.5], scale: 0.85 },
  // Sol üst kola (pazı) sarılı; eski Y=12 dirseği aşıp gövdeye düşüyordu → Y=10 (bicep).
  nibp_cuff: { bone: "mixamorigLeftArm", offset: [0, 10, 0], scale: 0.95 },
  // Sternum/üst göğüs (subklaviküler triad); eski Y=6,+Z=8 boyna fırlayıp uçuyordu.
  ekg_electrodes: { bone: "mixamorigSpine2", offset: [0, 3.5, 7.6], scale: 0.78 },
};

const mat = (color: number, opts: MeshStandardMaterialParameters = {}) =>
  new MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.1, ...opts });

function m(geo: BufferGeometry, material: MeshStandardMaterial, pos: [number, number, number] = [0, 0, 0]): Mesh {
  const mesh = new Mesh(geo, material);
  mesh.position.set(...pos);
  return mesh;
}

// Mixamo kemik world scale ~0.0062 (cm×bedScale) → ekipman bone-local ~2-10 birim
// olmalı (world ~0.01-0.06). U bu ölçeği ayarlar. (Offset de bone-local, ~8-12.)
const U = 1.4; // bone-local birim çarpanı

/** kind → THREE.Group ekipman objesi (bone.add ile eklenir). */
export function buildEquipment(kind: EquipmentKind): Group {
  const g = new Group();
  g.name = `equip_${kind}`;

  switch (kind) {
    case "oxygen_mask": {
      // şeffaf yeşilimsi maske kubbesi + kenar
      const dome = m(new SphereGeometry(5 * U, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(0x9fe8c0, { transparent: true, opacity: 0.55, roughness: 0.2 }));
      dome.rotation.x = Math.PI; // kubbe yüze doğru
      const rim = m(new TorusGeometry(5 * U, 0.8 * U, 8, 20), mat(0x2a8f63));
      rim.rotation.x = Math.PI / 2;
      const tube = m(new CylinderGeometry(0.8 * U, 0.8 * U, 10 * U, 8), mat(0x5fbf94), [0, -7 * U, 0]);
      g.add(dome, rim, tube);
      break;
    }
    case "nasal_cannula": {
      const tube = m(new TorusGeometry(3.5 * U, 0.5 * U, 8, 24, Math.PI), mat(0xeaeaea, { roughness: 0.3 }));
      tube.rotation.z = Math.PI;
      const pL = m(new CylinderGeometry(0.4 * U, 0.4 * U, 1.5 * U, 6), mat(0xeaeaea), [-1 * U, 1 * U, 0]);
      const pR = m(new CylinderGeometry(0.4 * U, 0.4 * U, 1.5 * U, 6), mat(0xeaeaea), [1 * U, 1 * U, 0]);
      g.add(tube, pL, pR);
      break;
    }
    case "pulse_ox": {
      const clip = m(new BoxGeometry(2.5 * U, 3.5 * U, 4 * U), mat(0x2b2f36, { roughness: 0.4 }));
      const led = m(new SphereGeometry(0.7 * U, 8, 8), mat(0xff3344, { emissive: 0xaa0011, emissiveIntensity: 0.8 }), [0, -1 * U, 2.2 * U]);
      g.add(clip, led);
      break;
    }
    case "iv_cannula": {
      const patch = m(new BoxGeometry(5 * U, 0.4 * U, 4 * U), mat(0xf2e9d8, { roughness: 0.8 }));
      const hub = m(new CylinderGeometry(0.8 * U, 0.8 * U, 3 * U, 8), mat(0x66c2e0, { transparent: true, opacity: 0.7 }), [0, 1 * U, 2.5 * U]);
      hub.rotation.x = Math.PI / 2;
      const line = m(new CylinderGeometry(0.4 * U, 0.4 * U, 16 * U, 6), mat(0xdfe6ea, { transparent: true, opacity: 0.6 }), [0, 1 * U, 11 * U]);
      line.rotation.x = Math.PI / 2;
      g.add(patch, hub, line);
      break;
    }
    case "nibp_cuff": {
      const band = m(new CylinderGeometry(5.5 * U, 5.5 * U, 9 * U, 18, 1, true), mat(0x2f6fb0, { roughness: 0.7 }));
      const tube = m(new CylinderGeometry(0.6 * U, 0.6 * U, 8 * U, 6), mat(0x3a3a3a), [5 * U, -2 * U, 0]);
      g.add(band, tube);
      break;
    }
    case "ekg_electrodes": {
      const positions: [number, number, number][] = [
        [-4 * U, 4 * U, 0],
        [4 * U, 4 * U, 0],
        [0, -4 * U, 0],
      ];
      for (const p of positions) {
        const pad = m(new CylinderGeometry(1.6 * U, 1.6 * U, 0.4 * U, 12), mat(0xf5f5f5, { roughness: 0.6 }), p);
        pad.rotation.x = Math.PI / 2;
        const snap = m(new SphereGeometry(0.6 * U, 8, 8), mat(0x9aa0a6, { metalness: 0.6 }), [p[0], p[1], 0.6 * U]);
        g.add(pad, snap);
      }
      break;
    }
  }
  return g;
}
