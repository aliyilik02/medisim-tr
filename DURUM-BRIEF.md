# DURUM BRİEFİ — Senaryo Üretim Sistemi (16→400) — 21 Haziran 2026

> **PUSH YOK** — 5 blok lokal commit (cd17155..12da68c), feat/backend-cf-worker.
> Önkoşul: klinik muhakeme katmanı zaten bitmişti (8ffe62e..91b23ec, committed).

## Sonuç: 5 blok TAMAM, hepsi yeşil

| Blok | Commit | Ne yapıldı |
|------|--------|------------|
| 1 — Kontrat | cd17155 | `ProductionScenario` tipi + `defineScenario()` + SCENARIO-CONTRACT.md (3 katmanlı kapı) |
| 2 — Ekipman mapper | 96f5ef7 | `src/engine/equipment/` saf motor (pharmacology'ye simetrik) + 14 DRAFT katalog + runner opt-in bağ |
| 3 — Validate | 6aebbad | validate.mjs v2 katalog-id/dallanma/deterioration/bonus-audit + 4 katmanlı rapor + VALIDATE-RAPORU.md |
| 4 — Skill v2 | 2dce3f1 | klinik-senaryo-yazar yeniden yazıldı (SKILL + 5 referans + scaffold script) |
| 5 — Pilot | 12da68c | opioid overdoz toksikoloji (DRAFT) — uçtan uca kanıt, validate PASS |

**Sağlık:** tsc 0 · 866 vitest (828 baseline +16 ekipman +22 yeni senaryo testi) · 23 e2e · build temiz.
**Geriye uyumluluk:** mevcut 14 senaryo DOKUNULMADI, eski elle vitals_change çalışıyor. Tüm yeni sistemler opt-in ek katman.

## Mimari kazanım

- **Ekipman-etki artık merkezi** (eskiden en büyük teknik borçtu). İlaç motoruna simetrik: koşullu etki (O2 sadece hipoksemide, defib sadece VF/VT), yönlü clamp.
- **Üç katmanlı kapı:** derleme (ProductionScenario) → içerik (validate) → klinik (DRAFT→ACTIVE, Ali Bey). İlk ikisi otomatik, doktor gerektirmez.
- **Cansız senaryo yasak:** kontrat + validate deterioration ≥1 faz + gerçek dallanma şart koşuyor.

## ⚠️ KLİNİK DOĞRULAMA BEKLEYEN — Claude.ai kaynaklı dolduracak

Hiçbir klinik değer uydurulmadı; DRAFT + `TODO_KLINIK` bırakıldı. ACTIVE'i Ali Bey verir.

### Ekipman mapper (src/engine/equipment/catalog.ts) — 14 ekipman, hepsi DRAFT
- Her ekipmanın etki MİKTARI ve onset_sec'i (entübasyon SpO2'yi kaç sn'de kaç artırır,
  O2 maskesi/HFNC/ventilatör oksijenasyon kazanımı, defib sonrası HR/SBP, BVM kazanımı).
- Kaynak beklenen: AHA ACLS 2020, TARD Havayolu, BTS Oksijen, ERC 2021.

### Pilot senaryo (toksikoloji-opioid-overdoz) — 7× TODO_KLINIK
- naloksan başlangıç dozu + yolu (IV/IM/IN) — Goldfrank's / UpToDate
- opioid solunum depresyonu başlangıç vitalleri (RR/SpO2/GCS/pupil derecesi)
- deterioration trend hızı (SpO2/RR/GCS düşüş `delta_per_sec`)
- naloksan/ventilasyon sonrası iyileşme hızı (recovery_trends) + re-narkotizasyon penceresi
- reasoning prompt kaynağı (naloksan farmakolojisi)
- ICD-10 (T40.2) / SNOMED (242253008) kesin alt-kırılım doğrulaması
- debrief.references kesin baskı/yıl + doz tabloları

### Legacy borç (validate v2 ortaya çıkardı — BU TURDA DOKUNULMADI)
- 65 katalog-id uyuşmazlığı (alteplaz→alteplase, labetolol→labetalol, oksitosin yok vb.)
- 12 legacy senaryoda deterioration yok (statik), çoğunda dallanma yok, clinical_review yok.
- Bunlar pre-existing; ayrı temizlik turu gerekir (geriye uyumluluk için bilinçli ertelendi).

## Sıradaki tur (öneri)
1. Claude.ai klinik turu: yukarıdaki TODO_KLINIK'leri kaynaklı doldur → pilot REVIEWED.
2. Skill ile 5-10 senaryo daha (status epileptikus, tiroid fırtınası, GİS kanama...).
3. Legacy katalog-id temizliği (ayrı PR, dikkatli — testler/davranış).
4. Ekipman mapper'ı CI'a bağla (`npm run scenario:validate --strict`).
