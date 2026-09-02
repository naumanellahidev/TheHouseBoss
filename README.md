# The House Boss FL

Real-estate website and custom admin dashboard for **Krisi Kakarova** — licensed
Realtor (SL3327932) and Certified Residential Building Contractor (CRC1335654),
Lake Mary, Florida. Trading as *The House Boss — Powered by World Properties
Group*.

**Read `CLAUDE.md` before touching anything.** It holds the 25 hard rules that
protect the storage budget, the SEO surface and the Florida advertising
compliance. Then read `PROGRESS.md` for where the build actually is.

Full documentation index: [`docs/README.md`](docs/README.md).

---

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · Tailwind CSS v4 ·
Radix primitives · Supabase (Postgres + Auth + Storage) · Resend · Vercel Pro.

## Getting started

```bash
cp .env.example .env.local     # fill in as each phase needs it
npm ci
npm run dev                    # http://localhost:3000
```

Two routes exist today: `/` (hero + trust strip) and `/dev/styleguide` — the
complete design system, and the artifact the client signs off on.

## Scripts

| Script | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run guards` | tokens → contrast → typecheck → lint. **Run before every commit.** |
| `npm run check:tokens` | Fails on a raw hex or arbitrary px outside `globals.css` (hard rule 23) |
| `npm run check:contrast` | Computes every documented token pairing against WCAG 2.1 AA |
| `npm run check:pending` | Fails while any client-supplied value is still a placeholder (expected until Phase 7) |
| `npm run test:responsive` | 9 widths x every page: overflow, target size, screenshots |
| `npm run test:a11y` | axe-core, heading structure, skip link, focus trap, reduced motion, input zoom |
| `npm run gen:icons` | Regenerates `apple-icon.png` and `favicon.ico` from `app/icon.svg` |
| `npm run format` | Prettier, with Tailwind class sorting |

### Running the browser tests

Playwright browsers are installed outside the default location on this machine
because the C: drive is nearly full:

```bash
export PLAYWRIGHT_BROWSERS_PATH=D:/ms-playwright
export BASE_URL=http://localhost:3111      # against an already-running server
npx next start -p 3111 &
npx playwright test
```

Screenshots land in `shots/` — the assertions catch overflow and undersized
targets; a person still has to look at the images.

## What is enforced automatically

- **Design tokens** — no hex literal or arbitrary pixel value may appear outside
  `app/globals.css`
- **Contrast** — every documented token pairing is computed, not estimated
- **Responsiveness** — no horizontal overflow at any width from 360px up; 44px
  touch targets below 1024px, 24px above
- **Accessibility** — zero critical/serious axe violations, one `h1` per page,
  a working skip link, a trapped mobile-nav focus, honored reduced motion, and
  no form control below 16px

## Project layout

```
app/            (marketing) public site · (admin) dashboard · dev/styleguide
components/     ui/ primitives · site/ shared building blocks
lib/            site-config · nav · storage adapter · utils
types/          domain.ts (hand-written) · database.ts (generated, Phase 1)
docs/           16 specification documents — the contract for the whole build
scripts/        guard and asset-generation scripts
tests/          Playwright responsive + accessibility suites
.claude/        skills and slash commands for Claude Code
```

## Build phases

Eight phases, one per session, defined in [`docs/10-roadmap.md`](docs/10-roadmap.md).
Start one with `/phase-start <n>` and close it with `/phase-done <n>`.

P0 (foundation and design system) is complete and awaiting the client's sign-off
on the visual direction. P1 (data layer) is next.

## Running costs

~$20/month: Vercel Pro. Supabase and Resend are on free tiers; the domain is
already registered at Porkbun. See
[`docs/12-env-deployment.md`](docs/12-env-deployment.md).
