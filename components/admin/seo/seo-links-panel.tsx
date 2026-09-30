"use client";

import * as React from "react";
import { ArrowRight, Check, Link2, X } from "lucide-react";

import { acceptAllLinks, setLinkStatus } from "@/app/(admin)/admin/(shell)/seo/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

export type PendingLink = {
  id: string;
  fromLabel: string;
  toPath: string;
  anchor: string;
  reason: string;
};

/**
 * SEO → Links.
 *
 * Internal links the engine proposes. Nothing here is on the site yet: a
 * proposal is a row until somebody accepts it, which is the whole point of
 * review mode. Each row says where the link would go, what it would say, and
 * why the engine thinks so, because a reviewer cannot judge the first two
 * without the third.
 */
export function SeoLinksPanel({
  links,
  onRefresh,
}: {
  links: PendingLink[];
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [busy, setBusy] = React.useState<string | null>(null);

  async function decide(id: string, status: "accepted" | "rejected") {
    setBusy(id);
    const result = await setLinkStatus(id, status);
    setBusy(null);
    if (result.ok) {
      toast.success(status === "accepted" ? "Link accepted." : "Link rejected.");
      onRefresh();
    } else toast.error(result.error ?? "That did not work.");
  }

  async function acceptEverything() {
    setBusy("all");
    const result = await acceptAllLinks();
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "All links accepted.");
      onRefresh();
    } else toast.error(result.error ?? "That did not work.");
  }

  return (
    <section aria-labelledby="links-heading" className="admin-card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h3 id="links-heading" className="text-h4">
            Suggested internal links
          </h3>
          <p className="text-sm text-foreground-muted">
            {links.length === 0
              ? "Nothing waiting. New suggestions appear when a listing or an article is analysed."
              : `${links.length} waiting. None of them is on the site until you accept it.`}
          </p>
        </div>

        {links.length > 1 ? (
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            loading={busy === "all"}
            onClick={() => void acceptEverything()}
          >
            Accept all {links.length}
          </Button>
        ) : null}
      </div>

      {links.length === 0 ? (
        <p className="flex items-center gap-3 rounded-2xl bg-surface-sunken p-4 text-sm text-foreground-muted">
          <Link2 className="size-4 shrink-0 text-foreground-subtle" aria-hidden="true" />
          An internal link is the cheapest ranking signal there is, and the engine only
          proposes one when the destination genuinely covers the anchor.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {links.map((link) => (
            <li
              key={link.id}
              className="flex flex-wrap items-start gap-3 rounded-2xl bg-surface-sunken px-3 py-3"
            >
              <span className="flex min-w-60 flex-1 flex-col gap-1">
                <span className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-foreground">{link.fromLabel}</span>
                  <ArrowRight className="size-3.5 text-foreground-subtle" aria-hidden="true" />
                  <code className="text-foreground-muted">{link.toPath}</code>
                </span>
                <span className="text-xs text-foreground-muted">
                  Anchor text: <span className="font-medium text-foreground">{link.anchor}</span>
                </span>
                <span className="text-xs leading-relaxed text-foreground-subtle">{link.reason}</span>
              </span>

              <span className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={cn("rounded-full")}
                  loading={busy === link.id}
                  onClick={() => void decide(link.id, "accepted")}
                >
                  <Check aria-hidden="true" />
                  Accept
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-full text-danger hover:bg-danger-bg hover:text-danger"
                  loading={busy === link.id}
                  onClick={() => void decide(link.id, "rejected")}
                >
                  <X aria-hidden="true" />
                  Reject
                </Button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
