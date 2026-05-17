import { workflow } from "libretto";

/**
 * Search MLS listings by criteria.
 *
 * Parameters (via environment or command-line args):
 *   AREA         — city, zip, or neighborhood
 *   MIN_PRICE    — minimum price (optional)
 *   MAX_PRICE    — maximum price (optional)
 *   MIN_BEDS     — minimum bedrooms (optional)
 *   MIN_BATHS    — minimum bathrooms (optional)
 *   MIN_SQFT     — minimum square footage (optional)
 *   PROP_TYPE    — "single-family", "condo", "townhouse", "land" (optional)
 *   MAX_RESULTS  — maximum results to return (default: 25)
 *
 * Output: JSON array of listings to stdout.
 */
export default workflow("search-listings", async ({ page }) => {
  const MLS_URL = process.env.MLS_URL || "{{MLS_URL}}";
  const AREA = process.env.AREA;
  const MAX_PRICE = process.env.MAX_PRICE;
  const MIN_BEDS = process.env.MIN_BEDS;
  const MIN_BATHS = process.env.MIN_BATHS;
  const PROP_TYPE = process.env.PROP_TYPE || "single-family";

  if (!AREA) {
    throw new Error("AREA is required (city, zip, or neighborhood)");
  }

  await page.goto(MLS_URL, { waitUntil: "networkidle" });

  // === ADAPT THIS SECTION FOR EACH MLS ===
  // Use libretto interactive workflow building to capture the actual
  // search form interaction for {{MLS_NAME}}.

  // Example: typical MLS search form
  await page.fill('input[name="area"]', AREA);
  if (MAX_PRICE) await page.fill('input[name="maxPrice"]', MAX_PRICE);
  if (MIN_BEDS) await page.selectOption('select[name="beds"]', MIN_BEDS);
  if (MIN_BATHS) await page.selectOption('select[name="baths"]', MIN_BATHS);
  await page.selectOption('select[name="propertyType"]', PROP_TYPE);
  await page.click('button[type="submit"]');

  // Wait for results
  await page.waitForSelector(".search-results, .listing-grid, .results-table", {
    timeout: 15000,
  });

  // === EXTRACTION LOGIC — adapt to MLS result format ===
  // Strategy: prefer passive network interception for structured data.
  // If the MLS loads results via XHR/fetch, capture those responses.
  // Fall back to DOM scraping if no internal API is found.

  const listings = await page.evaluate(() => {
    const results: any[] = [];
    const cards = document.querySelectorAll(
      ".listing-card, .property-row, .result-item"
    );

    cards.forEach((card) => {
      results.push({
        address: card.querySelector(".address, .street-address")?.textContent?.trim(),
        price: card.querySelector(".price, .list-price")?.textContent?.trim(),
        beds: card.querySelector(".beds")?.textContent?.trim(),
        baths: card.querySelector(".baths")?.textContent?.trim(),
        sqft: card.querySelector(".sqft, .square-feet")?.textContent?.trim(),
        lotSize: card.querySelector(".lot-size, .acreage")?.textContent?.trim(),
        dom: card.querySelector(".dom, .days-on-market")?.textContent?.trim(),
        mlsId: card.querySelector(".mls-id, .listing-id")?.textContent?.trim(),
        status: card.querySelector(".status")?.textContent?.trim(),
      });
    });

    return results;
  });

  console.log(JSON.stringify(listings));
});
