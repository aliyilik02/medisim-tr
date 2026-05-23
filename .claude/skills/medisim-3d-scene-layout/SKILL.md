---
name: medisim-3d-scene-layout
description: Sketchfab CC BY hastane/klinik 3D modelleri Three.js'te yüklerken "explode layout" pattern (tüm mesh'ler origin'de yan yana dizilmiş — bir oda değil envanter görünüm) sorununu tespit ve çözüm. Bütüncül model rotate/scale YANLIŞTIR; doğru yaklaşım scene.traverse ile her mesh'i ADINA göre bul + klinik standart layout dict'ten pozisyon ata + gereksiz mesh'leri gizle. Hastane odası, ICU, ameliyathane, acil bölümü gibi multi-mesh klinik sahnelerinde KULLANILIR. Sketchfab indirilmiş .glb'de bir oda olması gereken model "yan yana dizili ekipman" gözüküyorsa bu skill'i tetikle.
---

# MediSim 3D Scene Layout

Sketchfab Auto-converted glTF export'larında çoklu-obje sahneleri **explode layout** ile gelir — tüm mesh'ler scene origin civarında yan yana dizilmiş, gerçek oda düzeni kayıp. Sketchfab'ın native viewer'ı sahne hierarchy + camera framing ile düzenli görünür ama glTF export bunu korumaz.

## Ne zaman tetiklenir

- Sketchfab CC BY hastane / ICU / ameliyathane / klinik sahne .glb indirildi
- Tarayıcıda model "yan yana ekipman" görünüyor (oda değil)
- Bütün modeli scale/rotate ile düzenleme **çalışmıyor**
- `gltf-transform inspect` ile model bbox dar X / Z ama uzun Y boyutu (3+ unit) gösteriyor
- Mesh adları "Bed-material", "IvPole-material", "Cabinet1-material" gibi semantik

## Sorun teşhisi

`gltf-transform inspect <model>.glb` sonucunda:

```
SCENE SIZE  x=0.94 y=3.70 z=0.49
```

- Y boyu çok uzun (3.7m) → tüm ekipmanlar Y ekseni boyunca **liste halinde** dizili
- Z dar (0.49m) → odanın "yüksekliği" bu kadar dar olamaz (gerçek oda 2.5-3m)
- → glTF Y-up convention sonrası model **yatık**

**Doğrulama:** Headless Blender script ile her mesh'in world bbox center'ı yazdır:

```python
# scripts/blender-inspect-positions.py — bkz. repo
for o in bpy.context.scene.objects if o.type == "MESH":
    mn, mx = compute_world_bbox(o)
    cx, cy, cz = (mn+mx)/2
    print(f"{o.name} center=({cx},{cy},{cz})")
```

Eğer mesh'lerin tümü Y ekseninde aralıklı (örn. Bed Y=0, IvPole Y=-0.15, Machine Y=0.72, Cabinet1 Y=1.13, Sofa Y=1.91) → **explode layout doğrulandı**.

## Çözüm — scene.traverse + ad-bazlı layout dict

❌ **YANLIŞ yaklaşım** (uğraştırıcı, sonuç vermez):
```tsx
// Bütüncül model: rotation + scale + position
<primitive object={scene} rotation={[-Math.PI/2, 0, 0]} scale={0.6} position={[-0.12, -0.05, 0]} />
```

✅ **DOĞRU yaklaşım** — mesh-by-mesh layout:

```ts
// hospital-room-layout.ts
export const HOSPITAL_ROOM_LAYOUT: Record<string, { position: [number, number, number] }> = {
  "Bed-material":      { position: [0, -0.05, 0] },
  "IvPole-material":   { position: [0.55, 0.35, 0.40] },
  "Machine-material":  { position: [0.55, 0.55, -0.40] },
  "Chair-material":    { position: [-0.40, 0.25, 0.55] },
  // ...
};

export const HIDDEN_MESH = new Set(["Ground-material", "Wall1-material", ...]);
```

```tsx
// HospitalRoom.tsx
function HospitalRoom() {
  const { scene } = useGLTF("/3d/hospital-room.glb");
  useEffect(() => {
    scene.traverse((obj) => {
      if (!(obj as Mesh).isMesh) return;
      const spec = HOSPITAL_ROOM_LAYOUT[obj.name];
      if (spec) {
        obj.position.set(...spec.position);
      } else if (HIDDEN_MESH.has(obj.name)) {
        obj.visible = false;
      }
    });
  }, [scene]);
  return <primitive object={scene} />;
}
```

## Klinik standart hasta odası layout

Kaynak: SonderCare Hospital-Grade Bedroom Setup, Medik Patient Positioning Guide, klinik VR papers.

| Element | Position (hasta supine world coord) | Not |
|---|---|---|
| **Yatak** | (0, -0.05, 0) — sahne merkezi | Hastanın altı, 5cm aşağı |
| **IV stand** | (0.55, 0.35, ±0.40) | Başucu KÖŞESİ — sağ veya sol |
| **Serum/drip** | IV stand X/Z + y=0.85 | IV pole tepesi |
| **Monitor** | (0.55, 0.55, −0.40) | Başucu DİĞER köşe |
| **Power column** | (0.65, 0.40, −0.40) | Monitör yanı duvar |
| **Wall console / oksijen** | (0.70, 1.20, −0.30) | Yatak başucu duvar |
| **Bedside table / komodin** | (0.10, 0.30, 0.55) | Yatağın sağ yanı |
| **Over-bed table** | (0, 0.45, 0.55) | Yatağın üstünde döner |
| **Sandalye** | (-0.40, 0.25, 0.55) | Yatak ayak ucu yanı |
| **Bilgisayar masası** | (-0.60, 0.40, -0.60) | Sol arka köşe |
| **Dolap (medical cabinet)** | (-1.20, 0.40, ±0.75) | Köşe duvar |
| **Sofa / ziyaretçi koltuğu** | (-1.10, 0.35, 0.75) | Uzak köşe |
| **TV** | (-0.50, 1.70, -0.85) | Duvar mount |
| **Perde** | (1.00, 1.40, 0.90) | Pencere |
| **Tavan ışığı** | (0, 2.40, 0) | Yatak üstü |

**Kural:** Yatak çevresinde 36 inch (0.9 m) clearance her yan — hasta lift, bakım rotasyonu için.

## Mesh adlandırma desenleri (Sketchfab CC BY medical asset)

| Pattern | Tipik içerik |
|---|---|
| `Bed-material`, `Bed_GeoSet0` | Hasta yatağı |
| `IvPole`, `IV_Stand`, `Drip` | İV askısı + serum |
| `Machine`, `Monitor`, `EKG` | Hasta monitörü |
| `OxygenTube`, `Wall_Console` | Duvar konsol/oksijen |
| `ElectricSystm`, `Power` | Güç paneli |
| `Commode`, `Bedside` | Komodin |
| `FoodTable`, `Overbed` | Over-bed table |
| `Curtain`, `Drape` | Perde |
| `Cabinet1`, `Locker` | Dolap |
| `Sofa`, `Couch` | Ziyaretçi |
| `Chair`, `Seat` | Sandalye |
| `Wall1..N`, `Floor`, `Ceiling`, `Ground` | Yapı elemanları (genelde gizlenir) |
| `Door`, `DoorWall`, `Window` | Açıklıklar |
| `Light1..N`, `Lamp` | Aydınlatma |

`HOSPITAL_ROOM_LAYOUT` dict ile eşleştirilir. Eşleşmeyenler `HIDDEN_MESH` set'ine eklenir veya orijinal pozisyonunda bırakılır.

## Pipeline kontrolü

1. **Sketchfab download:** glTF (Auto-Converted) format → zip içinde `scene.gltf` + `ene.bin` + `textures/`
2. **Optimize:** `npx @gltf-transform/cli gltf-transform optimize <in>.gltf <out>.glb --compress meshopt --texture-compress webp --no-simplify`
3. **Boyut hedefi:** 50+ MB → 3-5 MB
4. **Diagnostic:** `scripts/blender-inspect-positions.py` ile mesh pozisyonlarını yazdır
5. **Layout dict yaz:** mesh isimleri + klinik konum
6. **Three.js component:** `scene.traverse` + `HOSPITAL_ROOM_LAYOUT` + `HIDDEN_MESH`
7. **Atıf:** `LICENSE-3D.md`'ye CC BY atıf metni

## İlişkili dosyalar

- `src/components/patient-3d/hospital-room-layout.ts` — layout dict
- `src/components/patient-3d/HospitalRoom.tsx` — scene.traverse component
- `scripts/blender-inspect-positions.py` — mesh world bbox dump
- `src/components/patient-3d/LICENSE-3D.md` — CC BY atıf

## İleri klinik sahneler için yeniden kullanım

Aynı pattern: ICU, ameliyathane, acil, hemodiyaliz birimi, pediatri odası, doğum odası vb. için. Her sahne için ayrı layout dict:
- `icu-room-layout.ts` — ventilator + arteriyel hat + ekstra IV stand
- `or-room-layout.ts` — ameliyat masası + anestezi + cerrah ekipman
- `emergency-bay-layout.ts` — trolley yatağı + defibrillator + crash cart
- `nicu-layout.ts` — incubator + monitör + warmer

Skill prensibi: **multi-mesh klinik sahne → mesh-by-mesh klinik standart layout**.

## Referans

- [SonderCare Hospital-Grade Bedroom Setup](https://www.sondercare.com/learn/senior-caregiving/hospital-grade-bedroom-setup-guide/)
- [Medik Patient Positions Guide](https://www.medik-medical.com/blog/patient-positions-in-medical-bed.html)
- [Standard Patient Bed Specifications](https://sdexpmedical.com/technical-standard-patient-bed-specifications/)
- Three.js docs: `Object3D.traverse`, `Box3.setFromObject`, drei `useGLTF`
