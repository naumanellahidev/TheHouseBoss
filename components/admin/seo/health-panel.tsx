"use client";

import * as React from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Info,
  Link2,
  ListChecks,
  Play,
  Sparkles,
  X,
} from "lucide-react";

import {
  acceptAllLinks,
  bulkAnalyseListings,
  drainQueueNow,
  retryFailedJobs,
  runAudit,
  saveEngineSettings,
  setLinkStatus,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SwitchField } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { formatDateTime } from "@/lib/utils/date";

/**
 * SEO health, opportunities and engine settings (brief §30, §31, §32, §33, §91).
 *
 * ── No health score ───────────────────────────────────────────────────────
 *
 * §30 says do not invent scores, and there is deliberately no letter grade or
 * percentage-out-of-100 anywhere on this panel. What is shown instead is the
 * numbers that were actually counted — pages audited, pages with a description,
 * pages with phrases — and a list of specific findings each naming the pages it
 * found. A single number would be more satisfying to look at and would mean
 * nothing, and the first decision made on the strength of it would be a
 * decision made on a fabrication.
 *
 * ── Findings before settings ──────────────────────────────────────────────
 *
 * Someone opening this screen wants to know what is wrong, not to configure an
 * engine. The controls are last.
 */

type Finding = {
  id: string;
  severity: "high" | "medium" | "low";
  title: string;
  detail: string;
  pages: string[];
  total: number;
};

type Report = {
  generatedAt: string;
  pagesAudited: number;
  findings: Finding[];
  metadataComplete: number;
  keywordCoverage: number;
  internalLinksAccepted: number;
  internalLinksProposed: number;
};

export type PendingLink = {
  id: string;
  fromLabel: string;
  toPath: string;
  anchor: string;
  reason: string;
};

export type EngineSettings = {
  mode: "review" | "auto";
  enableListings: boolean;
  enableArticles: boolean;
  enableCities: boolean;
  enableCommunities: boolean;
  enableGeographic: boolean;
  enableKeywords: boolean;
  enableInternalLinks: boolean;
  enableSchema: boolean;
  enableContinuous: boolean;
  requireVerifiedFeatures: boolean;
  requireGeoRelevance: boolean;
  blockKeywordStuffing: boolean;
  requireReviewForMajor: boolean;
};

const SEVERITY: Record<Finding["severity"], { tone: "pending" | "neutral"; label: string }> =
  {
    high: { tone: "pending", label: "Worth fixing" },
    medium: { tone: "neutral", label: "Worth a look" },
    low: { tone: "neutral", label: "Opportunity" },
  };

export function HealthPanel({
  initialSettings,
  pendingLinks,
  queue,
}: {
  initialSettings: EngineSettings;
  pendingLinks: PendingLink[];
  /** Real counts from `seo_jobs` (§36). Never a simulated progress bar. */
  queue: { queued: number; processing: number; completed: number; failed: number };
}) {
  const toast = useToast();
  const [report, setReport] = React.useState<Report | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [settings, setSettings] = React.useState(initialSettings);
  const [links, setLinks] = React.useState(pendingLinks);

  async function audit() {
    setBusy("audit");
    const result = await runAudit();
    setBusy(null);
    if (!result) {
      toast.error("The audit could not run.");
      return;
    }
    setReport(result as Report);
    toast.success(`Checked ${result.pagesAudited} published pages.`);
  }

  return (
    <div className="flex flex-col gap-10">
      {/* ── §30 health ───────────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-semibold">Site health</h2>
            <p className="max-w-[70ch] text-sm text-foreground-muted">
              Checks every published page for the things that stop it being
              found. Nothing is estimated — each number below is counted.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button type="button" loading={busy === "audit"} onClick={audit}>
              <Play aria-hidden="true" />
              Run the check
            </Button>
            <Button
              type="button"
              variant="outline"
              loading={busy === "bulk"}
              onClick={async () => {
                setBusy("bulk");
                const result = await bulkAnalyseListings();
                setBusy(null);
                if (result.ok) toast.success(result.message);
                else toast.error(result.error);
              }}
            >
              <Sparkles aria-hidden="true" />
              Re-analyse everything
            </Button>
          </div>
        </div>

        {/*
          §36. The queue, with its real counts.

          Shown only when there is something in it. A permanently visible
          "0 queued" panel is noise on a screen that already has a lot on it,
          and the moment it matters is the moment it is non-zero.
        */}
        {queue.queued + queue.processing + queue.failed > 0 ? (
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3 rounded-lg border border-border bg-surface p-4">
            <span className="flex items-center gap-2 text-sm">
              <ListChecks className="size-4 text-foreground-subtle" aria-hidden="true" />
              <span className="font-semibold text-foreground">Queue</span>
            </span>

            {(
              [
                ["Waiting", queue.queued],
                ["Running", queue.processing],
                ["Done", queue.completed],
                ["Failed", queue.failed],
              ] as const
            ).map(([label, value]) => (
              <span key={label} className="text-sm text-foreground-muted">
                {label}{" "}
                <span className="tabular font-semibold text-foreground">{value}</span>
              </span>
            ))}

            <span className="ml-auto flex flex-wrap gap-2">
              {queue.queued > 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  loading={busy === "drain"}
                  onClick={async () => {
                    setBusy("drain");
                    const r = await drainQueueNow();
                    setBusy(null);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  }}
                >
                  Process a batch now
                </Button>
              ) : null}

              {queue.failed > 0 ? (
                <Button
                  type="button"
                  variant="ghost"
                  loading={busy === "retry"}
                  onClick={async () => {
                    setBusy("retry");
                    const r = await retryFailedJobs();
                    setBusy(null);
                    if (r.ok) toast.success(r.message);
                    else toast.error(r.error);
                  }}
                >
                  Try the failed ones again
                </Button>
              ) : null}
            </span>

            <p className="w-full text-xs text-foreground-subtle">
              Anything waiting is picked up automatically every 15 minutes. You
              do not need to stay on this page.
            </p>
          </div>
        ) : null}

        {report ? (
          <>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Pages checked" value={report.pagesAudited} />
              <Stat
                label="With a description"
                value={report.metadataComplete}
                of={report.pagesAudited}
              />
              <Stat
                label="With search phrases"
                value={report.keywordCoverage}
                of={report.pagesAudited}
              />
              <Stat label="Links live" value={report.internalLinksAccepted} />
            </dl>

            <p className="text-xs text-foreground-subtle">
              Checked {formatDateTime(report.generatedAt)}
            </p>

            {report.findings.length === 0 ? (
              <p className="flex items-center gap-2 rounded-lg border border-success/30 bg-success-bg p-4 text-sm text-foreground">
                <Check className="size-4 text-success" aria-hidden="true" />
                Nothing to fix. Every published page has a description and search
                phrases.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {report.findings.map((finding) => (
                  <li
                    key={finding.id}
                    className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {finding.severity === "high" ? (
                        <AlertTriangle
                          className="size-4 shrink-0 text-warning"
                          aria-hidden="true"
                        />
                      ) : (
                        <Info
                          className="size-4 shrink-0 text-foreground-subtle"
                          aria-hidden="true"
                        />
                      )}
                      <span className="font-semibold text-foreground">
                        {finding.title}
                      </span>
                      <Badge tone={SEVERITY[finding.severity].tone}>
                        {finding.total}
                      </Badge>
                      <span className="text-xs text-foreground-subtle">
                        {SEVERITY[finding.severity].label}
                      </span>
                    </div>

                    <p className="max-w-[80ch] text-sm text-foreground-muted">
                      {finding.detail}
                    </p>

                    {/*
                      The pages themselves, as links. §31 asks for opportunities
                      based on real data, and the difference between a statistic
                      and a task is being able to click it.
                    */}
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                      {finding.pages.map((path) => (
                        <li key={path}>
                          <Link
                            href={path}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-accent-quiet underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                          >
                            {path}
                          </Link>
                        </li>
                      ))}
                      {finding.total > finding.pages.length ? (
                        <li className="text-xs text-foreground-subtle">
                          and {finding.total - finding.pages.length} more
                        </li>
                      ) : null}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <p className="rounded-lg border border-border bg-surface-sunken p-5 text-sm text-foreground-muted">
            Press <strong>Run the check</strong> to look at every published page.
            It takes a moment and changes nothing.
          </p>
        )}
      </section>

      {/* ── §16, §32 link review ─────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 className="text-h4 font-semibold">Suggested links</h2>
            <p className="max-w-[70ch] text-sm text-foreground-muted">
              Connections between your own pages, worked out from what each one
              is about. Every target was checked to exist. Nothing appears on the
              site until you accept it — including when the engine is set to
              automatic.
            </p>
          </div>

          {/*
            Accept-all is offered because each proposal was already verified
            when it was made — the target had to be a published page that
            exists. It is not "trust the machine", it is "apply the checks that
            already passed". Anything previously turned down stays turned down.
          */}
          {links.length > 0 ? (
            <Button
              type="button"
              loading={busy === "accept-all"}
              onClick={async () => {
                setBusy("accept-all");
                const r = await acceptAllLinks();
                setBusy(null);
                if (r.ok) {
                  toast.success(r.message);
                  setLinks([]);
                } else toast.error(r.error);
              }}
            >
              <Check aria-hidden="true" />
              Add all {links.length}
            </Button>
          ) : null}
        </div>

        {links.length === 0 ? (
          <p className="rounded-lg border border-border bg-surface-sunken p-5 text-sm text-foreground-muted">
            Nothing waiting. New suggestions appear when a listing is published.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Link2 className="size-4 text-foreground-subtle" aria-hidden="true" />
                  <span className="text-foreground-muted">{link.fromLabel}</span>
                  <span className="text-foreground-subtle">→</span>
                  <code className="text-foreground">{link.toPath}</code>
                  <span className="text-foreground-subtle">as</span>
                  <span className="font-medium text-foreground">
                    &ldquo;{link.anchor}&rdquo;
                  </span>
                </div>

                <p className="max-w-[80ch] text-sm text-foreground-muted">
                  {link.reason}
                </p>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    loading={busy === `accept-${link.id}`}
                    onClick={async () => {
                      setBusy(`accept-${link.id}`);
                      const r = await setLinkStatus(link.id, "accepted");
                      setBusy(null);
                      if (r.ok) {
                        toast.success(r.message);
                        setLinks((current) => current.filter((l) => l.id !== link.id));
                      } else toast.error(r.error);
                    }}
                  >
                    <Check aria-hidden="true" />
                    Add it
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    loading={busy === `reject-${link.id}`}
                    onClick={async () => {
                      setBusy(`reject-${link.id}`);
                      const r = await setLinkStatus(link.id, "rejected");
                      setBusy(null);
                      if (r.ok) {
                        toast.success(r.message);
                        setLinks((current) => current.filter((l) => l.id !== link.id));
                      } else toast.error(r.error);
                    }}
                  >
                    <X aria-hidden="true" />
                    No thanks
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── §33, §91 settings ────────────────────────────────────────────── */}
      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h4 font-semibold">How the engine behaves</h2>
          <p className="max-w-[70ch] text-sm text-foreground-muted">
            The safety rules are on, and they are what stop anything being
            claimed about a property that the property does not record.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <SwitchField
            label="Apply new phrases automatically"
            description="Off means nothing changes until you look at it. Suggested links always wait for you either way."
            checked={settings.mode === "auto"}
            onCheckedChange={(v) =>
              setSettings({ ...settings, mode: v ? "auto" : "review" })
            }
          />

          <SwitchField
            label="Work out nearby places"
            description="Uses the map of which areas genuinely border each other, so a listing is never described as near somewhere it is not."
            checked={settings.enableGeographic}
            onCheckedChange={(v) => setSettings({ ...settings, enableGeographic: v })}
          />

          <SwitchField
            label="Work out search phrases"
            description="Builds the phrases each page should be found for, from what that page actually records."
            checked={settings.enableKeywords}
            onCheckedChange={(v) => setSettings({ ...settings, enableKeywords: v })}
          />

          <SwitchField
            label="Suggest links between your pages"
            description="Proposes connections for you to accept. Never adds one on its own."
            checked={settings.enableInternalLinks}
            onCheckedChange={(v) => setSettings({ ...settings, enableInternalLinks: v })}
          />

          <SwitchField
            label="Redo the work when a page changes"
            description="Keeps phrases in step with a price change, a new photo or a move to a different community."
            checked={settings.enableContinuous}
            onCheckedChange={(v) => setSettings({ ...settings, enableContinuous: v })}
          />
        </div>

        <h3 className="mt-2 text-sm font-semibold tracking-wide text-foreground-subtle uppercase">
          Safety
        </h3>

        {/*
          These three are the reason the engine can be trusted with a property
          listing at all. They are switches because §33 asks for them to be, and
          the copy says plainly what turning one off permits — an operator
          disabling a safety rule should know exactly what they are allowing.
        */}
        <div className="flex flex-col gap-3">
          <SwitchField
            label="Only mention features the listing records"
            description="Off would allow a phrase about a pool on a property with no pool recorded. Leave this on."
            checked={settings.requireVerifiedFeatures}
            onCheckedChange={(v) =>
              setSettings({ ...settings, requireVerifiedFeatures: v })
            }
          />
          <SwitchField
            label="Only mention places genuinely connected"
            description="Off would allow any city name in any phrase, whether or not the property is near it."
            checked={settings.requireGeoRelevance}
            onCheckedChange={(v) => setSettings({ ...settings, requireGeoRelevance: v })}
          />
          <SwitchField
            label="Refuse stuffed or padded phrases"
            description="Blocks repeated place names and words like “luxury” that describe nothing."
            checked={settings.blockKeywordStuffing}
            onCheckedChange={(v) =>
              setSettings({ ...settings, blockKeywordStuffing: v })
            }
          />
        </div>

        <div>
          <Button
            type="button"
            loading={busy === "settings"}
            onClick={async () => {
              setBusy("settings");
              const r = await saveEngineSettings(settings);
              setBusy(null);
              if (r.ok) toast.success(r.message);
              else toast.error(r.error);
            }}
          >
            Save these settings
          </Button>
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  of,
}: {
  label: string;
  value: number;
  of?: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border bg-surface p-4">
      <dt className="text-xs font-semibold tracking-wide text-foreground-subtle uppercase">
        {label}
      </dt>
      <dd className="flex items-baseline gap-2">
        <span className="tabular text-h3 font-semibold text-foreground">{value}</span>
        {of !== undefined ? (
          <span className="tabular text-sm text-foreground-muted">of {of}</span>
        ) : null}
      </dd>
    </div>
  );
}
