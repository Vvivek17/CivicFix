import { db } from "@/db";
import { civicPreferences, civicReports, civicUsers } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { ensurePreferences } from "@/lib/data";
import { and, eq, ne } from "drizzle-orm";

export async function PATCH(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const neighborhood = typeof body.neighborhood === "string" ? body.neighborhood.trim() : "";
    if (name.length < 2 || name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160 || neighborhood.length < 2 || neighborhood.length > 80 || typeof body.notifications !== "boolean") return Response.json({ error: "Please enter a valid name, email, and neighborhood." }, { status: 400 });
    const [taken] = await db.select({ id: civicUsers.id }).from(civicUsers).where(and(eq(civicUsers.email, email), ne(civicUsers.id, user.id)));
    if (taken) return Response.json({ error: "That email is already used by another account." }, { status: 409 });
    await ensurePreferences(user);
    const preferences = await db.transaction(async (tx) => {
      // Note: role is never updatable here — only name, email, neighborhood, and notifications.
      await tx.update(civicUsers).set({ name, email }).where(eq(civicUsers.id, user.id));
      const [updated] = await tx.update(civicPreferences).set({ name, email, neighborhood, notifications: body.notifications }).where(eq(civicPreferences.id, String(user.id))).returning();
      await tx.update(civicReports).set({ reporterName: name, reporterEmail: email }).where(eq(civicReports.reporterId, user.id));
      return updated;
    });
    return Response.json({ preferences: { name, email, neighborhood: preferences.neighborhood, notifications: preferences.notifications, following: preferences.following, voted: preferences.voted } });
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: "Your preferences couldn’t be saved. Please try again." }, { status: 500 });
  }
}
