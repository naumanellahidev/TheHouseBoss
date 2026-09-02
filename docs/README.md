# Documentation index — The House Boss FL

Start with `../CLAUDE.md`. It is the single source of truth for constraints and
wins any conflict with the documents below.

## Reading order for a new session

1. `../CLAUDE.md` — hard rules, stack, conventions
2. `../PROGRESS.md` — what is done, what is open, what is blocked
3. The docs your current phase depends on (table below)

## The documents

| # | File | What it settles |
|---|---|---|
| — | [client-brief-original.md](client-brief-original.md) | The client's message, verbatim, plus requirement traceability |
| 00 | [00-project-brief.md](00-project-brief.md) | Who the client is, business goals, audiences, scope, costs |
| 01 | [01-architecture.md](01-architecture.md) | Rendering strategy, route map, module boundaries, auth, perf budget |
| 02 | [02-database-schema.md](02-database-schema.md) | Every table, index, view, trigger, RLS policy, storage budget |
| 03 | [03-design-system.md](03-design-system.md) | Color, type, spacing, motion, components, accessibility baseline |
| 04 | [04-responsive-spec.md](04-responsive-spec.md) | Breakpoints, per-page layouts, touch rules, test procedure |
| 05 | [05-page-specs.md](05-page-specs.md) | Every public route, section by section, with empty states |
| 06 | [06-admin-dashboard-spec.md](06-admin-dashboard-spec.md) | Every admin screen, form, validation and UX rule |
| 07 | [07-image-pipeline.md](07-image-pipeline.md) | Upload, resize, storage adapter, purging, the 1 GB budget |
| 08 | [08-seo-ai-visibility.md](08-seo-ai-visibility.md) | robots, llms.txt, sitemap, JSON-LD, AI-citation strategy |
| 09 | [09-compliance-legal.md](09-compliance-legal.md) | FREC advertising, Fair Housing, ADA/WCAG, privacy, disclaimers |
| 10 | [10-roadmap.md](10-roadmap.md) | Eight phases, tasks, Definitions of Done, estimates |
| 11 | [11-mls-future.md](11-mls-future.md) | Why Stellar MLS is deferred and exactly how to add it |
| 12 | [12-env-deployment.md](12-env-deployment.md) | Env vars, Vercel, Supabase, DNS, backups, CI, runbook |
| 13 | [13-qa-checklists.md](13-qa-checklists.md) | Per-page, RLS, responsive, a11y, performance, launch checklists |
| 14 | [14-content-plan.md](14-content-plan.md) | What to write, in what order, and how to write it for AI citation |
| 15 | [15-client-launch-checklist.md](15-client-launch-checklist.md) | What the client and the broker must supply or decide before launch |
| 16 | [16-admin-guide.md](16-admin-guide.md) | Using the dashboard — written for Krisi, not for a developer |
| 17 | [17-launch-operations.md](17-launch-operations.md) | Analytics decision, monitoring, the measured performance record, the 90-day plan |

## Which docs each phase needs

| Phase | Read |
|---|---|
| P0 Foundation | 03, 04 |
| P1 Data layer | 02, 01 |
| P2 Admin + images | 06, 07 |
| P3 Public listings | 05, 04 |
| P4 Content system | 05, 14 |
| P5 Guides and pages | 05, 14, 09 |
| P6 SEO and AI | 08 |
| P7 QA and launch | 13, 09 |

## Skills and commands

`.claude/skills/`

| Skill | Load when |
|---|---|
| `design-system` | Before writing or editing any UI |
| `responsive-audit` | After building any page, before marking it done |
| `supabase-migration` | Before any schema, RLS or storage-policy change |
| `admin-crud` | Before building any admin screen |
| `seo-jsonld` | Before any metadata or structured-data work |
| `phase-review` | At the end of every phase |

`.claude/commands/`

| Command | Does |
|---|---|
| `/phase-start <n>` | Loads context, verifies entry conditions, plans the session |
| `/phase-done <n>` | Runs the full phase review and updates PROGRESS.md |
| `/design-check <target>` | Audits a page or component against design + responsive standards |

## Keeping these documents true

A document that has drifted from the code is worse than no document. Therefore:

- If a decision changes, update the owning doc **in the same commit** as the code.
- If a decision is made that no doc covers, write it into the relevant doc
  **before** implementing it.
- `CLAUDE.md` wins any conflict — then fix whatever disagreed with it.
- `PROGRESS.md` is updated at the end of every session, without exception.
