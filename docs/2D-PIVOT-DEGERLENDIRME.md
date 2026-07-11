# 2D Pivot Değerlendirmesi — 11 Temmuz 2026

> Ali Bey kararı: 3D hasta (Three.js) dondurulacak, yerine Higgsfield-üretimi 2D
> durum-bazlı hasta görselleri + müdahale overlay'leri. Motor değişmiyor.
> Bu doküman gerçek kod incelemesine dayalı dürüst değerlendirmedir (kod yazılmadı).

## 1. Motor gerçekten render'dan ayrık mı? — EVET, kanıtıyla

Veri akışı bugün şöyle (`ScenarioBedPlayPage.tsx:293-320`):

```
session.vitals (motor)
  → mapVitalsToVisuals() + applyPhaseVisual(phaseSignal.visual)
  → VisualState { cyanosis:0-1, pallor:0-1, diaphoresis:0-1, mottled:0-1, breathingRate, consciousness }
  → PatientRoomScene props
```

Kritik gözlem: **`VisualState` tamamen render-bağımsız klinik semantik** — içinde
mesh, shader, three.js kavramı yok. Aynı şekilde `PatientRoomScene`'in tüm prop
arayüzü (`PatientRoomScene.tsx:304-334`) soyut: `variant`, `visualState`,
`equipment: EquipmentKind[]`, `decision: ClipDecision` (klip adı + hız + loop —
2D'de "poz kategorisi"ne çevrilebilir), `speaking`, `agitation`. **İstenen
"PatientVisual arayüzü" fiilen zaten var; adı PatientRoomScene Props.**

Sayfadaki takas noktası tek blok: `ScenarioBedPlayPage.tsx:420-434` (15 satır).
Monitör (`VitalMonitorScreen`), diyalog, oskültasyon overlay'i, ventilatör paneli,
debrief — hepsi zaten DOM, hiçbiri 3D'ye bağımlı değil. **Geçiş temizliği: yüksek.**

Tek kaçak: `useAnimationDirector` (sayfa seviyesinde, 3D klip seçer) ve
`vitalsToVisual().skinTint` — bunlar 3D'ye özgü ama saf fonksiyon, 2D modunda
çağrılmasalar da zarar vermezler; flag arkasında atlanır.

## 2. Önerilen soyutlama

```tsx
// src/components/patient-visual/types.ts
export interface PatientVisualProps {
  variant: PatientVariant;
  visualState: VisualState;        // mevcut tip, değişmez
  equipment: EquipmentKind[];      // mevcut tip, değişmez
  pose: PatientPose;               // YENİ: ClipDecision'ın 2D karşılığı
  speaking: boolean;
}

// ScenarioBedPlayPage'de:
{VISUAL_MODE === "3d"
  ? <PatientRoomScene ... />       // dondurulmuş, dokunulmaz
  : <PatientStage2D {...visualProps} />}
```

- **Bayrak:** `VITE_VISUAL_MODE` ortam değişkeni + `?visual=3d` URL override
  (fx kapısındaki mevcut desenin aynısı, `PatientRoomScene.tsx:136-142`).
- **Durum ayrıklaştırma:** `VisualState` sürekli (0-1), 2D görsel ayrık →
  `src/clinical/visual2d-mapper.ts` saf fonksiyonu:
  `(VisualState, phaseSignal) → { base: "baseline"|"distres"|"siyanoz"|"sok"|"arrest", ... }`.
  **Eşik titremesi riski var** (SpO2 91↔92 sınırında görsel zıplar) — çözüm
  repoda hazır: `animation-director`'daki çift-eşik histerezis + minHold deseni
  aynen kopyalanır. Bu mapper vitest'le tam test edilir (3D'de edilemiyordu —
  net kazanç).

## 3. Kombinatoryal patlama — katmanlama doğru, bir şartla

Base(5 durum) × ekipman(12) × varyant(4) çarpımını tek-kare üretmek imkânsız;
katmanlama (base + şeffaf PNG overlay) doğru çözüm. AMA overlay hizalaması ancak
**tüm base kareler aynı kamera + aynı hasta pozu + aynı kadraj** paylaşırsa çalışır.
Bu yüzden:

- Durum başına **serbest yeniden üretim YAPMA** — tek "master" kare üret, diğer
  durumları image-to-image/inpaint ile AYNI kareden türet (Higgsfield bunu yapar).
- Overlay'leri de aynı master kare üstüne üret/kes; `assets/2d-src/` altında
  katman kaynağı sakla (GLB master'ların bugünkü düzeni gibi).
- Poz değişimi gerektiren aksiyonlar (CPR, defib) ayrı tam kare — overlay
  taşımaya çalışma, o karede ekipman gömülü olsun.
- İnce görsel sinyaller (solgunluk/terleme ara değerleri) için kare sayısını
  şişirme: hasta bölgesine hafif CSS filter/tint (mevcut `skinTint` mantığının
  DOM karşılığı) + terleme için yarı şeffaf highlight PNG yeterli.

## 4. Mevcut 3D katmanı: DONDUR + bayrak (silme)

- Etkilenen kod: `src/components/patient-3d/` (~7.000 satır, 30+ dosya) +
  `useAnimationDirector` + `clinical/agitation-mapping`. **Hiçbiri silinmez,
  taşınmaz** — sadece `ScenarioBedPlayPage`'deki 15 satırlık blok bayrakla sarılır.
- `public/3d/` (34MB) deploy'dan çıkarılabilir (2D kararlıysa) — ayrı temizlik turu.
- e2e: `stemi-playthrough` motion-guard'ları (`__bedMetrics`, `__animDecision`)
  3D'ye özgü → 2D modunda yerlerine "durum görseli değişti mi" assert'i gelir
  (daha ucuz, daha az kırılgan — SwiftShader/rAF çilesi biter).
- Vitest'lerin tamamı motor/klinik katmanda — **889 test pivottan etkilenmez.**

## 5. Riskler (önem sırasıyla) + görmediğin şeyler

1. **EN BÜYÜK RİSK KOD DEĞİL, VARLIK ÜRETİM TUTARLILIĞI.** Aynı hastanın 5 durumda
   aynı kimlik/poz/ışıkla üretilmesi image-gen'in bilinen zayıf noktası. Kural:
   önce STEMI × 1 varyant × 5 durum + 3 overlay'lik "kanıt seti" üret, hizalamayı
   ekranda doğrula, ANCAK ondan sonra 4 varyanta çoğalt. Kanıt seti başarısızsa
   pivot görsel stili değişmeli (foto-gerçekçi yerine illüstratif — tutarlılık
   illüstrasyonda çok daha kolay).
2. **Çocuk varyantı:** foto-gerçekçi hasta çocuk görseli üretimi hem model
   kısıtlarına takılır hem hassas — çocuk için baştan illüstratif stil öner.
   (3D'de de çocuk hattı zaten iki kez başarısız olmuştu; 2D burada avantaj.)
3. **Higgsfield lisans/ticari kullanım:** üretilen görsellerin ticari üründe
   kullanım hakkı + kredi şartını lansmandan ÖNCE netleştir (Sketchfab CC-BY
   disiplinin var, aynısını uygula). Ayrıca üretim kredi/maliyet planı — 5 Tem
   notu: hesapta 0 kredi vardı.
4. **Crossfade yeterli mi?** Durum geçişinde evet (çift katman + opacity, 300-500ms).
   Video döngüleri arasında geçişte dikkat: iki `<video>` çift-tamponlu tut,
   yenisi oynamaya başlayınca eskisini söndür — tek elemanla src değiştirmek
   siyah kare yanıptırır. Video döngüsü v2'ye bırakılabilir; statik kare +
   CSS "nefes" ölçekleme (chest bölgesine çok hafif transform) v1 için yeterli
   ve `breathingRate`'i yine gösterir.
5. **Kayıp envanteri (dürüst liste):** oskültasyon noktalarının vücut-üstü
   konumlanması (DOM overlay kalır ama gövdeye "yapışık" hissi azalır), kamera
   açıları, ekipman fiziği (hortum sarkması), lipsync. Bunların pedagojik değeri
   araştırmaya göre düşük — kabul edilebilir kayıp; ama "ürün demosunda vay etkisi"
   3D'nin işiydi, satış demolarında dondurulmuş 3D modu hâlâ gösterilebilir (bayrağın
   ikinci faydası).

## 6. Hat A (motor refactor) ilişkisi — çakışmaz, KOLAYLAŞTIRIR

- Motor hiç değişmediği için pivot Hat A'dan bağımsız; ikisi paralel yürüyebilir.
- R4 (tick re-render izolasyonu) 2D'de DE gerekli: 8Hz vitals tick'i 2D katmanı
  da gereksiz render eder. Ama 2D mapper ayrıklaştırma yaptığı için doğal bir
  memo sınırı oluşur (bucket değişmedikçe görsel katman render olmaz) — pivot,
  perf işini kolaylaştırır.
- `useScenarioRunner` reducer refactor'ü (Hat A) pivottan bağımsız; hangi sıra
  seçilirse seçilsin birbirini bozmaz.

## HÜKÜM

**Bu pivot mantıklı — çünkü motor gerçekten render'dan ayrık (takas noktası 15
satır), 889 test etkilenmiyor, pedagojik kanıt 2D aleyhine değil ve 3D'nin yediği
saat içeriğe dönebilir.** Tek gerçek bahis kod değil, görsel varlık üretiminin
tutarlılığı: STEMI kanıt seti (1 varyant × 5 durum × 3 overlay) üretilip ekranda
doğrulanmadan toplu üretime ve 4 varyanta GEÇME. Kanıt seti tutmazsa stil
illüstratife çekilir, mimari aynı kalır. 3D silinmez — bayrak arkasında dondurulur;
hem geri dönüş sigortası hem satış demosu olarak yaşar.
