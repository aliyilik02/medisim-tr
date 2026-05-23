---
name: MediSim — 3D Animasyon Teknikleri (Three.js / R3F)
description: Karakter animasyonu için Three.js + react-three-fiber pattern'leri. Solunum, göz blink, ağız hareketi, oskültasyon sesi entegrasyonu. Asset gereksinimi notları.
type: reference
originSessionId: 0bba8189-fb17-45da-90c4-0cbc0bc9f4a3
---
## 1. Solunum Animasyonu (Chest Rise)

### Mevcut yaklaşım (B.2.3): Shader vertex displacement

```glsl
// Chest center'dan world-space mesafe + smoothstep falloff
vec3 chestCenter = vec3(0, 0.523, 0.085);
float dist = distance(worldPos, chestCenter);
float weight = 1.0 - smoothstep(0.03, 0.07, dist);
float phase = sin(uTime * 2π * 0.25);  // 15 nefes/dk
transformed += normal * weight * phase * amplitude;
```

**Artıları:** Saf shader, ek geometri yok, 60fps korunur.
**Eksileri:** Sadece AP genişleme. Gerçek nefeste hem chest hem abdomen hareketi var (diafragma).

### İyileştirme yolu

| Yöntem | Karmaşıklık | Sonuç |
|---|---|---|
| **Çift center shader** | Düşük | Chest center + abdomen center, fazları ayarlı. Diafragma simülasyonu. |
| **Morph target (blend shape)** | Orta | Modeller "inhale_max" + "exhale_max" shape'leri varsa, `morphTargetInfluences` ile blend. |
| **Skeletal rig + IK** | Yüksek | Göğüs/abdomen kemikleri varsa, kemik rotasyonuyla animasyon. Body Interact yaklaşımı. |

**Önerilen sprint adımı:** Çift center shader (B.4.1). Mevcut model değiştirmeden iyileşme.

## 2. Göz Animasyonu

### Seçenek A: Ayrı göz mesh + scale/rotation (basit)

Eğer model'in **gözleri ayrı mesh** (eyeball + eyelid) ise:
```tsx
const leftEye = scene.getObjectByName("Eye_L");
const eyelidL = scene.getObjectByName("Eyelid_L");

useFrame((state) => {
  // Blink döngüsü 4-6 sn aralık, 100-150 ms blink süresi
  const t = state.clock.elapsedTime;
  const blinkPhase = (t % 5) / 5;  // 0-1, 5 sn periyot
  const isBlinking = blinkPhase > 0.97;  // son %3 = blink
  eyelidL.scale.y = isBlinking ? 0.05 : 1.0;
  
  // Bakış hafif rastgele yön
  leftEye.rotation.x = Math.sin(t * 0.3) * 0.05;
  leftEye.rotation.y = Math.cos(t * 0.4) * 0.07;
});
```

### Seçenek B: Morph target (blend shape)

Eğer model'de "Eye_Blink_L" / "Eye_Blink_R" blend shape varsa:
```tsx
const head = scene.getObjectByName("Head");
const blinkIdx = head.morphTargetDictionary["Eye_Blink_L"];

useFrame((state) => {
  const t = state.clock.elapsedTime;
  const blinkAmount = Math.max(0, Math.sin(t * π) - 0.95) * 20;  // sharp pulse
  head.morphTargetInfluences[blinkIdx] = blinkAmount;
});
```

⚠️ `morphTargetInfluences` undefined ise `useLayoutEffect(() => mesh.updateMorphTargets(), [])` çağır.

### Seçenek C: Overlay sprite (mevcut model değişmiyor)

Mevcut model gözleri ayrı değilse: göz pozisyonuna **plane sprite** ekle, eyelid texture'la blink animasyonu. Pragmatik kısa çözüm.

## 3. Ağız / Çene Hareketi

| Yöntem | Asset gereği | Sonuç |
|---|---|---|
| **Jaw bone rotation** | Skeletal rig'li model | Doğal çene açıp kapama (konuşma, nefes) |
| **Mouth_Open morph target** | Blend shape | Tek değer 0-1 ile açıklık |
| **Plane sprite** | Yok | Statik mouth texture overlay, blink benzeri |

### Phoneme animation (konuşma)

Body Interact'te 22 blendshape var, bunların bir kısmı **phoneme** (A, E, O, U, M ses formları). Bunlar TTS senkronu için:
```tsx
// Visemes (Oculus LipSync standardı): sil, PP, FF, TH, DD, kk, CH, SS, nn, RR, aa, E, I, O, U
// Web Speech API + visemes mapping → blendshape weight set
```

**MediSim TR için:** TTS şart değil. Sadece **ABCDE → A (Airway)**'da "ağız açık nefes alıyor" gibi statik durum gösterimi yeterli.

## 4. Oskültasyon Sesi (Web Audio API)

### Pattern

```tsx
// public/sounds/auscultation/normal_heart_s1s2.mp3
// public/sounds/auscultation/wheeze.mp3
// public/sounds/auscultation/normal_lung.mp3

const audioRef = useRef<HTMLAudioElement | null>(null);

function playAuscultation(soundId: string) {
  if (audioRef.current) {
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
  }
  const audio = new Audio(`/sounds/auscultation/${soundId}.mp3`);
  audio.loop = true;
  audio.volume = 0.6;
  audio.play();
  audioRef.current = audio;
}
```

### CC/eğitim ücretsiz ses kaynakları

| Kaynak | İçerik | Format | Lisans |
|---|---|---|---|
| **EasyAuscultation** | 100+ kalp/akciğer sesi | MP3 stream | Eğitim ücretsiz, atıf |
| **Teaching Heart Auscultation** | Normal/anormal kalp | MP3 indirme | Eğitim ücretsiz |
| **East Tennessee State Pulmonary** | Akciğer sesleri (raller, wheeze, ronkus) | WAV | Açık erişim |
| **Wellcome Library (Georgetown)** | Üfürümler | MP3 | CC BY |
| **Practical Clinical Skills** | 20+ breath sounds + waveform | Web | Eğitim |

### MediSim TR senaryo entegrasyon önerisi

```ts
// scenario data:
auscultation_findings?: {
  region: "chest-left" | "chest-right" | "chest-front" | ...;
  sound_id: string;        // "wheeze_bilateral" | "s3_gallop" | "normal_lung"
  description_tr: string;
}[];
```

Stetoskop prosedürü tamamlanınca → region için sound_id varsa çalınır + InspectionPanel feedback.

## 5. Pupil Işık Refleksi

Shader uniform ile basit:
```glsl
uniform float uPupilSize;  // 0.3 (dark room) → 0.1 (light)
// pupil mesh scale = uPupilSize
```

Senaryoda `pupil_left_mm: 3, pupil_reactive: true` gibi alanlar PatientVitals'da var (engine/types.ts). UI'dan flashlight tıklanınca:
```tsx
setPupilSize(0.1);
setTimeout(() => setPupilSize(0.3), 500);  // refleks 500ms
```

## 6. Cilt Rengi (Siyanoz, Pallor, Jaundice)

Material color shader uniform:
```glsl
uniform vec3 uSkinTint;  // (1,1,1) normal, (0.6,0.7,0.9) siyanoz, (1.2,1.1,0.6) jaundice
diffuseColor.rgb *= uSkinTint;
```

Senaryo state'inden vitalleri okuyup tint hesabı:
- SpO2 < 90% → siyanoz tint
- Bilirubin yüksek → jaundice tint
- Şok → pallor tint

## Asset Gereksinimi Listesi

Şu anki chuma6oy modeli (`patient-v2.glb`):
- ✅ Tam beden geometri
- ❌ Blend shapes (yüz mimiği yok)
- ❌ Skeletal rig (gözler/çene ayrı kemik yok)
- ❌ Tek mesh (göz ayrı objesi yok — sphere'ler dahil değil)

→ Göz blink + ağız hareketi için **yeni model gerek**:
- **Ready Player Me** — web tabanlı avatar, ücretsiz, full blend shape + ARKit 52 morph
- **Mixamo** (Adobe) — ücretsiz rig + animasyon, ama yüz blend shape sınırlı
- **Reallusion Character Creator** — pro, CC4 avatar full rig + 70 morph

**Pragmatik öneri:** Mevcut chuma6oy modelini kalıcı tut + **ek bir baş modeli** (face overlay) yerleştir, blend shape ile mimik. Veya hibrit yaklaşım.

## Kaynaklar

- [R3F karakter animasyonu](https://wawasensei.dev/tuto/how-to-animate-3d-models-with-three-js-react-three-fiber)
- [Morph targets / R3F discussion](https://github.com/pmndrs/react-three-fiber/discussions/2597)
- [Facial morphs SkinnedMesh](https://discourse.threejs.org/t/facial-morphs-on-a-skinnedmesh-character/27606)
- [Reallusion + Three.js (Convai)](https://convai.com/blog/bring-ai-online-with-reallusion-avatars-using-threejs-react)
- [GPU blendshape limit issue](https://github.com/mrdoob/three.js/issues/21636)
- [EasyAuscultation](https://www.easyauscultation.com/)
- [Teaching Heart Auscultation](https://teachingheartauscultation.com/heart-sounds-mp3-downloads)
- [Lung sounds / Practical Clinical Skills](https://www.practicalclinicalskills.com/lung-sounds-audio)
