import { assertSameSiteRequest, authErrorResponse, destroySession } from "@/lib/auth";

export async function POST() {
  try {
    await assertSameSiteRequest();
    await destroySession();
    return Response.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error) ?? Response.json({ error: "We couldn’t sign you out. Please try again." }, { status: 500 });
  }
}
