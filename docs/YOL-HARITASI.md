# Yol Haritası — MediSim TR

> **Tek kaynak.** "Sıradaki iş ne?" sorusunun cevabı SADECE burada.
> Diğer durum dosyaları (`DURUM-BRIEF.md`, arşivdekiler) anlık fotoğraftır, harita değildir.
> Eski v1 harita: `docs/arsiv/YOL-HARITASI-v1-2026-05.md` (20 Mayıs, tamamı aşıldı).

Son güncelleme: **12 Temmuz 2026** (2D pivot pilotu canlı + kilitli kararlar bölümü eklendi)

---

## ✅ Bitti (5 Temmuz itibarıyla)

| Alan | Durum |
|------|-------|
| Oynanabilir döngü (eski Faz 1) | `/hasta/:id` canonical — aksiyon UI, gerçek-zamanlı kötüleşme, tetkik, oskültasyon, debrief. Yol-3 (`/dialog-3d-demo`) emekli → redirect |
| 3D yatak-başı sahne | Oda (er-room 3MB) + 4 hasta varyantı (kadın/erkek/çocuk/yaşlı, 10 anim klip) + 12 ekipman prosedürü + Philips-tarzı monitör + 4 kamera preset |
| Faz-senkron mimari | `getActivePhaseSignal` tek kaynak → EKG + kalp sesi + görsel + anlatım |
| Motor birleşmesi | Tek engine (`src/engine/`, 19 dosya ~4.2k satır, saf fonksiyonel, React import 0) |
| Senaryo üretim sistemi | ProductionScenario kontratı + merkezi ekipman mapper + validate v2 + yazar skill v2 + opioid pilot (16→400 hattı hazır) |
| STEMI olgunlaştırma | 6 aşama, ESC 2023 değerleri, REVIEWED_PENDING_ACTIVATION |
| Klinik muhakeme katmanı | Eğitim modunda "neden?" sorusu, cezasız, debrief öğretici (`engine/reasoning.ts`) |
| Tier-2 sınıf altyapısı | D1+JWT auth, öğrenci/sınıf, attempt persistence, eğitmen paneli `/egitmen`, öğrenci ilerleme `/ilerleme`. Backend lokal 12/12 doğrulandı |
| Yan sistemler | Ventilatör demo, TTS (tr-TR) + STT (Whisper tarayıcı-içi, KVKK), FHIR R4 tipleri, NeuroKit EKG |
| Sağlık | tsc 0 hata · **889 vitest pass (60 dosya)** · GLB optimize (168MB→16.7MB) |

## 🧭 Yön kararı (10 Kas 2026) — "bedende muayene"

Hedef: Body Interact'in Türkiye muadili. His görüntü teknolojisinden değil etkileşimden gelir: bedene dokun → faza göre bulgu → karar → hasta tepkisi.

- **Varsayılan görünüm yeniden 3B** (12 Tem 2B pilot varsayılanı geri alındı; 2B/fotoğraf yolu silinmedi, donduruldu).
- **Donduruldu:** yeni senaryo, eğitmen paneli, ventilatör, 2B/fotoğraf yolu, demo sayfaları. Tek vaka (STEMI) "bir daha" dedirtene kadar genişleme yok.
- [x] Muayene sistemi v1 (STEMI): 14 kemik-bağlı nokta, ABCDE çubuğu + süre, faza göre bulgu kartı (ses / göz bebeği ışık yanıtı / kapiller dolum sayacı), sonuç ekranında muayene özeti. Veri `src/data/exam/stemi-exam.ts` — **klinik DRAFT**.
- [ ] Ali Bey: muayene bulguları klinik onayı (DRAFT → ACTIVE) + oynanış testi
- [ ] S3 galo / derinden kalp sesi / normal solunum sesi için lisanslı ses kaydı (şu an yer tutucu ya da sessiz)
- [ ] Oynama ekranı sadeleştirme (sağ panel + ventilatör düğmesi; muayene merkezde)
- [ ] Muayene için e2e testi (Playwright; şu an yalnız birim test + elle ekran görüntüsü turu)
- [ ] Bitti ölçüsü: 5 öğrenci, açıklama yapılmadan 10 dk oynuyor

## ⏳ Ali Bey'de bekleyen kararlar

1. **Klinik ACTIVE onayları:** anaflaksi deterioration/auscultation, STEMI paketi, opioid pilot, ekipman kataloğu, muhakeme promptları — hepsi DRAFT/REVIEWED, ACTIVE'e sadece Ali Bey geçirir.
2. **Model lisansı:** `patient-mimikli.glb` Daz kökenli — lisans netleşmeden commit yok; kalıcı çözüm MPFB2 (CC0) yeniden üretim.
3. **Push kararı:** ~50 lokal commit `feat/backend-cf-worker`'da ("en nihai halde pushlarız").
4. **Öncelik seçimi:** aşağıdaki A–E hatlarından hangisi önce (öneri: A+B paralel, bkz. gerekçe).

## 📌 Kilitli kararlar (ürün-sahibi — DEĞİŞTİRME)

1. **STEMI faz süreleri kasıtlı gerçekçi/hızlı** (12 Tem 2026): klinik modda ~3 dk'da
   asistoliye ilerleme GERÇEKÇİ BASKI olarak korunuyor (acil tıp aciliyet hissi).
   Yavaşlatma önerisi değerlendirildi ve REDDEDİLDİ. `stemi.ts` deterioration
   `after_sec` değerlerine dokunma; yeniden tartışmayı sadece Ali Bey açar.
2. **`draft_gizli: noindex-aktif`** (12 Tem 2026): yarım ürün arama motorlarına
   kapalı — 3 katman (index.html robots meta + `public/_headers` X-Robots-Tag +
   `public/robots.txt` Disallow). GEÇİCİ: canlı lansmanda ÜÇÜ BİRLİKTE kaldırılacak
   (lansman kontrol listesine ekle). Gerekçe: medisim.pages.dev "SimuleHasta"
   olarak indekslenmişti, MedCase rakip gözü açık.

---

## 🎯 Sırada — öncelikli hatlar (Fable 5 denetim çıktısı)

### Hat A — Motor derinleşmesi (güven altyapısı) ⭐ önerilen ilk iş
Denetim bulgusu: motor mimarisi sağlam ama **fizyoloji + farmakoloji test kapsamı ~%50** — Pulse swap'i ve senaryo ölçeklemesi bu motorlara binecek, önce güvence şart.

- [x] `physiology.ts` test paketi: tick, eskalasyon FSM (after_sec + when_vital), halt/recovery, faz devri — %100 stmt
- [x] `pharmacology/engine.ts` test paketi: modifier çarpan zinciri, kontrendikasyon tetikleyicileri, EcgEffect — %96 stmt
- [x] `teaching.ts`, `variant.ts`, `lab-resolver.ts`, `reasoning.ts` birim testleri — hepsi %100 stmt
- [x] **Motor çekirdeği kapsamı** (5 Tem gece, 08d3f7f): evaluateDecisionMulti + küçük dallar — engine toplam %96 stmt / %91 branch (eşik %80 geçildi)
- [x] **Motor genişletmesi** (eda8feb): dallanan karar (DecisionOption.next_step_id — komplikasyon kolu/hızlı yol, zorluk-güvenli) + faz semptom olayları (symptom_events → yönetmen olayı). Senaryo yazarları için hazır; mevcut senaryolara dokunulmadı
- [ ] `PhaseStateMachine` çıkarımı: physiology.ts'teki dağınık state (halted/stopped/heldSec) tek saf FSM nesnesine — Pulse adaptasyonunu kolaylaştırır
- [ ] `TimeController` soyutlaması: time_scale_override + UI tick → tek etkili dt; ilaç onset'i modlar arası tutarlılık testi
- [ ] Ekipman onset eğrisi (`equipment/types.ts:51` TODO): etki anında değil tick-tabanlı başlasın
- [ ] Ortak `filterByDifficulty` + `clampTowardTarget` helper'ları (3 yerde tekrar eden mantık)

### Hat B — 3D sanal hasta derinleşmesi (görünür değer)
Denetim bulgusu: 3D katman olgun (ref-tabanlı state, memoization, shader guard'lar doğru) — sıradaki sıçrama gerçekçilik.

- [x] **Fonetik lipsync:** TR grafem→viseme→9 ARKit morph, TTS senkron (paket 1, commit 0db41a7)
- [x] **Animasyon blend tree:** `engine/animation-director` (katman önceliği + çift-eşik histerezis + minHold) + `useAnimationDirector` UI bağı; arrest hareketsizliği, iskemik ağrı overlay'i (18f039e)
- [x] **Zonal siyanoz/mottling:** bölge maskeli shader (perioral/akral, livedo) + hasta önlüğü; yatak sahnesinde LOKAL-uzay koordinat (Mixamo cm-rig world çöküyor — bcdd5aa)
- [x] **Ekipman fiziği:** TubingLayer — IV hattı + O₂ hortumu catenary sarkma, yumuşatılmış uç takibi
- [x] **Ölü kod temizliği:** CompactVitalsHUD silindi; patient-v1.glb/InternalOrgans referansları zaten temizmiş (doğrulandı)
- [x] Monitör köşe kutusu overflow: sparkline responsive + alt sıra slim kutu (36.8 kırpılmıyor; Playwright scrollWidth denetimi 0)
- [x] **Görsel kalibrasyon (paket 3):** kemik-bind iki-nokta zonal harita (omuz 0.83 + uyluk ortası 0.375 → çene sızıntısı kökten çözüldü, b282f43) + saç kapağı ekvator kesimi (favori yaması yok) + hortum uç doğrulaması. Oda demirbaşları (RoomFixtures ×6) + prosedürel hareket katmanı (agitation: tremor/huzursuzluk) da eklendi (6809344)

### Hat B2 — Görsel/deneyim sıçraması (6 Tem araştırma çıktısı — `docs/ARASTIRMA-GENEL-DEGERLENDIRME-2026-07.md`)
- [x] **SSS cilt shader'ı** — rim-translucency v1 (f4cdecf; ekran-uzayı tam SSS ileriye)
- [x] **IBL + post-proc** — RoomEnvironment PMREM (0.22) + Bloom/Vignette/Noise, ?fx kapılı (f4cdecf)
- [x] **Sesli diyalog** — zaten bağlıymış (speechSynthesis+Whisper+lipsync); HD Gemini TTS opsiyonel çift-kilitli eklendi (3af2311). KALAN: WebAudio faz-tabanlı ortam ses katmanı
- [x] **Kılavuz-karşılaştırmalı debrief tablosu** — engine/debrief-comparison + DebriefScreen 4 sütun (dbb1e9e); karar seçimleri artık results kaydında
- [ ] **Rubrik-tabanlı LLM debrief** (Calgary-Cambridge 71 beceri, grounded LLM-as-judge)
- [ ] Yarışma/leaderboard modu (BI Student Challenge TR muadili) + yetkinlik-haritası dashboard
- [ ] WCAG 2.2 AA: alarm renk+ikon, 3:1 kontrast, renk-körü modu
- [ ] Route kod-bölme (bundle 930KB tek chunk)
- ⚠️ Dış gelişme notları: **RPM kapandı** (rpm-avatar skill arşivlendi — MPFB2/CC0 tek yol) · Pulse tarayıcı-WASM yolu YOK (sidecar planı doğru) · Body Interact'ta Türkçe YOK (pazar penceresi açık) · `medisim.pages.dev` isim çakışması kontrolü (Ali Bey)

### Hat C — İçerik ölçeği (16→400)
- [ ] TODO_KLINIK doldurma turu (Claude.ai; `DURUM-BRIEF.md` listesi)
- [ ] 5-10 yeni senaryo (üretim kontratıyla; toksikoloji/nöroloji/pediatri öncelik)
- [ ] Legacy senaryoların katalog-id'ye taşınması

### Hat D — Tier-2 kalan parçalar
- [ ] Sınıfa self-join (davet kodu ile öğrenci kaydı)
- [ ] Attempt detay görünümü (eğitmen: öğrencinin adım-adım kararları)
- [ ] Geçici şifre akışı (#7 Ali Bey kararı verildi, uygulama bekliyor)
- [ ] Ödev/atama (assignment) sistemi
- [ ] Uzak deploy (Cloudflare prod — **geri dönülmez, Ali Bey onayıyla**)

### Hat E — Faz 3 derinlik (uzun vade)
- [ ] Pulse Engine sidecar (iskelet `pulse-physiology.ts` hazır; WebSocket mock e2e önce)
- [ ] MPFB2 hasta yeniden üretimi (lisans temiz CC0 hat, `blender-medical-modeling` skill)
- [ ] Plan: `docs/PLAN-FAZ-3-DERINLIK.md`

---

## 🧠 Vizyon havuzu (v1 haritadan taşındı, hâlâ geçerli)

| Modül | Not |
|-------|-----|
| ⏪ Zaman Makinesi | Debrief'te adıma geri dön, alternatif kararı oyna. SessionState snapshot — motor buna uygun. Düşük risk, yüksek pedagojik değer |
| 🤖 AI Hasta anamnez derinliği | Saklı bilgi havuzu + soru kalitesi puanlama (Gemini hattı canlı, üstüne kurulur) |
| 🧠 Klinik akıl yürütme şeması | **Kısmen yapıldı** (STEMI muhakeme katmanı) — karar ağacı görselleştirmesi kaldı |
| 🇹🇷 TR-özel katman | TİTCK adları, SUT uyarısı, yerel hastalıklar (KKKA, Behçet, talasemi) |
| 🎮 Çok oyunculu ekip simülasyonu | Backend hazır olunca (Tier-2 üstüne DO ile) |
| 📊 Yetkinlik RPG haritası | Attempt persistence artık var — önü açıldı |
| 🧬 Patofizyoloji canlı animasyon | SVG tabanlı, sanat varlığı bağımlı |

## 🔴 Riskler + tuzaklar

1. **Test boşluğu motorun kalbinde** (fizyoloji/farmakoloji) — Hat A bunun için önce.
2. **Klinik DRAFT birikimi:** ACTIVE bekleyen içerik çoğalıyor; review hattı tıkanırsa içerik ölçeklemesi (Hat C) anlamsızlaşır.
3. **Push edilmemiş ~50 commit** — tek makine riski. Lisans sorunu sadece `patient-mimikli.glb`'de; o dosya gitignore'lanıp gerisi push edilebilir (Ali Bey kararı).
4. **CI lint kırık** (eslint devDep yok) — bilinen, düşük öncelik.
5. Eski tuzaklar geçerli: her şeyi birden yapma · sayı değil kalite (20 mükemmel senaryo) · Unity'ye kaçma yok · fiyat baştan net.

---

## 📊 Başarı göstergeleri

Aktif kullanıcı · senaryo tamamlama oranı · ortalama not dağılımı · NPS · kurumsal lisans · MRR. İlk somut hedef: **1-2 tıp fakültesi hocası pilotu** (Tier-2 sınıf sistemi buna hazır).
