---
description: Projenin güncel durumunu ve yapılacaklar listesini Türkçe özetle
---

MediSim TR projesinin güncel durumunu bana Türkçe kısa özetle:

1. **Son commit bilgisi** — `git log -1 --pretty=format:"%h · %s · %cr"` çalıştır
2. **Çalışan dal + temiz mi** — `git status --short` ile uncommit değişiklikleri göster
3. **YENI-SOHBET-BASLANGIC.md'deki güncel öncelik listesi** — kısalt, sadece başlıklar
4. **Aktif TODO sayısı** — `src/` altında `// TODO` geçen satırları say: `grep -r "// TODO" src/ | wc -l`
5. **Senaryo + ilaç + ekipman sayısı**:
   - Senaryo: `src/data/scenarios/index.ts` içindeki export sayısı
   - İlaç: `src/data/medications.ts` içindeki tanım sayısı
   - Ekipman: `src/data/equipment.ts` içindeki tanım sayısı

Çıktı formatı — maksimum 15 satır, tablo yok, bullet noktalar halinde. Son cümlede **"sıradaki önerilen adım"** olarak tek bir görev öner.
