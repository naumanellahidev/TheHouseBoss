/**
 * Run async work with a bounded number in flight.
 *
 * ── Why not `Promise.all` ─────────────────────────────────────────────────
 *
 * Because every task here may make a model call. `Promise.all` over 25 listings
 * opens 25 concurrent requests, which is the reliable way to get rate-limited
 * by a provider and end up with a batch that half-worked and no record of which
 * half.
 *
 * ── Why not a plain loop ──────────────────────────────────────────────────
 *
 * That is what this replaces, and it was slow for no benefit. Twenty-five
 * records at roughly a second and a half each is nearly forty seconds of a
 * server action doing nothing but waiting on a socket. At four in flight the
 * same batch finishes in about ten — comfortably inside a serverless timeout
 * instead of flirting with it.
 *
 * Four is the number because it is well under any provider's concurrency limit
 * and still four times faster. It is not tuned to a benchmark; it is chosen to
 * be obviously safe.
 *
 * Results come back in INPUT ORDER regardless of completion order, so a caller
 * reporting "generated 18 of 25" can still say which eighteen.
 */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const runners = Array.from(
    { length: Math.min(Math.max(1, limit), items.length) },
    async () => {
      for (;;) {
        const index = next;
        next += 1;
        if (index >= items.length) return;
        results[index] = await worker(items[index], index);
      }
    },
  );

  await Promise.all(runners);
  return results;
}

/**
 * ONE in flight.
 *
 * Measured against the configured provider, not assumed. Four concurrent
 * requests to Ollama Cloud return, all four:
 *
 *   429 {"error":"too many concurrent requests"}
 *
 * and the burst then trips a cooldown that makes the NEXT few sequential
 * requests fail too. A backfill run at four-way concurrency produced 1 polished
 * description out of 15; the same run sequentially produced 9.
 *
 * So parallelism is not the speed lever here and this pool exists to hold the
 * line at one rather than to raise it. It stays as a pool, and stays
 * configurable, because the provider is env-driven — point `OLLAMA_BASE_URL` at
 * something that permits concurrency and this is the one number to change.
 *
 * Latency, measured sequentially: 0.7–1.0s warm, ~4.5s on the first call after
 * an idle period. `max_tokens` makes no observable difference, which is why it
 * was not lowered as a speed measure.
 */
export const SEO_CONCURRENCY = Number(process.env.SEO_CONCURRENCY ?? 1) || 1;
