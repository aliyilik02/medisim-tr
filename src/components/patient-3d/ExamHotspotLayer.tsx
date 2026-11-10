// ============================================================
// ExamHotspotLayer — hastanın bedenindeki tıklanır muayene noktaları
// ============================================================
// Canvas İÇİNDE yaşar. Her nokta bir kemiğe bağlıdır (examAnchors): her
// karede kemiğin dünya konumu + lokal ofset hesaplanır, nokta oraya taşınır
// → hasta kıpırdasa/öksürse de nokta bedenle birlikte gider.
// Noktalar drei <Html> ile gerçek DOM butonudur: net görünür, klavye/ekran
// okuyucu erişir, testte data-testid ile bulunur.
// ============================================================

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import { Vector3, type Group, type Object3D } from "three";
import { Check } from "lucide-react";
import type { ExamSite } from "@/engine";
import { EXAM_ANCHORS } from "./examAnchors";

export interface ExamHotspot {
  id: string;
  site: ExamSite;
  label: string;
  /** Daha önce muayene edildi mi. */
  done: boolean;
  /** Muayene edildiğinde patolojik bulgu çıktı mı (yalnız done iken anlamlı). */
  abnormal?: boolean;
}

interface Props {
  hotspots: ExamHotspot[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  /** Değişince kemik önbelleği sıfırlanır (hasta varyantı değişimi). */
  resetKey?: string;
  /** false → etiket yalnız üstüne gelince/seçilince görünür (kalabalık görünüm). */
  showLabels?: boolean;
}

const _v = new Vector3();
const RETRY_FRAMES = 20;

export function ExamHotspotLayer({ hotspots, selectedId, onSelect, resetKey, showLabels = true }: Props) {
  const { scene } = useThree();
  const groups = useRef<Map<string, Group>>(new Map());
  const bones = useRef<Map<string, Object3D>>(new Map());
  const frame = useRef(0);

  useEffect(() => {
    bones.current.clear();
  }, [resetKey, scene]);

  useFrame(() => {
    frame.current += 1;
    for (const h of hotspots) {
      const g = groups.current.get(h.id);
      if (!g) continue;
      const anchor = EXAM_ANCHORS[h.site];
      let bone = bones.current.get(anchor.bone);
      if (!bone && frame.current % RETRY_FRAMES === 1) {
        // Model Suspense ile sonradan gelir — bulunana dek seyrek aralıkla ara.
        bone = scene.getObjectByName(anchor.bone) ?? undefined;
        if (bone) bones.current.set(anchor.bone, bone);
      }
      if (!bone) {
        g.visible = false;
        continue;
      }
      _v.set(anchor.offset[0], anchor.offset[1], anchor.offset[2]);
      bone.localToWorld(_v);
      g.position.copy(_v);
      g.visible = true;
    }
  });

  return (
    <>
      {hotspots.map((h) => {
        const selected = h.id === selectedId;
        return (
          <group
            key={h.id}
            visible={false}
            ref={(g) => {
              if (g) groups.current.set(h.id, g);
              else groups.current.delete(h.id);
            }}
          >
            <Html center zIndexRange={[6, 1]}>
              <button
                type="button"
                data-testid={`exam-hotspot-${h.id}`}
                data-done={h.done ? "1" : "0"}
                data-labels={showLabels ? "always" : "hover"}
                /* Hastanın sağındaki (x<0) noktanın etiketi sola açılır →
                   simetrik noktaların (karın bölgeleri) etiketleri çakışmaz. */
                data-side={EXAM_ANCHORS[h.site].labelSide ?? (EXAM_ANCHORS[h.site].offset[0] < 0 ? "left" : "right")}
                aria-label={`Muayene et: ${h.label}`}
                aria-pressed={selected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect?.(h.id);
                }}
                className="exam-hotspot group"
                data-state={selected ? "selected" : h.done ? (h.abnormal ? "abnormal" : "done") : "todo"}
              >
                <span className="exam-hotspot-dot">
                  {h.done && <Check className="w-3 h-3" strokeWidth={3} />}
                </span>
                <span className="exam-hotspot-label">{h.label}</span>
              </button>
            </Html>
          </group>
        );
      })}
    </>
  );
}
