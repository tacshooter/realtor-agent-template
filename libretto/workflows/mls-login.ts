import { workflow } from "libretto";

/**
 * MLS Login — establishes a persistent browser session for {{MLS_NAME}}.
 * Run this first, or the agent will be prompted for credentials at runtime.
 *
 * Credentials are passed via environment variables:
 *   MLS_USERNAME — MLS login username
 *   MLS_PASSWORD — MLS login password
 *   MLS_URL      — {{MLS_URL}}
 *
 * The session is saved to .libretto/sessions/mls-session/ for reuse.
 */
export default workflow("mls-login", async ({ page }) => {
  const MLS_URL = process.env.MLS_URL || "{{MLS_URL}}";
  const MLS_USERNAME = process.env.MLS_USERNAME;
  const MLS_PASSWORD = process.env.MLS_PASSWORD;

  if (!MLS_USERNAME || !MLS_PASSWORD) {
    throw new Error(
      "MLS_USERNAME and MLS_PASSWORD must be set in environment"
    );
  }

  await page.goto(MLS_URL, { waitUntil: "networkidle" });

  // === ADAPT THIS SECTION FOR EACH MLS ===
  // Replace the selectors below with the actual login form elements
  // for {{MLS_NAME}}. Use libretto snapshot to inspect the page.

  // Example: typical MLS login form
  await page.fill('input[name="username"]', MLS_USERNAME);
  await page.fill('input[name="password"]', MLS_PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for successful login (adapt selector to your MLS)
  await page.waitForSelector(".dashboard, .search-form, .member-home", {
    timeout: 15000,
  });

  console.log("✅ MLS login successful — session saved");
});
