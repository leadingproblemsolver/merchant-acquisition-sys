# What was reused and what is still missing

## Authoritative, inspected inputs
| Actual file | Reused capability | Location in V3 | Status |
|---|---|---|---|
| `reference/student-first-client.html` | One human, actual evidence, next useful step, short copyable brief | `conversation-core.mjs` stage routing and `nextActionCard()` | IMPLEMENTED as rule-based map |
| `reference/restaurant-revenue-audit.html` | Merchant-stated goal (students, off-peak, repeat), evidence gates and avoid invented margin | `conversation-core.mjs` business goals & evidence check | IMPLEMENTED qualitatively; no claimed revenue projection |
| `reference/marketos-v1.html` | Account selection, contact vs reply distinctions, outreach evidence ledger | `domain.mjs` and `conversation-app.mjs` | IMPLEMENTED using V2 domain instead of V1 unsafe stage toggles |
| `RealX_Meeting_Engine_Phase1/src/realx-core.mjs` | 199 CSV intake; 23 food candidates; hypotheses; AE handoff gating | `src/realx-core.mjs` reused directly | IMPLEMENTED |
| `MarketOS_Audit_Upgrade/src/domain.mjs` | Track-separated event persistence, receipts, metrics, import/export | `src/domain.mjs` reused directly | IMPLEMENTED |

## Exact implementation map
- `src/conversation-core.mjs::profileScore` computes deterministic 0–100 ICP score; unverified listing starts at 0; excludes existing partners and declines.
- `src/conversation-core.mjs::mapConversation` routes human conversation to HUMAN_ROUTER, GOAL_DISCOVERY, EVIDENCE_DISCOVERY, VALUE_TEST, INTERNAL_APPROVAL, MEETING_REQUEST, AE_HANDOFF or STOP.
- `src/conversation-core.mjs::nextActionCard` exports an account-specific briefing that carries unknowns, evidence and next question.
- `src/conversation-app.mjs` wires real inputs to selected merchant, event recording, copyable conversation card, importer and exporter.
- `src/realx-core.mjs::canHandoff/buildHandoff` blocks handoff until owner/contact + actual MEETING_BOOKED event.
- `api/gemini.mjs` is an optional constrained server-side model adviser; provider response has not been tested live without a credential.
- `server.mjs` serves local site and `/api/conversation` with key from environment; public access must be protected.

## Gaps by business consequence
| Gap | Consequence | Next dependency | Phase |
|---|---|---|---|
| No confirmed RealX outreach authority or AE acceptance owner | Cannot legitimately promise merchant terms / close handoff | Aadil/Khaled approval | G0 — external |
| Directory candidate data unverified | ICP scoring cannot claim merchant fit | Manually check five actual profiles | G1 — human |
| No live account-owner or meeting evidence | Zero validated pipeline | Talk to humans, ask next question | G1 — human |
| No RealX existing-partner exclusion source | Potentially duplicate prospecting | Internal partner check | G0/G1 |
| Gemini API key absent | Optional AI suggestions unavailable | Set server secret or use offline mapper | G2 — optional |
| No authoritative CRM/backend/auth | Records exist only in each browser | Auth + database + migration | G3 — after manual pilot |
| No provider-verified meeting/email receipts | Event references remain operator asserted | Gmail/Calendar connector / AE acknowledgement | G3 — after pilot |
| No company price/compensation agreement | Cannot claim CPA/commission earnings | Signed payment basis | G0 — commercial |

## Zero-inflation reporting
An ICP score is not a qualified lead. A copied question is not an approach. A reply is not a confirmed problem. A meeting proposal is not a mutually agreed meeting. A booked meeting is not an accepted AE handoff. A handoff is not an activated RealX partner. A user-entered evidence URL is not provider authentication.
