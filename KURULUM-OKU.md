# Build Hatası Düzeltme Paketi

4 TypeScript hatası için tek seferlik düzeltme.

## Adımlar

### 1. Zip'i proje klasörüne aç — üzerine yaz

İçindeki 2 dosya mevcutların üzerine yazılır:
- `src/engine/pharmacology/engine.ts` (kullanılmayan import kaldırıldı)
- `src/components/CriticalContraindicationModal.tsx` (onResolved → _onResolved)

### 2. Eksik paketi yükle (Node tipleri için)

CMD'de proje klasöründe:

```cmd
npm install -D @types/node
```

### 3. Build kontrolü

```cmd
npm run build
```

Beklenen çıktı: **0 hata**. Başarılıysa Adım 2'ye (mega içerik paketi) geçeriz.
