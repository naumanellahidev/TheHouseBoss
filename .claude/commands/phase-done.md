---
description: Close a build phase — run the full phase review and update PROGRESS.md
argument-hint: <phase number, e.g. 2>
---

Close Phase $1 of The House Boss build.

Invoke the `phase-review` skill and follow it completely:

1. Walk the Phase $1 Definition of Done in `docs/10-roadmap.md`, item by item.
   Verify each one — do not assume. Report pass / fail / N/A with a reason.
2. Run every guard grep from the skill. Report anything that is not clean.
3. Run the MLS-readiness guard.
4. Run `npm run typecheck`, `npm run lint`, `npm run build`.
5. Run the phase-specific checks for Phase $1.
6. Run the cross-cutting checks.
7. Update `PROGRESS.md`: the phase status table, a session entry, and any new
   entries under Open Client Decisions or Blocked On Client.

Then give a plain verdict: complete, complete with known gaps, or not complete.
Do not round up. If items remain, list them.
