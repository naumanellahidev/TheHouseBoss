import { z } from "zod";

/**
 * Lead and listing-alert intake.
 *
 * Shared by the public form and by `POST /api/leads`. The honeypot check is
 * part of the schema rather than a separate branch so it can never be forgotten
 * on a new form (docs/09-compliance-legal.md § 5).
 */

export const LEAD_TYPES = [
  "general",
  "listing_inquiry",
  "showing_request",
  "seller",
  "va",
  "assumable",
  "new_construction",
] as const;

export type LeadType = (typeof LEAD_TYPES)[number];

export const leadSchema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  phone: z
    .string()
    .trim()
    .max(40)
    .refine((v) => v === "" || /[\d]{7,}/.test(v.replace(/\D/g, "")), {
      message: "Enter a valid phone number, or leave it blank",
    })
    .optional()
    .or(z.literal("")),
  message: z.string().trim().max(5000).optional().or(z.literal("")),
  leadType: z.enum(LEAD_TYPES).default("general"),
  sourcePage: z.string().max(300).optional(),
  listingId: z.string().uuid().optional(),
  utm: z.record(z.string(), z.string().max(200)).optional(),

  /**
   * Honeypot. Hidden from users and from assistive tech; a real person leaves
   * it empty. Anything in it is a bot, and the route returns a success shape
   * without writing a row — telling a spammer they were caught only teaches
   * them to try again.
   *
   * Accepts ANY string on purpose. A `z.literal("")` would fail validation
   * first and hand the bot a 400 explaining which field it got wrong, which is
   * precisely the tell this field exists to withhold. `isBot()` below is what
   * decides, after the shape has been accepted.
   */
  company: z.string().max(200).optional(),
});

export type LeadInput = z.infer<typeof leadSchema>;

export const savedSearchSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  label: z.string().trim().max(120).optional(),
  /** The parsed search state, stored so the alert job can replay it. */
  query: z.record(z.string(), z.unknown()).default({}),
  frequency: z.enum(["instant", "daily", "weekly"]).default("weekly"),
  company: z.literal("").optional(),
});

export type SavedSearchInput = z.infer<typeof savedSearchSchema>;

/** True when the submission tripped the honeypot. */
export function isBot(input: { company?: string }): boolean {
  return typeof input.company === "string" && input.company.length > 0;
}
