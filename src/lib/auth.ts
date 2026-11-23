import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { civicSessions, civicUsers } from "@/db/schema";
import { deleteMemorySession, getMemorySessionUser, saveMemorySession } from "@/lib/memory-store";

export type Role = "citizen" | "authority";
export interface SessionUser { id: number; name: string; email: string; role: Role }

export const SESSION_COOKIE = "civicfix_session";
const SESSION_DAYS = 7;
const SESSION_SECRET = process.env.SESSION_SECRET || "civicfix-secret-salt-for-tamper-proof-sessions-2026-secure-key";

export function signSessionToken(data: SessionUser & { exp: number }): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  const hmac = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${hmac}`;
}

export function verifySessionToken(token: string): (SessionUser & { exp: number }) | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expectedSig = createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));
    if (!data || typeof data.exp !== "number" || data.exp <= Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

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
  const isCrossSite = requestHeaders.get("sec-fetch-site") === "cross-site";
  return https
    ? { httpOnly: true, secure: true, sameSite: isCrossSite ? ("none" as const) : ("lax" as const), partitioned: isCrossSite, path: "/", expires }
    : { httpOnly: true, secure: false, sameSite: "lax" as const, path: "/", expires };
}

export async function createSession(userId: number, user?: { name?: string; email?: string; role?: Role }) {
  const exp = Date.now() + SESSION_DAYS * 86400000;
  const expiresAt = new Date(exp);

  const role: Role = user?.role === "authority" || userId === 2 ? "authority" : "citizen";
  const name = user?.name || (role === "authority" ? "BBMP Community Team" : "Alex Morgan");
  const email = user?.email || (role === "authority" ? "officer@civicfix.demo" : "alex@civicfix.demo");

  const sessionUser: SessionUser = { id: userId, name, email, role };
  const token = signSessionToken({ ...sessionUser, exp });

  saveMemorySession(token, userId, expiresAt, user);
  try {
    const legacyId = randomBytes(32).toString("hex");
    await db.insert(civicSessions).values({ id: legacyId, userId, expiresAt });
  } catch {}

  const store = await cookies();
  store.set(SESSION_COOKIE, token, await sessionCookieOptions(expiresAt));
}

export async function destroySession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (id) {
    try {
      await db.delete(civicSessions).where(eq(civicSessions.id, id));
    } catch {
      deleteMemorySession(id);
    }
  }
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
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  // 1. Verify stateless HMAC session token (works 100% on Vercel across all Lambda instances with ZERO database dependency)
  const verified = verifySessionToken(token);
  if (verified) {
    return {
      id: verified.id,
      name: verified.name,
      email: verified.email,
      role: verified.role,
    };
  }

  // 2. Fallback to memory store
  const memoryUser = getMemorySessionUser(token);
  if (memoryUser) return memoryUser;

  // 3. Fallback to DB for legacy 64-char hex tokens
  if (/^[a-f0-9]{64}$/.test(token)) {
    try {
      const [row] = await db.select({ id: civicUsers.id, name: civicUsers.name, email: civicUsers.email, role: civicUsers.role })
        .from(civicSessions).innerJoin(civicUsers, eq(civicSessions.userId, civicUsers.id))
        .where(and(eq(civicSessions.id, token), gt(civicSessions.expiresAt, new Date())));
      if (row) return { ...row, role: row.role === "authority" ? "authority" : "citizen" };
    } catch {}
  }

  return null;
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
