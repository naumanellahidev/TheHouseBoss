"use client";

import * as React from "react";
import {
  ArrowRight,
  Check,
  Pencil,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import {
  createRedirect,
  deleteRedirect,
  deleteSeoOverride,
  generateForPath,
  generateMissingSeo,
  refreshSitemap,
  saveSeoOverride,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { EmptyState } from "@/components/site/empty-state";
import { ResponsiveTable } from "@/components/site/responsive-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Textarea,
} from "@/components/ui/field";
import { SwitchField } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import type { Redirect, SeoCoverage, SeoPage } from "@/lib/queries/platform";

/**
 * The SEO console.
 *
 * ── What changed and why ──────────────────────────────────────────────────
 *
 * This screen used to list `seo_pages` and nothing else — a table of rows that
 * could not be created, edited or deleted, beside a paragraph explaining that
 * there was deliberately no button. That made sense when metadata was written
 * by hand in each record's own SEO tab and this table was a curiosity.
 *
 * It stopped making sense when generation arrived. The interesting question is
 * no longer "what has been overridden" but "what is MISSING", and the answer
 * has to be actionable from here: generate the gaps, regenerate one page, edit
 * what a generator produced, and see at a glance how much of the site is
 * covered.
 *
 * ── Why lengths are shown as counts and not just warnings ─────────────────
 *
 * The 140–158 band is a CHECK constraint, so an out-of-band description cannot
 * be saved at all. A live count is what turns that from a rejection into a
 * thing you can steer towards while typing.
 */

const DESC_MIN = 140;
const DESC_MAX = 158;
const TITLE_MAX = 60;

type Draft = {
  path: string;
  title: string;
  description: string;
  canonicalUrl: string;
  noindex: boolean;
  nofollow: boolean;
};

const EMPTY: Draft = {
  path: "",
  title: "",
  description: "",
  canonicalUrl: "",
  noindex: false,
  nofollow: false,
};

/** A count that turns red only when the value would actually be rejected. */
function Meter({
  value,
  min,
  max,
}: {
  value: number;
  min?: number;
  max: number;
}) {
  const bad = value > max || (min !== undefined && value > 0 && value < min);
  return (
    <span
      className={
        bad
          ? "tabular text-xs font-semibold text-danger"
          : "tabular text-xs text-foreground-subtle"
      }
    >
      {value}
      {min !== undefined ? ` / ${min}–${max}` : ` / ${max}`}
    </span>
  );
}

export function SeoConsole({
  pages,
  redirects,
  coverage,
  modelName,
  lastSitemapRefresh,
  sitemapUrlCount,
}: {
  pages: SeoPage[];
  redirects: Redirect[];
  coverage: SeoCoverage;
  /** Null when no generation model is configured — worth saying out loud. */
  modelName: string | null;
  lastSitemapRefresh: string | null;
  sitemapUrlCount: number;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [editing, setEditing] = React.useState(false);
  const [redirectDraft, setRedirectDraft] = React.useState({
    fromPath: "",
    toPath: "",
  });
  const [confirm, setConfirm] = React.useState<
    | null
    | { kind: "override"; path: string }
    | { kind: "redirect"; id: string; fromPath: string }
  >(null);

  async function run(key: string, work: () => Promise<{ ok: boolean } & Record<string, unknown>>) {
    setBusy(key);
    const result = await work();
    setBusy(null);
    if (result.ok) toast.success(String(result.message ?? "Done."));
    else toast.error(String(result.error ?? "That did not work."));
    return result.ok;
  }

  const missing = coverage.total - coverage.covered;
  const percent =
    coverage.total === 0 ? 100 : Math.round((coverage.covered / coverage.total) * 100);

  return (
    /*
      The vertical rhythm lives here, not in the admin shell.

      `<main>` in the shell has padding and no gap, which is fine for a screen
      with one table and cramped for a screen with four sections. Dialogs render
      through a portal, so they are unaffected by being inside a flex column.
    */
    <div className="flex flex-col gap-10">
      {/* ── Coverage ─────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-semibold">Coverage</h2>
            <p className="max-w-[70ch] text-sm text-foreground-muted">
              Every published page gets a title and description written for it
              automatically when you publish. This is what has actually been
              written so far.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              loading={busy === "generate-all"}
              disabled={missing === 0}
              onClick={() => run("generate-all", generateMissingSeo)}
            >
              <Sparkles aria-hidden="true" />
              {missing === 0
                ? "Nothing missing"
                : `Generate the ${missing} missing`}
            </Button>
          </div>
        </div>

        <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {coverage.groups.map((group) => (
            <div
              key={group.label}
              className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4"
            >
              <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
                {group.label}
              </dt>
              <dd className="flex items-baseline gap-2">
                <span className="tabular text-h3 font-semibold text-foreground">
                  {group.covered}
                </span>
                <span className="tabular text-sm text-foreground-muted">
                  of {group.total}
                </span>
                {group.total > 0 && group.covered === group.total ? (
                  <Check className="ml-auto size-4 text-success" aria-hidden="true" />
                ) : null}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-foreground-muted">
          <span>
            <span className="tabular font-semibold text-foreground">{percent}%</span>{" "}
            of published pages covered
          </span>
          <span>
            Writer:{" "}
            {modelName ? (
              <span className="font-medium text-foreground">{modelName}</span>
            ) : (
              <span className="font-medium text-foreground">
                built-in (no AI model configured)
              </span>
            )}
          </span>
          {coverage.orphaned.length > 0 ? (
            <span className="flex items-center gap-1.5">
              <TriangleAlert className="size-4 text-warning" aria-hidden="true" />
              {coverage.orphaned.length} override
              {coverage.orphaned.length === 1 ? "" : "s"} match no published page
            </span>
          ) : null}
        </div>
      </section>

      {/* ── Page overrides ───────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-h4 font-semibold">Page metadata</h2>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setDraft(EMPTY);
              setEditing(true);
            }}
          >
            <Plus aria-hidden="true" />
            Add a page by hand
          </Button>
        </div>

        {pages.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="Nothing written yet"
            description="Publish a listing or an article and its metadata is written automatically — or press Generate above to do the whole site at once."
          />
        ) : (
          <ResponsiveTable
            caption="Page titles and descriptions"
            columns={[
              { key: "path", header: "Page", primary: true },
              { key: "title", header: "Title" },
              { key: "description", header: "Description" },
              { key: "robots", header: "Robots" },
              { key: "updated", header: "Updated", hideOnCard: true },
              { key: "actions", header: "" },
            ]}
            rows={pages}
            getRowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "path":
                  return (
                    <span className="flex flex-col gap-1">
                      <code className="text-sm">{row.path}</code>
                      {coverage.orphaned.includes(row.path) ? (
                        <Badge tone="pending">No published page</Badge>
                      ) : null}
                    </span>
                  );
                case "title":
                  return (
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm">{row.title ?? "—"}</span>
                      {row.title ? (
                        <Meter value={row.title.length} max={TITLE_MAX} />
                      ) : null}
                    </span>
                  );
                case "description":
                  return (
                    <span className="flex max-w-[46ch] flex-col gap-0.5">
                      <span className="line-clamp-2 text-sm text-foreground-muted">
                        {row.description ?? "—"}
                      </span>
                      {row.description ? (
                        <Meter
                          value={row.description.length}
                          min={DESC_MIN}
                          max={DESC_MAX}
                        />
                      ) : null}
                    </span>
                  );
                case "robots":
                  return row.noindex || row.nofollow ? (
                    <Badge tone="pending">
                      {[row.noindex && "noindex", row.nofollow && "nofollow"]
                        .filter(Boolean)
                        .join(", ")}
                    </Badge>
                  ) : (
                    <Badge tone="active">Indexable</Badge>
                  );
                case "updated":
                  return (
                    <span className="tabular text-xs text-foreground-subtle">
                      {formatDate(row.updatedAt)}
                    </span>
                  );
                case "actions":
                  return (
                    <span className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        loading={busy === `gen-${row.path}`}
                        onClick={() =>
                          run(`gen-${row.path}`, () => generateForPath(row.path))
                        }
                      >
                        <RefreshCw aria-hidden="true" />
                        Rewrite
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => {
                          setDraft({
                            path: row.path,
                            title: row.title ?? "",
                            description: row.description ?? "",
                            canonicalUrl: row.canonicalUrl ?? "",
                            noindex: row.noindex,
                            nofollow: row.nofollow,
                          });
                          setEditing(true);
                        }}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-danger hover:bg-danger-bg hover:text-danger"
                        onClick={() => setConfirm({ kind: "override", path: row.path })}
                      >
                        <Trash2 aria-hidden="true" />
                        <span className="sr-only">Remove the override for {row.path}</span>
                      </Button>
                    </span>
                  );
                default:
                  return null;
              }
            }}
          />
        )}
      </section>

      {/* ── Redirects ────────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <h2 className="text-h4 font-semibold">Redirects</h2>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Written automatically whenever a published address changes, so a link
          someone already has never breaks. You can also add one by hand for a
          page that moved before this site existed.
        </p>

        <form
          className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-surface p-4"
          onSubmit={async (event) => {
            event.preventDefault();
            const ok = await run("redirect", () => createRedirect(redirectDraft));
            if (ok) setRedirectDraft({ fromPath: "", toPath: "" });
          }}
        >
          <Field className="min-w-56 flex-1">
            <FieldLabel>Old address</FieldLabel>
            <Input
              value={redirectDraft.fromPath}
              placeholder="/old-page"
              onChange={(event) =>
                setRedirectDraft((d) => ({ ...d, fromPath: event.target.value }))
              }
            />
          </Field>
          <Field className="min-w-56 flex-1">
            <FieldLabel>Send visitors to</FieldLabel>
            <Input
              value={redirectDraft.toPath}
              placeholder="/lake-mary"
              onChange={(event) =>
                setRedirectDraft((d) => ({ ...d, toPath: event.target.value }))
              }
            />
          </Field>
          <Button type="submit" variant="outline" loading={busy === "redirect"}>
            <Plus aria-hidden="true" />
            Add redirect
          </Button>
        </form>

        {redirects.length === 0 ? (
          <EmptyState
            icon={ArrowRight}
            title="No redirects yet"
            description="One appears here the first time a published listing or article address is edited."
          />
        ) : (
          <ResponsiveTable
            caption="Permanent redirects"
            columns={[
              { key: "from", header: "From", primary: true },
              { key: "to", header: "To" },
              { key: "code", header: "Status" },
              { key: "actions", header: "" },
            ]}
            rows={redirects}
            getRowKey={(row) => row.id}
            renderCell={(row, column) => {
              switch (column.key) {
                case "from":
                  return <code className="text-sm">{row.fromPath}</code>;
                case "to":
                  return (
                    <span className="flex items-center gap-1.5">
                      <ArrowRight
                        className="size-3.5 shrink-0 text-foreground-subtle"
                        aria-hidden="true"
                      />
                      <code className="text-sm">{row.toPath}</code>
                    </span>
                  );
                case "code":
                  return <Badge tone="neutral">{row.statusCode}</Badge>;
                case "actions":
                  return (
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-danger hover:bg-danger-bg hover:text-danger"
                      onClick={() =>
                        setConfirm({
                          kind: "redirect",
                          id: row.id,
                          fromPath: row.fromPath,
                        })
                      }
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="sr-only">Remove the redirect from {row.fromPath}</span>
                    </Button>
                  );
                default:
                  return null;
              }
            }}
          />
        )}
      </section>

      {/* ── Sitemap and machine-readable files ───────────────────────────── */}
      <section className="flex flex-col gap-3">
        <h2 className="text-h4 font-semibold">Sitemap and AI files</h2>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Built from the published rows in this database, so they can never
          disagree with the content. They are cached for an hour, which is the
          only reason the button exists: it clears that cache so a listing you
          published a minute ago appears now rather than within the hour.
        </p>
        <p className="max-w-[70ch] text-sm text-foreground-muted">
          Search engines are not notified. Google retired the sitemap ping in
          2023 and the request now simply fails, so pretending to send one would
          be worse than not sending it. They re-crawl on their own schedule.
        </p>

        <dl className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
            <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
              Addresses in the sitemap
            </dt>
            <dd className="tabular text-h3 font-semibold">{sitemapUrlCount}</dd>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
            <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
              Last refreshed
            </dt>
            <dd className="text-sm text-foreground">
              {lastSitemapRefresh
                ? formatDateTime(lastSitemapRefresh)
                : "Not refreshed by hand yet"}
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
            <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
              Redirects live
            </dt>
            <dd className="tabular text-h3 font-semibold">{redirects.length}</dd>
          </div>
        </dl>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            loading={busy === "sitemap"}
            onClick={() => run("sitemap", refreshSitemap)}
          >
            <RefreshCw aria-hidden="true" />
            Refresh now
          </Button>

          {[
            ["/sitemap.xml", "sitemap.xml"],
            ["/robots.txt", "robots.txt"],
            ["/llms.txt", "llms.txt"],
          ].map(([href, label]) => (
            <a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-11 items-center text-sm font-semibold text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              View {label}
            </a>
          ))}
        </div>
      </section>

      {/* ── Edit dialog ──────────────────────────────────────────────────── */}
      <Dialog
        open={editing}
        onOpenChange={(open) => {
          setEditing(open);
          if (!open) setDraft(null);
        }}
      >
        <DialogContent
          className="max-w-xl"
          title={draft?.path ? `Metadata for ${draft.path}` : "Add a page"}
          description="Anything you leave blank is written for you. Anything you type wins."
        >
          {draft ? (
            <div className="flex flex-col gap-5 overflow-y-auto px-5 py-4">
              <Field>
                <FieldLabel>Page address</FieldLabel>
                <Input
                  value={draft.path}
                  placeholder="/lake-mary"
                  onChange={(event) =>
                    setDraft({ ...draft, path: event.target.value })
                  }
                />
                <FieldDescription>
                  The part after the domain, starting with a slash.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Title</FieldLabel>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft({ ...draft, title: event.target.value })
                  }
                />
                <FieldDescription>
                  <Meter value={draft.title.length} max={TITLE_MAX} /> — the
                  headline in a search result.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={4}
                  value={draft.description}
                  onChange={(event) =>
                    setDraft({ ...draft, description: event.target.value })
                  }
                />
                <FieldDescription>
                  <Meter
                    value={draft.description.length}
                    min={DESC_MIN}
                    max={DESC_MAX}
                  />{" "}
                  — must be between {DESC_MIN} and {DESC_MAX} characters, or left
                  blank so one is written for you.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Canonical address</FieldLabel>
                <Input
                  value={draft.canonicalUrl}
                  placeholder="Leave blank unless this page duplicates another"
                  onChange={(event) =>
                    setDraft({ ...draft, canonicalUrl: event.target.value })
                  }
                />
              </Field>

              <SwitchField
                label="Hide from search engines"
                description="Sets noindex. Use this only for a page that should never appear in results."
                checked={draft.noindex}
                onCheckedChange={(v) => setDraft({ ...draft, noindex: v })}
              />

              <SwitchField
                label="Do not follow links on this page"
                description="Sets nofollow. Rarely needed."
                checked={draft.nofollow}
                onCheckedChange={(v) => setDraft({ ...draft, nofollow: v })}
              />
            </div>
          ) : null}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={busy === "save-override"}
              onClick={async () => {
                if (!draft) return;
                const ok = await run("save-override", () => saveSeoOverride(draft));
                if (ok) {
                  setEditing(false);
                  setDraft(null);
                }
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={
          confirm?.kind === "redirect"
            ? "Remove this redirect?"
            : "Remove this override?"
        }
        description={
          confirm?.kind === "redirect"
            ? `Anyone following an old link to ${confirm.fromPath} will get a "not found" page instead of being sent on.`
            : "The page keeps working. It goes back to the title and description written for it automatically."
        }
        /*
          Friction only where it is earned. Removing a redirect can break an
          address search engines have already indexed (HR11), so it asks the
          operator to type the path. Removing a metadata override loses nothing
          — the page reverts to its generated title — so it does not.
        */
        confirmPhrase={confirm?.kind === "redirect" ? confirm.fromPath : undefined}
        confirmLabel="Remove"
        onConfirm={async () => {
          if (!confirm) return;
          if (confirm.kind === "redirect") {
            await run("del-redirect", () => deleteRedirect(confirm.id));
          } else {
            await run("del-override", () => deleteSeoOverride(confirm.path));
          }
          setConfirm(null);
        }}
      />
    </div>
  );
}
