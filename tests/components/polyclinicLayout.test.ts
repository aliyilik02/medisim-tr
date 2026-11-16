import { describe, expect, it } from "vitest";
import {
  COUCH,
  COUCH_CENTER_WORLD,
  DOOR,
  IV_BAG_PS,
  IV_BAG_WORLD,
  IV_TUBE_SOURCE,
  MONITOR_STAND,
  O2_TUBE_SOURCE,
  PS,
  PS_FLOOR,
  PS_Y,
  ROOM,
  WINDOW,
  roomToWorld,
  toMetric,
  toPatientSpace,
  worldToRoom,
  type V3,
} from "@/components/patient-3d/polyclinic/layout";

// Poliklinik yerleşimi — oda metreyle, hasta yığını eski birimle yaşar.
// Bu testler iki çerçeve arasındaki sözleşmeyi korur: dönüşüm bozulursa
// hasta sedyeye gömülür/havalanır ya da oda hastaya ters döner.

const close = (a: V3, b: V3, digits = 6) => a.forEach((v, i) => expect(v).toBeCloseTo(b[i], digits));
const insideRoom = (world: V3) => {
  const [x, y, z] = worldToRoom(world);
  return x > ROOM.xW && x < ROOM.xE && z > ROOM.zN && z < ROOM.zS && y >= 0 && y < ROOM.h;
};

describe("hasta birimi ↔ metre", () => {
  it("gidiş-dönüş kayıpsız", () => {
    const p: V3 = [0.65, 0.52, -0.35];
    close(toPatientSpace(toMetric(p)), p);
  });

  it("eski zemin (y=-0.27) metrede y=0'a oturur", () => {
    expect(toMetric([0, -PS_FLOOR, 0])[1]).toBeCloseTo(0, 9);
    expect(PS_Y).toBeCloseTo(PS_FLOOR * PS, 9);
  });

  it("şilte üstü, hastanın kalibre edildiği düzlemle (y=0.179) aynı yükseklikte", () => {
    expect(COUCH.top).toBeCloseTo(toMetric([0, 0.179, 0])[1], 9);
    // Gerçekçi muayene sedyesi yüksekliği (65–80 cm).
    expect(COUCH.top).toBeGreaterThan(0.65);
    expect(COUCH.top).toBeLessThan(0.8);
  });
});

describe("oda-yerel ↔ dünya (180° dönüş)", () => {
  it("dönüşüm kendi tersidir", () => {
    const p: V3 = [-2.1, 0.74, 1.3];
    close(worldToRoom(roomToWorld(p)), p);
  });

  it("baş ucu duvarı hastanın BAŞ tarafında (+Z dünya), kapı ayak tarafında", () => {
    // Ölçüm (scripts/scene-shot.mjs): baş kemiği dünya z≈+0.61, ayak z≈−0.65.
    expect(roomToWorld([0, 0, ROOM.zN])[2]).toBeGreaterThan(0.77);
    expect(roomToWorld([0, 0, ROOM.zS])[2]).toBeLessThan(-0.89);
  });

  it("sedye hastanın ölçülen kutusunu kaplar (baş tepe z≈0.77, parmak ucu z≈−0.89)", () => {
    const head = COUCH_CENTER_WORLD[2] + COUCH.l / 2;
    const foot = COUCH_CENTER_WORLD[2] - COUCH.l / 2;
    expect(head).toBeGreaterThan(0.77 + 0.1);
    expect(foot).toBeLessThan(-0.89 - 0.05);
  });

  it("pencere hastanın SOLUNDA (−X dünya), hekim masası tarafı SAĞINDA", () => {
    expect(roomToWorld([ROOM.xE, 0, 0])[0]).toBeLessThan(0);
    expect(roomToWorld([ROOM.xW, 0, 0])[0]).toBeGreaterThan(0);
  });
});

describe("sahne çapaları odanın içinde", () => {
  it("serum askı noktası, hortum kaynakları ve monitör standı duvarların içinde", () => {
    for (const p of [IV_BAG_WORLD, IV_TUBE_SOURCE, O2_TUBE_SOURCE, MONITOR_STAND]) {
      expect(insideRoom(p)).toBe(true);
    }
  });

  it("serum seti hastanın SAĞ tarafında (kanül sağ ön kolda) ve baş üstü yükseklikte", () => {
    expect(IV_BAG_WORLD[0]).toBeGreaterThan(COUCH_CENTER_WORLD[0] + COUCH.w / 2);
    expect(IV_BAG_WORLD[1]).toBeGreaterThan(1.6);
    close(toMetric(IV_BAG_PS), IV_BAG_WORLD);
    // Hat, torbanın altından (damla haznesi) çıkar.
    expect(IV_TUBE_SOURCE[1]).toBeLessThan(IV_BAG_WORLD[1]);
  });

  it("kapı ve pencere açıklıkları duvar sınırları içinde", () => {
    expect(DOOR.x0).toBeGreaterThan(ROOM.xW);
    expect(DOOR.x1).toBeLessThan(ROOM.xE);
    expect(DOOR.h).toBeLessThan(ROOM.h);
    expect(WINDOW.z0).toBeGreaterThan(ROOM.zN);
    expect(WINDOW.z1).toBeLessThan(ROOM.zS);
    expect(WINDOW.y1).toBeLessThan(ROOM.h);
  });

  it("oda alanı mevzuat asgarisinin üstünde (muayenehane 16 m²)", () => {
    expect((ROOM.xE - ROOM.xW) * (ROOM.zS - ROOM.zN)).toBeGreaterThanOrEqual(16);
  });
});
