# Logo artwork

Drop the client's logo here, then flip `HAS_ARTWORK` to `true` in
`components/site/logo.tsx`. Nothing else needs to change — every place the logo
appears goes through that one component.

## Files

| File | Used for | Notes |
|---|---|---|
| `house-boss.png` | light grounds — header, login, most of the site | required |
| `house-boss-invert.png` | dark grounds — inverted footer, hero overlays | optional; falls back to the light file |

## Preparing the file

The supplied artwork is gold type on white. Two things matter more than anything
else here:

1. **Export at 3x the largest rendered size.** The header renders it at ~200px
   wide, so a 600px-wide export stays sharp on a high-density display. Larger
   than that is wasted bytes on every page load.
2. **Trim the whitespace.** The original has a wide white margin baked in, which
   makes the logo look small and misaligned inside a header that adds its own
   padding. Crop to the artwork's own bounding box.

Save as PNG with transparency, not JPEG — a white JPEG box will be visible the
moment it sits on anything other than pure white, including the inverted footer.

## Why not SVG

SVG would be the ideal format and is not achievable from a raster source: the
gold in this artwork is a per-letter gradient with highlights, and auto-tracing
it produces either a flat colour or several thousand paths. If the designer can
supply the original vector, use it — replace the PNG, keep the same filename,
and nothing else changes.

## A note on colour

This artwork is gold. The site palette is white and royal blue, chosen by the
client after the earlier navy-and-gold direction was retired. That combination
is deliberate and works — a gold wordmark against a royal-blue interface is a
long-standing luxury pairing — but it is worth knowing the logo is now the only
gold on the site, which is what makes it read as the brand mark rather than as
part of the UI.
