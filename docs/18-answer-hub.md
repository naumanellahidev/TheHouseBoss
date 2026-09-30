# 18 — The Answer Hub

Decisions for `/answers`, written before the code (CLAUDE.md § 6). Source brief:
`CLAUDE-TASK-answer-hub.md`. Data: `answers-source.json` in the repo root.

---

## 1. What it is

62 question-targeted pages, each answering one question a Central Florida buyer,
seller or homeowner actually asks. The differentiator is the same one the whole
site rests on: Krisi holds a Florida real-estate licence **and** a Certified
Residential Building Contractor licence, so an answer can price the transaction
and the construction in the same breath. Every page has to read that way or it
is generic agent content and does net harm.

## 2. Routes

```
/answers                            hub: 9 categories, every question
/answers/[category]                 category index
/answers/[category]/[slug]          the answer
```

Statically generated with `generateStaticParams`, `revalidate = 3600` like the
rest of the marketing site. No `force-dynamic`: nothing here is per-request.

Slugs come from `answers-source.json` and are final. A page that must move gets
a 308 in `next.config.ts`, never a 404 (HR11).

## 3. Content model

The JSON holds the question, slug, category, the cities and services it links
to, three sibling answers and a ~120-word `draftBody`. The draft is raw
material, not copy: written in a forum register, too short to publish.

The published copy lives in `lib/content/answers/<category>.ts` as structured
sections, so it is typed, greppable and reviewable in a diff — not MDX, because
nothing here needs components inside the prose, and not the database, because
this is site copy rather than something the client edits per row.

Rules applied to every page:

- 400–700 words. Nothing thinner ships.
- A **short answer** in the first 100 words that answers the question outright.
  This is what a featured snippet and an AI search engine quote.
- Keeps the draft's specifics — the numbers, materials, sequence and failure
  modes. Cuts the forum framing and the trailing "I'm a realtor and…" line,
  which the author block carries instead.
- **No invented facts.** Where a figure would be needed and is not in the
  client's own draft, the page says what to ask for instead of inventing it. A
  wrong permit fee on a contractor's site is a liability.

## 4. Structured data

Two blocks per page from `lib/seo/jsonld.ts`, never hand-written per page:

- `QAPage` with one `Question` and one `acceptedAnswer`. The answer's `author`
  is `{ "@id": PERSON_ID }` — the existing `Person` entity — so Google joins
  the author to the business rather than meeting a second, unlinked entity.
  `FAQPage` stays reserved for pages where several Q&As share one page, which
  is `/hire-contractor`.
- `BreadcrumbList`, matching the visible breadcrumbs.

## 5. Internal linking

The hub is worth little if the pages are orphans, so links run both ways.

- **Out of each answer:** its city page(s), its service page, and three sibling
  answers, in prose where it reads naturally, with varied anchor text.
- **Into each answer:** the city pages carry a block of questions from that
  city, `/hire-contractor` links the construction answers and its FAQ rows link
  to the full pages, and the buyer guides link the financing and inspection
  answers. `/answers` is in the header nav and the footer.
- `scripts/check-internal-links.mjs` crawls the built site and fails on an
  orphan answer page, a broken internal link, or an anchor text reused more
  than five times.

## 6. Sitemap and robots

Hub, the nine categories and every answer are in `app/sitemap.ts`, with
`lastModified` from the content module. `robots.ts` already allows everything
outside `/admin`, `/api`, `/legal` and `/dev`.
