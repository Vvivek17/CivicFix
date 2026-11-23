import { eq } from "drizzle-orm";
import { db } from "@/db";
import { civicUsers } from "@/db/schema";
import { assertSameSiteRequest, authErrorResponse, createSession, hashPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/data";
import { createMemoryUser, findMemoryUser } from "@/lib/memory-store";

export async function POST(request: Request) {
  try {
    await assertSameSiteRequest();
    const body = await request.json().catch(() => ({}));
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";
    if (name.length < 2 || name.length > 100) return Response.json({ error: "Please enter your full name." }, { status: 400 });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 160) return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    if (password.length < 8 || password.length > 128) return Response.json({ error: "Use a password of at least 8 characters." }, { status: 400 });
    await ensureSeed();

    let existing: any = null;
    try {
      const [row] = await db.select({ id: civicUsers.id }).from(civicUsers).where(eq(civicUsers.email, email));
      existing = row;
    } catch {
      existing = findMemoryUser(email);
    }

    if (existing) return Response.json({ error: "An account with this email already exists." }, { status: 409 });

    // Public sign-up ALWAYS creates a citizen. Any "role" sent by the client is ignored.
    let user: any = null;
    try {
      const [created] = await db.insert(civicUsers).values({ name, email, passwordHash: hashPassword(password), role: "citizen" }).returning();
      user = created;
    } catch {
      user = createMemoryUser(name, email, password, "citizen");
    }

    await createSession(user.id);
    return Response.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } }, { status: 201 });
  } catch (error) {
    const auth = authErrorResponse(error);
    if (auth) return auth;
    console.error("Registration failed", error);
    return Response.json({ error: "We couldn’t create your account. Please try again." }, { status: 500 });
  }
}
