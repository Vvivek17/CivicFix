import { db } from "@/db";
import { civicPreferences, civicReports, civicUpdates, civicUsers } from "@/db/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { hashPassword, type SessionUser } from "@/lib/auth";
import type { CivicReport, Preferences, ReportStatus, Priority } from "@/lib/types";
import { CATEGORY_IMAGES, SLA_HOURS } from "@/lib/types";

export const DEMO_ACCOUNTS = [
  { name: "Alex Morgan", email: "alex@civicfix.demo", password: "Citizen@123", role: "citizen" },
  { name: "BBMP Community Team", email: "officer@civicfix.demo", password: "Authority@123", role: "authority" },
] as const;

const neighbors = ["Alex Morgan", "Priya Sharma", "Rahul Kumar", "Neha Rao", "Arjun Patel", "Meera Iyer", "Karthik Reddy", "Divya Nair"];
const examples = [
  { title: "Large pothole on 100 Feet Road", category: "Roads & potholes", status: "reported", priority: "high", address: "100 Feet Road, near the main junction", locality: "Koramangala", latitude: 12.9345, longitude: 77.6266, description: "A large pothole has developed near the bus stop on 100 Feet Road. It is difficult for two-wheelers to avoid, especially after dark. Please inspect and repair the affected stretch before someone gets hurt.", upvotes: 24, hours: 2, mine: true },
  { title: "Overflowing garbage near 5th Block", category: "Waste management", status: "in_progress", priority: "medium", address: "5th Block, opposite the community park", locality: "Koramangala", latitude: 12.9438, longitude: 77.6194, description: "The community bins near the park entrance have not been collected for three days. Waste is spilling onto the footpath and creating a bad smell. An extra collection and a clean-up would really help.", upvotes: 18, hours: 4, mine: false },
  { title: "Streetlight not working on 80 Feet Road", category: "Streetlights", status: "reported", priority: "medium", address: "80 Feet Road, near the pedestrian crossing", locality: "Indiranagar", latitude: 12.9758, longitude: 77.6412, description: "The streetlight at the pedestrian crossing has been out for the last week. This stretch is very dark in the evening and the zebra crossing is hard to see. Please check the light and its electrical connection.", upvotes: 12, hours: 6, mine: true },
  { title: "Water leak outside the community center", category: "Water & drainage", status: "in_progress", priority: "high", address: "1st Main Road, community center", locality: "HSR Layout", latitude: 12.9121, longitude: 77.6446, description: "A damaged water pipe is leaking continuously outside the community center. Water is collecting on the road and a lot of clean water is being wasted. The leak appears to be coming from the main supply line.", upvotes: 31, hours: 8, mine: false },
  { title: "Fallen tree blocking the park pathway", category: "Parks & trees", status: "reported", priority: "high", address: "Koramangala Park, eastern entrance", locality: "Koramangala", latitude: 12.9502, longitude: 77.6271, description: "A tree fell during the weekend winds and is blocking the walking path near the eastern entrance. The area has been cordoned off informally, but the park maintenance team needs to safely remove it.", upvotes: 8, hours: 24, mine: true },
  { title: "Broken footpath repaired in Jayanagar", category: "Public spaces", status: "resolved", priority: "medium", address: "4th Block, beside the shopping complex", locality: "Jayanagar", latitude: 12.9304, longitude: 77.5941, description: "Several paving slabs on the footpath were broken, making it difficult for elderly residents and wheelchair users to pass. The damaged slabs have now been replaced and the path is accessible again.", upvotes: 16, hours: 48, mine: false },
  { title: "Public bins need emptying in Domlur", category: "Waste management", status: "in_progress", priority: "medium", address: "Domlur Main Road, near the bus stop", locality: "Domlur", latitude: 12.9605, longitude: 77.6387, description: "The two public bins at the bus stop are overflowing. Please arrange a collection and remind the cleaning team to include this stop on their daily route.", upvotes: 9, hours: 50, mine: false },
  { title: "Damaged sign at the neighborhood junction", category: "Public spaces", status: "reported", priority: "low", address: "12th Main, junction near the library", locality: "Indiranagar", latitude: 12.9692, longitude: 77.6381, description: "The direction sign at the junction is bent and the street name is no longer readable. It needs to be straightened or replaced to help visitors find the library.", upvotes: 5, hours: 72, mine: true },
  { title: "Waterlogged drain after light rain", category: "Water & drainage", status: "in_progress", priority: "high", address: "Ejipura Main Road, near the market", locality: "Ejipura", latitude: 12.9497, longitude: 77.6512, description: "The drain outside the market gets blocked even after light rain. Plastic and silt have accumulated at the mouth of the drain. The neighborhood needs a clean-up before the next heavy shower.", upvotes: 22, hours: 80, mine: false },
  { title: "New benches installed at HSR park", category: "Parks & trees", status: "resolved", priority: "low", address: "HSR Layout Park, Sector 2", locality: "HSR Layout", latitude: 12.9087, longitude: 77.6401, description: "The park's old benches had become unstable. Thanks to the maintenance team, three new benches have been installed in the shaded area. They are already being enjoyed by our morning walkers.", upvotes: 7, hours: 96, mine: false },
  { title: "Dark pedestrian crossing now illuminated", category: "Streetlights", status: "resolved", priority: "medium", address: "3rd Block, near the primary school", locality: "Jayanagar", latitude: 12.9251, longitude: 77.5839, description: "Both streetlights at the school crossing were not working. The electrical team replaced the faulty fixtures and the crossing is now well-lit for children and pedestrians.", upvotes: 13, hours: 100, mine: false },
  { title: "Pothole repaired on the service road", category: "Roads & potholes", status: "resolved", priority: "high", address: "Domlur service road, opposite the tech park", locality: "Domlur", latitude: 12.9548, longitude: 77.6358, description: "A deep pothole on the service road has been repaired. The road team filled and leveled the surface, making the daily commute safer for everyone.", upvotes: 17, hours: 120, mine: false },
];

export async function ensureSeed() {
  await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(8142026)`);
    const existing = await tx.select({ id: civicReports.id }).from(civicReports).limit(1);
    if (existing.length === 0) {
      const inserted = await tx.insert(civicReports).values(examples.map(({ hours, mine, ...report }, index) => ({ ...report, imageUrl: CATEGORY_IMAGES[report.category], reporterName: neighbors[index % neighbors.length], reporterEmail: index % neighbors.length === 0 ? "alex@civicfix.demo" : `neighbor${index}@civicfix.demo`, isMine: mine, createdAt: new Date(Date.now() - hours * 3600000), updatedAt: new Date(Date.now() - Math.max(0.5, hours - 2) * 3600000), dueAt: new Date(Date.now() - hours * 3600000 + SLA_HOURS[report.priority as Priority] * 3600000), resolvedAt: report.status === "resolved" ? new Date(Date.now() - Math.max(0.5, hours - 2) * 3600000) : null }))).returning();
      await tx.insert(civicUpdates).values(inserted.flatMap((report) => {
        const updates = [{ reportId: report.id, message: "Report received and assigned to the neighborhood team.", authorName: "CivicFix", status: "reported", createdAt: report.createdAt }];
        if (report.status !== "reported") updates.push({ reportId: report.id, message: report.status === "resolved" ? "Our team has completed the work and inspected the site. Thank you for helping improve your neighborhood!" : "The maintenance team has inspected the issue and scheduled a visit. We’ll share another update when the work is complete.", authorName: "BBMP Community Team", status: report.status, createdAt: report.updatedAt });
        return updates;
      }));
    }
    for (const account of DEMO_ACCOUNTS) {
      const [existingUser] = await tx.select({ id: civicUsers.id }).from(civicUsers).where(eq(civicUsers.email, account.email));
      if (!existingUser) await tx.insert(civicUsers).values({ name: account.name, email: account.email, role: account.role, passwordHash: hashPassword(account.password) });
    }
    const [alex] = await tx.select({ id: civicUsers.id }).from(civicUsers).where(eq(civicUsers.email, "alex@civicfix.demo"));
    await tx.update(civicReports).set({ reporterId: alex.id }).where(and(eq(civicReports.isMine, true), isNull(civicReports.reporterId)));
    await tx.execute(sql`update civic_reports set due_at = created_at + make_interval(hours => case priority when 'high' then 48 when 'low' then 240 else 120 end) where due_at is null`);
    await tx.execute(sql`update civic_reports set resolved_at = updated_at where status = 'resolved' and resolved_at is null`);
  });
}

export function serializeReport(report: typeof civicReports.$inferSelect, updates: (typeof civicUpdates.$inferSelect)[] = [], viewerId?: number): CivicReport {
  const { reporterId, ...rest } = report;
  return { ...rest, isMine: viewerId !== undefined && reporterId === viewerId, dueAt: report.dueAt?.toISOString() ?? null, resolvedAt: report.resolvedAt?.toISOString() ?? null, status: report.status as ReportStatus, priority: report.priority as Priority, createdAt: report.createdAt.toISOString(), updatedAt: report.updatedAt.toISOString(), updates: updates.map((update) => ({ ...update, createdAt: update.createdAt.toISOString() })) };
}

export async function ensurePreferences(user: SessionUser) {
  const id = String(user.id);
  await db.insert(civicPreferences).values({ id, name: user.name, email: user.email }).onConflictDoNothing();
  const [row] = await db.select().from(civicPreferences).where(eq(civicPreferences.id, id));
  return row;
}

export async function getDashboardData(user: SessionUser): Promise<{ reports: CivicReport[]; preferences: Preferences }> {
  await ensureSeed();
  const [reports, updates, preferences] = await Promise.all([
    db.select().from(civicReports).orderBy(desc(civicReports.createdAt)),
    db.select().from(civicUpdates).orderBy(desc(civicUpdates.createdAt)),
    ensurePreferences(user),
  ]);
  return { reports: reports.map((report) => serializeReport(report, updates.filter((update) => update.reportId === report.id), user.id)), preferences: { name: user.name, email: user.email, neighborhood: preferences.neighborhood, notifications: preferences.notifications, following: preferences.following, voted: preferences.voted } };
}

export async function getReport(id: number, viewerId?: number) {
  const [report] = await db.select().from(civicReports).where(eq(civicReports.id, id));
  if (!report) return null;
  const updates = await db.select().from(civicUpdates).where(eq(civicUpdates.reportId, id)).orderBy(desc(civicUpdates.createdAt));
  return serializeReport(report, updates, viewerId);
}
