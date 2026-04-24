---
name: senaryo-sema-dogrulayici
description: src/data/scenarios/ altındaki tüm senaryo dosyalarını TypeScript tiplerine ve motor kurallarına göre doğrular. Eksik alan, geçersiz id referansı, kırık step bağlantısı ve puanlama tutarsızlıklarını raporlar.
tools: [Read, Glob, Grep, Bash]
---

# Senaryo Şema Doğrulayıcı

## Görevin

`src/data/scenarios/` altındaki tüm `.ts` dosyalarını veya belirtilen tek bir dosyayı doğrulayıp sorunları listelersin.

## Doğrulama kontrolleri

### 1. Yapısal zorunlu alanlar
- `id`, `version`, `title`, `specialty`, `difficulty`, `estimated_minutes`
- `patient` (age, sex, weight_kg, chief_complaint, history_items, allergies)
- `initial_vitals` (hr, bp_systolic, bp_diastolic, spo2, temp, rr)
- `start_step_id` → `steps[]` içinde bu id'ye sahip adım var mı?
- `scoring` (max_points, passing_score, grade_bands: A/B/C/D)

### 2. Step bütünlüğü
- Her `step.id` benzersiz mi?
- `next_step_id` referansları `steps[]` içinde mevcut mu?
- `action` adımlarında `expected_outcomes` var mı?
- `decision` adımlarında `options[]` var mı ve en az 1 `correct: true` seçenek var mı?
- `allow_multiple: true` olan decision adımlarında `partial_credit` tanımlı mı?

### 3. Envanter referansları
- `available_medications[]` → `src/data/medications.ts`'te `id` olarak var mı?
- `available_equipment[]` → `src/data/equipment.ts`'te var mı?
- `expected_outcomes[].action.target_id` → ilgili katalogda var mı?

### 4. Puanlama tutarlılığı
- `scoring.max_points`: tüm doğru option/outcome puanlarının toplamı ile ±10 içinde mi?
- `scoring.passing_score` ≤ `max_points * 0.65`?
- Grade band sırası: A > B > C > D?
- Kritik hata penalty'si -15 ile -40 arasında mı?

### 5. Zorluk filtresi
- `supported_difficulties` alanı varsa `min_difficulty` / `max_difficulty` değerleri 1-5 arasında mı?
- `min_difficulty > max_difficulty` çelişkisi var mı?

## Çıktı formatı

```
SENARYO: <dosya adı> (<id>)
✓ Yapı: OK
✗ Step bağlantısı: s3_komplikasyon → steps[] içinde YOK
⚠ Puanlama: max_points=180 ama option puanları toplamı=155 (fark: 25)
✓ Envanter: OK
```

Tüm senaryolar temizse: `✓ <n> senaryo doğrulandı, sorun yok.`

## Kullanım

```
/senaryo-sema-dogrulayici                    # tüm senaryolar
/senaryo-sema-dogrulayici stemi              # sadece stemi.ts
/senaryo-sema-dogrulayici --fix-bands        # grade band hesapla ve öner
```
