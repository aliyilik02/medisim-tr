# MediSim TR — Master Teknik Rapor v3.0 (Mayıs 2026)
## Claude Code Referans Manuali + Klinik/Anatomik Standartlar Rehberi

> Bu doküman, önceki iki raporun (3D motor + AI + Cloudflare karar raporu, Claude Code + tasarım stack + rakipler raporu) **tüm somut kararlarını koruyup**, üzerine **Bölüm 9: Klinik ve Anatomik Standartlar Rehberi**'ni ekler. Claude Code'un her kodlama oturumunda referans alacağı tek master dosyadır.
>
> **Son güncelleme:** 20 Mayıs 2026 — Bölüm 11 sprint tablosu güncel duruma çekildi (B.5 ses altyapısı kod hazır, D.2 fizyolojik animasyon erken parçaları tamamlandı). Stack/standartlar/klinik kurallar (Bölüm 2-10) değişmedi.

---

## BÖLÜM 1 — YÖNETİCİ ÖZETİ (TL;DR)

**Üç cümlede MediSim TR konumu:** R3F + WebGPU + Cloudflare Workers + Gemini 2.5 Flash mimarisinde kalıyoruz; Body Interact'ın 22 Nisan 2026'da İngilizce/İspanyolca beta olarak başlattığı AI-Driven Conversations'a karşı **6–12 aylık Türkçe pencere**miz var; Z-Anatomy CC BY-SA + Pulse Physiology Engine + UÇEP-2020 + TEPDAD 2025 standartları üzerine kurulu yerli içerik bizi taklit edilemez yapacak.

**20 Mayıs 2026 itibarıyla yapıldı (önceki 2 hafta):**
- B.5 oskültasyon ses servisi altyapısı (`auscultationAudio.ts` + region `auscultationSoundId`); ses dosyaları (Wikimedia CC BY-SA) kullanıcı tarafından manuel indirme bekliyor
- D.2 erken parçaları: cilt tonu shader (4 preset — normal/siyanoz/ikter/solgun), çift center solunum (chest + abdomen diafragma simülasyonu)
- A.1 anatomik landmark düzeltme: TA2-2019 / 8-head canon ile marker koordinatları rehesaplama (memory `medisim_anatomik_landmark.md`)
- Memory paketi: 5 referans dosyası (anatomik landmark, klinik anatomi, sağlık standartları, rakip analizi, animasyon teknikleri) + master rapor pointer
- CLAUDE.md master rapor v3.0 ile senkronize (172 satır silindi, 111 eklendi)
- Procedure altyapısı (stetoskop + O2 maskesi animasyonu) — B.5 ile D.2 sınırında, rapor adlandırmasında yok ama temel oldu

**Hemen (0–4 hafta):**
- Ready Player Me avatar entegrasyonu → D.2'yi tamamla (göz blink + ağız + pupil)
- Sprint B.2: AI hasta diyaloğu UI (Gemini 2.5 Flash + Calgary-Cambridge process)
- Cloudflare ticari ekibinden BAA/Veri İşleyici Sözleşmesi **yazılı** doğrulama (Workers/DO/Workers AI kapsamı)
- KVKK 24 Kasım 2025 Üretken Yapay Zekâ Rehberi (64 sayfa) ile iç uyum kontrolü
- TDK Tıp Terimleri + TAKAD anatomi sözlüğü → `.claude/skills/medical-terminology/` altına

**1–3 ay:**
- Sprint B.3 Vital Signs HUD + 12-derivasyon EKG; Sprint B.4 Z-Anatomy multi-mesh + clipping plane
- Sprint C.1 Tailwind v4 + shadcn/ui + marka kimliği
- Sprint D.1 Pulse Physiology Engine Node sidecar (Apache 2.0)
- Custom MCP'ler: `medisim-scenario-engine`, `medisim-anatomy`, `medisim-drugs`
- 2 TEPDAD akredite fakülte ile pilot demo

**3–6 ay:**
- Sprint D.2 fizyolojik animasyon paketi
- Sprint E TR üniversite pilot + KVKK Veri Koruma Etki Değerlendirmesi (VKED)
- USMLE Step1 İngilizce ihracat hazırlığı (UÇEP ↔ USMLE eşleme)
- TEPDAD eşliği başvuru süreci

**Eşik göstergeleri (kararı değiştirenler):**
- Cloudflare BAA Workers/DO kapsamı yazılı kabul **EDİLMEZSE** → Vercel Pro click-through HIPAA BAA + Secure Compute; yan seçenek Turkcell Bulut/TT Bulut.
- iOS Safari WebGPU baseline'ı 26'da kararlıysa WebGPU production; değilse WebGL2 fallback zorunlu.
- 10K aktif öğrenci/ay aşılırsa Workers AI yerine Vertex AI Gemini batch endpoint'i (%50 indirim).
- Body Interact Türkçe arayüz duyurursa pencere kapanır → ek diferansiyel (TUS, TCCC, senaryo authoring) hızlandır.

---

## BÖLÜM 2 — ÜRÜN VİZYONU VE REKABET KONUMU

**MediSim TR 5 farklılaştırıcı eksen:**

1. **Türkçe yerli AI hasta diyaloğu.** Body Interact AI-Driven Conversations beta'da: *"The update is currently optimized for English and Spanish… Support for Android, iOS, and additional languages will follow soon."* (bodyinteract.com/blog/ai-driven-conversations-virtual-patient, 22 Nisan 2026). TR pencere 6–12 ay.
2. **TUS müfredatı eşleştirmesi** — UÇEP-2020 (YÖK) çekirdek hastalık listesi + ÖSYM TUS konularına bire bir hizalı senaryolar. Rakiplerde yok.
3. **TCCC + saha tıbbi** — TSK eşdeğer protokoller + MARCH-PAWS. Dimedus zayıf, Body Interact'ta yok.
4. **ICD-10 + SNOMED CT + RxNorm + LOINC kodlu** — Türkiye Sağlık Bakanlığı uyarlamalı; rakiplerde ya yok ya kısmi.
5. **Senaryo Authoring UI** — React Flow + JSON Schema tabanlı no-code stüdyo, hocaların kendi vakalarını yazabildiği. Body Interact'ta yetkin yazar Take The Wind ekibinde, son kullanıcıya kapalı.

**Rakip karşılaştırma:**

| Ürün | Motor | TR müfredat | TR dil | AI diyalog | Senaryo authoring | TCCC |
|------|-------|-------------|--------|------------|-------------------|------|
| **MediSim TR (hedef)** | R3F + WebGPU | ✅ UÇEP | ✅ | ✅ Türkçe | ✅ | ✅ |
| Body Interact | Unity WebGL (dolaylı kanıt) | ❌ | ❌ | ✅ EN/ES (Nisan 2026) | ❌ kapalı | ❌ |
| Dimedus | Belirsiz | Kısmi | ✅ | ❌ | ❌ | Zayıf |
| BioDigital Human | Proprietary WebGL/WebGPU | ❌ | ❌ | ❌ | ❌ | ❌ |
| CAE LearningSpace | Native + mankenle | ❌ | Kısmi | ❌ | Kısmi | Kısmi |
| Touch Surgery | Mobile native | ❌ | ❌ | ❌ | ❌ | ❌ |
| Visible Body | Native + Web | ❌ | ❌ | ❌ | ❌ | ❌ |
| Complete Anatomy | Native | ❌ | ❌ | ❌ | ❌ | ❌ |

**Türkiye pazarı boşluk analizi:**
- TR dilinde anamnez-fizik muayene-tanı zinciri AI sanal hasta yok (akademik prototip var: Bayram et al. 2025 Yıldız Teknik; ürüne dönüşmedi).
- TUS odaklı senaryo simülatörü yok (sadece soru bankası: Tusdata, Tusem).
- Tıp hocalarının görsel olarak senaryo yazabildiği no-code stüdyo yok.

**Net tavsiye:** Bu 4 boşluğa eş zamanlı saldır. AI diyalog UI'ı Mayıs sonuna kadar canlıya almak kritik.

---

## BÖLÜM 3 — 3D MOTOR VE GÖRSEL MİMARI

**Motor kararı: React Three Fiber'da KAL. Unity REDDEDİLDİ.**

Gerekçeler: Mevcut React 18 + TS + Vite stack + 397 vitest + 9 Playwright E2E yatırımı; web-first dağıtım, kurulum sürtünmesi yok (Body Interact'a karşı diferansiyel); R3F'nin deklaratif JSX modeli Claude Code'un kod üretim hızını Unity C# scripting'e göre 3-4x artırıyor; WebGPU geçişi Three.js r171+ ile mümkün.

**WebGPU geçiş yol haritası:**
- **Three.js r171 Eylül 2025'te yayımlandı**. WebGPURenderer production-ready.
- **WebGPU cross-browser baseline 25 Kasım 2025**: Chrome, Edge, Firefox, Safari.
- iOS Safari 26+ destekli; 26 öncesi WebGL2 fallback zorunlu.
- TSL (Three.js Shading Language) migration: GLSL'den otomatik çevrim var; subsurface scattering manuel TSL'ye taşınır.

**Asset pipeline:**
- **Z-Anatomy** (CC BY-SA 4.0; z-anatomy.com + GitHub Z-Anatomy/Models-of-human-anatomy). 5000+ anatomik yapı, TA2-2019 etiketli, Blender template formatı.
- **AnatomyTOOL Open3Dmodel** (Leiden LUMC + Utrecht UMCU + Maastricht UM + Leuven KU konsorsiyumu) — Z-Anatomy'nin retopologized klinik versiyonu, CC BY-SA, anatomytool.org.
- **gltf-transform** ile Draco edgebreaker + KTX2 (Basis Universal). Hedef: tüm vücut <25 MB ilk yükleme; lazy-loaded organlar <3 MB.

**Performans hedefleri:**
- <100 draw call/frame (InstancedMesh + BatchedMesh).
- <16ms/frame (60 FPS desktop; tablet için 30 FPS kabul).
- Frustum culling default açık (R3F).
- LOD: 3 seviye (yakın/orta/uzak).
- `useFrame` disiplini: state mutation yerine **ref-based**, React re-render etme.

**Subsurface scattering shader:** Three.js resmi `examples/jsm/shaders/SubsurfaceScatteringShader.js` baz; uniformlar `vec3 subsurfaceColor`, `thicknessMap`, `power`.

**Drei kütüphane envanteri:** `useGLTF`, `useAnimations`, `Bounds`, `Html`, `MeshTransmissionMaterial`, `OrbitControls`.

**Suspense + lazy loading:** `<Suspense fallback={<Loader />}>` her ağır organ etrafında.

**WebXR/VR-ready posture:** `@react-three/xr` paketle hazırla, opsiyonel; production'a Sprint F'de.

**Net tavsiye:** WebGPU'yu feature flag arkasında progressively rollout et. WebGL2 fallback en az 12 ay tut.

---

## BÖLÜM 4 — FİZYOLOJİK GERÇEKÇİLİK YOL HARİTASI

Her efekt için kod yaklaşımı + sprint:

1. **Cilt rengi shader (siyanoz/solgunluk/ikter/kızarıklık).** Custom GLSL/TSL fragment shader; uniformlar `vec3 skinTone`, `float pallor`, `float cyanosis` (mavi-mor LUT), `float jaundice` (sarı LUT), `float flush` (kırmızı). Sprint D.2.
2. **Kalp morph target (systole/diastole) BPM senkron.** GLTF morph targets (2 hedef); `useFrame` içinde `sin(t * BPM/60 * 2π)`. Sprint D.2.
3. **Akciğer/göğüs şişme RR senkron.** Mevcut shader-based breathing extend; vertex displacement `sin(t * RR/60 * 2π) * amplitude * normal`. Sprint B.4 polish.
4. **Pupilla reaksiyonu.** Iris/pupil ayrı mesh; `scale.set(pupilSize)`. Klinik state'ten gelir (opioid → mioz, atropin → midriyaz). Sprint D.2.
5. **Jugular venöz dolgunluk (CVP'ye bağlı).** Boyun yumuşak doku lokal vertex displacement; CVP mmHg → amplitude mapping. Sprint D.2.
6. **Peristaltik bağırsak hareketi.** Vertex shader dalga `sin(uv.y * frequency + t * speed)`. Sprint D.2.
7. **Ödem (vertex displacement).** Painted mask × edemaIntensity. Sprint D.2.
8. **Subsurface scattering.** Bölüm 3 SubsurfaceScatteringShader. Sprint D.2.
9. **Pulse Physiology Engine entegrasyonu.**
   - **Lisans Apache 2.0** (Kitware, fork of BioGears, pulse.kitware.com). SaaS uyumlu.
   - C++ → iki yol:
     - **A) Emscripten WASM**: tarayıcı içi, latency sıfır; 5–15 MB bundle, mobil CPU yükü.
     - **B) Node sidecar**: ayrı container (Fly.io/Railway/Render); WebSocket ile R3F'e push; latency 50–200ms.
   - **Karar: B (Node sidecar)** mobil tablet performansı için. WASM Sprint F'de değerlendir.
   - **Validation:** Bray A et al., *"Pulse Physiology Engine: an Open-Source Software Platform for Computational Modeling of Human Medical Simulation,"* SN Comprehensive Clinical Medicine, 2019, doi:10.1007/s42399-019-00053-w.
10. **Klinik state → görsel manipulation mapping katmanı.** Saf TS dosyası `src/clinical/visual-mapping.ts`. Input: `PatientState`. Output: `VisualParams`. **Bu katman %100 birim test edilmeli.**

**Net tavsiye:** Pulse Node sidecar'ı Sprint D.1'de prototiple; visual mapping katmanı saf TS olarak yaz.

---

## BÖLÜM 5 — AI HASTA DİYALOĞU VE TÜRKÇE NLP

**Mimari: Gemini 2.5 Flash birincil + Gemini 2.5 Pro fallback**

**Mayıs 2026 fiyat tablosu (Google AI Developers resmi):**

| Model | Input ($/1M tok) | Output ($/1M tok) | Bağlam |
|-------|------------------|--------------------|--------|
| Gemini 2.5 Flash-Lite | $0.10 | $0.40 | 1M |
| **Gemini 2.5 Flash (birincil)** | **$0.30** | **$2.50** | **1M** |
| Gemini 2.5 Pro | $1.25 (≤200K) / $2.50 (>200K) | $10.00 / $15.00 | 2M |
| Batch API (50% indirim) | -%50 | -%50 | aynı |

**Hasta diyalog turu hesaplaması:** 8 turlu anamnez, input 2K + output 500 tok. Flash maliyeti: 8 × (2K × $0.30 + 500 × $2.50)/1M ≈ **$0.015/diyalog**. 10K öğrenci × 5 diyalog/ay = 50K diyalog/ay = **~$750/ay** Gemini.

**Türkçe medikal LLM ekosistemi:**
- **Trendyol LLM** — yerli, etik güçlü ama medikal değil.
- **SambaLingo-Turkish-Chat** — IEEE 2024 karşılaştırmasında doğruluk en iyi.
- **YTU-CE-COSMOS Turkish-Llama-8B** — Llama 3 8B TR instruction tuning.
- **TURNA** Boğaziçi encoder-decoder.
- **Kumru-2B**, **Turkcell-LLM-7b**, **WiroAI**.
- **Bayram et al. 2025 (Yıldız Teknik):** *Healthcare-Focused Turkish Medical LLM…*, ACM TALLIP 24(11), doi:10.1145/3772000. **167.732 hasta-doktor Q&A çifti**.
- **TurkMedNLI** dataset (PeerJ 2025).

**Karar:** Gemini 2.5 Flash birincil; ileride domain-specific RAG için YTU Cosmos veya Bayram model Cloudflare Workers AI'da host edilebilir.

**Akademik kıyas tabanı:**
- **Mayo Clinic — Cook DA et al., JMIR Med Educ 2025, e68486** — sanal hasta validation çerçevesi.
- **Google AMIE — Tu T et al., "Towards conversational diagnostic artificial intelligence,"** *Nature* 2025 Jun;642(8067):442-450, doi:10.1038/s41586-025-08866-7.

**TTS karşılaştırma:**

| Sağlayıcı | TR desteği | Bağımsız MOS / Skor | Notlar |
|-----------|-----------|---------------------|--------|
| **ElevenLabs Multilingual v2/v3** | İstanbul aksanı | MOS 4.60 (soloa.ai); Turbo v2.5 MOS 4.72 | En düşük WER %2.83 |
| **Azure Neural TTS** (tr-TR-EmelNeural / AhmetNeural) | 140+ locale | MOS 4.0–4.3 | KVKK için Avrupa DC |
| **Inworld Realtime TTS-1.5 Max** | Yeni | Elo 1236 (#1) | İz takip |

**Net tavsiye:** Azure tr-TR-EmelNeural ile başla; ElevenLabs A/B test; Inworld pilot.

**RAG mimarisi:** Cloudflare Vectorize + Gemini Embedding 2. TR kılavuz lisanslı snippet'ler (telif uyumu için izin).

**Anamnez yapıları (Claude Code kural kümesi):**
- **SAMPLE**: Signs/Symptoms, Allergies, Medications, Past medical history, Last oral intake, Events
- **OPQRST** (TCCC/EMS): Onset, Provocation/Palliation, Quality, Region/Radiation, Severity, Time
- **SPIKES** (kötü haber, Hacettepe/Marmara TR adapte)
- **Calgary-Cambridge Guide** (Silverman, Kurtz, Draper 1996; 71 beceri): 5 aşama — Initiating → Gathering → Physical Exam → Explanation & Planning → Closing. AI diyalog UI **process backbone** olarak bunu kullanmalı.

---

## BÖLÜM 6 — BACKEND VE ALTYAPI

**Cloudflare Workers + Durable Objects mimarisi**

**Workers limitleri (11 Şubat 2026 changelog):** Subrequest limiti tamamen **KALDIRILDI**. Bu AI/RAG iş yükleri için kritik.

Diğer limitler: CPU time 30s/req (Paid), wall time sınırsız, 128MB memory, 6MB request body.

**Durable Objects fiyatlama:**
- $0.15/1M DO request
- WebSocket 20:1 (20 WS msg = 1 DO req)
- 400.000 GB-s/ay dahil; aşan $12.50/M GB-s
- **WebSocket Hibernation API**: 10s idle sonrası hibernate
- SQLite Storage: 5GB ücretsiz; sonrası $0.20/GB/ay

**10K aktif öğrenci/ay maliyet tahmini:**
- 50K diyalog × 8 tur × 20 WS msg = 8M WS msg = 400K DO req = **$0.06**
- DO compute (hibernation): minimal
- SQLite: ~500 MB → dahil
- R2 100 GB: **$1.50/ay**
- Vectorize 1M vector × 768 dim: **~$5/ay**
- D1: minimal, dahil
- Pages: ücretsiz
- Gemini Flash: **$750/ay**
- Azure TTS Neural tr-TR (25M char): **$400/ay**
- **Toplam ≈ $1.200/ay** — 10K aktif öğrenci için rahat marj

**KVKK + sağlık verisi (KRİTİK):**
- **KVKK m.6** özel nitelikli sağlık verisi: açık rıza VEYA m.6/3 istisnaları.
- **24 Kasım 2025 Üretken Yapay Zekâ ve Kişisel Verilerin Korunması Rehberi (15 Soruda)** — kvkk.gov.tr/Icerik/8547, 64 sayfa. Privacy by design + privacy by default + VKED zorunlu.
- **12 Mart 2024, 7499 sayılı Kanun** ile KVKK m.9 yurt dışı aktarım esnetildi.
- **2 Ocak 2025 KVKK m.9 Yurt Dışı Aktarım Rehberi**.

**Hasta-kullanıcı veri ayrımı:**
- **Öğrenci PII** (TC, ad, e-posta, performans): KVKK kapsamında.
- **Sentetik hasta verisi** (vakalar): KVKK dışı — gerçek kişiye bağlı değil.

**Cloudflare BAA durumu (KRİTİK UYARI):**
- HIPAA BAA → Cloudflare Enterprise + minimum harcama.
- Workers/DO/Workers AI BAA kapsamı **ürün lansmanı öncesi yazılı doğrulama ŞART.**
- KVKK için BAA gerekmiyor; m.12 veri işleyici sözleşmesi gerekli.

**Alternatif planlar:** Vercel Pro + Secure Compute; Turkcell/TT Bulut.

---

## BÖLÜM 7 — CLAUDE CODE OTONOM GELİŞTİRME EKOSİSTEMİ

**Önerilen MCP listesi:**
- GitHub MCP, Figma MCP, Playwright MCP, Context7 MCP, Sentry MCP, Cloudflare MCP, PubMed/NCBI MCP
- **Custom MediSim MCP'ler:** `medisim-scenario-engine`, `medisim-anatomy`, `medisim-drugs`

**Domain skill'leri (`.claude/skills/<name>/SKILL.md`):**
- `patient-anatomy`, `vital-signs-hud`, `r3f-medical`, `tccc-scenarios`, `medical-ui-patterns`, `kvkk-compliance`, `icd-snomed-rxnorm`, `figma-to-r3f`, `medical-terminology`.

**CLAUDE.md disiplini: <200 satır.** Her sektör SKILL.md'ye yönlendir.

**Subagent / Agent Teams:**
- `clinical-validator`, `kvkk-auditor`, `anatomy-engineer`, `design-engineer`, `test-engineer`, `perf-watcher`, `scenario-author`.

**Maliyet:** 3–8 paralel subagent pratik sweet spot, üstünde Tier 1 ~50 req/dk rate limit nedeniyle queue.

---

## BÖLÜM 8 — TASARIM STACK

**UI/UX:**
- **Tailwind v4** (CSS-first, daha hızlı)
- **shadcn/ui** (Radix UI tabanlı, WCAG erişilebilirlik)
- **Framer Motion**

**Form:**
- **react-hook-form + zod**
- **@rjsf/core** (senaryo authoring kritik)

**Accessibility:** **WCAG 2.2 AA**.

**Türkçe medikal terminoloji standartları:**
- **TDK Tıp Terimleri Sözlüğü** (katalog.tdk.gov.tr)
- **TAKAD** (Türk Anatomi ve Klinik Anatomi Derneği, 1991) — **anatomidernegi.org.tr**
- **Sekiz Dilde Anatomi Terimleri Sözlüğü** (Nobel Tıp Kitabevleri, 2020)
- Kısaltma standartları: TA, NB, SS, SpO₂, DSS, KTA, CRT.

**Marka kimliği:**
- Koyu mavi/gri arkaplan, neon turkuaz/yeşil accent
- **IBM Plex Sans veya Geist** font
- **Logo:** nabız dalgası + tablet/kalp silueti

**Landing:** **Astro 5** (zero JS by default).

**Senaryo authoring UI:** React Flow + TipTap + KaTeX + JSON Schema form + Git-backed versioning.

---

## BÖLÜM 9 — KLİNİK VE ANATOMİK STANDARTLAR REHBERİ ⭐

> Claude Code referans manuali. Her bölüm doğrudan kod üretimine girer.

### 9.A — Anatomik Standartlar

**Birincil standart: Terminologia Anatomica TA2 (2019/2020)**
- FIPAT/IFAA, IFAA General Assembly 2020'de onaylandı.
- **7112 numerik kimlik**, ~7500+ Latince anatomik terim.
- **Lisans: CC BY-ND 4.0** — kelimeler public domain, PDF olduğu gibi paylaşılır.
- Resmi URL: **fipat.library.dal.ca/TA2/**
- Bibliographic: *FIPAT. Terminologia Anatomica. 2nd ed. FIPAT.library.dal.ca. FIPAT, 2019. Approved by IFAA General Assembly, 2020.*
- **Z-Anatomy bu standardı kullanıyor.**

**Türkçe karşılıklar:**
- **TAKAD** (Türk Anatomi ve Klinik Anatomi Derneği, 1991) — anatomidernegi.org.tr
- **TDK Tıp Terimleri Sözlüğü** — katalog.tdk.gov.tr
- **Sekiz Dilde Anatomi Terimleri Sözlüğü** (Nobel Tıp, 2020) — TR + 7 dil
- *Latince-Türkçe-Osmanlıca Anatomi Sözlüğü* (Zeki Zeren, 1946; 1229 terim)

**Tamamlayıcı standartlar:**
- **FMA** (Foundational Model of Anatomy, University of Washington, 75K+ kavram, OBO ontology)
- **SNOMED CT Body Structure hierarchy**
- **BodyParts3D** (Database Center for Life Science, Japan; 382 yapı, CC BY-SA)

**Vücut bölgesi taksonomisi:**
```
body
├── head_and_neck (cranium, face, scalp, neck zones)
├── thorax (anterior_chest, posterior_chest, lateral_chest)
├── abdomen (RUQ, LUQ, RLQ, LLQ, epigastrium, umbilical, hypogastrium, flanks)
├── pelvis
├── upper_extremity (shoulder, arm, forearm, hand)
└── lower_extremity (thigh, knee, leg, foot)
```

**Anatomik referans noktaları (landmark):**
- **Louis açısı (sternal angle)** — T4–T5, 2. kosta. EKG V1–V2 referansı.
- **Midklavikular hat (MCL)** — sol MCL 5. ICS = mitral / PMI / V5.
- **Midaksiller hat (MAL)** — V6, akciğer alt sınırı.
- **Ksifoid** — CPR el pozisyonu için.
- **Umbilikus** — T10 dermatom; abdomen quadrant kesişimi.
- **ASIS** — McBurney referansı.
- **Pubik simfiz**.

**Auskültasyon noktaları (kalp) — APE T M mnemonic:**

| Nokta | Konum | Duyulan |
|-------|-------|---------|
| **A**ortik | 2. ICS, **sağ** sternal kenar | S2 baskın |
| **P**ulmoner | 2. ICS, **sol** sternal kenar | S2 baskın |
| **E**rb noktası | 3. ICS, **sol** sternal kenar | S1 + S2 eşit |
| **T**riküspit | 4–5. ICS, sol alt sternal | S1 baskın |
| **M**itral | 5. ICS, sol MCL (= PMI / apeks) | S1 baskın |

**Akciğer auskültasyon — lob bazlı sistematik:**
- **Anterior:** sağ üst lob, sağ orta lob, sol üst lob/lingula
- **Lateral:** sağ orta lob, sol üst lob lingula
- **Posterior:** üst-orta-alt zonlar

**Palpasyon haritası (abdomen):**
- 4-kuadrant
- **McBurney:** ASIS–umbilikus 1/3 lateral → apandisit (sens. **50–94%**, spes. **75–86%** — StatPearls NBK459220)
- **Murphy:** RUQ palpasyon inspirasyon durur → akut kolesistit
- **Rovsing:** LLQ palpasyon RLQ ağrı → apandisit
- **Blumberg (rebound):** peritonit
- **Aort palpasyonu:** orta abdomen, AAA taraması

### 9.B — Klinik Kılavuz Standartları

**TÜRKİYE KILAVUZLARI (her senaryoda en az 1 TR kılavuz):**

| Kısaltma | Tam ad | URL |
|----------|--------|-----|
| **TARD** | Türk Anesteziyoloji ve Reanimasyon Derneği | tard.org.tr |
| **TKD** | Türk Kardiyoloji Derneği | tkd.org.tr |
| **TTD** | Türk Toraks Derneği | toraks.org.tr |
| **TND** | Türk Nöroloji Derneği | noroloji.org.tr |
| **BDHD** | Türk Beyin Damar Hastalıkları Derneği | bdhd.org.tr |
| **Türk Pediatri Kurumu** | (1930) | turkpediatri.org.tr |
| **Milli Pediatri** | | millipediatri.org.tr |
| **ATUDER** | Acil Tıp Uzmanları Derneği | atuder.org.tr |
| **TATD** | Türkiye Acil Tıp Derneği | tatd.org.tr |
| **TGD** | Türk Gastroenteroloji Derneği | tgd.org.tr |
| **TJOD** | Türk Jinekoloji ve Obstetrik Derneği | tjod.org |
| **Türk Perinatoloji** | | perinatoloji.org.tr |
| **EKMUD** | Türkiye Enfeksiyon Hastalıkları | ekmud.org.tr |
| **ÇAYD** | Türk Çocuk Acil Tıp ve Yoğun Bakım | cayd.org.tr |
| **TAKAD** | Türk Anatomi ve Klinik Anatomi | anatomidernegi.org.tr |
| **TTB-UDEK** | | ttb.org.tr/udek/ |
| **SB** | T.C. Sağlık Bakanlığı | saglik.gov.tr |
| **TİTCK** | Türkiye İlaç ve Tıbbi Cihaz Kurumu | titck.gov.tr; recetem.titck.gov.tr |

**Eğitim standartları:**
- **UÇEP-2020** — yok.gov.tr/Documents/Kurumsal/.../mezuniyet-oncesi-tip-egitimi-cekirdek-egitimi-programi.pdf
- **TEPDAD Mezuniyet Öncesi Tıp Eğitimi Ulusal Standartları 2025** — tepdad.org.tr/belgeler/

**ULUSLARARASI KILAVUZLAR:** ESC, AHA, ERC, ACOG, WAO, WSES, WALLS, SSC, BTF, ATLS, NRP, WHO, GINA, GOLD, KDIGO, NICE.

**TCCC (Tactical Combat Casualty Care):**
3 fazı: **CUF** (Care Under Fire) → **TFC** (Tactical Field Care) → **TACEVAC**.

**MARCH-PAWS algoritması:**
- **M**assive hemorrhage (turnike, hemostatik gaz)
- **A**irway (NPA, krikotirotomi)
- **R**espiration (göğüs dekompresyonu)
- **C**irculation (IV/IO, TXA, kan ürünleri)
- **H**ypothermia/Head injury
- **P**ain (Triple-Option: meloksikam, asetaminofen, ketamin)
- **A**ntibiotic (moksifloksasin/ertapenem)
- **W**ounds
- **S**plinting

> Stop the Bleed: *">%90 of 4,596 combat deaths post 9/11 died of hemorrhage. Bu yüzden 'M' MARCH'ın başında."*

**TR Triyaj sistemleri:**
- **3-renk SB triyaj**: kırmızı (acil), sarı (acele), yeşil (acil olmayan).
- **5-seviye ESI**: 1 (yaşam kurtarıcı) → 5 (kaynak gerekmez).
- **Yataklı Sağlık Tesisleri Acil Servis Tebliği** — Resmi Gazete 13.09.2022.

### 9.C — Senaryo Standartları (UÇEP + USMLE eşleme)

**UÇEP-2020 yetkinlik haritası:** Çekirdek hastalıklar + çekirdek hekimlik uygulamaları + davranışsal/sosyal ekleri. Senaryo metadata'sında zorunlu `ucep_codes: string[]`.

**TUS müfredatı eşleştirmesi:** ÖSYM TUS klinik bilimler → UÇEP %85+ örtüşür. `tus_topics: string[]`.

**USMLE eşleme:** USMLE Step 1 Content Outline → UÇEP örtüşür.

**Senaryo şablonu TypeScript interface (zorunlu alanlar):**

```typescript
interface MediSimScenario {
  id: string;
  slug: string;
  version: string;
  status: 'DRAFT' | 'REVIEWED_PENDING_ACTIVATION' | 'ACTIVE' | 'ARCHIVED';
  reviewed_by?: string;
  reviewed_at?: string;

  difficulty: 'foundation' | 'intermediate' | 'advanced';
  estimated_duration_min: number;
  target_audience: ('medical_student' | 'nursing' | 'emergency_medic' | 'military_tccc')[];

  ucep_codes: string[];
  tus_topics: string[];
  usmle_step_topics?: string[];

  icd10_codes: string[];
  snomed_ct_codes: string[];
  rxnorm_codes?: string[];
  loinc_codes?: string[];

  patient: {
    age: number;
    age_unit: 'day' | 'week' | 'month' | 'year';
    sex: 'male' | 'female' | 'other';
    weight_kg: number;
    height_cm: number;
    gestational_age_weeks?: number;
    pregnancy_trimester?: 1 | 2 | 3;
    social_history: { smoking: boolean; alcohol: string; occupation: string; };
    allergies: string[];
    chronic_meds: string[];
  };

  initial_vitals: {
    hr: number; rr: number; sbp: number; dbp: number;
    spo2: number; temp_c: number; gcs: number;
  };

  history: {
    chief_complaint: string;
    hpi: string;
    pmh: string[];
    psh: string[];
    family_history: string[];
    social_history_detailed: string;
    medications: string[];
    allergies_detailed: string;
  };

  physical_exam: {
    general: string;
    head_neck: string;
    cardiovascular: { auscultation: AuscultationFinding[]; jvp_cm?: number; };
    respiratory: { auscultation: LungAuscultation[]; };
    abdominal: { palpation: AbdominalFinding[]; auscultation: string; };
    neurological: { gcs: number; pupils: string; cn: string; motor: string; };
    extremities: string;
  };

  labs: LabResult[];
  imaging: ImagingResult[];

  decision_tree: DecisionNode;

  scoring_rubric: {
    critical_actions: { action: string; points: number; required: boolean; }[];
    time_limits: { milestone: string; max_minutes: number; }[];
    penalty_actions: { action: string; points: number; }[];
  };

  // ZORUNLU — en az 1 TR kılavuz
  guideline_references: {
    society: string;
    title: string;
    year: number;
    url?: string;
    section?: string;
  }[];

  i18n: {
    tr: { title: string; summary: string; };
    en?: { title: string; summary: string; };
  };
}
```

**Pediatrik yaş-spesifik vital aralıklar (PALS Guidelines 2015):**

| Yaş grubu | HR uyanık | HR uyku | RR | SBP | Hipotansiyon eşiği |
|-----------|-----------|---------|-----|------|---------------------|
| Yenidoğan (<28 gün) | 100–205 | 90–160 | 30–53 | 67–84 | <60 |
| Bebek (1–12 ay) | 100–190 | 90–160 | 30–53 | 72–104 | <70 |
| Toddler (1–2 y) | 98–140 | 80–120 | 22–37 | 86–106 | <70+(yaş×2) |
| Okul öncesi (3–5 y) | 80–120 | 65–100 | 20–28 | 89–112 | <70+(yaş×2) |
| Okul (6–11 y) | 75–118 | 58–90 | 18–25 | 97–115 | <70+(yaş×2) |
| Adolesan (12–15 y) | 60–100 | 50–90 | 12–20 | 110–131 | <90 |
| Erişkin (>18 y) | 60–100 | — | 12–20 | 90–120 | <90 |

**Vücut ısısı:** Rektal 36–38, oral 35–37, aksiller 36–37, timpanik 35–38 °C.

**SpO₂:** Yenidoğan dönemi düşük; sonrasında <90–92% anormal.

**Gebelik:** Trimester-spesifik fizyoloji (CO +%30–50, plazma volümü +%40, HR +10–15 bpm).

### 9.D — Klinik Gerçekçilik Kuralları

**Kural 1 — İlaç dozajı:**
- Pediatride **zorunlu** mg/kg + max doz.
- Erişkin standart + organ fonksiyonu ayarı.

**Kural 2 — Reçete sınıflandırması (TR):**
- **Beyaz:** rutin
- **Kırmızı:** narkotik (morfin, fentanil, oksikodon; 1985)
- **Yeşil:** psikotrop (alprazolam, diazepam, ketamin; 1986)
- **Mor:** kan ürünleri, büyüme hormonu
- **Turuncu:** hematolojik faktörler
- Tüm reçeteler **TİTCK Reçetem Sistemi**: recetem.titck.gov.tr

**Kural 3 — Türkiye'de kayıtlı ilaç:** TİTCK ruhsatlı olmalı.

**Kural 4 — Vital normalleri yaş-spesifik.**

**Kural 5 — Hasta kodlaması:** ICD-10 + SNOMED CT + LOINC + RxNorm.

**Kural 6 — Acil triyaj:** TR SB 3-renk + ESI 5-level + CTAS.

**Kural 7 — Atipik prezentasyonlar:** Pediatrik MI, yaşlı sessiz MI, gebede apandisit yer değişimi, vb. Her advanced senaryoda en az 1 atipik özellik.

### 9.E — Klinik İçerik Üretim Disiplini (zorunlu Claude Code kuralları)

**ÜST KURAL: Klinik kararlar otonom olarak VERİLMEZ. Kullanıcı (Ali Bey, doktor) onayı zorunludur.**

**Bayrak hiyerarşisi:**
- `DRAFT` — Claude Code üretebilir
- `REVIEWED_PENDING_ACTIVATION` — Ali Bey onayı bekliyor
- `ACTIVE` — production
- `ARCHIVED` — pasif

**Validator severity:**
- `info`: stil önerisi
- `warning`: klinik tutarlılık şüphesi
- `error`: blok — ICD-10 geçersiz, ilaç dozu kg-bazlı değil, kaynak kılavuz yok

**Commit kuralları:**
- Klinik dosya `git commit --no-verify` sadece Ali Bey onaylı PR'da.
- Commit mesajı `[CLINICAL:REVIEWED]` prefix.

**Kaynak kılavuz referansı:** Her `decision_tree` node + her `scoring_rubric` action, en az 1 `guideline_references` entry'sine atıf vermeli. Bu zorunlu validator kontrolü.

**Çift dil etiket:** TR (primary) + EN (export opsiyonel).

---

## BÖLÜM 10 — KVKK + HUKUKİ + ETİK FRAMEWORK

**KVKK m.6 özel nitelikli kişisel veri:** Sağlık verisi açık rıza VEYA m.6/3 istisnaları.

**KVKK 24 Kasım 2025 ÜYZ Rehberi (15 Soruda) — 64 sayfa — kvkk.gov.tr/Icerik/8547**
- Privacy by design + privacy by default + yaşam döngüsü VKED
- Her ÜYZ işleme adımı (geliştirme/çalıştırma/çıktı üretimi) bağımsız işleme

**KVKK m.9 yurt dışı aktarım:**
- **12 Mart 2024, 7499 sayılı Kanun** esnetildi
- **2 Ocak 2025 KVKK m.9 Rehberi**
- Gemini API + Cloudflare → standart sözleşme + bağlayıcı kurumsal kurallar

**Hasta-kullanıcı veri ayrımı (KRİTİK):**
- **Öğrenci PII** KVKK m.6 zorunlu
- **Sentetik hasta verisi** KVKK dışı

**Cloudflare BAA:**
- HIPAA BAA → Cloudflare Enterprise + min taahhüt
- Workers/DO/Workers AI BAA kapsam: **yazılı doğrulama ZORUNLU**
- KVKK için BAA gerekmiyor; m.12 veri işleyici sözleşmesi gerekli

**Telif/IP:**
- **Z-Anatomy CC BY-SA 4.0:** SaaS "yayın" gri alan — hukuki danışman onayı.
- **Pulse Apache 2.0:** SaaS uyumlu.
- **Sketchfab CC BY:** atıf yeterli.

**Tıbbi cihaz yazılımı (MDSW):** Eğitim simülatörü tıbbi cihaz DEĞİL. Sınır: "tanı önerisi" verirse MDSW. **MediSim TR "eğitim amaçlıdır, klinik karar destek değildir" disclaimer'ı taşımalı.**

---

## BÖLÜM 11 — AKSİYON YOL HARİTASI (12 AY)

**Güncel durum (21 Mayıs 2026):**

| Sprint | Konu | Durum | Notlar |
|--------|------|-------|--------|
| A | Procedural mannequin + marker + breathing | ✅ | İlk iskelet (procedural sphere'ler) → Sprint B.1'de gerçek anatomik modele evrildi |
| A.1 | Anatomik orantı düzeltme | ✅ | 20 May 2026: TA2-2019 / 8-head canon ile marker koordinatları rehesaplandı; memory `medisim_anatomik_landmark.md` |
| B.0 | Cloudflare Workers + Gemini Flash backend | ⏸ | Henüz başlamadı; B.2 öncesi kurulum gerekecek |
| B.1 | Sketchfab anatomik torso CC BY | ✅ | chuma6oy "Male full body anatomy" `patient-v2.glb` (CC BY 4.0, 1.33 MB, 154k vertex, gltf-transform optimize) |
| B.1.1 | Marker yüzey + shader breathing | ✅ | 6 region marker + falloff shader (chest + abdomen çift center) |
| **B.2** | **AI hasta diyaloğu UI** | **🎯 SIRADAKİ** | Gemini 2.5 Flash + Calgary-Cambridge; B.0 kurulumu önce gerekiyor |
| B.3 | Vital signs HUD + 12-derivasyon EKG | ⏸ | Sıraya alındı |
| B.4 | Engine binding + Z-Anatomy multi-mesh + clipping plane | ⏸ | Z-Anatomy CC BY-SA download bekliyor |
| B.5 | Auskültasyon ses + 20 marker + atıf UI | ✅ | 21 May 2026: 4 Wikimedia ses dosyası entegre (lung_wheeze/lung_crackles/heart_normal/heart_61bpm), 6→20 anatomik marker (5 kardiyak APE-T-M + 4 akciğer lobu + 6 karın kadrant + 2 karotis + 2 femoral), marker boyutu 0.018→0.010, z+karotis kalibrasyon, MediaAttributions UI atıf paneli (`/3d-demo` + `/dialog-3d-demo`) |
| C.1 | Tailwind v4 + shadcn/ui + marka kimliği | ⏸ | Mevcut Tailwind v3'ten geçiş |
| C.2 | Senaryo authoring UI (React Flow + JSON Schema) | ⏸ | Sıraya alındı |
| C.3 | Astro 5 landing | ⏸ | Sıraya alındı |
| D.1 | Pulse Physiology Engine entegrasyonu (Node sidecar) | ⏸ | Apache 2.0, validation kanıtlı |
| D.2 | Fizyolojik animasyon paketi | 🔄 partial | **Tamam:** cilt tonu shader 4 preset (siyanoz/ikter/solgun/normal), çift-center solunum (diafragma). **Bekliyor:** RPM avatar göz blink + ağız + pupil + jugular dolgunluk + peristaltik + ödem + SSS |
| D.2.x | Procedure altyapısı (stetoskop + O2 maskesi) | ✅ | `ProcedureOverlay` dispatcher + `useProcedureAnimation` hook + 2 prosedür komponenti; rapor adlandırmasında yok, B.5+D.2 sınırı |
| D.3 | Custom MCP'ler (`medisim-scenario-engine`, `medisim-anatomy`, `medisim-drugs`) | ⏸ | Sıraya alındı |
| D.4 | Subagent ekiplemesi + paralel worktree | ⏸ | Sıraya alındı |
| E | TR üniversite pilot, KVKK VKED, TEPDAD eşliği | 3–6 ay | — |
| F | Çok dilli ihracat (EN, AR), VR/AR opsiyonu | 6–12 ay | — |

**Bu seansta üretilen referans dokümanlar (memory):**
- `medisim_master_referans.md` — bu master rapora pointer + güncel sprint özeti
- `medisim_anatomik_landmark.md` — 3D world koordinat tablosu (8-head canon, APE-to-Man auskültasyon)
- `medisim_anatomi_klinik.md` — karın 9 bölge + toraks + vasküler + deri/yanık
- `medisim_saglik_standartlari.md` — ICD/SNOMED/FHIR + Türkiye USS/MHRS/SUT + KVKK ÜYZ 2025
- `medisim_rakip_analiz.md` — Body Interact + Gaumard + Laerdal + CAE + Anatomage
- `medisim_animasyon_teknikleri.md` — R3F morph/breathing/eye/audio + asset gereksinimi

**Test/build:** 430 vitest pass / 0 fail (24 dosya) + 8 Playwright E2E pass. Prod build temiz.

**Eksik/bekleyen:**
- Kullanıcı (Ali Bey) → Ready Player Me full-body avatar indirme + manuel
- Kullanıcı → Sketchfab/BodyParts3D tek tek CC BY organ modeli (kalp/akciğer/karaciğer) — Splanchnology Z-Anatomy generic mesh yerine
- Cloudflare BAA Workers/DO yazılı doğrulama (B.2 prod öncesi)

---

## BÖLÜM 12 — CAVEATS

- Body Interact Unity kanıtı dolaylı.
- Dimedus motor bilinmiyor.
- Pulse Physiology Engine resmi JS/WASM port yok.
- Figma MCP rate limit: Professional + Dev seat.
- iOS Safari 26 öncesi WebGPU sınırlı; WebGL2 fallback zorunlu.
- Cloudflare BAA Workers/DO kapsamı belirsiz — yazılı doğrulama olmadan production RİSKLİ.
- Pediatrik vital aralıkları: PALS 2015 vs SB vs WHO çakışma → default PALS, Ali Bey kararı.
- Claude Code Agent Teams experimental; 3–8 paralel sweet spot.

---

## BÖLÜM 13 — REFERANSLAR (özet)

**Türkçe kaynaklar:** Bölüm 9.B tabloları + KVKK ÜYZ Rehberi (kvkk.gov.tr/Icerik/8547) + UÇEP-2020 (YÖK) + TEPDAD 2025 + Bayram et al. 2025 (ACM TALLIP) + YTU-CE-COSMOS.

**İngilizce kaynaklar:** FIPAT TA2-2019, Z-Anatomy, AnatomyTOOL, BodyParts3D, PALS 2015, TCCC Handbook v5, Calgary-Cambridge, Pulse Physiology Engine (Bray 2019), Three.js r171, Cloudflare docs, Google Gemini, Anthropic Claude Code.

---

*Rapor sonu. Bu doküman, Claude Code oturumlarında referans olarak yüklenir. Her klinik karar üretiminde Bölüm 9.A–9.E re-read edilmeli. Otonom klinik karar YOK; Ali Bey onayı zorunlu.*
