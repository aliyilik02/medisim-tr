---
name: z-anatomy-binding
description: Z-Anatomy CC BY-SA 4.0 anatomik modelleri (5000+ TA2-2019 etiketli yapı) R3F'e bağlama pattern'i. Multi-mesh organ ayrımı, clipping plane (cilt altı görünüm), gltf-transform optimize pipeline, atıf disiplini. Sprint B.4 için kullan.
---

# Z-Anatomy Binding — Multi-Mesh + Clipping Plane

## Ne zaman kullan

- Sprint B.4 — Z-Anatomy multi-mesh + clipping plane
- Cilt altı organları (kalp, akciğer, karaciğer) görünür yapma
- Anatomik etiket overlay (mesh adı → TR/Latin etiket)
- Yeni anatomik model entegrasyonu (Z-Anatomy değil ama benzer CC BY-SA)

## Birincil veri kaynağı

⭐ **Master rapor:** `docs/MASTER-REPORT-v3.md` Bölüm 3 (asset pipeline) + Bölüm 9.A (anatomik standartlar) + Bölüm 10 (CC BY-SA lisans dikkat).
**Memory:** `docs/memory/medisim_anatomi_klinik.md` (organ projeksiyonları).

## Z-Anatomy Kaynağı

- **Resmi:** https://z-anatomy.com — Blender template, GitHub `Z-Anatomy/Models-of-human-anatomy`
- **Lisans:** CC BY-SA 4.0 (atıf + türetilmiş eserler aynı lisansla)
- **İçerik:** 5000+ anatomik yapı, TA2-2019 etiketli
- **Köken:** BodyParts3D (Kousaku Okubo, Database Center for Life Science, Japan) → türetilmiş
- **Klinik alternatif:** AnatomyTOOL Open3Dmodel (Leiden konsorsiyumu, retopologized klinik versiyon)

⚠️ **CC BY-SA viral risk:** SaaS "yayın" sayılırsa türetilmiş mesh paylaşım yükümlülüğü var (master rapor 10). Hukuk danışmanı onayı şart, ürün lansmanı öncesi.

## Asset Pipeline

```bash
# 1. Z-Anatomy GitHub'dan glb indir (veya Blender export)
# 2. gltf-transform optimize:
npx @gltf-transform/cli optimize \
  z-anatomy-heart.glb out/heart.glb \
  --simplify-ratio 0.20 \
  --texture-compress webp
# 3. Hedef: organ başına <3 MB lazy chunk
```

### Boyut hedefleri (master rapor 3)
- Tüm vücut ilk yükleme: <25 MB
- Lazy-loaded organlar: <3 MB her biri
- Toplam vertex: <500k (LOD ile <200k görünür)

## Multi-Mesh R3F Pattern

```tsx
// Z-Anatomy modelinde her organ ayrı mesh; isimle bul + ayrı materyalle:
const { scene, nodes } = useGLTF("/3d/anatomy/torso-internal.glb");

useMemo(() => {
  // Skin: yarı saydam, clipping plane'a duyarlı
  const skin = nodes.Skin as Mesh;
  skin.material = new MeshStandardMaterial({
    color: "#d4a896",
    transparent: true,
    opacity: 0.4,
    side: DoubleSide,
    clippingPlanes: [clippingPlane],
  });
  // Heart: opak, etkileşimli
  const heart = nodes.Heart as Mesh;
  heart.material = new MeshStandardMaterial({
    color: "#a83232",
    metalness: 0.1,
    roughness: 0.6,
  });
  // ...lung, liver
}, [nodes, clippingPlane]);

return <primitive object={scene} />;
```

## Clipping Plane (cilt altı görünüm)

```tsx
import { Plane } from "three";

const [clipY, setClipY] = useState(0);  // -0.24 (ayak) → 0.78 (kafa)

const clippingPlane = useMemo(
  () => new Plane(new Vector3(0, -1, 0), clipY),
  [clipY],
);

// R3F Canvas: localClippingEnabled
<Canvas gl={{ localClippingEnabled: true }}>
  {/* mesh material'ları yukarıdaki clippingPlane'a referans verir */}
</Canvas>

// UI slider:
<input
  type="range" min="-0.24" max="0.78" step="0.01"
  value={clipY}
  onChange={(e) => setClipY(parseFloat(e.target.value))}
/>
```

→ Slider ile cilt kademeli kalkar, içerideki organlar görünür.

## TA2-2019 Etiket Eşleme

Z-Anatomy mesh adları Latince TA2 (örn. `Cor`, `Pulmo_dexter`, `Hepar`). Kullanıcıya TR göster:

```ts
const TA2_TO_TR: Record<string, { tr: string; lat: string; en: string }> = {
  Cor: { tr: "Kalp", lat: "Cor", en: "Heart" },
  Pulmo_dexter: { tr: "Sağ akciğer", lat: "Pulmo dexter", en: "Right lung" },
  Pulmo_sinister: { tr: "Sol akciğer", lat: "Pulmo sinister", en: "Left lung" },
  Hepar: { tr: "Karaciğer", lat: "Hepar", en: "Liver" },
  // ...vd. `medical-terminology` skill'i + Sekiz Dilde Anatomi Sözlüğü'nden
};
```

Hover/tıklama: `<Html>` overlay ile etiket göster.

## Atıf (LICENSE-3D.md)

Her Z-Anatomy mesh için `public/3d/LICENSE-3D.md`'ye ekle:

```markdown
## anatomy-torso-v1.glb
**Eser:** Z-Anatomy Torso Internal (TA2-2019 etiketli)
**Kaynak:** https://z-anatomy.com / github.com/Z-Anatomy/Models-of-human-anatomy
**Yazar:** Z-Anatomy contributors
**Köken:** BodyParts3D (Kousaku Okubo, DBCLS, Japan)
**Lisans:** CC BY-SA 4.0
**Atıf:** This work is based on "Z-Anatomy" (https://z-anatomy.com) by the Z-Anatomy project, licensed under CC BY-SA 4.0. Derivative based on BodyParts3D (CC BY-SA 2.1 JP, DBCLS Japan).
**Optimize:** gltf-transform simplify 0.20, meshopt compress
```

## Gotchas

- ❌ **CC BY-SA viral:** Türetilmiş mesh public share yükümlülüğü → SaaS lansman öncesi hukuk
- ❌ **Mesh isimlendirme:** Z-Anatomy bazen `Cor.001`, `Cor.002` gibi numara verir (Blender duplicate). useGLTF'te `nodes` map'i bunları farklı key'lerle gösterir.
- ❌ **Clipping plane shader breathing'i etkiler** — vertex displacement sonrası clipping test. Test et: clip aktifken breathing devam edebilir mi.
- ❌ Texture yoksa default material — Z-Anatomy bazı meshlerde texture yok, runtime `MeshStandardMaterial` ile renklendir.
- ✅ DoubleSide + transparent: skin clipping için şart (iç yüzey görünmesin).
- ✅ Local clipping (`gl={{ localClippingEnabled: true }}`) — global yerine.

## Performans

- Çok mesh = çok draw call. **BatchedMesh** veya **InstancedMesh** ile birleştir.
- LOD: clipping plane uzaklığa göre detay düşür (low detail organlar render edilmesin).

## Referans dosyalar

- `public/3d/LICENSE-3D.md` — atıf
- `src/components/patient-3d/AnatomicPatientModel.tsx` — useGLTF wrapper pattern
- `memory/medisim_animasyon_teknikleri.md` — R3F genel pattern'leri
- `docs/MASTER-REPORT-v3.md` Bölüm 3 + 9.A + 10
