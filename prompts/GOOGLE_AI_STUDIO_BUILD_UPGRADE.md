# GOOGLE AI STUDIO BUILD — UPGRADE THE EXISTING REALX APPLICATION

Go to https://aistudio.google.com/apps (Build). Prefer **Import from GitHub** after placing the included source code in a GitHub repository. If import is unavailable, upload the existing source files individually or provide the project source as context. **Do not assume an uploaded ZIP has been unpacked or read.** Verify the code tree first. Google AI Studio's ZIP handling can be inconsistent; stop if the imported tree does not match.

## Paste this as the upgrade instruction

You are a senior engineer upgrading an EXISTING working RealX merchant acquisition tool. This is a patch of supplied code, NOT a greenfield app. Read ALL files before writing or changing anything. Print a truthful file inventory and a source-to-feature map. Preserve existing data and behavior. Do not invent merchants, meetings, integrations, redemptions or booked appointments.

AUTHORITATIVE FILES:
- `src/domain.mjs` = canonical MarketOS V2 track-separated account/event ledger and KPIs. Do not replace it with a toy useState array.
- `src/realx-core.mjs` = CSV importer, two value hypotheses, permissions, meeting and AE handoff gates.
- `src/conversation-core.mjs` = deterministic ICP score + Human Router/Conversational Mapper stage machine. Must remain the fallback and permission gate.
- `src/conversation-app.mjs`, `index.html` = existing interactive UI. Do not redesign instead of integrating.
- `api/gemini.mjs`, `server.mjs` = optional server-side Gemini JSON suggestion endpoint.
- `data/food_candidates.csv` = 23 candidate records from an earlier public directory; NOT externally verified leads.
- `tests/*.test.mjs` = executable baseline regression tests; run BEFORE and AFTER every change.
- `reference/student-first-client.html` = prior next-step conversation brief, reference only.
- `reference/restaurant-revenue-audit.html` = merchant goals and evidence-gated diagnosis, reference only.
- `reference/marketos-v1.html` = earlier local lead/outreach prototype, reference only.

PRODUCT GOAL: one RealX operator can take a directory-listed merchant through source check, decision-owner routing, human goal discovery, confirmed buyer example, authorized meeting request, confirmed meeting event, AE handoff and tracked acceptance. Target 5 REAL approaches and 1 genuine meeting. The system must never count imported candidates, generated text or copied drafts as actual outreach/meetings.

BEFORE WRITING:
1. Run `node --test tests/*.test.mjs`. Show the baseline result.
2. Trace `Load 23 candidates` → select merchant → update ICP → copy next question → record real ATTEMPT/REPLY → record mutual MEETING_BOOKED → AE HANDOFF_ACCEPTED. Do not falsely mark fictional events as real.
3. Produce `INTENDED_VS_IMPLEMENTED.md` with implemented, missing, and proposed features, plus exact files.

SMALLEST UPGRADE IN THIS SESSION:
A. Keep the 3-panel UI and deterministic mapper. If AI is added, use a secure server-side environment variable `GEMINI_API_KEY`, never a browser key.
B. Ensure an AI response is restricted to structured JSON and cannot override hard constraints: rejection=stop; existing partner=no new acquisition; no team approval=no merchant offer or meeting pitch; unknown facts stay unknown.
C. If persistent multi-user storage is needed, use Firebase Auth + Firestore server-side security rules only after creating a data migration plan for MarketOS schema 2. No mock Firebase auth, no client-side service account secrets. Do NOT migrate automatically if persistence is not essential for five manual approaches.
D. Add minimum browser workflow tests and show exact passing results. Any blocked browser test must be marked BLOCKED, not PASSED.
E. Keep all outbound communications manual and human-reviewed. No automated Instagram DMs, WhatsApp blasts, invented contact info or unverifiable booking statements.

TEST AND RELEASE GATES:
- Run existing 40 Node tests, then new tests.
- CSV reload is idempotent; import one account twice → no duplicates.
- Unverified directory prospect has ICP score 0; score rises only when the evidence fields are actually populated.
- Unknown owner → Human Router; unknown objective → Goal Discovery; objective with no example → Evidence Discovery; objection → follow-up question; decline → STOP.
- Interest alone does not imply meeting. Meeting requires verified owner, exact time and actual dated receipt. Handoff acceptance requires AE receipt.
- Export JSON, reload in a new session, confirm same KPI counts.
- Before deploy, enforce authentication and authorization for API, protect personal contact information, and use provider-level evidence when counting commercial outcomes.

OUTPUT AT THE END:
1. Files changed + exact purpose.
2. What a real operator can do in the UI now (click-by-click).
3. Automated test output with PASS/FAIL/BLOCKED counts.
4. Missing credentials/authorizations/integrations.
5. One next real external event (merchant conversation or authorized meeting).
Stop generating if no tests or useful working behavior changed. NEVER say a meeting is booked unless a human-verified event exists.
