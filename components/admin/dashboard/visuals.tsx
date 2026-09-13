import Link from "next/link";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  CircleAlert,
  Info,
  Minus,
} from "lucide-react";

import { describeActivity } from "@/components/admin/dashboard/activity";
import { MarkContactedButton } from "@/components/admin/leads/mark-contacted-button";
import { Badge } from "@/components/ui/badge";
import { leadTypeLabel } from "@/lib/email/templates";
import type { ActivityEntry, LeadActivity } from "@/lib/queries/admin";
import { formatBytes, storageLevel } from "@/lib/storage/budget";
import { cn } from "@/lib/utils";
import {
  compactAgo,
  formatDateTime,
  formatShortDay,
  relativeTime,
} from "@/lib/utils/date";
import type { AttentionItem, Lead, StorageUsage } from "@/types/domain";

/**
 * The dashboard's pieces — docs/06 § 3.
 *
 * Server components throughout. The one interactive control, Mark contacted,
 * is its own client component; the charts are SVG drawn on the server, so the
 * dashboard ships no chart library and no chart JavaScript.
 *
 * Every figure is a count over real rows (the rule in `getDashboardPulse`).
 */

/* ── Shared ──────────────────────────────────────────────────────────────── */

function CardHeader({
  id,
  title,
  href,
  linkLabel,
  invert = false,
}: {
  id: string;
  title: string;
  href?: string;
  linkLabel?: string;
  invert?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 id={id} className={cn("text-h4", invert && "text-foreground-invert")}>
        {title}
      </h3>
      {href && linkLabel ? (
        <Link
          href={href}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors duration-(--dur-fast)",
            "focus-visible:outline-2 focus-visible:outline-offset-2",
            invert
              ? "border-border-invert text-foreground-invert hover:bg-royal-800 focus-visible:outline-ring-invert"
              : "border-border text-foreground-muted hover:bg-surface-sunken hover:text-foreground focus-visible:outline-ring",
          )}
        >
          <ArrowUpRight className="size-4" aria-hidden="true" />
          <span className="sr-only">{linkLabel}</span>
        </Link>
      ) : null}
    </div>
  );
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "?"
  );
}

/* ── Greeting row ────────────────────────────────────────────────────────── */

const PIPELINE = [
  { status: "new", label: "Waiting on you", pill: "bg-primary text-primary-fg" },
  { status: "contacted", label: "Contacted", pill: "bg-accent text-accent-fg" },
  { status: "qualified", label: "Qualified", pill: "bg-accent-wash text-accent-quiet" },
  { status: "closed", label: "Closed", pill: "border border-border-strong text-foreground" },
] as const;

/**
 * The enquiry pipeline as proportional pills — the reference's progress strip,
 * with a meaning. Each pill's width is its share of enquiries; each links to
 * that filter. Spam is not part of a pipeline and is left out.
 */
export function PipelineStrip({ counts }: { counts: { status: string; count: number }[] }) {
  const rows = PIPELINE.map((stage) => ({
    ...stage,
    count: counts.find((row) => row.status === stage.status)?.count ?? 0,
  })).filter((row) => row.count > 0);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-foreground-muted">
        No enquiries yet. The pipeline fills in as they arrive.
      </p>
    );
  }

  return (
    <ol aria-label="Enquiry pipeline" className="flex w-full gap-1.5">
      {rows.map((row) => (
        <li
          key={row.status}
          style={{ flexGrow: row.count, flexBasis: 0 }}
          className="flex min-w-16 flex-col gap-1.5"
        >
          <span className="truncate text-xs text-foreground-muted">{row.label}</span>
          <Link
            href={`/admin/leads?status=${row.status}`}
            className={cn(
              "flex h-11 items-center rounded-full px-4 text-sm font-semibold tabular",
              "transition-[filter] duration-(--dur-fast) hover:brightness-95",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              row.pill,
            )}
          >
            {row.count}
            <span className="sr-only"> {row.label}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

/**
 * A very large number with its label — the reference's 91 · 104 · 185.
 *
 * Only the enquiries figure carries a change, because it is the only one where
 * last week is a meaningful comparison (see `PulseTile`).
 */
export function BigNumber({
  label,
  value,
  href,
  delta,
}: {
  label: string;
  value: string | number;
  href: string;
  delta?: { current: number; previous: number };
}) {
  const change = delta ? delta.current - delta.previous : null;

  return (
    <Link
      href={href}
      className="group flex flex-col items-start gap-1 rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:items-end"
    >
      <span className="font-display text-display leading-none font-light text-foreground tabular transition-colors group-hover:text-accent-quiet">
        {value}
      </span>
      <span className="flex items-center gap-1.5 text-xs text-foreground-muted">
        {label}
        {change !== null ? (
          <span
            className={cn(
              "inline-flex items-center gap-0.5 font-semibold",
              change > 0 && "text-success",
              change < 0 && "text-danger",
              change === 0 && "text-foreground-subtle",
            )}
          >
            {change > 0 ? (
              <ArrowUpRight className="size-3.5" aria-hidden="true" />
            ) : change < 0 ? (
              <ArrowDownRight className="size-3.5" aria-hidden="true" />
            ) : (
              <Minus className="size-3.5" aria-hidden="true" />
            )}
            <span className="tabular">{change === 0 ? "same" : Math.abs(change)}</span>
            <span className="sr-only">
              {change === 0 ? "as" : change > 0 ? "more than" : "fewer than"} the previous seven days
            </span>
          </span>
        ) : null}
      </span>
    </Link>
  );
}

/* ── Today: attention, then the time rail ────────────────────────────────── */

const SEVERITY = {
  high: { icon: CircleAlert, tone: "text-danger", ground: "bg-danger-bg" },
  medium: { icon: AlertTriangle, tone: "text-warning", ground: "bg-warning-bg" },
  low: { icon: Info, tone: "text-info", ground: "bg-info-bg" },
} as const;

export function TodayRail({
  attention,
  activity,
  className,
}: {
  attention: AttentionItem[];
  activity: ActivityEntry[];
  className?: string;
}) {
  return (
    <section
      aria-labelledby="attention-heading"
      className={cn("admin-card flex flex-col gap-5 p-5", className)}
    >
      <CardHeader id="attention-heading" title="Needs attention" />

      {attention.length === 0 ? (
        <p className="rounded-2xl bg-success-bg p-3 text-sm text-foreground">
          Nothing needs attention. No overdue purges, missing alt text or listings
          without a description.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {attention.slice(0, 5).map((item) => {
            const style = SEVERITY[item.severity];
            const Icon = style.icon;
            return (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-start gap-3 rounded-2xl p-3 transition-[filter] duration-(--dur-fast) hover:brightness-[0.98]",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                    style.ground,
                  )}
                >
                  <Icon className={cn("mt-0.5 size-4 shrink-0", style.tone)} aria-hidden="true" />
                  <span className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                    <span className="text-xs leading-relaxed text-foreground-muted">
                      {item.detail}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <div className="flex items-center justify-between gap-3">
          <h4 className="text-sm font-semibold text-foreground">Recent activity</h4>
          <Link
            href="/admin/audit-logs"
            className="inline-flex min-h-11 items-center text-sm font-medium text-accent-quiet underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            Full history
          </Link>
        </div>

        {activity.length === 0 ? (
          <p className="text-sm text-foreground-muted">
            Nothing recorded yet. Publishes, uploads and settings changes appear
            here as they happen.
          </p>
        ) : (
          /*
            The time rail. Times sit on a dashed line to the left; the newest
            entry is the solid one, the way the reference marks "now".
          */
          <ol className="relative flex flex-col gap-2 pl-16">
            <span
              aria-hidden="true"
              className="absolute top-3 bottom-3 left-7 border-l border-dashed border-border-strong"
            />
            {activity.map((entry, index) => {
              const { text } = describeActivity(entry.action);
              const newest = index === 0;
              return (
                <li
                  key={entry.id}
                  className={cn(
                    "relative flex flex-col gap-0.5 rounded-2xl px-3 py-2",
                    newest ? "bg-primary text-primary-fg" : "bg-surface-sunken text-foreground",
                  )}
                >
                  <time
                    dateTime={entry.createdAt}
                    title={formatDateTime(entry.createdAt)}
                    className={cn(
                      "absolute top-2 -left-16 w-14 rounded-full border py-0.5 text-center text-overline font-semibold tabular",
                      newest
                        ? "border-accent bg-accent text-accent-fg"
                        : "border-border-strong bg-surface text-foreground-muted",
                    )}
                  >
                    {compactAgo(entry.createdAt)}
                    <span className="sr-only"> ago</span>
                  </time>
                  <span className="text-sm">
                    <span className="font-semibold">{entry.actor ?? "The system"}</span> {text}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

/* ── Recent enquiries ────────────────────────────────────────────────────── */

const STATUS_LABEL: Record<Lead["status"], string> = {
  new: "Waiting",
  contacted: "Contacted",
  qualified: "Qualified",
  closed: "Closed",
  spam: "Spam",
};

const STATUS_TONE: Record<Lead["status"], "accent" | "active" | "pending" | "neutral" | "outline"> = {
  new: "accent",
  contacted: "active",
  qualified: "pending",
  closed: "neutral",
  spam: "outline",
};

export function RecentEnquiries({ leads, className }: { leads: Lead[]; className?: string }) {
  return (
    <section
      aria-labelledby="recent-leads-heading"
      className={cn("admin-card flex flex-col gap-4 p-5", className)}
    >
      <CardHeader
        id="recent-leads-heading"
        title="Recent enquiries"
        href="/admin/leads"
        linkLabel="All enquiries"
      />

      {leads.length === 0 ? (
        <p className="rounded-2xl bg-surface-sunken p-4 text-sm text-foreground-muted">
          No enquiries yet. Every form on the site lands here.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {leads.map((lead) => (
            <li
              key={lead.id}
              className={cn(
                "flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl px-3 py-2.5",
                lead.status === "new" && "bg-accent-wash",
              )}
            >
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg"
              >
                {initials(lead.name)}
              </span>
              {/*
                At least 10rem for the name. Without a floor the badge and the
                Mark contacted button kept their width on a phone and squeezed
                the name to its first letter; with one, they wrap underneath.
              */}
              <span className="flex min-w-40 flex-1 flex-col">
                <Link
                  href={`/admin/leads?lead=${lead.id}`}
                  className="truncate rounded-sm text-sm font-semibold text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  {lead.name}
                </Link>
                <span className="truncate text-xs text-foreground-muted">
                  {leadTypeLabel(lead.leadType)} · {relativeTime(lead.createdAt)}
                </span>
              </span>
              <Badge tone={STATUS_TONE[lead.status]}>{STATUS_LABEL[lead.status]}</Badge>
              {lead.status === "new" ? <MarkContactedButton leadId={lead.id} /> : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ── Enquiry calendar: the one navy card ─────────────────────────────────── */

function dotTone(count: number): string {
  if (count >= 3) return "bg-azure-400";
  if (count === 2) return "bg-azure-600";
  if (count === 1) return "bg-royal-600";
  return "bg-royal-800";
}

/**
 * One dot per day for twelve weeks — the reference's attendance grid, counting
 * enquiries. Columns are 7-day periods ending today, oldest on the left.
 */
export function EnquiryCalendar({ data, className }: { data: LeadActivity; className?: string }) {
  const busiest = data.days.reduce((best, day) => (day.count > best.count ? day : best), data.days[0]!);

  return (
    <section
      aria-labelledby="calendar-heading"
      className={cn(
        "flex flex-col gap-4 rounded-card bg-surface-invert p-5 text-foreground-invert shadow-card",
        className,
      )}
    >
      <CardHeader
        id="calendar-heading"
        title="Enquiry calendar"
        href="/admin/leads"
        linkLabel="Open enquiries"
        invert
      />

      <div className="flex items-end gap-6">
        <p className="flex items-baseline gap-2">
          <span className="font-display text-h1 leading-none font-light tabular">{data.thisWeek}</span>
          <span className="text-xs text-foreground-invert-muted">last 7 days</span>
        </p>
        <p className="flex items-baseline gap-2">
          <span className="font-display text-h3 leading-none font-light text-foreground-invert-muted tabular">
            {data.lastWeek}
          </span>
          <span className="text-xs text-foreground-invert-muted">the 7 before</span>
        </p>
      </div>

      <div
        role="img"
        aria-label={`${data.total} ${data.total === 1 ? "enquiry" : "enquiries"} in the last 12 weeks${
          busiest.count > 0 ? `; the busiest day was ${formatShortDay(busiest.key)} with ${busiest.count}` : ""
        }.`}
        className="grid auto-cols-fr grid-flow-col grid-rows-7 gap-1.5"
      >
        {data.days.map((day) => (
          <span
            key={day.key}
            title={`${formatShortDay(day.key)}: ${day.count}`}
            className={cn("aspect-square rounded-full", dotTone(day.count))}
          />
        ))}
      </div>

      <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-foreground-invert-muted" aria-hidden="true">
        {[0, 1, 2, 3].map((count) => (
          <li key={count} className="flex items-center gap-1.5">
            <span className={cn("size-2.5 rounded-full", dotTone(count))} />
            {count === 3 ? "3+" : count}
          </li>
        ))}
        <li className="ml-auto">12 weeks</li>
      </ul>
    </section>
  );
}

/* ── Enquiries by week ───────────────────────────────────────────────────── */

const CHART = { width: 640, height: 240, left: 36, right: 16, top: 16, bottom: 34 };

export function EnquiryChart({ data, className }: { data: LeadActivity; className?: string }) {
  const { width, height, left, right, top, bottom } = CHART;
  const peak = Math.max(0, ...data.weeks.flatMap((week) => [week.buying, week.selling]));
  const step = Math.max(1, Math.ceil(peak / 4));
  const ceiling = step * 4;
  const last = data.weeks.length - 1;

  const x = (i: number) => left + (i * (width - left - right)) / Math.max(1, last);
  const y = (value: number) => top + (height - top - bottom) * (1 - value / ceiling);
  const line = (key: "buying" | "selling") =>
    data.weeks.map((week, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(week[key]).toFixed(1)}`).join(" ");

  const buyingTotal = data.weeks.reduce((n, week) => n + week.buying, 0);
  const sellingTotal = data.weeks.reduce((n, week) => n + week.selling, 0);
  const labelled = [0, 4, 8, last].filter((i, pos, all) => i >= 0 && all.indexOf(i) === pos);

  return (
    <section aria-labelledby="chart-heading" className={cn("admin-card flex flex-col gap-4 p-5", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 id="chart-heading" className="text-h4">
          Enquiries by week
        </h3>
        <ul className="flex flex-wrap items-center gap-4 text-xs text-foreground-muted">
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="h-0.5 w-5 rounded-full bg-accent" />
            Buying <span className="font-semibold text-foreground tabular">{buyingTotal}</span>
          </li>
          <li className="flex items-center gap-2">
            <span aria-hidden="true" className="w-5 border-t-2 border-dotted border-primary" />
            Selling <span className="font-semibold text-foreground tabular">{sellingTotal}</span>
          </li>
          <li className="rounded-full border border-border px-3 py-1">12 weeks</li>
        </ul>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Enquiries per 7-day period over the last 12 weeks: ${buyingTotal} buying and ${sellingTotal} selling.`}
        className="h-auto w-full"
      >
        {[0, 1, 2, 3, 4].map((tick) => {
          const value = tick * step;
          return (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(value)}
                y2={y(value)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={left - 10}
                y={y(value) + 4}
                textAnchor="end"
                className="fill-foreground-subtle text-overline tabular"
              >
                {value}
              </text>
            </g>
          );
        })}

        <path d={line("buying")} className="fill-none stroke-accent" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
        <path d={line("selling")} className="fill-none stroke-primary" strokeWidth={2} strokeDasharray="1 6" strokeLinecap="round" />

        {data.weeks.map((week, i) => (
          <g key={week.start}>
            <circle
              cx={x(i)}
              cy={y(week.buying)}
              r={i === last ? 5 : 3}
              className={cn("stroke-surface", i === last ? "fill-accent" : "fill-accent")}
              strokeWidth={2}
            >
              <title>{`From ${formatShortDay(week.start)}: ${week.buying} buying, ${week.selling} selling`}</title>
            </circle>
          </g>
        ))}

        {labelled.map((i) => (
          <text
            key={i}
            x={x(i)}
            y={height - 10}
            textAnchor={i === 0 ? "start" : i === last ? "end" : "middle"}
            className="fill-foreground-subtle text-overline"
          >
            {i === last ? "This week" : formatShortDay(data.weeks[i]!.start)}
          </text>
        ))}
      </svg>

      {data.total === 0 ? (
        <p className="text-sm text-foreground-muted">
          No enquiries in the last 12 weeks. The lines rise as they arrive.
        </p>
      ) : null}
    </section>
  );
}

/* ── Storage donut ───────────────────────────────────────────────────────── */

const RING = { r: 48, stroke: 12 };

/**
 * Storage used, as a ring drawn against the 1 GB ceiling — not against what is
 * used. A 4 MB library is a sliver on this ring, because that is the truth
 * about how full the bucket is (docs/06 § 3).
 *
 * Colour never carries the state alone: the bytes, the percentage and the
 * level word are all text (docs/03 § 9).
 */
export function StorageDonut({
  usage,
  footer,
  className,
}: {
  usage: StorageUsage;
  footer?: React.ReactNode;
  className?: string;
}) {
  const percent = Math.min(100, Math.round((usage.totalBytes / usage.limitBytes) * 100));
  const level = storageLevel(usage);
  const circumference = 2 * Math.PI * RING.r;

  const segments = [
    { label: "Listings", bytes: usage.listingBytes, stroke: "stroke-primary", dot: "bg-primary" },
    { label: "Articles", bytes: usage.articleBytes, stroke: "stroke-accent", dot: "bg-accent" },
    { label: "Everything else", bytes: usage.otherBytes, stroke: "stroke-azure-400", dot: "bg-azure-400" },
  ];

  let offset = 0;
  const arcs = segments.map((segment) => {
    const length = (circumference * segment.bytes) / usage.limitBytes;
    const arc = { ...segment, length, offset };
    offset += length;
    return arc;
  });

  return (
    <section aria-labelledby="storage-heading" className={cn("admin-card flex flex-col gap-4 p-5", className)}>
      <CardHeader id="storage-heading" title="Storage" href="/admin/media" linkLabel="Open the media library" />

      <div className="flex flex-wrap items-center gap-5">
        <div
          role="progressbar"
          aria-valuenow={percent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Storage used: ${percent} percent, ${level.label}`}
          className="relative mx-auto size-36 shrink-0"
        >
          <svg viewBox="0 0 120 120" className="size-full" aria-hidden="true">
            <circle cx={60} cy={60} r={RING.r} fill="none" className="stroke-surface-sunken" strokeWidth={RING.stroke} />
            {arcs
              .filter((arc) => arc.length > 0)
              .map((arc) => (
                <circle
                  key={arc.label}
                  cx={60}
                  cy={60}
                  r={RING.r}
                  fill="none"
                  className={arc.stroke}
                  strokeWidth={RING.stroke}
                  strokeDasharray={`${arc.length} ${circumference}`}
                  strokeDashoffset={-arc.offset}
                  transform="rotate(-90 60 60)"
                />
              ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="font-display text-h3 leading-none text-foreground tabular">{percent}%</span>
            <span className="mt-1 text-xs text-foreground-muted">of 1 GB</span>
          </span>
        </div>

        <ul className="flex min-w-40 flex-1 flex-col gap-2 text-sm">
          {segments.map((segment) => (
            <li key={segment.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-foreground-muted">
                <span aria-hidden="true" className={cn("size-2.5 rounded-full", segment.dot)} />
                {segment.label}
              </span>
              <span className="font-medium text-foreground tabular">{formatBytes(segment.bytes)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 border-t border-border pt-2">
            <span className="text-foreground-muted">Used · {level.label}</span>
            <span className="font-semibold text-foreground tabular">{formatBytes(usage.totalBytes)}</span>
          </li>
        </ul>
      </div>

      {footer}
    </section>
  );
}
