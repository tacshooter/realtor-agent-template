---
name: daily-briefing
description: |
  Morning briefing for {{REALTOR_NAME}} — new listings, price drops,
  expiring listings, and client matches. Runs at 7:00 AM local time.
triggers:
  - cron: "0 7 * * *" (America/Chicago)
  - on-demand: "what's new today" / "morning briefing" / "daily update"
---

# Daily Briefing

Produce a concise morning briefing covering the last 24 hours of market activity in {{REALTOR_NAME}}'s farm areas.

## Procedure

1. **Load context**: Read `context/market-context.md` for farm areas, price ranges, and property types. Read `context/client-roster.md` for active client criteria.

2. **Pull new listings**: Invoke the `mls-search` skill for each farm area, filtering for listings added/modified in the last 24 hours.

3. **Pull price drops**: Query the property cache (PostgreSQL) for any active listings whose price decreased since yesterday.

4. **Check expiring listings**: Query MLS for listings with expiration dates within the next 7 days in farm areas.

5. **Match clients**: For each new or price-dropped listing, run the `client-match` skill to cross-reference against active client criteria.

6. **Compose briefing**:

```
Good morning {{REALTOR_NAME}}. Here's your [day] briefing:

🏠 [N] new listings in [farm areas]
   • [address] — [beds]BR/[baths]BA, [sqft]sqft, $[price] ([DOM] days)
   • ...

📉 [N] price drops
   • [address] — was $[old], now $[new] (-[pct]%)
   • ...

⏰ [N] expiring soon
   • [address] — expires [date]

👤 [N] client matches
   • [client name] matched on [address] — [reason]

Want me to pull comps on any of these?
```

7. **Deliver** via Telegram DM.

## Rules

- Keep it scannable — {{REALTOR_NAME}} reads this on her phone, often while driving
- Always include DOM (days on market) for context
- Highlight anything urgent: listings expiring today, major price drops (10%+)
- If nothing changed, say so: "Quiet morning — no new listings or price drops. 3 properties expiring next week."
- Never invent data. If a query returns empty, say "No new listings in Frisco today."
