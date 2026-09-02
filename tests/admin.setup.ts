import { createClient } from "@supabase/supabase-js";
import { expect, test as setup } from "@playwright/test";

import { ADMIN_STATE } from "./auth-state";

/**
 * Signs in once and saves the session for the admin suite.
 *
 * A magic-link token is single-use AND Supabase keeps only one outstanding
 * token per address, so generating a fresh link inside every test made the
 * suite race against itself — whichever worker generated last invalidated the
 * others. Signing in once here and reusing the storage state removes the race
 * and takes about a minute off the run.
 *
 * The token is still redeemed through OUR callback route, exactly as a person
 * clicking the emailed link would, so the auth path is genuinely exercised
 * rather than stubbed.
 */

setup("authenticate as the admin", async ({ page }) => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const email = process.env.ADMIN_TEST_EMAIL;

  setup.skip(
    !url || !serviceKey || !email,
    "set ADMIN_TEST_EMAIL and SUPABASE_SERVICE_ROLE_KEY to run the admin suite",
  );

  const admin = createClient(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email!,
  });
  if (error || !data.properties) {
    throw new Error(`could not generate a magic link: ${error?.message}`);
  }

  // Our own callback, not Supabase's `action_link`: that one redirects to the
  // project's configured Site URL, which is not this test server.
  await page.goto(
    `/admin/auth/callback?token_hash=${data.properties.hashed_token}&type=magiclink&next=/admin`,
  );

  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByRole("heading", { name: "Needs attention" })).toBeVisible();

  await page.context().storageState({ path: ADMIN_STATE });
});
