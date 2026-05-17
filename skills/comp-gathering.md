---
name: comp-gathering
description: |
  Pull comparable sales data for a target property. Used for CMAs,
  pricing strategy, and buyer/seller consultations.
triggers:
  - natural language: "pull comps for [address]"
  - natural language: "what are the comps on [address]"
  - natural language: "CMA for [address]"
  - invoked by: daily-briefing (when realtor asks for comps on a briefing item)
---

# Comp Gathering

Pull comparable sold listings for a target property to support pricing decisions.

## Procedure

1. **Identify the subject property**: Get address from the request. If it was mentioned in a briefing or listing search, pull its specs from the PostgreSQL cache. Otherwise, run a targeted MLS search to get the property details.

2. **Define comp criteria**:
   - **Radius**: 0.5 miles (urban/suburban) or 1 mile (rural)
   - **Timeframe**: Sold within last 6 months
   - **Specs**: ±20% square footage, ±1 bed, ±1 bath
   - **Property type**: Same as subject (single-family, condo, etc.)

3. **Run the Libretto workflow**: `libretto run src/workflows/gather-comps.ts` with subject property details as parameters. The workflow searches MLS sold listings, pulls tax records for assessment data, and may check Zillow/Redfin for additional context.

4. **Calculate metrics**:
   - Price per square foot for each comp
   - Average $/sqft across all comps
   - Price range (low-high)
   - Days on market for each comp (pre-sale)

5. **Present comp table**:

```
📊 Comps for [subject address] ([beds]BR/[baths]BA, [sqft]sqft)

Comparable solds (last 6 months, within 0.5 miles):
┌──────────────────────────────────────────────────────────┐
│ Address          │ Sold     │ $/sqft  │ DOM  │ Notes     │
├──────────────────┼──────────┼─────────┼──────┼───────────┤
│ [comp 1]         │ $[price] │ $[xx]   │ [n]  │ [notes]   │
│ [comp 2]         │ $[price] │ $[xx]   │ [n]  │           │
│ [comp 3]         │ $[price] │ $[xx]   │ [n]  │           │
└──────────────────┴──────────┴─────────┴──────┴───────────┘

📈 Average: $[avg]/sqft
📉 Range: $[low] – $[high]
💡 Suggested list price: $[suggested] (based on [avg] × [sqft])

Active competition:
• [active listing 1] — $[price] ([DOM] days)
• [active listing 2] — $[price] ([DOM] days)
```

6. **Flag concerns**: If comps are thin (fewer than 3), note it. If there's an outlier comp, explain why it might not be a true comparable.

## Rules

- Always include at least 3 comps. If fewer than 3 qualify, widen radius to 1 mile and note it.
- Flag any comp older than 6 months as "aged" — still useful context but less weight
- Include active listings as competitive context
- Never present a suggested price without the $/sqft methodology visible
- County tax assessed values are NOT market values — note this if pulling from appraisal district
