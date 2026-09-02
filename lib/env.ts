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

const serverSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  STORAGE_DRIVER: z.enum(["supabase", "r2", "local"]).default("supabase"),
  RESEND_API_KEY: z.string().startsWith("re_").optional(),
  LEAD_NOTIFY_EMAIL: z.string().email().optional(),
  EMAIL_FROM: z.string().min(3).optional(),
  CRON_SECRET: z.string().min(32).optional(),
  REVALIDATE_SECRET: z.string().min(32).optional(),
  LISTING_SOURCE: z.enum(["manual", "stellar", "simplyrets"]).default("manual"),
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

export const clientEnv = (() => {
  if (!CONFIGURED) return null;
  const parsed = clientSchema.safeParse(process.env);
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
