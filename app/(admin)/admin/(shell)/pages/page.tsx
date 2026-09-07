import { ShieldAlert } from "lucide-react";

import { AdminPageHeader } from "@/components/admin/page-header";
import { SectionEditor } from "@/components/admin/pages/section-editor";
import { EmptyState } from "@/components/site/empty-state";
import { getAdminIdentity } from "@/lib/auth/permissions";
import { DEFAULT_CONTENT } from "@/lib/content/hire-contractor";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pages" };

/**
 * The landing-page editor (brief §34, §35).
 *
 * ── Why only one page is listed ───────────────────────────────────────────
 *
 * There is one service landing page. A "Pages" screen listing every route on
 * the site would imply they are all editable, and they are not — the guides,
 * the search and the city hubs are code and content that already has its own
 * editor. Listing one thing that genuinely works beats listing twelve where
 * eleven do nothing.
 *
 * ── Why the service-role client ───────────────────────────────────────────
 *
 * The public policy on `page_sections` admits only `enabled` rows, so a
 * session-scoped read would hide exactly the sections an operator came here to
 * switch back on. The admin policy allows the read; the service client is used
 * because this screen has already established the permission above it.
 */

/** The section keys, with what each is for in the operator's terms. */
const SECTIONS: {
  key: string;
  label: string;
  description: string;
  defaults: Record<string, unknown>;
}[] = [
  {
    key: "hero",
    label: "Hero",
    description: "Headline, supporting line and the two buttons.",
    defaults: DEFAULT_CONTENT.hero as unknown as Record<string, unknown>,
  },
  {
    key: "advantage",
    label: "The contractor difference",
    description: "Why holding both licences changes the conversation.",
    defaults: DEFAULT_CONTENT.advantage as unknown as Record<string, unknown>,
  },
  {
    key: "credentials",
    label: "Licence and trust",
    description:
      "The credential block. Licence numbers come from site settings.",
    defaults: DEFAULT_CONTENT.credentials as unknown as Record<string, unknown>,
  },
  {
    key: "services",
    label: "Services",
    description:
      "What you offer. Also used to build the page's search phrases.",
    defaults: DEFAULT_CONTENT.services as unknown as Record<string, unknown>,
  },
  {
    key: "remodeling",
    label: "Remodeling",
    description: "The renovation section.",
    defaults: DEFAULT_CONTENT.remodeling as unknown as Record<string, unknown>,
  },
  {
    key: "new_construction",
    label: "New construction",
    description: "The building-new section.",
    defaults: DEFAULT_CONTENT.newConstruction as unknown as Record<string, unknown>,
  },
  {
    key: "process",
    label: "Process",
    description: "The five stages, from first conversation to finished space.",
    defaults: DEFAULT_CONTENT.process as unknown as Record<string, unknown>,
  },
  {
    key: "local",
    label: "Central Florida",
    description:
      "Only list places you genuinely work in.",
    defaults: DEFAULT_CONTENT.local as unknown as Record<string, unknown>,
  },
  {
    key: "lake_mary",
    label: "Lake Mary",
    description: "The home-market section.",
    defaults: DEFAULT_CONTENT.lakeMary as unknown as Record<string, unknown>,
  },
  {
    key: "faq",
    label: "Questions",
    description:
      "Only include questions the page genuinely answers.",
    defaults: DEFAULT_CONTENT.faq as unknown as Record<string, unknown>,
  },
  {
    key: "cta",
    label: "Final call to action",
    description: "The closing section, above the contact form.",
    defaults: DEFAULT_CONTENT.cta as unknown as Record<string, unknown>,
  },
];

export default async function AdminPagesPage() {
  const identity = await getAdminIdentity();

  /*
    `manage_settings`, not a new permission.

    This screen edits site-owned copy on a fixed route — the same category of
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
          description="Editing landing pages needs the manage_settings permission."
        />
      </>
    );
  }

  const db = createServiceClient();
  const { data } = await db
    .from("page_sections")
    .select("section_key, content, enabled")
    .eq("page_slug", "hire-contractor");

  const stored = new Map(
    (data ?? []).map((row) => [
      row.section_key,
      { content: (row.content ?? {}) as Record<string, unknown>, enabled: row.enabled },
    ]),
  );

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Hire Contractor page"
        description="Every section of the Hire Contractor page. Unchanged sections show the default wording."
      />

      <p className="max-w-[70ch] rounded-lg border border-info/30 bg-info-bg p-4 text-sm text-foreground">
        Each section saves on its own. Changing services or areas re-runs the SEO for this page.</p>

      <div className="flex flex-col gap-5">
        {SECTIONS.map((section) => {
          const row = stored.get(section.key);
          return (
            <SectionEditor
              key={section.key}
              pageSlug="hire-contractor"
              sectionKey={section.key}
              label={section.label}
              description={section.description}
              defaults={section.defaults}
              stored={row?.content ?? null}
              enabled={row?.enabled ?? true}
            />
          );
        })}
      </div>
    </div>
  );
}
