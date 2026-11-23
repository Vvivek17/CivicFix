import { db } from "@/db";
import { civicPreferences, civicReports, civicUpdates } from "@/db/schema";
import { authErrorResponse, requireAuthority, requireUser } from "@/lib/auth";
import { ensurePreferences, getDashboardData, getReport } from "@/lib/data";
import { STATUSES } from "@/lib/types";
import { eq, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };

// Actions anyone signed in may take vs. actions reserved for authority staff.
const CITIZEN_ACTIONS = ["vote", "follow", "update"];
const AUTHORITY_ACTIONS = ["status", "deadline"];

export async function GET(_request: Request, context: Context) {
  try {
    const user = await requireUser();
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid report." }, { status: 400 });
    const report = await getReport(id, user.id);
    return report ? Response.json({ report }) : Response.json({ error: "Report not found." }, { status: 404 });
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: "Unable to load this report." }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: Context) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return Response.json({ error: "Invalid report." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    if (![...CITIZEN_ACTIONS, ...AUTHORITY_ACTIONS].includes(body.action)) return Response.json({ error: "Invalid action." }, { status: 400 });

    // Server-side role enforcement: the client cannot grant itself authority access.
    const user = AUTHORITY_ACTIONS.includes(body.action) ? await requireAuthority() : await requireUser();
    if ((body.action === "vote" || body.action === "follow") && user.role === "authority") {
      return Response.json({ error: "Voting and following are reserved for citizens." }, { status: 403 });
    }

    const [existing] = await db.select().from(civicReports).where(eq(civicReports.id, id));
    if (!existing) return Response.json({ error: "Report not found." }, { status: 404 });
    if (body.action === "status" && !STATUSES.includes(body.status)) return Response.json({ error: "Please select a valid status." }, { status: 400 });
    if ((body.action === "status" || body.action === "update") && (typeof body.message !== "string" || body.message.trim().length < 5 || body.message.length > 2000)) return Response.json({ error: "Add an update of 5–2,000 characters." }, { status: 400 });

    let dueAt: Date | null = null;
    if (body.action === "deadline") {
      dueAt = new Date(body.dueAt);
      if (Number.isNaN(dueAt.getTime())) return Response.json({ error: "Choose a valid deadline." }, { status: 400 });
      if (dueAt.getTime() < Date.now() + 15 * 60000) return Response.json({ error: "The new deadline must be in the future." }, { status: 400 });
      if (dueAt.getTime() > Date.now() + 90 * 86400000) return Response.json({ error: "Deadlines can be set up to 90 days ahead." }, { status: 400 });
    }

    const prefsId = String(user.id);
    await ensurePreferences(user);
    await db.transaction(async (tx) => {
      if (body.action === "vote" || body.action === "follow") {
        const [preferences] = await tx.select().from(civicPreferences).where(eq(civicPreferences.id, prefsId)).for("update");
        const key = body.action === "vote" ? "voted" : "following";
        const selected = preferences[key];
        const already = selected.includes(id);
        await tx.update(civicPreferences).set({ [key]: already ? selected.filter((value) => value !== id) : [...selected, id] }).where(eq(civicPreferences.id, prefsId));
        if (body.action === "vote") await tx.update(civicReports).set({ upvotes: sql`greatest(0, ${civicReports.upvotes} + ${already ? -1 : 1})` }).where(eq(civicReports.id, id));
      } else if (body.action === "status") {
        const resolvedAt = body.status === "resolved" ? (existing.resolvedAt ?? new Date()) : null;
        await tx.update(civicReports).set({ status: body.status, resolvedAt, updatedAt: new Date() }).where(eq(civicReports.id, id));
        await tx.insert(civicUpdates).values({ reportId: id, message: body.message.trim(), authorName: user.name, status: body.status });
      } else if (body.action === "deadline" && dueAt) {
        await tx.update(civicReports).set({ dueAt, updatedAt: new Date() }).where(eq(civicReports.id, id));
        const note = typeof body.message === "string" && body.message.trim() ? ` ${body.message.trim().slice(0, 500)}` : "";
        await tx.insert(civicUpdates).values({ reportId: id, message: `Resolution deadline set to ${dueAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}.${note}`, authorName: user.name, status: existing.status });
      } else {
        await tx.update(civicReports).set({ updatedAt: new Date() }).where(eq(civicReports.id, id));
        await tx.insert(civicUpdates).values({ reportId: id, message: body.message.trim(), authorName: user.name, status: existing.status });
      }
    });
    const [report, data] = await Promise.all([getReport(id, user.id), getDashboardData(user)]);
    return Response.json({ report, preferences: data.preferences });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("Report action failed", error);
    return Response.json({ error: "We couldn’t save your change. Please try again." }, { status: 500 });
  }
}
