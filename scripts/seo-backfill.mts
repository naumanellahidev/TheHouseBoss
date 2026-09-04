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
 * ── Why it is sequential ──────────────────────────────────────────────────
 *
 * Each record may make one model call. Running them in parallel would open as
 * many concurrent requests as there are listings, which is the reliable way to
 * get rate-limited by a provider and end up with a backfill that half-worked.
 * A hundred records at ~1.5s each is under three minutes, run once.
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
  const write = async (
    label: string,
    run: () => Promise<{ description: string; title: string; usedModel: boolean }>,
    preview: () => { description: string; usedModel: boolean },
  ) => {
    if (dryRun) return report(label, preview());
    report(label, await run());
  };

  console.log("\nListings");
  const slugs = await getListingSlugsForStaticParams();
  for (const slug of slugs) {
    const listing = await getListingBySlug(slug);
    if (!listing) continue;
    const { autoListingDescription } = await import("../lib/seo/auto/generate");
    await write(
      `/listing/${slug}`,
      () => ensureListingSeo(listing),
      () => ({ description: autoListingDescription(listing), usedModel: false }),
    );
  }

  console.log("\nArticles");
  const articles = await getArticles({ limit: 500 });
  for (const card of articles) {
    const article = await getArticleBySlug(card.slug);
    if (!article) continue;
    const path = articleHref(article);
    const { autoArticleDescription } = await import("../lib/seo/auto/generate");
    await write(
      path,
      () => ensureArticleSeo(article, path),
      () => ({ description: autoArticleDescription(article), usedModel: false }),
    );
  }

  console.log("\nCities");
  for (const city of await getCities()) {
    const { autoCityDescription } = await import("../lib/seo/auto/generate");
    await write(
      `/${city.slug}`,
      () => ensureCitySeo(city),
      () => ({ description: autoCityDescription(city), usedModel: false }),
    );
  }

  console.log("\nCommunities");
  for (const community of await getCommunities()) {
    const { autoCommunityDescription } = await import("../lib/seo/auto/generate");
    await write(
      `/communities/${community.slug}`,
      () => ensureCommunitySeo(community),
      () => ({ description: autoCommunityDescription(community), usedModel: false }),
    );
  }

  console.log(
    `\n${done} ${done === 1 ? "page" : "pages"}${dryRun ? " would be written" : " written"}` +
      (polished > 0 ? `, ${polished} polished by the model.` : "."),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
