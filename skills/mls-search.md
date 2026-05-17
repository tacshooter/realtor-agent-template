---
name: mls-search
description: |
  Search the MLS for active listings matching criteria.
  Handles MLS login, search execution, and result extraction.
triggers:
  - natural language: "find [X]BR homes in [area] under $[price]"
  - natural language: "search for [criteria]"
  - natural language: "what's available in [area]"
  - invoked by other skills: daily-briefing, comp-gathering, client-match
---

# MLS Search

Search {{REALTOR_NAME}}'s MLS for active listings matching specified criteria.

## Procedure

1. **Parse the request**: Extract search parameters from the user's message:
   - Location (city, zip, neighborhood, or "farm areas" → use `context/market-context.md`)
   - Price range (min/max)
   - Beds/baths
   - Square footage
   - Property type (single-family, condo, townhouse, land)
   - Any must-have features (pool, garage, school district)

2. **Run the Libretto workflow**: Invoke `libretto run src/workflows/search-listings.ts` with the parsed parameters as environment variables.

3. **Parse results**: The workflow returns JSON. Extract and format.

4. **Present results**: List matching properties with key stats.

```
🏠 [N] listings found in [area] under $[max]:

1. 📍 [address] — $[price]
   [beds]BR/[baths]BA • [sqft]sqft • [lot] lot
   🏫 [school district]
   📅 Listed [date] • [DOM] days on market
   ✨ [notable features]

2. ...
```

5. **Cache results**: Store all listing data in PostgreSQL `properties` table for future reference and change detection.

## Rules

- If search returns 0 results, widen criteria and tell the realtor: "No 4BR homes under $500K in Frisco. There are 3 under $550K — want me to show those?"
- If search returns 20+ results, offer to narrow: "Found 27 listings. Want me to filter by school district, pool, or lot size?"
- Always mention DOM — it's the single most important signal for listing freshness
- Cache all results in PostgreSQL so the `listing-alert` skill can detect changes
- If MLS login fails, alert immediately: "⚠️ MLS login failed — I'll need you to re-authenticate. Please reply with your credentials."

## Credential Security

MLS credentials are stored encrypted in PostgreSQL (`pgcrypto` extension). The Libretto workflow retrieves them at runtime via environment variables — never hard-coded in the script.
