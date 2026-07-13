# Görsel Prompt Paketi — Set 2 (kadın · çocuk · asker), 5 durum karesi

> 13 Tem 2026. Ali Bey claude.ai tarafında üretir, dosyaları buraya teslim eder.
> Hedef klasörler: `public/patients/hastane-eriskin-k/`, `hastane-cocuk/`, `saha-asker/`
> Dosya adları TÜM setlerde aynı: `durum-01-baseline.png` … `durum-05-arrest.png`
> Format: PNG, portre 3:4, min 1024×1365. Oynatıcı object-contain — kırpma derdi yok.

## Üretim sırası (KRİTİK — karakter tutarlılığı)

1. Her set için ÖNCE yalnız **durum-01 (master)** üret.
2. Master beğenilince kalan 4 kare **aynı master'ı image-to-image girdisi**
   alarak üretilir — SADECE yüz ifadesi + cilt rengi + bilinç durumu değişir;
   kamera, kadraj, kıyafet, ışık, saç, ortam AYNEN kalır.
3. Kareler arasında karakter tutarlılığını gözle doğrula (aynı yüz mü?).

## Durum evresi → görsel dili (5 evre, visual2d-mapper ile birebir)

| Kare | Evre | İfade/cilt |
|---|---|---|
| durum-01 | baseline | Bilinçli, rahatsız/endişeli, normal cilt |
| durum-02 | şok | Solgun, terli (alın parlar), yarı bilinçli, göz kapakları düşük |
| durum-03 | siyanoz | Dudaklar mavi-mor, korku ifadesi, hava açlığı |
| durum-04 | derin şok | Gri-alacalı cilt, gözler kapalı, yanıtsız, gevşek |
| durum-05 | arrest | Bilinçsiz, ağız hafif açık, gri-mavi cilt, tam gevşek |

---

## SET 1 — hastane-eriskin-k (erişkin kadın)

**Master (durum-01) prompt:**

```
Photorealistic medical simulation training photograph, portrait orientation 3:4.
A 45-year-old woman lying propped up at 30 degrees in a hospital bed, wearing a
light blue hospital gown. Shoulder-length dark brown hair. White pillow and white
sheets. She is conscious but visibly unwell: uncomfortable, anxious expression,
one hand resting on her upper chest. Slightly elevated frontal camera angle,
neutral grey wall background, soft diffused clinical lighting. No medical staff,
no equipment attached, no text, no watermark.
```

**Türev talimatı (02–05, image-to-image master üzerinden):**

```
Use the attached image as the base. Keep the exact same woman, same camera angle,
same framing, same hospital bed, gown, hair and lighting. Change ONLY her
condition:
[02] pale sweaty skin, glistening forehead, semi-conscious, eyelids drooping,
     hand slack at her side
[03] blue-purple lips (cyanosis), frightened expression, straining to breathe
[04] grey mottled skin, eyes closed, unresponsive, completely limp
[05] unconscious cardiac arrest: mouth slightly open, grey-blue skin, head
     tilted slightly, totally flaccid
```

## SET 2 — hastane-cocuk (çocuk — İLLÜSTRATİF, foto-gerçekçi YASAK)

Pivot kararı: çocuk foto-gerçekçi üretilmez (etik/KVKK). Stil: yumuşak dijital
illüstrasyon — tıbbi eğitim kitabı estetiği, korkutucu değil ama klinik dürüst.

**Master (durum-01) prompt:**

```
Soft digital illustration for medical education, NOT photorealistic, gentle
storybook-meets-clinical style, muted colors, portrait orientation 3:4.
A 7-year-old child lying propped up in a hospital bed, light blue hospital gown,
short brown hair, white pillow. The child is awake but unwell: tired, mildly
distressed expression. Slightly elevated frontal view, plain soft grey
background, soft even lighting. No medical staff, no equipment, no text.
```

**Türev talimatı (02–05):**

```
Use the attached illustration as the base. Same child, same style, same framing,
same bed and gown. Change ONLY the condition:
[02] pale, sweaty, drowsy, eyes half closed
[03] bluish lips, scared, working hard to breathe
[04] grey-toned skin, eyes closed, unresponsive
[05] unconscious, mouth slightly open, grey-blue tone, completely still
Keep the illustration gentle and educational — clinically honest but not gory
or frightening beyond the medical reality.
```

## SET 3 — saha-asker (savaş alanı, TCCC)

Baz kareler fizyolojik durumu gösterir — yara/kanama detayı AKSİYON/varyant
turuna kalır (grafik vahşet YOK; eğitim platformu + üretici filtre sınırı).

**Master (durum-01) prompt:**

```
Photorealistic military medical training photograph, portrait orientation 3:4.
A young adult male soldier in dusty camouflage combat uniform and body armor
vest (helmet off), lying on the ground on a tan field stretcher in open terrain.
Daylight, dusty earth tones, shallow depth of field. He is conscious but wounded
and in distress: pained expression, jaw clenched, one fist gripping his chest
strap. Slightly elevated frontal camera angle. No visible graphic wounds, no
blood. No other soldiers or medics in frame, no text, no watermark.
```

**Türev talimatı (02–05):**

```
Use the attached image as the base. Same soldier, same uniform, same stretcher,
same terrain, same camera and light. Change ONLY his condition:
[02] pale grey-tinged sweaty face, semi-conscious, eyelids drooping, grip loosened
[03] blue-purple lips, air hunger, panicked straining to breathe
[04] ashen mottled skin, eyes closed, unresponsive, arm fallen off the stretcher
[05] unconscious cardiac arrest: mouth open, grey-blue skin, completely flaccid
No graphic wounds or blood in any frame.
```

---

## Teslim sonrası zincir (ben yaparım)

indir → Read spot kontrol (karakter tutarlılığı) → `public/patients/<set>/` →
`VISUAL_MANIFEST`'e 3 yeni set girişi → vitest varlık kapısı → e2e → commit.
Not: bu setlerde maske varyantı/aksiyon karesi YOK (zarif düşüş: aksiyonlar
banner-only oynar) — sonraki turlarda üretilir.
