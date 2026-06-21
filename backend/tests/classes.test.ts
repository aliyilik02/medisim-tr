// ============================================================
// Sınıf / öğrenci / attempt entegrasyon testleri (Tier-2 inc-3)
// ============================================================
// worker.fetch üzerinden uçtan uca: kayıt → sınıf → öğrenci → öğrenci
// girişi → attempt → eğitmen paneli. Rol kapısı + sahiplik + 401/403.
// FakeD1 (helpers/fake-d1) gerçek I/O olmadan db layer'ı yorumlar.
// ============================================================

import { describe, it, expect, beforeEach } from "vitest";
import worker from "../src/index";
import { FakeD1, makeTestEnv } from "./helpers/fake-d1";
import type { Env } from "../src/types";

let db: FakeD1;
let env: Env;

beforeEach(() => {
  db = new FakeD1();
  env = makeTestEnv(db);
});

function cookieFrom(res: Response): string {
  const sc = res.headers.get("Set-Cookie") ?? "";
  return sc.split(";")[0]; // medisim_session=<token>
}

async function call(
  path: string,
  method: string,
  body?: unknown,
  cookie?: string,
): Promise<Response> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (cookie) headers["Cookie"] = cookie;
  const req = new Request(`http://localhost${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  return worker.fetch(req, env, {} as ExecutionContext);
}

/** KVKK rıza ver (consent_at damgala) — korumalı uçlar bunu gerektirir. */
async function giveConsent(cookie: string): Promise<void> {
  const res = await call("/api/auth/consent", "POST", {}, cookie);
  expect(res.status).toBe(200);
}

async function registerInstructor(
  handle = "hoca",
  email = "hoca@test.edu",
  slug = "okul",
): Promise<string> {
  const res = await call("/api/auth/register", "POST", {
    invite_code: "TEST-INVITE",
    handle,
    email,
    password: "instructor-pass",
    institution_slug: slug,
    institution_name: "Test Okulu",
  });
  expect(res.status).toBe(200);
  const cookie = cookieFrom(res);
  await giveConsent(cookie); // rıza olmadan sınıf/attempt uçları 403 döner
  return cookie;
}

/** Öğrenci giriş + rıza → korumalı uçlara hazır cookie. */
async function loginStudentConsented(
  institution: string,
  handle: string,
  password: string,
): Promise<string> {
  const cookie = cookieFrom(
    await call("/api/auth/login", "POST", { institution, handle, password }),
  );
  await giveConsent(cookie);
  return cookie;
}

describe("POST /api/classes — sınıf oluştur", () => {
  it("eğitmen sınıf oluşturur, join_code üretilir", async () => {
    const cookie = await registerInstructor();
    const res = await call("/api/classes", "POST", { name: "Acil 101" }, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { class: { id: string; name: string; join_code: string; student_count: number } };
    expect(body.class.name).toBe("Acil 101");
    expect(body.class.join_code).toMatch(/^[A-Z0-9]{6}$/);
    expect(body.class.student_count).toBe(0);
  });

  it("oturumsuz → 401", async () => {
    const res = await call("/api/classes", "POST", { name: "X" });
    expect(res.status).toBe(401);
  });

  it("kısa ad → 400", async () => {
    const cookie = await registerInstructor();
    const res = await call("/api/classes", "POST", { name: "A" }, cookie);
    expect(res.status).toBe(400);
  });

  it("öğrenci sınıf oluşturamaz → 403", async () => {
    // eğitmen + sınıf + öğrenci kur
    const insCookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Sınıf" }, insCookie)).json()) as {
      class: { id: string };
    };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "ogr1", password: "ogrenci1" }, insCookie);
    const stuCookie = cookieFrom(
      await call("/api/auth/login", "POST", { institution: "okul", handle: "ogr1", password: "ogrenci1" }),
    );
    const res = await call("/api/classes", "POST", { name: "Hack" }, stuCookie);
    expect(res.status).toBe(403);
  });
});

describe("POST /api/classes/:id/students — öğrenci hesabı", () => {
  it("eğitmen öğrenci açar + kayıt + öğrenci giriş yapabilir", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Sınıf" }, cookie)).json()) as {
      class: { id: string };
    };
    const cRes = await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "ayse", password: "parola1" }, cookie);
    expect(cRes.status).toBe(200);
    const cBody = (await cRes.json()) as { student: { id: string; handle: string; institution_slug: string } };
    expect(cBody.student.handle).toBe("ayse");
    expect(cBody.student.institution_slug).toBe("okul");

    // öğrenci giriş: kurum slug + handle + şifre (e-postasız)
    const login = await call("/api/auth/login", "POST", { institution: "okul", handle: "ayse", password: "parola1" });
    expect(login.status).toBe(200);
    const lBody = (await login.json()) as { user: { role: string; handle: string; consent: boolean } };
    expect(lBody.user.role).toBe("student");
    expect(lBody.user.consent).toBe(false); // KVKK rıza henüz yok
  });

  it("handle case-insensitive: BÜYÜK harfle açılan öğrenci küçük harfle giriş yapar", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Sınıf" }, cookie)).json()) as { class: { id: string } };
    // BÜYÜK harfli handle ile oluştur
    const cRes = await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "Veli_1", password: "parola1" }, cookie);
    expect(((await cRes.json()) as { student: { handle: string } }).student.handle).toBe("veli_1"); // lowercase saklandı
    // farklı case ile giriş → başarılı
    const login = await call("/api/auth/login", "POST", { institution: "okul", handle: "VELI_1", password: "parola1" });
    expect(login.status).toBe(200);
    expect(((await login.json()) as { user: { role: string } }).user.role).toBe("student");
  });

  it("aynı handle ikinci kez → 409", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Sınıf S" }, cookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "dup", password: "parola1" }, cookie);
    const res = await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "dup", password: "parola1" }, cookie);
    expect(res.status).toBe(409);
  });

  it("zayıf şifre (<6) → 400", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Sınıf S" }, cookie)).json()) as { class: { id: string } };
    const res = await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "x", password: "123" }, cookie);
    expect(res.status).toBe(400);
  });

  it("başka eğitmenin sınıfına öğrenci eklenemez → 403", async () => {
    const aCookie = await registerInstructor("hocaA", "a@test.edu", "okulA");
    const clsA = (await (await call("/api/classes", "POST", { name: "Sınıf A" }, aCookie)).json()) as { class: { id: string } };
    const bCookie = await registerInstructor("hocaB", "b@test.edu", "okulB");
    const res = await call("/api/classes/" + clsA.class.id + "/students", "POST", { handle: "z", password: "parola1" }, bCookie);
    expect(res.status).toBe(403);
  });
});

describe("GET /api/classes + /:id — eğitmen paneli", () => {
  it("kendi sınıflarını listeler + öğrenci sayısı", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Liste" }, cookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "s1", password: "parola1" }, cookie);
    const res = await call("/api/classes", "GET", undefined, cookie);
    const body = (await res.json()) as { classes: { id: string; student_count: number }[] };
    expect(body.classes).toHaveLength(1);
    expect(body.classes[0].student_count).toBe(1);
  });

  it("sınıf detayı roster + slug döner", async () => {
    const cookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Detay" }, cookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "bora", password: "parola1" }, cookie);
    const res = await call("/api/classes/" + cls.class.id, "GET", undefined, cookie);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      roster: { handle: string }[];
      institution_slug: string;
      attempts: unknown[];
    };
    expect(body.roster.map((r) => r.handle)).toContain("bora");
    expect(body.institution_slug).toBe("okul");
  });

  it("başka eğitmenin sınıf detayı → 403", async () => {
    const aCookie = await registerInstructor("hA", "a@x.edu", "sA");
    const clsA = (await (await call("/api/classes", "POST", { name: "Sınıf A" }, aCookie)).json()) as { class: { id: string } };
    const bCookie = await registerInstructor("hB", "b@x.edu", "sB");
    const res = await call("/api/classes/" + clsA.class.id, "GET", undefined, bCookie);
    expect(res.status).toBe(403);
  });

  it("olmayan sınıf → 404", async () => {
    const cookie = await registerInstructor();
    const res = await call("/api/classes/yok-boyle-id", "GET", undefined, cookie);
    expect(res.status).toBe(404);
  });
});

describe("attempts — kayıt + öğrenci ilerlemesi", () => {
  async function setupStudent(): Promise<{ insCookie: string; stuCookie: string; classId: string }> {
    const insCookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Snf" }, insCookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "ali", password: "parola1" }, insCookie);
    const stuCookie = await loginStudentConsented("okul", "ali", "parola1");
    return { insCookie, stuCookie, classId: cls.class.id };
  }

  it("öğrenci attempt kaydeder, kendi listesinde görür", async () => {
    const { stuCookie } = await setupStudent();
    const post = await call(
      "/api/attempts",
      "POST",
      { scenario_id: "stemi", score: 80, max_score: 100, started_at: 1000, finished_at: 1300, summary_json: { grade: "B" } },
      stuCookie,
    );
    expect(post.status).toBe(200);
    const list = await call("/api/attempts", "GET", undefined, stuCookie);
    const body = (await list.json()) as { attempts: { scenario_id: string; score: number }[] };
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].scenario_id).toBe("stemi");
    expect(body.attempts[0].score).toBe(80);
  });

  it("attempt user_id JWT'den alınır (gövdedeki user_id yok sayılır)", async () => {
    const { insCookie, stuCookie, classId } = await setupStudent();
    // öğrenci başka user_id enjekte etmeye çalışsa bile kendi adına kaydedilir
    await call(
      "/api/attempts",
      "POST",
      { scenario_id: "dka", score: 50, max_score: 100, started_at: 2000, user_id: "baskasi" },
      stuCookie,
    );
    // eğitmen sınıf denemelerinde bu öğrencinin handle'ıyla görür
    const detail = await call("/api/classes/" + classId, "GET", undefined, insCookie);
    const body = (await detail.json()) as { attempts: { handle: string; scenario_id: string }[] };
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].handle).toBe("ali");
    expect(body.attempts[0].scenario_id).toBe("dka");
  });

  it("oturumsuz attempt → 401", async () => {
    const res = await call("/api/attempts", "POST", { scenario_id: "x" });
    expect(res.status).toBe(401);
  });

  it("scenario_id yok → 400", async () => {
    const { stuCookie } = await setupStudent();
    const res = await call("/api/attempts", "POST", { score: 10 }, stuCookie);
    expect(res.status).toBe(400);
  });

  it("eğitmen yalnızca kendi sınıfının denemelerini görür (sızıntı yok)", async () => {
    const { stuCookie } = await setupStudent();
    await call("/api/attempts", "POST", { scenario_id: "s", score: 1, max_score: 10, started_at: 1 }, stuCookie);
    // ikinci eğitmen + sınıf (boş) — başka öğrencinin denemesini görmemeli
    const bCookie = await registerInstructor("hocaB", "b@test.edu", "okulB");
    const clsB = (await (await call("/api/classes", "POST", { name: "Sınıf B" }, bCookie)).json()) as { class: { id: string } };
    const detail = await call("/api/classes/" + clsB.class.id, "GET", undefined, bCookie);
    const body = (await detail.json()) as { attempts: unknown[] };
    expect(body.attempts).toHaveLength(0);
  });

  it("deneme öğrencinin tek sınıfına atfedilir + o sınıfta görünür (#1)", async () => {
    const { insCookie, stuCookie, classId } = await setupStudent();
    await call("/api/attempts", "POST", { scenario_id: "stemi", score: 7, max_score: 10, started_at: 1 }, stuCookie);
    const detail = await call("/api/classes/" + classId, "GET", undefined, insCookie);
    const body = (await detail.json()) as { attempts: { scenario_id: string; class_id: string | null }[] };
    expect(body.attempts).toHaveLength(1);
    expect(body.attempts[0].class_id).toBe(classId);
  });

  it("eğitmenin kendi (kayıtsız) denemesi hiçbir sınıfta görünmez (class_id null)", async () => {
    const { insCookie, classId } = await setupStudent();
    // eğitmen sınıfa kayıtlı değil → attempt class_id null → panelde yok
    await call("/api/attempts", "POST", { scenario_id: "x", score: 5, max_score: 10, started_at: 1 }, insCookie);
    const detail = await call("/api/classes/" + classId, "GET", undefined, insCookie);
    const body = (await detail.json()) as { attempts: unknown[] };
    expect(body.attempts).toHaveLength(0);
  });
});

describe("güvenlik düzeltmeleri — consent + skor doğrulama", () => {
  it("rıza vermeyen öğrenci attempt POST → 403 consent_required (#3)", async () => {
    const insCookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Snf" }, insCookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "rizasiz", password: "parola1" }, insCookie);
    // login ama consent YOK
    const stuCookie = cookieFrom(
      await call("/api/auth/login", "POST", { institution: "okul", handle: "rizasiz", password: "parola1" }),
    );
    const res = await call("/api/attempts", "POST", { scenario_id: "s", started_at: 1 }, stuCookie);
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("consent_required");
  });

  it("score > max_score → 400 (#2)", async () => {
    const insCookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Snf" }, insCookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "ali", password: "parola1" }, insCookie);
    const stuCookie = await loginStudentConsented("okul", "ali", "parola1");
    const res = await call("/api/attempts", "POST", { scenario_id: "s", score: 999, max_score: 10, started_at: 1 }, stuCookie);
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toBe("invalid_score");
  });

  it("finished_at < started_at → 400 (#2)", async () => {
    const insCookie = await registerInstructor();
    const cls = (await (await call("/api/classes", "POST", { name: "Snf" }, insCookie)).json()) as { class: { id: string } };
    await call("/api/classes/" + cls.class.id + "/students", "POST", { handle: "ali", password: "parola1" }, insCookie);
    const stuCookie = await loginStudentConsented("okul", "ali", "parola1");
    const res = await call("/api/attempts", "POST", { scenario_id: "s", score: 5, max_score: 10, started_at: 500, finished_at: 100 }, stuCookie);
    expect(res.status).toBe(400);
    expect((await res.json() as { error: string }).error).toBe("invalid_time");
  });
});
