// ============================================================
// HospitalRoom — Sketchfab CC BY 4.0 hastane odası, klinik layout uygulanmış
// ============================================================
// Asset: public/3d/hospital-room.glb (3.54 MB optimize)
// Yaratıcı: Uğur Yakışık (UgurYksk) — CC-BY 4.0
// Kaynak: sketchfab.com/3d-models/hospital-room-39d5f1555a26402ab1a54ffbaa8afec1
//
// ÖNEMLİ pattern: Sketchfab Auto-converted glTF export modeli "explode
// layout"ta veriyor — tüm mesh'ler origin civarında yan yana dizilmiş, sahne
// bir oda değil bir "envanter". Three.js'te scene.traverse ile her mesh'i ad
// bazlı bul + klinik standart layout dict'i uygula + gereksizleri gizle.
//
// Klinik standart pattern (SonderCare/Medik kılavuzu):
//   - Yatak merkez, 0.9m clearance her yan
//   - Başucu: IV + monitör + güç paneli (modeldeki Machine + OxygenTube +
//     ElectricSystm + IvPole)
//   - Yan: sandalye + komodin + over-bed table
//   - Köşe: dolap + kanepe + TV
//   - Uzak: kapı + duvar (şimdilik gizli, sade görünüm için)
//
// Layout dict: src/components/patient-3d/hospital-room-layout.ts
// ============================================================

import { memo, useEffect, useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { Box3, Vector3, type Object3D } from "three";
import { HOSPITAL_ROOM_LAYOUT, HIDDEN_MESH } from "./hospital-room-layout";
import type { RoomLayoutOverrideMap } from "@/hooks/useRoomLayoutOverrides";

const MODEL_URL = "/3d/hospital-room.glb";
useGLTF.preload(MODEL_URL);

interface Props {
  visible?: boolean;
  /** Tüm odanın world scale'i (gerek olursa). */
  scale?: number;
  /** Genel offset — odanın altındaki zemin position'ı. */
  position?: [number, number, number];
  /** Debug mode: gizli mesh'leri gösterir + axis helper renkleri. */
  debug?: boolean;
  /** Manual layout override (RoomLayoutDevPanel + useRoomLayoutOverrides). */
  overrides?: RoomLayoutOverrideMap;
}

function HospitalRoomImpl({
  visible = true,
  scale = 1.0,
  position = [0, 0, 0],
  debug = false,
  overrides = {},
}: Props) {
  const { scene } = useGLTF(MODEL_URL);

  // Scene tree'yi tarayıp her mesh'e EFEKTİF layout uygula.
  // Initial: HOSPITAL_ROOM_LAYOUT dict (varsayılan).
  // Override: useRoomLayoutOverrides → slider hareketleri localStorage'dan.
  useEffect(() => {
    if (!scene) return;

    // Tüm mesh'leri topla
    const meshes: Object3D[] = [];
    scene.traverse((obj: Object3D) => {
      if (("isMesh" in obj) && (obj as { isMesh: boolean }).isMesh) {
        meshes.push(obj);
      }
    });

    let applied = 0;
    for (const obj of meshes) {
      const name = obj.name ?? "";
      const base = HOSPITAL_ROOM_LAYOUT[name];
      const ov = overrides[name] ?? {};

      const isHiddenDefault = HIDDEN_MESH.has(name);
      const finalVisible = ov.visible ?? !isHiddenDefault;
      obj.visible = debug ? true : finalVisible;

      // Position: override > base.position > origin
      const position = ov.position ?? base?.position;
      const rotation = ov.rotation ?? base?.rotation;
      const scale = ov.scale ?? base?.scale ?? 1;

      if (position) {
        // Re-parent to scene root + reset transform to bypass parent matrix
        if (obj.parent && obj.parent !== scene) {
          scene.attach(obj);
        }
        // Rotation ÖNCE — bbox setFromObject world matrix'i çevirilmiş geometri
        // üzerinden hesaplar, böylece döndürülmüş mesh'in gerçek bbox center'ı
        // hedef pozisyona oturur.
        obj.rotation.set(
          rotation?.[0] ?? 0,
          rotation?.[1] ?? 0,
          rotation?.[2] ?? 0,
        );
        obj.scale.setScalar(scale);
        obj.updateMatrixWorld(true);
        const bbox = new Box3().setFromObject(obj);
        const center = new Vector3();
        bbox.getCenter(center);
        obj.position.sub(center).add(new Vector3(...position));
        applied += 1;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[HospitalRoom] layout: applied=${applied} override_count=${Object.keys(overrides).length}`,
    );

    if (typeof window !== "undefined") {
      (window as unknown as { __hospitalScene: Object3D }).__hospitalScene = scene;
    }
  }, [scene, debug, overrides]);

  const props = useMemo(
    () => ({ scale, position }),
    [scale, position],
  );

  if (!visible) return null;

  return <primitive object={scene} {...props} />;
}

export const HospitalRoom = memo(HospitalRoomImpl);
