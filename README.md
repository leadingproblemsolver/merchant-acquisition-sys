# RealX Conversation-to-Meeting Engine V3

An incremental extension of existing MarketOS V2 + RealX Phase 1 + three uploaded HTML artifacts. Local human-first operating tool, with an OPTIONAL Gemini server endpoint. No Claude Code, paid CRM, backend subscription or AI key is required to run the manual pilot.

## Open fastest
Open **`REALX_CONVERSATION_STANDALONE.html`** in a desktop browser. Click **Load 23 existing food candidates**; source claims remain unverified. Save/restore using JSON export. Run 5 genuine conversations, not 199 manufactured sends.

## Run modular code + optional AI API
Requires Node 20+.
```bash
node --test tests/*.test.mjs
node server.mjs
# open http://localhost:8080
```
Without a key, AI suggestions report unavailable, but the deterministic mapper and the lead/event flow work. With an authorized key:
```bash
GEMINI_API_KEY='your-secret-in-server-environment' node server.mjs
```
The key remains server-side. `GEMINI_MODEL` can override the default model. This server binds to 127.0.0.1 by default. It is NOT hardened for public SaaS: before public deployment add authentication, access control, abuse/rate limits, consent handling, and durable backend storage. **Never expose `GEMINI_API_KEY` in public HTML.** Running Gemini sends the selected account context to Google's API upon button click.

## Use existing MarketOS without migration
The app uses schema 2 and the same browser localStorage key `marketos-v2-evidence`. Accounts and events from the earlier RealX modular UI can be restored through JSON. This app preserves track separation: `REALX`, `PAID_B2B`, `UHUB`; it only presents `REALX` in its UI. Do not import arbitrary V1 demo data as if they were verified leads.

## Required human flow
1. Select a candidate and open public source.
2. Fill only real verification fields. An unverified directory entry scores 0; evidence-based score ranks reachable leads.
3. The mapper suggests the right next one-sentence question, not a bulk message.
4. After real contact, log `ATTEMPT`, `REPLY`, `DISCOVERY` with dated source/receipt references.
5. After both parties agree, log `MEETING_BOOKED` with exact Qatar-local date/time, actor and reference. Copy handoff for AE. Log `HANDOFF_ACCEPTED` only after the AE acknowledges.
6. Export JSON for full event history and CSV for account list.

## What is not implemented
Automated Gmail/Instagram/WhatsApp sending, live merchant scraping, live booking calendars, verified partner exclusions, provider-verified receipts, shared multiuser database, automated deal closing, and RealX redemption reconciliation. The Google model integration is optional and not live-validated without a user-supplied API credential.

## Tests
```bash
node --test tests/*.test.mjs
```
See `docs/REUSE_AND_GAP_MAP.md`, `docs/FIVE_CONVERSATION_PILOT.md`, and `prompts/GOOGLE_AI_STUDIO_BUILD_UPGRADE.md`.
