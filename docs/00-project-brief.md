# 00 — Project Brief

## Client

**Krisi Kakarova** — Realtor and Certified Residential Building Contractor,
Central Florida. 13 years of experience.

| Field | Value |
|---|---|
| Brand | The House Boss |
| Full brand lockup | The House Boss — Powered by World Properties Group |
| Brokerage | World Properties Group |
| Real-estate licence | SL3327932 |
| Contractor licence | CRC1335654 |
| Domain | thehousebossfl.com (Porkbun) |
| Home market | Lake Mary, Seminole County, FL |
| Service area | Central Florida — Seminole and Orange counties |

## What makes this client different

She is not only a Realtor. She is a licensed residential building contractor.
That is the entire differentiator and it must be visible on every important
page. It supports four claims a normal agent cannot make:

1. She can read a property's true condition and repair exposure.
2. She can advise on remodel feasibility and cost before an offer is written.
3. She can represent a buyer against a builder's own sales agent in new
   construction, where the builder's rep works for the builder.
4. She can advise sellers on which pre-listing work actually returns money.

## Positioning

Primary line, used verbatim in the home hero, the site-wide meta description
and the `Person` JSON-LD `description`:

> Lake Mary Realtor specializing in VA buyers, assumable mortgages and
> new-construction representation.

Supporting line, for the About page and social profiles:

> Realtor and Certified Residential Building Contractor. I help Central Florida
> buyers and sellers look past the surface.

## Business goals, in priority order

1. **Be citable by AI search.** The client's literal request was "a website that
   is recognizable by ChatGPT". This drives the whole content and markup
   strategy — see `08-seo-ai-visibility.md`.
2. **Generate qualified leads** through property search and guide pages.
3. **Establish topical authority for Lake Mary**, so that queries such as
   "best realtor in Lake Mary" or "VA loan realtor Central Florida" surface her.
4. **Support the three specialties** — VA buyers, assumable mortgages,
   new-construction representation — with dedicated, deep pages.

### The realistic mechanism behind goal 1

Individual listing pages are not what makes an assistant recommend an agent.
Assistants answer questions like *"who is a good realtor in Lake Mary for a VA
buyer"* from **authority content**: guides, city knowledge, credentials,
consistent named entity data, and corroborating profiles elsewhere on the web.

Therefore the content plan weights **guides and city/community pages** heavily,
and treats listings as proof-of-activity rather than as the primary AI surface.
Set this expectation with the client explicitly.

## Audiences

| Audience | What they need | Entry point |
|---|---|---|
| VA-eligible buyers (Central FL has a large veteran population) | Clear explanation of VA entitlement, zero-down, funding fee, and which local homes qualify | `/guides/va-home-buyer` |
| Rate-sensitive buyers | What an assumable mortgage is, who qualifies, how the process actually runs | `/assumable-mortgage-homes` |
| New-construction buyers | Why to bring their own representation to a builder's sales office | `/new-construction-representation` |
| Relocation buyers researching Lake Mary | Schools, commute, neighborhoods, price bands, what living there is like | `/lake-mary` hub |
| Sellers | Pre-listing prep, what work pays back, the process | `/sell-your-central-florida-home` |
| Renovation and build clients | Construction consulting services | `/about`, service section |

## Scope of this build

**In scope**

- Public marketing site, 12 primary pages plus city and community pages
- Property search with URL-driven filters and a dedicated new-construction mode
- Listing detail pages
- Custom admin dashboard: listings CRUD, article publishing, cities and
  communities content, leads inbox, media management
- Image upload pipeline with automatic resizing and storage budgeting
- Full SEO and AI-visibility layer
- Florida real-estate advertising compliance
- WCAG 2.1 AA accessibility

**Out of scope for v1**

- Stellar MLS / IDX integration — deferred, architecture kept open
- Map-based drawing search — filters and a simple pin map only
- User accounts for the public — saved searches are email-only, no login
- Mortgage calculator integrations with live rate feeds
- Multi-agent / team support — single agent, single admin
- Spanish translation (worth proposing as phase 2 of the engagement)

## Running costs the client must approve

| Item | Cost | Notes |
|---|---|---|
| Vercel Pro | $20/mo | Hobby tier forbids commercial use. Not optional. |
| Supabase | $0 | Free tier; upgrade trigger documented in `12-env-deployment.md` |
| Resend | $0 | Free to 3,000 emails/mo |
| Domain | ~$12/yr | Already purchased at Porkbun |
| **Total** | **~$20/mo** | |

## Success criteria at launch

- Lighthouse: Performance ≥ 90 mobile, Accessibility ≥ 95, SEO 100
- Zero axe-core critical or serious violations
- Every page validates in Google Rich Results Test
- Sitemap accepted by Google Search Console and Bing Webmaster Tools
- `/llms.txt` present and accurate
- All five search cities return results or a designed empty state
- Compliance footer verified against FREC advertising rules
- Site renders correctly at 360 px through 1440 px with no horizontal scroll
