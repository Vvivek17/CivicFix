import { db } from "@/db";
import { civicReports, civicUpdates } from "@/db/schema";
import { authErrorResponse, requireUser } from "@/lib/auth";
import { ensurePreferences, ensureSeed, getDashboardData, serializeReport } from "@/lib/data";
import { CATEGORIES, PRIORITIES, SLA_HOURS, type Priority } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try { const user = await requireUser(); return Response.json({ ...(await getDashboardData(user)), user }); }
  catch (error) { const auth = authErrorResponse(error); if (auth) return auth; console.error("Reports could not be loaded", error); return Response.json({ error: "We couldn’t load the reports. Please try again." }, { status: 500 }); }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    if (user.role === "authority") return Response.json({ error: "Authorities cannot submit citizen reports." }, { status: 403 });
    if (Number(request.headers.get("content-length") || 0) > 4_000_000) return Response.json({ error: "The photo is too large. Please choose a smaller image." }, { status: 413 });
    const body = await request.json();
    const title = typeof body.title === "string" ? body.title.trim() : "";
    const description = typeof body.description === "string" ? body.description.trim() : "";
    const address = typeof body.address === "string" ? body.address.trim() : "";
    const locality = typeof body.locality === "string" ? body.locality.trim() : "";
    if (title.length < 8 || title.length > 120 || description.length < 15 || description.length > 2500 || address.length < 5 || address.length > 240 || locality.length < 2 || locality.length > 80) return Response.json({ error: "Please add a clear title, description, address, and neighborhood." }, { status: 400 });
    if (!CATEGORIES.includes(body.category) || !PRIORITIES.includes(body.priority)) return Response.json({ error: "Please select a valid category and priority." }, { status: 400 });
    if (typeof body.latitude !== "number" || typeof body.longitude !== "number" || !Number.isFinite(body.latitude) || !Number.isFinite(body.longitude) || Math.abs(body.latitude) > 90 || Math.abs(body.longitude) > 180) return Response.json({ error: "Please provide a valid GPS location." }, { status: 400 });
    const image = typeof body.imageUrl === "string" ? body.imageUrl : "";
    if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 3_000_000) return Response.json({ error: "Please upload a JPG, PNG, or WebP photo under 2 MB." }, { status: 400 });
    await ensureSeed();
    await ensurePreferences(user);
    const report = await db.transaction(async (tx) => {
      const [created] = await tx.insert(civicReports).values({ title, description, address, locality, category: body.category, priority: body.priority, latitude: body.latitude, longitude: body.longitude, imageUrl: image, reporterName: user.name, reporterEmail: user.email, isMine: true, reporterId: user.id, dueAt: new Date(Date.now() + SLA_HOURS[body.priority as Priority] * 3600000) }).returning();
      await tx.insert(civicUpdates).values({ reportId: created.id, message: "Your report has been received. The neighborhood team will review it shortly.", authorName: "CivicFix", status: "reported" });
      return created;
    });
    return Response.json({ report: serializeReport(report, [{ id: -1, reportId: report.id, message: "Your report has been received. The neighborhood team will review it shortly.", authorName: "CivicFix", status: "reported", createdAt: report.createdAt }], user.id) }, { status: 201 });
  } catch (error) {
    const auth = authErrorResponse(error); if (auth) return auth;
    console.error("Report submission failed", error);
    return Response.json({ error: "Your report couldn’t be submitted. Please try again." }, { status: 500 });
  }
}
