import { eq } from "drizzle-orm";
import { db } from "@/db";
import { civicUsers } from "@/db/schema";
import { assertSameSiteRequest, authErrorResponse, createSession, verifyPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/data";
import { findMemoryUser } from "@/lib/memory-store";

export async function POST(request: Request) {
  try {
    await assertSameSiteRequest();
    const body = await request.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (!email || !password) return Response.json({ error: "Enter your email and password." }, { status: 400 });
    await ensureSeed();

    let user: any = null;
    try {
      const [dbUser] = await db.select().from(civicUsers).where(eq(civicUsers.email, email));
      user = dbUser;
    } catch {
      // Database unavailable, try memory user
    }

    if (!user) {
      user = findMemoryUser(email);
    }

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return Response.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    // Optional portal check: the citizen form cannot be used to enter the authority workspace and vice versa.
    if (body.portal === "authority" && user.role !== "authority") {
      return Response.json({ error: "This account does not have authority access." }, { status: 403 });
    }

    await createSession(user.id, { name: user.name, email: user.email, role: user.role });
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("Login failed", error);
    return Response.json({ error: "We couldn’t sign you in. Please try again." }, { status: 500 });
  }
}
