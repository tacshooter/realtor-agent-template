---
name: listing-alert
description: |
  Monitors for listing changes — new listings, price drops, status changes,
  back-on-market — and alerts {{REALTOR_NAME}} when criteria are matched.
triggers:
  - cron: "0 8-20/2 * * *" (every 2 hours during business hours, America/Chicago)
  - on-demand: "any new listings?" / "any price drops?"
---

# Listing Alert

Periodic monitoring of MLS for listing changes that match {{REALTOR_NAME}}'s saved criteria.

## Procedure

1. **Load saved searches**: Query PostgreSQL `saved_searches` table for active search criteria. Include farm area defaults from `context/market-context.md`.

2. **Run searches**: For each saved search, invoke `mls-search` and compare results against the `properties` cache table.

3. **Detect changes**:
   - **New**: Listing appears in search results but not in cache → new listing
   - **Price drop**: Price decreased since last cached value
   - **Status change**: Active → Pending, Pending → Active (back on market), Active → Sold
   - **Expiring soon**: DOM approaching typical listing agreement term (90 or 180 days)

4. **Alert if significant**: Only alert on meaningful events. Don't ping the realtor for every status change — batch them:

```
🔔 Listing Alerts — [timestamp]

🆕 New: [address] — $[price] ([beds]BR, [sqft]sqft) — just listed
📉 Price drop: [address] — was $[old], now $[new] (-[pct]%, [DOM] days)
🔄 Back on market: [address] — $[price] (was pending)
```

5. **Update cache**: Write new/updated listing data to PostgreSQL `properties` table.

## Rules

- Only alert during waking hours (8 AM – 9 PM local). Queue overnight changes for the morning briefing.
- Don't alert for every price drop — threshold: 3%+ or $10,000+, whichever is lower
- Batch alerts — send at most one Telegram message per check interval, even if there are 20 changes
- If a listing has been flagged before, don't re-alert unless the change is new
- Track alert history in PostgreSQL `alerts` table to avoid duplicates
