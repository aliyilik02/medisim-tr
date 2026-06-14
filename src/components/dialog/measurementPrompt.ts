// ============================================================
// Measurement / Objektif Bulgu Ajanı — AgentClinic çok-ajanlı port
// ============================================================
// AgentClinic (MIT, Schmidgall et al. 2024 — github.com/SamuelSchmidgall/AgentClinic)
// "MeasurementAgent" desenini porter: öğrenci muayene/tetkik isteyince,
// senaryoda TANIMLI objektif bulguları verir; senaryoda olmayanı UYDURMAZ.
// Desen ilham — KOD KOPYALANMADI, TR'ye özgün yazıldı.
//
// Bu ajan HASTA ajanından ayrıdır: hasta sübjektif anlatır ("göğsüm yanıyor"),
// ölçüm ajanı objektif rakam/bulgu verir ("TA 88/54, SpO2 %91"). Calgary-
// Cambridge'de "fizik muayene + tetkik" basamağının yapay zekâ tarafı.
//
// ⚠️ KLİNİK İÇERİK KURALI (CLAUDE.md): Bu dosya SADECE prompt iskeleti
// (string kurucu) sağlar — ACTIVE. Somut tıbbi bulgu metni senaryo
// verisinden gelir. Senaryoda örnek/placeholder muayene bulgusu
// olmadığında, ajan "kayıtlı bulgu yok" der — UYDURMAZ. Aşağıdaki
// EXAMPLE_EXAM_TEMPLATE gibi somut örnek metinler `DRAFT — Ali Bey review`
// ile işaretlendi ve canlı akışa ACTIVE bağlanmadı.
// ============================================================

import type { Scenario, PatientVitals } from "@/engine";

// ------------------------------------------------------------
// Objektif vital özetini insan-okunur metne çevirir (UYDURMA YOK)
// ------------------------------------------------------------

/** Mevcut vital alanlarını "Etiket: değer birim" satırlarına döker. */
export function formatObjectiveVitals(vitals: PatientVitals): string {
  const lines: string[] = [];
  const push = (label: string, val: number | boolean | undefined, unit = "") => {
    if (val === undefined) return;
    lines.push(`- ${label}: ${val}${unit}`);
  };

  push("Kalp hızı (HR)", vitals.hr, " /dk");
  lines.push(`- Kan basıncı (TA): ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg`);
  push("SpO2", vitals.spo2, " %");
  push("Solunum sayısı (RR)", vitals.rr, " /dk");
  push("Ateş", vitals.temp, " °C");
  push("Ağrı skoru", vitals.pain, "/10");
  push("Kan şekeri", vitals.glucose, " mg/dL");
  push("GKS", vitals.gcs, "/15");
  push("EtCO2", vitals.etco2, " mmHg");
  push("MAP", vitals.map, " mmHg");
  push("Saatlik idrar", vitals.urine_output_ml_hr, " mL/saat");

  return lines.join("\n");
}

// ------------------------------------------------------------
// Senaryoda hangi objektif veri kaynakları var? (envanter)
// ------------------------------------------------------------

/** Tetkik istendiğinde ölçüm ajanının erişebileceği kaynakların özeti. */
export function listAvailableObjectiveSources(scenario: Scenario): string {
  const sources: string[] = [];

  if (scenario.lab_panels && Object.keys(scenario.lab_panels).length > 0) {
    const names = Object.values(scenario.lab_panels).map((pn) => pn.name_tr);
    sources.push(`Laboratuvar panelleri: ${names.join(", ")}`);
  }
  if (scenario.imaging_results && Object.keys(scenario.imaging_results).length > 0) {
    const names = Object.values(scenario.imaging_results).map((im) => im.name_tr);
    sources.push(`Görüntüleme: ${names.join(", ")}`);
  }
  if (scenario.available_equipment.length > 0) {
    sources.push(`Kullanılabilir ekipman id'leri: ${scenario.available_equipment.join(", ")}`);
  }

  if (sources.length === 0) {
    return "Bu senaryoda tanımlı ek tetkik/görüntüleme yok — yalnızca vital ve fizik muayene mevcuttur.";
  }
  return sources.map((s) => `- ${s}`).join("\n");
}

// ------------------------------------------------------------
// ⚠️ DRAFT — Ali Bey review (somut örnek muayene metni)
// ------------------------------------------------------------
// Aşağıdaki şablon yalnızca prompt'a "bulgu nasıl ifade edilir" örneği
// göstermek için yer tutucudur. SOMUT KLİNİK BULGU İÇERİR (oskültasyon,
// palpasyon ifadeleri) → DRAFT. Canlı çağrıya ACTIVE bağlanmaz; sadece
// senaryo kendi muayene metnini sağlamadığında "format örneği" olarak
// promptta gösterilir ve açıkça "ÖRNEK — gerçek değer değil" denir.
const EXAMPLE_EXAM_TEMPLATE_DRAFT = [
  "Genel görünüm: (örn. soluk, terli, takipneik)",
  "Oskültasyon: (örn. bilateral inspiratuar ral / ekspiryum wheezing)",
  "Batın: (örn. yumuşak, defans yok)",
  "Nörolojik: (örn. GKS, pupil ışık refleksi)",
].join("; ");

// ------------------------------------------------------------
// Ölçüm ajanı sistem promptu (ACTIVE — teknik iskelet)
// ------------------------------------------------------------

/**
 * Senaryo → "Ölçüm/objektif bulgu ajanı" sistem promptu.
 *
 * Sözleşme (AgentClinic MeasurementAgent deseni):
 *  1. Öğrenci muayene/tetkik isteyince yalnızca senaryoda TANIMLI objektif
 *     bulguyu verir.
 *  2. Senaryoda olmayan değeri UYDURMAZ → "Bu tetkik bu vakada tanımlı değil"
 *     veya "Kayıtlı bulgu yok" der.
 *  3. Hastanın duygusunu/sübjektif anlatımını yapmaz (o hasta ajanının işi).
 */
export function buildMeasurementPrompt(scenario: Scenario): string {
  const objectiveVitals = formatObjectiveVitals(scenario.initial_vitals);
  const sources = listAvailableObjectiveSources(scenario);

  return `### Rolün: Objektif Bulgu / Ölçüm Birimi
Sen bir hasta DEĞİLSİN. Sen muayene bulgularını ve tetkik sonuçlarını
bildiren tarafsız klinik ölçüm birimisin (monitör + laboratuvar + radyoloji
sözcüsü). Öğrenci (hekim adayı) bir muayene yapmak ya da tetkik istemek
istediğinde sonucu sen verirsin.

### Vakanın başlangıç objektif vitalleri (kesin veri):
${objectiveVitals}

### Erişebildiğin ek bulgu kaynakları:
${sources}

### Mutlak kurallar:
- SADECE bu vakada tanımlı objektif veriyi bildir. Sayıyı veya bulguyu
  ASLA UYDURMA.
- İstenen tetkik/muayene bu vakada tanımlı DEĞİLSE açıkça şöyle de:
  "Bu tetkik/muayene bu vakada tanımlı değil; kayıtlı bir sonuç yok."
- Sübjektif yorum, tanı veya tedavi önerisi VERME — yalnızca ham bulgu.
  (Tanı muhakemesi öğrenciye, değerlendirme moderatöre aittir.)
- Kısa, klinik ve nötr bir dille yanıtla. Birim ve referans aralığı varsa ekle.
- Hangi tetkik/muayenenin yapıldığını başlıkla belirt (örn. "Akciğer oskültasyonu:").

### Bulgu ifadesi formatı (YALNIZCA ÖRNEK — gerçek değer değil, DRAFT):
${EXAMPLE_EXAM_TEMPLATE_DRAFT}`;
}
