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
- `patient-anatomy` → marker koordinat **+ organ pozisyon/rotation/scale + view-by-view sanity (v2, refs/ ile)**
- `calgary-cambridge` → anamnez yapısı
- `kvkk-compliance` → veri koruma pre-commit
- `r3f-medical` → MediSim-spesifik 3D pattern (breathing shader, skin tint, region marker)
- `medical-terminology` → TDK/TAKAD
- **`three-best-practices`** → Three.js 120+ kural (memory disposal, render loop, draw call, GLTF, shader, WebGPU, mobile)
- **`r3f-best-practices`** → R3F 70+ kural (perf-never-set-state-in-useframe, Drei, Suspense, Zustand)

## Skill mi, Memory mi? (önce skill, sonra memory)

Token tasarrufu için: skill bir bilgiyi içeriyorsa onu kullan; memory'yi sadece skill yetmediğinde aç.

| Görev | Önce bu skill'e bak | Sonra memory'ye (gerekirse) |
|---|---|---|
| Marker / organ koordinat | `patient-anatomy` (tablo + view-by-view + tipik hatalar) | `medisim_anatomik_landmark.md` (TAM tablo) sadece tüm noktaları listelemen gerekirse |
| 3D component yaz / opt | `r3f-medical` + `r3f-best-practices` + `three-best-practices` | `medisim_animasyon_teknikleri.md` sadece MediSim-spesifik pattern arıyorsan |
| Klinik tablo / vital | `vital-signs-hud` + `ilac-dozaj-dogrulayici` | `medisim_saglik_standartlari.md` ICD/SNOMED arıyorsan |
| Senaryo yaz | `klinik-senaryo-yazar` + `medical-terminology` | `medisim_anatomi_klinik.md` `physical_exam` field için |
| Asker/TCCC senaryo | `tccc-scenarios` (MARCH-PAWS + TR eşdeğer) | – (skill yeterli) |
| KVKK / commit | `kvkk-compliance` skill | `medisim_saglik_standartlari.md` ÜYZ 2025 detay |

## Token Disiplini — okuma stratejisi

1. **CLAUDE.md + bu README** her seansta otomatik yüklü → kısa
2. **Skill metadata** her seansta otomatik yüklü → trigger description'lardan görev için uygun skill'i seç
3. **Skill tetiklenince SKILL.md (~200 satır) yüklenir** → çoğu görev burada biter
4. **Skill references/** içine `Read` SADECE skill yetmezse (skill kendi linkler)
5. **Memory dosyaları** SADECE skill bilgi vermiyorsa → bu README tablosundan ilgili dosyayı seç
6. **Master rapor** 600+ satır → `Grep` ile keyword ara (`Grep pattern path=docs/MASTER-REPORT-v3.md`), sonra `Read offset/limit` ile o bölümü oku — **asla baştan sona okuma**

### Pratik kurallar

- **Önce Grep, sonra Read.** Büyük dosyada keyword ile pozisyonu bul, `Read offset/limit` ile dar pencere oku.
- **Read'de `limit` parametresi kullan** — özellikle 200+ satırlı dosyalarda. İlk 80 satır çoğu zaman yeter.
- **Aynı bilgiyi iki kez Read etme** — context'te zaten var. Aynı dosyayı tekrar görmek gerektiyse Grep ile spot kontrol.
- **Otomatik yüklenen Skill listesini ezberle** — system reminder'da skill description'lar geliyor; oradan trigger eşleştirme yapıp doğrudan Skill'i kullan. Lojik şüpheliyse SKILL.md'yi `Read` ile aç.
- **Glob ile dosya keşfi**, `ls` Bash'e gitmek yerine. Glob daha hızlı + token verimli.

## Obsidian Setup (opsiyonel, MCP için)

1. **Obsidian Desktop** indir: https://obsidian.md
2. Open Folder as Vault → `docs/memory/` seç
3. Community Plugin "**Local REST API**" yükle
4. Plugin etkinleştir → API key kopyala, port (default 27124)
5. Claude Code Obsidian MCP eklenecek (sonraki adım)
