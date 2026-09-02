---
name: phase-review
description: Run at the end of every build phase in this project, before closing the session or starting the next phase. Verifies the phase Definition of Done from docs/10-roadmap.md, runs the automated guard greps that protect the hard rules in CLAUDE.md, and updates PROGRESS.md. Also use when asked whether a phase is actually finished.
---

# Phase Review

Run this before declaring any phase complete. A phase that has not passed this
review is not complete, regardless of how much code was written.

## 1. Definition of Done

Open `docs/10-roadmap.md`, find the current phase, and walk its DoD list item by
item. **Verify each one, do not assume.** Report each as pass, fail, or not
applicable with a reason.

If any item fails, the phase stays open. Fix it, or record it explicitly in
`PROGRESS.md` as a known gap with an owner and a reason.

## 2. Hard-rule guard greps

These catch the most damaging regressions in this codebase. All should return
nothing.

```bash
# HR20 — service role key must never reach a client bundle
grep -rn "SERVICE_ROLE" app/ components/ --include=*.tsx --include=*.ts
grep -rn "SERVICE_ROLE" .next/static 2>/dev/null

# HR23 — no hex literals outside the theme file
grep -rn "#[0-9a-fA-F]\{3,8\}" app components --include=*.tsx --include=*.ts \
  | grep -v globals.css

# HR23 — no arbitrary pixel values
grep -rn "\[[0-9]\+px\]" app components --include=*.tsx

# HR8 — storage SDK only inside lib/storage
grep -rn "supabase.storage\|storage.from(" app components lib \
  | grep -v "lib/storage/"

# HR1 — no full media URLs persisted or hardcoded
grep -rn "supabase.co/storage" app components lib --include=*.ts --include=*.tsx \
  | grep -v "lib/storage/url.ts"

# HR19 — no inline Supabase queries outside lib/queries
grep -rn "\.from('" app components --include=*.tsx | grep -v "lib/queries"

# HR16 — compliance footer not reimplemented inline
grep -rn "SL3327932\|CRC1335654" app components \
  | grep -v "ComplianceFooter\|lib/seo\|docs/"

# placeholder content left behind
grep -rni "lorem\|TODO:\|FIXME\|example.com\|xxx-xxx" app components
```

## 3. MLS-readiness guard

These must still exist (`docs/11-mls-future.md`):

```bash
grep -n "source_id\|is_locked\|sync_log" supabase/migrations/*.sql
grep -rn "kind: 'external'\|kind === 'external'" lib/ types/
ls lib/listings/
```

If a cleanup pass removed any of them, restore them and say why.

## 4. Build and type health

```bash
npm run typecheck     # zero errors
npm run lint          # zero errors
npm run build         # succeeds, no new warnings
```

Check the build output for bundle size against the budget in
`docs/01-architecture.md`: marketing routes under 120 kB first-load JS.

## 5. Phase-specific checks

| Phase | Extra verification |
|---|---|
| P0 | `/dev/styleguide` renders every token and state; header/footer at 5 widths |
| P1 | `npm run test:rls` passes; `types/database.ts` current |
| P2 | Upload a real photo end to end; confirm 3 objects plus 1 media row and no original; run the purge cron against a seeded past-due listing |
| P3 | Every filter combination gives a working shareable URL; back button restores state |
| P4 | Publish an article end to end; FAQ text matches `FAQPage` markup |
| P5 | Each guide meets its word count with genuine content; disclaimers present |
| P6 | Rich Results Test clean on every page type; `curl` shows real HTML |
| P7 | The full pre-launch master checklist in `docs/13-qa-checklists.md` |

## 6. Cross-cutting checks, every phase

- [ ] Any new page passed the `responsive-audit` skill
- [ ] Any new UI passed the `design-system` skill
- [ ] Any schema change is reflected in `docs/02-database-schema.md`
- [ ] Any new decision not previously documented has been written into the
      relevant doc
- [ ] No new dependency was added that duplicates something in the locked stack
- [ ] `.env.example` updated if a new variable was introduced

## 7. Update PROGRESS.md

Append a session entry:

```markdown
### <date> — Phase <n>: <name>

**Shipped**
- ...

**Open / deferred**
- ... (with the reason and who owns it)

**Decisions made this session**
- ... (and which doc was updated)

**Next session must know**
- ...
```

Also update the phase status table at the top of `PROGRESS.md`, and add anything
new to Open Client Decisions or Blocked On Client.

## 8. Report

Give a plain verdict:

- **Phase complete** — every DoD item passed, all greps clean, docs updated
- **Phase complete with known gaps** — list each gap, why it is acceptable, and
  who owns it
- **Phase not complete** — list what remains

Do not round up. A phase reported complete that is not complete costs more later
than an honest "three items remain".
