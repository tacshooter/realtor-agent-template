import { workflow } from "libretto";

/**
 * Pull property tax records from county appraisal district.
 *
 * Parameters:
 *   ADDRESS — full street address
 *   COUNTY  — county name (determines which appraisal district portal to use)
 *
 * Output: JSON tax record to stdout.
 */
export default workflow("pull-tax-records", async ({ page }) => {
  const ADDRESS = process.env.ADDRESS;
  const COUNTY = process.env.COUNTY || "collin";

  if (!ADDRESS) {
    throw new Error("ADDRESS is required");
  }

  // County appraisal district URL map (DFW metro)
  const CAD_URLS: Record<string, string> = {
    collin: "https://www.collincad.org/property-search",
    denton: "https://www.dentoncad.com/property-search",
    dallas: "https://www.dallascad.org/Search",
    tarrant: "https://www.tad.org/property-search",
  };

  const cadUrl = CAD_URLS[COUNTY.toLowerCase()];
  if (!cadUrl) {
    throw new Error(`Unknown county: ${COUNTY}. Known: ${Object.keys(CAD_URLS).join(", ")}`);
  }

  await page.goto(cadUrl, { waitUntil: "networkidle" });

  // === ADAPT FOR EACH COUNTY ===
  // Appraisal district search forms vary. Use libretto interactive
  // workflow builder for each county.

  await page.fill('input[name="address"], input[name="searchText"]', ADDRESS);
  await page.click('button[type="submit"], input[type="submit"]');
  await page.waitForSelector(".property-detail, .search-results, .parcel-info", {
    timeout: 15000,
  });

  // Extract tax data
  const taxData = await page.evaluate(() => {
    const getText = (sel: string) => document.querySelector(sel)?.textContent?.trim();

    return {
      address: getText(".property-address, .owner-address"),
      owner: getText(".owner-name"),
      assessedValue: getText(".assessed-value, .total-value"),
      landValue: getText(".land-value"),
      improvementValue: getText(".improvement-value"),
      taxRate: getText(".tax-rate, .total-rate"),
      annualTax: getText(".annual-tax, .tax-amount"),
      exemptions: getText(".exemptions, .exemption-list"),
      yearBuilt: getText(".year-built"),
      sqft: getText(".living-area, .sqft"),
      lotSize: getText(".lot-size, .acreage"),
      legalDescription: getText(".legal-description"),
    };
  });

  console.log(JSON.stringify(taxData));
});
