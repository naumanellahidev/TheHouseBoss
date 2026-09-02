# 17 — Launch Operations

Analytics, monitoring, the measured performance record, and what happens in the
90 days after launch. Covers roadmap Phase 7 tasks 5, 14, 16 and 18.

---

## 1. Analytics — decision

**Vercel Web Analytics + Vercel Speed Insights. Not Google Analytics 4.**

| | Vercel Web Analytics | GA4 |
|---|---|---|
| Cookies | none | `_ga`, `_ga_*` |
| Consent banner required | no | yes, in practice |
| Privacy policy impact | one sentence | a section, plus a DPA |
| Page weight | ~1 kB, deferred | ~50 kB, plus a tag manager if used |
| Data | pageviews, referrers, countries, devices | everything, at the cost above |
| Cost | included with Vercel Pro | free |

The deciding factor is not the page weight, it is the consent banner.

A cookie banner on a real-estate site costs conversions on the exact interaction
this whole project is built around — a stranger arriving from an AI assistant,
deciding within a few seconds whether this person is worth contacting. Trading
that for demographic breakdowns the client will not act on is a bad trade.
Cookieless analytics needs no banner under the Florida Digital Bill of Rights,
CCPA or GDPR, because it sets no identifiers.

**Speed Insights** is the more important half. It reports Core Web Vitals from
real visitors on real phones on real networks, which is the number Google
actually ranks on — see § 3, where the difference between lab and field is the
entire point.

Both are mounted only when `VERCEL_ENV === "production"`. Their scripts are
served by Vercel's own edge at `/_vercel/*`, so anywhere else they 404 and log a
console error — measured as a Best Practices drop from 100 to 96. Gating them
also keeps preview deployments out of the client's numbers.

If the client later wants GA4 — an agency asks for it, or she runs paid ads —
that is a real reason and the answer is yes, with a consent banner added at the
same time. It is not a reason today.

**Not installed, deliberately:** Google Tag Manager (a way to add scripts
without review, on a site whose whole advantage is being fast and clean), Meta
Pixel, and any session recorder such as Hotjar (a recording of a form containing
someone's name, phone number and budget is a data-protection liability with no
matching benefit).

### Search consoles

Not analytics, but the same job, and both are free and mandatory:

- **Google Search Console** — verify by DNS TXT at Porkbun, submit
  `/sitemap.xml`. This is where indexation problems become visible.
- **Bing Webmaster Tools** — import the GSC verification. Bing matters more than
  its market share suggests: **it is the index behind ChatGPT search**, which is
  the primary discovery channel this project targets.

---

## 2. Error monitoring and uptime

### What is already in place

| Signal | Where | Covers |
|---|---|---|
| Build failures | Vercel, email on failed deploy | broken deploys |
| Runtime errors | Vercel Runtime Logs | server component and route handler throws |
| Cron outcomes | `sync_log` table, visible in the admin dashboard | the nightly purge and orphan jobs |
| Lead delivery | Resend dashboard, per-message status | the one flow whose failure costs money |
| Client-visible errors | `app/error.tsx`, `app/not-found.tsx` | a caught error still renders a usable page |

### What to add at launch

**Uptime — UptimeRobot free tier.** Five-minute checks on four URLs, alerting to
the developer's email, not the client's:

```
https://thehousebossfl.com/                      keyword: "The House Boss"
https://thehousebossfl.com/search                keyword: "Search"
https://thehousebossfl.com/listing/<a live one>  keyword: the address
https://thehousebossfl.com/api/health            expects 200
```

Keyword checks rather than plain status checks, because the failure mode that
actually matters here is not the site being down — Vercel rarely is — it is
**Supabase being unreachable while Vercel serves a 200 with an empty page**. A
status check sees that as healthy. A keyword check does not.

**Error tracking — Sentry, only if the free tier stays free.** Vercel's runtime
logs are enough for a site this size, and they have a real advantage: no extra
client-side JavaScript. Revisit if a bug is ever reported that the logs cannot
explain. Do not add it pre-emptively.

**The pause cliff.** Supabase pauses a free project after **7 days with no
activity**. A live site with visitors never reaches this — but a project that
launches quietly, before traffic arrives, can. The uptime monitor's five-minute
polling incidentally prevents it, which is a second reason to configure it
*before* launch rather than after.

---

## 3. Measured performance — the record

Run `npm run check:lighthouse` to reproduce. All five public page types, both
form factors, thresholds taken from the Phase 7 Definition of Done.

**Measured 2026-09-03, production build, localhost, Chromium 1234.**

| | Perf | A11y | Best Practices | SEO |
|---|---|---|---|---|
| **Desktop** — home | 99–100 | 100 | 100 | 100 |
| **Desktop** — search | 98–99 | 100 | 100 | 100 |
| **Desktop** — listing | 93–99 | 100 | 100 | 100 |
| **Desktop** — city | 97–98 | 100 | 100 | 100 |
| **Desktop** — guide | 98–100 | 100 | 100 | 100 |
| **Mobile** — home | 70–77 | 100 | 100 | 100 |
| **Mobile** — search | 60–75 | 100 | 100 | 100 |
| **Mobile** — listing | 68–72 | 100 | 100 | 100 |
| **Mobile** — city | 65–79 | 100 | 100 | 100 |
| **Mobile** — guide | 69–72 | 100 | 100 | 100 |

Ranges, not single figures, because they are ranges: three full passes were run
and mobile search moved 15 points between them with no code change. That spread
is itself part of the evidence below.

**Accessibility, Best Practices and SEO are 100 on every page type in both form
factors.** Those three are deterministic, so `check:lighthouse` exits non-zero if
any of them regresses. Performance is reported but does not gate — see below.

Mobile lab metrics: **CLS 0.000 on every page type, every run**, LCP 3.1–4.1 s,
TBT 567–1464 ms.

### Why mobile Performance is below 90, honestly

CLS being a flat zero across every page type says the layout work in HR7 —
width and height from the database on every image, aspect-ratio boxes, skeletons
at exact final dimensions — did what it was built to do. The score is not being
dragged down by anything the design does.

The cost is main-thread time under Lighthouse's 4× CPU throttle. The evidence:

- The **same 72 kB framework chunk** costs 735 ms of scripting on the guide page
  and 1198 ms on the listing page. It scales with the amount of hydrated DOM,
  which is the signature of React hydration cost, not of page-specific code.
- The gap is near-uniform across page types, **including the guide page**, which
  is long-form prose with almost no client JavaScript of its own.
- **Desktop runs the identical bundle and scores 93–99.** The only differences
  are the 4× CPU slowdown and simulated slow 4G.
- Server response is 27–30 ms. Total page weight is 405–422 kB, of which 170 kB
  is the two self-hosted variable fonts.

So the mobile figure is measuring this Windows development machine at a quarter
of its speed, over a simulated slow network, with no CDN, no HTTP/2 and no
Brotli. Three of those four are things Vercel provides and localhost cannot.

**This is recorded as an open Phase 7 item, not as a pass.** The gate is:

```bash
BASE_URL=https://thehousebossfl.com npm run check:lighthouse
```

If mobile Performance is still below 90 against the deployment, that is a real
finding, and the next lever is reducing hydrated DOM on the listing page — which
is where the measured cost is concentrated.

**One thing already tried and reverted:** lazy-loading the mobile navigation, as
suggested in Phase 0. It measured *worse*, because it moved the component out of
the initial chunk and onto a second request on the critical path. The
measurement is why it is not in the codebase; without this note somebody will
suggest it again.

**Not done, deliberately:** cutting the Fraunces `SOFT`, `WONK` and `opsz` axes
would shrink the 121 kB display font substantially. Those axes are the
letterforms that make the headings look like the brand, chosen in docs/03 § 2.
Stripping a client's typography to move a synthetic number is the wrong trade,
and it is the client's call, not ours. Raise it only if field Core Web Vitals
actually show a font problem.

---

## 4. Post-launch monitoring plan

The roadmap's 90-day table says what to do. This says who checks what, how
often, and what counts as a problem.

### Week 1 — daily, five minutes

| Check | Where | Problem looks like |
|---|---|---|
| Site up | UptimeRobot email | any alert at all |
| Leads arriving | admin Leads + Resend | a form submitted with no email delivered |
| Indexation started | GSC → Pages | still zero indexed after 7 days |
| AI bots reaching pages | Vercel logs, filtered by user agent | `OAI-SearchBot` or `PerplexityBot` getting 4xx/5xx |
| Crons ran | admin dashboard → `sync_log` | a night with no row |

The AI-bot check is the one that is easy to skip and expensive to skip. If those
crawlers are hitting errors, the project's primary goal is failing silently, and
nothing else on this list will show it.

### Month 1 — weekly

- **Core Web Vitals, field data**, in Speed Insights. Field data is the real
  answer to § 3. Wait for at least 28 days of it before drawing conclusions.
- **Search Console → Queries.** What people actually type is usually not what
  anyone guessed. Feed it back into the content plan in docs/14.
- **Storage meter.** Note the percentage each week; the slope matters more than
  the number.
- **Leads without a reply.** The site can only be judged on leads that were
  answered.

### Month 2 and 3 — monthly

- **Re-run the eight target assistant queries** from docs/08 against ChatGPT,
  Perplexity and Claude. Record the answers verbatim, including the wrong ones.
  This is the project's actual KPI and the only way to watch it move.
- Publish the month's market update, with the date stamped on every figure.
- Re-run `npm run check:compliance` and `npm run check:seo` against production.
- Confirm the backup workflow is still green, and **restore one** into a scratch
  project. A backup nobody has restored is a hope.

### The quarterly re-check

Once a quarter, and after any significant redesign:

```bash
npm run guards            # tokens, contrast, migrations, types, lint
npm run check:seo         # against production
npm run check:compliance  # against production
npm run check:lighthouse  # against production
npx playwright test       # full suite, all engines
```

Accessibility regressions arrive quietly, usually through a well-meant visual
tweak. The suite is what catches them.

### What should trigger a call, not a note

- **Any lead form failing** — the only thing on the site that directly costs
  money when it breaks.
- **Licence numbers or the brokerage name rendering wrongly** — a compliance
  exposure, not a bug.
- **A published listing URL returning 404** — see HR11. It undoes months of
  indexation and is not recovered by re-publishing.
- **Storage above 90%**, because uploads start being refused.
