import { randomUUID } from "node:crypto";

import { NextResponse, type NextRequest } from "next/server";

import { leadAutoresponder, leadNotification } from "@/lib/email/templates";
import { sendEmail } from "@/lib/email/send";
import { LEAD_LIMIT, clientIp, rateLimit } from "@/lib/rate-limit";
import { getAdminSettings } from "@/lib/queries/settings";
import { siteConfig } from "@/lib/site-config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isBot, leadSchema } from "@/lib/validation/lead";
import type { Lead } from "@/types/domain";

/**
 * Public lead intake — docs/09 § 5.
 *
 * Protections, in order:
 *   1. rate limit, 5 per IP per hour
 *   2. the SAME zod schema the client form used — never validate in one place
 *   3. honeypot; a tripped honeypot returns the success shape without writing a
 *      row, because telling a spammer they were caught only teaches them
 *
 * The write uses the RLS-respecting client. `leads` grants INSERT to anon and
 * grants SELECT to nobody, so this route can create a lead and could not read
 * one back even if it tried — which is exactly the asymmetry the policy is for.
 *
 * That asymmetry is also why the insert has NO `.select()`. PostgREST turns one
 * into `INSERT ... RETURNING`, the RETURNING clause is evaluated against the
 * SELECT policy, and the whole statement is then refused with a misleading
 * "violates row-level security policy" error. The id is generated here instead,
 * which the notification email needs anyway.
 *
 * Email is best effort. The row is committed before either message is sent: an
 * unsent notification is recoverable from the inbox, a lost lead is not.
 */

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`lead:${ip}`, LEAD_LIMIT.limit, LEAD_LIMIT.windowMs);

  if (!limit.ok) {
    return NextResponse.json(
      {
        error:
          "That is several messages in a short time. If something did not send, email directly instead.",
      },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "That request was malformed." }, { status: 400 });
  }

  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Please check the form and try again." },
      { status: 400 },
    );
  }

  const input = parsed.data;

  // Honeypot. Same response shape as success, no row written.
  if (isBot(input)) return NextResponse.json({ ok: true });

  const id = randomUUID();
  const createdAt = new Date().toISOString();

  const db = await createSupabaseServerClient();
  const { error } = await db.from("leads").insert({
    id,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null,
    lead_type: input.leadType,
    source_page: input.sourcePage ?? null,
    listing_id: input.listingId ?? null,
    utm: input.utm ?? null,
  });

  if (error) {
    // Never log the payload itself (docs/09 § 5) — only that it failed.
    console.error(`[leads] insert failed: ${error.message}`);
    return NextResponse.json(
      { error: "That message could not be sent. Try again in a moment." },
      { status: 500 },
    );
  }

  // Built from the validated input rather than read back, because reading it
  // back is exactly what the SELECT policy forbids.
  const lead: Lead = {
    id,
    name: input.name,
    email: input.email,
    phone: input.phone || null,
    message: input.message || null,
    leadType: input.leadType,
    sourcePage: input.sourcePage ?? null,
    listingId: input.listingId ?? null,
    utm: input.utm ?? null,
    status: "new",
    notes: null,
    createdAt,
  };

  // Fire and forget. The response does not wait on an email provider.
  void notify(lead);

  return NextResponse.json({ ok: true });
}

async function notify(lead: Lead) {
  try {
    const settings = await getAdminSettings().catch(() => null);

    const to =
      settings?.leadNotifyEmail ??
      process.env.LEAD_NOTIFY_EMAIL ??
      (settings?.email || null);

    const adminUrl = `${siteConfig.url}/admin/leads?lead=${lead.id}`;

    if (to) {
      const message = leadNotification(lead, adminUrl);
      await sendEmail({
        to,
        subject: message.subject,
        html: message.html,
        text: message.text,
        // Replying to the notification answers the sender directly.
        replyTo: lead.email,
      });
    } else {
      console.warn("[leads] no notification address configured; lead saved only.");
    }

    const reply = leadAutoresponder(lead, {
      subject: settings?.autoresponderSubject,
      body: settings?.autoresponderBody,
    });
    await sendEmail({
      to: lead.email,
      subject: reply.subject,
      html: reply.html,
      text: reply.text,
    });
  } catch (error) {
    console.error("[leads] notification failed:", error);
  }
}
