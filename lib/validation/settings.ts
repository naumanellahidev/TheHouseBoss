import { z } from "zod";

/**
 * ONE schema for the settings form and the server action.
 *
 * Every field is optional and empty strings normalise to `null`, because NULL
 * is what "the client has not supplied this yet" means in `site_settings`
 * (docs/02). Writing "" instead would make the PENDING fallback in
 * lib/site-config.ts stop firing and the footer would render an empty phone
 * link.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const optionalEmail = z
  .string()
  .trim()
  .toLowerCase()
  .max(320)
  .refine(
    (value) => value === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value),
    "Enter a valid email address, or leave it blank",
  )
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || /^https?:\/\/\S+$/.test(value),
    "Enter a full URL starting with https://, or leave it blank",
  )
  .transform((value) => (value.length === 0 ? null : value))
  .nullable()
  .optional();

/**
 * The profile links that feed the `sameAs` array in JSON-LD (docs/08 § 6).
 * A key here becomes a field in the Settings form automatically.
 */
export const PROFILE_FIELDS = [
  { key: "googleBusiness", label: "Google Business Profile" },
  { key: "realtorDotCom", label: "Realtor.com" },
  { key: "zillow", label: "Zillow" },
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "youtube", label: "YouTube" },
] as const;

export const settingsSchema = z.object({
  // contact
  phone: optionalText(40),
  email: optionalEmail,
  addressStreet: optionalText(200),
  addressLocality: optionalText(100),
  addressRegion: optionalText(20),
  addressPostal: optionalText(20),
  officeHours: optionalText(200),

  // profiles — every value is a URL or nothing
  profiles: z.record(z.string(), optionalUrl).default({}),

  // site
  positioning: optionalText(300),
  announcement: optionalText(200),
  announcementHref: optionalUrl,

  // compliance — legally required, editable with a warning in the UI
  brokerageName: optionalText(200),
  licenseRe: optionalText(40),
  licenseContractor: optionalText(40),
  disclosureText: optionalText(1000),

  // notifications
  leadNotifyEmail: optionalEmail,
  autoresponderSubject: optionalText(200),
  autoresponderBody: optionalText(2000),
});

export type SettingsInput = z.infer<typeof settingsSchema>;
