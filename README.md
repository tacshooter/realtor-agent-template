# Hermes Agent — Realtor Assistant

This is the Hermes Agent configuration and skill set for the Realtor Assistant product.

## Structure

- `hermes/` — Hermes Agent config template with {{PLACEHOLDER}} variables
- `skills/` — Agent skill definitions (SOPs packaged as markdown)
- `context/` — Realtor-specific context files (profile, market, clients)
- `libretto/` — Libretto browser automation workflows (TypeScript)
- `db/` — PostgreSQL schema for property cache, clients, alerts

## Provisioning

Clone this repo, replace placeholders, and run `libretto setup`.

```bash
git clone https://github.com/tacshooter/realtor-agent-template.git /opt/realtor-agent
cd /opt/realtor-agent

# Replace placeholders
sed -i "s/{{REALTOR_NAME}}/Jane Doe/g" hermes/config.yaml context/*.md
sed -i "s/{{REALTOR_EMAIL}}/jane@cbdfw.com/g" context/*.md
sed -i "s/{{TELEGRAM_USERNAME}}/@jane_realtor/g" hermes/config.yaml
sed -i "s/{{MLS_URL}}/https://ntreis.mls.com/g" context/*.md libretto/workflows/*.ts

# Install Libretto + Playwright
npm install
libretto setup

# Start Hermes
pm2 start hermes --name "realtor-agent"
pm2 save
```

## Skills

| Skill | Trigger | What It Does |
|-------|---------|-------------|
| `daily-briefing` | Cron, 7 AM | Morning summary: new listings, price drops, expiring, client matches |
| `mls-search` | "Find 4BR homes under $700K in Frisco" | MLS search + structured results |
| `comp-gathering` | "Pull comps for 1402 Elm St" | Sold comps within 0.5mi, 6mo, similar specs |
| `tax-record-pull` | "What are the taxes on 887 Oak Bend?" | County appraisal district lookup |
| `listing-alert` | Cron, every 2h | New listings, price drops, status changes |
| `client-match` | After any search | Cross-reference listings against client criteria |
