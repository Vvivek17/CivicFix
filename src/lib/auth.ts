import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { civicSessions, civicUsers } from "@/db/schema";

export type Role = "citizen" | "authority";
export interface SessionUser { id: number; name: string; email: string; role: Role }

export const SESSION_COOKIE = "civicfix_session";
const SESSION_DAYS = 7;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}

export function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, 64);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/**
 * Cookie attributes depend on how the app is being served:
 * - HTTPS: `SameSite=None; Secure; Partitioned`, so the session also works when the app is shown inside an
 *   embedded preview frame on another site (browsers drop `SameSite=Lax` cookies there, and `Partitioned`
 *   keeps it working when third-party cookies are blocked).
 * - Plain HTTP (localhost): browsers reject `SameSite=None` without `Secure`, so fall back to `Lax`.
 * `SameSite=None` gives up the cookie's built-in CSRF protection, so API routes call `assertSameSiteRequest`.
 */
async function sessionCookieOptions(expires: Date) {
  const requestHeaders = await headers();
  const https = [requestHeaders.get("x-forwarded-proto"), requestHeaders.get("origin"), requestHeaders.get("referer")].some((value) => value?.trim().toLowerCase().startsWith("https"));
  return https
    ? { httpOnly: true, secure: true, sameSite: "none" as const, partitioned: true, path: "/", expires }
    : { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/", expires };
}

export async function createSession(userId: number) {
  const id = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000);
  await db.insert(civicSessions).values({ id, userId, expiresAt });
  const store = await cookies();
  store.set(SESSION_COOKIE, id, await sessionCookieOptions(expiresAt));
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) await db.delete(civicSessions).where(eq(civicSessions.id, id));
  // Clear with the same attributes it was set with; a partitioned cookie is only removed by a matching one.
  store.set(SESSION_COOKIE, "", await sessionCookieOptions(new Date(0)));
}

/** Rejects requests that another website triggered in the visitor's browser (CSRF protection). */
export async function assertSameSiteRequest() {
  const requestHeaders = await headers();
  if (requestHeaders.get("sec-fetch-site") === "cross-site") throw new AuthError(403, "Requests from other websites are not allowed.");
}

/** Reads the session from the HTTP-only cookie. The role always comes from the database, never from the client. */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id || !/^[a-f0-9]{64}$/.test(id)) return null;
  const [row] = await db.select({ id: civicUsers.id, name: civicUsers.name, email: civicUsers.email, role: civicUsers.role })
    .from(civicSessions).innerJoin(civicUsers, eq(civicSessions.userId, civicUsers.id))
    .where(and(eq(civicSessions.id, id), gt(civicSessions.expiresAt, new Date())));
  return row ? { ...row, role: row.role === "authority" ? "authority" : "citizen" } : null;
}

export class AuthError extends Error { constructor(public status: 401 | 403, message: string) { super(message); } }

export async function requireUser() {
  await assertSameSiteRequest();
  const user = await getCurrentUser();
  if (!user) throw new AuthError(401, "Please sign in to continue.");
  return user;
}

export async function requireAuthority() {
  const user = await requireUser();
  if (user.role !== "authority") throw new AuthError(403, "Only authority staff can perform this action.");
  return user;
}

export function authErrorResponse(error: unknown) {
  if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
  return null;
}
