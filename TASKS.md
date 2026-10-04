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
| Last commit | `5ebba45` p7(docs): hosting stays on the existing Vercel project |
| Branch | `main`, clean, pushed |
| Live | https://www.thehousebossfl.com — deployed from `main` on every push |
| Hosting | The existing Vercel project (`altrix/the-house-boss`), free tier, left as it is by the client's decision |
| Database | Supabase, migrations applied through **027** |
| Phase | 7 (QA, compliance, launch) |

Last verified live: `/`, `/articles`, `/admin/login`, `/manifest.webmanifest`,
`/sw.js`, `/offline`, `/sitemap.xml`, `/llms.txt` — all 200.

---

## Now

- [ ] **Auto internal linking at publish.**
      An article published with no internal links should get them automatically,
      from phrases already in its own body, before it goes live. The engine
      exists (`lib/seo/auto/autolink.ts`) and currently runs only when somebody
      presses "Fix what it can" in the editor. Wire it into the publish path so
      it is not optional.
      - Only when the body has **zero** internal links. An article the author
        linked herself is never touched.
      - Only phrases already written. It never adds a sentence — that is the
        line the whole feature rests on (`scripts/check-autofix.mts` asserts the
        text is unchanged word for word).
      - Record it in the audit log; a silent edit to a published body is not
        acceptable even when it is correct.
      - Files: `app/(admin)/admin/(shell)/content-actions.ts` (publish),
        `lib/seo/auto/apply.ts` (`syncArticleSeo`), `lib/seo/auto/autolink.ts`.

---

## Next

- [ ] **Admin test account** so `tests/admin.spec.ts` stops skipping all 15
      tests. Needs `ADMIN_TEST_EMAIL` in `.env.local` and an account from
      `scripts/create-admin.mjs`. Until then the admin screens have **no**
      runtime responsive or accessibility coverage — the code-level audit that
      was done is not a substitute. **Ask the client before creating it:** it
      adds a real admin user to the production Supabase project.

- [ ] **Hosting plan decision.** `CLAUDE.md` § 2 and `docs/12` § 2 both record
      Vercel **Pro** as locked, because the Hobby tier prohibits commercial use.
      The site is on the free tier and the client wants it left there
      (2026-10-03). Their call — but the documents and the reality disagree.
      Before launch: upgrade, or amend both documents and accept the terms.

- [ ] **Per-city blog URLs for the first non-Lake-Mary article.** `articleHref`
      already routes a city article to `/{city}/blog/{slug}`; an article with no
      city still falls back to `/market-updates/{slug}`. Nothing is published
      yet, so the scheme can still change. After the first publish it is
      permanent (HR11).

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

---

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
