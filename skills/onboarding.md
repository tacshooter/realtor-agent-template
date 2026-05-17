# Onboarding — First-Time User Setup

**When to use:** A realtor messages you for the first time (no prior sessions, no onboarding state in DB, or current_step != 'done').

**Goal:** Guide the realtor through setup in plain, non-technical language. One step at a time. Never list skills — only mention a feature when you're actively setting it up.

---

## Core Rules

1. **One question at a time.** Never present a list of things to configure.
2. **Never use the word "skill", "workflow", "integrate", or "configure".** Say "I can help with that" or "let's get this connected."
3. **Explain value, not mechanism.** "I'll watch for new listings that match your clients" — never "I'll run the listing-alert skill via a cron job."
4. **Handle stops gracefully.** If the user says "I gotta go" or "let's do this later," save progress and say "No problem — I'll pick up right here next time. Just say hi when you're ready."
5. **If they go off-script** (ask a real estate question during onboarding), answer it helpfully, then gently return: "By the way, we were in the middle of getting you set up. Ready to continue?"

---

## Step-by-Step Flow

### Step 1: Welcome
When you first meet someone:

> "Hi {{REALTOR_NAME}}! 👋 I'm your assistant — think of me as your behind-the-scenes coordinator. Once we get a few things connected, I can help with:
>
> • Finding new listings that match your clients
> • Pulling comps when you're writing an offer
> • Checking tax records before a showing
> • Sending you a morning briefing so you start the day informed
>
> Ready to get set up? It should take about 5 minutes. First — what email do you use for work?"

**Why we ask:** Email access lets us connect calendar, send reports, and provide morning briefings.

**If they push back on email:** "No worries — we can skip it for now. What about connecting your MLS? That's the big one — it's how I'll search listings and pull comps for you."

---

### Step 2: Email & Calendar Setup

After they give their email, detect the provider from the domain:

#### Google Workspace / Gmail (@gmail.com or any domain using Google)

> "Great — let me connect your Google account so I can see your calendar and send you reports."

**Check auth first:**
```bash
GSETUP="python /opt/hermes-agent/venv/lib/python3.11/site-packages/hermes_agent/tools/skills_hub.py"  # or wherever setup.py is installed
# Check if google-workspace skill is installed
hermes skills list | grep google-workspace || hermes skills install google-workspace
```

**Step A — Store client secret (if not already done):**
```bash
python ~/.hermes/skills/productivity/google-workspace/scripts/setup.py --client-secret /opt/realtor-agent/credentials/google_client_secret.json
```

**Step B — Generate auth URL:**
```bash
python ~/.hermes/skills/productivity/google-workspace/scripts/setup.py --auth-url --services email,calendar --format json
```

**Step C — Send to user:**
> "Click this link to connect your Google account — it'll ask you to allow calendar and email access: [URL]  
> After you click Allow, you'll see a page that says 'This site can't be reached' — that's normal. Copy the full web address from your browser bar and paste it here."

**Step D — Exchange code:**
```bash
python ~/.hermes/skills/productivity/google-workspace/scripts/setup.py --auth-code "THE_PASTED_URL_OR_CODE" --format json
```

**Step E — Verify:**
```bash
python ~/.hermes/skills/productivity/google-workspace/scripts/setup.py --check
```

**If it works:**
> "Connected! ✅ I can now see your calendar and your email. Next up — your MLS."

**If it fails with access_denied:**
> "Looks like your Google Workspace admin might need to approve this app. I can walk you through that, or we can skip email for now and come back to it. Want to continue with MLS setup?"

**Save to DB:** `UPDATE onboarding_state SET current_step='calendar', completed_steps = array_append(completed_steps, 'email'), integrations = jsonb_set(integrations, '{email}', '{"type":"google","status":"connected"}')`

---

#### Microsoft 365 / Outlook (@outlook.com or Exchange domains)

> "I can connect to your Microsoft account — it works like pairing a new device. Takes about 30 seconds."

**Prerequisites:** The instance must have `MICROSOFT_CLIENT_ID` and `MICROSOFT_TENANT_ID` set in `.env`. These are pre-configured by the admin — one Azure AD app covers all realtors.

**Step A — Generate device code:**
```bash
python3 -c "
import requests, json, os
client_id = os.environ['MICROSOFT_CLIENT_ID']
r = requests.post(
    'https://login.microsoftonline.com/common/oauth2/v2.0/devicecode',
    data={
        'client_id': client_id,
        'scope': 'offline_access https://graph.microsoft.com/Mail.Read https://graph.microsoft.com/Mail.ReadWrite https://graph.microsoft.com/Calendars.ReadWrite'
    }
)
d = r.json()
if 'error' in d:
    print(f'ERROR: {json.dumps(d, indent=2)}')
else:
    print(f'DEVICE_CODE={d[\"device_code\"]}')
    print(f'USER_CODE={d[\"user_code\"]}')
    print(f'EXPIRES={d[\"expires_in\"]}')
"
```

**Step B — Send to user:**
> "Visit https://microsoft.com/devicelogin and enter this code: [USER_CODE]"

**Step C — After user completes (they see "You're signed in"):**

Poll for the token:
```bash
python3 -c "
import requests, json, os, time
client_id = os.environ['MICROSOFT_CLIENT_ID']
device_code = '[DEVICE_CODE]'
for i in range(12):  # poll for ~60s
    time.sleep(5)
    r = requests.post(
        'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        data={
            'client_id': client_id,
            'grant_type': 'urn:ietf:params:oauth:grant-type:device_code',
            'device_code': device_code
        }
    )
    d = r.json()
    if 'access_token' in d:
        # Save token to realtor's home
        with open(os.path.expanduser('~/.hermes/ms365_tokens.json'), 'w') as f:
            json.dump(d, f)
        print('TOKEN_SAVED')
        break
    elif d.get('error') == 'authorization_pending':
        continue
    else:
        print(f'ERROR: {json.dumps(d, indent=2)}')
        break
"
```

**Step D — Verify and continue:**
```bash
curl -s -H "Authorization: Bearer $(python3 -c "import json; print(json.load(open('$HOME/.hermes/ms365_tokens.json'))['access_token'])")" \
  "https://graph.microsoft.com/v1.0/me" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('mail','NO_MAIL') if 'mail' in d else d.get('error','UNKNOWN'))"
```

**If verification succeeds:**
> "Connected! ✅ I can now see your Microsoft calendar and email. Next up — your MLS."

**If user sees "Need admin approval" during device login:**
> "Your organization requires IT approval for new apps. It's a quick process — your IT person just needs to approve the 'KSF Virtual Assistant' app. Want me to give you the message to forward to them? Here's what to send:
>
> 'Hi — I'm setting up a real estate assistant that needs read access to my calendar and email. Can you approve the app called KSF Virtual Assistant in Azure AD? It'll show up under Enterprise Applications pending admin consent. Thanks!'
>
> Want to skip this for now and come back to it?"

**Save to DB:** `integrations -> email -> type: microsoft, status: connected` (or `status: pending_admin` if blocked)

---

#### Other / Unknown provider

> "What email provider do you use? (Google, Outlook, Yahoo, iCloud, or something else?)"

- **Yahoo / iCloud / other:** "I can try to connect, but calendar access may be limited. What's most important to you — email access or calendar?"
- If they don't want email setup at all: "No problem — let's skip to MLS."

---

### Step 3: Calendar & Briefing Time
After email is connected, confirm calendar access:

**Check calendar works:**
```bash
python ~/.hermes/skills/productivity/google-workspace/scripts/google_api.py calendar list --max 3
```
Or for Microsoft: `node ~/.hermes/skills/openclaw-imports/microsoft365/index.js --account {{EMAIL}} --calendar`

> "I can see your calendar — looks good! 📅 What time works best for your morning briefing? I'll send you new listings, price drops, and client matches to start your day."

**Options to suggest:** 6:00 AM, 6:30 AM, 7:00 AM, 7:30 AM, 8:00 AM

> "Got it — ☀️ morning briefing at [time]. Now, let's connect your MLS. Which MLS do you use?"

**Save briefing_time to preferences.**

---

### Step 4: MLS Setup
Most DFW realtors use NTREIS. Handle unknowns gracefully:

> "I can search listings, pull comps, and check tax records — but I need access to your MLS. Which one do you use?"

**If NTREIS:**
> "Perfect. I'll need your NTREIS login. Your credentials are encrypted — I can't read them and neither can anyone else. They're stored like a password manager and only used to search listings for you."

**Ask for:** MLS URL, username, password.

**Store encrypted in PostgreSQL:**
```sql
INSERT INTO credentials (service, username, encrypted_value, metadata)
VALUES (
    'ntreis',
    '{username}',
    pgp_sym_encrypt('{password}', 'realtor_change_me'),
    '{"url": "https://ntreis.net", "connected_at": "NOW()"}'::jsonb
);
```

**Test the connection** (via Libretto workflow if available, or note it needs testing):
> "Credentials saved and encrypted. I'll test the connection now — one moment..."

If the Libretto MLS login workflow exists, run it. If not:
> "Credentials are saved. I'll verify the connection works and let you know. In the meantime — ready for the last few questions?"

**If they're hesitant about credentials:**
> "Totally understandable. These are encrypted so I can't read them — they're stored like a password manager. And you can remove them anytime by saying 'remove my MLS access'."

---

### Step 5: Scheduling System

> "Almost done! Do you use a scheduling app that your clients book showings through — like ShowingTime, Calendly, or something similar?"

**If yes:**
> "What's it called? I'll make a note so I can integrate with it later."

**If no:**
> "No worries — I'll use your calendar to track showings."

---

### Step 6: Preferences

> "Last couple questions — what areas do you focus on? (Cities or neighborhoods)"

**Examples:** Frisco, Prosper, McKinney, Celina, Plano, Allen

> "And your typical price range? Like $300K–500K or $800K+?"

> "Got it — {{areas}}, {{price_range}}. One more — what types of properties do you work with most? (Single-family, luxury, new construction, condos, investment...)"

---

### Step 7: Done!

> "All set! 🎉 Here's what's active:
>
> • 📧 Email connected
> • 📅 Morning briefing at [time]
> • 🏠 MLS: [name] connected
> • 📍 Farm areas: [areas]
> • 💰 Price range: [range]
>
> I'll send your first briefing tomorrow morning. In the meantime, try asking me things like:
> • 'Find 4-bedroom homes in Frisco under $600K'
> • 'Pull comps for 123 Main Street'
> • 'Any price drops today?'
>
> Welcome aboard!"

**Mark complete:** `UPDATE onboarding_state SET current_step='done', completed_at=NOW()`

---

## Database Operations

```sql
-- Check user state
SELECT current_step, completed_steps, integrations, preferences
FROM onboarding_state WHERE user_id = '{telegram_user_id}';

-- Create new record
INSERT INTO onboarding_state (user_id, user_name, current_step)
VALUES ('{telegram_user_id}', '{name}', 'welcome');

-- Advance step
UPDATE onboarding_state
SET current_step = '{next_step}',
    completed_steps = array_append(completed_steps, '{completed_step}'),
    updated_at = NOW()
WHERE user_id = '{telegram_user_id}';

-- Store integration
UPDATE onboarding_state
SET integrations = jsonb_set(integrations, '{email}', '{"type":"google","status":"connected"}'::jsonb),
    updated_at = NOW()
WHERE user_id = '{telegram_user_id}';

-- Store preference
UPDATE onboarding_state
SET preferences = jsonb_set(preferences, '{briefing_time}', '"7:00 AM"'::jsonb),
    updated_at = NOW()
WHERE user_id = '{telegram_user_id}';
```
