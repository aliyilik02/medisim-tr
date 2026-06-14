// ============================================================
// D1 kullanıcı sorguları — parametreli (SQL injection güvenli)
// ============================================================

import type { UserRow } from "../types";
import type { Role } from "../auth/jwt";

export async function findUserByEmail(db: D1Database, email: string): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE email = ? AND status = 'active' LIMIT 1")
    .bind(email)
    .first<UserRow>();
  return row ?? null;
}

/** handle kurum içinde benzersiz → (institution slug, handle) ile bul. */
export async function findUserByHandle(
  db: D1Database,
  institutionSlug: string,
  handle: string,
): Promise<UserRow | null> {
  const row = await db
    .prepare(
      `SELECT u.* FROM users u
       JOIN institutions i ON i.id = u.institution_id
       WHERE i.slug = ? AND u.handle = ? AND u.status = 'active' LIMIT 1`,
    )
    .bind(institutionSlug, handle)
    .first<UserRow>();
  return row ?? null;
}

export async function findUserById(db: D1Database, id: string): Promise<UserRow | null> {
  const row = await db
    .prepare("SELECT * FROM users WHERE id = ? AND status = 'active' LIMIT 1")
    .bind(id)
    .first<UserRow>();
  return row ?? null;
}

export interface CreateUserInput {
  id: string;
  institutionId: string | null;
  role: Role;
  handle: string;
  email: string | null;
  passwordHash: string;
  nowSec: number;
}

export async function insertUser(db: D1Database, u: CreateUserInput): Promise<void> {
  await db
    .prepare(
      `INSERT INTO users (id, institution_id, role, handle, email, password_hash, consent_at, status, created_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL, 'active', ?)`,
    )
    .bind(u.id, u.institutionId, u.role, u.handle, u.email, u.passwordHash, u.nowSec)
    .run();
}

export async function setConsent(db: D1Database, userId: string, nowSec: number): Promise<void> {
  await db.prepare("UPDATE users SET consent_at = ? WHERE id = ?").bind(nowSec, userId).run();
}
