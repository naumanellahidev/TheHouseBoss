import { z } from "zod";

/**
 * Cities, communities and reviews — one schema each, shared by the form and
 * the server action.
 *
 * The city stats and the FAQ list are the reason these are worth being strict
 * about. `docs/06` § 11 rule 5 forbids JSON textareas: the client edits both
 * through real forms, and these schemas are what guarantee that what a form
 * produces is what the public page can render. A malformed `stats_json` breaks
 * the city page; a malformed `faq_json` breaks the FAQPage markup along with it.
 */

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional();

const slug = z
  .string()
  .min(2)
  .max(120)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "lowercase words separated by hyphens");

/* ── FAQ ────────────────────────────────────────────────────────────────── */

/**
 * The accordion and the `FAQPage` markup are rendered from THIS array, so a
 * question that reaches one reaches the other. Marking up a question that is
 * not visible on the page is a policy violation (docs/08 § 6).
 */
export const faqItemSchema = z.object({
  q: z.string().trim().min(3, "Write the question").max(300),
  a: z.string().trim().min(3, "Write the answer").max(2000),
});

export const faqListSchema = z.array(faqItemSchema).max(30).default([]);

/* ── City stats ─────────────────────────────────────────────────────────── */

/**
 * Every field optional, because the client will have some figures and not
 * others — but `asOf` is required the moment ANY figure is present.
 *
 * "Never show a stale stat without its date" (docs/05, city hub section 3) is
 * the rule this enforces. A median price with no date is worse than no median
 * price: it looks current forever.
 */
export const cityStatsSchema = z
  .object({
    medianPrice: z.number().nonnegative().max(100_000_000).nullable().optional(),
    medianPricePerSqft: z.number().nonnegative().max(10_000).nullable().optional(),
    avgDaysOnMarket: z.number().int().nonnegative().max(3650).nullable().optional(),
    population: z.number().int().nonnegative().max(50_000_000).nullable().optional(),
    schoolDistrict: optionalText(200),
    commuteToOrlando: optionalText(120),
    /** ISO date. Required whenever a figure is set. */
    asOf: optionalText(40),
  })
  .refine(
    (v) => {
      const hasFigure =
        v.medianPrice != null ||
        v.medianPricePerSqft != null ||
        v.avgDaysOnMarket != null ||
        v.population != null;
      return !hasFigure || Boolean(v.asOf);
    },
    {
      message:
        "Add the date these figures were true. A market statistic without a date looks current forever.",
      path: ["asOf"],
    },
  );

export type CityStatsInput = z.infer<typeof cityStatsSchema>;

/* ── City ───────────────────────────────────────────────────────────────── */

export const citySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug,
    county: z.string().trim().min(2).max(120),
    inSearch: z.boolean().default(false),
    heroKey: z.string().max(200).nullable().optional(),
    heroAlt: optionalText(300),
    introMd: optionalText(4000),
    bodyMd: optionalText(40_000),
    stats: cityStatsSchema,
    faq: faqListSchema,
    metaTitle: optionalText(70),
    metaDesc: optionalText(180),
    published: z.boolean().default(false),
  })
  // A hero image without a description fails the accessibility requirement in
  // docs/09 § 3, exactly as a listing photo without alt text does.
  .refine((v) => !v.heroKey || (v.heroAlt?.trim().length ?? 0) > 0, {
    message: "Describe the hero image — alt text is required.",
    path: ["heroAlt"],
  });

export type CityInput = z.infer<typeof citySchema>;

/* ── Community ──────────────────────────────────────────────────────────── */

export const communitySchema = z
  .object({
    name: z.string().trim().min(2).max(120),
    slug,
    cityId: z.string().uuid(),
    heroKey: z.string().max(200).nullable().optional(),
    heroAlt: optionalText(300),
    introMd: optionalText(4000),
    bodyMd: optionalText(40_000),
    hoaInfo: optionalText(2000),
    amenities: z.array(z.string().trim().min(1).max(60)).max(40).default([]),
    priceMin: z.number().nonnegative().max(100_000_000).nullable().optional(),
    priceMax: z.number().nonnegative().max(100_000_000).nullable().optional(),
    faq: faqListSchema,
    metaTitle: optionalText(70),
    metaDesc: optionalText(180),
    published: z.boolean().default(false),
  })
  .refine(
    (v) => v.priceMin == null || v.priceMax == null || v.priceMin <= v.priceMax,
    { message: "The lowest price cannot be above the highest.", path: ["priceMin"] },
  )
  .refine((v) => !v.heroKey || (v.heroAlt?.trim().length ?? 0) > 0, {
    message: "Describe the hero image — alt text is required.",
    path: ["heroAlt"],
  });

export type CommunityInput = z.infer<typeof communitySchema>;

/* ── Review ─────────────────────────────────────────────────────────────── */

export const REVIEW_SOURCES = ["Google", "Zillow", "Realtor.com", "Direct"] as const;

/**
 * Only genuinely received reviews (docs/09 § 7). Nothing here can enforce that
 * — it is a matter of fact, not of validation — so the admin screen carries a
 * standing warning instead, and `AggregateRating` markup is never emitted.
 */
export const reviewSchema = z.object({
  authorName: z.string().trim().min(2).max(120),
  authorRole: optionalText(120),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  body: z.string().trim().min(10, "Paste the review text").max(5000),
  source: z.enum(REVIEW_SOURCES).nullable().optional(),
  sourceUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/\S+$/.test(v), "Enter a full URL, or leave it blank")
    .transform((v) => (v.length === 0 ? null : v))
    .nullable()
    .optional(),
  reviewedAt: optionalText(40),
  published: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
