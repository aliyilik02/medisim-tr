// ============================================================
// MedicationBolus — IV ilaç verildiğinde geçici görsel cue (Sprint B.6.2)
// ============================================================
// `give_medication` action yakalandığında PatientDialog3DPage state'i
// günceller (lastMedicationTs); PatientBody3D bu prop'u alır.
// Animasyon: IV kateter konumunda (sol önkol, T-pose koordinat) 2 saniyelik
// pulsing emissive halka — opacity 0→1 (200ms) → 1 (1.6sn) → 0 (200ms).
// Vital değişimi farmakoloji motoru ile zaten skin tint + PatientVitalSigns'a
// yansır; bu component sadece ANINDA "ilaç verildi" cue'su.
// ============================================================

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Mesh } from "three";

const ANIMATION_DURATION_SEC = 2.0;

interface Props {
  /** Son ilaç verme timestamp'i (ms). Değişince animasyon yeniden başlar. */
  triggerTs?: number | null;
  /** İlaç türü — adrenalin/noradrenalin kırmızı, opioid mor, diğer mavi-yeşil */
  drugId?: string | null;
}

function getDrugColor(drugId?: string | null): string {
  if (!drugId) return "#22c55e";
  const id = drugId.toLowerCase();
  if (/adrenalin|epinefrin|noradrenalin|norepinefrin|dopamin/.test(id)) {
    return "#dc2626"; // kırmızı — vazopresör/inotrop
  }
  if (/morfin|fentanil|opioid|tramadol/.test(id)) {
    return "#9333ea"; // mor — opioid analjezik
  }
  if (/atropin|amiodaron|lidokain/.test(id)) {
    return "#f59e0b"; // sarı — antiaritmik
  }
  if (/insulin|glukoz|dextroz/.test(id)) {
    return "#3b82f6"; // mavi — metabolik
  }
  if (/asa|aspirin|clopidogrel|heparin/.test(id)) {
    return "#ec4899"; // pembe — antiplatelet/antikoagülan
  }
  return "#22c55e"; // varsayılan yeşil
}

export function MedicationBolus({ triggerTs, drugId }: Props) {
  const ringRef = useRef<Mesh>(null);
  const sphereRef = useRef<Mesh>(null);
  const startTsRef = useRef<number | null>(null);

  // Trigger değişince başlangıç zamanı güncelle
  if (triggerTs && triggerTs !== startTsRef.current) {
    startTsRef.current = triggerTs;
  }

  useFrame(() => {
    const startTs = startTsRef.current;
    if (!startTs) return;
    const elapsed = (Date.now() - startTs) / 1000;
    if (elapsed >= ANIMATION_DURATION_SEC) {
      // Bitiş — opacity 0
      if (ringRef.current) {
        (ringRef.current.material as { opacity: number }).opacity = 0;
      }
      if (sphereRef.current) {
        (sphereRef.current.material as { opacity: number }).opacity = 0;
      }
      return;
    }
    // 0-0.2 sn fade-in, 0.2-1.6 sn full, 1.6-2.0 sn fade-out
    let opacity: number;
    if (elapsed < 0.2) opacity = elapsed / 0.2;
    else if (elapsed < 1.6) opacity = 1;
    else opacity = (2.0 - elapsed) / 0.4;
    // Sphere pulse (kalp atışı tarzı)
    const pulse = 1 + Math.sin(elapsed * 6) * 0.15;
    if (ringRef.current) {
      (ringRef.current.material as { opacity: number }).opacity = opacity * 0.7;
      ringRef.current.scale.setScalar(pulse);
    }
    if (sphereRef.current) {
      (sphereRef.current.material as { opacity: number }).opacity = opacity * 0.6;
      sphereRef.current.scale.setScalar(pulse * 0.9);
    }
  });

  if (!triggerTs) return null;
  const color = getDrugColor(drugId);

  return (
    // IV kateter konumu (sol önkol) — PatientEquipment IvCatheter ile aynı pozisyon
    <group position={[-0.24, 0.42, 0.05]}>
      {/* Pulsing halka — emissive */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.025, 0.004, 8, 24]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.4}
          transparent
          opacity={0}
          roughness={0.3}
        />
      </mesh>
      {/* Merkez küre — daha sıkı pulse */}
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.2}
          transparent
          opacity={0}
          roughness={0.2}
        />
      </mesh>
    </group>
  );
}
