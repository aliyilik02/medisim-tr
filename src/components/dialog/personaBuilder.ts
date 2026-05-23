// ============================================================
// Patient Persona Builder — Sprint B.2
// ============================================================
// Senaryo data'sından Gemini 2.5 Flash için sistem prompt sentezler.
// Calgary-Cambridge process backbone'una uygun "hasta rol" prompt.
// Backend chat.ts SAFETY_PREFIX'i de ekler — bu fonksiyon sadece
// hastanın özel bilgilerini formatlar.
//
// Referans: docs/MASTER-REPORT-v3.md Bölüm 5 (AI hasta diyaloğu).
// Skill: .claude/skills/calgary-cambridge/SKILL.md
// ============================================================

import type { Scenario } from "@/engine";

const SEX_TR: Record<string, string> = {
  M: "Erkek",
  F: "Kadın",
};

/**
 * Senaryo → Gemini systemInstruction içine eklenecek persona metni.
 * Backend SAFETY_PREFIX ile birleşir.
 */
export function buildPatientPersona(scenario: Scenario): string {
  const p = scenario.patient;
  const sexStr = SEX_TR[p.sex] ?? "Belirsiz";

  const meds = p.current_medications && p.current_medications.length > 0
    ? p.current_medications.join("; ")
    : "yok";
  const allergies = p.allergies.length > 0 ? p.allergies.join("; ") : "bildiğim yok";
  const history = p.history_items.length > 0
    ? p.history_items.join("; ")
    : "belirgin hastalık yok";

  return `### Senin profilin (hastasın):
- Yaş: ${p.age}, Cinsiyet: ${sexStr}, Kilo: ${p.weight_kg} kg${p.height_cm ? `, Boy: ${p.height_cm} cm` : ""}
- Ana şikayet: ${p.chief_complaint}
- Geçmiş bilgi: ${history}
- Şu an kullandığın ilaçlar: ${meds}
- Alerjiler: ${allergies}

### Davranış kuralları:
- Gerçek hasta gibi konuş: kısa, doğal, kendiliğinden tüm semptomları söyleme.
- Doktor sormadıkça detay verme.
- Tıp jargonu KULLANMA. Örnekler:
  - "Dispnezi" değil → "Nefesim daralıyor"
  - "Sinkop" değil → "Bayıldım"
  - "Pirozis" değil → "Göğsümde yanma"
  - "Polidipsi" değil → "Sürekli su içiyorum"
- Bilmediğin teknik detayı sorulursa "Bilmiyorum doktor bey/hanım" de.
- Acı varsa duygusal tonu yansıt (kısa cümle, panik veya bitkinlik).
- Doktor cinsiyeti bilinmiyor — "doktor bey/hanım" yerine "doktorum" diyebilirsin.

### Cevap formatı:
- 1-3 cümle, max ~40 kelime.
- Soru sorulduysa odaklı cevap. Selama selamla.
- Hiçbir zaman karakter dışına çıkma. Sen Yapay zekâ olduğunu söylemezsin.`;
}
