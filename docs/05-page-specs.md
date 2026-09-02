# 05 — Page Specifications

Every public route, section by section. A page is not built until every section
here exists, including its empty state.

Layout behavior per breakpoint is in `04-responsive-spec.md`.
JSON-LD per page type is in `08-seo-ai-visibility.md`.

---

## Global chrome

### Header

Logo (left) · Nav (center/right) · "Contact" accent button (right).

Nav structure:

```
Search ▾            → Central Florida Home Search, New Construction, Recently Sold
Lake Mary ▾         → Lake Mary Hub, Homes for Sale, Communities, Lake Mary Blog
Cities ▾            → Longwood, Sanford, Casselberry, Orlando,
                      Altamonte Springs, Winter Springs, Oviedo
Guides ▾            → VA Home-Buyer Guide, Assumable Mortgage Homes,
                      New-Construction Representation, Sell Your Home
Market Updates
About
Reviews
[Contact]
```

### Footer

Four columns above the compliance band.

1. **Brand** — logo lockup, one-line positioning, social icons
   (Google Business Profile, Realtor.com, Zillow, Facebook, Instagram, LinkedIn)
2. **Search** — all cities, new construction, recently sold
3. **Guides** — VA, assumable, new construction, sell, market updates
4. **Contact** — phone (tap-to-call), email, service area, "Book a consultation"

Compliance band below, full width, `--color-ink-950`. Exact content and sizing
rules in `09-compliance-legal.md`. Rendered by `<ComplianceFooter />` and never
duplicated inline.

---

## `/` — Home

**Purpose:** property search first, credibility second, specialties third.
The client asked explicitly that the main page focus on property search.

**Title:** `Lake Mary & Central Florida Homes for Sale | The House Boss`
**Description:** `Lake Mary Realtor specializing in VA buyers, assumable mortgages and new-construction representation. Search homes in Lake Mary, Longwood, Sanford, Casselberry and Orlando.`

| # | Section | Content |
|---|---|---|
| 1 | Hero + search | Full-bleed Lake Mary photography. H1: "Find Your Home in Lake Mary & Central Florida". Sub: the positioning line verbatim. Inline search card: City · Price · Beds · Property type · **New Construction toggle** · Search. |
| 2 | Trust strip | 13 Years Experience · Licensed Realtor SL3327932 · Certified Residential Contractor CRC1335654 · World Properties Group. Four items, icon + label. |
| 3 | Specialty cards | Three cards linking to the three specialty pages: VA Home Buyers, Assumable Mortgages, New-Construction Representation. Each with a one-line hook and "Learn more". |
| 4 | Featured listings | Up to 6 where `is_featured = true`. **Hidden entirely if fewer than 3.** |
| 5 | Search by city | Tiles for the five search cities, each with a photo, name, and live listing count from `listing_facets`. |
| 6 | Meet The House Boss | Portrait, the first three bio paragraphs, the contractor differentiator called out, "Read Krisi's story" → `/about`. |
| 7 | Why a contractor-Realtor | Four short value props drawn from the bio: property condition, repair exposure, remodel potential, new-build oversight. This is the differentiator; do not cut it. |
| 8 | Lake Mary spotlight | Flagship city callout: photo, intro, three stat tiles, link to `/lake-mary`. |
| 9 | Guides teaser | Three most recent guides or articles. |
| 10 | Reviews | Three published reviews, "Read all reviews". Hidden if fewer than 3 published. |
| 11 | Lead CTA band | "Get New Listing Alerts" — email capture → `saved_searches`. Navy band, gold button. |

**Empty-state strategy (launch reality).** At launch there may be 0–5 listings.
- Fewer than 3 featured → hide section 4.
- A city tile with 0 listings still renders, linking to the city guide page and
  showing "Coming soon" instead of a count.
- Primary hero CTA becomes "Get New Listing Alerts" if total published listings
  is under 5. This is a single conditional, driven by a count query.

---

## `/search` — Central Florida Home Search

**Title:** `Central Florida Homes for Sale | Search Lake Mary, Longwood, Sanford, Casselberry & Orlando`

URL-driven state, all optional:

```
/search?city=lake-mary&min=400000&max=700000&beds=3&baths=2
       &type=new_construction&property=single_family&sqftMin=1800
       &yearMin=2015&pool=1&q=granite&sort=price_desc&page=2
```

Parsed by a single zod schema in `lib/validation/search-params.ts`, used by both
the page and the API.

Filters (all sourced from `listing_facets`):

| Filter | Control | Column |
|---|---|---|
| City | Multi-select | `city_id` |
| Price | Min/max inputs + preset ranges | `price` |
| Beds | Segmented 1+ 2+ 3+ 4+ 5+ | `beds` |
| Baths | Segmented 1+ 2+ 3+ | `baths` |
| Property type | Multi-select | `property_type` |
| **New construction** | Prominent toggle | `listing_type = 'new_construction'` |
| VA eligible | Toggle | `listing_type = 'va_eligible'` |
| Assumable | Toggle | `listing_type = 'assumable'` |
| Sqft | Min input | `sqft` |
| Year built | Min input | `year_built` |
| Pool | Toggle | `pool` |
| Keyword | Text | FTS |

Sort: Newest · Price low→high · Price high→low · Beds · Sqft. Default Newest.

Sections: filter bar → active chips → result count → grid → pagination.

**Zero results:** headline "No homes match these filters", three actions —
widen the price range (one tap), clear all filters, or save the search for
email alerts. Below that, "Browse all homes in {city}". Never a bare "0 results".

Canonical: the bare `/search` URL. Any page with filters applied gets
`noindex, follow` **except** single-city and single-type views, which are
canonical to their pretty URLs (`/lake-mary/homes-for-sale`,
`/search/new-construction`).

---

## `/search/new-construction`

The client asked for this specifically, so it gets its own URL rather than a
query string — it is indexable and linkable.

Identical to `/search` but pre-filtered to `listing_type = 'new_construction'`,
with the toggle locked on and a content block above the results explaining why a
buyer needs their own representation at a builder's sales office, linking to
`/new-construction-representation`.

---

## `/listing/[slug]` — Listing detail

**Slug format:** `123-lakeview-dr-lake-mary`
**Title:** `{address}, {city}, FL {zip} | ${price} | The House Boss`

| # | Section |
|---|---|
| 1 | Breadcrumb: Home → {City} Homes for Sale → {address} |
| 2 | Gallery (see `04-responsive-spec.md`) |
| 3 | Price, address, status badge, MLS number if present |
| 4 | Key facts: beds · baths · sqft · lot · year built · property type · garage · HOA |
| 5 | Description (headline + body) |
| 6 | Features list from `features[]`, grouped |
| 7 | "The Contractor's Take" — optional admin field surfaced as a distinct callout. Her construction read on the property. **This is the differentiator on a listing page.** Hidden if empty. |
| 8 | Location: static map, city and community links, nearby context |
| 9 | Contact card: photo, name, both licences, phone, email, showing-request form |
| 10 | Similar listings: same city, ±25% price, limit 3 |
| 11 | Compliance disclaimer block |

**Sold listings:** "SOLD" badge, sold date and price, gallery replaced by a
single 400w image with "Photos archived — this property has sold" once
`photos_purged = true`. Page stays live forever (hard rule 11). A "Looking for
something similar?" block replaces the showing form.

---

## `/sold` — Recently Sold

Grid of sold listings, newest first, filterable by city. Sellers use this as
proof of track record, and it feeds credibility signals for AI answers about
her activity. Not present in the client's original page list — added because
sold pages are kept live and need an index.

---

## `/lake-mary` — Flagship city hub

The client called this out specifically: *"A landing page for the city of Lake
Mary to write blogs and articles about the city."* This is the most important
content page on the site.

**Title:** `Lake Mary, FL Real Estate | Homes, Communities & Neighborhood Guide`

| # | Section |
|---|---|
| 1 | Hero: Lake Mary photography, H1, breadcrumb |
| 2 | Intro: why Lake Mary, written first-person, drawing on "the city I am proud to call home" |
| 3 | Market stats: median price, price/sqft, days on market, inventory. Sourced from `cities.stats_json` with an "as of" date. **Never show a stale stat without its date.** |
| 4 | Homes for sale strip → `/lake-mary/homes-for-sale` |
| 5 | Communities grid → `/lake-mary/communities` |
| 6 | Living in Lake Mary: schools, commute, parks, dining, events |
| 7 | FAQ accordion from `cities.faq_json`, also emitted as `FAQPage` JSON-LD |
| 8 | Latest Lake Mary articles → `/lake-mary/blog` |
| 9 | Lead CTA: "Thinking about Lake Mary? Talk to someone who lives here." |

## `/lake-mary/homes-for-sale`

Canonical destination for the highest-value query on the site. Pre-filtered
search plus a content block above the grid (200–300 words on the Lake Mary
market) and an FAQ below. The content is what makes this page rank; the grid
alone will not.

## `/lake-mary/communities` and `/communities/[slug]`

Index of communities where `city_id = lake-mary`. Each community page:
hero, intro, HOA info, amenities, price range, homes for sale in that community,
FAQ, nearby communities.

Seeded: Heathrow. The client adds the rest through the admin dashboard.

## `/[city]` and `/[city]/homes-for-sale`

Same structure as the Lake Mary hub, one level lighter — no blog sub-route, no
communities index unless that city has communities. Covers Longwood, Sanford,
Casselberry, Orlando, Altamonte Springs, Winter Springs, Oviedo.

`generateStaticParams` must exclude `lake-mary`.

---

## `/guides/va-home-buyer` — VA Home-Buyer Guide

**Title:** `VA Home Loan Guide for Central Florida Buyers | The House Boss`

Long-form, 1,800–2,500 words. Sticky TOC.

Sections: who qualifies · entitlement and the Certificate of Eligibility ·
zero down payment · the VA funding fee · VA appraisal and Minimum Property
Requirements (**her contractor licence is the hook here — she can read MPR risk
before an offer**) · condo approval lists · sellers and VA offers · using the
benefit more than once · Central Florida specifics · step-by-step process ·
FAQ · CTA.

Lead form after section 3 and at the end, `lead_type = 'va'`.

**Compliance:** she is not a lender and not the VA. Include a clear notice:
"This guide is general information, not lending advice. Loan terms and
eligibility are determined by your lender and the U.S. Department of Veterans
Affairs." Do not state rates or promise approval.

## `/assumable-mortgage-homes`

**Title:** `Assumable Mortgage Homes in Central Florida | The House Boss`

Sections: what an assumable mortgage is · which loans are assumable (VA, FHA,
USDA) · why it matters when rates are high · the equity gap and how buyers
cover it · VA entitlement substitution · realistic timelines and servicer
friction · how to find assumable listings · current assumable listings from the
database (`listing_type = 'assumable'`) · FAQ · CTA.

Empty state: if there are no assumable listings, show an alert-signup instead of
an empty grid.

## `/new-construction-representation`

**Title:** `New Construction Buyer Representation in Central Florida | The House Boss`

The strongest page for her contractor licence.

Sections: the builder's sales agent works for the builder · what independent
representation changes · registering her **before** your first site visit (the
single most important practical point — put it in a callout box near the top) ·
reading a builder contract · lot premiums, upgrades, and what actually holds
value · construction-phase walkthroughs she can perform as a licensed contractor
· warranty and the one-year walkthrough · Central Florida builders and
communities · current new-construction listings · FAQ · CTA.

## `/sell-your-central-florida-home`

Sections: what your home is worth (valuation request form) · the contractor
advantage in pre-listing prep — which repairs return money and which do not ·
pricing strategy · preparation and staging · marketing plan · the process
timeline · recently sold by The House Boss (from `/sold`) · seller FAQ · CTA
with `lead_type = 'seller'`.

---

## `/market-updates` and `/market-updates/[slug]`

Index of `articles` where `kind = 'market_update'`, newest first, filterable by
city. Each update: hero stat tiles, commentary, city breakdown, what it means
for buyers and sellers, subscribe CTA.

Cadence recommendation for the client: monthly. Set expectations — an
abandoned market-updates section dated eight months ago damages credibility more
than not having one. If she cannot commit to monthly, ship it quarterly and
label it quarterly.

---

## `/about` — About Krisi Kakarova

Uses the client's bio in full, broken into subheadings rather than a wall:

1. Meet The House Boss (opening two paragraphs)
2. More than a Realtor — the construction background
3. Why Lake Mary
4. How I work — relationships, organization, communication
5. Trust and personalized service
6. Services: real estate representation · construction consulting · residential
   remodeling · new-construction guidance

Plus: credentials card (both licence numbers, brokerage, 13 years), service
area, profile links (Google Business Profile, Realtor.com, Zillow, social), and
a contact CTA.

`Person` + `RealEstateAgent` JSON-LD lives here with the fullest detail on the
site.

## `/reviews`

Published reviews from the `reviews` table, with source attribution and a link
to the original where one exists. Filter by source.

**Do not emit `AggregateRating` JSON-LD** unless every review is first-party,
verifiable and displayed. Fabricated or aggregated review markup is a
Google manual-action risk and a fraud risk. See `09-compliance-legal.md`.

## `/contact`

Contact methods first: tap-to-call, tap-to-email, service area, response-time
expectation. Then the form: name, email, phone, "I'm interested in"
(buying / selling / new construction / VA / assumable / remodel), message.
Then a map and the brokerage address.

Form posts to `/api/leads`, honeypot + rate limit, Resend notification to Krisi
and an autoresponder to the sender.

## Legal pages

`/legal/privacy`, `/legal/terms`, `/legal/accessibility`. All `noindex, follow`.
The accessibility statement is genuine — it names WCAG 2.1 AA as the target and
gives a contact route for accessibility problems. It is also legal cover.

---

## Shared components across pages

| Component | Used on |
|---|---|
| `<SearchBar />` | Home hero, header (compact), city pages |
| `<PropertyCard />` | Everywhere listings appear |
| `<LeadForm variant />` | Home, guides, listing, contact, sell |
| `<FaqAccordion />` | Cities, communities, guides — also emits `FAQPage` |
| `<StatTiles />` | Cities, market updates, listing key facts |
| `<AgentCard />` | Listing sidebar, guides, about |
| `<CityTiles />` | Home, search empty state, footer area |
| `<ComplianceFooter />` | Every public page |
| `<Breadcrumbs />` | Every page except home — also emits `BreadcrumbList` |
| `<EmptyState />` | Search, sold, communities, market updates |
