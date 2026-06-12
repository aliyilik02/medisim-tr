# Sanal Hasta Planı v1 — "Body Interact" Seviyesi Etkileşimli Simülasyon

> Durum: **DRAFT — Ali Bey onayı bekliyor**
> Tarih: 12 Haziran 2026
> Bağlam: [`MASTER-REPORT-v3.md`](MASTER-REPORT-v3.md) Bölüm 11 sprint planının üzerine oturur.
> Bu doküman onaylanınca fazlar sırayla gece seanslarında uygulanır.

## 1. Hedef

Body Interact'in çekirdek deneyimini web'de kurmak: öğrenci senaryo seçer,
3D hastayla konuşur, muayene eder, tetkik ister, ilaç verir; hasta **gerçek
zamanda** kötüleşir veya düzelir; oturum sonunda kılavuz referanslı debrief alır.

Bizim fark: serbest metinli AI hasta diyaloğu (Body Interact'te menüden seçmeli)
ve Türkçe klinik içerik + TR kılavuz uyumu.

## 2. Mevcut Envanter (12 Haziran 2026)

| Bileşen | Durum | Not |
| --- | --- | --- |
| Senaryo motoru (`src/engine/`) | ✅ Zengin | `ActionStep`, `evaluateAction`, `LabPanel`, `ImagingResult`, `Hotspot`, `SceneConfig`, `MonitorConfig`, `PatientVariant` tipleri tanımlı; `lab-resolver.ts`, `grading.ts` mevcut |
| AI hasta diyaloğu | ✅ Canlı | Gemini 2.5 Flash SSE `/api/chat`, mock fallback |
| Vital HUD + EKG + PALS alarm | ✅ | B.3 |
| 3D manken + nefes + visual mapping | ✅ | `vitalsToVisual` (siyanoz/solgunluk), `useVitalsTick` |
| Oskültasyon ses dosyaları | ✅ İndi | `public/sounds/auscultation/` 4 ogg — **henüz UI'a bağlı değil** |
| Action UI (3D ekranda aksiyon gönderme) | ❌ | Motor hazır, ekran kablosu yok (sprint ⏸ maddesi) |
| Gerçek zamanlı kötüleşme | ❌ | `useVitalsTick` var ama senaryo kaynaklı trend/timeline yok |
| Lab/görüntüleme sipariş UI | ❌ | Motor tarafı (`lab-resolver`) hazır |
| Debrief ekranı | ❌ | `Debrief` tipi + `finalizeSession` hazır |
| Hastane odası sahnesi | ❌ | Unity denemesi var (park), web'de yok |
| Derin fizyoloji (Pulse Engine) | ⏸ | D.1, Faz 3 |
| RPM avatar mimik | ⏸ | D.2, Faz 3 |

Sonuç: Faz 1 ağırlıklı olarak **entegrasyon** işi, yeni motor/şema yazımı az.

## 3. Mimari Kararlar

1. **Engine/UI ayrımı korunur** — yeni döngü mantığı `src/engine/` içinde saf
   fonksiyon olarak yazılır (React import yok), UI sadece çağırır.
2. **`PhysiologyProvider` arayüzü** — Faz 1'deki basit trend modeli ile Faz 3
   Pulse Engine aynı arayüzün arkasında durur:
   ```ts
   interface PhysiologyProvider {
     tick(state: PatientVitals, dtSec: number): PatientVitals;
     applyIntervention(state: PatientVitals, ref: ActionRef): PatientVitals;
   }
   ```
   Böylece Faz 3'te sağlayıcı değişir, UI ve senaryolar değişmez.
3. **Klinik içerik disiplini aynen geçerli** — yeni senaryo alanları
   (kötüleşme eğrileri, lab değerleri) `DRAFT` bayrağıyla girer, `ACTIVE`'e
   geçişi sadece Ali Bey yapar.
4. **Asset boru hattı:** Sketchfab CC BY + Blender MCP (prosedürel/düzenleme)
   → gltf-transform optimize → GLB → R3F. Unity bu boru hattında YOK.

## 4. Faz 1 — Oynanabilir Döngü (tahmin: 2-3 gece seansı)

Amaç: `/dialog-3d-demo` rotasında uçtan uca oynanabilir bir vaka.

### 4.1 Action UI
- Aksiyon paneli: muayene / ilaç / tetkik / prosedür sekmeleri.
- Mevcut `ActionStep` + `evaluateAction` akışına bağlanır; sonuç
  (`ActionOutcome`) toast + vital etkisi + skor olarak işlenir.
- Step ilerleyişi `pickNextStep` ile.

### 4.2 Gerçek zamanlı kötüleşme
- Senaryo şemasına opsiyonel `deterioration` alanı: tedavisiz kalan adımda
  vitallerin saniye bazlı trendi (ör. SBP −2/30sn, SpO2 −1/20sn, taban değerli).
- `SimplePhysiologyProvider` (engine içinde): trend uygular, müdahale trendi
  durdurur/tersine çevirir. `useVitalsTick` bu sağlayıcıyı kullanacak şekilde
  genişler.
- Vital değişimi `vitalsToVisual` üzerinden otomatik görsele yansır (mevcut).

### 4.3 Tetkik sistemi
- Lab sipariş → senaryoda tanımlı gecikme (`LabTimelineEntry`) → sonuç paneli
  (`LabPanel`, bayraklı değerler). Görüntüleme: `ImagingResult` modal
  (mevcut EKG modal kalıbı yeniden kullanılır).

### 4.4 Oskültasyon bağlama (B.5 kapanışı)
- Marker tıklama → bölgeye uygun ses (`heart_normal/61bpm`, `lung_wheeze/crackles`).
- Senaryo `auscultation` alanından bölge→ses eşlemesi; atıflar
  `SOUNDS-LICENSE.md`'de zaten hazır.

### 4.5 Debrief ekranı
- `finalizeSession` + `calculateGrade` çıktısı: zaman çizelgesi (hangi aksiyon
  ne zaman), doğru/eksik/zararlı kararlar, `guideline_references` ile gerekçe.

### Kabul kriterleri
- Bir DRAFT senaryo uçtan uca oynanır: kötüleşen hasta → doğru müdahale →
  stabilizasyon → debrief.
- Vitest: provider trend/müdahale birimleri. Playwright: smoke (aksiyon gönder,
  vital değişimini gör, debrief açılır).
- `npm run build` temiz, 429+ test pass korunur.

## 5. Faz 2 — Klinik Sahne (tahmin: 2 gece seansı)

- **Blender MCP ile acil odası:** yatak, monitör direği, infüzyon askısı,
  zemin/duvar — prosedürel kurulum, baked AO, tek GLB (hedef < 5 MB, draco).
  Unity'deki `HospitalRoomBuilder` denemesi konsept referansı olarak kullanılır
  (kod taşınmaz).
- Hasta yatağa yerleştirilir (mevcut wrapper transform kalıbı).
- Tıklanabilir muayene noktaları: `Hotspot` tipi + raycast; tıklama Faz 1
  aksiyon paneline komut düşürür.
- Kamera presetleri: genel / baş ucu / monitör yakın.
- Görsel doğrulama: 3d-vision-tester ajanı + `test:visual`.

## 6. Faz 3 — Derinlik (D.1 + D.2)

- **Pulse Engine sidecar** (Apache 2.0): Node sidecar + WebSocket,
  `PulsePhysiologyProvider` aynı arayüzü implemente eder
  (bkz. `pulse-engine-binding` skill). Deploy kararı (Fly.io/Railway) ayrı
  onay konusu — **büyük karar, Ali Bey'e sorulur**.
- **RPM avatar** (D.2): ARKit blendshape — göz kırpma, ağrı mimiği, konuşurken
  ağız hareketi (TTS ile senkron). `rpm-avatar` skill kalıbı.

## 7. Araç Entegrasyonu Değerlendirmesi (12 Haziran 2026)

| Araç | Karar | Gerekçe |
| --- | --- | --- |
| **Blender (MCP)** | ✅ Çekirdek | GLB boru hattının doğal parçası; Faz 2 sahne üretimi ve manken düzenlemeleri burada. Ajan screenshot araçlarıyla kendi çıktısını doğrular. |
| **Higgsfield** | 🟡 Yan rol | Video üretir, etkileşimli 3D üretmez. Kullanım: senaryo açılış sinematikleri (olay yeri görüntüsü), tanıtım videosu. Çekirdek döngüde yeri yok. |
| **Unity** | ⏸ Park | Çift motor = çift bakım maliyeti. `medisim-tr-unity` deneme olarak durur; ileride VR/standalone hedefi doğarsa yeniden değerlendirilir. |

## 8. Riskler

1. **Kötüleşme eğrilerinin klinik doğruluğu** — trend değerleri klinik içerik
   sayılır; her senaryo için Ali Bey review zorunlu (DRAFT akışı).
2. **Performans** — oda GLB + manken + HUD birlikte; hedef 60 fps masaüstü,
   30 fps orta seviye laptop. gltf-transform + draco + lazy load.
3. **Ses lisansları** — Wikimedia atıfları UI'da "Hakkında" bölümünde
   gösterilmeli (Faz 1.4 kapsamına dahil).
4. **Kapsam şişmesi** — Faz 1 bitmeden Faz 2 sahne işine girilmez.

## 9. Açık Sorular (onayla birlikte cevaplanmalı)

1. Faz 1 pilot senaryosu hangisi olsun? (Öneri: `anaflaksi` — kısa, net
   kötüleşme/düzelme eğrisi, mevcut sesler uyumlu: taşikardi + wheeze.)
2. Debrief ekranında AI özet (Gemini ile serbest metin değerlendirme)
   ister miyiz, yoksa v1 kural tabanlı mı kalsın? (Öneri: v1 kural tabanlı,
   AI özet Faz 1.5.)
