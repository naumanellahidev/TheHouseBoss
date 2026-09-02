import { NextResponse, type NextRequest } from "next/server";

/**
 * Cron authorisation.
 *
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET` on every scheduled
 * invocation. These routes delete files and mutate rows, so an unauthenticated
 * one would be a public "delete my photos" button.
 *
 * Fails CLOSED: if CRON_SECRET is not set, every request is refused. The
 * opposite default — allow when unconfigured — is how a cron endpoint ends up
 * open in production because an environment variable was forgotten.
 */
export function authorizeCron(request: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET;

  if (!secret) {
    console.error("[cron] CRON_SECRET is not set; refusing to run.");
    return NextResponse.json(
      { error: "Cron is not configured on this deployment." },
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (header !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}
