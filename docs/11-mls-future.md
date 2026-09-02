# 11 — Stellar MLS: Future Integration

The client asked for Stellar MLS to power search. It is **deferred**, not
abandoned. This document records why, and exactly what it takes to add it.

---

## 1. Why it is deferred

### Access is granted to the brokerage, not the agent

Stellar MLS IDX data is licensed to **World Properties Group**, and the broker
must authorize an IDX feed for the agent's site. The agent cannot obtain it
alone. That is a business conversation the client has to have with her broker
before any code matters.

### The official path takes weeks

Stellar's modern feed is the **RESO Web API**, delivered through Bridge
Interactive (Zillow Group). The realistic sequence:

1. Broker authorizes IDX for the site
2. Application to Stellar / Bridge
3. Signed IDX agreement and display-rules compliance review
4. Credentials issued
5. Feed testing

Two to four weeks is normal. Building the whole site around a dependency that
might not clear for a month is a scheduling mistake.

### It works against the client's primary goal

MLS display rules commonly restrict scraping, framing and automated
redistribution of listing data. In practice that pushes toward blocking or
restricting AI crawlers on IDX listing pages — the exact opposite of *"a website
that is recognizable by ChatGPT."*

Listings we own outright carry no such restriction. They are fully crawlable,
fully citable, and fully ours.

### It is not what makes an assistant recommend her

Assistants answer "who should I call" from authority content, entity data and
corroborating profiles — not from a listing feed that every other agent site in
Central Florida also publishes. A syndicated feed is, by definition, duplicate
content. See `08-seo-ai-visibility.md` § 1.

**Recommendation to the client:** launch with her own listings. Start the IDX
paperwork with her broker in parallel. Add the feed when it clears, as a
strictly additive change.

---

## 2. What is already built for it

None of this is theoretical. The following exist today, unused:

### Schema columns on `listings`

| Column | Purpose |
|---|---|
| `source text default 'manual'` | `'manual'` \| `'stellar'` \| `'simplyrets'` |
| `source_id text` | The provider's own record id |
| `mls_number text` | Displayed MLS number |
| `synced_at timestamptz` | Last successful sync |
| `is_locked boolean` | True for feed-owned rows; blocks admin editing |
| `raw jsonb` | Provider payload, for fields we have not normalized |
| `unique (source, source_id)` | The upsert target |

### The `sync_log` table

Created and empty. Adding MLS requires no migration against a live database.

### The photo union type

```ts
type Photo =
  | { kind: 'stored';   key: string; w: number; h: number; alt: string; blur?: string }
  | { kind: 'external'; url: string;  w: number; h: number; alt: string }
```

`photoUrl()` already handles both. MLS photos are hotlinked from the MLS CDN —
they must never be copied into our 1 GB bucket, and now they do not need to be.

### The provider abstraction

```
lib/listings/
├─ types.ts               NormalizedListing, ListingProvider, SyncParams
├─ providers/manual.ts    reads our own tables
└─ index.ts               registry
```

```ts
export interface ListingProvider {
  readonly name: string
  fetch(params: SyncParams): Promise<NormalizedListing[]>
}

export interface SyncParams {
  since?: Date          // incremental: ModificationTimestamp > since
  limit?: number
  cursor?: string
}
```

Every read in the app already goes through this layer and returns
`NormalizedListing`. Nothing downstream knows where a listing came from.

---

## 3. The integration, step by step

### Step 1 — Credentials

Environment:

```
LISTING_SOURCE=stellar          # 'manual' | 'stellar' | 'both'
STELLAR_API_URL=https://api.bridgedataoutput.com/api/v2/OData/<dataset>
STELLAR_ACCESS_TOKEN=...
STELLAR_AGENT_MLS_ID=...        # to distinguish her own listings in the feed
CRON_SECRET=...
```

### Step 2 — `lib/listings/providers/stellar.ts`

RESO Web API is OData. Incremental pull:

```
GET {STELLAR_API_URL}/Property
  ?$filter=ModificationTimestamp gt {since} and StandardStatus ne 'Withdrawn'
  &$expand=Media
  &$top=200
  &$orderby=ModificationTimestamp asc
```

Field mapping, RESO → our schema:

| RESO field | Our column |
|---|---|
| `ListingKey` | `source_id` |
| `ListingId` | `mls_number` |
| `StandardStatus` | `status` (mapped) |
| `ListPrice` | `price` |
| `BedroomsTotal` | `beds` |
| `BathroomsTotalInteger` / `BathroomsFull` + `BathroomsHalf` | `baths`, `half_baths` |
| `LivingArea` | `sqft` |
| `LotSizeAcres` | `lot_size` |
| `YearBuilt` | `year_built` |
| `PropertySubType` | `property_type` (mapped) |
| `NewConstructionYN` | `listing_type = 'new_construction'` |
| `UnparsedAddress` / `StreetNumber` + `StreetName` | `address` |
| `City` | `city_id` (looked up; unknown cities are skipped) |
| `PostalCode` | `zip` |
| `Latitude` / `Longitude` | `lat`, `lng` |
| `PublicRemarks` | `description` |
| `Media[].MediaURL` | `photos[] { kind: 'external' }` |
| `AssociationFee` | `hoa_fee` |
| `GarageSpaces` | `garage_spaces` |
| `PoolPrivateYN` | `pool` |
| `ModificationTimestamp` | `synced_at` |
| everything unmapped | `raw` (pruned) |

Status mapping:

```
Active            → active
Active Under Contract / Pending → pending
Closed            → sold
Coming Soon       → coming_soon
Canceled / Expired / Withdrawn → off_market
```

Slug generation must match the manual path exactly, with a numeric suffix on
collision.

### Step 3 — Sync cron

`app/api/cron/sync-listings/route.ts`, every 30–60 minutes, `CRON_SECRET`
guarded:

1. Read the last successful `synced_at` from `sync_log`
2. Page through the provider incrementally
3. Upsert on `(source, source_id)`, with `is_locked = true`
4. Any feed row that disappears → `status = 'off_market'`. **Never delete.**
5. `revalidatePath()` for every changed slug, plus `/search` and the affected
   city pages
6. Write a `sync_log` row: created, updated, removed, duration, error

Failure handling: a failed sync must not leave partial state. Process in
batches, commit per batch, and record the last successful timestamp per batch so
a retry resumes rather than restarts.

### Step 4 — Admin changes

- `is_locked = true` rows are read-only in the editor, with a banner: "This
  listing comes from Stellar MLS and cannot be edited here."
- The listings table gains a "Source" column and filter
- The dashboard gains a sync-status card: last run, counts, last error
- A manual "Sync now" button in Settings → Maintenance
- Her own MLS listings (matching `STELLAR_AGENT_MLS_ID`) are highlighted so she
  does not create manual duplicates

### Step 5 — Compliance components

Rendered **only** when `source !== 'manual'`:

- `<IdxDisclaimer />` — Stellar MLS attribution, the "Information deemed
  reliable but not guaranteed" text, and the data's last-updated timestamp
- Listing brokerage name on any listing that is not hers
- The Stellar MLS logo where the agreement requires it
- Whatever the signed agreement specifies about crawling, framing and caching —
  read the agreement, do not guess

### Step 6 — Crawler policy split

This is the decision that needs care. Options, in order of preference:

1. **Allow AI bots everywhere except IDX listing detail pages.** Her own
   listings, guides, cities and communities stay fully open. IDX pages get
   `noindex` or a robots rule if the agreement requires it. This preserves the
   client's primary goal.
2. Allow everything, if the agreement permits it. Verify in writing first.
3. Block AI bots on all listing pages. Only if the agreement leaves no choice.

Implement as a per-page decision driven by `source`, not as a blanket rule:

```ts
robots: listing.source === 'manual'
  ? { index: true, follow: true }
  : IDX_ROBOTS_POLICY
```

### Step 7 — Deduplication

Her own listings will appear in both the manual table and the feed. Resolve by
matching on address plus ZIP:

- If a manual listing and a feed listing match, prefer the **manual** row — it
  has her photos, her description and "The Contractor's Take"
- Mark the feed row `status = 'off_market'` internally so it does not render
  twice
- Surface the collision in the admin dashboard so she can decide

### Step 8 — Storage impact

Zero. MLS photos are hotlinked (`kind: 'external'`), never copied. This is why
the union type exists. **Do not** "optimize" MLS photos into our bucket — 5,000
listings of photos is orders of magnitude beyond the 1 GB budget, and caching
MLS media locally usually violates the display agreement anyway.

---

## 4. Faster alternatives, if the client cannot wait

| Option | Cost | Time | Trade-off |
|---|---|---|---|
| Stellar via Bridge (RESO) | Free with the agreement | 2–4 weeks | The correct long-term path |
| SimplyRETS | ~$50–100/mo | Days | Normalized JSON, still requires the broker's MLS authorization |
| Realtyna | ~$50–100/mo | Days | Same; heavier WordPress orientation |

Neither middleware removes the need for broker authorization and an IDX
agreement. They only remove the integration work. Present them as a
convenience purchase, not a shortcut around compliance.

---

## 5. Estimated effort when the feed clears

| Task | Sessions |
|---|---|
| `providers/stellar.ts` and field mapping | 1–2 |
| Sync cron with incremental logic and error handling | 1 |
| Admin: locked rows, source column, sync status | 1 |
| Compliance components and crawler policy | 1 |
| Deduplication and testing against real data | 1 |
| **Total** | **5–6 sessions** |

No schema migration. No changes to search, filters, cards or detail pages. That
is the return on the abstraction built in Phase 1.

---

## 6. What must not be removed

If anyone "cleans up unused code" before the MLS phase, the deferral advantage
is lost. Protected:

- The six MLS columns and the `(source, source_id)` unique constraint
- The `sync_log` table
- The `Photo` union type and both branches of `photoUrl()`
- `lib/listings/` and the `ListingProvider` interface
- `providers/manual.ts` conforming to that interface

The `phase-review` skill checks for their presence.
