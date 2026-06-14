# 3D Asset Lisans ve Köken (Provenance) Kaydı — MediSim TR

> **Neden bu dosya var:** MediSim TR ticari bir tıp-eğitim ürünüdür. Ürünle birlikte
> dağıtılan (ship edilen) her 3D varlığın kaynağı, lisansı ve **ticari kullanım uygunluğu**
> burada izlenir. Yeni `.glb` eklerken bu dosyaya satır eklemek **zorunludur**.
>
> İlgili kayıtlar:
> - Oda dokuları kaynak detayı: [`scripts/tex/SOURCES.md`](../../scripts/tex/SOURCES.md)
> - Oskültasyon sesleri: [`public/sounds/auscultation/SOUNDS-LICENSE.md`](../sounds/auscultation/SOUNDS-LICENSE.md)
> - Üretim hattı: `.claude/skills/blender-medical-modeling/SKILL.md` (MPFB2 → Mixamo → glTF-Transform meshopt)

Son güncelleme: 15 Haziran 2026

---

## Özet tablo

| Asset | Kaynak | Lisans | Ticari OK | Not |
|---|---|---|---|---|
| `patient-female-adult.glb` | MPFB2 (MakeHuman) üretimi | **CC0 1.0** | ✅ Evet | Texture YOK; `Skin_Body` + `Eye_Sclera`/`Eye_Iris` materyali, 52 ARKit blendshape. Ten tonu kod ile (baseColor). |
| `patient-male-adult.glb` | MPFB2 (MakeHuman) üretimi | **CC0 1.0** | ✅ Evet | Texture YOK; aynı materyal yapısı, 52 blendshape. |
| `patient-child.glb` | MPFB2 (MakeHuman) üretimi | **CC0 1.0** | ✅ Evet | Texture YOK; çocuk antropometri, 52 blendshape. |
| `patient-elderly.glb` | MPFB2 (MakeHuman) üretimi | **CC0 1.0** | ✅ Evet | Texture YOK; yaşlı antropometri, 52 blendshape. |
| `patient-animated.glb` (kadın) | MPFB2 mesh + Mixamo auto-rig/animasyon | **CC0 (mesh) + Mixamo royalty-free (rig/klip)** | ✅ Evet | Texture YOK, `Skin_Body`. Baked GLB ship serbest. Klipler: `laying_idle, idle, talk_gesture, talk_shrug, pain, cough_mild, cough_severe`. |
| `patient-animated-male.glb` | MPFB2 mesh + Mixamo auto-rig/animasyon | **CC0 (mesh) + Mixamo royalty-free (rig/klip)** | ✅ Evet | Texture YOK, `Skin_Body`. 10 klip (yatış/öksürük/kusma/inhaler vb.), 52 blendshape. |
| `patient-animated-child.glb` | MPFB2 mesh + Mixamo auto-rig/animasyon | **CC0 (mesh) + Mixamo royalty-free (rig/klip)** | ✅ Evet | Texture YOK, `Skin_Body`. Çocuk klip seti, 52 blendshape. |
| `patient-animated-elderly.glb` | MPFB2 mesh + Mixamo auto-rig/animasyon | **CC0 (mesh) + Mixamo royalty-free (rig/klip)** | ✅ Evet | Texture YOK, `Skin_Body`. 10 klip, 52 blendshape. |
| `er-room.glb` | Prosedürel geometri (Blender) + ambientCG CC0 doku | **CC0 1.0** | ✅ Evet | Gömülü doku: `Tiles107` (zemin) + `PaintedPlaster017` (duvar), ambientCG, CC0. Detay: `scripts/tex/SOURCES.md`. |
| `patient-mimikli.glb` | **Daz / Reallusion Character Creator kökenli** | ⚠️ **Netleşmedi** | ❌ **HAYIR** | `Std_Skin_*` materyal + `Std_Skin_Head_Diffuse` vb. doku adları = CC/Daz imzası. **UNTRACKED — ship EDİLMİYOR.** Aşağıya bakın. |
| Oskültasyon sesleri (`public/sounds/auscultation/*.ogg`) | Wikimedia Commons | CC BY 3.0 / CC BY-SA 3.0 | ✅ Evet (atıf şartıyla) | Detay + atıf metni: `SOUNDS-LICENSE.md`. CC BY-SA gereği uygulamada atıf gösterilmeli. |

✅ = ürünle dağıtılabilir · ❌ = dağıtılamaz/lisans engeli

---

## Köken detayları

### Hasta modelleri — statik (4 varyant) — CC0

`patient-female-adult.glb`, `patient-male-adult.glb`, `patient-child.glb`, `patient-elderly.glb`

- **Kaynak:** MPFB2 (MakeHuman tabanlı Blender eklentisi) ile parametrik üretim.
- **Lisans:** MakeHuman/MPFB ile üretilen mesh'ler **CC0** olarak dağıtılır (kamu malı).
  Ticari kullanım serbest, atıf gerekmez (yine de burada kayıtlıdır).
- **Köken kanıtı (GLB JSON):** Materyaller yalnızca `Skin_Body`, `Eye_Sclera`, `Eye_Iris`;
  **0 gömülü doku (image)** — `Std_*` / Daz / CC izi YOK. 52 ARKit morph target (blendshape).
- **Ten tonu:** Doku ile değil, kod içinde `Skin_Body` baseColor ile veriliyor
  (`patientModels.ts` → `SKIN_TONE_PRESETS`); klinik tint (siyanoz/sarılık/solgunluk) bunun üzerine çarpımsal.
- **Generator:** `glTF-Transform v4.3.0` (meshopt optimize; morph olduğu için Draco kullanılmaz).
- Üretim talimatı: `patientModels.ts` başlık yorumu + `blender-medical-modeling` skill.

### Hasta modelleri — animasyonlu (4 varyant) — CC0 mesh + Mixamo

`patient-animated.glb`, `patient-animated-male.glb`, `patient-animated-child.glb`, `patient-animated-elderly.glb`

- **Mesh kökeni:** Yukarıdaki MPFB2 (CC0) master ile aynı base; mimik (52 ARKit blendshape)
  proximity (KDTree en-yakın-vertex) transfer ile master'dan geri aktarıldı.
- **Rig + animasyon kökeni:** Adobe **Mixamo** auto-rigger (65 kemik) + Mixamo "Laying *" hareket
  klipleri (NLA ile tek rig'e birleştirildi). Detay: `AnimatedPatientModel.tsx` başlık yorumu.
- **Mixamo lisans durumu (KRİTİK ayrım):**
  - Mixamo karakterleri/animasyonları **royalty-free** olarak projeye gömülerek (baked)
    dağıtılabilir → **baked `.glb` ship etmek UYGUNDUR.**
  - ⚠️ **Ham (raw) Mixamo FBX dosyasını yeniden dağıtmak (redistribution) YASAKTIR.**
    Biz ham FBX'i değil, sadece **birleştirilmiş baked GLB**'yi gömüyoruz → kural ihlali yok.
- **Köken kanıtı (GLB JSON):** Materyal yalnızca `Skin_Body`; **0 gömülü doku**; 52 morph; klipler GLB içinde NLA track olarak.
- **Generator:** `glTF-Transform v4.3.0` (meshopt; morph nedeniyle Draco YOK).

### Acil odası — `er-room.glb` — CC0

- **Geometri:** Prosedürel (Blender script `scripts/build_er_room.py`), telif içermez.
- **Dokular (CC0, ambientCG):** zemin `Tiles107`, duvar `PaintedPlaster017`.
  GLB JSON'da gömülü 6 image bunları doğrular (`*_Color`, `*_NormalGL`, `*_Roughness`).
- **Lisans:** CC0 1.0 — ticari serbest, atıf gerekmez. Tam kaynak: `scripts/tex/SOURCES.md`.

### Oskültasyon sesleri — CC BY / CC BY-SA (atıf şartlı)

- `public/sounds/auscultation/` altındaki `.ogg` dosyaları Wikimedia Commons kökenli.
- Lisanslar: çoğu **CC BY 3.0 / CC BY-SA 3.0** (NonCommercial yok → ticari uygun).
- **Şart:** CC BY-SA gereği uygulamada görünür atıf (debrief/hakkında).
- Tam atıf metinleri ve dosya bazında lisans: **`SOUNDS-LICENSE.md`**.

---

## ⚠️ Lisans riski — `patient-mimikli.glb` (ship EDİLMİYOR)

- **Durum:** Git'te **UNTRACKED** — ürünle dağıtılmaz. Bu DOĞRU davranış, korunmalı.
- **Köken kanıtı (GLB JSON):** Materyaller `Std_Skin_Head`, `Std_Skin_Body`, `Briefs`, `Std_Cornea_*`
  ve dokular `Std_Skin_Head_Diffuse`, `Std_Skin_Body_Normal`, `Std_Upper_Teeth_*` vb. —
  bu `Std_*` adlandırması **Daz / Reallusion Character Creator (CC)** dışa aktarımının
  karakteristik imzasıdır. 41 gömülü doku, 121 morph.
- **Risk:** Daz/Reallusion içerik EULA'sı; karakter mesh/dokularının üçüncü tarafça
  yeniden dağıtımını (ham asset olarak) genelde **kısıtlar veya yasaklar.** Lisans
  netleşmeden ürünle dağıtmak **telif/EULA ihlali riskidir.**
- **Karar:** Lisans netleşene kadar **commit edilmez / ship edilmez.** Kalıcı çözüm:
  aynı mimik kabiliyetini **MPFB2 (CC0)** ile yeniden üretmek (mevcut `patient-animated*`
  hattı zaten bu yönde — 52 ARKit blendshape + Mixamo). MPFB2'ye geçince bu dosya silinebilir.

---

## Yeni asset eklerken kontrol listesi (ticari ürün gate)

1. Kaynak ve lisans **net** mi? (CC0 / CC BY / royalty-free → ✅; EULA-kısıtlı / NC → ❌)
2. GLB JSON'da gömülü doku/materyal adları kaynakla tutarlı mı? (`Std_*` = Daz/CC uyarısı)
3. Atıf gerekiyorsa (CC BY / CC BY-SA) uygulamada gösteriliyor mu?
4. Royalty-free animasyon (Mixamo): yalnızca **baked GLB** gömülü, ham FBX yeniden dağıtım YOK.
5. Yukarıdaki tabloya satır eklendi mi?
