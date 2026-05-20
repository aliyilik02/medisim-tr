# MediSim TR — Memory Vault

> Bu klasör projenin **kalıcı bilgi tabanı**. Obsidian'da vault olarak aç (`docs/memory/` root), tüm referansları görsel arayüzle gör/düzenle.
>
> Claude Code, görev tipine göre **sadece ilgili dosyayı** Read eder — her şeyi yüklemek yerine selektif erişim, token tasarrufu için.

## Nasıl kullanılır

**Sen (Ali Bey):**
- Obsidian Desktop indir → Open Folder as Vault → `docs/memory/` seç
- Tüm referansları graph view'da gör, etiketle, ara
- Düzenlediklerin git ile commit edilir, proje ile beraber paylaşılır

**Claude Code:**
- Yeni görev gelince **bu README**'den ilgili dosyayı seç → `Read` et
- Tüm dosyaları otomatik yüklemez (token tasarrufu)
- Klinik karar / anatomi / standart sorularında ilgili tabloya bak

## Dosya İndeksi (görev → ilgili memory)

### Klinik & Anatomik Referans

| Dosya | Ne zaman oku |
|---|---|
| [medisim_master_referans.md](medisim_master_referans.md) | **EN ÖNEMLİ.** Projenin tüm karar özeti + stack + sprint durumu + `docs/MASTER-REPORT-v3.md` pointer |
| [medisim_anatomik_landmark.md](medisim_anatomik_landmark.md) | 3D marker eklerken/ayarlarken — world koordinatlarda landmark, auskültasyon, IV erişim |
| [medisim_anatomi_klinik.md](medisim_anatomi_klinik.md) | Senaryo `physical_exam` yazarken — karın 9 bölge, organ projeksiyonları, vasküler, deri/yanık |
| [medisim_saglik_standartlari.md](medisim_saglik_standartlari.md) | ICD/SNOMED/FHIR kodlaması, Türkiye USS/MHRS/SUT, KVKK ÜYZ 2025 |

### Rakip & Görsel

| Dosya | Ne zaman oku |
|---|---|
| [medisim_rakip_analiz.md](medisim_rakip_analiz.md) | Yeni özellik / sprint planlarken — Body Interact + Gaumard + Laerdal + CAE karşılaştırma |
| [medisim_animasyon_teknikleri.md](medisim_animasyon_teknikleri.md) | 3D animasyon (göz/ağız/breathing) eklerken — R3F pattern, morph target, oskültasyon ses |

### Davranış / İletişim

**Cross-project memory** (`~/.claude/projects/.../memory/`'de kalıyor — başka projeler için de gerekli):
- `feedback_sade_dil.md` — TR teknik terim → sade karşılık (UI metni yazarken)
- `feedback_token_tasarrufu.md` — Küçük sprintte plan modu/agent açma kuralı

## Master Doküman

[`docs/MASTER-REPORT-v3.md`](../MASTER-REPORT-v3.md) — Tüm kararların tek noktadan referansı. Klinik karar öncesi 9.A-9.E re-read.

## Skill'ler (`.claude/skills/`)

Domain skill'leri otomatik yüklenir (CLAUDE.md'de listelenmiş):
- `patient-anatomy` → marker koordinat
- `calgary-cambridge` → anamnez yapısı
- `kvkk-compliance` → veri koruma pre-commit
- `r3f-medical` → 3D pattern
- `medical-terminology` → TDK/TAKAD

## Token Disiplini

- **CLAUDE.md** her seansta yüklenir → kısa (~60 satır)
- **Bu README** her seansta yüklenir → "hangi memory ne için" haritası
- **Detaylı memory dosyaları** sadece görev için gerektiğinde Read edilir
- Master rapor 600+ satır → ilgili bölüme (9.A vb.) atla, baştan sona okuma

## Obsidian Setup (opsiyonel, MCP için)

1. **Obsidian Desktop** indir: https://obsidian.md
2. Open Folder as Vault → `docs/memory/` seç
3. Community Plugin "**Local REST API**" yükle
4. Plugin etkinleştir → API key kopyala, port (default 27124)
5. Claude Code Obsidian MCP eklenecek (sonraki adım)
