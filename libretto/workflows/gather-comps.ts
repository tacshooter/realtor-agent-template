import { workflow } from "libretto";

/**
 * Gather comparable sold listings for a subject property.
 *
 * Parameters:
 *   ADDRESS      — subject property address
 *   BEDS         — subject property bedrooms
 *   BATHS        — subject property bathrooms
 *   SQFT         — subject property square footage
 *   RADIUS_MILES — search radius (default: 0.5)
 *
 * Output: JSON array of comps with $/sqft calculations.
 */
export default workflow("gather-comps", async ({ page }) => {
  const MLS_URL = process.env.MLS_URL || "{{MLS_URL}}";
  const ADDRESS = process.env.ADDRESS;
  const BEDS = parseInt(process.env.BEDS || "0");
  const BATHS = parseInt(process.env.BATHS || "0");
  const SQFT = parseInt(process.env.SQFT || "0");
  const RADIUS = parseFloat(process.env.RADIUS_MILES || "0.5");

  if (!ADDRESS) {
    throw new Error("ADDRESS is required");
  }

  // Navigate to MLS sold search
  await page.goto(MLS_URL, { waitUntil: "networkidle" });

  // === ADAPT FOR {{MLS_NAME}} ===
  // Most MLS systems have a "sold" search separate from "active" listings.
  // Use libretto interactive builder to capture the workflow.

  // Switch to sold/comps search mode
  await page.click('a:has-text("Sold"), button:has-text("Sold"), [data-mode="sold"]');

  // Set search criteria
  await page.fill('input[name="address"], input[name="location"]', ADDRESS);
  await page.fill('input[name="radius"]', RADIUS.toString());

  if (BEDS) {
    const minBeds = Math.max(1, BEDS - 1);
    const maxBeds = BEDS + 1;
    await page.fill('input[name="minBeds"]', minBeds.toString());
    await page.fill('input[name="maxBeds"]', maxBeds.toString());
  }

  if (SQFT) {
    const minSqft = Math.floor(SQFT * 0.8);
    const maxSqft = Math.ceil(SQFT * 1.2);
    await page.fill('input[name="minSqft"]', minSqft.toString());
    await page.fill('input[name="maxSqft"]', maxSqft.toString());
  }

  // Set sold date range (last 6 months)
  // Adapt to MLS-specific date picker or text input

  await page.click('button[type="submit"]');
  await page.waitForSelector(".search-results, .results-table", { timeout: 15000 });

  // Extract comps
  const comps = await page.evaluate(() => {
    const results: any[] = [];
    const rows = document.querySelectorAll(".result-row, .comp-item, .sold-listing");

    rows.forEach((row) => {
      const priceText = row.querySelector(".sold-price, .close-price")?.textContent?.trim();
      const sqftText = row.querySelector(".sqft")?.textContent?.trim();

      const price = parseInt(priceText?.replace(/[^0-9]/g, "") || "0");
      const sqft = parseInt(sqftText?.replace(/[^0-9]/g, "") || "0");
      const pricePerSqft = sqft > 0 ? Math.round(price / sqft) : 0;

      results.push({
        address: row.querySelector(".address")?.textContent?.trim(),
        soldPrice: price,
        sqft,
        pricePerSqft,
        beds: row.querySelector(".beds")?.textContent?.trim(),
        baths: row.querySelector(".baths")?.textContent?.trim(),
        soldDate: row.querySelector(".sold-date, .close-date")?.textContent?.trim(),
        dom: row.querySelector(".dom")?.textContent?.trim(),
        lotSize: row.querySelector(".lot-size")?.textContent?.trim(),
        yearBuilt: row.querySelector(".year-built")?.textContent?.trim(),
      });
    });

    return results;
  });

  // Calculate summary statistics
  if (comps.length > 0) {
    const avgPricePerSqft =
      comps.reduce((sum: number, c: any) => sum + c.pricePerSqft, 0) / comps.length;

    console.log(
      JSON.stringify({
        subject: { address: ADDRESS, beds: BEDS, baths: BATHS, sqft: SQFT },
        comps,
        summary: {
          count: comps.length,
          avgPricePerSqft: Math.round(avgPricePerSqft),
          suggestedPrice: SQFT > 0 ? Math.round(avgPricePerSqft * SQFT) : null,
        },
      })
    );
  } else {
    console.log(
      JSON.stringify({
        subject: { address: ADDRESS },
        comps: [],
        summary: { count: 0, error: "No comps found within criteria" },
      })
    );
  }
});
