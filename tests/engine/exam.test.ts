// ============================================================
// Fizik muayene motoru — faz çözümü, vital doldurma, ABCDE kapsamı
// + STEMI muayene verisi bütünlük kapısı
// ============================================================

import { describe, expect, test } from "vitest";
import {
  resolveExamFinding,
  interpolateExamText,
  examCoverage,
  nextAbcdeCategory,
  ABCDE_ORDER,
} from "@/engine";
import type { ExamPointSpec, PatientVitals, ScenarioExam, HeartSound } from "@/engine";
import { STEMI_EXAM } from "@/data/exam/stemi-exam";
import { getScenarioExam } from "@/data/exam";
import { getScenario } from "@/data/scenarios";
import { EXAM_ANCHORS } from "@/components/patient-3d/examAnchors";
import { heartSoundFile } from "@/components/patient-3d/auscultationAudio";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const VITALS: PatientVitals = {
  hr: 111.6,
  bp_systolic: 92,
  bp_diastolic: 58,
  spo2: 90,
  temp: 36.8,
  rr: 24,
  gcs: 14,
};

const hsFile = (s: HeartSound) => (s === "silent" ? null : `heart_${s}`);

const POINT: ExamPointSpec = {
  id: "p1",
  site: "heart_apex",
  label: "Kalp",
  category: "C",
  technique: "oskultasyon",
  default: { text: "Normal, {hr}/dk", sound: "phase_heart" },
  by_phase: {
    sok: { text: "S3, {hr}/dk", sound: "phase_heart", abnormal: true },
    arrest: { text: "Ses yok", sound: { silent: true }, abnormal: true },
    ral: { text: "Ral", sound: { file: "lung_crackles" }, abnormal: true },
    recovering: { text: "Düzeliyor" },
  },
};

describe("interpolateExamText", () => {
  test("vital yer tutucuları yuvarlanmış değerle dolar", () => {
    expect(interpolateExamText("{hr}/dk, {sbp}/{dbp}, GKS {gcs}, {rr}, %{spo2}", VITALS)).toBe(
      "112/dk, 92/58, GKS 14, 24, %90",
    );
  });
  test("eksik vital → çizgi (NaN/undefined sızmaz)", () => {
    expect(interpolateExamText("GKS {gcs}", { ...VITALS, gcs: undefined })).toBe("GKS —");
  });
  test("bilinmeyen yer tutucuya dokunulmaz", () => {
    expect(interpolateExamText("{xyz}", VITALS)).toBe("{xyz}");
  });
});

describe("resolveExamFinding — faz çözümü", () => {
  test("faz yok → default, normal kalp sesi", () => {
    const f = resolveExamFinding(POINT, null, VITALS, hsFile);
    expect(f.text).toBe("Normal, 112/dk");
    expect(f.abnormal).toBe(false);
    expect(f.phaseId).toBe("baseline");
    expect(f.soundFile).toBe("heart_normal");
  });
  test("eşleşen faz → o fazın bulgusu + faz kalp sesi", () => {
    const f = resolveExamFinding(POINT, { phaseId: "sok", heartSound: "tachy" }, VITALS, hsFile);
    expect(f.text).toBe("S3, 112/dk");
    expect(f.abnormal).toBe(true);
    expect(f.soundFile).toBe("heart_tachy");
  });
  test("tanımsız faz → default'a düşer", () => {
    const f = resolveExamFinding(POINT, { phaseId: "bilinmeyen", heartSound: "normal" }, VITALS, hsFile);
    expect(f.text).toBe("Normal, 112/dk");
  });
  test("bilinçli sessizlik → soundFile null (undefined DEĞİL)", () => {
    const f = resolveExamFinding(POINT, { phaseId: "arrest", heartSound: "silent" }, VITALS, hsFile);
    expect(f.soundFile).toBeNull();
  });
  test("phase_heart + sessiz faz → null (arrestte kalp sesi çalmaz)", () => {
    const f = resolveExamFinding(POINT, { phaseId: "x", heartSound: "silent" }, VITALS, hsFile);
    expect(f.soundFile).toBeNull();
  });
  test("dosya sesi → dosya kökü", () => {
    const f = resolveExamFinding(POINT, { phaseId: "ral" }, VITALS, hsFile);
    expect(f.soundFile).toBe("lung_crackles");
  });
  test("recovering, faz id'sini ezer; ses tanımsızsa undefined", () => {
    const f = resolveExamFinding(POINT, { phaseId: "sok", recovering: true }, VITALS, hsFile);
    expect(f.text).toBe("Düzeliyor");
    expect(f.phaseId).toBe("recovering");
    expect(f.soundFile).toBeUndefined();
  });
});

describe("examCoverage + nextAbcdeCategory", () => {
  const exam: ScenarioExam = {
    scenario_id: "t",
    status: "DRAFT",
    sources: ["x"],
    points: [
      { ...POINT, id: "a1", category: "A" },
      { ...POINT, id: "c1", category: "C" },
      { ...POINT, id: "c2", category: "C" },
    ],
  };
  test("basamak başına sayım; tekrar muayene bir kez sayılır", () => {
    const rows = examCoverage(exam, ["c1", "c1"]);
    expect(rows.map((r) => r.category)).toEqual(ABCDE_ORDER);
    expect(rows.find((r) => r.category === "C")).toEqual({ category: "C", total: 2, done: 1 });
    expect(rows.find((r) => r.category === "B")).toEqual({ category: "B", total: 0, done: 0 });
  });
  test("sıradaki basamak: ilk eksik; boş basamak atlanır; hepsi tamamsa null", () => {
    expect(nextAbcdeCategory(examCoverage(exam, []))).toBe("A");
    expect(nextAbcdeCategory(examCoverage(exam, ["a1"]))).toBe("C");
    expect(nextAbcdeCategory(examCoverage(exam, ["a1", "c1", "c2"]))).toBeNull();
  });
});

describe("STEMI muayene verisi — bütünlük kapısı", () => {
  const scenario = getScenario(STEMI_EXAM.scenario_id);

  test("senaryoya bağlı + kayıt defterinde", () => {
    expect(scenario).toBeTruthy();
    expect(getScenarioExam(STEMI_EXAM.scenario_id)).toBe(STEMI_EXAM);
    expect(getScenarioExam("yok-boyle-senaryo")).toBeUndefined();
  });

  test("klinik içerik ACTIVE DEĞİL (yalnız Ali Bey geçirir) + kaynaklı", () => {
    expect(STEMI_EXAM.status).not.toBe("ACTIVE");
    expect(STEMI_EXAM.sources.length).toBeGreaterThan(0);
  });

  test("nokta id'leri benzersiz, her noktanın bedende çapası var", () => {
    const ids = STEMI_EXAM.points.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    const sites = STEMI_EXAM.points.map((p) => p.site);
    expect(new Set(sites).size).toBe(sites.length); // aynı yere iki nokta üst üste binmez
    for (const p of STEMI_EXAM.points) expect(EXAM_ANCHORS[p.site], p.id).toBeTruthy();
  });

  test("ABCDE'nin her basamağında en az bir nokta", () => {
    for (const r of examCoverage(STEMI_EXAM, [])) expect(r.total, r.category).toBeGreaterThan(0);
  });

  test("by_phase anahtarları gerçek faz id'si ya da 'recovering' (yazım hatası sessizce default'a düşmesin)", () => {
    const phaseIds = new Set((scenario?.deterioration ?? []).map((d) => d.id));
    for (const p of STEMI_EXAM.points) {
      for (const key of Object.keys(p.by_phase ?? {})) {
        expect(key === "recovering" || phaseIds.has(key), `${p.id}: ${key}`).toBe(true);
      }
    }
  });

  test("referans verilen her ses dosyası diskte var", () => {
    const files = new Set<string>();
    for (const p of STEMI_EXAM.points) {
      for (const f of [p.default, ...Object.values(p.by_phase ?? {})]) {
        if (f.sound && f.sound !== "phase_heart" && "file" in f.sound) files.add(f.sound.file);
      }
    }
    for (const hs of ["normal", "tachy", "s3_gallop", "muffled"] as HeartSound[]) {
      const f = heartSoundFile(hs);
      if (f) files.add(f);
    }
    for (const f of files) {
      expect(existsSync(resolve("public/sounds/auscultation", `${f}.ogg`)), f).toBe(true);
    }
  });

  test("arrestte: dinleme noktaları sessiz, nabız yok, hepsi patolojik işaretli", () => {
    const arrest = { phaseId: "stemi-arrest", heartSound: "silent" as HeartSound };
    for (const p of STEMI_EXAM.points.filter((x) => x.technique === "oskultasyon")) {
      const f = resolveExamFinding(p, arrest, VITALS, heartSoundFile);
      expect(f.soundFile, p.id).toBeNull();
      expect(f.abnormal, p.id).toBe(true);
    }
    const pulse = STEMI_EXAM.points.find((p) => p.site === "radial_pulse")!;
    expect(resolveExamFinding(pulse, arrest, VITALS, heartSoundFile).text).toMatch(/alınmıyor/);
    const crt = STEMI_EXAM.points.find((p) => p.site === "cap_refill")!;
    const v = resolveExamFinding(crt, arrest, VITALS, heartSoundFile).visual;
    expect(v?.kind === "cap_refill" && v.seconds).toBeNull();
  });

  test("kapiller dolum faz ilerledikçe uzar; başlangıç normal (≤2 sn)", () => {
    const crt = STEMI_EXAM.points.find((p) => p.site === "cap_refill")!;
    const sec = (phaseId: string) => {
      const v = resolveExamFinding(crt, { phaseId }, VITALS, heartSoundFile).visual;
      return v?.kind === "cap_refill" ? v.seconds : undefined;
    };
    const base = sec("stemi-iskemi")!;
    const sok = sec("stemi-sok")!;
    const kotu = sec("stemi-kotulesme")!;
    expect(base).toBeLessThanOrEqual(2);
    expect(sok).toBeGreaterThan(2);
    expect(kotu).toBeGreaterThan(sok);
  });

  test("hiçbir bulgu metninde çözülmemiş yer tutucu kalmaz", () => {
    for (const p of STEMI_EXAM.points) {
      for (const f of [p.default, ...Object.values(p.by_phase ?? {})]) {
        expect(interpolateExamText(f.text, VITALS), p.id).not.toMatch(/[{}]/);
      }
    }
  });
});
