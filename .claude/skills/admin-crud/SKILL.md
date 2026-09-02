---
name: admin-crud
description: Load when building or changing any admin dashboard screen in this project — a list view, an editor form, a media uploader, the leads inbox, or a settings panel. Supplies the repeatable CRUD pattern, the validation contract, the image-upload rules, and the admin UX rules the client depends on.
---

# Admin CRUD Pattern

Full spec: `docs/06-admin-dashboard-spec.md`. The admin dashboard is the only
source of listing data — if it is awkward, the site stays empty.

## The shape of every CRUD feature

```
app/(admin)/admin/<entity>/
├─ page.tsx              list view (server component)
├─ new/page.tsx          create
├─ [id]/edit/page.tsx    edit
└─ actions.ts            server actions: create, update, remove, togglePublish

components/admin/<entity>/
├─ <Entity>Table.tsx     desktop table + ResponsiveTable below 768px
├─ <Entity>Form.tsx      client component, react-hook-form + zod
└─ <Entity>Filters.tsx

lib/validation/<entity>.ts   ONE zod schema, used by form AND action
lib/queries/<entity>.ts      all reads
```

## The validation contract

One schema. Imported by the client form and by the server action. There is no
second place validation happens.

```ts
// lib/validation/listing.ts
export const listingSchema = z.object({
  address: z.string().min(3).max(200),
  cityId: z.string().uuid(),
  price: z.number().positive(),
  photos: z.array(photoSchema).max(15),
  // ...
})
export type ListingInput = z.infer<typeof listingSchema>
```

```ts
// actions.ts — re-validate, always. Never trust the client.
export async function updateListing(id: string, raw: unknown) {
  await requireAdmin()
  const parsed = listingSchema.safeParse(raw)
  if (!parsed.success) return { ok: false, error: parsed.error.flatten() }
  // ...
  revalidatePath(`/listing/${slug}`)
  revalidatePath('/search')
  return { ok: true }
}
```

Every action begins with `requireAdmin()`. RLS is the second layer, not the
first.

## List views

- [ ] Server component fetching through `lib/queries/`
- [ ] Filters and search reflected in `searchParams`, not in local state
- [ ] Sort control
- [ ] Pagination, 25 per page
- [ ] Bulk actions with a count in the confirmation
- [ ] Row actions: Edit · View on site · Duplicate · Delete
- [ ] `<ResponsiveTable />` below 768px — never a horizontally scrolling table
      as the mobile experience
- [ ] Loading skeleton at the exact row height
- [ ] Empty state that teaches: "Add your first listing" with a link

## Editor forms

- [ ] `react-hook-form` with `zodResolver`
- [ ] Tabs at ≥768px, accordion below
- [ ] Autosave every 30s and on tab change, with a visible "Saved 2 min ago"
- [ ] Unsaved-changes guard on navigation
- [ ] Sticky footer: Cancel · Save Draft · Publish, plus a validation summary
- [ ] Field errors inline, linked with `aria-describedby`, `aria-invalid` set
- [ ] Pre-publish checklist that disables Publish until it passes, with each
      unmet item linking to the tab that fixes it
- [ ] Cmd/Ctrl+S saves, Cmd/Ctrl+Enter publishes, Esc closes a dialog

## Images

Images upload **immediately on selection**, not on submit. A slow upload must
never block a save.

```
select → client compress (2400px, q0.85, WebP)
       → POST /api/admin/upload
       → server: sharp 1600/800/400 WebP + blurhash + EXIF strip
       → media row
       → { key, w, h, blur } into form state
```

Enforce in the UI:

- [ ] 15-photo counter, "8 / 15", zone disabled at the limit with an explanation
- [ ] Per-file progress and per-file retry
- [ ] Drag to reorder, cover selection, alt text per photo
- [ ] Alt text required before publish, with a count of what is missing
- [ ] Live storage estimate for this entity

The rules are in `docs/07-image-pipeline.md`. Nothing outside `lib/storage/`
touches the Supabase Storage SDK.

## Mutations

Every mutation must:

1. `requireAdmin()`
2. Re-validate with the shared schema
3. Perform the write
4. `revalidatePath()` every affected public route
5. Return `{ ok, error? }` — never throw a raw Postgres error to the client
6. Produce a toast: success or failure-with-retry

Affected paths by entity:

| Entity | Revalidate |
|---|---|
| Listing | `/listing/[slug]`, `/search`, `/[city]/homes-for-sale`, `/`, `/sold` |
| Article | `/[article route]`, the city hub, `/market-updates`, `/` |
| City | `/[city]`, `/[city]/homes-for-sale`, `/`, `/search` |
| Community | `/communities/[slug]`, `/lake-mary/communities` |
| Review | `/reviews`, `/` |
| Settings | `/` and layout-level pages |

## Destructive actions

- Delete requires typing the entity's address or title. Not a plain "Are you
  sure?".
- Bulk delete shows the exact count and the bytes of media that will be freed.
- Deleting a listing deletes its storage objects in the same action; if storage
  deletion fails, still delete the row and let the orphan cron reclaim.
- Deleting media that is still referenced is blocked, with a link to the
  referencing entity.

## Optimistic UI

Toggles (publish, feature) update instantly and roll back with a toast if the
server rejects. Everything else waits for the server — an optimistic save that
silently fails is worse than a slow one.

## Mobile

The client will check leads on her phone. Non-negotiable at 360px:

- Leads inbox
- Listings list
- Dashboard

The listing editor may be labelled "best on desktop" but must not be broken.

## Definition of done

- [ ] Create, read, update, delete all work
- [ ] One zod schema, used on both sides
- [ ] `requireAdmin()` on every action
- [ ] RLS blocks the same operations the UI blocks (verified, not assumed)
- [ ] Every list has loading, empty and error states
- [ ] Every destructive action is confirmed
- [ ] Every mutation revalidates
- [ ] Works at 360 / 768 / 1024 / 1440
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` reachable from a client bundle
