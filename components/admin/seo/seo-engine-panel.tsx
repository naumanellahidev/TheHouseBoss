"use client";

import * as React from "react";
import { PlayCircle, RotateCw, Save, ShieldCheck } from "lucide-react";

import {
  drainQueueNow,
  retryFailedJobs,
  saveEngineSettings,
} from "@/app/(admin)/admin/(shell)/seo/actions";
import { Button } from "@/components/ui/button";
import { SwitchField } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

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

export type QueueCounts = {
  queued: number;
  processing: number;
  completed: number;
  failed: number;
};

/**
 * SEO → Engine.
 *
 * Three groups, in the order they matter: whether the engine publishes on its
 * own, what it is allowed to touch, and what it is never allowed to say. The
 * last group is not a preference list — those switches are what stop generated
 * copy claiming a feature a record does not have, which is the rule the whole
 * engine is built around.
 */
export function SeoEnginePanel({
  initialSettings,
  queue,
  modelName,
  onRefresh,
}: {
  initialSettings: EngineSettings;
  queue: QueueCounts;
  modelName: string | null;
  onRefresh: () => void;
}) {
  const toast = useToast();
  const [settings, setSettings] = React.useState(initialSettings);
  const [busy, setBusy] = React.useState<string | null>(null);

  const dirty = JSON.stringify(settings) !== JSON.stringify(initialSettings);
  const set = <K extends keyof EngineSettings>(key: K, value: EngineSettings[K]) =>
    setSettings((current) => ({ ...current, [key]: value }));

  async function save() {
    setBusy("save");
    const result = await saveEngineSettings(settings);
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Settings saved.");
      onRefresh();
    } else toast.error(result.error ?? "That could not be saved.");
  }

  async function run(key: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) {
    setBusy(key);
    const result = await fn();
    setBusy(null);
    if (result.ok) {
      toast.success(result.message ?? "Done.");
      onRefresh();
    } else toast.error(result.error ?? "That did not work.");
  }

  return (
    <div className="grid gap-4 xl:grid-cols-12">
      {/* ── How it publishes ──────────────────────────────────────────── */}
      <section
        aria-labelledby="mode-heading"
        className="admin-card flex h-fit flex-col gap-4 p-5 xl:col-span-5"
      >
        <div className="flex flex-col gap-1">
          <h3 id="mode-heading" className="text-h4">
            How it publishes
          </h3>
          <p className="text-sm text-foreground-muted">
            Review mode writes suggestions and waits. Automatic mode applies them and records
            what it changed in the audit log.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          {(
            [
              ["review", "Review first", "Nothing reaches the site until you accept it."],
              ["auto", "Apply automatically", "Metadata is written as soon as it is generated."],
            ] as const
          ).map(([value, title, detail]) => (
            <button
              key={value}
              type="button"
              onClick={() => set("mode", value)}
              aria-pressed={settings.mode === value}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                settings.mode === value
                  ? "border-accent bg-accent-wash"
                  : "border-border bg-surface hover:bg-surface-sunken",
              )}
            >
              <span className="text-sm font-semibold text-foreground">{title}</span>
              <span className="text-xs text-foreground-muted">{detail}</span>
            </button>
          ))}
        </div>

        <SwitchField
          label="Keep working in the background"
          description="A nightly pass picks up anything new or changed."
          checked={settings.enableContinuous}
          onCheckedChange={(next) => set("enableContinuous", next)}
        />

        <p className="rounded-2xl bg-surface-sunken p-3 text-xs text-foreground-muted">
          {modelName
            ? `Copy is polished by ${modelName}. The model may only rephrase what the record already says — it cannot introduce a number or a feature.`
            : "No model is configured, so copy comes from the deterministic writer. It is plainer and it is never wrong about the record."}
        </p>
      </section>

      {/* ── What it may touch ─────────────────────────────────────────── */}
      <section
        aria-labelledby="scope-heading"
        className="admin-card flex flex-col gap-4 p-5 xl:col-span-7"
      >
        <div className="flex flex-col gap-1">
          <h3 id="scope-heading" className="text-h4">
            What it works on
          </h3>
          <p className="text-sm text-foreground-muted">
            Switch off anything you would rather write yourself.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <SwitchField
            label="Listings"
            checked={settings.enableListings}
            onCheckedChange={(next) => set("enableListings", next)}
          />
          <SwitchField
            label="Articles"
            checked={settings.enableArticles}
            onCheckedChange={(next) => set("enableArticles", next)}
          />
          <SwitchField
            label="City pages"
            checked={settings.enableCities}
            onCheckedChange={(next) => set("enableCities", next)}
          />
          <SwitchField
            label="Community pages"
            checked={settings.enableCommunities}
            onCheckedChange={(next) => set("enableCommunities", next)}
          />
          <SwitchField
            label="Search phrases"
            description="The keyword set behind each page."
            checked={settings.enableKeywords}
            onCheckedChange={(next) => set("enableKeywords", next)}
          />
          <SwitchField
            label="Internal links"
            description="Proposals only, unless the mode above says otherwise."
            checked={settings.enableInternalLinks}
            onCheckedChange={(next) => set("enableInternalLinks", next)}
          />
          <SwitchField
            label="Structured data"
            checked={settings.enableSchema}
            onCheckedChange={(next) => set("enableSchema", next)}
          />
          <SwitchField
            label="Geographic context"
            description="Neighbourhood and county relationships."
            checked={settings.enableGeographic}
            onCheckedChange={(next) => set("enableGeographic", next)}
          />
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-accent-quiet" aria-hidden="true" />
            <h4 className="text-sm font-semibold text-foreground">What it may never say</h4>
          </div>
          <p className="text-xs text-foreground-muted">
            These are the rules that keep generated copy honest. Turning one off lets the engine
            write something the record does not support, which is how a real-estate site ends up
            with a compliance problem.
          </p>

          <div className="grid gap-3 md:grid-cols-2">
            <SwitchField
              label="Only mention verified features"
              checked={settings.requireVerifiedFeatures}
              onCheckedChange={(next) => set("requireVerifiedFeatures", next)}
            />
            <SwitchField
              label="Only name places that connect"
              checked={settings.requireGeoRelevance}
              onCheckedChange={(next) => set("requireGeoRelevance", next)}
            />
            <SwitchField
              label="Block keyword stuffing"
              checked={settings.blockKeywordStuffing}
              onCheckedChange={(next) => set("blockKeywordStuffing", next)}
            />
            <SwitchField
              label="Review big changes by hand"
              checked={settings.requireReviewForMajor}
              onCheckedChange={(next) => set("requireReviewForMajor", next)}
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <Button className="rounded-full" disabled={!dirty} loading={busy === "save"} onClick={() => void save()}>
            <Save aria-hidden="true" />
            Save settings
          </Button>
          {dirty ? (
            <Button
              variant="ghost"
              className="rounded-full"
              onClick={() => setSettings(initialSettings)}
            >
              Undo changes
            </Button>
          ) : null}
        </div>
      </section>

      {/* ── The queue ─────────────────────────────────────────────────── */}
      <section
        aria-labelledby="queue-heading"
        className="admin-card flex flex-col gap-4 p-5 xl:col-span-12"
      >
        <h3 id="queue-heading" className="text-h4">
          Queue
        </h3>

        <dl className="grid gap-3 sm:grid-cols-4">
          {(
            [
              ["Queued", queue.queued, "neutral"],
              ["Running", queue.processing, "neutral"],
              ["Completed", queue.completed, "good"],
              ["Failed", queue.failed, queue.failed > 0 ? "bad" : "neutral"],
            ] as const
          ).map(([label, value, tone]) => (
            <div key={label} className="flex flex-col gap-0.5 rounded-2xl bg-surface-sunken p-4">
              <dt className="text-xs text-foreground-subtle">{label}</dt>
              <dd
                className={cn(
                  "font-display text-h3 leading-none tabular",
                  tone === "good" && "text-success",
                  tone === "bad" && "text-danger",
                  tone === "neutral" && "text-foreground",
                )}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            loading={busy === "drain"}
            onClick={() => void run("drain", drainQueueNow)}
          >
            <PlayCircle aria-hidden="true" />
            Work the queue now
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            disabled={queue.failed === 0}
            loading={busy === "retry"}
            onClick={() => void run("retry", retryFailedJobs)}
          >
            <RotateCw aria-hidden="true" />
            Retry {queue.failed} failed
          </Button>
        </div>
      </section>
    </div>
  );
}
