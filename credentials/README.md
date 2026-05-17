# Credential Setup (one-time, done by admin — NOT by realtors)

## Google OAuth (Gmail + Calendar)

Already set up. Uses Desktop OAuth app `fergusonhouse-488823`.
Client ID: `1023681141647-cii4gdg1mvn3hajpd60sacoh4m5dir89.apps.googleusercontent.com`

**Per-realtor flow:** The agent generates an auth URL → realtor clicks → Allow → token stored locally.

**To add a new realtor as a test user** (while app is in Testing mode):
1. Go to https://console.cloud.google.com/auth/audience
2. Add their email under "Test users"
3. Save

**To move to production** (required before 100+ users):
1. Go to https://console.cloud.google.com/auth/branding
2. Complete OAuth consent screen verification
3. Submit for Google review

---

## Microsoft 365 OAuth (Outlook + Calendar)

**Set up** in Ferg's Azure tenant. App: "KSF Virtual Assistant"

- Client ID: `f8518e0b-5971-4d3f-9569-e2d71a2804bd`
- Tenant ID: `c1555c81-dd1c-4523-a4cb-3c0cfe17ee80`
- Multi-tenant: yes (any Microsoft account can authenticate)
- Flow: Device Code (`common` endpoint)
- Permissions: Mail.Read, Mail.ReadWrite, Calendars.ReadWrite

**Per-realtor flow:** Agent generates device code → realtor visits microsoft.com/devicelogin → enters code → signs in → approves → tokens stored at `~/.hermes/ms365_tokens.json`.

**Enterprise tenants with locked-down consent:** Real estate brokerages with strict IT (like GuideHouse or Platinum) block user consent. The onboarding flow detects this and provides the realtor with a message to forward to their IT person for admin approval. Small brokerages (1-50 agents) almost never have this restriction.

**To recreate:** Register a multi-tenant Azure AD app, enable public client flows, add Microsoft Graph delegated permissions (Mail.Read, Mail.ReadWrite, Calendars.ReadWrite), set `MICROSOFT_CLIENT_ID` and `MICROSOFT_TENANT_ID` in `.env`.
