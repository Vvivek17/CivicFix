import { db } from "@/db";
import { civicPreferences, civicReports, civicUpdates } from "@/db/schema";
import { authErrorResponse, requireAuthority, requireUser } from "@/lib/auth";
import { ensurePreferences, getDashboardData, getReport } from "@/lib/data";
import { getMemoryReport, updateMemoryReport } from "@/lib/memory-store";
import { STATUSES, STATUS_LABELS, type ReportStatus } from "@/lib/types";
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

    if (body.action === "status" && !STATUSES.includes(body.status)) return Response.json({ error: "Please select a valid status." }, { status: 400 });

    let messageText = typeof body.message === "string" ? body.message.trim() : "";
    if (body.action === "update") {
      if (messageText.length < 5 || messageText.length > 2000) {
        return Response.json({ error: "Add an update of 5–2,000 characters." }, { status: 400 });
      }
    } else if (body.action === "status") {
      if (!messageText) {
        const label = STATUS_LABELS[body.status as ReportStatus] || body.status;
        messageText = body.status === "resolved"
          ? "Our team has completed field repairs and verified resolution."
          : body.status === "in_progress"
          ? "The ward maintenance team has inspected the site and commenced work."
          : `Status changed to ${label} by ${user.name}.`;
      } else if (messageText.length > 2000) {
        return Response.json({ error: "Update message cannot exceed 2,000 characters." }, { status: 400 });
      }
    }

    let dueAt: Date | null = null;
    if (body.action === "deadline") {
      dueAt = new Date(body.dueAt);
      if (Number.isNaN(dueAt.getTime())) return Response.json({ error: "Choose a valid deadline." }, { status: 400 });
      if (dueAt.getTime() < Date.now() + 15 * 60000) return Response.json({ error: "The new deadline must be in the future." }, { status: 400 });
      if (dueAt.getTime() > Date.now() + 90 * 86400000) return Response.json({ error: "Deadlines can be set up to 90 days ahead." }, { status: 400 });
    }

    const prefsId = String(user.id);

    try {
      const [existing] = await db.select().from(civicReports).where(eq(civicReports.id, id));
      if (!existing) {
        const fallback = updateMemoryReport(id, body.action, { status: body.status, message: messageText, dueAt: dueAt?.toISOString() }, user);
        if (!fallback.report) return Response.json({ error: "Report not found." }, { status: 404 });
        return Response.json(fallback);
      }

      await ensurePreferences(user);
      await db.transaction(async (tx) => {
        if (body.action === "vote" || body.action === "follow") {
          const [preferences] = await tx.select().from(civicPreferences).where(eq(civicPreferences.id, prefsId)).for("update");
          const key = body.action === "vote" ? "voted" : "following";
          const selected = preferences[key] || [];
          const already = selected.includes(id);
          await tx.update(civicPreferences).set({ [key]: already ? selected.filter((value) => value !== id) : [...selected, id] }).where(eq(civicPreferences.id, prefsId));
          if (body.action === "vote") await tx.update(civicReports).set({ upvotes: sql`greatest(0, ${civicReports.upvotes} + ${already ? -1 : 1})` }).where(eq(civicReports.id, id));
        } else if (body.action === "status") {
          const resolvedAt = body.status === "resolved" ? (existing.resolvedAt ?? new Date()) : null;
          await tx.update(civicReports).set({ status: body.status, resolvedAt, updatedAt: new Date() }).where(eq(civicReports.id, id));
          await tx.insert(civicUpdates).values({ reportId: id, message: messageText, authorName: user.name, status: body.status });
        } else if (body.action === "deadline" && dueAt) {
          await tx.update(civicReports).set({ dueAt, updatedAt: new Date() }).where(eq(civicReports.id, id));
          const note = messageText ? ` ${messageText.slice(0, 500)}` : "";
          await tx.insert(civicUpdates).values({ reportId: id, message: `Resolution deadline set to ${dueAt.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}.${note}`, authorName: user.name, status: existing.status });
        } else {
          await tx.update(civicReports).set({ updatedAt: new Date() }).where(eq(civicReports.id, id));
          await tx.insert(civicUpdates).values({ reportId: id, message: messageText, authorName: user.name, status: existing.status });
        }
      });

      // Synchronize in-memory store
      updateMemoryReport(id, body.action, { status: body.status, message: messageText, dueAt: dueAt?.toISOString() }, user);

      const [report, data] = await Promise.all([getReport(id, user.id), getDashboardData(user)]);
      return Response.json({ report, preferences: data.preferences });
    } catch (dbErr) {
      console.warn("DB operation failed during report PATCH, falling back to memory store:", dbErr);
      const fallback = updateMemoryReport(id, body.action, { status: body.status, message: messageText, dueAt: dueAt?.toISOString() }, user);
      if (!fallback.report) return Response.json({ error: "Report not found." }, { status: 404 });
      return Response.json(fallback);
    }
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("Report action failed", error);
    return Response.json({ error: "We couldn’t save your change. Please try again." }, { status: 500 });
  }
}
