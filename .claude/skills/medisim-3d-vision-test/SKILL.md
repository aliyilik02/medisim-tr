---
name: medisim-3d-vision-test
description: PatientBody3D / clipping / region / shader / overlay değişikliği yaptığında BENİM (Claude) Claude Preview MCP ile otomatik screenshot alıp anatomik doğruluğu test etmem için. Kullanıcı manuel tarayıcı kontrolü yapmasın diye. UI/3D commit ÖNCESİ tetiklenir.
---

# 3D Vision Test — Otomatik Anatomik Doğrulama

## Ne zaman tetiklen (MUTLAKA)

Bu skill **ben Claude tarafından** UI/3D değişikliği yaptığımda **otomatik aktive olur**. Kullanıcı talep etmese bile:

- `PatientBody3D.tsx` / `AnatomicPatientModel.tsx` değişikliği
- `regions.ts` koordinat güncellemesi
- `PatientDialog3DPage.tsx` / `PatientBody3DDemoPage.tsx` layout
- Shader uniform / clipping plane / breathing değişikliği
- `CompactVitalsHUD` / `InternalOrgans` / `ProcedureOverlay` değişikliği
- Yeni `RegionMarker` / yeni mesh entegrasyonu

→ Ben "test et" demem, **commit öncesi otomatik çalıştırırım**.

## Test Prosedürü (her seferinde)

### 1. Sunucu hazırlığı

```
mcp__Claude_Preview__preview_start({ name: "medisim" })
```

Reuse varsa OK; yoksa otomatik başlatır. ID al.

### 2. Sayfaya git

```
mcp__Claude_Preview__preview_eval({
  serverId,
  expression: `window.location.href = '/dialog-3d-demo'; 'ok'`
})
```

2-3 saniye bekle (R3F Canvas + glb yükleme).

### 3. Multi-state screenshot serisi

| State | Tetikleyici | Kontrol |
|---|---|---|
| **İlk yükleme** | sayfa açıldı | Layout, monitör konumu (sol üst), kontrol bar (sağ üst), slider (sol alt), chat (sağ panel) |
| **Senaryo değiştir** | dropdown'dan farklı senaryo seç | Vital'lar değişti mi? Yeni hastanın age group doğru mu? |
| **Cilt tonu siyanoz** | dropdown 🔵 Siyanoz | Renk yumuşak geçiş mi? 1-2 saniye gecikme görünür mü? |
| **Cilt kesim %50** | slider 0.5 | Anterior cilt kalkmış, baş+kollar+bacaklar görünür, organlar (kalp/akciğer) görünüyor? |
| **Cilt kesim %100** | slider 0.0 | Tüm anterior açık, splanchnology mesh tam görünür |
| **Soru sor** | input'a yaz, gönder | Speaking indicator çıkıyor mu (sağ üst)? Ağız titreşiyor mu? |

### 4. Anatomik doğruluk kontrol (her screenshot'ta)

⭐ **Memory:** `docs/memory/medisim_anatomik_landmark.md` ile karşılaştır.

| Marker | Beklenen world y | Görünür yer (3D ekranda) |
|---|---|---|
| face-mouth | 0.666 (ağız hizası) | Yüzün altı, çene üstü |
| chest-front (Erb) | 0.543 | Sternum orta |
| chest-left (Mitral) | 0.495, x=-0.085 | Sol meme hizası midclavicular |
| chest-right (Aortik) | 0.574, x=+0.02 | Sağ sternum 2. ICS |
| abdomen-upper | 0.34 (epigastrik) | Göbek üstü, xiphoid altı |
| abdomen-lower | 0.27 (suprapubik) | Kasık üstü |

Eğer marker **yanlış konumda görünüyorsa** → coordinate düzelt (gözle tahmin değil, formula `world_y = -0.243 + ratio × 1.021`).

### 5. UI durum kontrolü

- [ ] Monitör sol üstte mi?
- [ ] Vital'lar **yaş grubuna göre** renk kodlu (PALS — bebek HR 175 normal, erişkin 175 critical)
- [ ] EKG mini strip + 12-Lead butonu görünür
- [ ] Cilt tonu 2×2 grid, aktif olan brand renk
- [ ] Solunum toggle çalışıyor (açık/kapalı görsel feedback)
- [ ] Cilt kesim slider sol alt + yüzde göstergesi
- [ ] Chat sağ panel, Gemini/Mock rozeti header'da
- [ ] Disclaimer en altta ("Eğitim amaçlıdır...")

### 6. Klinik vital doğrulama

8 aylık infant + septik şok senaryosu için:
- HR 175 → kırmızı kritik (PALS infant range 100-190, 175 yüksek-normal sınır, 175+ critical olabilir)
- TA 65/40 → kırmızı kritik (infant SBP normalde 72-104, hipotansiyon eşiği <70)
- SpO2 87 → kırmızı kritik (<90)
- SS 55 → kırmızı kritik (infant RR 30-53 normal, 55 sınır üstü)
- Sıcaklık 39.2 → kırmızı (>38.5 warning, >39 critical)
- Kritik vital banner pulse atıyor

### 7. Sorun bulursam ne yapayım

- **Marker yanlış yerde** → `regions.ts` koordinat düzelt, `world_y = -0.243 + ratio × 1.021` formülü
- **Cilt clipping kafayı kesiyor** → plane normal (0, 0, -1) anterior, **NOT** (0, -1, 0) yukarıdan
- **Organlar görünmüyor** → InternalOrgans wrapper transform doğru mu (scale 0.602, offset -0.249)
- **Vital renk kodu yanlış** → vital-thresholds.ts age range kontrol
- **Cilt tonu instant değişiyor** → AnatomicPatientModel useFrame lerp pattern
- **Speaking indicator yok** → DialogChat onSpeakingChange callback bağlı mı

### 8. Düzeltme sonrası tekrar test

Aynı 6 state screenshot, problem giderildi mi doğrula. Max 3 iterasyon (loop'ta takılmamak için).

### 9. Kullanıcıya raporla

```
✅ 3D vision test geçti (6 state screenshot, anatomik doğruluk OK):
- Marker pozisyonları memory/medisim_anatomik_landmark.md ile uyumlu
- Cilt tonu yumuşak geçiş 1.5sn lerp
- Organlar splanchnology mesh render, pulsate/breathing aktif
```

Veya sorun varsa:
```
⚠️ Test gözlemi: chest-front marker görsel olarak sternum yerine
klavikül seviyesinde. y=0.543 hesabı doğru ama model proporsiyonu
sapıyor → y=0.51'e ince ayar yaptım, tekrar test ile düzeldi.
```

## Gotchas

- ❌ **Manuel "kullanıcı tarayıcıya baksın" demek** — kullanıcı sıkıldı, otomatik yap
- ❌ **Sadece test geçti demek** — hangi state'ler test edildi spesifik söyle
- ❌ **Sonsuz iterasyon** — max 3 deneme, başarısızsa kullanıcıya sor
- ❌ **WebGL render time vermeme** — preview_screenshot öncesi 2-3sn `sleep` bekle (Canvas yüklensin)
- ✅ **Multi-state coverage** — tek screenshot yetmez, en az 3 farklı state
- ✅ **Anatomik formula** kullan, gözle tahmin yapma (skill: `patient-anatomy`)
- ✅ **Visual regression** — önceki commit screenshot'ı varsa karşılaştır

## Preview MCP unavailable durumu

`mcp__Claude_Preview__preview_start` "temporarily unavailable" hatası verirse:
1. 60sn bekle, tekrar dene
2. Hala başarısız → kullanıcıya bildir, manuel test iste (fallback)
3. Bu durumda Playwright e2e test yaz (tests/e2e/dialog-3d.spec.ts)

## Referans dosyalar

- `memory/medisim_anatomik_landmark.md` — koordinat tablosu
- `.claude/skills/patient-anatomy/SKILL.md` — marker pozisyon doğrulama
- `src/components/patient-3d/regions.ts` — mevcut region tanımları
- `tests/components/patient-3d.test.tsx` — bbox sanity check pattern
