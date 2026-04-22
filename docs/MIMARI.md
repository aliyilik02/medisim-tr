# Mimari

MediSim TR'nin teknik tasarımı. Bu belge hem yeni katkıcıların, hem de
Claude Code'un projeye hızla hakim olmasını sağlar.

## Üst düzey görünüm

```
┌──────────────────────────────────────────────────────────┐
│                    React UI (Vite)                        │
│  ┌──────────┐  ┌─────────┐  ┌──────────┐  ┌───────────┐  │
│  │ Pages    │  │ Panels  │  │ 3D View  │  │ Debrief   │  │
│  │ (Router) │  │ (Vitals,│  │ (Three.js│  │ (Score,   │  │
│  │          │  │ Patient,│  │  sonra)  │  │  öğrenim) │  │
│  │          │  │ Envanter│  │          │  │           │  │
│  └────┬─────┘  └────┬────┘  └────┬─────┘  └─────┬─────┘  │
│       │             │            │              │         │
│       └─────────────┴────┬───────┴──────────────┘         │
│                          │                                │
│               ┌──────────▼─────────┐                      │
│               │   Scenario Engine  │                      │
│               │  (src/engine/*)    │                      │
│               │                    │                      │
│               │ - types.ts (şema)  │                      │
│               │ - engine.ts (mant.)│                      │
│               └──────────┬─────────┘                      │
│                          │                                │
│               ┌──────────▼─────────┐                      │
│               │   Senaryo Verisi   │                      │
│               │  (src/data/**)     │                      │
│               └────────────────────┘                      │
└──────────────────────────────────────────────────────────┘
```

## Klasör yapısı

```
medisim-tr/
├── src/
│   ├── engine/              → Senaryo motoru (UI'dan bağımsız)
│   │   ├── types.ts         →   TÜM veri tipleri (şema)
│   │   ├── engine.ts        →   Aksiyon değerlendirme, adım geçişi
│   │   └── index.ts         →   Dış API
│   │
│   ├── data/                → Statik içerik
│   │   ├── medications.ts   →   İlaç kataloğu
│   │   ├── equipment.ts     →   Ekipman kataloğu
│   │   └── scenarios/       →   SENARYOLAR — yeni eklenenler buraya
│   │       ├── index.ts     →   Kayıt listesi
│   │       ├── stemi.ts
│   │       └── anaflaksi.ts
│   │
│   ├── pages/               → Sayfalar (router ile bağlı)
│   │   ├── HomePage.tsx
│   │   ├── ScenarioListPage.tsx
│   │   └── ScenarioPlayPage.tsx
│   │
│   ├── components/          → Tekrar kullanılan UI parçaları
│   │   ├── PatientCard.tsx
│   │   ├── VitalsMonitor.tsx
│   │   ├── InventoryPanel.tsx
│   │   ├── StepDisplay.tsx
│   │   ├── FeedbackToast.tsx
│   │   └── DebriefScreen.tsx
│   │
│   ├── lib/                 → Küçük yardımcılar
│   │   └── cn.ts
│   │
│   ├── App.tsx              → Router kök
│   ├── main.tsx             → Entry point
│   └── index.css            → Tailwind + custom stiller
│
├── public/                  → Statik dosyalar
├── docs/                    → Dokümantasyon
├── scenarios/               → (Gelecek) YAML senaryolar
└── [config dosyaları]
```

## Temel mimari kararlar

### 1. Engine ↔ UI ayrımı

Tüm senaryo mantığı `src/engine/` içinde, React'tan tamamen bağımsız. Sebep:

- İleride 3D modül eklendiğinde aynı engine kullanılacak
- Test yazmak kolay
- Node.js'de de çalışabilir (ileride backend puanlama için)

**Kural:** `engine/` içindeki kod asla React import etmez.

### 2. Senaryolar TypeScript nesnesi olarak

Şu an senaryolar `src/data/scenarios/*.ts` içinde TS objesi. Avantaj:

- Tip güvenliği — yanlış yazarsan compiler yakalar
- Hızlı geliştirme, YAML parser ihtiyacı yok
- Import edilir, bundle'a dahil olur

**İleride:** `scenarios/` kök klasöründe YAML dosyaları olacak, build sırasında
otomatik TS'e dönüşecek. Bu, sağlıkçıların kod yazmadan senaryo eklemesini
sağlar.

### 3. State yönetimi

- Şu an sadece `useState` — `ScenarioPlayPage` içinde
- State karmaşıklaşırsa **Zustand**'a geçeceğiz (zaten bağımlılıklarda)
- Redux **kullanmıyoruz** (gereksiz)

### 4. Routing

React Router 6. Sayfalar:

- `/` → Ana sayfa
- `/senaryolar` → Liste
- `/oyna/:id` → Oyun + debrief

### 5. Styling

- Tailwind utility-first
- Renk paleti `tailwind.config.js`'de (ink-*, clinical-*, brand)
- Tekrar eden bileşen stilleri `@layer components` olarak `index.css`'de
  (`.panel`, `.btn-primary`, `.tag`, vb.)

## Senaryo akışı — bir oyun nasıl çalışır

```
1. Kullanıcı /oyna/:id sayfasına gelir
2. Mod seçer (eğitim / sınav)
3. startSession(scenario, mode) → yeni SessionState
4. getCurrentStep() ile mevcut adım çekilir
5. UI adımı render eder:
     - ActionStep  → envanter açık, kullanıcı aksiyon seçer
     - DecisionStep → seçenekler, tek tıklama
     - InfoStep    → metin + "devam"
6. Kullanıcı aksiyon yapar:
     - evaluateAction() → puan, feedback, vitals değişimi
     - UI feedback gösterir
     - actionsThisStep listesine eklenir
7. Adım tamamlanır:
     - completeStep() → session güncellenir, sonraki adıma geçilir
     - Yoksa finalizeSession() → finished: true, grade hesaplanır
8. Debrief ekranı gösterilir
```

## Tip hiyerarşisi

`engine/types.ts` içindeki ana tipler:

- `Scenario` — tüm senaryo (hasta, envanter, adımlar, puanlama, debrief)
- `Step` = `ActionStep | DecisionStep | InfoStep` (discriminated union)
- `SessionState` — runtime durum (hangi adım, toplam puan, vitaller)
- `ActionRef` — kullanıcı ne yaptı? (tip + hedef id)
- `ActionOutcome` — beklenen aksiyonun karşılığı (puan, feedback, vitals değişimi)

## Yeni senaryo eklemek

En sık yapılacak iş. Özet:

1. `src/data/scenarios/yeni-senaryo.ts` oluştur
2. `Scenario` tipinde bir obje export et
3. `src/data/scenarios/index.ts`'e import + `SCENARIOS` dizisine ekle

Detaylar için [SENARYO-YAZIM-REHBERI.md](./SENARYO-YAZIM-REHBERI.md).

## Yeni özellik eklemek (geliştirici için)

- **Yeni aksiyon türü** → `ActionType` union'ına ekle + `evaluateAction`
- **Yeni step türü** → `Step` union'ına ekle + `StepDisplay` render ekle
- **Yeni envanter kategorisi** → `medications.ts` / `equipment.ts` güncelle
- **Yeni ölçüt** → `PatientVitals` genişlet + `VitalsMonitor` render

## Gelecek: 3D modül nasıl bağlanacak

Plan:

1. Senaryoda `scene: SceneConfig` alanı (şimdiden şemada var)
2. `SceneConfig.hotspots` — vücutta tıklanabilir alanlar
3. Her hotspot bir `associated_step_ids` listesi taşır
4. 3D sayfa `ScenarioPlay3DPage` açılır → hotspot tıklandığında
   ilgili adım açılır
5. Aynı engine, aynı puanlama — sadece UI farklı

Böylece **tek senaryo, iki modda oynanabilir.** İçerik iki kere yazılmaz.

## Performans / erişilebilirlik

- Şu an ön fazda; optimizasyon sonra.
- Mobilde çalışır, 3D'ye geçince `loading="lazy"` ile hotspotlar lazy load edilecek
- Klavye navigasyonu temel düzeyde çalışıyor; ARIA geliştirmeleri Faz 2

## Test stratejisi (gelecek)

Şu an test yok. Hedef:

- **Engine testleri** (Vitest) — senaryo mantığı saf fonksiyon, test kolay
- **Senaryo doğrulaması** — her senaryo şemaya uyuyor mu? (otomatik)
- **E2E** (Playwright) — bir senaryoyu uçtan uca oyna

Claude Code'a "engine için test yaz" diyerek hızlıca başlanabilir.
