---
description: Start a build phase — load context, confirm entry conditions, and plan the session
argument-hint: <phase number, e.g. 2>
---

Start Phase $1 of The House Boss build.

Do this in order:

1. Read `CLAUDE.md` in full. Restate the hard rules that apply to this phase.
2. Read the Phase $1 section of `docs/10-roadmap.md`.
3. Read every doc that phase depends on:
   - P0 → `03-design-system.md`, `04-responsive-spec.md`
   - P1 → `02-database-schema.md`, `01-architecture.md`
   - P2 → `06-admin-dashboard-spec.md`, `07-image-pipeline.md`
   - P3 → `05-page-specs.md`, `04-responsive-spec.md`
   - P4 → `05-page-specs.md`, `14-content-plan.md`
   - P5 → `05-page-specs.md`, `14-content-plan.md`, `09-compliance-legal.md`
   - P6 → `08-seo-ai-visibility.md`
   - P7 → `13-qa-checklists.md`, `09-compliance-legal.md`
4. Read `PROGRESS.md` — what is already done, what is open, what is blocked on
   the client.
5. **Verify the entry conditions.** If the previous phase has open DoD items,
   say so and ask whether to proceed anyway before writing any code.
6. Load the skills this phase needs (`design-system` before any UI,
   `supabase-migration` before any schema work, `admin-crud` before any admin
   screen, `seo-jsonld` before any metadata work).
7. Produce a task plan for this session: an ordered list, with the files each
   task touches, and what is explicitly out of scope for this session.

Then stop and show me the plan before you start building.
