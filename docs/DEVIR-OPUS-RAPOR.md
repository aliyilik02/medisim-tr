# Devir Raporu — Opus → Fable (Varlık Hattı)

> Tarih: 10 Kas 2026 · Rehber: `docs/DEVIR-OPUS-VARLIK-HATTI.md`
> Meshy kredisi: **harcanmadı** (CLI kurulamadı — bkz. "Yapılamayanlar").

## Özet

| Hat | Durum | Kanıt |
|-----|-------|-------|
| 0 — Yeni hasta (B yolu) | ✅ Aday hazır, **Ali Bey seçimi bekliyor** | `public/3d/candidates/patient-v3-male.glb`, `/dev/hasta-aday` |
| Hareket seti | 🔶 Mevcut klipler ölçüldü; yeni Mixamo klibi indirilemedi (giriş gerekir) | `scripts/audit-clips.mjs` |
| Oda | 🔶 Kroki hazır, **Ali Bey onayı bekliyor** — parça üretilmedi (kural) | `docs/oda-kroki.svg` |
| 1 — Ekipman (Meshy) | ❌ Başlanamadı | Meshy CLI kurulumu izin sistemince reddedildi |
| C — CC4 / MetaHuman | ✅ Kısa lisans notu (aşağıda) | — |

## Hat 0 — Hasta v3 adayı

**Üretilen varlık**

| Ad | Boyut | Kaynak | Lisans | Doğrulama |
|----|-------|--------|--------|-----------|
| `public/3d/candidates/patient-v3-male.glb` | 2.84 MB | MPFB2/MakeHuman CC0 parçaları + v2 erkek gövde/iskelet/klipler | CC0 + Mixamo royalty-free (rig/klip) | glTF-Validator 0 hata · `validate-glb` 52 morph · ekran görüntüsü + video turu |

Hat (tek komut): `bash scripts/patient-v3.sh [saç] [kaş] [göz] [cilt] [aday_adı]`
→ `build_v3.py` (Blender) → `texpass_v3.py` (Blender+numpy) → `inject-v3.mjs` → `retex-v3.mjs` → optimize → GLB kapısı.

**Ölçülen kök nedenler ve düzeltmeler** ("insana benzemiyor")

1. **Yakın kamerada göz/kaş/kirpik/saç kayboluyordu**: görünürlük küresi yanlış (frustum culling). `?cull=0` ile kanıtlandı. → `AnimatedPatientModel` hasta mesh'lerinde `frustumCulled=false`. **Canlı oyunu da düzeltir** (commit 672c74b).
2. **Turuncu ten**: dokulu cilde kod bir kez daha "Akdeniz" çarpanı uyguluyordu (çift boya). → Dokulu modelde çarpan varsayılan tona göreli. **Canlı oyunu da etkiler** (672c74b).
3. **Boyunda koyu halka**: dokudan değil, **UV aktarımından**. Ada sınırındaki yüzler iki UV adasından örnekleniyordu, üçgen dokuda adalar arasına uzanıyordu. Dokusuz deneme dosyasında çizgi kayboldu (kanıt). → `build_v3`: ada-tutarlı UV aktarımı. **Canlı v2 dosyalarında (erkek/kadın/yaşlı) bu hata hâlâ var.**
4. **Göz kırpınca kirpik havada**: parçalarda yüz şekli yoktu. → `inject-v3`: gövdenin 52 ARKit şeklini kirpiğe/kaşa aktarım (kaşa göz anahtarları hariç).
5. **Ağız açılınca boşluk**: diş ve dil yoktu. → MPFB `teeth_base` + `tongue01`, çene anahtarlarıyla bölge-rijit.
6. **Göz**: düşük poligon (96 nokta) → yüksek poligon + saydam kornea kabuğu.
7. **Görünüm**: dikişsiz cilt + parlaklıktan türetilmiş normal harita, kafa derisi/sakal kırlaştırma, kır saç (short02), kalın kır kaş (eyebrow001), hastane mavisi önlük.

**Kabul ölçüsü** (`/dev/hasta-aday` + Playwright video): göz kırpma ✅ · "Göğsüm çok ağrıyor" dudak + diş ✅ · acı ifadesi (kaş + göz kısma) ✅ · ilaç içme klibi ✅ · bilinç kaybında göz kapalı + çene düşük ✅.
Video kendi makinede çekildi (repo dışı); aynısı sayfadan elle izlenebilir.

**Sınırlar (dürüst liste)**
- Yüz/gövde **biçimi** değişmedi: ham Mixamo ağı korunur (MPFB Mixamo iskeleti bu Blender sürümünde ters deformasyon veriyordu — eski not). Yüz biçimi beğenilmezse A+/C yolu gerekir.
- Saç ağı alın üstünde sert bitiyor (short03/short04 denendi, daha kötü).
- Burun deliği bölgesi doku kaynaklı koyu, kusurlu.
- Normal harita dokunun parlaklığından türetildi; gerçek gözenek taraması değil.
- Yalnız erkek varyantı. Kadın/yaşlı/çocuk aynı hattan üretilebilir (`build_v3` parametreli, ham GLB ve makrolar değişir).

## Hareket seti — ölçüm

`node scripts/audit-clips.mjs <hasta.glb>` — 4 hastanın tüm klipleri:
- **Döngü dikişi** her klipte ~1° (temiz). **Tepe hızlar** el/bacakta ≤ 460°/sn (makul).
- **Sonuç: "sapıtma" klip verisinden gelmiyor.** Olası çalışma-anı nedenleri (Fable alanı, DOĞRULANMADI):
  1. `AnimatedPatientModel` titreme/huzursuzluk katmanı kemiğin **Euler** bileşenine ekliyor; `RightHand` bazı kliplerde Euler Y = **83.3°** (takla bölgesi). Öneri: ofseti quaternion çarpımıyla uygula.
  2. Klipler çok kısa (0.8–2.1 sn) → sürekli tekrar, mekanik his.
  3. Kadın hastada `laying_breathless`, `moaning`, `vomiting` klibi **yok** (7 klip, 2'si ayakta).
- Yeni klipler (göğüs tutma, yarı oturur soluma, agonal soluma vb.) **Mixamo girişi** gerektiriyor → Ali Bey indirir, hat hazır (`merge-animations.mjs`).

## Oda krokisi

`docs/oda-kroki.svg`: 5×4×2.6 m. Sedye ortada, başı gaz paneli duvarında; monitör kollu, hastanın sağı-baş ucunda; ventilatör sol-baş ucunda; havayolu arabası baş arkasında; acil arabası + defibrilatör hastanın sağı-ayak tarafında; EKG ve USG solda; kapı ayak ucunda; tavan ayrı parça. Ekip yerleri: havayolu, dolaşım, prosedür, lider. **Onay olmadan parça üretilmedi.**

## C yolu — lisans notu (DOĞRULANMADI, resmi sayfadan teyit şart)

- **MetaHuman**: metahuman.com artık standart Unreal lisansı kapsamında, yıllık geliri 1 milyon $ altına ücretsiz diyor. Unreal dışı kullanım "Non-Engine Product" sayılıyor gibi. Ama glTF'nin başka motorda (three.js) kullanımını açıkça onaylayan resmi metin bulunamadı. Gri alan. Kaynak: [metahuman.com/license](https://www.metahuman.com/en-US/license), [UE forum](https://forums.unrealengine.com/t/can-you-use-metahumans-outside-unreal-projects/628745).
- **Character Creator 4**: standart lisans içerikleri dış motora aktarmaya izin veriyor; satın alınmış içerik ticari oyunda ek lisans istemiyor (personel yanıtı). Yazılım 2022'de 299 $'dı, güncel fiyat ve web/three.js dağıtımına özel şart bulunamadı. Kaynak: [Reallusion içerik politikası](https://www.reallusion.com/license/content.html), [CG Channel 2022](https://www.cgchannel.com/2022/05/reallusion-releases-character-creator-4/).

## Yapılamayanlar ve nedeni

- **Meshy (Hat 1)**: `meshy-cli@0.4.0`, npm'de yayımlanmamış `commander@^15.0.0`'a bağlı (yalnız `15.0.0-0` ön sürümü var). Ayrı klasörde bağımlılığı ön sürüme sabitleyerek kurma girişimi **izin sistemince reddedildi**; etrafından dolaşılmadı. Seçenekler: Ali Bey izni verir · Meshy web arayüzünden elle indirip `public/3d/candidates/` altına koyar (kapılardan ben geçiririm).
- **Yeni Mixamo klipleri**: Adobe hesabıyla giriş gerektirir; giriş bilgisi girilmez.

## Fable'a sorular / devir

1. Ali Bey v3'ü seçerse: `ANIMATED_MODELS["male-adult"].url` → aday dosya (veya `public/3d/patient-v3-male.glb`'ye taşı). `/dev/hasta-aday` ve `modelUrlOverride` geçici; seçim sonrası kalabilir/silinebilir.
2. Canlı v2 kadın/yaşlı dosyalarında boyun UV hatası sürüyor → aynı hat (`build_v3` ada-tutarlı UV) ile yeniden üretilmeli.
3. Titreme katmanı Euler → quaternion (bkz. hareket bulgusu 1).
4. Oda: kroki onaylanırsa `PatientRoomSceneV2.tsx` + `?room=v2`.
