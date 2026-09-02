import { ListingGridSkeleton } from "@/components/listing/listing-grid";
import { Container, Section } from "@/components/site/container";
import { Skeleton, TextSkeleton } from "@/components/ui/skeleton";

/**
 * The sold archive is heavy enough to justify streaming, and it
 * never calls `notFound()` — which is exactly the condition that makes a
 * `loading.tsx` safe here.
 *
 * There used to be one of these at the APP ROOT. It made every route stream,
 * which flushes a 200 status header before the page body runs, so any
 * `notFound()` further down could no longer set 404 — every missing listing
 * answered 200 with a "not found" page. See the note in
 * `app/(marketing)/listing/[slug]/page.tsx` before adding another one.
 *
 * The skeleton matches the real grid's dimensions, so nothing shifts when the
 * results arrive (docs/03 § 11).
 */
export default function Loading() {
  return (
    <>
      <Section className="pb-0">
        <Container className="flex flex-col gap-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-12 w-full max-w-lg" />
          <TextSkeleton lines={2} />
        </Container>
      </Section>

      <Section className="pt-6">
        <Container className="flex flex-col gap-6">
          <span className="sr-only" role="status">
            Loading sold homes
          </span>
          <Skeleton className="h-11 w-full" />
          <ListingGridSkeleton count={6} />
        </Container>
      </Section>
    </>
  );
}
