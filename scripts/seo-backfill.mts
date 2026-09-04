/**
 * Generate SEO for everything already published.
 *
 * Generation runs at publish time, which covers everything from now on and
 * nothing from before. This is the one-off that makes "automatic" true of the
 * existing content too — and it is safe to re-run, because every write is an
 * upsert keyed on `path`.
 *
 *   npm run seo:backfill              # write
 *   npm run seo:backfill -- --dry-run # report only, no writes
 *
 * ── Concurrency ───────────────────────────────────────────────────────────
 *
 * Four at a time, from `lib/seo/auto/pool.ts`. Not unbounded — each record may
 * make a model call, and opening one request per listing is the reliable way to
 * get rate-limited and end up with a backfill that half-worked. Not sequential
 * either, which is what this was: a hundred records at ~1.5s each is nearly
 * three minutes of waiting on a socket, and four in flight makes it forty
 * seconds.
 *
 * Output stays in input order, so the report still reads top to bottom.
 */

/*
  No dotenv import: this runs through `tsx --env-file=.env.local`, which loads
  the file before any module is evaluated. Adding dotenv would be a second
  loader for the same file and a dependency the locked stack does not have.
*/
const dryRun = process.argv.includes("--dry-run");

async function main() {
  // Imported after dotenv, because these modules read process.env at import.
  const { getListingSlugsForStaticParams, getListingBySlug } = await import(
    "../lib/queries/listings"
  );
  const { getArticles, getArticleBySlug } = await import("../lib/queries/articles");
  const { getCities, getCommunities } = await import("../lib/queries/cities");
  const {
    ensureListingSeo,
    ensureArticleSeo,
    ensureCitySeo,
    ensureCommunitySeo,
  } = await import("../lib/seo/auto/apply");
  const { isModelConfigured } = await import("../lib/seo/auto/ollama");
  const { articleHref } = await import("../lib/utils/routes");
  const { mapWithConcurrency, SEO_CONCURRENCY } = await import(
    "../lib/seo/auto/pool"
  );
  const {
    autoArticleDescription,
    autoCityDescription,
    autoCommunityDescription,
    autoListingDescription,
  } = await import("../lib/seo/auto/generate");

  console.log(
    isModelConfigured()
      ? `Model configured (${process.env.OLLAMA_MODEL}). Descriptions are polished, then validated.`
      : "No model configured. Deterministic descriptions only — which are already valid.",
  );
  if (dryRun) console.log("DRY RUN — nothing will be written.\n");

  let done = 0;
  let polished = 0;

  const report = (path: string, r: { description: string; usedModel: boolean }) => {
    done += 1;
    if (r.usedModel) polished += 1;
    console.log(
      `  ${r.usedModel ? "AI " : "   "}${String(r.description.length).padStart(3)}  ${path}`,
    );
  };

  /*
    `--dry-run` is implemented by generating and NOT calling ensure*, rather
    than by a flag threaded into the writer. A dry run that goes through the
    same write path with a boolean guard is one missed branch away from writing.
  */
  type Row = { label: string; description: string; usedModel: boolean };

  const write = async (
    label: string,
    run: () => Promise<{ description: string; title: string; usedModel: boolean }>,
    preview: () => { description: string; usedModel: boolean },
  ): Promise<Row> => {
    const result = dryRun ? preview() : await run();
    return { label, description: result.description, usedModel: result.usedModel };
  };

  /*
    Doing is separated from reporting, so four concurrent workers cannot
    interleave their output mid-line. `mapWithConcurrency` returns results in
    INPUT order, so the report still reads top to bottom in the order the
    records were listed even though they finished out of order.
  */
  const runGroup = async <T,>(
    heading: string,
    items: readonly T[],
    task: (item: T) => Promise<Row | null>,
  ) => {
    console.log(`
${heading}`);
    const rows = await mapWithConcurrency(items, SEO_CONCURRENCY, task);
    for (const row of rows) if (row) report(row.label, row);
  };

  const slugs = await getListingSlugsForStaticParams();
  await runGroup("Listings", slugs, async (slug) => {
    const listing = await getListingBySlug(slug);
    if (!listing) return null;
    return write(
      `/listing/${slug}`,
      () => ensureListingSeo(listing),
      () => ({ description: autoListingDescription(listing), usedModel: false }),
    );
  });

  const articles = await getArticles({ limit: 500 });
  await runGroup("Articles", articles, async (card) => {
    const article = await getArticleBySlug(card.slug);
    if (!article) return null;
    const path = articleHref(article);
    return write(
      path,
      () => ensureArticleSeo(article, path),
      () => ({ description: autoArticleDescription(article), usedModel: false }),
    );
  });

  await runGroup("Cities", await getCities(), (city) =>
    write(
      `/${city.slug}`,
      () => ensureCitySeo(city),
      () => ({ description: autoCityDescription(city), usedModel: false }),
    ),
  );

  await runGroup("Communities", await getCommunities(), (community) =>
    write(
      `/communities/${community.slug}`,
      () => ensureCommunitySeo(community),
      () => ({ description: autoCommunityDescription(community), usedModel: false }),
    ),
  );

  console.log(
    `\n${done} ${done === 1 ? "page" : "pages"}${dryRun ? " would be written" : " written"}` +
      (polished > 0 ? `, ${polished} polished by the model.` : "."),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
