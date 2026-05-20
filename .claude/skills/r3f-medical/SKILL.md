---
name: r3f-medical
description: React Three Fiber medikal görsel pattern'leri — anatomik model wrapper transform, breathing shader (chest+abdomen diafragma), cilt tonu (siyanoz/ikter/solgun) uniform, region marker, prosedür overlay, oskültasyon ses servisi. 3D component eklerken bu skill'i kullan.
---

# R3F Medical — Pattern Library

## Ne zaman kullan

- Yeni 3D component (organ, prosedür mesh, marker)
- Shader değişikliği (breathing, skin tint, pupil)
- glTF model entegrasyonu (wrapper scale + offset hesabı)
- Animasyon (morph target, useFrame, easing)

## Birincil veri kaynağı

⭐ **Memory:** `memory/medisim_animasyon_teknikleri.md`
**Master:** `docs/MASTER-REPORT-v3.md` Bölüm 3 + 4.

## Mevcut altyapı (referans dosyalar)

| Dosya | Ne yapıyor |
|---|---|
| `src/components/patient-3d/AnatomicPatientModel.tsx` | useGLTF wrapper + breathing shader + skin tint uniform |
| `src/components/patient-3d/PatientBody3D.tsx` | Canvas + CameraRig + Suspense + procedure overlay |
| `src/components/patient-3d/RegionMarker.tsx` | Sphere hotspot mesh + hover/select |
| `src/components/patient-3d/procedures/ProcedureOverlay.tsx` | Generic dispatcher |
| `src/components/patient-3d/procedures/useProcedureAnimation.ts` | Saf useFrame + easeOutCubic lerp |
| `src/components/patient-3d/procedures/StethoscopeProcedure.tsx` | Primitive geometri + animation pattern |
| `src/components/patient-3d/auscultationAudio.ts` | Web Audio API servisi |
| `src/components/patient-3d/regions.ts` | PatientRegion[] data |

## Pattern'ler

### 1. glTF wrapper (model bbox normalize)

```tsx
const scale = TARGET_HEIGHT / (raw_y_max - raw_y_min);
const yOffset = TARGET_CENTER - ((raw_y_min + raw_y_max) / 2) * scale;

return (
  <group ref={ref} scale={scale} position={[0, yOffset, 0]}>
    <primitive object={scene} />
  </group>
);
```

### 2. Shader displacement (breathing)

```glsl
vec4 bWorldPos = modelMatrix * vec4(transformed, 1.0);
vec3 center = vec3(0.0, 0.523, 0.085);
float dist = distance(bWorldPos.xyz, center);
float weight = 1.0 - smoothstep(0.03, 0.07, dist);
float phase = sin(uTime * 2 * PI * 0.25);
transformed += normal * weight * phase * uBreathAmplitude;
```

⚠️ Wrapper scale uygulanıyorsa amplitude / scale (`BREATH_AMPLITUDE_LOCAL = WORLD / MODEL_SCALE`).

### 3. Fragment shader skin tint

```glsl
gl_FragColor.rgb *= uSkinTint;  // vec3
```

Preset: normal(1,1,1), siyanoz(0.65,0.75,0.95), ikter(1.15,1.05,0.55), solgun(0.85,0.80,0.78).

### 4. Procedure animation hook

```tsx
const animRef = useProcedureAnimation(durationSec, onComplete);
useFrame(() => {
  if (!groupRef.current) return;
  groupRef.current.position.lerpVectors(startPos, endPos, animRef.current.progress);
});
```

### 5. Suspense + lazy chunk

```tsx
const PatientBody3DDemoPage = lazy(() =>
  import("@/pages/PatientBody3DDemoPage").then((m) => ({
    default: m.PatientBody3DDemoPage,
  })),
);
```

## Performans kuralları

- <100 draw call/frame (Instanced/Batched)
- <16ms/frame (60 FPS desktop, 30 FPS tablet)
- Frustum culling default açık
- LOD 3 seviye
- **useFrame'de state mutation YOK** → ref-based
- Lazy load ağır organlar

## Gotchas

- ❌ `useFrame` içinde `setState` — her frame re-render = performans katil
- ❌ Direkt `mesh.material = newMat` her render'da yeni material — `useMemo` ile sar
- ❌ `useGLTF` cache'lenir; aynı URL paylaşılırsa scene de paylaşılır (modify ederken `clone` gerek)
- ❌ Shader uniform setState ile güncelleme — `shaderRef.current.uniforms.X.value = Y` doğrudan
- ❌ Wrapper transform breathing amplitude'unu etkiler — local space displacement world'de scale wrapped
- ✅ `dpr={[1, 2]}` retina için (dpr=3 pahalı)
- ✅ `frameloop={breathing ? "always" : "demand"}` — animasyon yoksa GPU dinlensin

## Test stratejisi

happy-dom WebGL desteklemez → Canvas mock zorunlu:

```tsx
vi.mock("@react-three/fiber", () => ({
  Canvas: (props) => <div data-testid={props["data-testid"]} />,
  useFrame: () => undefined,
  useThree: () => ({ camera: { position: { set: () => {} }, lookAt: () => {} } }),
}));

vi.mock("@react-three/drei", () => ({
  useGLTF: Object.assign(() => ({ scene: { traverse: () => {} } }), {
    preload: () => {},
  }),
  Html: ({ children }) => <>{children}</>,
}));
```

Test edilen: prop/state/callback, Canvas içi 3D render değil.

## Referans dosyalar

- `memory/medisim_animasyon_teknikleri.md`
- `docs/MASTER-REPORT-v3.md` Bölüm 3-4
- `tests/components/patient-3d.test.tsx` (mock pattern örneği)
