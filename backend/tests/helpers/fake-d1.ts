// ============================================================
// FakeD1 — in-memory D1 test çifti (zero-dep, miniflare'siz)
// ============================================================
// Bu db layer'ın ürettiği SPESİFİK parametreli sorguları yorumlar
// (genel SQL motoru DEĞİL). Amaç: handler mantığı + rol kapısı +
// sahiplik + validation + route eşlemesini gerçek I/O olmadan test.
// SQL doğruluğu (basit parametreli sorgular) düşük risk; bu çift
// onları yorumlayarak yeterli kapsama verir. Yeni sorgu eklenirse
// buraya da bir kural eklenmeli.
// ============================================================

import type { Env } from "../../src/types";

interface InstRow {
  id: string;
  name: string;
  slug: string;
  created_at: number;
}
interface UserRow {
  id: string;
  institution_id: string | null;
  role: string;
  handle: string;
  email: string | null;
  password_hash: string;
  consent_at: number | null;
  status: string;
  created_at: number;
}
interface ClassRow {
  id: string;
  institution_id: string;
  instructor_id: string;
  name: string;
  join_code: string;
  created_at: number;
}
interface EnrollRow {
  class_id: string;
  user_id: string;
  created_at: number;
}
interface AttemptRow {
  id: string;
  user_id: string;
  class_id: string | null;
  scenario_id: string;
  score: number | null;
  max_score: number | null;
  started_at: number;
  finished_at: number | null;
  summary_json: string | null;
}

export class FakeD1 {
  institutions: InstRow[] = [];
  users: UserRow[] = [];
  classes: ClassRow[] = [];
  enrollments: EnrollRow[] = [];
  attempts: AttemptRow[] = [];

  prepare(sql: string) {
    return new FakeStatement(this, sql.replace(/\s+/g, " ").trim());
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exec(n: string, a: any[]): any {
    const lower = n.toLowerCase();

    // ── institutions ──
    if (lower.startsWith("select id from institutions where slug")) {
      return this.institutions.find((i) => i.slug === a[0]) ?? null;
    }
    if (lower.startsWith("select slug from institutions where id")) {
      const i = this.institutions.find((x) => x.id === a[0]);
      return i ? { slug: i.slug } : null;
    }
    if (lower.startsWith("insert into institutions")) {
      this.institutions.push({ id: a[0], name: a[1], slug: a[2], created_at: a[3] });
      return { success: true };
    }

    // ── users ──
    if (lower.startsWith("select * from users where email")) {
      return this.users.find((u) => u.email === a[0] && u.status === "active") ?? null;
    }
    if (lower.includes("from users u join institutions i")) {
      const inst = this.institutions.find((i) => i.slug === a[0]);
      if (!inst) return null;
      return (
        this.users.find(
          (u) => u.institution_id === inst.id && u.handle === a[1] && u.status === "active",
        ) ?? null
      );
    }
    if (lower.startsWith("select * from users where id")) {
      return this.users.find((u) => u.id === a[0] && u.status === "active") ?? null;
    }
    if (lower.startsWith("insert into users")) {
      const [id, institution_id, role, handle, email, password_hash, created_at] = a;
      // UNIQUE (institution_id, handle)
      if (this.users.some((u) => u.institution_id === institution_id && u.handle === handle)) {
        throw new Error("UNIQUE constraint failed: users.institution_id, users.handle");
      }
      // UNIQUE email (varsa)
      if (email != null && this.users.some((u) => u.email === email)) {
        throw new Error("UNIQUE constraint failed: users.email");
      }
      this.users.push({
        id,
        institution_id,
        role,
        handle,
        email,
        password_hash,
        consent_at: null,
        status: "active",
        created_at,
      });
      return { success: true };
    }
    if (lower.startsWith("update users set consent_at")) {
      const u = this.users.find((x) => x.id === a[1]);
      if (u) u.consent_at = a[0];
      return { success: true };
    }

    // ── classes ──
    if (lower.startsWith("insert into classes")) {
      this.classes.push({
        id: a[0],
        institution_id: a[1],
        instructor_id: a[2],
        name: a[3],
        join_code: a[4],
        created_at: a[5],
      });
      return { success: true };
    }
    if (lower.includes("from classes c where c.instructor_id")) {
      return this.classes
        .filter((c) => c.instructor_id === a[0])
        .sort((x, y) => y.created_at - x.created_at)
        .map((c) => ({
          ...c,
          student_count: this.enrollments.filter((e) => e.class_id === c.id).length,
        }));
    }
    if (lower.startsWith("select * from classes where id")) {
      return this.classes.find((c) => c.id === a[0]) ?? null;
    }
    if (lower.startsWith("select * from classes where join_code")) {
      return this.classes.find((c) => c.join_code === a[0]) ?? null;
    }
    if (lower.startsWith("select 1 as x from classes where join_code")) {
      return this.classes.some((c) => c.join_code === a[0]) ? { x: 1 } : null;
    }

    // ── enrollments ──
    if (lower.includes("from enrollments e join users u")) {
      return this.enrollments
        .filter((e) => e.class_id === a[0])
        .map((e) => ({ e, u: this.users.find((u) => u.id === e.user_id) }))
        .filter((r) => r.u && r.u.status === "active")
        .sort((x, y) => x.u!.handle.toLowerCase().localeCompare(y.u!.handle.toLowerCase()))
        .map((r) => ({ id: r.u!.id, handle: r.u!.handle, created_at: r.e.created_at }));
    }
    if (lower.startsWith("insert into enrollments")) {
      if (!this.enrollments.some((e) => e.class_id === a[0] && e.user_id === a[1])) {
        this.enrollments.push({ class_id: a[0], user_id: a[1], created_at: a[2] });
      }
      return { success: true };
    }
    if (lower.startsWith("select 1 as x from enrollments where class_id")) {
      return this.enrollments.some((e) => e.class_id === a[0] && e.user_id === a[1])
        ? { x: 1 }
        : null;
    }
    if (lower.startsWith("select class_id from enrollments where user_id")) {
      return this.enrollments.filter((e) => e.user_id === a[0]).map((e) => ({ class_id: e.class_id }));
    }

    // ── attempts ──
    if (lower.startsWith("insert into attempts")) {
      this.attempts.push({
        id: a[0],
        user_id: a[1],
        class_id: a[2],
        scenario_id: a[3],
        score: a[4],
        max_score: a[5],
        started_at: a[6],
        finished_at: a[7],
        summary_json: a[8],
      });
      return { success: true };
    }
    if (lower.includes("from attempts where user_id")) {
      return this.attempts
        .filter((t) => t.user_id === a[0])
        .sort((x, y) => y.started_at - x.started_at)
        .slice(0, a[1] ?? 100);
    }
    if (lower.includes("from attempts a join users u")) {
      // Kapsam a.class_id (denemenin atandığı sınıf) — enrollment DEĞİL (#1).
      return this.attempts
        .filter((t) => t.class_id === a[0])
        .sort((x, y) => y.started_at - x.started_at)
        .slice(0, a[1] ?? 1000)
        .map((t) => ({ ...t, handle: this.users.find((u) => u.id === t.user_id)?.handle ?? "" }));
    }

    throw new Error(`FakeD1: eşleşmeyen sorgu → ${n}`);
  }
}

class FakeStatement {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private args: any[] = [];
  constructor(private db: FakeD1, private sql: string) {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind(...args: any[]) {
    this.args = args;
    return this;
  }
  async first<T>(): Promise<T | null> {
    return this.db.exec(this.sql, this.args) as T | null;
  }
  async all<T>(): Promise<{ results: T[] }> {
    return { results: (this.db.exec(this.sql, this.args) as T[]) ?? [] };
  }
  async run(): Promise<{ success: boolean }> {
    return this.db.exec(this.sql, this.args);
  }
}

/** Test Env — FakeD1 + sabit JWT secret. RATE_LIMIT yok (auth uçları kullanmıyor). */
export function makeTestEnv(db: FakeD1): Env {
  return {
    GEMINI_API_KEY: "test-key",
    RATE_LIMIT: undefined as unknown as KVNamespace,
    DB: db as unknown as D1Database,
    JWT_SECRET: "test-jwt-secret-uzun-rastgele-1234567890",
    SIGNUP_INVITE_CODE: "TEST-INVITE",
  };
}
