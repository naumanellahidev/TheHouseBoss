import { isPending, siteConfig } from "@/lib/site-config";
import type { Lead } from "@/types/domain";

/**
 * Email templates.
 *
 * Plain HTML strings, no React Email dependency — two templates do not justify
 * a rendering library, and inline-styled tables are what actually survive
 * Outlook and Gmail.
 *
 * Every message carries the same compliance block as the site footer
 * (docs/09 § 1, "Where else disclosure is needed"). Marketing email needs a
 * postal address and a working unsubscribe as well; neither template here is
 * marketing — both are transactional replies to someone who just submitted a
 * form. The listing-alert emails DO need both, and they get their own template
 * when saved searches ship.
 */

/**
 * The one place colour literals are allowed outside globals.css: an email
 * client cannot read a CSS custom property, so tokens have to be inlined.
 * These values are copied from the @theme block and must be updated with it.
 */
const NAVY = "#0f1b2d"; // --color-ink-900
const GOLD = "#c9a227"; // --color-gold-500
const GOLD_TEXT = "#826713"; // --color-gold-600, the only gold that passes AA on light
const BONE = "#fdfcfa"; // --color-bone-50
const INK = "#26241f"; // --color-stone-900
const MUTED = "#57544e"; // --color-stone-700
const RULE = "#dfd9ce"; // --color-bone-300

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const FONT =
  "-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif";

function shell(title: string, body: string): string {
  const compliance = [
    escapeHtml(siteConfig.legalName),
    `${siteConfig.licenses.realEstate.label} ${siteConfig.licenses.realEstate.number}`,
    `${siteConfig.licenses.contractor.label} ${siteConfig.licenses.contractor.number}`,
  ].join(" &middot; ");

  return [
    "<!doctype html>",
    '<html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    `<title>${escapeHtml(title)}</title></head>`,
    `<body style="margin:0;padding:24px 12px;background:${BONE};font-family:${FONT};color:${INK};">`,
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;border-collapse:collapse;">',
    `<tr><td style="background:${NAVY};padding:20px 24px;border-radius:8px 8px 0 0;">`,
    `<span style="color:${BONE};font-size:18px;font-weight:700;letter-spacing:.02em;">The House Boss</span><br>`,
    `<span style="color:${GOLD};font-size:12px;letter-spacing:.12em;text-transform:uppercase;">Powered by ${escapeHtml(siteConfig.brokerage)}</span>`,
    "</td></tr>",
    `<tr><td style="background:#ffffff;padding:24px;border:1px solid ${RULE};border-top:0;">${body}</td></tr>`,
    `<tr><td style="padding:16px 24px;border:1px solid ${RULE};border-top:0;border-radius:0 0 8px 8px;background:#ffffff;">`,
    // FREC 61J2-10.026: the brokerage name is rendered larger and bolder than
    // the agent name here, exactly as in <ComplianceFooter />.
    `<p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};">`,
    `<strong style="color:${INK};font-size:14px;">${escapeHtml(siteConfig.brokerage)}</strong><br>${compliance}</p>`,
    `<p style="margin:8px 0 0;font-size:11px;color:${MUTED};">Equal Housing Opportunity.</p>`,
    "</td></tr></table></body></html>",
  ].join("");
}

const LEAD_TYPE_LABEL: Record<string, string> = {
  general: "General enquiry",
  listing_inquiry: "Listing enquiry",
  showing_request: "Showing request",
  seller: "Seller / valuation",
  va: "VA home loan",
  assumable: "Assumable mortgage",
  new_construction: "New construction",
};

export const leadTypeLabel = (value: string) =>
  LEAD_TYPE_LABEL[value] ?? value.replace(/_/g, " ");

/* ── 1. Notification to Krisi ───────────────────────────────────────────── */

export function leadNotification(lead: Lead, adminUrl: string) {
  const rows: [string, string | null][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Interested in", leadTypeLabel(lead.leadType)],
    ["Came from", lead.sourcePage],
  ];

  const table = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:6px 12px 6px 0;font-size:13px;color:${MUTED};white-space:nowrap;">${label}</td>` +
        `<td style="padding:6px 0;font-size:14px;color:${INK};font-weight:600;">${escapeHtml(String(value))}</td></tr>`,
    )
    .join("");

  const message = lead.message
    ? `<p style="margin:20px 0 0;font-size:13px;color:${MUTED};">Message</p>` +
      `<div style="margin-top:6px;padding:14px 16px;background:${BONE};border-left:3px solid ${GOLD};` +
      `font-size:14px;line-height:1.65;white-space:pre-wrap;">${escapeHtml(lead.message)}</div>`
    : "";

  const body = [
    `<h1 style="margin:0 0 4px;font-size:20px;line-height:1.3;">New enquiry from ${escapeHtml(lead.name)}</h1>`,
    `<p style="margin:0 0 20px;font-size:13px;color:${MUTED};">${leadTypeLabel(lead.leadType)}</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">${table}</table>`,
    message,
    `<p style="margin:24px 0 0;"><a href="${adminUrl}" style="display:inline-block;background:${NAVY};color:${BONE};` +
      `text-decoration:none;font-size:14px;font-weight:600;padding:12px 20px;border-radius:6px;">Open in the dashboard</a></p>`,
    `<p style="margin:16px 0 0;font-size:12px;color:${MUTED};">Reply to this email to answer ${escapeHtml(lead.name)} directly.</p>`,
  ].join("");

  const textRows = rows
    .filter(([, value]) => value)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");

  return {
    subject: `New ${leadTypeLabel(lead.leadType)} — ${lead.name}`,
    html: shell("New enquiry", body),
    text:
      `New enquiry from ${lead.name}\n\n${textRows}` +
      (lead.message ? `\n\nMessage:\n${lead.message}` : "") +
      `\n\nOpen in the dashboard: ${adminUrl}`,
  };
}

/* ── 2. Autoresponder to the sender ─────────────────────────────────────── */

export function leadAutoresponder(
  lead: Lead,
  custom?: { subject?: string | null; body?: string | null },
) {
  const phone = isPending(siteConfig.contact.phone)
    ? null
    : siteConfig.contact.phone;

  const firstName = lead.name.split(" ")[0] || lead.name;

  const intro =
    custom?.body?.trim() ||
    "Thank you for getting in touch. I have your message and I reply to every enquiry personally, usually the same business day.";

  const body = [
    `<h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">Thanks, ${escapeHtml(firstName)}</h1>`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;">${escapeHtml(intro)}</p>`,
    `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;">In the meantime, the guides on the site are written to answer real questions rather than to collect an email address — the ` +
      `<a href="${siteConfig.url}/guides/va-home-buyer" style="color:${GOLD_TEXT};">VA home-buyer guide</a> is the most detailed page there.</p>`,
    phone
      ? `<p style="margin:0 0 16px;font-size:15px;">If it is urgent, call me on <a href="tel:${phone.replace(/[^\d+]/g, "")}" style="color:${GOLD_TEXT};">${escapeHtml(phone)}</a>.</p>`
      : "",
    `<p style="margin:24px 0 0;font-size:15px;">— ${escapeHtml(siteConfig.legalName)}</p>`,
    `<p style="margin:4px 0 0;font-size:13px;color:${MUTED};">Realtor and Certified Residential Building Contractor</p>`,
  ].join("");

  return {
    subject: custom?.subject?.trim() || "Thanks for contacting The House Boss",
    html: shell("Thanks for getting in touch", body),
    text:
      `Thanks, ${firstName}\n\n${intro}\n\n` +
      (phone ? `If it is urgent, call ${phone}.\n\n` : "") +
      `— ${siteConfig.legalName}\nRealtor and Certified Residential Building Contractor\n` +
      `${siteConfig.brokerage} · ${siteConfig.licenses.realEstate.number} · ${siteConfig.licenses.contractor.number}`,
  };
}
