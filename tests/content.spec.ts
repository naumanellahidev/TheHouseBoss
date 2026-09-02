import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";

/**
 * Phase 4 — the content system, city hubs and communities.
 *
 * The article half runs signed in and writes a real article through the real
 * editor; the public half checks the pages that content produces.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ADMIN_EMAIL = process.env.ADMIN_TEST_EMAIL;
const CONFIGURED = Boolean(SUPABASE_URL && SERVICE_KEY && ADMIN_EMAIL);

const TITLE = `Verification article ${Date.now().toString(36)}`;

test.describe("city hubs", () => {
  test("every city has a live page with content", async ({ page }) => {
    const slugs = [
      "lake-mary",
      "longwood",
      "sanford",
      "casselberry",
      "orlando",
      "altamonte-springs",
      "winter-springs",
      "oviedo",
    ];

    for (const slug of slugs) {
      const response = await page.goto(`/${slug}`, { waitUntil: "load" });
      expect(response?.status(), `${slug} should be live`).toBe(200);

      await expect(page.locator("h1")).toHaveCount(1);

      // "Content" means more than a heading: the body copy has to be there.
      const words = (await page.locator("main").innerText()).split(/\s+/).length;
      expect(words, `${slug} should have real content`).toBeGreaterThan(150);
    }
  });

  test("the FAQ accordion text and the FAQPage markup are identical", async ({
    page,
  }) => {
    await page.goto("/lake-mary");

    const blocks = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    const faqGraph = blocks
      .map((block) => JSON.parse(block))
      .find((graph) => graph["@type"] === "FAQPage");

    expect(faqGraph, "a FAQPage graph should be present").toBeTruthy();

    // Every marked-up question must be visible on the page. Marking up a
    // question that is not shown is a policy violation (docs/08 § 6).
    for (const entry of faqGraph.mainEntity) {
      await expect(
        page.getByRole("button", { name: entry.name }),
        `"${entry.name}" is in the markup and must be on the page`,
      ).toBeVisible();
    }

    const visible = await page.getByRole("button", { name: /\?$/ }).count();
    expect(visible).toBe(faqGraph.mainEntity.length);
  });

  test("a city with statistics shows the date they were true", async ({ page }) => {
    await page.goto("/lake-mary");

    // The seed deliberately carries no invented statistics, so the tiles are
    // absent. If any figure IS shown, it must carry its "as of" date — that is
    // the rule this asserts either way.
    const tiles = page.getByText("Median price", { exact: true });
    if ((await tiles.count()) > 0) {
      await expect(page.getByText(/Data as of/)).toBeVisible();
    }
  });

  test("the Lake Mary hub links to its blog and communities", async ({ page }) => {
    await page.goto("/lake-mary");
    await expect(page.getByRole("link", { name: /See homes for sale/ })).toBeVisible();

    const response = await page.goto("/lake-mary/communities");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("link", { name: /Heathrow/ }).first()).toBeVisible();
  });

  test("the Heathrow community page renders and 404s are real", async ({ page }) => {
    const ok = await page.goto("/communities/heathrow");
    expect(ok?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Heathrow");

    const missing = await page.goto("/communities/not-a-community");
    expect(missing?.status()).toBe(404);
  });

  test("city markdown renders as real headings, not raw characters", async ({
    page,
  }) => {
    await page.goto("/sanford");
    const body = await page.locator("main").innerText();

    // If markdown were being dumped as text, the source characters would show.
    expect(body).not.toContain("## ");
    await expect(page.getByRole("heading", { name: "Schools" })).toBeVisible();
  });
});

test.describe("article lifecycle", () => {
  test.skip(!CONFIGURED, "set ADMIN_TEST_EMAIL and SUPABASE_SERVICE_ROLE_KEY");
  test.use({ storageState: ADMIN_STATE });
  test.describe.configure({ mode: "serial" });

  let articleId: string | null = null;

  test.afterAll(async () => {
    if (!CONFIGURED) return;
    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    await db.from("articles").delete().eq("title", TITLE);
  });

  test("an article can be written and saved as a draft", async ({ page }) => {
    await page.goto("/admin/articles/new");

    // "Title" alone also matches "Meta title"; the required marker is part of
    // the accessible name, which makes this unambiguous.
    await page.getByRole("textbox", { name: "Title Required" }).fill(TITLE);

    // Type into the real Tiptap surface rather than stubbing the document.
    const editor = page.locator(".ProseMirror");
    await editor.click();
    await editor.pressSequentially(
      "This article exists only to prove the content system works end to end. " +
        "It is written through the real editor, saved through the real action, " +
        "previewed through the real template and then deleted again. ",
    );
    await page.keyboard.press("Enter");
    await editor.pressSequentially(
      "A second paragraph, so the body clears the minimum length the publish " +
        "checklist requires before an article can go live.",
    );

    await page.getByRole("button", { name: "Save draft" }).click();

    await expect(page).toHaveURL(/\/admin\/articles\/[0-9a-f-]{36}\/edit/, {
      timeout: 20_000,
    });
    articleId = page.url().match(/articles\/([0-9a-f-]{36})\//)?.[1] ?? null;
    expect(articleId).toBeTruthy();
  });

  test("the H1 button is not offered — the page title owns the only h1", async ({
    page,
  }) => {
    test.skip(!articleId, "the draft was not created");
    await page.goto(`/admin/articles/${articleId}/edit`);

    await expect(page.getByRole("button", { name: "Heading 2" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Heading 3" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Heading 1" })).toHaveCount(0);
  });

  test("publish is blocked until the checklist passes", async ({ page }) => {
    test.skip(!articleId, "the draft was not created");
    await page.goto(`/admin/articles/${articleId}/edit`);

    // Excerpt and meta description are still missing.
    await expect(page.getByRole("button", { name: "Publish" })).toBeDisabled();

    await page.getByLabel("Excerpt").fill("Proving the content system works end to end.");
    await page
      .getByLabel("Meta description")
      .fill(
        "An automated verification article for the Phase 4 content system. Deleted as soon as the test finishes.",
      );

    await expect(page.getByRole("button", { name: "Publish" })).toBeEnabled();
  });

  test("a draft previews in the real public template", async ({ page }) => {
    test.skip(!articleId, "the draft was not created");

    const response = await page.goto(`/admin/preview/article/${articleId}`);
    expect(response?.status()).toBe(200);

    await expect(page.getByText("Draft preview")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(TITLE);

    // The preview must not be indexable.
    const robots = await page.locator('meta[name="robots"]').getAttribute("content");
    expect(robots).toContain("noindex");
  });

  test("publishing makes it live, and the public page renders it", async ({ page }) => {
    test.skip(!articleId, "the draft was not created");

    await page.goto(`/admin/articles/${articleId}/edit`);
    await page.getByLabel("Excerpt").fill("Proving the content system works end to end.");
    await page
      .getByLabel("Meta description")
      .fill(
        "An automated verification article for the Phase 4 content system. Deleted as soon as the test finishes.",
      );

    await page.getByRole("button", { name: "Publish" }).click();
    await expect(page.getByText("Article published.")).toBeVisible({ timeout: 20_000 });

    const db = createClient(SUPABASE_URL!, SERVICE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await db
      .from("articles")
      .select("slug, status, published_at, body_text, reading_min")
      .eq("id", articleId!)
      .single();

    expect(data?.status).toBe("published");
    expect(data?.published_at).toBeTruthy();

    // The database trigger flattened the Tiptap document and computed the
    // reading time — neither is written by application code.
    expect(data?.body_text).toContain("end to end");
    expect(data?.reading_min).toBeGreaterThanOrEqual(1);

    // Revalidation means the public page is live immediately, not in an hour.
    const response = await page.goto(`/market-updates/${data!.slug}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(TITLE);
    await expect(page.locator("h1")).toHaveCount(1);
  });
});
