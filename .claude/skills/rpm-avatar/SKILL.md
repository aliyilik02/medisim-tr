---
name: rpm-avatar
description: "[ARŞİV — 6 Tem 2026] Ready Player Me 31 Ocak 2026'da KAPANDI (Netflix satın alması). Bu skill ölü referanstır — RPM API/avatar creator çalışmıyor. ARKit 52 blendshape animasyon DESENİ (mouthOpen lipsync, eyeBlink, pupil, brow) hâlâ geçerli ama kaynak MPFB2/CC0 hattından gelir. Yeni iş için: r3f-medical + AnimatedPatientModel (lipsync zaten canlı). Çekirdek hastayı dış avatar SaaS'ına BAĞLAMA (RPM kapanışı bağımlılık riskini kanıtladı)."
---

# RPM Avatar — Blendshape Animasyon Pattern

> ⚠️ **ARŞİV (6 Tem 2026):** Ready Player Me 31 Ocak 2026'da kapandı (Netflix
> satın alması sonrası API + avatar creator devre dışı). Aşağıdaki RPM-özel
> URL/entegrasyon adımları ÇALIŞMAZ. **ARKit 52 blendshape animasyon deseni**
> geçerliliğini korur — kaynak artık MPFB2/CC0 hattı (patient-mimikli.glb,
> 159 morph). Lipsync + göz kırpma zaten `AnimatedPatientModel` içinde canlı
> (engine/lipsync). Foto-gerçekçi drop-in gerekirse Avatar SDK (MetaPerson) /
> Avaturn araştır — fakat çekirdek hastayı dış SaaS'a BAĞLAMA; CC0/MPFB2 hattı
> stratejik doğru.

## Ne zaman kullan

- Sprint D.2 — RPM avatar entegrasyonu (mock lipsync yerine gerçek)
- Göz blink animasyonu (`eyeBlinkLeft/Right`)
- Ağız hareketi (`mouthOpen`, `mouthSmile`, `mouthFrown`, vd.)
- Konuşma viseme'leri (TTS audio → blendshape weight)
- Pupil refleksi (göz mesh scale)
- Mimik (alın çatma, ağrı yüzü)

## Birincil veri kaynağı

⭐ **Memory:** `docs/memory/medisim_animasyon_teknikleri.md` (R3F morph target pattern).
**Master rapor:** Bölüm 4.4 (göz blink/ağız hareketleri) + Bölüm 7 (rpm-avatar skill listesi).

## RPM Avatar Temel

- **Kaynak:** readyplayer.me — ücretsiz hesap + Google login
- **Format:** glTF 2.0 binary (.glb), tipik 4-7 MB Highest quality
- **Skeleton:** Mixamo-uyumlu rig + ARKit 52 blendshape
- **Pose:** A-pose default (T-pose opsiyonel)
- **Body type:** Full body **şart** (Halfbody yetersiz — bacak yok)
- **Lisans:** RPM ToS — kullanıcı kendi avatarını kullanabilir, ticari OK

⚠️ Kişisel avatar = RPM hesabına bağlı. Ürün lansmanı için **RPM Studio API** ile programmatic avatar üretimi düşün (ileride).

## ARKit 52 Blendshape Listesi (önemli olanlar)

| Blendshape | Kullanım |
|---|---|
| `eyeBlinkLeft` / `eyeBlinkRight` | Göz kırpma (her 4-6 sn) |
| `eyeLookDownLeft` / `eyeLookUpLeft` / vs | Göz hareketi (mimik) |
| `eyeWideLeft` / `eyeSquintLeft` | Şaşkın / kısma |
| `jawOpen` | Çene açma (nefes/konuşma temel) |
| `mouthClose` | Ağız kapama |
| `mouthFunnel` / `mouthPucker` | Üfleme/öpme |
| `mouthLeft` / `mouthRight` | Ağız yana kayma |
| `mouthSmileLeft` / `mouthSmileRight` | Gülümseme |
| `mouthFrownLeft` / `mouthFrownRight` | Üzüntü |
| `mouthRollLower` / `mouthRollUpper` | Dudak içe |
| `mouthShrugLower` / `mouthShrugUpper` | Dudak öne |
| `mouthPressLeft` / `mouthPressRight` | Sıkıştırma |
| `mouthLowerDownLeft` / `mouthUpperUpLeft` | Konuşma viseme |
| `cheekPuff` | Yanak şişme |
| `tongueOut` | Dil çıkarma |
| `browDownLeft` / `browDownRight` | Kaş çatma |
| `browInnerUp` | Kaş yukarı (şaşkınlık) |
| `browOuterUpLeft` / `browOuterUpRight` | Tek kaş yukarı |

→ Toplam 52, Apple ARKit FaceTracking standardı.

## R3F Hook Pattern

```tsx
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";

export function RPMAvatarModel({ speaking, breathing }: Props) {
  const { scene, nodes } = useGLTF("/3d/avatar-rpm.glb");
  const headMeshRef = useRef<SkinnedMesh | null>(null);

  // RPM head mesh'i bul (genelde "Wolf3D_Head" veya "Wolf3D_Avatar")
  useEffect(() => {
    scene.traverse((obj) => {
      if ((obj as Mesh).isMesh && (obj as SkinnedMesh).morphTargetDictionary) {
        headMeshRef.current = obj as SkinnedMesh;
      }
    });
  }, [scene]);

  useFrame((state) => {
    const head = headMeshRef.current;
    if (!head || !head.morphTargetInfluences) return;

    const dict = head.morphTargetDictionary!;
    const t = state.clock.elapsedTime;

    // Eye blink — her 4-6 sn, 150 ms süre
    const blinkCycle = (t % 5) / 5;  // 0-1 within 5 sn
    const blinkAmount = Math.max(0, Math.sin(blinkCycle * Math.PI * 20)) ** 4;
    head.morphTargetInfluences[dict.eyeBlinkLeft] = blinkAmount;
    head.morphTargetInfluences[dict.eyeBlinkRight] = blinkAmount;

    // Mouth (speaking → jawOpen oscillate ~4-5 Hz konuşma rate)
    if (speaking) {
      const mouthPhase = (Math.sin(t * 28) + 1) / 2;  // 0-1
      head.morphTargetInfluences[dict.jawOpen] = mouthPhase * 0.35;
    } else {
      head.morphTargetInfluences[dict.jawOpen] = 0;
    }
  });

  return <primitive object={scene} />;
}
```

## Wrapper Group Pattern (chuma6oy ile aynı)

RPM avatar **gerçek boyut** (~1.7m), wrapper scale gerek değil. Bbox kontrol et:
```bash
npx @gltf-transform/cli inspect avatar-rpm.glb
# typical: y[0, 1.7], x[-0.3, 0.3]
```

Eğer sahnedeki boyut hedefimiz 1.02 birim (mevcut chuma6oy ile uyumlu):
```tsx
const SCALE = 1.02 / 1.7;  // ~0.6
<group scale={SCALE} position={[0, -0.243, 0]}>
  <primitive object={scene} />
</group>
```

Veya: tüm sahne RPM standartına geç, region koordinatları yeniden hesapla.

## Lipsync (TTS Visemes)

ARKit blendshape'ler + Azure tr-TR-EmelNeural viseme stream:

```ts
// Azure TTS event:
{ "viseme": 13, "audioOffset": 1500000 }  // 100ns units

// Viseme ID → blendshape mapping (Apple ARKit standart):
const VISEME_BLENDSHAPES: Record<number, string[]> = {
  0: [],  // silence
  1: ["mouthOpen"],  // æ, ə, ʌ
  2: ["mouthOpen", "jawOpen"],  // ɑ
  3: ["mouthFunnel"],  // ɔ
  // ...vd. 22 viseme
};

// Audio playback senkronu ile blendshape weight ayarla
```

→ Production'da Azure SDK + viseme event handler kullanılır.

## Pupil Refleksi

RPM avatar'da gözler genelde `EyeLeft` / `EyeRight` ayrı mesh. Pupil için ya:
- **Eye mesh scale** (basit): `eye.scale.set(pupilSize)`
- **Iris shader uniform** (ileri): pupil texture scale

```tsx
const eyeLeftRef = useRef<Mesh | null>(null);
useEffect(() => {
  eyeLeftRef.current = scene.getObjectByName("EyeLeft") as Mesh;
}, [scene]);

useFrame(() => {
  // pupil_size: 0.1 (parlak ışık) - 0.5 (karanlık)
  const targetScale = 0.7 + pupilSize * 0.6;  // 0.76-1.0 arası
  eyeLeftRef.current?.scale.setScalar(targetScale);
});
```

## Gotchas

- ❌ **morphTargetInfluences undefined** ilk render'da — `useLayoutEffect` ile `mesh.updateMorphTargets()` çağır
- ❌ **GPU morph target limit (legacy 8)** — RPM 52 blendshape, çoğu CPU fallback yapar (yavaş). Aktif olanları seçici tut.
- ❌ **Head mesh adı RPM versiyona göre değişir** — `Wolf3D_Head`, `Wolf3D_Avatar`, `Wolf3D_Outfit_Top` vd. `scene.traverse` ile `morphTargetDictionary` olanı bul.
- ❌ **A-pose vs T-pose** — RPM default A-pose, ama bazı third-party tool T-pose ister. Skinning farklı.
- ❌ **Pose ayarı** — RPM avatar ayakta. Yatak senaryosu için `<group rotation-x={-Math.PI/2}>` ile yatır.
- ✅ Eye blink **rastgele aralık** daha doğal (her 4.5 ± 1 sn) — sabit 5 sn robotik.
- ✅ Speaking yokken jawOpen=0 — açık ağız ölü yüz gibi durur.

## Performans

- 52 blendshape × 60 fps = morph CPU yükü. Aktif olanları sınırla (4-6 anda).
- LOD: kamera uzaksa blendshape devre dışı (statik baş).
- Texture optimization: gltf-transform ile WebP, 1024px yeterli (RPM default 2048).

## Asset Yolu

```
public/3d/
├── patient-v2.glb        ← mevcut chuma6oy (full body, blendshape yok)
└── avatar-rpm.glb        ← RPM avatar (full body + 52 blendshape)
```

İki model arası geçiş için `AnatomicPatientModel` prop:
```tsx
<AnatomicPatientModel modelVariant="rpm" />  // vs "chuma6oy"
```

## RPM Avatar Hazırlama Süreci (kullanıcı yapacak)

1. https://readyplayer.me/hub → Google ile giriş
2. Create new avatar → **Full body** (kritik!) → Realistic
3. Sade kıyafet seç (mor takım vb. değil)
4. Save → Download → **GLB**, **A-pose**, **Highest quality**, **ARKit blendshapes** ✓
5. `public/3d/avatar-rpm.glb` olarak repo'ya koy

## Referans dosyalar

- `src/components/patient-3d/AnatomicPatientModel.tsx` — mevcut model entegrasyon, prop ekle
- `memory/medisim_animasyon_teknikleri.md` — R3F genel
- `docs/MASTER-REPORT-v3.md` Bölüm 4.4 (animasyon paketi)
- readyplayer.me — RPM resmi
- ARKit FaceTracking docs (Apple) — 52 blendshape spec
