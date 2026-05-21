// ============================================================
// IndividualOrgans — Sprint B.5+ tek tek CC BY organ modelleri
// ============================================================
// Z-Anatomy Splanchnology mesh'inin generic "Default/Organ" mesh
// adlandırması organ ayrımını zorlaştırıyordu. Bu component
// `OrganModel` üzerinden bağımsız .glb dosyalarını anatomik
// koordinatlara yerleştirir.
//
// DEFAULT_ORGAN_CONFIGS ilk değerleri tutar. Runtime'da OrganDevPanel
// üzerinden slider'la ayarlanıp localStorage'a kaydedilebilir
// (useOrganOverrides). Final değerler buraya sabitlenir — bkz. panel
// "JSON Export".
//
// Lungs için `secondaryRotation`: trakea/larynx (üst %20) ayrı rotation;
// pivot lokal cutoff Y'sinde. Akciğer dokusu primary rotation alır.
//
// Cilt kesim → organ opacity yumuşak fade:
//   skinClipLevel >= 1.0 → 0   (cilt kapalı, organ gizli)
//   skinClipLevel ≤ 0.45 → 1   (yeterince açık, tam opak)
//   arası: lineer fade in/out
// ============================================================

import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { OrganModel, type OrganAnimation } from "./OrganModel";

// drei-use-gltf: 3 organ glb'sini ilk render öncesi preload et.
// Kullanıcı /dialog-3d-demo açar açmaz IndividualOrgans mount edilirse
// burada listed URL'ler Suspense öncesi fetch + parse edilir → blocking
// fallback azalır. URL listesi DEFAULT_ORGAN_CONFIGS ile senkron tutulur.
useGLTF.preload("/3d/organs/heart.glb");
useGLTF.preload("/3d/organs/lungs.glb");
useGLTF.preload("/3d/organs/liver.glb");

export type OrganId = "heart" | "lungs" | "liver";

export interface OrganConfig {
  url: string;
  label: string;
  scale: number;
  position: [number, number, number];
  /** Euler XYZ radyan — modelin axis düzeltmesi (orientation). */
  rotation: [number, number, number];
  /**
   * Modelin üst kısmı için ayrı rotation (akciğer trakea/larynx).
   * undefined → tek-grup render. Lungs için panel üzerinden ayarlanır.
   */
  secondaryRotation?: [number, number, number];
  color: number;
  animationKind: OrganAnimation["kind"];
  visible: boolean;
}

/** Bir organ için runtime override (yalnız değişen alanlar). */
export interface OrganOverride {
  scale?: number;
  position?: [number, number, number];
  rotation?: [number, number, number];
  secondaryRotation?: [number, number, number];
  visible?: boolean;
}

export type OrganOverrideMap = Partial<Record<OrganId, OrganOverride>>;

/**
 * Anatomik kaynak: docs/memory/medisim_anatomik_landmark.md (8-head canon).
 * Değerler kullanıcı tarafından OrganDevPanel slider'larıyla ayarlanıp
 * "JSON Export" → buraya yapıştırılarak sabitlenir.
 */
export const DEFAULT_ORGAN_CONFIGS: Record<OrganId, OrganConfig> = {
  heart: {
    url: "/3d/organs/heart.glb",
    label: "Kalp",
    scale: 0.051,
    position: [0.025, 0.515, 0.13],
    rotation: [0, 0, 0],
    color: 0xc73824,
    animationKind: "pulse",
    visible: true,
  },
  lungs: {
    url: "/3d/organs/lungs.glb",
    label: "Akciğer",
    scale: 0.705,
    position: [0.0, 0.45, 0.115],
    rotation: [0, 0, 0],
    secondaryRotation: [0, 0, 0], // trakea/larynx ayrı rotation
    color: 0xeb8d9e,
    animationKind: "breathe",
    visible: true,
  },
  liver: {
    url: "/3d/organs/liver.glb",
    label: "Karaciğer",
    scale: 0.475,
    position: [-0.035, 0.385, 0.005],
    rotation: [-0.297, -1.484, -0.593],
    color: 0x935028,
    animationKind: "none",
    visible: true,
  },
};

/** Render sırası — z-fight önlemek için back-to-front. */
const RENDER_ORDER: OrganId[] = ["lungs", "liver", "heart"];

/** Cilt kesim seviyesini organ opacity'sine map'le.
 *
 *  Aralık geniş tutuldu — organlar cilt biraz açıldığında bile (sCL 0.85
 *  civarında) hafif gözükmeye başlar, %60 açıklıkta (sCL ≤ 0.40) tam
 *  opak olur. Bu "yumuşak belirginleşme" hissi verir, binary değil.
 *
 *  Curve: cubic ease-in (yavaş başlar, hızlı bitirir) — anatomik atlas
 *  fade-in görüntüsü daha doğal.
 */
export function computeOrganOpacity(skinClipLevel: number): number {
  if (skinClipLevel >= 1.0) return 0;
  if (skinClipLevel <= 0.4) return 1;
  // 0.4 → 1.0 arasında 0 → 1 lineer t, sonra cubic ease for natural fade
  const t = (1.0 - skinClipLevel) / (1.0 - 0.4);
  return t * t * (3 - 2 * t); // smoothstep
}

interface Props {
  /** Heart rate (BPM) — kalp pulsate frequency. */
  hr?: number;
  /** Respiratory rate (BPM) — akciğer breathing frequency. */
  rr?: number;
  /** Görünür mü? (true ve opacity>0 iken render). */
  visible?: boolean;
  /** Runtime override (OrganDevPanel + useOrganOverrides). */
  overrides?: OrganOverrideMap;
  /** Cilt kesim seviyesi (1.0=kapalı, 0=tam açık) — opacity hesabı için. */
  skinClipLevel?: number;
}

function applyOverride(base: OrganConfig, ov: OrganOverride | undefined): OrganConfig {
  if (!ov) return base;
  return {
    ...base,
    scale: ov.scale ?? base.scale,
    position: ov.position ?? base.position,
    rotation: ov.rotation ?? base.rotation,
    secondaryRotation: ov.secondaryRotation ?? base.secondaryRotation,
    visible: ov.visible ?? base.visible,
  };
}

export function IndividualOrgans({
  hr = 75,
  rr = 14,
  visible = true,
  overrides,
  skinClipLevel = 0,
}: Props) {
  const effective = useMemo<Record<OrganId, OrganConfig>>(() => {
    return {
      heart: applyOverride(DEFAULT_ORGAN_CONFIGS.heart, overrides?.heart),
      lungs: applyOverride(DEFAULT_ORGAN_CONFIGS.lungs, overrides?.lungs),
      liver: applyOverride(DEFAULT_ORGAN_CONFIGS.liver, overrides?.liver),
    };
  }, [overrides]);

  const opacity = computeOrganOpacity(skinClipLevel);

  if (!visible || opacity <= 0.01) return null;

  return (
    <group>
      {RENDER_ORDER.map((id) => {
        const cfg = effective[id];
        const animation: OrganAnimation =
          cfg.animationKind === "pulse"
            ? { kind: "pulse", rate: hr }
            : cfg.animationKind === "breathe"
              ? { kind: "breathe", rate: rr }
              : { kind: "none" };
        // Transparent z-sort: akciğer en arka (0), karaciğer orta (1),
        // kalp en ön (2). Skin clip fade sırasında transparency aktif
        // olduğunda Three.js render queue bu sıralamayı kullanır.
        const renderOrder = id === "lungs" ? 0 : id === "liver" ? 1 : 2;
        return (
          <OrganModel
            key={id}
            url={cfg.url}
            scale={cfg.scale}
            position={cfg.position}
            rotation={cfg.rotation}
            secondaryRotation={cfg.secondaryRotation}
            color={cfg.color}
            animation={animation}
            visible={visible && cfg.visible}
            opacity={opacity}
            renderOrder={renderOrder}
          />
        );
      })}
    </group>
  );
}
