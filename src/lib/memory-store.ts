import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { CivicReport, Preferences, Priority } from "./types";
import { CATEGORY_IMAGES, SLA_HOURS } from "./types";

export type Role = "citizen" | "authority";
export interface SessionUser { id: number; name: string; email: string; role: Role }

function hashPassword(password: string) {
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

interface StoredUser {
  id: number;
  name: string;
  email: string;
  passwordHash: string;
  role: "citizen" | "authority";
}

interface StoredSession {
  id: string;
  userId: number;
  expiresAt: Date;
}

const globalForStore = globalThis as typeof globalThis & {
  __civicMemoryUsers?: Map<string, StoredUser>;
  __civicMemorySessions?: Map<string, StoredSession>;
  __civicMemoryReports?: CivicReport[];
  __civicMemoryPrefs?: Map<string, Preferences>;
};

const users = globalForStore.__civicMemoryUsers ?? new Map<string, StoredUser>();
const sessions = globalForStore.__civicMemorySessions ?? new Map<string, StoredSession>();
const prefs = globalForStore.__civicMemoryPrefs ?? new Map<string, Preferences>();

globalForStore.__civicMemoryUsers = users;
globalForStore.__civicMemorySessions = sessions;
globalForStore.__civicMemoryPrefs = prefs;

let nextUserId = 100;
let nextReportId = 200;

export function initMemorySeed(examples: any[], neighbors: string[]) {
  if (!users.has("alex@civicfix.demo")) {
    users.set("alex@civicfix.demo", {
      id: 1,
      name: "Alex Morgan",
      email: "alex@civicfix.demo",
      passwordHash: hashPassword("Citizen@123"),
      role: "citizen",
    });
  }

  if (!users.has("officer@civicfix.demo")) {
    users.set("officer@civicfix.demo", {
      id: 2,
      name: "BBMP Community Team",
      email: "officer@civicfix.demo",
      passwordHash: hashPassword("Authority@123"),
      role: "authority",
    });
  }

  if (!globalForStore.__civicMemoryReports) {
    globalForStore.__civicMemoryReports = examples.map(({ hours, mine, ...report }, index) => ({
      ...report,
      id: index + 1,
      imageUrl: CATEGORY_IMAGES[report.category] || "/images/roads.jpg",
      reporterName: neighbors[index % neighbors.length],
      reporterEmail: index % neighbors.length === 0 ? "alex@civicfix.demo" : `neighbor${index}@civicfix.demo`,
      isMine: mine,
      createdAt: new Date(Date.now() - hours * 3600000).toISOString(),
      updatedAt: new Date(Date.now() - Math.max(0.5, hours - 2) * 3600000).toISOString(),
      dueAt: new Date(Date.now() - hours * 3600000 + SLA_HOURS[report.priority as Priority] * 3600000).toISOString(),
      resolvedAt: report.status === "resolved" ? new Date(Date.now() - Math.max(0.5, hours - 2) * 3600000).toISOString() : null,
      updates: [
        {
          id: index * 10 + 1,
          reportId: index + 1,
          message: "Report received and assigned to the neighborhood team.",
          authorName: "CivicFix",
          status: "reported",
          createdAt: new Date(Date.now() - hours * 3600000).toISOString(),
        },
      ],
    }));
  }
}

export function findMemoryUser(email: string): StoredUser | null {
  return users.get(email.trim().toLowerCase()) ?? null;
}

export function findMemoryUserById(id: number): StoredUser | null {
  for (const u of users.values()) {
    if (u.id === id) return u;
  }
  return null;
}

export function createMemoryUser(name: string, email: string, password: string, role: "citizen" | "authority"): StoredUser {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = users.get(normalizedEmail);
  if (existing) return existing;

  const newUser: StoredUser = {
    id: nextUserId++,
    name: name.trim(),
    email: normalizedEmail,
    passwordHash: hashPassword(password),
    role,
  };
  users.set(normalizedEmail, newUser);
  return newUser;
}

export function saveMemorySession(id: string, userId: number, expiresAt: Date) {
  sessions.set(id, { id, userId, expiresAt });
}

export function getMemorySessionUser(sessionId: string): SessionUser | null {
  const session = sessions.get(sessionId);
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    sessions.delete(sessionId);
    return null;
  }
  const user = findMemoryUserById(session.userId);
  if (!user) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export function deleteMemorySession(sessionId: string) {
  sessions.delete(sessionId);
}

export function getMemoryReports(viewerId?: number): CivicReport[] {
  const reports = globalForStore.__civicMemoryReports || [];
  return reports.map((r) => ({
    ...r,
    isMine: viewerId === 1 && r.isMine,
  }));
}

export function addMemoryReport(report: any, user: SessionUser): CivicReport {
  const reports = globalForStore.__civicMemoryReports || [];
  const newReport: CivicReport = {
    ...report,
    id: nextReportId++,
    reporterName: user.name,
    reporterEmail: user.email,
    isMine: true,
    upvotes: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + SLA_HOURS[report.priority as Priority] * 3600000).toISOString(),
    resolvedAt: null,
    updates: [
      {
        id: nextReportId * 10,
        reportId: nextReportId,
        message: "Your report has been received. The neighborhood team will review it shortly.",
        authorName: "CivicFix",
        status: "reported",
        createdAt: new Date().toISOString(),
      },
    ],
  };
  reports.unshift(newReport);
  globalForStore.__civicMemoryReports = reports;
  return newReport;
}

export function getMemoryPreferences(user: SessionUser): Preferences {
  const key = String(user.id);
  const existing = prefs.get(key);
  if (existing) return existing;

  const initial: Preferences = {
    name: user.name,
    email: user.email,
    neighborhood: "Koramangala",
    notifications: true,
    following: [],
    voted: [],
  };
  prefs.set(key, initial);
  return initial;
}
