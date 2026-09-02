/**
 * Renders one or more JSON-LD graphs.
 *
 * Content comes only from our own builders in `lib/seo/jsonld.ts`, never from
 * user input, so `JSON.stringify` is the whole sanitisation story — but the
 * `<` escape below is kept anyway: a description containing `</script>` would
 * otherwise close the tag early.
 */
export function JsonLd({
  data,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any> | (Record<string, any> | null)[];
}) {
  const graphs = (Array.isArray(data) ? data : [data]).filter(Boolean);
  if (graphs.length === 0) return null;

  return (
    <>
      {graphs.map((graph, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(graph).replace(/</g, "\\u003c"),
          }}
        />
      ))}
    </>
  );
}
