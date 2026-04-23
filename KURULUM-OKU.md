# 📦 Kurulum — Mega İçerik + 3 Mod Sistemi

Bu paket 4 büyük iş yapar:

1. **3 Mod sistemi** — Eğitim (8x) / Klinik (3x, YENİ) / Sınav (1x)
2. **Senaryo bazlı ilaç zamanlama override altyapısı** — eğitmen istediği ilacın etki süresini senaryo içinde ezebilir
3. **2 yeni senaryo** — DKA + Pediatrik Sepsis (timing override örnekleriyle)
4. **Mega içerik** — 24 yeni basic ilaç + 26 extended ilaç + 20 ekipman

---

## 1 · Zip'i proje klasörüne aç

```
C:\Users\Mehmet Ali Yılık\OneDrive - Bertaş Teknik ve Tıbbi Malzeme San. Tic. A.Ş\Masaüstü\medisim-tr\
```

**"Hedefte aynı adlı dosya var"** sorusuna **"Hepsine Evet"**.

Zip içeriği (14 dosya):

**Motor tarafı (değişti):**
- `src/engine/types.ts` → PlayMode 3 moda, TimeScaleOverride genişledi, MedicationTimingOverride eklendi, Scenario'ya `medication_timing_overrides` alanı
- `src/engine/engine.ts` → startSession baseline_vitals + active_medications
- `src/engine/index.ts` → aynı
- `src/engine/pharmacology/types.ts` → DEFAULT_TIME_SCALE = { eğitim 8x, klinik 3x, sınav 1x }
- `src/engine/pharmacology/engine.ts` → getTickIntervalMs 3 mod, administerMedication timingOverride parametresi

**UI tarafı (değişti):**
- `src/hooks/useVitalsTick.ts` → (değişiklik yok, zaten 3 modu destekliyor)
- `src/components/VitalsMonitor.tsx` → baseline + delta okları
- `src/components/StepDisplay.tsx` → 3 mod tipi + klinik modunda decision feedback gösterilir
- `src/components/FeedbackToast.tsx` → 3 mod tipi + klinik'te tam feedback
- `src/components/CriticalContraindicationModal.tsx` → _onResolved fix
- `src/pages/ScenarioPlayPage.tsx` → 3. mod butonu (Klinik), timing override geçişi, üst bar rozet

**İçerik (değişti):**
- `src/data/medications.ts` → 24 yeni basic ilaç
- `src/data/medications-extended.ts` → 26 yeni farmakoloji verili ilaç
- `src/data/equipment.ts` → 20 yeni ekipman
- `src/data/scenarios/index.ts` → 4 senaryo
- `src/data/scenarios/dka.ts` → YENİ, timing override örnekli
- `src/data/scenarios/pediatrik-sepsis.ts` → YENİ, timing override örnekli

## 2 · Build kontrolü

```cmd
cd /d "C:\Users\Mehmet Ali Yılık\OneDrive - Bertaş Teknik ve Tıbbi Malzeme San. Tic. A.Ş\Masaüstü\medisim-tr"
npm run build
```

**Beklenen:** 0 hata. Başarısız ise çıktıyı bana at.

## 3 · Test

```cmd
npm run dev
```

### Test 1 — 3 mod butonu

Senaryo seç → Mode Selector'da **3 buton** görmelisin:
- Eğitim (yeşil — GraduationCap ikonu) — 8× hız
- **Klinik** (mavi — Activity ikonu) — 3× hız (YENİ)
- Sınav (sarı — Timer ikonu) — 1× hız

### Test 2 — DKA'da timing override

1. DKA senaryosunu aç → **Klinik mod** seç (orta buton)
2. Seviye 3
3. Adım 3'e git, **salin_09 ver** → 10 saniye içinde HR azalmalı, SBP düzelmeli
4. Adım 4'te **insulin_regular ver** → 20 saniye içinde etki başlamalı
5. Adım 5'te **dekstroz_50 ver** → 8 saniye içinde glukoz yükselmeli

Bu hızlar `scenario.medication_timing_overrides` sayesinde. Gerçek klinikte insülin etkisi 15 dakika bekler, ama senaryo yazarı demo için 20 sn'ye indirdi.

### Test 3 — Sınav modu

STEMI'yi sınav modunda aç:
- Feedback gizli olmalı (sadece puan değişimi görünür)
- Vitaller 1× gerçek hızda akmalı (daha yavaş)
- Kritik kontrendikasyon modal'da antidot kılavuzu gizli

## 4 · Commit + push

```cmd
git add . && git commit -m "feat: 3 mod sistemi + senaryo bazli ilac timing override + DKA + sepsis + 50 ilac ekipman" && git push
```

---

## Mimari açıklama — Eğitmen için ne ifade ediyor?

**Yol haritasında eğitmen editörü:**

Eğitmen formda şunu doldurabilir olsun (henüz UI yok, altyapı hazır):

```
Senaryo: "Kardiyojenik şok vakası"
İlaçlar:
  └─ adrenalin
      ├─ Normal doz: 1 mg
      ├─ Demo hızı: 10 sn'de etki başlasın  ← bu alan!
      └─ Peak: 30 sn
  └─ dobutamin
      ├─ Normal doz: 5 mcg/kg/dk
      └─ Demo hızı: varsayılan (ilaç kataloğundan)
```

Bu form doldurulduğunda otomatik olarak şöyle JSON üretilir:

```json
{
  "medication_timing_overrides": {
    "adrenalin": { "onset_sec": 10, "peak_min": 0.5 }
  }
}
```

Motor bu alanı otomatik okur. **Yani bugün eğitmen kod yazsaydı yapacağı şey ile, yarın form dolduracağı şey aynı JSON'a dönüşür.**

DKA ve Pediatrik Sepsis senaryoları **bu altyapının çalışan örnekleri** — eğitmen form arayüzünü beklerken sen manuel override yazarak 10+ senaryo oluşturabilirsin. İşi bitirince form yazdığımızda hepsini editörde göreceksin.

---

## Öncelik 6 — Eğitmen senaryo editörü (sonraki büyük iş)

Bu paket geçtikten sonra sıralamamız:

1. ✅ Canlı Monitör Evre 1 + 3 mod + mega içerik (şu an)
2. ⏭️ **Canlı Monitör Evre 2** — trend chart + zaman damgası
3. ⏭️ **Canlı Monitör Evre 3** — EKG animasyon
4. ⏭️ **Canlı Monitör Evre 4** — bip/alarm sesleri
5. ⏭️ **Eğitmen senaryo editörü** — form tabanlı, localStorage + JSON export/import
6. ⏭️ Faz 2 — Backend + kullanıcı hesapları

---

Takıldığın yer olursa bana gel — çıktıyı at 🩺
