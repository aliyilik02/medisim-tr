# Faz 2 — Klinik Sahne: Teknik Tasarım

> Durum: **DRAFT — Ali Bey onayı bekliyor**
> Tarih: 13 Haziran 2026
> Bağlam: [`PLAN-SANAL-HASTA-V1.md`](PLAN-SANAL-HASTA-V1.md) §5 başlığının açılımı. Faz 1 (oynanabilir döngü) bittikten sonra uygulanır.
> Kapsam: Hastayı bir 3D acil servis odasına oturtmak; tıklanabilir muayene noktaları ve kamera presetleriyle sahneyi Faz 1 aksiyon döngüsüne bağlamak. **Bu bir teknik tasarım dokümanıdır; yeni klinik değer (vital, doz, eşik) üretmez.**

## 1. Hedef

Faz 1'de `/dialog-3d-demo` rotasında nötr arka planlı bir manken üzerinde uçtan uca oynanabilir döngü kuruldu. Faz 2 bu mankeni **bir mekâna** taşır: acil servis odası geometrisi, yatağa yatırılmış hasta, sahnede tıklanabilir muayene noktaları (`Hotspot`) ve sabit kamera presetleri. Etkileşim modeli değişmez — sahnedeki tıklama, Faz 1'in mevcut aksiyon paneline komut düşürür.

Bizim fark, mevcut planla aynı: Türkçe klinik içerik, TR kılavuz uyumu, serbest metinli AI hasta diyaloğu. Faz 2 görsel bağlam katar; klinik mantığı **değiştirmez**.

## 2. Mevcut Envanter ve Faz 2 Sınırı (13 Haziran 2026)

| Bileşen | Durum | Not |
| --- | --- | --- |
| `Hotspot`, `SceneConfig` tipleri | ✅ Tanımlı, kullanılmıyor | `src/engine/types.ts` (`Hotspot` satır ~397, `SceneConfig` satır ~405). Hiçbir component/hook bunları henüz tüketmiyor — Faz 2 ilk tüketici. |
| `PhysiologyProvider` arayüzü | ✅ Sabit | `src/engine/physiology.ts` — Faz 2 bu arayüze **dokunmaz**. |
| Manken + nefes + visual mapping | ✅ | `PatientBody3D.tsx`, `AnatomicPatientModel.tsx`, shader `shaders/patientShader.ts`. |
| Kamera | 🟡 Tek sabit rig | `PatientBody3D.tsx` içinde `CameraRig` (`position={[0, 0.27, 2.73]}`, `fov={32}`). Preset/geçiş yok. |
| Prosedür overlay | ✅ | `patient-3d/procedures/` (oksijen maskesi, steteskop). |
| Oda geometrisi (GLB) | ❌ | Yok. Faz 2'nin ana üretim işi. |
| Senaryo orkestrasyonu | ✅ | `src/hooks/useScenarioRunner.ts` — provider yaşam döngüsü, `notifyStepChange`, `applyIntervention` burada. Faz 2 yalnız "tıklama → aksiyon" köprüsü ekler. |
| Görsel doğrulama | ✅ | `3d-vision-tester` agenti (`.claude/agents/3d-vision-tester.md`) + `npm run test:visual` (`e2e/dialog-3d-vision.spec.ts`). |

**Faz 2 NET değildir:** Faz 1 oynanabilir döngüsü (kötüleşen hasta → müdahale → debrief) tam çalışır kabul edilmeden Faz 2'ye girilmez (Kapsam şişmesi riski, plan §8.4). Faz 2 ağırlıklı **asset üretimi + görsel entegrasyon** işidir; yeni motor/şema yazımı minimaldir.

## 3. Mimari Kararlar

1. **Engine/UI ayrımı korunur.** Faz 2 hiçbir React import'unu `src/engine/` içine sokmaz. Sahne tamamen UI katmanıdır (`src/components/patient-3d/` ve `src/pages/`). `SceneConfig`/`Hotspot` zaten saf veri tipleridir; engine bunları üretmez, yalnız senaryo verisi olarak taşır.

2. **`PhysiologyProvider` arayüzü Faz 2'de değişmez.** Faz 2 fizyoloji sözleşmesine dokunmaz. Referans olması için arayüzün **gerçek** imzası (`src/engine/physiology.ts`):
   ```ts
   interface PhysiologyProvider {
     tick(vitals: PatientVitals, dtSec: number): PatientVitals;
     applyIntervention(vitals: PatientVitals, action: ActionRef): PatientVitals;
     notifyStepChange(stepId: string | null): void;
     isPhaseHalted(phaseId: string): boolean;
     getState(): PhysiologyProviderState;
   }
   ```
   Faz 3'te `createPulsePhysiologyProvider` (`src/engine/pulse-physiology.ts`) **aynı beş metodu** implemente eder; UI ve senaryolar değişmez. Faz 2 sahne tıklaması, hâlihazırda `useScenarioRunner` içindeki `applyIntervention` çağrısına akar — yeni bir fizyoloji yolu açılmaz.

3. **Tıklama köprüsü tek yönlüdür: Sahne → Aksiyon paneli.** `Hotspot` tıklaması doğrudan vital/fizyoloji değiştirmez. Yalnızca ilgili aksiyon panelini/sekmesini açar veya bir aksiyon **türü** seçimini hazırlar; gerçek değerlendirme Faz 1'in `useScenarioRunner` → `evaluateAction` → `applyIntervention` yolundan geçer. Bu, klinik mantığın tek noktada kalmasını garanti eder.

4. **Klinik içerik disiplini aynen geçerli.** Faz 2 görsel bir katmandır; ancak `SceneConfig.hotspots` içindeki `associated_step_ids` ve `available_actions` bir senaryonun klinik akışına bağlıdır. Yeni/değişen senaryo alanları `DRAFT` bayrağıyla girer; `ACTIVE`'e geçişi sadece Ali Bey yapar (DRAFT → REVIEWED_PENDING_ACTIVATION → ACTIVE). **Faz 2 hiçbir vital eğrisi, doz veya eşik üretmez.**

5. **Asset boru hattı:** Blender (MCP) ile prosedürel oda → baked AO → glTF export → **`gltf-transform` + Draco sıkıştırma (CLI, `npx`)** → optimize GLB → R3F `useGLTF`. Unity bu boru hattında **yoktur** (plan §7, "Park"). Higgsfield video aracıdır, sahne geometrisi üretmez (plan §7, "Yan rol").

## 4. Faz 2.1 — Acil Servis Odası Geometrisi

### 4.1 Üretim
- Blender MCP ile prosedürel kurulum: zemin, iki duvar (köşe görünüm yeter), hasta yatağı, monitör direği, infüzyon (serum) askısı, basit tavan ışığı kütlesi.
- Unity'deki `HospitalRoomBuilder` denemesi **yalnız konsept referansı**; kod taşınmaz (mimari karar §3.5).
- Aydınlatma baked AO + tek yön ışığı; sahnede gerçek zamanlı gölge maliyeti minimumda tutulur (performans bütçesi §7).
- Doku çözünürlüğü 1K–2K, gerekirse atlas. PBR metallic/roughness sade.

### 4.2 Optimizasyon ve bütçe
- Export sonrası boru hattı (deps'e kurulmaz; CLI ile çağrılır):
  ```
  npx @gltf-transform/cli optimize oda-raw.glb public/3d/er-room.glb \
    --texture-compress webp --compress draco
  ```
- **Hedef:** `public/3d/er-room.glb` < 5 MB (GitHub 100 MB limiti zaten aşılamaz; asıl kısıt indirme süresi + GPU bütçesi).
- Manken (`patient-mimikli.glb`) ile oda **ayrı GLB** kalır; oda lazy-load edilir (`Suspense` + dynamic import, mevcut `PatientBody3D` `Suspense` kalıbı).
- **Not (mevcut borç):** worktree'deki `patient-mimikli.glb` (~161 MB) push'tan önce ayrıca Draco/`gltf-transform` ile küçültülmelidir — bu Faz 2'nin değil, model migrasyonunun açık kalemidir, ama aynı boru hattını kullanır.

### 4.3 Hasta yerleşimi
- Hasta yatağa, mevcut wrapper transform kalıbıyla yerleştirilir (`AnatomicPatientModel` üzerindeki transform). `SceneConfig.patient_position` (`"supine" | "sitting" | "standing"`) yatış pozunu seçer; Faz 2'de en az `supine` desteklenir.
- Yatak yüzeyi ile manken taban düzlemi hizalanır; landmark koordinatları (`docs/memory/medisim_anatomik_landmark.md`) **değişmez** — sahne mankenin altına girer, mankeni yeniden ölçeklemez.

## 5. Faz 2.2 — Tıklanabilir Muayene Noktaları (Hotspot)

### 5.1 Veri kaynağı
- `SceneConfig.hotspots: Hotspot[]` senaryodan gelir. Gerçek tip (`src/engine/types.ts`):
  ```ts
  interface Hotspot {
    id: string;
    label: string;
    position: { x: number; y: number; z: number };
    available_actions: ActionType[];
    associated_step_ids?: string[];
  }
  ```
- `position` **world koordinatıdır** ve landmark dokümanına göre yazılır (gözle tahmin yasak — mimari kural 4). `patient-anatomy` skill'i marker yerleşiminde kullanılır.

### 5.2 Render ve raycast
- Her `Hotspot` için R3F içinde küçük tıklanabilir mesh (mevcut `RegionMarker.tsx` kalıbı genişletilir veya yeniden kullanılır). Hover'da `label` ipucu.
- Tıklama drei `onClick` (perde altında raycast) ile yakalanır; manuel raycaster gerekmez.
- Erişilebilirlik: hotspot listesi ayrıca sağ panelde metin liste olarak da sunulur (sahneye tıklayamayan/klavye kullanıcısı için).

### 5.3 Aksiyon köprüsü
- `available_actions` tipi `ActionType[]`'dir (yalnız aksiyon **türü**: `"give_medication"`, `"auscultate"` vb.) — hazır bir `ActionRef` **değildir**. Yani hotspot tıklaması yalnız ilgili aksiyon **türünü filtreler**; somut hedef (`target_id`/`site`, ör. hangi ilaç, hangi oskültasyon odağı) öğrenci tarafından aksiyon panelinde seçilir. **Bu nedenle `Hotspot` şemasını genişletmeye gerek yoktur** — köprü mevcut tip ile çalışır.
- Tıklama → `hotspot.available_actions` ile filtrelenmiş aksiyon seçenekleri Faz 1 aksiyon paneline düşürülür (yeni `onHotspotSelect` callback'i `PatientDialog3DPage` → `useScenarioRunner` arası). Fizyoloji etkisi **yalnız** mevcut `applyIntervention` yolundan oluşur (§3.3).
- `associated_step_ids` verilmişse ve aktif adım eşleşmiyorsa, hotspot pasif/gri gösterilir (yanlış zamanda muayene engellenmez ama görsel ipucu verilir — klinik karar öğrencinin).

## 6. Faz 2.3 — Kamera Presetleri

- Mevcut tek `CameraRig` (`PatientBody3D.tsx`) preset listesine genişler. Üç preset:
  - **Genel** — odayı ve hastayı gören varsayılan açı.
  - **Baş ucu** — havayolu/yüz/oskültasyon için yakın.
  - **Monitör** — direğe yakın, vital ekran okunur.
- Geçişler yumuşak `lerp` (R3F `useFrame`); ani zıplama yok. Süre kısa (~400–600 ms), klinik monitör estetiğine uygun ölçülü hareket — abartılı sinematik kamera yok.
- Presetler UI'da küçük ikon/etiketli düğmelerle (tasarım dili: ink + teal, mevcut HUD ile tutarlı). Orbit/serbest döndürme opsiyonel kalır.

## 7. Performans Bütçesi

| Hedef | Değer |
| --- | --- |
| Masaüstü | 60 fps |
| Orta seviye laptop | 30 fps |
| Oda GLB | < 5 MB (Draco + WebP doku) |
| Draw call | Oda + manken + HUD birlikte mümkün olduğunca düşük; oda mesh'leri birleştirilir (merge) |
| Yükleme | Oda ayrı chunk, lazy-load; ilk boya mankeni bekletmez |

Doğrulama: `npm run test:visual` (`e2e/dialog-3d-vision.spec.ts`) görsel regresyon + `3d-vision-tester` agenti gerçek tarayıcı screenshot. fps ölçümü için Playwright trace / `performance.now()` örneklemesi smoke testte raporlanır.

## 8. Lisans, Atıf ve KVKK

- **3D asset atıfı:** Üretilen `er-room.glb` ve kaynak modeller (CC BY/CC0 Sketchfab veya Blender prosedürel) `src/components/patient-3d/LICENSE-3D.md` dosyasına işlenir — yeni model eklerken bölüm eklemek zorunludur (dosya kuralı dosyanın başında yazılı).
- **Ses atıfı:** Faz 1.4'te bağlanan oskültasyon sesleri `public/sounds/auscultation/SOUNDS-LICENSE.md`'de; UI "Hakkında" bölümünde gösterimi Faz 1 kapsamındadır, Faz 2 bunu bozmaz.
- **KVKK:** Faz 2 yeni kişisel veri **toplamaz/işlemez/dışarı göndermez** — yalnız statik geometri ve senaryo verisi. Hasta görselleri kurgusaldır (gerçek hasta fotoğrafı/verisi değil). AI diyalog yolu (Gemini `/api/chat`) Faz 1'deki haliyle kalır; Faz 2 yeni bir dış servis çağrısı eklemez. `kvkk-compliance` skill'i, senaryo metni/etiketi düzenlenirse devreye girer.
- **Disclaimer:** "Eğitim amaçlıdır, klinik karar destek değildir" ibaresi sayfada korunur.

## 9. Test Stratejisi ve Kabul Kriterleri

### 9.1 Birim (Vitest)
- `SceneConfig`/`Hotspot` tüketen yardımcılar (hotspot → uygun aksiyon listesi filtresi, `associated_step_ids` aktiflik kontrolü) saf fonksiyon olarak test edilir. Bu mantık `src/engine/` veya `src/lib/` içinde React'siz tutulur (engine/UI ayrımı).
- Mevcut test tabanı (Faz 1 sonu 466 vitest) **kırılmadan** korunur.

### 9.2 Görsel/E2E (Playwright)
- `npm run test:visual` (`e2e/dialog-3d-vision.spec.ts`): oda render olur, manken yatakta, hotspot mesh'leri görünür — referans snapshot ile karşılaştırma (`test:visual:update` ile baseline).
- Yeni smoke: bir hotspot'a tıkla → ilgili aksiyon paneli açılır → aksiyon gönder → vital/skor Faz 1 yolundan değişir → debrief açılır.
- Kamera preset düğmeleri tıklanır, hedef açıya yumuşak geçiş tamamlanır (snapshot per preset).
- `3d-vision-tester` agenti anatomik doğruluğu (hotspot landmark hizası) doğrular.

### 9.3 Kabul Kriterleri
1. `public/3d/er-room.glb` üretildi, **< 5 MB**, Draco sıkıştırmalı; `LICENSE-3D.md`'ye atıf eklendi.
2. Hasta `supine` pozunda yatakta; landmark koordinatları değişmedi.
3. En az 3 `Hotspot` (ör. göğüs/oskültasyon, baş/havayolu, kol/damar yolu) tıklanabilir ve doğru aksiyon panelini açıyor; fizyoloji etkisi **yalnız** `applyIntervention` yolundan geliyor.
4. 3 kamera preseti yumuşak geçişle çalışıyor.
5. `PhysiologyProvider` arayüzü ve `src/engine/` **değişmedi** (engine'de React import yok — `git diff src/engine` boş veya yalnız tip ekleme).
6. 60 fps masaüstü / 30 fps orta laptop doğrulandı (Playwright trace örneklemesi).
7. `npm run build` temiz; mevcut Vitest paketi (466) pass; `test:visual` referansları güncel.
8. Faz 2'de eklenen/değişen senaryo alanları `DRAFT` bayrağında; ACTIVE'e geçiş Ali Bey'de.

## 10. Riskler

1. **Asset boyutu/performans** — oda + 161 MB manken birlikte limit zorlar. Azaltma: manken migrasyonunun Draco küçültmesi Faz 2'nin önkoşulu sayılır; oda ayrı lazy chunk.
2. **Hotspot landmark kayması** — yanlış `position` klinik olarak yanıltıcıdır. Azaltma: landmark dokümanı + `patient-anatomy` skill + `3d-vision-tester` görsel doğrulama; gözle tahmin yasak.
3. **Kapsam şişmesi** — Faz 1 tam bitmeden başlanmaz (plan §8.4).
4. **Tıklama yolunun klinik mantığı atlaması** — köprü tek yönlü tutulmazsa fizyoloji çift yoldan tetiklenebilir. Azaltma: §3.3 tek-yol kuralı + Vitest/E2E ile `applyIntervention` dışında vital değişmediğinin doğrulanması.

## 11. Faz 3'e Devir (kapsam dışı, not)

- **Pulse Engine sidecar** (`src/engine/pulse-physiology.ts` iskeleti hazır): `PulsePhysiologyProvider` aynı arayüzü implemente eder; sahne ve hotspot kodu **değişmeden** Faz 3'te çalışır. Faz 3 bu sahneyi önkoşul alır.
- **BÜYÜK KARAR — Ali Bey onayı:** sidecar deploy yeri (Fly.io / Railway / Render) ve aylık maliyeti geri dönülmez dış-servis kararıdır. Bu doküman seçenek/tradeoff sunmaz bile — Faz 3 dokümanına (`PLAN-FAZ-3-DERINLIK.md` §7) bırakılır; Faz 2 hiçbir deploy yapmaz, hiçbir dış servise bağlanmaz.
- **RPM avatar mimik** (D.2) Faz 3'te; Faz 2 sahnesi avatar swap'ini engellemeyecek şekilde manken wrapper'ını koruyarak bırakır (model değiştirme wrapper-transform kalıbıyla, `AnatomicPatientModel` Props'una doğrudan dokunmadan).
