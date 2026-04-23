---
description: Commit atmadan önce build başarılı mı kontrol eder
---

Commit öncesi zorunlu kontrol. **Bu geçmeden commit atma.**

## Sıra

1. `git status` — neler değişmiş bak
2. `npx tsc --noEmit` — tip kontrolü
3. `npm run build` — prod build
4. Varsa kritik `// TODO klinik review` işaretlerini listele: `grep -rn "TODO klinik" src/`

## Sonuç

**Hepsi yeşilse:**
- Kullanıcıdan commit mesajı iste (veya Türkçe conventional commit öner)
- `git add .` + `git commit -m "..."` + `git push` çalıştır
- Son olarak commit hash + değişen dosya sayısı raporla

**Bir tanesi kırmızıysa:**
- **Commit ATMA**
- Hataları Türkçe özet + düzeltme önerisi ile göster
- Kullanıcıya "düzelteyim mi?" diye sor

## Commit mesajı formatı

```
feat: yeni özellik
fix: bug düzeltmesi
refactor: yeniden düzenleme
docs: dokümantasyon
chore: bağımlılık / yapılandırma
```

Mesaj Türkçe. Baş harf küçük. 50 karakteri geçmesin.
