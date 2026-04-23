---
description: Yeni klinik senaryo iskeleti oluşturur (zorluk seviyeli)
argument-hint: <senaryo-id> [klinik-alan]
---

Yeni bir senaryo oluştur: **$ARGUMENTS**

## Adımlar

1. **Önce onay al** — kullanıcıya şu bilgileri sor (varsa atla):
   - Klinik alan (kardiyoloji, acil, pediatri, dahiliye, cerrahi)
   - Desteklenen zorluk seviyeleri (genelde 2-4)
   - Temel hasta profili (yaş, cinsiyet, şikayet)
   - Kaç adım öngörüyorsun (tipik 5-8)

2. **`docs/SENARYO-YAZIM-REHBERI.md` dosyasını oku** — format burada.

3. **`docs/TASARIM-KARARLARI.md` dosyasını oku** — zorluk seviyesi filtre mekaniği burada.

4. **`src/data/scenarios/stemi.ts` dosyasını referans al** — en güncel, tam oturmuş format.

5. **Dosyayı oluştur:** `src/data/scenarios/$ARGUMENTS.ts`
   - `supported_difficulties` alanını doldur
   - Her `Step` ve `ActionOutcome`'a uygun `min_difficulty` ekle
   - Klinik doğruluk için ESC/AHA/TKD/UpToDate referansı kullan
   - Emin olmadığın noktaya `// TODO klinik review` koy

6. **`src/data/scenarios/index.ts`'e ekle** — unutma, eklenmezse listeye girmez.

7. **Gerekli ilaçları doğrula** — `medications.ts` VE `medications-extended.ts` ikisinde de olmalı. Eksik varsa ekle.

8. **Build kontrol et:** `npm run build` — temiz geçmeli.

9. **Raporla:** Türkçe 3 cümle — ne oluşturdun, kaç adım, hangi zorluk seviyelerinde.

Commit mesajı şablonu:
```
feat: $ARGUMENTS senaryosu eklendi (X adım, [alan], seviye Y-Z)
```

**ÖNEMLİ:** Klinik içerikte doğaçlama YAPMA. Emin olmadığın dozlar için kullanıcıya sor.
