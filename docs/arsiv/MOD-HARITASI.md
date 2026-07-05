# MOD HARİTASI — Sanal Hasta Giriş Yolları

> Read-only keşif. 17 Haz 2026. Kod değişikliği YOK. Kaynak: 5 paralel okuyucu (route / render / mod / STEMI-commit / kaldırma-etkisi). Karar VERİLMEDİ — sadece harita + etki analizi.

---

## ÖZET HÜKÜM — Kaç yol var?

Ali Bey'in "3 farklı yol" sezgisi **kodla DOĞRULANDI**. Ama bunlar 3 ayrı *render yolu*; üstüne bir de 3 *pedagojik mod* (egitim/klinik/sinav) ve 6 emekli demo route var. Net ayrım:

| # | Yol adı | Route(lar) | Ana sayfa komponenti | 3D render | Amaç | Durum |
|---|---------|-----------|----------------------|-----------|------|-------|
| **1** | **2D Quiz** | `/oyna/:id` | `ScenarioPlayPage` | ❌ yok (2D monitör) | Ucuz quiz katmanı — statik vital, wall-clock farmakoloji | **TAM** (eski altyapı, korunuyor) |
| **2** | **3D Yatak-başı (CANONICAL)** | `/hasta/:id` + `/senaryo-yatak` | `ScenarioBedPlayPage` | ✅ `PatientRoomScene` (supine) | Asıl ürün — yatan hasta + ER oda + köşe monitör + ventilatör + gerçek-zamanlı kötüleşme | **TAM** (pahalı katman, dikey dilim) |
| **3** | **3D Ayakta Diyalog (Faz 1)** | `/dialog-3d-demo` | `PatientDialog3DPage` | ✅ `PatientBody3D` (ayakta) | Faz 1 e2e oynanabilir döngü — ayakta hasta + AI diyalog + anatomik kesim + oskültasyon | **TAM ama EMEKLİ ADAYI** (⚠️ aşağıda) |

**⚠️ Kritik çelişki:** Memory `feedback_dialog3d_kapat` der ki *"`/dialog-3d-demo` emekli; asıl iş yatak-başı"* — ama **kod hâlâ Yol-3'ü aktif route olarak tutuyor** (redirect değil). Yani karar verilmiş, uygulama yapılmamış. Üstelik bazı STEMI özellikleri (oskültasyon ses) **sadece** Yol-3'te yaşıyor — bkz. Bölüm 5.

---

## 1. TÜM ROUTE'LAR (src/App.tsx)

### Aktif route'lar
| Route | Sayfa | Protected | Amaç |
|-------|-------|-----------|------|
| `/` | HomePage | ❌ | Landing |
| `/login` | LoginPage | ❌ | Hoca giriş + davet-kodlu kayıt (Tier-2) |
| `/senaryolar` | ScenarioListPage | ✅ | Senaryo tarayıcı + Launch3DMenu |
| `/oyna/:id` | **ScenarioPlayPage** | ✅ | **Yol-1: 2D Quiz** |
| `/hasta/:id` | **ScenarioBedPlayPage** | ✅ | **Yol-2: 3D yatak-başı canonical** |
| `/senaryo-yatak` | **ScenarioBedPlayPage** | ✅ | **Yol-2 dev gezinti** (paramsız + dropdown) |
| `/dialog-3d-demo` | **PatientDialog3DPage** | ✅ | **Yol-3: 3D ayakta diyalog (Faz 1)** |
| `/senaryo-editor` + `/:id` | ScenarioEditorPage | ✅ | Senaryo editörü (Step 1-6) |
| `/gecmis` | SessionHistoryPage | ✅ | Oturum geçmişi |
| `/klinik-review` | ClinicalReviewPage | ✅ | DRAFT→REVIEWED→ACTIVE dashboard |

### Emekli (redirect → `/senaryolar`)
`/3d-demo` · `/dialog-demo` · `/faz2-demo` · `/animasyon-demo` · `/monitor-demo` · `/ventilator-demo`
→ Fragmentasyon (Stratejik Değerlendirme #3) çözüldü; 6 demo dikey-dilime birleşti.

---

## 2. HASTA RENDER KOMPONENTLERİ

| Komponent | Sahne tipi | Hareketli? | GLB | visualState / phaseSignal | Kim render ediyor |
|-----------|-----------|-----------|-----|---------------------------|-------------------|
| **AnimatedPatientModel** | Yatan (supine) + ayakta demo | ✅ Mixamo iskelet anim + morph lipsync + göz-kırpma | `patient-animated{,-child,-male,-elderly}.glb` (65 kemik, 52 ARKit blendshape) | ✅ `visualState` → per-frame cilt rengi + morph lerp; `clip` prop (laying_idle/talk/pain/cough) | **PatientRoomScene** (Yol-2) |
| **AnatomicPatientModel** | Ayakta konuşan | ✅ shader solunum + morph | `patient-{female-adult,male-adult,child,elderly}.glb` (MPFB2 CC0) | ✅ `visualState` → shader uniform (uCyanosis/uPallor/uDiaphoresis/uMottled) + solunum lerp | **PatientBody3D** (Yol-3) |
| **PatientBody3D** | Ayakta anatomik inceleme | Statik model + dinamik prosedür overlay (stetoskop/IV/O₂/EKG elektrot) | AnatomicPatientModel içinde | ✅ `visualState` geçer | **PatientDialog3DPage** (Yol-3), PatientBody3DDemoPage |
| **PatientRoomScene** | Yatak-başı + ER oda | ✅ hasta anim + solunum; oda statik; ventilatör tıklanabilir | AnimatedPatientModel + `er-room.glb` + prosedürel sedye/IV direği | ✅ `visualState` + `phaseSignal.ekg` + `clip` | **ScenarioBedPlayPage** (Yol-2) |
| **DialogChat** | AI diyalog UI (Calgary-Cambridge 5 aşama) | Metin UI (Gemini/mock SSE) + TTS + STT | YOK (3D değil) | ❌ — `onSpeakingChange` callback → parent 3D ağız anim tetikler | **PatientDialog3DPage** (Yol-3) + **ScenarioBedPlayPage sağ panel sekmesi** (Yol-2) |

**Anahtar:** Her 3D render komponenti `visualState` (faz-senkron siyanoz/solgun/terleme/benekli) + `phaseSignal.ekg`/klip alır. Orkestrasyon hep `useScenarioRunner`.

---

## 3. PEDAGOJİK MOD (PlayMode) × RENDER YOLU KESİŞİMİ

**PlayMode = `egitim | klinik | sinav`** (src/engine/pedagogy.ts). Davranış:

| Mod | autoPlay | showHints | scored | feedback | narration |
|-----|----------|-----------|--------|----------|-----------|
| **egitim** (Öğretici) | ✅ | ✅ | ❌ | ✅ | ✅ |
| **klinik** (Uygulama) | ❌ | ✅ | ✅ | ✅ | ❌ |
| **sinav** (Sınav) | ❌ | ❌ | ✅ | ❌ | ❌ |

### Mod render-bağımsız MI? → **Mimari olarak bağımsız, sayfa katmanında kesişiyor.**

| Sayfa (Yol) | Mod nereden seçiliyor | Default | autoPlay/narration nerede çalışıyor |
|-------------|----------------------|---------|-------------------------------------|
| **Yol-2: ScenarioBedPlayPage** (`/hasta/:id`) | **Launch3DMenu** split-button → `?mod=` query | klinik | ✅ egitim modunda autoPlay + narration paneli AKTİF |
| **Yol-2 dev:** ScenarioBedPlayPage (`/senaryo-yatak`) | `?mod=egitim\|klinik\|sinav` query | klinik | ✅ aynı |
| **Yol-3: PatientDialog3DPage** (`/dialog-3d-demo`) | **HARDCODED `egitim`** (satır ~72; `?mod=` okunmaz) | egitim sabit | ⚠️ daima egitim — mod seçilemez (Faz 1 e2e ağırlığı) |
| **Yol-1: ScenarioPlayPage** (`/oyna/:id`) | **ModeSelector modal** (3 buton) | modal seçim | enablePhysiology=**false**, examPolicy=penalize |

**Sonuç:**
- **Bağımsız** (her yolda çalışır): 3D model render, canlı vital monitör, lab modalleri, ekipman anim.
- **Moda bağımlı:** autoPlay sürücü (sadece egitim + ScenarioBedPlayPage), narration paneli (aynı), feedback metni (sinav'da gizli), harf notu (sadece sinav).
- **Yol-3 mod-kilitli:** PatientDialog3DPage daima egitim — diğer 2 modu DESTEKLEMİYOR.

---

## 4. STEMI FAZ-SENKRON CİLALAMA — HANGİ YOLA DOKUNDU?

| Commit | Değişen dosyalar | Dokunduğu yol |
|--------|------------------|---------------|
| **8c7d268** (EKG) | types, physiology, waveform-engine, adapter, stemi.ts, useScenarioRunner, **ScenarioBedPlayPage**, **PatientDialog3DPage** | Paylaşılan motor + **her iki 3D yol** |
| **37bcbe5** (kalp sesi) | auscultationAudio, scenarioRegions, **PatientDialog3DPage**, SOUNDS-LICENSE | **⚠️ SADECE Yol-3 (diyalog)** + paylaşılan ses |
| **3875e25** (görsel) | clinicalVisualMapping, AnatomicPatientModel, PatientBody3D, **PatientDialog3DPage**, **ScenarioBedPlayPage** | Paylaşılan + **her iki yol** |
| **e02d074** (entegrasyon+narration) | teaching, engine/index, **ScenarioBedPlayPage**, **PatientDialog3DPage** | Motor + **her iki yol** |
| 7052690 (test) | tests/scenarios/stemi-faz-senkron | Paylaşılan motor testleri |
| 8672a02 (fix) | pulse-physiology, **PatientBody3D**, test | Motor + Yol-3 |

**NET HÜKÜM:** STEMI faz-senkron işi **6/6 commit paylaşılan motora** inşa edildi (`getActivePhaseSignal` motorda yaşıyor) ve **her iki 3D yola paralel dağıtıldı** (yatak 4/6, diyalog 5/6). Tek istisna: **kalp sesi (37bcbe5) sadece diyalog yolunda** — yatak-başına henüz taşınmadı.

---

## 5. "3D DİYALOG" (Yol-3) KALDIRMA ETKİ ANALİZİ

> Öneri değil — saf etki analizi.

### Silinecek dosyalar
- `src/pages/PatientDialog3DPage.tsx` (~500 satır) — ana hedef
- `src/pages/PatientBody3DDemoPage.tsx` (~50 satır) — `/3d-demo` zaten ölü
- **Koşullu (Yol-3'e özel, başka kimse kullanmıyor):** `src/components/patient-3d/scenarioRegions.ts` + `auscultationAudio.ts` (yatak-başına entegre EDİLMEMİŞ)

### Kırılan import'lar (App.tsx)
- `lazy(PatientDialog3DPage)` satırı, `isDialog3d` pathname flag, `/dialog-3d-demo` Route bloğu → temizlenir.
- `PatientBody3D.tsx` kendisi **ÖLMEZ** (ama tek tüketicisi Yol-3 + demo).

### Düşen testler
- `e2e/dialog-3d-loop.spec.ts` (6 test) + `e2e/dialog-3d-vision.spec.ts` (8 test) = **14 e2e düşer** (Faz 1 coverage).
- Vitest: PatientDialog3DPage'e özel test YOK → vitest düşmez. patient-3d.test.tsx genel testleri KALIR (yatak-başı hâlâ 3D render ediyor).

### Paylaşılan kod — YAŞAR / ÖLÜR

| Modül | Yatak-başı (Yol-2) da kullanıyor mu? | Diyalog silinse |
|-------|--------------------------------------|-----------------|
| **clinicalVisualMapping** (mapVitals/applyPhaseVisual) | ✅ Evet | ✅ YAŞAR |
| **SimplePhysiologyProvider** / **getActivePhaseSignal** | ✅ Evet | ✅ YAŞAR |
| **teaching / phaseTransitionNarration** | ✅ Evet | ✅ YAŞAR |
| **waveform-engine** (12-Lead EKG modal) | ✅ Evet (modal paylaşımlı) | ✅ YAŞAR |
| **DialogChat** | ✅ Evet (sağ panel sekmesi) | ✅ YAŞAR |
| **auscultationAudio + scenarioRegions** | ❌ **HAYIR** (sadece Yol-3) | ⚠️ **ÖLÜR** |

### 🔴 STEMI işi etkilenir mi?
**Çoğunluk YAŞAR, bir parça ÖLÜR.** Yatak-başı (Yol-2) tüm paylaşılan motoru kullandığı için STEMI'nin vital/EKG/görsel/kötüleşme/narration mekaniği tamamen ayakta kalır. **AMA faz-senkron kalp sesi (oskültasyon, commit 37bcbe5)** sadece Yol-3'e bağlı — yatak-başına taşınmadan Yol-3 silinirse **o STEMI özelliği kaybolur.** Yani diyalogu kaldırmadan önce oskültasyon ses sisteminin ScenarioBedPlayPage'e taşınması gerekir (aksi halde STEMI gerçeklik paketinin ses ayağı düşer).

---

## 6. KARAR İÇİN MASADAKİ NETLİK (karar verilmedi)

1. **3 yol gerçek:** 2D Quiz / 3D Yatak-başı / 3D Diyalog. Amaçları net (yukarıda).
2. **Canonical = Yol-2 (yatak-başı).** Memory + kod fragmentasyon kararı bunu söylüyor.
3. **Yol-3 (diyalog) emekli adayı** ama kod hâlâ aktif + 1 STEMI özelliği (kalp sesi) ona kilitli.
4. **Yol-3 kaldırılabilir** — STEMI'nin %90'ı yaşar; ön koşul: oskültasyon ses (37bcbe5) + scenarioRegions yatak-başına taşınsın, sonra 14 e2e + 2 sayfa silinir.
