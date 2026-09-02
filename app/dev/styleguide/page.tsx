import type { Metadata } from "next";
import { Bath, BedDouble, Home, Ruler } from "lucide-react";

import { Breadcrumbs } from "@/components/site/breadcrumbs";
import { Container, Section, SectionHeader } from "@/components/site/container";
import { EmptyState } from "@/components/site/empty-state";
import { FaqAccordion } from "@/components/site/faq-accordion";
import { LeadForm } from "@/components/site/lead-form";
import { Logo } from "@/components/site/logo";
import { PropertyImage, IMAGE_SIZES } from "@/components/site/property-image";
import {
  ResponsiveTable,
  type Column,
} from "@/components/site/responsive-table";
import { StatTiles } from "@/components/site/stat-tiles";
import { Badge, listingStatusBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldLabel,
  Input,
  Select,
  Textarea,
} from "@/components/ui/field";
import { PropertyCardSkeleton, Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Design System",
  robots: { index: false, follow: false },
};

/* ── local helpers, styleguide only ─────────────────────────────────────── */

function Swatch({
  token,
  value,
  note,
  dark = false,
}: {
  token: string;
  value: string;
  note?: string;
  dark?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div
        className="h-16 w-full rounded-md border border-border"
        style={{ background: `var(${value})` }}
      />
      <div className="flex flex-col gap-0.5">
        <code className="text-xs font-semibold text-foreground">{token}</code>
        <code className="text-xs text-foreground-subtle">{value}</code>
        {note ? (
          <span
            className={
              dark
                ? "text-xs font-medium text-danger"
                : "text-xs text-foreground-subtle"
            }
          >
            {note}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-border py-5 last:border-b-0 md:flex-row md:items-center md:gap-8">
      <div className="w-40 shrink-0">
        <code className="text-xs font-semibold text-foreground-subtle">
          {label}
        </code>
      </div>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const demoRows = [
  {
    id: "1",
    address: "123 Lakeview Dr",
    city: "Lake Mary",
    price: 525000,
    beds: 4,
    status: "active" as const,
  },
  {
    id: "2",
    address: "88 Heathrow Ridge Court, Heathrow",
    city: "Lake Mary",
    price: 1245000,
    beds: 5,
    status: "pending" as const,
  },
  {
    id: "3",
    address: "41 Longwood Oaks Ave",
    city: "Longwood",
    price: 389900,
    beds: 3,
    status: "sold" as const,
  },
];

const demoColumns: Column[] = [
  { key: "address", header: "Address", primary: true },
  { key: "city", header: "City" },
  { key: "price", header: "Price", align: "end" },
  { key: "beds", header: "Beds", align: "end" },
  { key: "status", header: "Status" },
];

export default function StyleguidePage() {
  return (
    <>
      <Section tone="invert" className="py-12 md:py-16">
        <Container className="flex flex-col gap-6">
          <Breadcrumbs
            items={[{ href: "/dev/styleguide", label: "Design System" }]}
            invert
          />
          <SectionHeader
            as="h1"
            invert
            overline="Phase 0"
            title="The House Boss — Design System"
            lead="Luxury Authority: deep navy ground, warm gold accent, Fraunces over Inter. Every token, component and state on one page. This is the artifact the client approves before Phase 1."
          />
          <div className="flex flex-wrap items-end gap-10 pt-2">
            <Logo variant="full" invert href={null} />
            <Logo variant="compact" invert href={null} />
            <Logo variant="stacked" invert href={null} />
          </div>
        </Container>
      </Section>

      {/* ── Color ──────────────────────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="01"
            title="Color"
            lead="Components use semantic tokens only. Palette tokens exist so the semantic layer has something to point at."
          />

          <div>
            <h3 className="mb-4 text-h4">Palette — ink</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Swatch token="ink-950" value="--color-ink-950" />
              <Swatch
                token="ink-900"
                value="--color-ink-900"
                note="Primary brand navy"
              />
              <Swatch token="ink-800" value="--color-ink-800" />
              <Swatch token="ink-700" value="--color-ink-700" />
              <Swatch token="ink-600" value="--color-ink-600" />
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-h4">Palette — gold</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Swatch
                token="gold-600"
                value="--color-gold-600"
                note="Gold as TEXT on light — 4.7:1"
              />
              <Swatch
                token="gold-500"
                value="--color-gold-500"
                note="Accent SURFACE only — 2.3:1 as text"
                dark
              />
              <Swatch token="gold-400" value="--color-gold-400" />
              <Swatch token="gold-200" value="--color-gold-200" />
              <Swatch token="gold-50" value="--color-gold-50" />
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-h4">Palette — bone &amp; stone</h3>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              <Swatch
                token="bone-50"
                value="--color-bone-50"
                note="Page ground"
              />
              <Swatch token="bone-100" value="--color-bone-100" />
              <Swatch token="bone-200" value="--color-bone-200" />
              <Swatch
                token="bone-300"
                value="--color-bone-300"
                note="Borders"
              />
              <Swatch token="stone-500" value="--color-stone-500" />
              <Swatch token="stone-700" value="--color-stone-700" />
              <Swatch
                token="stone-900"
                value="--color-stone-900"
                note="Body text"
              />
            </div>
          </div>

          <div className="rounded-lg border border-danger/30 bg-danger-bg p-5">
            <h3 className="text-h4 text-foreground">
              The one trap in this palette
            </h3>
            <p className="mt-2 max-w-[68ch] text-sm text-foreground-muted">
              <code>--color-accent</code> (#C9A227) is 2.36:1 on the bone
              ground. It fails for text. Use it as a <strong>surface</strong> —
              button fill, badge, rule, underline. For gold-colored{" "}
              <strong>text on light</strong>, use{" "}
              <code>--color-accent-quiet</code> (#826713, 5.25:1). On navy,{" "}
              <code>--color-accent</code> is 7.14:1 and is fine for text. Every
              figure here is computed by <code>npm run check:contrast</code>,
              not estimated.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <span className="text-sm font-semibold text-accent-quiet">
                accent-quiet on light — correct
              </span>
              <span className="rounded-sm bg-accent px-3 py-1.5 text-sm font-semibold text-accent-fg">
                accent as surface — correct
              </span>
              <span className="rounded-sm bg-ink-900 px-3 py-1.5 text-sm font-semibold text-accent">
                accent text on navy — correct
              </span>
            </div>
          </div>

          <div>
            <h3 className="mb-4 text-h4">Status colors</h3>
            <div className="flex flex-wrap gap-3">
              <Badge tone="active">Active</Badge>
              <Badge tone="coming">Coming Soon</Badge>
              <Badge tone="pending">Pending</Badge>
              <Badge tone="sold">Sold</Badge>
              <Badge tone="neutral">Off Market</Badge>
              <Badge tone="accent">New Construction</Badge>
              <Badge tone="outline">VA Eligible</Badge>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Typography ─────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="02"
            title="Typography"
            lead="Fraunces for h1–h3 and hero copy. Inter for everything else. All sizes fluid via clamp()."
          />

          <div className="flex flex-col gap-6 rounded-lg border border-border bg-surface p-6 md:p-8">
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-display · Fraunces 600 · 40→72
              </code>
              <p className="font-display text-display font-semibold">
                Find your home
              </p>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-h1 · Fraunces 600 · 32→52
              </code>
              {/* A div, not an <h1> — the page already has its real h1 and a
                  specimen must not create a second one. */}
              <div className="font-display text-h1 font-semibold">
                Lake Mary Homes for Sale
              </div>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-h2 · Fraunces 600 · 26→40
              </code>
              <h2 className="text-h2">Why work with a contractor-Realtor</h2>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-h3 · Fraunces 600 · 22→30
              </code>
              <h3 className="text-h3">Minimum Property Requirements</h3>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-h4 · Inter 600 · 18→22
              </code>
              <h4 className="text-h4">Key facts</h4>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-lead · Inter 400 · 17→20
              </code>
              <p className="max-w-[68ch] text-lead text-foreground-muted">
                My residential construction experience gives me a deeper
                understanding of a property&rsquo;s condition, potential repair
                needs and long-term potential.
              </p>
            </div>
            <div>
              <code className="text-xs text-foreground-subtle">
                --text-body · Inter 400 · 16 · measure 68ch
              </code>
              <p className="max-w-[68ch]">
                I help my clients look beyond appearances so they can make
                informed, confident decisions. Whether you are purchasing an
                existing home, preparing a property for sale, planning a
                renovation or building from the ground up, I can help you
                understand your options and navigate the entire process.
              </p>
            </div>
            <div className="flex flex-wrap items-baseline gap-8">
              <span>
                <code className="mr-2 text-xs text-foreground-subtle">
                  --text-sm
                </code>
                <span className="text-sm">Secondary text</span>
              </span>
              <span>
                <code className="mr-2 text-xs text-foreground-subtle">
                  --text-xs
                </code>
                <span className="text-xs">Labels and metadata</span>
              </span>
              <span>
                <code className="mr-2 text-xs text-foreground-subtle">
                  --text-overline
                </code>
                <span className="text-overline font-semibold tracking-[0.12em] text-accent-quiet uppercase">
                  Overline
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-8 border-t border-border pt-5">
              <span className="text-h4 font-bold tabular">
                {formatPrice(525000)}
              </span>
              <span className="text-h4 font-bold tabular">
                {formatPrice(1245000)}
              </span>
              <span className="font-display text-h2 font-bold tabular">
                {formatPrice(389900)}
              </span>
              <code className="text-xs text-foreground-subtle">
                tabular-nums, single formatPrice() helper
              </code>
            </div>
          </div>
        </Container>
      </Section>

      {/* ── Buttons ────────────────────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="03"
            title="Buttons"
            lead="Every variant, every state. Minimum 44px on touch. Loading preserves width so nothing reflows."
          />

          <div className="rounded-lg border border-border bg-surface px-6">
            <Row label="primary">
              <Button>Default</Button>
              <Button className="bg-primary-hover">Hover</Button>
              <Button disabled>Disabled</Button>
              <Button loading>Publishing</Button>
            </Row>
            <Row label="accent">
              <Button variant="accent">Schedule a Showing</Button>
              <Button variant="accent" className="bg-accent-hover">
                Hover
              </Button>
              <Button variant="accent" disabled>
                Disabled
              </Button>
              <Button variant="accent" loading>
                Sending
              </Button>
            </Row>
            <Row label="outline">
              <Button variant="outline">Secondary</Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </Row>
            <Row label="ghost">
              <Button variant="ghost">Tertiary</Button>
              <Button variant="ghost" disabled>
                Disabled
              </Button>
            </Row>
            <Row label="danger">
              <Button variant="danger">Delete listing</Button>
            </Row>
            <Row label="link">
              <Button variant="link">Read the VA guide</Button>
            </Row>
            <Row label="sizes">
              <Button size="sm">Small 36</Button>
              <Button size="md">Medium 44</Button>
              <Button size="lg">Large 52</Button>
              <Button size="icon" aria-label="Home">
                <Home />
              </Button>
            </Row>
            <Row label="block">
              <div className="w-full max-w-sm">
                <Button block variant="accent">
                  Full width
                </Button>
              </div>
            </Row>
          </div>

          <p className="text-sm text-foreground-muted">
            Tab through this section: every control shows a 2px gold focus ring
            at 2px offset. Nothing relies on hover alone.
          </p>
        </Container>
      </Section>

      {/* ── Forms ──────────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="04"
            title="Forms"
            lead="Labels always visible. Required marked with a word. Errors linked with aria-describedby. 16px minimum so iOS never zooms."
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-5 rounded-lg border border-border bg-surface p-6">
              <Field>
                <FieldLabel required>Street address</FieldLabel>
                <Input placeholder="123 Lakeview Dr" />
                <FieldDescription>As it appears on the deed.</FieldDescription>
              </Field>

              <Field>
                <FieldLabel required>City</FieldLabel>
                <Select defaultValue="lake-mary">
                  <option value="lake-mary">Lake Mary</option>
                  <option value="longwood">Longwood</option>
                  <option value="sanford">Sanford</option>
                  <option value="casselberry">Casselberry</option>
                  <option value="orlando">Orlando</option>
                </Select>
              </Field>

              <Field error="Enter a price greater than zero.">
                <FieldLabel required>List price</FieldLabel>
                <Input defaultValue="0" inputMode="numeric" />
              </Field>

              <Field>
                <FieldLabel>Description</FieldLabel>
                <Textarea
                  rows={3}
                  placeholder="Describe the property, never the ideal occupant."
                />
                <FieldDescription>
                  Fair Housing: describe the property, not who should live in
                  it.
                </FieldDescription>
              </Field>

              <Field>
                <FieldLabel>Disabled</FieldLabel>
                <Input disabled defaultValue="Locked — MLS-owned listing" />
              </Field>
            </div>

            <LeadForm
              heading="Talk to Krisi"
              description="Lead form shell — layout and accessibility final, submit wired in Phase 2."
              compact
            />
          </div>
        </Container>
      </Section>

      {/* ── Surfaces, radius, elevation ────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-8">
          <SectionHeader
            overline="05"
            title="Surfaces, radius and elevation"
            lead="Shadows are navy-tinted, never neutral gray. Never skip a rung on the ladder."
          />

          {/* Class names are written out in full — Tailwind cannot see a
              template literal, so `shadow-${s}` would never be generated. */}
          <div className="grid grid-cols-2 gap-6 md:grid-cols-3 lg:grid-cols-5">
            {[
              { label: "shadow-xs", cls: "shadow-xs" },
              { label: "shadow-sm", cls: "shadow-sm" },
              { label: "shadow-md", cls: "shadow-md" },
              { label: "shadow-lg", cls: "shadow-lg" },
              { label: "shadow-xl", cls: "shadow-xl" },
            ].map((s) => (
              <div key={s.label} className="flex flex-col gap-2">
                <div className={`h-24 rounded-lg bg-surface ${s.cls}`} />
                <code className="text-xs text-foreground-subtle">
                  {s.label}
                </code>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-6">
            {[
              { label: "radius-sm", cls: "rounded-sm" },
              { label: "radius-md", cls: "rounded-md" },
              { label: "radius-lg", cls: "rounded-lg" },
              { label: "radius-xl", cls: "rounded-xl" },
              { label: "radius-full", cls: "rounded-full" },
            ].map((r) => (
              <div key={r.label} className="flex flex-col gap-2">
                <div
                  className={`size-20 border border-border bg-surface-sunken ${r.cls}`}
                />
                <code className="text-xs text-foreground-subtle">
                  {r.label}
                </code>
              </div>
            ))}
          </div>
        </Container>
      </Section>

      {/* ── Data states ────────────────────────────────────────────────── */}
      <Section tone="sunken">
        <Container className="flex flex-col gap-10">
          <SectionHeader
            overline="06"
            title="Data states"
            lead="Loaded, skeleton, empty, error. A component without all four is not done."
          />

          <div>
            <h3 className="mb-4 text-h4">
              Image + skeleton (identical dimensions)
            </h3>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
                <PropertyImage
                  photo={null}
                  sizes={IMAGE_SIZES.cardGrid3}
                  aspect="4/3"
                />
                <div className="flex flex-col gap-1 p-4 md:p-5">
                  <p className="text-h4 font-bold tabular">
                    {formatPrice(525000)}
                  </p>
                  <p className="font-semibold">123 Lakeview Dr</p>
                  <p className="text-sm text-foreground-subtle">
                    Lake Mary, FL 32746
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3 text-sm text-foreground-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <BedDouble className="size-4" aria-hidden="true" />4 bd
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5">
                      <Bath className="size-4" aria-hidden="true" />3 ba
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1.5 tabular">
                      <Ruler className="size-4" aria-hidden="true" />
                      2,410 sqft
                    </span>
                  </div>
                </div>
              </div>
              <PropertyCardSkeleton />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-8 w-2/3" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </div>
            <p className="mt-3 text-xs text-foreground-subtle">
              The card above renders the branded placeholder because no photo is
              passed — this is exactly what a broken image URL produces. A grey
              broken-image icon never appears.
            </p>
          </div>

          <EmptyState
            title="No homes match these filters"
            description="Try widening the price range, or save this search and get an email the moment something lands."
            actions={
              <>
                <Button variant="accent">Widen price range</Button>
                <Button variant="outline">Clear all filters</Button>
              </>
            }
          />
        </Container>
      </Section>

      {/* ── Composite components ───────────────────────────────────────── */}
      <Section>
        <Container className="flex flex-col gap-10">
          <SectionHeader overline="07" title="Composite components" />

          <div>
            <h3 className="mb-4 text-h4">
              Stat tiles — 2 columns on mobile, 4 from 768px
            </h3>
            <StatTiles
              asOf="1 August 2026"
              stats={[
                {
                  label: "Median price",
                  value: "$525,000",
                  hint: "+3.1% year over year",
                },
                { label: "Price / sqft", value: "$248" },
                { label: "Days on market", value: "34" },
                { label: "Population", value: "18,000" },
              ]}
            />
          </div>

          <div>
            <h3 className="mb-4 text-h4">
              Responsive table — resize below 768px to see the card list
            </h3>
            <ResponsiveTable
              caption="Demo listings"
              columns={demoColumns}
              rows={demoRows}
              getRowKey={(r) => r.id}
              renderCell={(r, col) => {
                switch (col.key) {
                  case "address":
                    return r.address;
                  case "city":
                    return r.city;
                  case "price":
                    return (
                      <span className="tabular">{formatPrice(r.price)}</span>
                    );
                  case "beds":
                    return <span className="tabular">{r.beds}</span>;
                  case "status": {
                    const s = listingStatusBadge[r.status];
                    return <Badge tone={s.tone}>{s.label}</Badge>;
                  }
                  default:
                    return null;
                }
              }}
              renderActions={(r) => (
                <>
                  <Button size="sm" variant="ghost">
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`View ${r.address}`}
                  >
                    View
                  </Button>
                </>
              )}
            />
          </div>

          <div>
            <h3 className="mb-4 text-h4">
              FAQ accordion — feeds FAQPage JSON-LD from the same array
            </h3>
            <FaqAccordion
              defaultOpenFirst
              items={[
                {
                  q: "Is Lake Mary a good place to live?",
                  a: "Yes — Lake Mary consistently ranks among the strongest suburbs in Central Florida for schools, safety and commute access, which is why I chose to live here myself.",
                },
                {
                  q: "Can I use a VA loan on new construction in Florida?",
                  a: "Yes, but the builder must be VA-registered and the home has to pass a VA appraisal against Minimum Property Requirements.",
                },
                {
                  q: "What does it cost to have my own agent on a new build?",
                  a: "Typically nothing to you. The builder's budget already accounts for cooperating compensation — but you usually have to register your agent before your first visit.",
                },
              ]}
            />
          </div>

          <div>
            <h3 className="mb-4 text-h4">Breadcrumbs</h3>
            <Breadcrumbs
              items={[
                { href: "/lake-mary", label: "Lake Mary" },
                { href: "/lake-mary/homes-for-sale", label: "Homes for Sale" },
                { href: "#", label: "123 Lakeview Dr" },
              ]}
            />
          </div>
        </Container>
      </Section>

      {/* ── Responsive contract ────────────────────────────────────────── */}
      <Section tone="invert">
        <Container className="flex flex-col gap-6">
          <SectionHeader
            invert
            overline="08"
            title="Responsive contract"
            lead="360px is the hard floor. Resize this page — nothing may overflow horizontally at any width."
          />
          <div className="overflow-x-auto">
            <table className="w-full min-w-2xl border-collapse text-left text-sm text-foreground-invert-muted">
              <caption className="sr-only">Grid columns by breakpoint</caption>
              <thead>
                <tr className="border-b border-ink-700">
                  {["Component", "360", "480", "768", "1024", "1280+"].map(
                    (h) => (
                      <th
                        key={h}
                        scope="col"
                        className="px-3 py-2 text-xs font-semibold tracking-[0.08em] text-gold-400 uppercase"
                      >
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Property cards", "1", "1", "2", "3", "3"],
                  ["City tiles", "1", "2", "2", "3", "4"],
                  ["Stat tiles", "2", "2", "4", "4", "4"],
                  ["Footer columns", "1", "2", "2", "4", "4"],
                  ["Admin table", "cards", "cards", "table", "table", "table"],
                ].map((row) => (
                  <tr
                    key={row[0]}
                    className="border-b border-ink-800 last:border-b-0"
                  >
                    {row.map((cell, i) => (
                      <td
                        key={i}
                        className={
                          i === 0
                            ? "px-3 py-2.5 font-medium text-foreground-invert"
                            : "px-3 py-2.5 tabular"
                        }
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </Section>
    </>
  );
}
