import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { SectionEditor } from "@/components/admin/pages/section-editor";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { DEFAULT_CONTENT } from "@/lib/content/hire-contractor";
import { PAGE_HEROES } from "@/lib/content/page-heroes";
import { createServiceClient } from "@/lib/supabase/service";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

/**
 * The page-content editor (brief §34, §35).
 *
 * ── Why only these pages are listed ───────────────────────────────────────
 *
 * The Hire Contractor landing page, and the heroes of the two list pages that
 * have no record of their own to hang a headline or photograph on. A "Pages"
 * screen listing every route on the site would imply they are all editable,
 * and they are not — the guides, the search and the city hubs are code and
 * content that already has its own editor. Listing three that genuinely work
 * beats listing twelve where nine do nothing.
 *
 * ── Why the service-role client ───────────────────────────────────────────
 *
 * The public policy on `page_sections` admits only `enabled` rows, so a
 * session-scoped read would hide exactly the sections an operator came here to
 * switch back on. The admin policy allows the read; the service client is used
 * because this screen has already established the permission above it.
 */

type SectionSpec = {
  key: string;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
  toggleable?: boolean;
};

type PageSpec = {
  slug: string;
  /** What she calls it — "Insights" is the navigation label for /market-updates. */
  tab: string;
  title: string;
  description: string;
  path: string;
  sections: SectionSpec[];
};

const asRecord = (value: object) => value as unknown as Record<string, unknown>;

const PAGES: PageSpec[] = [
  {
    slug: "hire-contractor",
    tab: "Hire Contractor",
    title: "Hire Contractor page",
    description:
      "Every section of the Hire Contractor page. Unchanged sections show the default wording.",
    path: "/hire-contractor",
    sections: [
      {
        key: "hero",
        label: "Hero",
        description: "Headline, supporting line and the two buttons.",
        defaults: asRecord(DEFAULT_CONTENT.hero),
      },
      {
        key: "advantage",
        label: "The contractor difference",
        description: "Why holding both licences changes the conversation.",
        defaults: asRecord(DEFAULT_CONTENT.advantage),
      },
      {
        key: "credentials",
        label: "Licence and trust",
        description: "The credential block. Licence numbers come from site settings.",
        defaults: asRecord(DEFAULT_CONTENT.credentials),
      },
      {
        key: "services",
        label: "Services",
        description: "What you offer. Also used to build the page's search phrases.",
        defaults: asRecord(DEFAULT_CONTENT.services),
      },
      {
        key: "remodeling",
        label: "Remodeling",
        description: "The renovation section.",
        defaults: asRecord(DEFAULT_CONTENT.remodeling),
      },
      {
        key: "new_construction",
        label: "New construction",
        description: "The building-new section.",
        defaults: asRecord(DEFAULT_CONTENT.newConstruction),
      },
      {
        key: "process",
        label: "Process",
        description: "The five stages, from first conversation to finished space.",
        defaults: asRecord(DEFAULT_CONTENT.process),
      },
      {
        key: "local",
        label: "Central Florida",
        description: "Only list places you genuinely work in.",
        defaults: asRecord(DEFAULT_CONTENT.local),
      },
      {
        key: "lake_mary",
        label: "Lake Mary",
        description: "The home-market section.",
        defaults: asRecord(DEFAULT_CONTENT.lakeMary),
      },
      {
        key: "faq",
        label: "Questions",
        description: "Only include questions the page genuinely answers.",
        defaults: asRecord(DEFAULT_CONTENT.faq),
      },
      {
        key: "cta",
        label: "Final call to action",
        description: "The closing section, above the contact form.",
        defaults: asRecord(DEFAULT_CONTENT.cta),
      },
    ],
  },
  {
    slug: "market-updates",
    tab: "Insights",
    title: "Insights page",
    description:
      "The top of the market updates page. Updates themselves are written in Articles.",
    path: "/market-updates",
    sections: [
      {
        key: "hero",
        label: "Hero",
        description:
          "Small heading, headline, supporting line and the photograph behind them. Without a photograph chosen, the Lake Mary city photo is used.",
        defaults: asRecord(PAGE_HEROES["market-updates"]),
        toggleable: false,
      },
    ],
  },
  {
    slug: "reviews",
    tab: "Reviews",
    title: "Reviews page",
    description:
      "The top of the reviews page. Reviews themselves are approved in Reviews.",
    path: "/reviews",
    sections: [
      {
        key: "hero",
        label: "Hero",
        description:
          "Small heading, headline, supporting line and the photograph behind them. Without a photograph chosen, the home page photo is used.",
        defaults: asRecord(PAGE_HEROES.reviews),
        toggleable: false,
      },
    ],
  },
];

export default async function AdminPagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const identity = await getAdminIdentity();

  /*
    `manage_settings`, not a new permission.

    This screen edits site-owned copy on fixed routes — the same category of
    thing as the compliance footer or the announcement bar, which
    `manage_settings` already governs. Adding a `manage_content` permission
    would mean a migration and a role-matrix change to express a distinction
    nobody has asked for.
  */
  if (!identity?.permissions.includes("manage_settings")) {
    return (
      <>
        <AdminPageHeader title="Pages" />
        <EmptyState
          icon={ShieldAlert}
          title="You do not have access to page content"
          description="Editing page content needs the manage_settings permission."
        />
      </>
    );
  }

  const { page: requested } = await searchParams;
  const spec = PAGES.find((item) => item.slug === requested) ?? PAGES[0]!;

  const db = createServiceClient();
  const { data } = await db
    .from("page_sections")
    .select("section_key, content, enabled")
    .eq("page_slug", spec.slug);

  const stored = new Map(
    (data ?? []).map((row) => [
      row.section_key,
      { content: (row.content ?? {}) as Record<string, unknown>, enabled: row.enabled },
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={spec.title} description={spec.description} />

      <nav aria-label="Pages" className="scroll-row gap-2 md:flex-wrap">
        {PAGES.map((item) => {
          const active = item.slug === spec.slug;
          return (
            <Link
              key={item.slug}
              href={`/admin/pages?page=${item.slug}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center rounded-full border px-4 text-sm font-medium",
                "transition-colors duration-(--dur-fast)",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                active
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border-strong bg-surface text-foreground-muted hover:bg-surface-sunken hover:text-foreground",
              )}
            >
              {item.tab}
            </Link>
          );
        })}
      </nav>

      <p className="max-w-[70ch] rounded-lg border border-info/30 bg-info-bg p-4 text-sm text-foreground">
        Each section saves on its own, and the page updates on its next load.{" "}
        <a
          href={spec.path}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-accent-quiet underline underline-offset-4 hover:text-foreground"
        >
          Open {spec.tab} in a new tab
        </a>
      </p>

      <div className="flex flex-col gap-5">
        {spec.sections.map((section) => {
          const row = stored.get(section.key);
          return (
            <SectionEditor
              // Keyed by page too, so switching tabs never carries one page's
              // unsaved edits into another page's form.
              key={`${spec.slug}/${section.key}`}
              pageSlug={spec.slug}
              sectionKey={section.key}
              label={section.label}
              description={section.description}
              defaults={section.defaults}
              stored={row?.content ?? null}
              enabled={row?.enabled ?? true}
              toggleable={section.toggleable ?? true}
            />
          );
        })}
      </div>
    </div>
  );
}
