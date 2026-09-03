import { z } from "zod";

/**
 * Environment validation — docs/12-env-deployment.md § 1, rule 3.
 *
 * Fail at startup, loudly, rather than on the first request that happens to
 * need a variable. A missing Supabase key should break the build, not produce a
 * 500 for a visitor three days later.
 *
 * Split in two on purpose: `clientEnv` may be read anywhere, `serverEnv` throws
 * if touched in a browser bundle.
 */

const clientSchema = z.object({
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  NEXT_PUBLIC_MEDIA_URL: z.string().url(),
});

/**
 * An environment variable that is declared but blank arrives as "", which is
 * not the same as absent to zod: `.optional()` still runs the string checks and
 * `.default()` never fires. On Vercel a variable added to the dashboard and
 * left empty behaves exactly this way, so every optional or defaulted value
 * here is normalised first.
 */
const blankAsUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema);

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  // Preprocessed because zod's .default() also only fires on undefined, and a
  // blank Vercel variable arrives as "". Same cause as lib/storage/index.ts.
  STORAGE_DRIVER: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["supabase", "r2", "local"]))
    .default("supabase"),
  RESEND_API_KEY: blankAsUndefined(z.string().startsWith("re_").optional()),
  LEAD_NOTIFY_EMAIL: blankAsUndefined(z.string().email().optional()),
  EMAIL_FROM: blankAsUndefined(z.string().min(3).optional()),
  CRON_SECRET: blankAsUndefined(z.string().min(32).optional()),
  REVALIDATE_SECRET: blankAsUndefined(z.string().min(32).optional()),
  LISTING_SOURCE: z
    .preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
      z.enum(["manual", "stellar", "simplyrets"]))
    .default("manual"),
});

function format(issues: z.ZodIssue[]) {
  return issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
}

/**
 * Phase 0 shipped before any Supabase project existed, so validation is
 * deferred until the variables are actually present. Once Phase 1 is wired up
 * this becomes unconditional — remove the guard then.
 */
const CONFIGURED = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

/**
 * Read explicitly, key by key, rather than handing the whole `process.env`
 * object to zod.
 *
 * Next.js inlines a `NEXT_PUBLIC_*` variable only where it appears as a literal
 * `process.env.THE_NAME` expression — it is a textual substitution, not a
 * runtime lookup. Passing `process.env` wholesale defeats it: the object that
 * arrives at build time does not contain the inlined values, so validation sees
 * `undefined` and throws even though the variable is correctly configured.
 *
 * That is not hypothetical. `next.config.ts` resolves `NEXT_PUBLIC_SITE_URL`
 * from the Vercel deployment URL and re-exports it through `env`, and this
 * function is what decided whether that worked. With the wholesale parse, a
 * deployment that had no explicit site URL failed the build with
 * "Invalid public environment" while the value was in fact present.
 */
const publicEnv = () => ({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_MEDIA_URL: process.env.NEXT_PUBLIC_MEDIA_URL,
});

export const clientEnv = (() => {
  if (!CONFIGURED) return null;
  const parsed = clientSchema.safeParse(publicEnv());
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment:\n${format(parsed.error.issues)}\n` +
        `See .env.example and docs/12-env-deployment.md.`,
    );
  }
  return parsed.data;
})();

let serverCache: z.infer<typeof serverSchema> | null = null;

export function getServerEnv() {
  if (typeof window !== "undefined") {
    throw new Error("getServerEnv() was called in a browser bundle.");
  }
  if (serverCache) return serverCache;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid server environment:\n${format(parsed.error.issues)}\n` +
        `See .env.example and docs/12-env-deployment.md.`,
    );
  }
  serverCache = parsed.data;
  return serverCache;
}

/** True once a Supabase project has been created and wired up. */
export const isSupabaseConfigured = CONFIGURED;
