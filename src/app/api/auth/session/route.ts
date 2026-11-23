import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Lets the sign-in form confirm that the browser actually kept the session cookie. */
export async function GET() {
  const user = await getCurrentUser();
  return user ? Response.json({ user }) : Response.json({ user: null }, { status: 401 });
}
