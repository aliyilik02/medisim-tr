import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../src/auth/password";
import { signJwt, verifyJwt } from "../src/auth/jwt";
import { serializeSessionCookie, clearSessionCookie, parseSessionToken, SESSION_COOKIE } from "../src/auth/cookies";

describe("password (PBKDF2)", () => {
  it("hash + verify doğru şifreyi geçirir", async () => {
    const h = await hashPassword("S3cret-parola!");
    expect(h).toMatch(/^pbkdf2\$\d+\$/);
    expect(await verifyPassword("S3cret-parola!", h)).toBe(true);
  });
  it("yanlış şifre reddedilir", async () => {
    const h = await hashPassword("dogru-sifre");
    expect(await verifyPassword("yanlis-sifre", h)).toBe(false);
  });
  it("bozuk hash formatı false döner", async () => {
    expect(await verifyPassword("x", "bozuk")).toBe(false);
    expect(await verifyPassword("x", "md5$1$a$b")).toBe(false);
  });
  it("her hash farklı salt → farklı çıktı", async () => {
    const a = await hashPassword("ayni");
    const b = await hashPassword("ayni");
    expect(a).not.toBe(b);
    expect(await verifyPassword("ayni", a)).toBe(true);
    expect(await verifyPassword("ayni", b)).toBe(true);
  });
});

describe("jwt (HS256)", () => {
  const secret = "test-secret-uzun-rastgele-deger-123456";
  it("sign + verify payload döner", async () => {
    const t = await signJwt({ sub: "u1", role: "instructor", inst: "i1" }, secret, 3600);
    const p = await verifyJwt(t, secret);
    expect(p?.sub).toBe("u1");
    expect(p?.role).toBe("instructor");
    expect(p?.inst).toBe("i1");
    expect(p?.exp).toBeGreaterThan(p!.iat);
  });
  it("süresi dolmuş token null", async () => {
    const past = Math.floor(Date.now() / 1000) - 10_000;
    const t = await signJwt({ sub: "u1", role: "student", inst: null }, secret, 3600, past);
    expect(await verifyJwt(t, secret)).toBeNull();
  });
  it("yanlış sır null", async () => {
    const t = await signJwt({ sub: "u1", role: "admin", inst: null }, secret, 3600);
    expect(await verifyJwt(t, "baska-sir")).toBeNull();
  });
  it("kurcalanmış token null", async () => {
    const t = await signJwt({ sub: "u1", role: "student", inst: null }, secret, 3600);
    const parts = t.split(".");
    parts[1] = parts[1].slice(0, -2) + "XX";
    expect(await verifyJwt(parts.join("."), secret)).toBeNull();
  });
  it("bozuk biçim null", async () => {
    expect(await verifyJwt("a.b", secret)).toBeNull();
    expect(await verifyJwt("xxx", secret)).toBeNull();
  });
});

describe("session cookie", () => {
  it("serialize güvenlik flag'leri içerir", () => {
    const c = serializeSessionCookie("tok123", 3600);
    expect(c).toContain(`${SESSION_COOKIE}=tok123`);
    expect(c).toContain("HttpOnly");
    expect(c).toContain("Secure");
    expect(c).toContain("SameSite=None");
    expect(c).toContain("Max-Age=3600");
  });
  it("clear Max-Age=0", () => {
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
  it("parse token çıkarır", () => {
    const req = new Request("https://x", { headers: { Cookie: `other=1; ${SESSION_COOKIE}=abc.def.ghi; z=2` } });
    expect(parseSessionToken(req)).toBe("abc.def.ghi");
  });
  it("cookie yok → null", () => {
    expect(parseSessionToken(new Request("https://x"))).toBeNull();
  });
});
