---
name: tax-record-pull
description: |
  Look up property tax records from the county appraisal district.
  Returns assessed value, tax rate, exemptions, and tax history.
triggers:
  - natural language: "what are the taxes on [address]"
  - natural language: "tax records for [address]"
  - natural language: "pull tax info on [address]"
  - invoked by: comp-gathering (supplementary data)
---

# Tax Record Pull

Pull official property tax records from the county appraisal district website.

## Procedure

1. **Identify the property**: Get address from the request. If this was called from `comp-gathering`, the address is already provided.

2. **Determine the county**: Based on the property address. Most DFW properties are in Collin, Denton, Dallas, or Tarrant counties. Each has its own appraisal district portal.

3. **Run the Libretto workflow**: `libretto run src/workflows/pull-tax-records.ts -- --address "[address]" --county "[county]"`. The workflow navigates the appraisal district portal, searches by address, and extracts the tax record.

4. **Extract key data points**:
   - Assessed value (land + improvements)
   - Tax rate (total, including school, city, county, special districts)
   - Annual tax amount
   - Exemptions (homestead, over-65, disabled veteran, etc.)
   - Tax history (last 3 years if available)
   - Property characteristics from appraisal record (sqft, year built, lot size — useful for verifying MLS data)

5. **Present results**:

```
🏛️ Tax Records: [address]

Assessed Value: $[value] ([year])
  • Land: $[land]
  • Improvements: $[improvements]

Tax Rate: [rate]% ($[amount]/yr)
  • School: [rate]%
  • City: [rate]%
  • County: [rate]%

Exemptions:
  • Homestead: Yes ($[amount] savings)
  • Other: [list]

History:
  • [year-2]: $[amount]
  • [year-1]: $[amount]
  • [year]: $[amount]

⚠️ Assessed value ≠ market value. The county's appraisal is typically [above/below] market.
```

6. **Cache**: Store tax records in PostgreSQL `tax_records` table. Tax data changes slowly — refresh only if the record is older than 6 months.

## Rules

- Always note the gap between assessed and market value
- If the property has a homestead exemption, note that the new owner will NOT inherit it — taxes will reset to market rate
- If multiple appraisal districts could apply (rare in DFW), ask which county
- Tax data is public record — no credential needed for most counties. If a county requires a login, use the realtor's credentials from the encrypted store.
