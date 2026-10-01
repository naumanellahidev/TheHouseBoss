import type { ArticleCard, ArticleKind } from "@/types/domain";

/**
 * The URL is the state of the article index.
 *
 * ── Why this is not a client filter ───────────────────────────────────────
 *
 * The first version filtered in the browser over the whole published set. It
 * was fast, and it was wrong in two ways that matter more than the speed: the
 * filters had to be restored from `window.location` after mount, which React
 * rightly treats as an effect writing state; and a filtered view existed only in
 * that one tab, so "send me the Sanford ones" meant sending somebody a page and
 * a set of instructions.
 *
 * So articles now filter the way listings do (`lib/validation/search-params.ts`):
 * every filter is a query parameter, the server does the work, the result is a
 * URL somebody can send, and the page works with JavaScript switched off.
 *
 * ── Tolerant on purpose ───────────────────────────────────────────────────
 *
 * Nothing here throws. A hand-edited link, a stale bookmark or a parameter from
 * an older version of the page degrades to a sensible list rather than a 500 —
 * the same rule the listing parser follows, for the same reason: these URLs get
 * shared, and a shared link that errors is worse than one that shows too much.
 */

export const ARTICLE_KINDS: ArticleKind[] = ["blog", "market_update", "guide"];

export const ARTICLE_KIND_LABELS: Record<ArticleKind, string> = {
  blog: "Articles",
  market_update: "Market updates",
  guide: "Guides",
};

export type ArticleParams = {
  /** Free text across title, excerpt, city and tags. */
  q: string;
  /** City slug, or "" for every city. */
  city: string;
  kind: ArticleKind | "";
  tag: string;
  /** Published date order. Newest is the default everywhere. */
  sort: "newest" | "oldest";
};

export const EMPTY_ARTICLE_PARAMS: ArticleParams = {
  q: "",
  city: "",
  kind: "",
  tag: "",
  sort: "newest",
};

type RawParams = Record<string, string | string[] | undefined>;

function one(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function parseArticleParams(raw: RawParams): ArticleParams {
  const kind = one(raw.kind);

  return {
    // 120 characters. Long enough for any real query and short enough that a
    // padded URL cannot be used to render a huge string into the page.
    q: one(raw.q).slice(0, 120),
    city: one(raw.city).slice(0, 80),
    kind: (ARTICLE_KINDS as string[]).includes(kind) ? (kind as ArticleKind) : "",
    tag: one(raw.tag).slice(0, 80),
    sort: one(raw.sort) === "oldest" ? "oldest" : "newest",
  };
}

/** True when anything is narrowing the list. */
export function isFiltered(params: ArticleParams): boolean {
  return (
    params.q !== "" || params.city !== "" || params.kind !== "" || params.tag !== "" || params.sort === "oldest"
  );
}

/**
 * The query string for a set of parameters, with one value changed.
 *
 * Used by the chips, which are links rather than controls: a topic chip has to
 * keep whatever else is applied, and building that by hand at each call site is
 * how one of them ends up dropping the search text.
 */
export function articleQuery(
  params: ArticleParams,
  change: Partial<ArticleParams>,
): string {
  const next = { ...params, ...change };
  const search = new URLSearchParams();

  if (next.q) search.set("q", next.q);
  if (next.city) search.set("city", next.city);
  if (next.kind) search.set("kind", next.kind);
  if (next.tag) search.set("tag", next.tag);
  if (next.sort === "oldest") search.set("sort", "oldest");

  const value = search.toString();
  return value ? `?${value}` : "";
}

/**
 * Canonical and indexability, following the listing policy (docs/08 § 5).
 *
 * The bare index is canonical and indexed. Every filtered permutation points at
 * it and is `noindex, follow` — the same set of articles in a different order is
 * not a different page, and letting the combinations into the index is how a
 * small site ends up competing with itself.
 *
 * `follow` in both cases: a page that is not indexed is still a route to the
 * articles it links to.
 */
export function articleCanonical(
  basePath: string,
  params: ArticleParams,
): { path: string; index: boolean } {
  return { path: basePath, index: !isFiltered(params) };
}

function normalise(value: string): string {
  return value.toLowerCase().normalize("NFKD").replace(/\s+/g, " ").trim();
}

/** Every word in the query has to appear somewhere in the article. */
function matchesQuery(article: ArticleCard, query: string): boolean {
  if (query === "") return true;
  const haystack = normalise(
    [article.title, article.excerpt ?? "", article.city?.name ?? "", ...article.tags].join(" "),
  );
  return normalise(query)
    .split(" ")
    .every((word) => haystack.includes(word));
}

/**
 * Apply the parameters to a list of articles.
 *
 * In memory rather than in Postgres, deliberately. The set is one agent's
 * writing — the index reads at most 200 rows — and a `websearch_to_tsquery` over
 * that costs a second round trip to filter a list the page already has. The
 * moment this outgrows one query it becomes a full-text search, which is exactly
 * what `searchListings` does and why the shape of this module matches it.
 */
export function filterArticles(
  articles: ArticleCard[],
  params: ArticleParams,
): ArticleCard[] {
  const filtered = articles.filter(
    (article) =>
      matchesQuery(article, params.q) &&
      (params.city === "" || article.city?.slug === params.city) &&
      (params.kind === "" || article.kind === params.kind) &&
      (params.tag === "" || article.tags.some((value) => value.trim() === params.tag)),
  );

  /*
    The query already returns newest first, so ascending is a reverse rather than
    a re-sort. That keeps an article with no published date where the query put
    it instead of throwing it to one end on a comparison against null.
  */
  return params.sort === "oldest" ? [...filtered].reverse() : filtered;
}

/** The filter options that actually match something, derived from the data. */
export function articleFacets(articles: ArticleCard[]): {
  cities: { slug: string; name: string; count: number }[];
  kinds: { kind: ArticleKind; count: number }[];
  tags: { tag: string; count: number }[];
} {
  const cities = new Map<string, { name: string; count: number }>();
  const kinds = new Map<ArticleKind, number>();
  const tags = new Map<string, number>();

  for (const article of articles) {
    if (article.city) {
      const current = cities.get(article.city.slug);
      cities.set(article.city.slug, {
        name: article.city.name,
        count: (current?.count ?? 0) + 1,
      });
    }

    kinds.set(article.kind, (kinds.get(article.kind) ?? 0) + 1);

    for (const value of article.tags) {
      const clean = value.trim();
      if (clean) tags.set(clean, (tags.get(clean) ?? 0) + 1);
    }
  }

  return {
    cities: [...cities]
      .map(([slug, value]) => ({ slug, name: value.name, count: value.count }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    kinds: ARTICLE_KINDS.filter((kind) => kinds.has(kind)).map((kind) => ({
      kind,
      count: kinds.get(kind) ?? 0,
    })),
    // Most used first, then alphabetical. Capped: a chip row longer than the
    // results it filters is a worse way to find something than reading the list.
    tags: [...tags]
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
      .slice(0, 20),
  };
}
