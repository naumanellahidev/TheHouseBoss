import { Resend } from "resend";

/**
 * Transactional email. Resend, 3,000/month free (CLAUDE.md § 2).
 *
 * Degrades rather than throws when unconfigured. A missing RESEND_API_KEY must
 * never lose a lead: the row is already written by the time we get here, so an
 * email failure is logged and the visitor still sees a success state. Losing
 * the notification is recoverable — the lead is in the inbox. Losing the lead
 * is not.
 *
 * Never log a full lead payload (docs/09 § 5) — the log lines here carry a
 * subject and an outcome, never the message body.
 */

let client: Resend | null = null;

function getClient(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  if (!client) client = new Resend(key);
  return client;
}

export const isEmailConfigured = () =>
  Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);

export type SendResult = { ok: boolean; skipped?: boolean; error?: string };

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string;
}): Promise<SendResult> {
  const resend = getClient();
  const from = process.env.EMAIL_FROM;

  if (!resend || !from) {
    console.warn(
      `[email] skipped "${opts.subject}" — RESEND_API_KEY or EMAIL_FROM is not set.`,
    );
    return { ok: false, skipped: true };
  }

  try {
    const { error } = await resend.emails.send({
      from,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
      ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    });

    if (error) {
      console.error(`[email] "${opts.subject}" failed: ${error.message}`);
      return { ok: false, error: error.message };
    }

    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[email] "${opts.subject}" threw: ${message}`);
    return { ok: false, error: message };
  }
}
