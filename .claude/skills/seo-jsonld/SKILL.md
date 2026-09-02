---
name: seo-jsonld
description: Load when adding or changing metadata, structured data, robots rules, the sitemap, llms.txt, canonicals, or OG images in this project. The client's primary goal is being citable by ChatGPT and other AI search — this skill is how that gets delivered correctly on each page.
---

# SEO and JSON-LD

Full reference: `docs/08-seo-ai-visibility.md`. The client's literal request was
"a website that is recognizable by ChatGPT". Every page must carry its share.

## Every page needs

1. `generateMetadata` calling `buildMetadata()` from `lib/seo/metadata.ts`.
   **No page hand-writes a title, description or OG tag.**
2. A canonical URL.
3. JSON-LD of the correct type, built by `lib/seo/jsonld.ts`.
4. `BreadcrumbList` (every page except home), generated from the same source as
   the visible breadcrumb component.
5. Exactly one `h1`, with no skipped heading levels below it.

## Metadata rules

| Field | Rule |
|---|---|
| Title | 60 chars max, including the ` \| The House Boss` template suffix |
| Description | 140–158 chars, written for a human, includes the primary query and the city |
| Canonical | Always absolute, always set |
| OG image | Always present; 1200 x 630 |
| Robots | `index, follow` by default; `noindex, follow` for filtered search and legal pages |

Filtered search canonicals:

- `/search` — canonical to itself
- `/search?city=lake-mary` — canonical to `/lake-mary/homes-for-sale`
- `/search?type=new_construction` — canonical to `/search/new-construction`
- Any other filter combination — `noindex, follow`, canonical to `/search`

## JSON-LD by page type

| Page | Schema |
|---|---|
| Root layout | `RealEstateAgent` (`@id` `#agent`), `WebSite` + `SearchAction` |
| `/about` | `Person` (`@id` `#krisi`) with both `hasCredential` entries |
| `/listing/[slug]` | `RealEstateListing` + a residence type + `Offer` |
| City / community | `Place` + `FAQPage` |
| Article / market update | `Article` or `BlogPosting` |
| Guides | `Article` + `FAQPage` |
| All except home | `BreadcrumbList` |

### The two entries that matter most

```jsonc
"hasCredential": [
  { "@type": "EducationalOccupationalCredential",
    "credentialCategory": "Real Estate License",
    "identifier": "SL3327932",
    "recognizedBy": { "@type": "GovernmentOrganization",
      "name": "Florida Department of Business and Professional Regulation" } },
  { "@type": "EducationalOccupationalCredential",
    "credentialCategory": "Certified Residential Building Contractor License",
    "identifier": "CRC1335654",
    "recognizedBy": { "@type": "GovernmentOrganization",
      "name": "Florida Construction Industry Licensing Board" } }
]
```

This is a machine-readable statement of exactly what makes her different. Never
drop it, never abbreviate it.

### Residence type mapping

| `property_type` | Schema type |
|---|---|
| `single_family` | `SingleFamilyResidence` |
| `condo` | `Apartment` |
| `townhouse` | `House` |
| `land` | `Place` |
| anything else | `Residence` |

### Availability mapping

| `status` | `Offer.availability` |
|---|---|
| `active`, `coming_soon` | `https://schema.org/InStock` |
| `pending` | `https://schema.org/LimitedAvailability` |
| `sold` | `https://schema.org/SoldOut` |
| `off_market` | `https://schema.org/Discontinued` |

## Never emit

- `AggregateRating` — unless every review is first-party, verified, and
  displayed on the page. This is a Google manual-action risk.
- `Review` markup for reviews copied from Google or Zillow without permission.
- `Product` on a listing. Wrong type.
- `FAQPage` for questions that are not visibly on the page. The markup and the
  visible accordion must contain the same text.
- Opening hours she cannot honor.

## robots.txt

Every AI bot gets `Allow: /`:

```
OAI-SearchBot  ChatGPT-User  GPTBot  PerplexityBot  Perplexity-User
ClaudeBot  Claude-User  Claude-SearchBot  Google-Extended
Applebot  Applebot-Extended  Amazonbot  Bingbot  CCBot
```

Disallow: `/admin`, `/api`, `/legal`.

The common publisher advice — allow `OAI-SearchBot`, block `GPTBot` — is the
**wrong** call for this client. She wants to be known, not protected.

## /llms.txt

Generated from the database at `app/llms.txt/route.ts`. Regenerate whenever site
structure changes. Contains: positioning, credentials, service area,
specialties, guides with descriptions, locations, contact.

## Sitemap

Database-driven, `app/sitemap.ts`. Published content only — never a draft.
`lastModified` from `updated_at`. Priorities are in
`docs/08-seo-ai-visibility.md` section 4.

## Content structure for AI extraction

When writing or reviewing page copy:

- [ ] Each section opens with a direct one-sentence answer
- [ ] Headings are question-shaped where natural
- [ ] Specifics: named cities, ZIPs, counties, districts, numbers
- [ ] Every statistic carries an "as of" date
- [ ] First-person expertise, not generic copy
- [ ] Facts in tables and lists, reasoning in prose
- [ ] Descriptive internal-link anchors

## Verify before closing

```bash
# real content in the server-rendered HTML, not injected by JS
curl -s https://<host>/lake-mary | grep -o "<h1[^>]*>[^<]*"

# structured data present
curl -s https://<host>/listing/<slug> | grep -o 'application/ld+json'
```

- [ ] Google Rich Results Test: no errors
- [ ] schema.org validator: no errors
- [ ] Title unique across the site
- [ ] Description unique across the site
- [ ] Canonical correct
- [ ] OG image renders
- [ ] No `noindex` on a page that must be indexed
