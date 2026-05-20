---
name: MediSim TR — Master Rapor v3.0 Pointer
description: Projenin ana karar dokümanı. Tam içerik repoda; bu dosya kısa özet + nereye bakacağını söyler.
type: reference
originSessionId: 0bba8189-fb17-45da-90c4-0cbc0bc9f4a3
---
## TAM RAPOR

**Konum:** `docs/MASTER-REPORT-v3.md` (repoda, git tracked).

Her klinik karar / yeni sprint / asset eklemesi öncesi **oraya bak**, özellikle:
- **Bölüm 9.A** Anatomik standartlar (TA2-2019, TAKAD, landmark, auskültasyon)
- **Bölüm 9.B** TR klinik dernekleri + uluslararası kılavuzlar
- **Bölüm 9.C** Senaryo TS interface (zorunlu alanlar: `ucep_codes`, `icd10_codes`, `guideline_references`)
- **Bölüm 9.D** Klinik gerçekçilik kuralları (pediatri mg/kg, TR reçete renkleri, TİTCK)
- **Bölüm 9.E** Bayrak hiyerarşisi (DRAFT → REVIEWED_PENDING_ACTIVATION → ACTIVE)

## Stack Kararları (Master Rapor Onaylı)

| Katman | Karar | Sebep |
|---|---|---|
| 3D Motor | React Three Fiber + WebGPU (Three.js r171+) | Mevcut yatırım; WebGL2 fallback 12 ay |
| Fizyoloji | Pulse Physiology Engine (Apache 2.0, Node sidecar) | SaaS uyumlu, validation kanıtlı |
| AI | Gemini 2.5 Flash birincil ($0.30/$2.50/1M) + Pro fallback | TR diyalog $750/ay @ 10K öğrenci |
| TTS | Azure tr-TR-EmelNeural birincil + ElevenLabs A/B | KVKK Avrupa DC |
| Backend | Cloudflare Workers + Durable Objects + Vectorize + R2 | $1.2k/ay @ 10K öğrenci |
| UI | Tailwind v4 + shadcn/ui + Framer Motion | WCAG 2.2 AA |
| Form | react-hook-form + zod + @rjsf/core | Senaryo authoring |
| Landing | Astro 5 | Zero JS by default |
| Asset | Z-Anatomy CC BY-SA + AnatomyTOOL | TA2-2019 etiketli, 5000+ yapı |

## Sprint Durumu (Master Rapor Bölüm 11)

✅ A — Procedural mannequin + marker + breathing
✅ A.1 — Anatomik orantı düzeltme
🔄 B.0 — Cloudflare Workers + Gemini Flash backend (DEVAM)
✅ B.1 — Sketchfab anatomik torso CC BY (chuma6oy)
✅ B.1.1 — Marker yüzey + shader breathing
🎯 **B.2 — AI hasta diyaloğu UI (SIRADAKİ, 2 hafta)**
⏸ B.3 — Vital signs HUD + 12-derivasyon EKG
⏸ B.4 — Engine binding + Z-Anatomy multi-mesh
⏸ C/D/E/F — yol haritası

**NOT:** Bu seansta yaptıklarımız (procedure animasyonları, cilt tonu shader, çift center solunum, oskültasyon ses altyapısı) raporun **D.2 fizyolojik animasyon paketi**'nin erken parçaları. Sprint adlandırması "B.2.x" → ileride "D.2.x" diye yeniden numaralandırılabilir.

## Klinik Yumuşak Kurallar (Hatırlatma)

1. **Klinik karar Ali Bey onayı zorunlu** — DRAFT'ı ACTIVE'e geçişte
2. Her senaryoda **en az 1 TR kılavuz** referansı (`guideline_references`)
3. Pediatride mg/kg **zorunlu**
4. ICD-10 + SNOMED CT + LOINC + RxNorm kodlaması
5. TR reçete renk sınıfı + TİTCK Reçetem Sistemi
6. "Eğitim amaçlıdır, klinik karar destek değildir" disclaimer her sayfada
7. TR triyaj **3-renk** (resmi) + ESI 5-level (ek)

## Eşik Göstergeleri (kararı değiştirenler)

- Cloudflare BAA Workers/DO yazılı kabul **EDİLMEZSE** → Vercel Pro
- iOS Safari WebGPU baseline 26 **kararlı değilse** → WebGL2 fallback uzat
- 10K aktif öğrenci/ay **aşılırsa** → Vertex AI Gemini batch (%50 indirim)
- Body Interact **Türkçe duyurursa** → diferansiyel hızlandır

## Önceki Memory Dosyaları (Tamamlayıcı)

- `medisim_anatomik_landmark.md` — 3D world koordinatlar (mevcut chuma6oy patient-v2.glb için)
- `medisim_anatomi_klinik.md` — Kadran/landmark/vasküler/deri/yanık
- `medisim_saglik_standartlari.md` — ICD/SNOMED/FHIR + Türkiye + KVKK
- `medisim_rakip_analiz.md` — Body Interact + Gaumard + Laerdal karşılaştırma
- `medisim_animasyon_teknikleri.md` — Three.js/R3F morph/breathing/eye/audio

**Master rapor bu 5 dosyayı kapsayıp genişletir; çakışma durumunda master rapor öncelikli.**
