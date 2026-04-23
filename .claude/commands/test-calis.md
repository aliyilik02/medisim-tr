---
description: TypeScript tip kontrolü, lint ve prod build testini çalıştırır
---

MediSim TR için kapsamlı kontrol çalıştır:

1. **TypeScript tip kontrolü:** `npx tsc --noEmit`
2. **Lint:** `npm run lint`
3. **Prod build:** `npm run build`

Her biri ayrı çalışsın, hata varsa **durma** — hepsini çalıştır, sonunda birleşik rapor ver:

```
✅/❌ TypeScript (X hata)
✅/❌ Lint (X uyarı)
✅/❌ Build (X saniye)
```

Hatalar varsa:
- **Tip hataları** — dosya + satır + hata türü göster, sonra düzeltmeyi öner
- **Lint uyarıları** — sadece `error` seviyesi olanları rapor et, `warning` seviyesi kritik değil
- **Build hatası** — genelde tip/import hatası; önce onları çöz

**Otomatik düzeltme:** Basit hataları (import eksik, tip annotation, unused var) kendin düzelt. Mantıksal hatalarda durup sor.

Son raporu Türkçe tek paragrafla bitir.
