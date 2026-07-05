# Yol Haritası — MediSim TR

> **Tek kaynak.** "Sıradaki iş ne?" sorusunun cevabı SADECE burada.
> Diğer durum dosyaları (`DURUM-BRIEF.md`, arşivdekiler) anlık fotoğraftır, harita değildir.
> Eski v1 harita: `docs/arsiv/YOL-HARITASI-v1-2026-05.md` (20 Mayıs, tamamı aşıldı).

Son güncelleme: **5 Temmuz 2026** (Fable 5 tam-proje denetimi sonrası: motor + 3D + dokümantasyon, 3 paralel derin tarama)

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

## ⏳ Ali Bey'de bekleyen kararlar

1. **Klinik ACTIVE onayları:** anaflaksi deterioration/auscultation, STEMI paketi, opioid pilot, ekipman kataloğu, muhakeme promptları — hepsi DRAFT/REVIEWED, ACTIVE'e sadece Ali Bey geçirir.
2. **Model lisansı:** `patient-mimikli.glb` Daz kökenli — lisans netleşmeden commit yok; kalıcı çözüm MPFB2 (CC0) yeniden üretim.
3. **Push kararı:** ~50 lokal commit `feat/backend-cf-worker`'da ("en nihai halde pushlarız").
4. **Öncelik seçimi:** aşağıdaki A–E hatlarından hangisi önce (öneri: A+B paralel, bkz. gerekçe).

---

## 🎯 Sırada — öncelikli hatlar (Fable 5 denetim çıktısı)

### Hat A — Motor derinleşmesi (güven altyapısı) ⭐ önerilen ilk iş
Denetim bulgusu: motor mimarisi sağlam ama **fizyoloji + farmakoloji test kapsamı ~%50** — Pulse swap'i ve senaryo ölçeklemesi bu motorlara binecek, önce güvence şart.

- [ ] `physiology.ts` test paketi: tick, eskalasyon FSM (after_sec + when_vital), halt/recovery, faz devri — hedef %80+ kapsam
- [ ] `pharmacology/engine.ts` test paketi: modifier çarpan zinciri, kontrendikasyon tetikleyicileri, EcgEffect
- [ ] `teaching.ts`, `variant.ts`, `lab-resolver.ts`, `reasoning.ts` birim testleri
- [ ] `PhaseStateMachine` çıkarımı: physiology.ts'teki dağınık state (halted/stopped/heldSec) tek saf FSM nesnesine — Pulse adaptasyonunu kolaylaştırır
- [ ] `TimeController` soyutlaması: time_scale_override + UI tick → tek etkili dt; ilaç onset'i modlar arası tutarlılık testi
- [ ] Ekipman onset eğrisi (`equipment/types.ts:51` TODO): etki anında değil tick-tabanlı başlasın
- [ ] Ortak `filterByDifficulty` + `clampTowardTarget` helper'ları (3 yerde tekrar eden mantık)

### Hat B — 3D sanal hasta derinleşmesi (görünür değer)
Denetim bulgusu: 3D katman olgun (ref-tabanlı state, memoization, shader guard'lar doğru) — sıradaki sıçrama gerçekçilik.

- [ ] **Fonetik lipsync:** ARKit 52 morph hazır ama sadece jawOpen sinüs osilasyonu kullanılıyor. Hedef: konuşma metni → fonem → morph blend (jawOpen+mouthWide+tongue), SSE chat akışıyla senkron
- [ ] **Animasyon blend tree:** Mixamo klipler statik; crossFade tabanlı durum makinesi (konuşurken öksürme, ağrı + huzursuzluk), vital → blend ağırlığı
- [ ] **Zonal siyanoz/mottling:** mevcut sin-sin-sin deseni jenerik; bölge maskeli (perioral/akral siyanoz, livedo ekstremite) shader
- [ ] **Ekipman fiziği:** IV hattı/O2 hortumu için catenary eğrisi veya hafif rope constraint (hasta hareketinde doğal sarkma)
- [ ] **Ölü kod temizliği:** `CompactVitalsHUD.tsx` sil, `patient-v1.glb` referanslı kırık e2e düzelt, `InternalOrgans` (asset silinmiş, sessiz kapanıyor) kararı: kaldır ya da yeni asset
- [ ] Monitör köşe kutusu overflow denetimi (520px HR kırpılma riski)

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
