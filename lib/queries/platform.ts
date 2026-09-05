import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Permission, Role } from "@/lib/auth/permissions";

/**
 * Reads for the admin platform modules: audit logs, users, MLS and SEO.
 *
 * Every function uses the SESSION client, not the service client, so RLS
 * applies. That is the point: a `content_manager` calling `getAuditLogs()` gets
 * nothing back, because `view_audit_logs` is not in their grants and the policy
 * says so. The permission check in the page is a courtesy that renders a
 * useful message; this layer is where it is actually enforced.
 *
 * Returns normalised domain shapes rather than raw rows (HR19), so a column
 * rename does not reach the components.
 */

/* ── Audit ────────────────────────────────────────────────────────────────── */

export type AuditEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
  actor: { id: string; username: string | null; displayName: string | null } | null;
};

export async function getAuditLogs(opts: {
  page?: number;
  perPage?: number;
  action?: string;
  entityType?: string;
} = {}): Promise<{ entries: AuditEntry[]; total: number }> {
  const db = await createSupabaseServerClient();
  const perPage = opts.perPage ?? 50;
  const page = Math.max(1, opts.page ?? 1);

  let q = db
    .from("audit_logs")
    .select("id, action, entity_type, entity_id, metadata, ip_address, created_at, user_id", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range((page - 1) * perPage, page * perPage - 1);

  if (opts.action) q = q.eq("action", opts.action);
  if (opts.entityType) q = q.eq("entity_type", opts.entityType);

  const { data, count, error } = await q;
  if (error) throw new Error(`getAuditLogs: ${error.message}`);

  /*
    Actors are resolved in ONE follow-up query rather than a join.

    PostgREST cannot embed `profiles` from `audit_logs` — there is no foreign
    key between them, because `user_id` points at `auth.users`. Fetching the
    distinct ids in a single `in()` is one extra round trip for the page rather
    than one per row.
  */
  const ids = [...new Set((data ?? []).map((r) => r.user_id).filter(Boolean))] as string[];
  const actors = new Map<string, { id: string; username: string | null; displayName: string | null }>();

  if (ids.length > 0) {
    const { data: profiles } = await db
      .from("profiles")
      .select("id, username, display_name")
      .in("id", ids);
    for (const p of profiles ?? []) {
      actors.set(p.id, { id: p.id, username: p.username, displayName: p.display_name });
    }
  }

  return {
    total: count ?? 0,
    entries: (data ?? []).map((row) => ({
      id: row.id,
      action: row.action,
      entityType: row.entity_type,
      entityId: row.entity_id,
      metadata: (row.metadata ?? {}) as Record<string, unknown>,
      ipAddress: row.ip_address as string | null,
      createdAt: row.created_at,
      actor: row.user_id ? (actors.get(row.user_id) ?? null) : null,
    })),
  };
}

/* ── Users ────────────────────────────────────────────────────────────────── */

export type AdminUser = {
  id: string;
  username: string | null;
  displayName: string | null;
  fullName: string | null;
  role: Role;
  status: "active" | "suspended";
  lastLoginAt: string | null;
  createdAt: string;
};

export async function getAdminUsers(): Promise<AdminUser[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("profiles")
    .select("id, username, display_name, full_name, role, status, last_login_at, created_at")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`getAdminUsers: ${error.message}`);

  return (data ?? []).map((row) => ({
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    fullName: row.full_name,
    role: row.role as Role,
    status: (row.status ?? "active") as "active" | "suspended",
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
  }));
}

/** The grant matrix, for showing what a role actually allows. */
export async function getRoleMatrix(): Promise<Record<Role, Permission[]>> {
  const db = await createSupabaseServerClient();
  const { data } = await db.from("role_permissions").select("role, permission");

  const matrix = {} as Record<Role, Permission[]>;
  for (const row of data ?? []) {
    const role = row.role as Role;
    (matrix[role] ??= []).push(row.permission as Permission);
  }
  return matrix;
}

/* ── MLS ──────────────────────────────────────────────────────────────────── */

export type MlsSource = {
  slug: string;
  label: string;
  isConnected: boolean;
  lastTestedAt: string | null;
};

export type MlsSyncRun = {
  id: string;
  sourceSlug: string;
  trigger: "manual" | "scheduled";
  status: "running" | "succeeded" | "failed" | "cancelled";
  startedAt: string;
  completedAt: string | null;
  processed: number;
  created: number;
  updated: number;
  removed: number;
  failed: number;
  durationMs: number | null;
  message: string | null;
};

export async function getMlsSources(): Promise<MlsSource[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("mls_sources")
    .select("slug, label, is_connected, last_tested_at")
    .order("slug");

  if (error) throw new Error(`getMlsSources: ${error.message}`);

  return (data ?? []).map((r) => ({
    slug: r.slug,
    label: r.label,
    isConnected: r.is_connected,
    lastTestedAt: r.last_tested_at,
  }));
}

export async function getMlsSyncRuns(limit = 25): Promise<MlsSyncRun[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("mls_sync_runs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getMlsSyncRuns: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    sourceSlug: r.source_slug,
    trigger: r.trigger as "manual" | "scheduled",
    status: r.status as MlsSyncRun["status"],
    startedAt: r.started_at,
    completedAt: r.completed_at,
    processed: r.records_processed,
    created: r.records_created,
    updated: r.records_updated,
    removed: r.records_removed,
    failed: r.records_failed,
    durationMs: r.duration_ms,
    message: r.message,
  }));
}

/* ── SEO ──────────────────────────────────────────────────────────────────── */

export type SeoPage = {
  id: string;
  path: string;
  title: string | null;
  description: string | null;
  canonicalUrl: string | null;
  noindex: boolean;
  nofollow: boolean;
  updatedAt: string;
};

export async function getSeoPages(): Promise<SeoPage[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("seo_pages")
    .select("id, path, title, description, canonical_url, noindex, nofollow, updated_at")
    .order("path");

  if (error) throw new Error(`getSeoPages: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    path: r.path,
    title: r.title,
    description: r.description,
    canonicalUrl: r.canonical_url,
    noindex: r.noindex,
    nofollow: r.nofollow,
    updatedAt: r.updated_at,
  }));
}

export type Redirect = {
  id: string;
  fromPath: string;
  toPath: string;
  statusCode: number;
  createdAt: string;
};

export async function getRedirects(): Promise<Redirect[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("redirects")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw new Error(`getRedirects: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    fromPath: r.from_path,
    toPath: r.to_path,
    statusCode: r.status_code,
    createdAt: r.created_at,
  }));
}

/* ── Notifications ────────────────────────────────────────────────────────── */

export type AdminNotification = {
  id: string;
  kind: string;
  title: string;
  body: string | null;
  href: string | null;
  severity: "info" | "success" | "warning" | "error";
  readAt: string | null;
  createdAt: string;
};

export async function getNotifications(limit = 20): Promise<AdminNotification[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`getNotifications: ${error.message}`);

  return (data ?? []).map((r) => ({
    id: r.id,
    kind: r.kind,
    title: r.title,
    body: r.body,
    href: r.href,
    severity: r.severity as AdminNotification["severity"],
    readAt: r.read_at,
    createdAt: r.created_at,
  }));
}

/* ── SEO coverage ─────────────────────────────────────────────────────────── */

export type SeoCoverageGroup = {
  label: string;
  /** Published records of this kind. */
  total: number;
  /** How many of them have a generated or hand-written `seo_pages` row. */
  covered: number;
  /** Up to a handful of paths with no row, so the admin can act on them. */
  missing: string[];
};

export type SeoCoverage = {
  groups: SeoCoverageGroup[];
  total: number;
  covered: number;
  /** Rows in `seo_pages` that no longer match a published record. */
  orphaned: string[];
};

/**
 * How much of the published site has generated metadata.
 *
 * The SEO screen used to list `seo_pages` and stop there, which answered "what
 * has been overridden" and never "what is missing" — and missing is the only
 * question worth asking now that the rows are generated rather than typed.
 *
 * Four small selects and a diff in memory. A join would need a view over four
 * unrelated tables to produce something this screen reads once; at the scale
 * this site operates (tens of records, not thousands) the round trips cost less
 * than the migration would.
 */
export async function getSeoCoverage(): Promise<SeoCoverage> {
  const db = await createSupabaseServerClient();

  const [pages, listings, articles, cities, communities] = await Promise.all([
    db.from("seo_pages").select("path"),
    db.from("listings").select("slug").eq("published", true),
    db.from("articles").select("slug, kind, cities(slug)").eq("status", "published"),
    db.from("cities").select("slug").eq("published", true),
    db.from("communities").select("slug").eq("published", true),
  ]);

  const have = new Set((pages.data ?? []).map((r: { path: string }) => r.path));

  const group = (label: string, paths: string[]): SeoCoverageGroup => {
    const missing = paths.filter((p) => !have.has(p));
    return { label, total: paths.length, covered: paths.length - missing.length, missing };
  };

  const articlePaths = (articles.data ?? []).map(
    (r: { slug: string; kind: string; cities: unknown }) => {
      const city = Array.isArray(r.cities) ? r.cities[0] : r.cities;
      const citySlug = (city as { slug?: string } | null)?.slug;
      if (r.kind === "market_update") return `/market-updates/${r.slug}`;
      return citySlug === "lake-mary"
        ? `/lake-mary/blog/${r.slug}`
        : `/market-updates/${r.slug}`;
    },
  );

  const groups = [
    group(
      "Listings",
      (listings.data ?? []).map((r: { slug: string }) => `/listing/${r.slug}`),
    ),
    group("Articles", articlePaths),
    group("Cities", (cities.data ?? []).map((r: { slug: string }) => `/${r.slug}`)),
    group(
      "Communities",
      (communities.data ?? []).map((r: { slug: string }) => `/communities/${r.slug}`),
    ),
  ];

  const allPaths = new Set([
    ...(listings.data ?? []).map((r: { slug: string }) => `/listing/${r.slug}`),
    ...articlePaths,
    ...(cities.data ?? []).map((r: { slug: string }) => `/${r.slug}`),
    ...(communities.data ?? []).map(
      (r: { slug: string }) => `/communities/${r.slug}`,
    ),
  ]);

  return {
    groups,
    total: groups.reduce((t, g) => t + g.total, 0),
    covered: groups.reduce((t, g) => t + g.covered, 0),
    /*
      A row whose record was unpublished or deleted. Harmless — nothing reads it
      — but worth surfacing, because it is also how a typo in a hand-added path
      shows up: an override that looks saved and applies to nothing.
    */
    orphaned: [...have].filter((p) => !allPaths.has(p)),
  };
}

/* ── SEO engine output ────────────────────────────────────────────────────── */

export type EngineKeyword = {
  id: string;
  keyword: string;
  kind: string;
  intent: string;
  evidence: string;
  score: number;
  pinned: boolean;
  excluded: boolean;
  place: string | null;
};

export type EngineRun = {
  id: string;
  trigger: string;
  status: string;
  engineVersion: string;
  createdAt: string;
  completedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  error: string | null;
  keywordsStored: number;
  keywordsRejected: number;
};

/**
 * What the engine produced for one listing, for the review surface (§32, §85).
 *
 * The `evidence` column comes back with the keyword deliberately. It is the
 * answer to "why did the AI recommend this", which §85 asks to be available at
 * the point of the recommendation — not on a separate screen an operator has to
 * go looking for.
 */
export async function getListingKeywords(listingId: string): Promise<EngineKeyword[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("seo_keywords")
    .select("id, keyword, kind, intent, evidence, score, pinned, excluded, geo_entities(name)")
    .eq("listing_id", listingId)
    .order("score", { ascending: false });

  if (error) return [];

  return (data ?? []).map((row) => {
    const place = Array.isArray(row.geo_entities) ? row.geo_entities[0] : row.geo_entities;
    return {
      id: row.id,
      keyword: row.keyword,
      kind: String(row.kind),
      intent: String(row.intent),
      evidence: row.evidence,
      score: row.score,
      pinned: row.pinned,
      excluded: row.excluded,
      place: (place as { name?: string } | null)?.name ?? null,
    };
  });
}

/** The engine's history for one listing (§34, §90). Newest first. */
export async function getListingSeoRuns(listingId: string): Promise<EngineRun[]> {
  const db = await createSupabaseServerClient();
  const { data, error } = await db
    .from("seo_generation_runs")
    .select("id, trigger, status, engine_version, created_at, completed_at, approved_at, rejected_at, error, changes")
    .eq("listing_id", listingId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) return [];

  return (data ?? []).map((row) => {
    const changes = (row.changes ?? {}) as {
      keywordsStored?: number;
      keywordsRejected?: unknown[];
    };
    return {
      id: row.id,
      trigger: String(row.trigger),
      status: String(row.status),
      engineVersion: row.engine_version,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      approvedAt: row.approved_at,
      rejectedAt: row.rejected_at,
      error: row.error,
      keywordsStored: changes.keywordsStored ?? 0,
      keywordsRejected: Array.isArray(changes.keywordsRejected)
        ? changes.keywordsRejected.length
        : 0,
    };
  });
}
