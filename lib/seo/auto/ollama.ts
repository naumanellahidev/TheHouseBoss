import "server-only";

import { DESC_MAX, DESC_MIN, trimToWord } from "@/lib/seo/auto/generate";

/**
 * Optional LLM polish for generated SEO copy.
 *
 * ── The one rule this file exists to enforce ──────────────────────────────
 *
 * **A model can never block a publish and can never put a fact on the page
 * that was not already in the record.**
 *
 * Everything below is arranged around that. There is a hard timeout, a single
 * retry, and every response is validated before it is allowed anywhere near a
 * page. A response that fails validation is DISCARDED, not repaired — repairing
 * it would mean guessing which half the model got right.
 *
 * ── Why validation is not optional ────────────────────────────────────────
 *
 * On a property listing, an invented number — a bedroom count, a price, a year
 * built — is misrepresentation under FREC advertising rules. Not a typo, not a
 * style issue. So `containsOnlyKnownNumbers()` rejects any output containing a
 * numeral that does not appear in the source text. It is a blunt check and it
 * is meant to be: the cost of a false rejection is falling back to a perfectly
 * good deterministic description.
 *
 * ── Endpoint ──────────────────────────────────────────────────────────────
 *
 * Written against an OpenAI-compatible `/chat/completions` endpoint, which is
 * what Ollama, Ollama Cloud and most hosted providers expose. Host and model
 * come entirely from env so switching provider is configuration, not code.
 *
 * If `OLLAMA_BASE_URL` points at a machine on a private network it will not be
 * reachable from Vercel — generation then works locally and silently falls back
 * in production. `scripts/seo-check-model.mjs` exists to catch exactly that.
 */

/*
  15s, down from 20.

  Measured against the configured provider: 0.7–1.0s warm, and about 4.5s on
  the first call after an idle period, which is the number that sets this floor.
  Ten seconds looked tempting until the cold-start case was measured; twenty was
  simply twenty seconds of a publish hanging before falling back to text that
  was already sitting in a variable.
*/
const TIMEOUT_MS = 15_000;

/**
 * Headroom, because a REASONING model may be configured.
 *
 * This matters more than it looks. `gpt-oss:20b` emits its chain of thought
 * into a separate `reasoning` field billed against the same budget as the
 * answer — at 900 tokens it still returned `finish_reason: "length"` with
 * **zero characters of content**, having spent the entire allowance thinking
 * about a one-sentence rewrite. Measured across four models:
 *
 *   gemma4:31b            1.5s   158 chars   accepted
 *   glm-5.3-flash         0.7s     0 chars   rejected
 *   nemotron-3-nano:30b   2.5s     0 chars   rejected (finish=length)
 *   mistral-large-3:675b  0.4s     0 chars   rejected
 *
 * So the default in `.env.local` is `gemma4:31b`, a non-reasoning instruct
 * model. A reasoning model is not "slower" at this task, it is unusable — but
 * the budget stays generous so swapping the model in env cannot silently break
 * generation, and the `finish_reason` guard below catches it if it does.
 */
const MAX_TOKENS = 900;

/**
 * Why a rejected response was rejected.
 *
 * Returned rather than logged-and-forgotten so the caller can say something
 * true. "The model's answer was rejected because it contained a number that is
 * not in this listing" is a sentence an operator can act on; silence looks like
 * the feature not working.
 */
export type Rejection =
  | "unconfigured"
  | "unreachable"
  | "rate-limited"
  | "timeout"
  | "truncated"
  | "empty"
  | "length"
  | "formatting"
  | "invented-number";

type Config = { key: string; baseUrl: string; model: string };

function config(): Config | null {
  const key = process.env.OLLAMA_API_KEY?.trim();
  const baseUrl = process.env.OLLAMA_BASE_URL?.trim().replace(/\/+$/, "");
  const model = process.env.OLLAMA_MODEL?.trim();
  if (!key || !baseUrl || !model) return null;
  return { key, baseUrl, model };
}

export function isModelConfigured(): boolean {
  return config() !== null;
}

/**
 * Every numeral in `text` must appear in `source`.
 *
 * Digits are compared after stripping separators, so "1,850" in the source
 * satisfies "1850" in the output. Years, prices, bed and bath counts are all
 * numerals, which is precisely the class of fact a model is most likely to
 * smooth into something plausible and wrong.
 */
function containsOnlyKnownNumbers(text: string, source: string): boolean {
  const normalise = (s: string) => s.replace(/[,\s]/g, "");
  const known = new Set(normalise(source).match(/\d+/g) ?? []);
  const used = normalise(text).match(/\d+/g) ?? [];
  return used.every((n) => known.has(n));
}

/**
 * Reject anything that would look wrong in a `<meta>` tag, and say why.
 *
 * The reason is returned rather than collapsed to a boolean so a rejection is
 * diagnosable. "It quietly used the written version again" is not a report
 * anyone can act on; "the model put in a number this listing does not contain"
 * is — and on a property listing that particular rejection is the one that
 * matters most.
 */
function review(text: string, source: string): "ok" | Rejection {
  const value = text.trim();
  if (value.length < DESC_MIN || value.length > DESC_MAX) return "length";
  // Markdown, quotes and newlines all render literally in a meta description.
  if (/[*_#`\n\r]|^["']|["']$/.test(value)) return "formatting";
  // A model that starts explaining itself has not answered the prompt.
  if (/^(here|sure|certainly|of course)\b/i.test(value)) return "formatting";
  if (!containsOnlyKnownNumbers(value, source)) return "invented-number";
  return "ok";
}

type Completion =
  | { text: string }
  | { error: Rejection; retryAfterMs?: number | null };

async function complete(prompt: string, cfg: Config, temperature: number): Promise<Completion> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.key}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        // Low but not zero: high temperature is where invented facts come from.
        // The retry nudges it up, because a second sample at the SAME
        // temperature is close to a second copy of the first answer — which is
        // what made the old retry a wasted round trip rather than a second
        // chance.
        temperature,
        max_tokens: MAX_TOKENS,
        // Explicit: a streamed body would arrive as SSE and `response.json()`
        // would throw, which the catch below would report as "unreachable".
        stream: false,
        messages: [
          {
            role: "system",
            content:
              "You write meta descriptions for a Florida real-estate site. " +
              "Reply with the description only — no preamble, no quotes, no markdown. " +
              "Between 140 and 158 characters. " +
              "Use ONLY facts present in the input. Never invent a number, a feature or a claim.",
          },
          { role: "user", content: prompt },
        ],
      }),
    });

    /*
      429 is a first-class outcome, not a generic failure.

      The configured provider permits exactly ONE request in flight and answers
      anything more with `{"error":"too many concurrent requests"}`. Folding
      that into "unreachable" meant a publish quietly dropped its polish because
      another publish happened to be a second ahead of it — and the operator saw
      nothing. The caller waits and tries again instead.
    */
    if (response.status === 429) {
      const after = Number(response.headers.get("retry-after"));
      return {
        error: "rate-limited",
        retryAfterMs: Number.isFinite(after) && after > 0 ? after * 1000 : null,
      };
    }

    if (!response.ok) return { error: "unreachable" };
    const data = await response.json();

    /*
      A truncated answer is discarded rather than used. `finish_reason:
      "length"` means the model was cut off mid-sentence, and half a meta
      description is worse than the deterministic one it would replace.
    */
    if (data?.choices?.[0]?.finish_reason === "length") return { error: "truncated" };

    // `reasoning` is deliberately ignored. Only `content` is the answer.
    const text = data?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || text.trim() === "") return { error: "empty" };
    return { text: text.trim() };
  } catch (error) {
    // Timeout, DNS failure, unreachable host, malformed JSON. Separated only so
    // the caller can distinguish "the provider is slow" from "the provider is
    // wrong", which are different problems with different fixes.
    const aborted = error instanceof Error && error.name === "AbortError";
    return { error: aborted ? "timeout" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Improve a description if the model can, otherwise return the one we have.
 *
 * `fallback` is the deterministic output and is ALREADY VALID. This function
 * can only ever return something equally valid or that same string, which is
 * what makes it safe to call from a publish action.
 */
export async function polishDescription(opts: {
  fallback: string;
  /** The record's own text. Nothing outside this may appear in the output. */
  source: string;
  kind: "listing" | "article" | "city" | "community";
}): Promise<{ text: string; usedModel: boolean; rejection?: Rejection }> {
  const cfg = config();
  if (!cfg) {
    return { text: opts.fallback, usedModel: false, rejection: "unconfigured" };
  }

  const prompt =
    `Write a meta description for this ${opts.kind}.

` +
    `${opts.source}

` +
    `A working version is:
${opts.fallback}

` +
    `Improve its readability. Keep every fact identical.`;

  const corpus = `${opts.source} ${opts.fallback}`;
  let last: Rejection = "unreachable";

  /*
    Up to three attempts, and which failures are worth repeating differs.

    - `rate-limited` IS worth repeating, after waiting. The provider allows one
      request in flight and answers a second with 429; two publishes a second
      apart would otherwise both lose their polish silently. This is the case
      that made generation look unreliable.
    - `length` or `formatting` is the model missing on one sample. A second
      sample at a higher temperature is a genuinely different attempt, unlike
      the old unconditional retry at the same temperature, which mostly
      re-rolled the same answer.
    - `timeout` and `unreachable` mean the provider is unwell. Trying again buys
      another fifteen seconds of a publish hanging for the same answer, so it
      stops.
  */
  const temperatures = [0.3, 0.3, 0.6];

  for (let attempt = 0; attempt < temperatures.length; attempt += 1) {
    const result = await complete(prompt, cfg, temperatures[attempt]);

    if ("error" in result) {
      last = result.error;

      if (result.error === "rate-limited") {
        // Exponential, with jitter so several publishes that collided once do
        // not collide again at exactly the same moment.
        const base = result.retryAfterMs ?? 1200 * 2 ** attempt;
        await new Promise((r) => setTimeout(r, base + Math.random() * 400));
        continue;
      }

      if (result.error === "timeout" || result.error === "unreachable") break;
      continue;
    }

    const verdict = review(result.text, corpus);
    if (verdict === "ok") {
      return { text: trimToWord(result.text, DESC_MAX), usedModel: true };
    }
    last = verdict;
  }

  if (process.env.NODE_ENV !== "production") {
    console.info(`[seo] model output not used (${last}); deterministic text stands`);
  }

  return { text: opts.fallback, usedModel: false, rejection: last };
}
