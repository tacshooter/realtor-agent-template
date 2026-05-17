---
name: client-match
description: |
  Cross-references new or updated listings against active client criteria.
  Scores matches and surfaces the best opportunities.
triggers:
  - invoked by: daily-briefing (automatic after new listing search)
  - invoked by: mls-search (when realtor asks "do any of my clients match?")
  - on-demand: "match my clients against [listing/area]"
---

# Client Match

Match listings against {{REALTOR_NAME}}'s active buyer clients to surface opportunities.

## Procedure

1. **Load client data**: Read `context/client-roster.md` for active buyers, their criteria, and status. This file should be kept current — encourage the realtor to update it via simple Telegram messages: "Update client Mike Smith: budget now $550K, needs pool."

2. **Get listings**: Either from the most recent search results, daily briefing data, or a specific listing the realtor asked about.

3. **Score each client-listing pair**:
   - **Must-have match** (30 pts each): budget range, location, beds, baths
   - **Nice-to-have match** (10 pts each): school district, pool, garage, lot size, style
   - **Dealbreaker penalty** (-100): listing violates a hard no (e.g., "no HOA", "must have 2-car garage")

4. **Rank and present**:

```
👤 Client Matches for [N] new listings:

🔥 Strong Match: Mike & Sarah → 1402 Elm St
   ✅ Budget: $550K (listing $525K) — under budget!
   ✅ Location: Frisco ISD (exact match)
   ✅ 4BR/3BA (matches criteria)
   ⚠️ No pool (nice-to-have, not required)
   Score: 90/100

🟡 Possible: Jennifer → 887 Oak Bend
   ✅ Budget: $600K (listing $585K)
   ✅ 3BR/2BA (matches)
   ⚠️ Prosper ISD (preferred Frisco but open)
   Score: 65/100

❌ No match: Tom → none of today's listings meet his $300K budget in Allen.
```

5. **Call to action**: For strong matches (80+), suggest: "Want me to pull comps on 1402 Elm St for Mike & Sarah?"

## Rules

- Never fabricate client preferences. Only match against documented criteria.
- Don't spam — only show matches with a score of 50+ out of 100
- If a client has been matched to the same listing before, don't re-flag unless something changed (price drop, status change)
- Track matches in PostgreSQL `client_matches` table for history and de-duplication
