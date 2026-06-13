# Faz 3 — Derinlik (Pulse + RPM): Teknik Tasarım

> Durum: **DRAFT — Ali Bey onayı bekliyor**
> Tarih: 13 Haziran 2026
> Bağlam: [`PLAN-SANAL-HASTA-V1.md`](PLAN-SANAL-HASTA-V1.md) §6'nın detaylandırılmış hâli. [`MASTER-REPORT-v3.md`](MASTER-REPORT-v3.md) Bölüm 4.9 (Pulse kararı), 4.4 (animasyon paketi), 4.10 (görsel mapping) üzerine oturur.
> Bu doküman bir **teknik tasarım**dır. İçindeki hiçbir klinik sayı (vital, doz, eşik) GERÇEK iddia değildir; klinik değer DRAFT akışında kalır.

## 1. Hedef ve Kapsam

Faz 1'in oynanabilir döngüsü üzerine iki derinlik katmanı ekler:

- **D.1 — Pulse Engine fizyolojisi:** `SimplePhysiologyProvider`'ın trend-tabanlı kötüleşmesinin yerine, Kitware Pulse Physiology Engine (Apache 2.0) tabanlı fizyolojik tepki. Aynı `PhysiologyProvider` arayüzünün arkasında durur.
- **D.2 — RPM avatar mimik:** Mevcut `patient-mimikli.glb` mankenin morph-target animasyonlarının (göz kırpma, konuşma, ağrı mimiği) Ready Player Me ARKit 52-blendshape standardına taşınması ve TTS lipsync.

**Kapsam dışı (bilinçli):** VR/standalone (Unity park), Emscripten WASM Pulse portu (master rapor 4.9'da ilk faz için reddedildi), RPM Studio programmatic avatar üretimi (lansman sonrası).

**Önkoşul:** Faz 1 (oynanabilir döngü) ve Faz 2 (klinik sahne) tamamlanmış olmalı. Faz 3'e Faz 2 bitmeden girilmez (kapsam şişmesi riski, PLAN §8).

## 2. Mevcut Envanter — Faz 3 Hazırlığı (13 Haziran 2026)

| Bileşen | Durum | Konum / Not |
| --- | --- | --- |
| `PhysiologyProvider` arayüzü | ✅ Sabit | `src/engine/physiology.ts` — 5 metot: `tick`, `applyIntervention`, `notifyStepChange`, `isPhaseHalted`, `getState` |
| `SimplePhysiologyProvider` (Faz 1) | ✅ Canlı | `createSimplePhysiologyProvider(scenario)` |
| `PulsePhysiologyProvider` iskelet | ✅ İskelet | `src/engine/pulse-physiology.ts` — WS yokken Simple'a delege eder, henüz canlı sidecar YOK |
| Pulse veri/aksiyon sözleşmesi | ✅ Tanımlı | `PulsePatientState`, `PulseActionMessage`, `mapPulseStateToVitals`, `mapActionToPulse` |
| Pulse iskelet testleri | ✅ Pass | `tests/engine/pulse-physiology.test.ts` — birim çevirimi + offline delege + sahte WS |
| Görsel mapping katmanı | ✅ Saf TS | `src/clinical/visual-mapping.ts` — `vitalsToVisual()` (siyanoz/solgunluk) |
| Manken morph hedefleri | ✅ Var | `AnatomicPatientModel.tsx` — blink + jaw/mouth lipsync (sinüs tabanlı mock) |
| Pulse sidecar (Node + WS) | ❌ Yok | Deploy yeri/maliyeti açık — **BÜYÜK KARAR** (§7) |
| RPM avatar GLB | ❌ Yok | `public/3d/avatar-rpm.glb` üretilmeli (kullanıcı adımı, §6.5) |
| TTS viseme lipsync | ❌ Yok | Azure tr-TR viseme stream → blendshape eşlemesi |
| `vitalsToVisual` genişletme (pupil/JVD/ödem) | ❌ Kısmi | Şu an sadece `skinTint`/`hr`/`rr` döner |

**Sonuç:** Faz 3'ün D.1 ayağı büyük ölçüde **kontrat doldurma** (iskelet hazır, sidecar bağlama eksik); D.2 ayağı asset üretimi + animasyon işidir.

## 3. Mimari Kararlar

### 3.1 Engine/UI ayrımı korunur

Tüm Faz 3 fizyoloji ve eşleme mantığı `src/engine/` ve `src/clinical/` içinde **saf TypeScript** olarak kalır — React import edilmez. Mevcut `pulse-physiology.ts` ve `visual-mapping.ts` bu kurala uyar (yalnız `./types` ve saf yardımcılar import eder). WebSocket bağlantısı saf modülde `globalThis.WebSocket` üzerinden kurulur; test ortamında `options.webSocketImpl` ile enjekte edilir (React'e bağımlılık yok). React tarafı yalnızca sağlayıcıyı oluşturup `useVitalsTick`'e `provider` prop'u olarak geçer.

### 3.2 `PhysiologyProvider` arayüzü Faz 1 ile birebir aynıdır — swap noktası

Faz 3 Pulse sağlayıcısı, Faz 1'in implemente ettiği **aynı** arayüzü implemente eder (gerçek imza, `src/engine/physiology.ts`):

```ts
export interface PhysiologyProvider {
  tick(vitals: PatientVitals, dtSec: number): PatientVitals;
  applyIntervention(vitals: PatientVitals, action: ActionRef): PatientVitals;
  notifyStepChange(stepId: string | null): void;
  isPhaseHalted(phaseId: string): boolean;
  getState(): PhysiologyProviderState;
}
```

> Not: `PLAN-SANAL-HASTA-V1.md` §3'teki 2-metotlu taslak imza eskidir; bağlayıcı olan, `physiology.ts`'teki bu 5-metotlu imzadır. Bu doküman onaylanınca PLAN §3 buna güncellenir.

**Swap noktasının gerçek konumu:** Sağlayıcı `PatientDialog3DPage`'de değil, **`useScenarioRunner` içindeki provider factory'sinde** oluşturulur (`src/hooks/useScenarioRunner.ts` satır ~112-122, `useMemo` + `providerRef`, session başına instance, key = `${rs.id}:${session.started_at}`). Sayfa (`PatientDialog3DPage.tsx:70`) yalnız `useScenarioRunner({ scenario, autoStartMode })` çağırır ve **değişmez**. Değişen tek satır hook içindeki factory'dir:

```ts
// Faz 1 (useScenarioRunner içi):
const provider = createSimplePhysiologyProvider(rs);
// Faz 3 (sidecar canlıyken):
const provider = createPulsePhysiologyProvider(rs, { wsUrl: PULSE_WS_URL, onConnectionChange });
```

`createPulsePhysiologyProvider(scenario, options)` zaten tüm 5 metodu sağlar ve sidecar bağlı değilken `SimplePhysiologyProvider`'a delege eder. Böylece **senaryolar (`scenario.deterioration`) ve sayfa/UI mantığı değişmeden** sağlayıcı swap edilir. Dürüst nüans: "sıfır UI değişikliği" tam değildir — `useScenarioRunner` hook imzası Pulse seçeneklerini (`wsUrl`, `onConnectionChange`) prop olarak almak için **küçük bir genişleme** gerektirir; ama `useVitalsTick`, aksiyon yolu ve senaryo şeması aynen kalır.

`useVitalsTick` "TEK SAAT" kuralı (her tick = 1 simüle saniye, mod hızıyla ölçeklenir) iki sağlayıcı için de geçerlidir; Pulse sidecar bu yüzden hızlandırılmış simülasyon parametresi (mod 8×/3×) desteklemelidir (§4.4, time-scale uyumsuzluğu).

### 3.3 Otorite devri (authority handoff) tutarlılığı

Pulse bağlıyken **vital otoritesi Pulse'tadır** (`tick` → `mapPulseStateToVitals`); bağlantı yoksa/kopuksa fizyoloji `SimplePhysiologyProvider`'a düşer. Halt/recovery durum makinesi (`deterioration` fazlarının durdurulması) **her iki durumda da fallback'te** tutulur ki bağlantı koparsa kötüleşme/iyileşme tutarlı devam etsin. Bu, mevcut `pulse-physiology.ts` davranışıdır ve `tests/engine/pulse-physiology.test.ts` ile doğrulanmıştır.

### 3.4 Klinik içerik disiplini

Pulse output'u (vital eğrileri, ilaç PK/PD profilleri) **klinik içerik** sayılır. Hiçbir Pulse-türevi sayı bu dokümanda GERÇEK iddia edilmez. Validation spot-check'leri (§5.4) **DRAFT — Ali Bey review** olarak işaretlidir; `ACTIVE`'e geçişi yalnız Ali Bey yapar. Pulse'ta bulunmayan TİTCK-ruhsatlı TR ilaçları için MediSim'in kendi `src/engine/pharmacology/` motoru otorite kalır (Pulse override etmez).

### 3.5 Asset boru hattı

RPM avatar GLB ve mevcut manken: `gltf-transform` + draco zorunlu (GitHub 100MB hard limit). Mevcut `public/3d/patient-mimikli.glb` **161 MB** ve commit edilemez durumda — Faz 3 öncesi draco/meshopt sıkıştırma şarttır (oda+manken birleşik hedef < 5 MB, master rapor asset bütçesi). RPM avatar hedefi: doku WebP 1024px, 52 blendshape'ten yalnız aktif kullanılan ~6 tanesi runtime'da sürülür (GPU morph limiti, §6.4).

## 4. D.1 — Pulse Engine Entegrasyonu

### 4.1 Sidecar mimarisi

```
[Tarayıcı R3F]  ──WebSocket──►  [Node sidecar]  ──binding──►  [Pulse C++ engine]
      ▲                              │
  PatientVitals                 PulsePatientState
  (mapPulseStateToVitals)       (~1 sn'de bir yayın, SI birimleri)
```

- Sidecar her advance-time adımında (örn. 0.05 sn iç adım, ~1 sn dış yayın) `PulsePatientState` JSON'u yayınlar.
- UI → sidecar yönü: `applyIntervention` → `mapActionToPulse(action)` → `PulseActionMessage` → sidecar Pulse `SEAction` (SubstanceBolus vb.) çevirir.
- İlaç eşlemesi `SUBSTANCE_MAP` (`pulse-physiology.ts`): `adrenalin→Epinephrine`, `noradrenalin→Norepinephrine`, `salin_09→Saline`, `ringer_laktat→RingersLactate`. Faz 3'te genişler; haritada olmayan aksiyon `raw` mesaj olur (fallback halt mantığı yine işler).

### 4.2 Birim çevirimi (zaten implemente)

`mapPulseStateToVitals` SI/fraksiyon → UI birimi çevirir: `OxygenSaturation` (0..1) → `spo2` (%), `CoreTemperature_C` → 0.1 yuvarlama, geri kalanı tam sayı yuvarlama. Eksik alanlar mevcut vitalden korunur. Bu davranış `tests/engine/pulse-physiology.test.ts`'te kilitlidir.

### 4.3 Görsel mapping genişletmesi

`src/clinical/visual-mapping.ts` → `vitalsToVisual()` şu an `skinTint` (SpO2<88 siyanoz, SBP<90 solgun), `hr`, `rr` döner. Faz 3'te Pulse'ın sağladığı ek compartment'larla genişler (yeni saf alanlar, hâlâ React'siz, %100 birim test):

- `pupilSize` ← `pupil_reactive` + ortam ışığı (ışık refleksi yoksa sabit dilate)
- `jugularVenousDistension` ← `cvp` (eşik klinik içerik → **DRAFT**)
- `edema` ← Pulse renal/sıvı compartment skoru (**DRAFT**)

Tüm eşik sayıları DRAFT'tır; `vitalsToVisual`'ın mevcut SpO2<88/SBP<90 eşikleri de Faz 1'den DRAFT kabul edilir, Pulse'la birlikte Ali Bey review'a girer. Çıktı `AnatomicPatientModel` prop'larına (`skinTint`, `rr`, ileride `pupilSize`) beslenir.

### 4.4 Bilinen riskler (sidecar)

- **Node binding bakımı belirsiz:** Pulse'ın resmî JS/WASM portu yok; community Node binding maintained olmayabilir (master rapor 12 caveat). Alternatif: Python + gRPC sidecar. Bu, deploy kararıyla birlikte değerlendirilir.
- **Time-scale uyumsuzluğu:** Pulse default gerçek zaman; MediSim mod hızları 8×/3×/1× (`time_scale_override`). Sidecar hızlandırılmış advance-time desteklemeli; desteklemezse eğitim modunda Pulse yerine Simple kullanılır (graceful degrade).
- **Bağlantı kopması:** WS disconnect → fallback fizyolojisi devreye girer, HUD "PULSE BAĞLI/KOPUK" rozeti gösterir (`onConnectionChange`). Reconnect + state replay sidecar tarafında ele alınır.

## 5. D.1 — Test Stratejisi

| Katman | Araç | Dosya / Kapsam |
| --- | --- | --- |
| Birim — map | Vitest | `tests/engine/pulse-physiology.test.ts` (mevcut) — SI→UI çevirim, eksik alan koruması, ActionRef→substance |
| Birim — swap uyumu | Vitest | Aynı dosya — `createPulsePhysiologyProvider` WS yokken `createSimplePhysiologyProvider` ile `toEqual` (arayüz birebirliği) |
| Birim — otorite | Vitest | Aynı dosya — sahte WS bağlıyken Pulse otoritesi (Simple kötüleşmesini ezer), aksiyon sidecar'a iletilir |
| Birim — görsel | Vitest | `src/clinical/visual-mapping.ts` için yeni test — eşik tabloları (DRAFT eşikler test sabitlerinde, klinik onay ayrı) |
| Entegrasyon | Vitest + sahte WS | `useVitalsTick` provider swap'i ile baseline trend değişiminin uygulandığı |
| Smoke E2E | Playwright | Sidecar mock URL ile `/dialog-3d-demo` açılır, "PULSE KOPUK" rozeti + Simple fallback ile oynanabilirlik korunur |

### 5.4 Klinik validation spot-check (DRAFT — Ali Bey review)

Sidecar canlıya alındığında Pulse output literatürle karşılaştırılır (master rapor 4.9; Bray A et al. 2019, doi:10.1007/s42399-019-00053-w hemoraj validation referansı). Bu karşılaştırma kriterleri **klinik içerik** olduğundan DRAFT'tır ve hedef sayıları Ali Bey onaylamadan ACTIVE sayılmaz. Otomatik testte yalnızca "değer şu aralıkta mı" kontrolü yapılır, aralık değerleri review-sonrası sabitlenir.

## 6. D.2 — RPM Avatar Mimik

### 6.1 Mevcut durum ve hedef

`AnatomicPatientModel.tsx` şu an blink (4 sn döngü) ve konuşma (sinüs-mock jaw/mouth) animasyonlarını morph hedef adlarıyla sürüyor (`Eyes_Blink`, `A14_Eye_Blink_Left`, `Mouth_Open`, `A25_Jaw_Open`, vb.). Bu mock yeterince organik değil ve TTS ile senkron değil. Hedef: ARKit 52-blendshape standardına geçiş + TTS-senkron lipsync + ağrı/durum mimiği.

### 6.2 Model varyantı (wrapper-transform kalıbı korunarak)

`AnatomicPatientModel` şu an tek modeli yüklüyor (`MODEL_URL` sabit, `AnatomicPatientModel.tsx:27` → `/3d/patient-mimikli.glb`); `Props` (satır 47) yalnız `breathing/rr/skinTint/speaking/clippingPlanes` içerir — `modelVariant` ya da `patient_position` **yoktur**. Faz 3'te RPM avatar (`/3d/avatar-rpm.glb`) ile mevcut manken arası geçiş için `modelVariant` prop'u eklenir. **Önemli:** Bu eklenti Faz 2'nin hasta-yerleşim çözümüyle (`SceneConfig.patient_position` → **wrapper-transform**, model değiştirme değil) çakışmamalıdır. Yani poz/yerleşim wrapper transform'da kalır; `modelVariant` yalnız hangi GLB'nin yükleneceğini seçer. İki prop seti ayrı sorumluluk taşır ve birlikte tasarlanır (Faz 2 §4.3 + bu bölüm tek `AnatomicPatientModel` Props genişlemesinde uzlaştırılır). Region/landmark koordinatları RPM'in gerçek boyutuna (~1.7 m) göre wrapper scale ile uyumlanır (`rpm-avatar` skill'inde formül; gözle tahmin yok — `docs/memory/medisim_anatomik_landmark.md` canon).

### 6.3 Blendshape sürümü

ARKit 52 standardı (`eyeBlinkLeft/Right`, `jawOpen`, `mouthOpen`, `mouthSmile/Frown`, `browDown`, `browInnerUp`, vb.). Konuşma için `jawOpen`/`mouthOpen` oscillation yerine TTS viseme stream sürer. Ağrı mimiği (`browDown` + `mouthFrown`) senaryo durumuna bağlanır — ağrı skoru (`pain`) eşiği **DRAFT**. Eye blink rastgele aralık (4.5 ± 1 sn), sabit 5 sn robotik durur.

### 6.4 TTS lipsync ve performans

- Azure tr-TR Neural TTS viseme event stream (`{ viseme, audioOffset }`) → ARKit blendshape ağırlığı, audio playback ile senkron.
- GPU morph limiti: 52 blendshape'in tümü sürülmez; anlık aktif ~6 tanesi (blink + konuşma + mimik) tutulur, gerisi 0. Kamera uzaksa (LOD) blendshape devre dışı.
- Asset: RPM GLB doku WebP 1024px (RPM default 2048'den küçültülür), `gltf-transform` + draco.

### 6.5 Asset üretimi (kullanıcı adımı — KVKK/lisans notu)

RPM avatar `public/3d/avatar-rpm.glb` olarak repo'ya konur (kullanıcı readyplayer.me'den Full body + A-pose + ARKit blendshapes + Highest quality export eder, `rpm-avatar` skill prosedürü). **Lisans:** RPM ToS ticari kullanıma izin verir; avatar üretimde gerçek kişi yüzü/fotoğrafı kullanılmaz (KVKK — kimliklendirilebilir biyometrik veri üretmemek için jenerik avatar). Mevcut ses asset'leri için atıf zaten `public/sounds/auscultation/SOUNDS-LICENSE.md`'de; 3D asset atıfları `src/components/patient-3d/LICENSE-3D.md`'de tutulur ve avatar eklenince güncellenir.

### 6.6 Test stratejisi (D.2)

| Katman | Araç | Kapsam |
| --- | --- | --- |
| Birim — viseme map | Vitest | viseme ID → blendshape ağırlık tablosu (saf fonksiyon) |
| Birim — blink/lipsync ağırlık | Vitest | zaman→ağırlık eğrisi sınırları (0..1 clamp, açık-ağız ölü-yüz önleme) |
| Görsel doğrulama | `medisim-3d-vision-test` skill + `test:visual` | Manken/avatar değişikliği commit ÖNCESİ screenshot; anatomik doğruluk |
| Smoke E2E | Playwright | `/dialog-3d-demo` avatar yüklenir, konuşma sırasında ağız hareketi görünür |

## 7. BÜYÜK KARAR — Pulse Sidecar Deploy Yeri ve Maliyeti

Pulse sidecar **harici/dış-servis** ve **maliyet doğuran** bir karardır (geri dönülmez deploy). Bu doküman seçenekleri ve tradeoff'ları sunar; **kararı Ali Bey verir** (CLAUDE.md kural 2 — dış servise deploy istisnası). Hiçbir deploy onaysız yapılmaz.

| Seçenek | Artı | Eksi |
| --- | --- | --- |
| **Fly.io** | Düşük latency (edge), WS dostu, ölçek-sıfır mümkün | C++ binding container imajı büyük olabilir; soğuk başlatma |
| **Railway** | Basit deploy, sabit aylık öngörülebilir maliyet | Edge değil; bölge gecikmesi |
| **Render** | Ücretsiz katman (demo), kolay WS | Ücretsiz katmanda uyku/soğuk başlatma; prod'da ücretli |
| **Self-host (VPS)** | Tam kontrol, maliyet sabit | Bakım yükü, ölçekleme manuel |

Karar verilene kadar `wsUrl` verilmez; `PulsePhysiologyProvider` tamamen `SimplePhysiologyProvider`'a delege eder — **ürün Pulse olmadan da çalışır**. Bu, sidecar'ı isteğe bağlı bir hızlandırma katmanı yapar, zorunlu bağımlılık değil.

İkincil açık karar: Node binding maintained değilse Python+gRPC sidecar'a geçiş (master rapor 12 caveat). Bu da maliyet/bakım etkisi taşıdığından deploy kararıyla birlikte değerlendirilir.

## 8. Riskler

1. **Klinik doğruluk (Pulse + DRAFT eşikler):** Pulse output ve genişletilen görsel/mimik eşikleri klinik içerik; her biri DRAFT akışından geçer, Ali Bey review zorunlu.
2. **Performans:** Oda GLB + RPM avatar (52 blendshape) + Pulse WS + HUD birlikte. Hedef 60 fps masaüstü / 30 fps orta laptop. Önlem: aktif blendshape sınırlama, LOD, draco, WS yayın hızı dengeleme.
3. **Asset boyutu:** Mevcut `patient-mimikli.glb` 161 MB (commit edilemez). Faz 3 öncesi draco/meshopt + oda+manken < 5 MB hedefi şart.
4. **Sidecar bakımı/maliyeti:** §7 büyük kararı çözülmeden D.1 canlıya alınmaz; fallback ile ürün bozulmaz.
5. **TTS senkron kayması:** Viseme audioOffset ile playback drift; sapma toleransı testle sabitlenir.

## 9. Kabul Kriterleri

- `createPulsePhysiologyProvider`, sidecar **olmadan** `SimplePhysiologyProvider` ile birebir aynı sonucu verir (`tests/engine/pulse-physiology.test.ts` yeşil) — UI/senaryo değişmez.
- Sidecar mock WS bağlıyken Pulse otoritesi Simple kötüleşmesini ezer, aksiyon `mapActionToPulse` ile iletilir (mevcut test korunur).
- `vitalsToVisual` genişletmesi (pupil/JVD/ödem alanları) saf TS + %100 birim test; eklenen eşik sayıları DRAFT olarak işaretli, kod yorumunda "Ali Bey review" notu.
- RPM avatar `/3d/avatar-rpm.glb` draco'lu, doku WebP 1024px; `modelVariant` prop'u ile manken↔avatar geçişi çalışır (wrapper-transform poz çözümü korunarak, §6.2).
- Konuşma sırasında TTS-senkron lipsync; blink rastgele aralık; ağrı mimiği `pain` eşiğine bağlı (eşik DRAFT).
- `medisim-3d-vision-test` görsel doğrulama commit öncesi geçer; Playwright `/dialog-3d-demo` smoke yeşil (Pulse kopukken de oynanabilir).
- `npm run build` temiz; mevcut Vitest + Playwright suite pass korunur (466+ vitest tabanı bozulmaz).
- Sidecar deploy **YAPILMAMIŞ** — §7 büyük kararı Ali Bey onayı bekliyor; `wsUrl` boş, ürün fallback ile çalışıyor.

## 10. Açık Sorular (onayla cevaplanmalı)

1. Pulse sidecar deploy yeri/maliyeti (§7 BÜYÜK KARAR) — hangi seçenek?
2. RPM avatar tek hasta mı, yoksa yaş/cinsiyet varyant seti mi üretilsin (PatientVariant ile eşleşme)?
3. Ağrı mimiği ve pupil/JVD/ödem görsel eşikleri için Ali Bey klinik review takvimi — D.1/D.2 hangisi önce review'a girsin?
