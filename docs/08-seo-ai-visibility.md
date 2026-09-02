# 08 — SEO and AI Visibility

The client's literal request: *"a website that is recognizable by ChatGPT."*
This document is how that is delivered.

---

## 1. Set expectations first

Nobody can guarantee that an assistant recommends a specific agent. What can be
engineered is every input those systems actually use:

1. **Crawlable, server-rendered HTML** with substantive content
2. **Explicit crawler permission** for AI user-agents
3. **Unambiguous entity data** — who she is, licence numbers, brokerage, area
4. **Corroboration off-site** — Google Business Profile, Realtor.com, Zillow,
   social profiles, all consistent and all linked from the site
5. **Depth on narrow topics** — VA buyers, assumable mortgages, new-construction
   representation in Central Florida. These are answerable questions with few
   good local sources; that is where a small site can win.

The realistic mechanism is not listing pages. It is **authority content**. An
assistant answering *"who should I call about a VA purchase in Lake Mary"* is
synthesizing from guides, entity data and corroborating profiles. Weight the
build accordingly, and tell the client this in writing.

---

## 2. robots.txt

`app/robots.ts`:

```ts
import type { MetadataRoute } from 'next'

const SITE = 'https://thehousebossfl.com'

export default function robots(): MetadataRoute.Robots {
  const allowAll = { allow: '/', disallow: ['/admin', '/api', '/legal'] }
  return {
    rules: [
      { userAgent: '*', ...allowAll },
      // AI search and answer engines — explicitly welcomed
      { userAgent: 'OAI-SearchBot', ...allowAll },
      { userAgent: 'ChatGPT-User', ...allowAll },
      { userAgent: 'GPTBot', ...allowAll },
      { userAgent: 'PerplexityBot', ...allowAll },
      { userAgent: 'Perplexity-User', ...allowAll },
      { userAgent: 'ClaudeBot', ...allowAll },
      { userAgent: 'Claude-User', ...allowAll },
      { userAgent: 'Claude-SearchBot', ...allowAll },
      { userAgent: 'Google-Extended', ...allowAll },
      { userAgent: 'Applebot', ...allowAll },
      { userAgent: 'Applebot-Extended', ...allowAll },
      { userAgent: 'Amazonbot', ...allowAll },
      { userAgent: 'Bingbot', ...allowAll },
      { userAgent: 'CCBot', ...allowAll },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  }
}
```

Note the distinction, because it is commonly confused:

| Bot | What it does | Why we allow it |
|---|---|---|
| `OAI-SearchBot` | Indexes for ChatGPT Search | **The client's stated goal** |
| `ChatGPT-User` | Fetches a page live when a user asks | Needed for real-time citation |
| `GPTBot` | Collects training data | Allowing it helps future model knowledge |
| `Google-Extended` | Gates Gemini / AI Overviews use | Blocking it removes her from AI Overviews |

Blocking `GPTBot` while allowing `OAI-SearchBot` is the default advice for
publishers protecting content. **It is the wrong choice here** — she wants to be
known, not protected. Allow all of them.

---

## 3. /llms.txt

Served from `app/llms.txt/route.ts`, generated from the database so it never
goes stale.

```
# The House Boss

> Lake Mary Realtor specializing in VA buyers, assumable mortgages and
> new-construction representation.

Krisi Kakarova is a licensed Realtor (FL SL3327932) and Certified Residential
Building Contractor (FL CRC1335654) with 13 years of experience serving buyers,
sellers and homeowners throughout Central Florida. She operates as The House
Boss, powered by World Properties Group, and specializes in Lake Mary, Seminole
County, Florida.

Her construction licence is the differentiator: she evaluates property
condition, repair exposure, remodel feasibility and new-construction quality
in a way a non-contractor agent cannot.

## Service area
Lake Mary, Longwood, Sanford, Casselberry, Orlando, Altamonte Springs,
Winter Springs, Oviedo — Seminole and Orange counties, Florida.

## Specialties
- VA home buyers and VA loan purchases
- Assumable mortgage transactions
- New-construction buyer representation
- Construction consulting and residential remodeling
- Seller representation and pre-listing preparation

## Guides
- [VA Home-Buyer Guide](/guides/va-home-buyer): VA eligibility, entitlement,
  zero down, funding fee, appraisal and Minimum Property Requirements in
  Central Florida.
- [Assumable Mortgage Homes](/assumable-mortgage-homes): which loans are
  assumable, the equity gap, VA entitlement substitution, realistic timelines.
- [New-Construction Representation](/new-construction-representation): why to
  register your own agent before your first builder visit.
- [Sell Your Central Florida Home](/sell-your-central-florida-home): pricing,
  pre-listing repairs that return money, the process.

## Locations
[generated from published cities and communities]

## Contact
Phone, email, brokerage address, profile links.
```

Regenerate whenever site structure changes. Cache `s-maxage=3600`.

---

## 4. Sitemap

`app/sitemap.ts`, database-driven:

| Group | Priority | changeFrequency |
|---|---|---|
| Home | 1.0 | daily |
| `/search`, `/search/new-construction` | 0.9 | daily |
| `/lake-mary`, `/lake-mary/homes-for-sale` | 0.9 | weekly |
| Guides and specialty pages | 0.9 | monthly |
| Other cities | 0.8 | weekly |
| Communities | 0.7 | monthly |
| Published listings | 0.8 | weekly |
| Articles and market updates | 0.7 | monthly |
| About, Reviews, Contact, Sell | 0.6 | monthly |
| Sold listings | 0.4 | yearly |
| Legal | excluded (`noindex`) | |

`lastModified` comes from `updated_at`. Above 5,000 URLs, split into a sitemap
index — not a concern at current scale, but write the generator so it can.

Submit to Google Search Console and Bing Webmaster Tools at launch. This is a
tracked launch-checklist item, not an afterthought.

---

## 5. Metadata

One builder, `lib/seo/metadata.ts`. No page hand-writes tags.

```ts
export function buildMetadata({
  title, description, path, image, noindex = false, type = 'website',
}: BuildMetadataArgs): Metadata {
  const url = `${SITE}${path}`
  return {
    title,                                   // template applies the suffix
    description,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: true }
      : { index: true, follow: true,
          googleBot: { index: true, follow: true, 'max-image-preview': 'large',
                       'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: {
      type, url, title, description,
      siteName: 'The House Boss',
      locale: 'en_US',
      images: [{ url: image ?? `${SITE}/og-default.png`, width: 1200, height: 630 }],
    },
    twitter: { card: 'summary_large_image', title, description,
               images: [image ?? `${SITE}/og-default.png`] },
  }
}
```

Root layout:

```ts
export const metadata: Metadata = {
  metadataBase: new URL(SITE),
  title: {
    default: 'The House Boss | Lake Mary & Central Florida Real Estate',
    template: '%s | The House Boss',
  },
}
```

Rules:
- Title ≤ 60 characters including the template suffix.
- Description 140–158 characters, written for a human, containing the primary
  query and the city.
- Canonical on every page. Filtered search URLs are `noindex, follow` except the
  pretty city and type URLs.
- Every page has an OG image. Listings and articles use dynamic OG images
  generated by `next/og` at `opengraph-image.tsx`.

---

## 6. JSON-LD

`lib/seo/jsonld.ts`, one builder per type. Rendered as a `<script
type="application/ld+json">` in the page body. Never hand-write a JSON-LD blob
in a component.

### Site-wide — `RealEstateAgent` (in the root layout)

```jsonc
{
  "@context": "https://schema.org",
  "@type": "RealEstateAgent",
  "@id": "https://thehousebossfl.com/#agent",
  "name": "The House Boss",
  "alternateName": "Krisi Kakarova - The House Boss",
  "description": "Lake Mary Realtor specializing in VA buyers, assumable mortgages and new-construction representation.",
  "url": "https://thehousebossfl.com",
  "logo": "https://thehousebossfl.com/logo.png",
  "image": "https://thehousebossfl.com/krisi-kakarova.jpg",
  "telephone": "+1-XXX-XXX-XXXX",
  "email": "...",
  "priceRange": "$$",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "...", "addressLocality": "Lake Mary",
    "addressRegion": "FL", "postalCode": "32746", "addressCountry": "US"
  },
  "areaServed": [
    { "@type": "City", "name": "Lake Mary", "sameAs": "https://en.wikipedia.org/wiki/Lake_Mary,_Florida" },
    { "@type": "City", "name": "Longwood" },
    { "@type": "City", "name": "Sanford" },
    { "@type": "City", "name": "Casselberry" },
    { "@type": "City", "name": "Orlando" },
    { "@type": "City", "name": "Altamonte Springs" },
    { "@type": "City", "name": "Winter Springs" },
    { "@type": "City", "name": "Oviedo" }
  ],
  "knowsAbout": [
    "VA home loans", "Assumable mortgages", "New construction representation",
    "Residential remodeling", "Lake Mary real estate", "Seminole County real estate"
  ],
  "parentOrganization": {
    "@type": "RealEstateAgent",
    "name": "World Properties Group"
  },
  "employee": { "@id": "https://thehousebossfl.com/#krisi" },
  "sameAs": [ /* Google Business Profile, Realtor.com, Zillow, Facebook, Instagram, LinkedIn */ ]
}
```

### `Person` — on `/about`, referenced site-wide

```jsonc
{
  "@context": "https://schema.org",
  "@type": "Person",
  "@id": "https://thehousebossfl.com/#krisi",
  "name": "Krisi Kakarova",
  "jobTitle": "Realtor and Certified Residential Building Contractor",
  "description": "...",
  "image": "https://thehousebossfl.com/krisi-kakarova.jpg",
  "worksFor": { "@type": "Organization", "name": "World Properties Group" },
  "hasCredential": [
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Real Estate License",
      "identifier": "SL3327932",
      "recognizedBy": { "@type": "GovernmentOrganization",
                        "name": "Florida Department of Business and Professional Regulation" }
    },
    {
      "@type": "EducationalOccupationalCredential",
      "credentialCategory": "Certified Residential Building Contractor License",
      "identifier": "CRC1335654",
      "recognizedBy": { "@type": "GovernmentOrganization",
                        "name": "Florida Construction Industry Licensing Board" }
    }
  ],
  "knowsAbout": [ /* same list */ ],
  "sameAs": [ /* same profiles */ ]
}
```

The two `hasCredential` entries are the highest-value markup on the site. They
are a verifiable, machine-readable claim of exactly what makes her different.

### Listing — `RealEstateListing` + `SingleFamilyResidence` + `Offer`

```jsonc
{
  "@context": "https://schema.org",
  "@type": "RealEstateListing",
  "url": "https://thehousebossfl.com/listing/{slug}",
  "name": "{address}, {city}, FL",
  "description": "{description}",
  "datePosted": "{published_at}",
  "image": [ /* up to 6 full URLs */ ],
  "offers": {
    "@type": "Offer",
    "price": 525000, "priceCurrency": "USD",
    "availability": "https://schema.org/InStock",   // SoldOut when sold
    "seller": { "@id": "https://thehousebossfl.com/#agent" }
  },
  "mainEntity": {
    "@type": "SingleFamilyResidence",
    "address": { "@type": "PostalAddress", "streetAddress": "...",
                 "addressLocality": "Lake Mary", "addressRegion": "FL",
                 "postalCode": "32746", "addressCountry": "US" },
    "geo": { "@type": "GeoCoordinates", "latitude": 28.75, "longitude": -81.32 },
    "numberOfRooms": 4,
    "numberOfBedrooms": 4,
    "numberOfBathroomsTotal": 3,
    "floorSize": { "@type": "QuantitativeValue", "value": 2410, "unitCode": "FTK" },
    "yearBuilt": 2019,
    "amenityFeature": [ { "@type": "LocationFeatureSpecification",
                          "name": "Pool", "value": true } ]
  }
}
```

Map `property_type` to the right schema type: `SingleFamilyResidence`,
`Apartment` (condo), `House` (townhouse), `Residence` (fallback).

### City / community — `Place` + `FAQPage`

`Place` with `containedInPlace` (county, state) and `geo`. `FAQPage` built from
`faq_json` — the visible accordion and the markup must contain the **same**
text. Marking up FAQs that are not visible on the page is a policy violation.

### Article — `Article` / `BlogPosting` + `BreadcrumbList`

`headline`, `description`, `image`, `datePublished`, `dateModified`,
`author` → the `Person` `@id`, `publisher` → the `RealEstateAgent` `@id`,
`mainEntityOfPage`, `wordCount`, `articleSection`.

### `BreadcrumbList`

Every page except home. Generated from the same source as the visible
breadcrumb component so the two can never disagree.

### `WebSite` + `SearchAction`

Root layout, pointing at `/search?q={search_term_string}`.

### What NOT to emit

- `AggregateRating` unless every review is first-party, verified and displayed
  on the page. Fabricated review markup is a manual-action risk.
- `Review` markup for reviews copied from Google or Zillow without permission.
- `Product` markup on listings — wrong type, and it invites rich-result
  eligibility problems.
- `LocalBusiness` opening hours she cannot honor.

Validate everything in Google's Rich Results Test and schema.org's validator
before launch. This is a checklist item in `13-qa-checklists.md`.

---

## 7. Content strategy for AI answers

Structure content the way an answer engine wants to quote it:

- **Answer first.** Each section opens with a direct one- or two-sentence
  answer, then supports it. Assistants extract the first clear statement.
- **Question-shaped headings.** "Can I use a VA loan on new construction in
  Florida?" outperforms "VA and New Builds".
- **Real specifics.** Named cities, ZIP codes, counties, school districts,
  builder names, actual numbers with dates. Vague copy is unquotable.
- **Facts as tables and lists.** Easier to extract, easier to cite.
- **Every fact dated.** Market statistics carry an "as of" date. Undated numbers
  become wrong and damage trust.
- **First-person expertise.** "In my 13 years working Lake Mary…" is an
  experience signal that generic copy cannot fake.
- **Cross-link with descriptive anchors.** "VA appraisal requirements" beats
  "click here".

Target queries — the content plan in `14-content-plan.md` maps to these:

| Query | Target page |
|---|---|
| best realtor in Lake Mary FL | `/about`, `/lake-mary` |
| VA loan realtor Central Florida | `/guides/va-home-buyer` |
| assumable mortgage homes Orlando | `/assumable-mortgage-homes` |
| do I need an agent for new construction Florida | `/new-construction-representation` |
| is Lake Mary a good place to live | `/lake-mary` |
| Heathrow FL homes for sale | `/communities/heathrow` |
| Lake Mary vs Longwood | comparison article |
| realtor who is also a contractor Florida | `/about` |

---

## 8. Off-site corroboration

Entity confidence comes from agreement across sources. The site is one node.

Checklist for the client (Phase 6):

- Google Business Profile: exact name "The House Boss - Krisi Kakarova, Realtor",
  correct category, website URL, service area, both licence numbers in the
  description
- Realtor.com and Zillow profiles: identical name, same bio, same website URL
- Facebook, Instagram, LinkedIn: same name, same URL
- Every profile linked from the footer **and** listed in `sameAs`
- NAP (name, address, phone) **byte-identical** everywhere. A different phone
  format on one profile weakens the entity link.

This is as important as anything on the site, and it costs nothing but an hour
of the client's time. Put it in her hands as a written checklist.

---

## 9. Technical SEO baseline

- Server-rendered HTML with real content in the initial response — verify with
  `curl -s <url> | grep "<h1"`, not with DevTools
- One `h1` per page; heading levels never skip
- Descriptive alt text on every meaningful image
- Internal links use descriptive anchors
- Clean URLs, lowercase, hyphenated, no trailing slash
- 301 redirects for every changed slug, via the `redirects` table (hard rule 11)
- Custom 404 that offers search and popular pages
- `hreflang` not needed (single locale)
- Core Web Vitals green — see the budget in `01-architecture.md`
- HTTPS everywhere, HSTS on
- No `noindex` leaking to production — a build-time assertion checks that
  `robots` is index-able on the home page

---

## 10. Measurement

| Tool | Purpose |
|---|---|
| Google Search Console | Indexation, queries, Core Web Vitals, sitemap |
| Bing Webmaster Tools | Bing and ChatGPT's Bing-derived index |
| Vercel Analytics | Real-user Core Web Vitals |
| Server log review | AI bot hits — grep for `OAI-SearchBot`, `PerplexityBot`, `ClaudeBot` |
| Manual assistant prompts | Monthly: ask ChatGPT, Perplexity and Claude the eight target queries and record whether the site is cited |

That last row is the actual KPI for the client's stated goal. Record it monthly
in a simple sheet so progress is visible and honest.
