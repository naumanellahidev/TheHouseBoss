# TASKS — The House Boss FL

**Read this file first, before anything else, in every session.**

It exists so that work can resume from one file instead of from a chat history.
If you are a fresh session: read `CLAUDE.md`, then this, then start at the first
unchecked box under **Now**. Nothing else needs reading to begin.

**Update it as you go, not at the end.** The box is ticked when the thing is
done, deployed and verified — not when the code is written. If a session stops
halfway, the half-done item stays unchecked with a note under it saying exactly
where it stopped.

---

## State

| | |
|---|---|
| Last work commit | `2e4c8c9` p7(admin): the admin suite runs for real, and the service worker stops reloading every first visit |
| Branch | `main`, clean, pushed |
| Live | https://www.thehousebossfl.com — deployed from `main` on every push |
| Hosting | The existing Vercel project (`altrix/the-house-boss`), **free tier** — recorded decision, upgrade triggers in `docs/12` § 2 |
| Database | Supabase, migrations applied through **027** |
| Phase | 7 (QA, compliance, launch) |

Last verified live (2026-10-04): `/`, `/articles`, `/admin/login`, `/sw.js`,
`/manifest.webmanifest` — all 200, on the free Vercel tier.

---

## Now

Nothing in flight.

---

## Next

Nothing queued. Take the next request from the client.

---

## Blocked on the client

- [ ] Confirm the contractor services list on `/hire-contractor` — it is this
      developer's reading of what a CRC licence permits, editable in
      Admin → Pages so it stays her assertion.
- [ ] The Stellar MLS deviation must be put in writing before launch
      (`docs/11-mls-future.md`, `CLAUDE.md` § 7).
- [ ] Street address and postcode are still `PENDING` in `lib/site-config.ts`.

---

## Done — and verified live

Each of these is deployed and checked on the live site. Do not redo them.

- **Answer hub** — 62 question pages under `/answers` in nine categories,
  QAPage + BreadcrumbList, linked from the nav, the footer, the city hubs and
  the guides. `npm run check:answers` holds the word floor and link resolution.
- **One metadata generator** — `lib/seo/auto/` rebuilt from scratch: `vocab`,
  `compose`, `document`, `score`, `review`, `generate`. The listing route and
  both article routes call it instead of each having their own fallback copy.
  `npm run check:seo-copy` covers 1,050 listing and 108 article combinations.
- **Admin SEO workspace** — five tabs; each record's SEO tab is a score, the
  failing checks with a sentence each, the real generated copy as the field
  placeholders, and two previews.
- **"Fix what it can"** — promotes the answer-first block, splits over-long
  paragraphs, links phrases already in the body, pairs question headings into
  the FAQ, writes the metadata. 50 → 98 on a realistic article.
  `npm run check:autofix` asserts the text never changes.
- **Articles section** — `/articles` and `/articles/[city]`, server-side search
  and filters, Communities removed from both menus.
- **Social profiles** — footer, `/contact`, `/about`, `/llms.txt`, JSON-LD
  `sameAs`. One resolver in `components/site/social-links.tsx`.
- **Notification bell** — ranked feed derived from `leads` and `reviews`, no
  notifications table, no dismiss button, polls only while visible.
- **PWA** — manifest, service worker, offline page, iOS metadata, 192/512/
  maskable icons. Installs to a home screen and opens on `/admin`.
- **Push notifications** — migrations 026 + 027, per-device switch in Settings →
  Notifications, sent on a new lead or review beside the Resend email.
- **Search Console** verification tag; demo listings removed with 301s.
- **Publish-time internal linking** — `lib/seo/auto/ensure-links.ts`, called from
  `syncArticleSeo` on every publish and every save of a published article. Runs
  only when the body has zero internal links, links only phrases already
  written, checks the text is identical before writing, and records every
  anchor in the audit log.
  - The one article live today (`living-in-lake-mary-fl`) was published before
    this existed. It gets its links the next time it is saved — deliberately
    not written to behind the author's back.
- **Per-city article URLs** — a city article lives at `/{city}/blog/{slug}`,
  Lake Mary keeps `/lake-mary/blog/{slug}`, an article with no city falls back
  to `/market-updates/{slug}`. Permanent once an article is published (HR11).

---

- **Admin test account** (2026-10-04, client approved) —
  `qa-admin@thehousebossfl.com`, `ADMIN_TEST_EMAIL` in `.env.local`. The admin
  suite now runs signed in, over **all 16 admin screens**: one h1 each, no
  critical or serious axe violations, no overflow at 360px, the drawer, the
  editor accordion, the leads inbox, the CSV export. **15/15 passing.**
  Run it with the env loaded:
  `node --env-file=.env.local node_modules/@playwright/test/cli.js test tests/admin.spec.ts`
  - Its first real run found a shipped bug: the service worker reloaded every
    first visit about a second after load (the controller guard was read inside
    the event, where it already holds the new worker). Fixed in
    `components/site/service-worker.tsx`.
  - And four unlabelled inputs: the article slug field and three hidden file
    pickers (editor, cover image, listing photos). All fixed.
- **Hosting decision recorded** — free tier, by the client's choice, in
  `CLAUDE.md` § 2 and `docs/12` § 2 with the upgrade triggers. Every cron in
  `vercel.json` is daily or less, which Hobby requires — **do not add a more
  frequent one** or the next push fails to deploy.

## How to work here

```bash
npm run guards        # tokens, contrast, migrations, zod, types, lint, SEO, autofix, logo
npm run build         # must be clean before any commit
npm run test:rls      # after ANY migration — 41/41 expected
npm run check:links   # internal links across the built site
npm run check:seo     # sitemap, robots, llms.txt, structured data
```

**Test only what changed.** The full Playwright suite is about seven minutes
plus a build; run the spec that covers the change (`-g` filters by page name)
and the guard that owns the rule. Save the whole suite for closing a phase.
This is a standing instruction from the client — it is their credits.

**Never run a build while a Playwright suite is running.** It replaces `.next`
under the server and every remaining test fails for no real reason. This has
cost two full runs already.

**Deploy** is `git push origin main`. The remote is SSH over port 443
(`ssh://git@ssh.github.com:443/...`) because HTTPS is reset on this network.
Wait for `npx vercel ls` to show Ready, then verify the live URLs.

**Shell traps on this machine:** heredocs eat a backslash level — a `\b` written
in a `node -e` string lands in the file as a backspace character, which has
happened twice. Write files with the Write tool or a `.mjs` script instead, and
scan for control characters if a regex stops matching.
