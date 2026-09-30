"use client";

import * as React from "react";
import { ArrowRight, Plus, Trash2 } from "lucide-react";

import { createRedirect, deleteRedirect } from "@/app/(admin)/admin/(shell)/seo/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import type { Redirect } from "@/lib/queries/platform";
import { formatDate } from "@/lib/utils/date";

/**
 * SEO → Redirects.
 *
 * CLAUDE.md hard rule 11: a published URL is permanent. When something has to
 * move, the old path keeps answering through a row here rather than starting
 * to 404, which is the only way the standing it earned transfers to the new
 * page.
 */
export function SeoRedirectsPanel({
  redirects,
  onRefresh,
}: {
  redirects: Redirect[];
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [busy, setBusy] = React.useState<string | null>(null);

  async function add() {
    setBusy("add");
    const result = await createRedirect({ fromPath: from.trim(), toPath: to.trim() });
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Redirect added.");
      setFrom("");
      setTo("");
      onRefresh();
    } else toast.error(result.error ?? "That could not be added.");
  }

  async function remove(id: string) {
    setBusy(id);
    const result = await deleteRedirect(id);
    setBusy(null);
    if (result.ok) {
      toast.success("Redirect removed.");
      onRefresh();
    } else toast.error(result.error ?? "That could not be removed.");
  }

  const valid = from.startsWith("/") && to.startsWith("/") && from !== to;

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      <section
        aria-labelledby="add-redirect"
        className="admin-card flex h-fit flex-col gap-4 p-5 xl:col-span-5"
      >
        <div className="flex flex-col gap-1">
          <h3 id="add-redirect" className="text-h4">
            Add a redirect
          </h3>
          <p className="text-sm text-foreground-muted">
            Both paths start with a slash. The old path keeps working, permanently, and
            hands its standing to the new one.
          </p>
        </div>

        <Field>
          <FieldLabel>Old path</FieldLabel>
          <Input
            value={from}
            placeholder="/listing/old-address"
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel>New path</FieldLabel>
          <Input value={to} placeholder="/search" onChange={(event) => setTo(event.target.value)} />
          <FieldDescription>
            Send it somewhere genuinely related. A redirect to the home page is treated as a
            soft 404 by search engines.
          </FieldDescription>
        </Field>

        <Button
          className="self-start rounded-full"
          disabled={!valid}
          loading={busy === "add"}
          onClick={() => void add()}
        >
          <Plus aria-hidden="true" />
          Add redirect
        </Button>
      </section>

      <section
        aria-labelledby="redirect-list"
        className="admin-card flex flex-col gap-4 p-5 xl:col-span-7"
      >
        <h3 id="redirect-list" className="text-h4">
          {redirects.length} {redirects.length === 1 ? "redirect" : "redirects"}
        </h3>

        {redirects.length === 0 ? (
          <p className="rounded-2xl bg-surface-sunken p-4 text-sm text-foreground-muted">
            None yet. You need one whenever a published page moves or is removed.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {redirects.map((redirect) => (
              <li
                key={redirect.id}
                className="flex flex-wrap items-center gap-3 rounded-2xl bg-surface-sunken px-3 py-2.5"
              >
                <span className="flex min-w-60 flex-1 flex-wrap items-center gap-2 text-sm">
                  <code className="text-foreground">{redirect.fromPath}</code>
                  <ArrowRight className="size-3.5 text-foreground-subtle" aria-hidden="true" />
                  <code className="text-foreground-muted">{redirect.toPath}</code>
                  <Badge tone="neutral">{redirect.statusCode}</Badge>
                </span>
                <span className="text-xs text-foreground-subtle">
                  {formatDate(redirect.createdAt)}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-danger hover:bg-danger-bg hover:text-danger"
                  loading={busy === redirect.id}
                  onClick={() => void remove(redirect.id)}
                >
                  <Trash2 aria-hidden="true" />
                  <span className="sr-only">Remove the redirect from {redirect.fromPath}</span>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
