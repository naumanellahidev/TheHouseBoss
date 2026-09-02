import type { MetadataRoute } from "next";

import { siteConfig } from "@/lib/site-config";

/**
 * The client's literal request was a website "recognizable by ChatGPT", so
 * every AI crawler is explicitly welcomed — docs/08-seo-ai-visibility.md § 2.
 *
 * Note the deliberate departure from standard publisher advice. Most sites
 * allow OAI-SearchBot (which indexes for ChatGPT Search) while blocking GPTBot
 * (which collects training data), to protect their content. That is the WRONG
 * call here: she wants to be known, not protected. Both are allowed.
 *
 * Google-Extended is allowed for the same reason — blocking it removes her from
 * AI Overviews entirely.
 */

const AI_AND_SEARCH_BOTS = [
  // OpenAI
  "OAI-SearchBot", // indexes for ChatGPT Search — the client's stated goal
  "ChatGPT-User", // live fetch when a user asks about a page
  "GPTBot", // training data
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  // Google / Apple / Amazon / Microsoft
  "Google-Extended", // gates Gemini and AI Overviews
  "Applebot",
  "Applebot-Extended",
  "Amazonbot",
  "Bingbot",
  // Common Crawl — feeds many downstream models
  "CCBot",
];

const DISALLOW = ["/admin", "/api", "/legal", "/dev"];

export default function robots(): MetadataRoute.Robots {
  // Preview and development deployments must never be indexed.
  if (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production") {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  const allowAll = { allow: "/", disallow: DISALLOW };

  return {
    rules: [
      { userAgent: "*", ...allowAll },
      ...AI_AND_SEARCH_BOTS.map((userAgent) => ({ userAgent, ...allowAll })),
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
