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

const TIMEOUT_MS = 20_000;

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

/** Reject anything that would look wrong in a `<meta>` tag. */
function isUsable(text: string, source: string): boolean {
  const value = text.trim();
  if (value.length < DESC_MIN || value.length > DESC_MAX) return false;
  // Markdown, quotes and newlines all render literally in a meta description.
  if (/[*_#`\n\r]|^["']|["']$/.test(value)) return false;
  // A model that starts explaining itself has not answered the prompt.
  if (/^(here|sure|certainly|of course)\b/i.test(value)) return false;
  return containsOnlyKnownNumbers(value, source);
}

async function complete(prompt: string, cfg: Config): Promise<string | null> {
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
        temperature: 0.3,
        max_tokens: MAX_TOKENS,
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

    if (!response.ok) return null;
    const data = await response.json();

    /*
      A truncated answer is discarded rather than used. `finish_reason:
      "length"` means the model was cut off mid-sentence, and half a meta
      description is worse than the deterministic one it would replace.
    */
    if (data?.choices?.[0]?.finish_reason === "length") return null;

    // `reasoning` is deliberately ignored. Only `content` is the answer.
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === "string" ? text.trim() : null;
  } catch {
    // Timeout, DNS failure, unreachable host, malformed JSON — all the same
    // outcome here: no polish, deterministic output stands.
    return null;
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
}): Promise<{ text: string; usedModel: boolean }> {
  const cfg = config();
  if (!cfg) return { text: opts.fallback, usedModel: false };

  const prompt =
    `Write a meta description for this ${opts.kind}.\n\n` +
    `${opts.source}\n\n` +
    `A working version is:\n${opts.fallback}\n\n` +
    `Improve its readability. Keep every fact identical.`;

  // One retry. A second failure means the endpoint is unwell, not unlucky, and
  // a publish should not wait 24 seconds to find that out.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const raw = await complete(prompt, cfg);
    if (raw && isUsable(raw, `${opts.source} ${opts.fallback}`)) {
      return { text: trimToWord(raw, DESC_MAX), usedModel: true };
    }
  }

  return { text: opts.fallback, usedModel: false };
}
