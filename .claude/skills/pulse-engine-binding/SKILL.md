---
name: pulse-engine-binding
description: Pulse Physiology Engine (Apache 2.0, Kitware) entegrasyon pattern'i — Node sidecar (Fly.io/Railway/Render) + WebSocket → R3F state bridge. PatientState → VisualParams mapping katmanı (cilt tonu, breathing rate, kalp atışı, pupilla). Sprint D.1 için.
---

# Pulse Engine Binding — Fizyolojik Simülasyon Köprüsü

## Ne zaman kullan

- Sprint D.1 — Pulse Physiology Engine entegrasyonu
- Senaryo runtime'ında **dinamik vital değişim** (statik yerine fizyolojik tepki)
- İlaç farmakokinetik simülasyon (insülin → glukoz düşüş profili)
- Hemoraj/şok progression (HR↑, SBP↓, cilt soluk)
- Sepsis bundle response

## Birincil veri kaynağı

⭐ **Master rapor:** `docs/MASTER-REPORT-v3.md` Bölüm 4.9 (Pulse karar) + 6 (Cloudflare + sidecar).
**Memory:** `docs/memory/medisim_animasyon_teknikleri.md` (R3F state bridge), `docs/memory/medisim_anatomik_landmark.md` (görsel mapping noktaları).

## Pulse Engine Temel

- **Lisans:** Apache 2.0 — SaaS uyumlu (no copyleft)
- **Kaynak:** Kitware, pulse.kitware.com (BioGears fork)
- **Validation:** Bray A et al. 2019, SN Comprehensive Clinical Medicine — hemorrhage validation'da BioGears + MUSE + HumMod arasında en gerçekçi
- **Dil:** C++ core, Python/Java/C# binding'ler var, JS yok (Emscripten WASM denenir)

## Mimari Karar (master rapor 4.9)

**A) Emscripten WASM (tarayıcıda):** Latency 0, ama 5-15 MB bundle + mobil CPU yükü → **REDDEDİLDİ** ilk faz için.

**B) Node sidecar (ayrı container):** Apache 2.0 Pulse Engine Node binding (community), WebSocket bridge → R3F. Latency 50-200 ms (kabul edilebilir). **SEÇİLDİ.**

### Sidecar Mimarisi

```
[Browser R3F] ←─WebSocket─→ [Node Sidecar (Fly.io/Railway)] ←─binding─→ [Pulse C++ engine]
       ↑                                ↓
    visualParams                  patientState
    (skinTint, HR, RR,            (HR, SBP, SpO2,
     pupilSize, edema)             temperature, ...)
```

## Pulse → R3F State Bridge

### Sidecar API (örnek)

```typescript
// Node sidecar endpoint (Fastify + ws):
POST /api/pulse/start
  body: { scenarioPatientState, advanceTimeStep_s: 0.05 }
  returns: { sessionId }

WebSocket /api/pulse/stream?session=...
  server pushes: PatientStateSnapshot { hr, sbp, dbp, spo2, temp, rr, ... }

POST /api/pulse/action
  body: { sessionId, action: "give_medication", target: "morphine", dose: "5mg IV" }
```

### Frontend Hook

```tsx
function usePulseSession(scenarioId: string) {
  const [state, setState] = useState<PatientState | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    fetch("/api/pulse/start", {
      method: "POST",
      body: JSON.stringify({ scenarioId }),
    })
      .then((r) => r.json())
      .then(({ sessionId }) => {
        const ws = new WebSocket(`/api/pulse/stream?session=${sessionId}`);
        ws.onmessage = (e) => setState(JSON.parse(e.data));
        wsRef.current = ws;
      });
    return () => wsRef.current?.close();
  }, [scenarioId]);

  return state;
}
```

### Visual Mapping Layer (`src/clinical/visual-mapping.ts`)

```ts
// Saf TS, %100 birim test edilmeli (master rapor 4.10)
export function patientStateToVisual(state: PatientState): VisualParams {
  return {
    skinTint:
      state.spo2 < 90 ? "cyanosis"
      : state.bilirubin > 2 ? "jaundice"
      : state.sbp < 90 ? "pallor"
      : "normal",
    breathingRate: state.rr / 60,  // /sn
    heartRate: state.hr / 60,
    pupilSize: state.pupilReactive
      ? lerp(0.1, 0.4, state.ambientLight / 100)
      : 0.5,  // sabit, no light reflex
    jugularVenousDistension: clamp((state.cvp - 8) / 4, 0, 1),
    edema: state.edemaScore,
  };
}
```

## R3F Component Tüketimi

```tsx
const pulseState = usePulseSession(scenarioId);
const visual = useMemo(
  () => pulseState ? patientStateToVisual(pulseState) : defaultVisual,
  [pulseState],
);

<PatientBody3D
  breathing={true}
  skinTint={visual.skinTint}
  // pupilSize, edema, jugular... 
/>
```

## Pulse Engine Compartments

Master rapor 4.9'da listelenenler (Pulse'ın modellediği):
- Kardiyovasküler (HR, SBP, CO, SVR, vasküler tonus)
- Pulmoner (RR, TV, FiO2, SpO2, EtCO2)
- Renal (GFR, idrar çıkışı, K+ dengesi)
- Endokrin (insülin, glukoz, kortizol)
- Hematoloji (Hb, Hct, kanama)
- Termoregülasyon
- Substance compartments (ilaç PK/PD)

## İlaç Modeli (PK/PD)

```typescript
POST /api/pulse/medication
  body: { sessionId, drug: "insulin_regular", dose_units: 6, route: "IV_bolus" }
// Pulse internal: substance manager hesaplar onset/peak/duration + glukoz düşüşü
```

Pulse'da olmayan ilaçlar için (TİTCK ruhsatlı TR ilaçları), MediSim TR'nin kendi `pharmacology` engine'i kullanılır (`src/engine/pharmacology/`). Pulse Engine bunu override edebilir.

## Gotchas

- ❌ **WebSocket disconnect handling şart** — sidecar deploy/restart sırasında session kaybı. Reconnect + state replay logic.
- ❌ **Time scale uyumsuzluk** — Pulse default real-time, MediSim TR senaryolarda `time_scale_override` (eğitim 8x, klinik 3x). Sidecar'da hızlandırılmış simülasyon parametresi.
- ❌ **Pulse C++ Node binding maintained mı?** Master rapor 12 caveat: "Resmi JS/WASM port yok, Emscripten denenebilir ama maintained değil." Node binding alternatifi araştırılmalı; yoksa sidecar Python+gRPC olabilir.
- ❌ Tüm vital'leri Pulse'a delege etme — basit senaryolarda static `expected_outcomes.vitals_change` yeterli (master rapor 5: dinamik için Pulse).
- ✅ Visual mapping katmanı **saf TS** — birim test, klinik doğruluk için kritik.
- ✅ Sidecar **opsiyonel** — basit senaryolar Pulse'sız çalışır (mock state).

## Validation Test (master rapor 4.9)

> Bray A et al. 2019, doi:10.1007/s42399-019-00053-w — hemorrhage validation Pulse en gerçekçi.

MediSim TR senaryolarında Pulse output'unu literatür ile spot-check et:
- DKA: insülin sonrası glukoz düşüş hızı (60-80 mg/dL/saat hedefi)
- Hipovolemik şok: 30% blood loss → MAP düşüş profili
- Sepsis: 6L sıvı response (Surviving Sepsis 2021)

## Referans dosyalar

- `src/engine/pharmacology/types.ts` — mevcut ilaç model
- `src/engine/types.ts` — `SessionState`, `PatientVitals`
- `docs/MASTER-REPORT-v3.md` Bölüm 4.9 (Pulse) + 6 (Cloudflare)
- pulse.kitware.com — resmi docs
- Bray A 2019 (PMID: doi.org/10.1007/s42399-019-00053-w)
