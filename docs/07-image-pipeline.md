# 07 — Image Pipeline

**The 1 GB Supabase Storage ceiling is the binding constraint of this project.**
Postgres will not fill up. Images will, quickly, unless every rule below holds.

---

## 1. Budget

| Variant | Width | Quality | Typical size |
|---|---|---|---|
| Main / gallery | 1600 | 78 | ~140 kB |
| Card thumbnail | 800 | 75 | ~50 kB |
| List / mobile | 400 | 70 | ~18 kB |
| **Total per photo** | | | **~208 kB** |

| Scenario | Storage |
|---|---|
| One listing at 15 photos | ~3.1 MB |
| 100 listings | ~310 MB |
| 200 listings | ~620 MB |
| Articles, city heroes, portraits (reserve) | ~150 MB |
| **Practical ceiling** | **~270 listings** |

Sold-photo purging returns ~2.85 MB per sold listing (the 1600 and 800 variants
of 15 photos), so a working agent's active portfolio stays well inside the
ceiling indefinitely.

**The original upload is never stored.** A single 4 MB original per photo would
consume the entire budget in 250 photos.

---

## 2. Upload flow

```
Admin selects files (any size)
  │
  ├─ Client: browser-image-compression
  │    maxWidthOrHeight 2400, quality 0.85, WebP
  │    → cuts a 6 MB phone photo to ~400 kB before it leaves the browser
  │
  ├─ POST /api/admin/upload   (multipart, one file per request)
  │    auth check → admin only
  │    rate limit → 30 uploads / minute / user
  │    mime allowlist → image/jpeg, image/png, image/webp, image/avif
  │    size cap → 10 MB post-compression, reject with a clear message
  │    per-listing count check → reject if already at 15
  │
  ├─ Server (Node runtime, sharp):
  │    key = `listings/${listingId}/${nanoid(8)}`
  │    for each of 1600 / 800 / 400:
  │       resize(width, { withoutEnlargement: true })
  │       .webp({ quality, effort: 4 })
  │    blurhash from a 32px raster
  │    strip EXIF (rotation applied first, metadata discarded)
  │
  ├─ storage.upload() × 3
  ├─ insert into media (key, bytes total, w, h, entity_type, entity_id)
  │
  └─ 200 { key, w, h, blur, bytes }
```

`withoutEnlargement: true` matters — a 900px source must not be upscaled to
1600px, producing a larger, blurrier file.

EXIF orientation is applied with `.rotate()` **before** resizing, then all
metadata is stripped. Phone photos arrive rotated; GPS coordinates in EXIF are a
privacy leak on a property photo.

### Runtime

The upload route needs `sharp`, so:

```ts
export const runtime = 'nodejs'
export const maxDuration = 60
```

Edge runtime cannot run `sharp`. Do not try.

---

## 3. Key naming

```
listings/{listingId}/{photoId}-1600.webp
listings/{listingId}/{photoId}-800.webp
listings/{listingId}/{photoId}-400.webp
articles/{articleId}/{photoId}-1200.webp
cities/{citySlug}/hero-1920.webp
communities/{communitySlug}/hero-1920.webp
site/{name}-{photoId}.webp
```

The **base key** stored in the DB is `listings/{listingId}/{photoId}` — no size
suffix, no extension. The suffix is added at URL-construction time.

`photoId` comes from `nanoid(8)`. **Never derive a key from the address, title
or slug** (hard rule 4) — editing an address must not orphan every image.

Article covers use a single 1200w variant; article body images use 1200 and 800.
City and community heroes get one 1920w plus a 960w for mobile.

---

## 4. URL construction

Exactly one function, in `lib/storage/url.ts`:

```ts
import type { Photo } from '@/types/domain'

const MEDIA = process.env.NEXT_PUBLIC_MEDIA_URL!

export function photoUrl(p: Photo, size: 1600 | 800 | 400 = 1600): string {
  if (p.kind === 'external') return p.url          // future MLS hotlink
  return `${MEDIA}/${p.key}-${size}.webp`
}
```

`NEXT_PUBLIC_MEDIA_URL` today:
`https://<project>.supabase.co/storage/v1/object/public/media`

Moving to Cloudflare R2 behind `media.thehousebossfl.com` is one env var. That
is the entire point of storing keys instead of URLs (hard rule 1).

---

## 5. Rendering

```tsx
'use client'
import Image from 'next/image'
import { useState } from 'react'
import { photoUrl } from '@/lib/storage/url'
import { blurToDataUrl } from '@/lib/utils/blurhash'

export function PropertyImage({ photo, size = 800, sizes, priority }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <Image
      src={failed ? '/placeholder-property.webp' : photoUrl(photo, size)}
      width={photo.w}
      height={photo.h}
      sizes={sizes}
      alt={photo.alt}
      priority={priority}
      loading={priority ? undefined : 'lazy'}
      placeholder={photo.blur ? 'blur' : 'empty'}
      blurDataURL={photo.blur ? blurToDataUrl(photo.blur) : undefined}
      onError={() => setFailed(true)}
      className="h-full w-full object-cover"
    />
  )
}
```

Non-negotiable in this component:

- `width`/`height` from the DB → zero CLS (hard rule 7)
- `onError` fallback → no broken-image icon, ever (hard rule 6)
- `sizes` correct per context — see `04-responsive-spec.md` § 7

```js
// next.config.ts
images: {
  unoptimized: true,   // hard rule 5 — we pre-generate; do not burn Vercel quota
  remotePatterns: [{ protocol: 'https', hostname: '*.supabase.co' }],
}
```

`/public/placeholder-property.webp` must exist before the first listing is
created. It is a branded navy card with the logo mark, 4:3, under 8 kB.

---

## 6. Storage adapter

```
lib/storage/
├─ types.ts
├─ providers/
│  ├─ supabase.ts    ← active
│  ├─ r2.ts          ← stub; implement only if the ceiling is hit
│  └─ local.ts       ← stub; for a future VPS
└─ index.ts
```

```ts
export const storage: StorageProvider =
  process.env.STORAGE_DRIVER === 'r2'    ? r2Provider :
  process.env.STORAGE_DRIVER === 'local' ? localProvider :
                                           supabaseProvider
```

Nothing outside `lib/storage/` may import the Supabase Storage SDK (hard rule 8).
The `phase-review` skill greps for violations.

### Bucket configuration

```
Bucket: media
Public: true (read)
File size limit: 10 MB
Allowed mime: image/webp
Cache-Control: public, max-age=31536000, immutable
```

The one-year immutable cache is safe because keys never change. It also protects
the 5 GB/month Supabase egress allowance — the CDN and browsers absorb repeat
views.

---

## 7. Deletion and purging

### Listing deleted

Inside one server action:

1. Collect every base key from `photos`
2. `storage.deleteMany()` all three variants of each
3. Delete the `media` rows
4. Delete the listing row
5. `revalidatePath()` the affected routes

If storage deletion fails, still delete the row and let the orphan cron reclaim
the bytes. Never leave a listing row pointing at deleted images.

### Photo removed in the editor

Deleted from storage immediately, `media` row removed, `photos` array updated.
No soft delete — the storage budget cannot afford a recycle bin.

### Sold-photo purge (hard rule 10)

Daily cron `/api/cron/purge-sold-photos`:

```ts
const due = await db
  .from('listings')
  .select('id, slug, photos')
  .eq('status', 'sold')
  .eq('photos_purged', false)
  .eq('keep_photos', false)
  .lt('purge_after', new Date().toISOString())

for (const l of due) {
  const keys = l.photos.flatMap((p) => [`${p.key}-1600.webp`, `${p.key}-800.webp`])
  await storage.deleteMany(keys)
  await db.from('listings').update({ photos_purged: true }).eq('id', l.id)
  await db.from('media').update({ variants: [400], bytes: /* recompute */ }).eq(...)
  revalidatePath(`/listing/${l.slug}`)
}
```

What survives: the 400w variant of every photo, the full listing row, the URL,
the description, the sold price and date.

Frontend when `photos_purged = true`: the gallery is replaced by the single 400w
cover with the note "Photos archived — this property has sold." The page keeps
its ranking, its backlinks and its value as proof of track record.

`keep_photos = true` opts a portfolio listing out of purging entirely.

### Orphan cleanup

Daily cron `/api/cron/orphan-media`, two directions:

1. Objects in the bucket with no `media` row → delete (abandoned drafts)
2. `media` rows whose `entity_id` no longer exists → delete both

Log the byte count reclaimed to the dashboard. Never delete anything created in
the last 24 hours — an in-progress upload must not be swept.

---

## 8. Failure modes and guards

| Failure | Guard |
|---|---|
| Storage full mid-upload | Pre-flight check against `storage_usage()`; block above 950 MB with a clear message and a link to Media → sort by size |
| Upload succeeds, DB write fails | Delete the uploaded objects in the catch block before returning the error |
| DB write succeeds, upload fails | Not possible — upload happens first, DB row second |
| Corrupt or non-image file | `sharp` throws on metadata read; return 415 with a readable message |
| Duplicate upload | Content hash stored on the `media` row; a duplicate within the same entity is rejected with "This photo is already on this listing" |
| Very large source (50 MP) | Client compression caps at 2400px first; server rejects above 10 MB |
| Slow upload on mobile data | Per-file progress, per-file retry, the form remains saveable |
| Image 404 in production | `onError` fallback plus a weekly integrity check comparing `media` keys against a bucket listing |

---

## 9. Monitoring

Dashboard widget, refreshed on load:

- Used of 1 GB, with a colored bar (green under 70%, amber 70–90%, red above)
- Breakdown by entity type
- Largest 10 objects, with links to their entity
- Next scheduled purge and the bytes it will free
- Growth projection based on the last 30 days

Alert thresholds: an in-app banner at 800 MB, and a blocked upload at 950 MB
with instructions rather than a raw error.

---

## 10. If the ceiling is reached

Escalation order, cheapest first:

1. Purge sold listings that have `keep_photos = true` unnecessarily.
2. Reduce the 1600w variant to 1400w at quality 74 for new uploads (~25% saving,
   no visible difference on a listing card).
3. Drop the 400w variant for articles, which rarely need it.
4. **Move to Cloudflare R2** — 10 GB free, zero egress fees, S3-compatible.
   Implement `providers/r2.ts`, run a migration script that copies objects and
   keeps every key identical, then change two env vars.
   Because the DB stores keys and not URLs, **no database migration is needed**.
5. Upgrade Supabase to Pro ($25/mo, 100 GB) — the simplest option, but it
   doubles the running cost the client already agreed to.

R2 is the recommended escalation. Write `providers/r2.ts` when the site crosses
600 MB, not when it hits 950 MB.
