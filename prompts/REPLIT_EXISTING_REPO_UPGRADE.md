# REPLIT AGENT — RELIABLE EXISTING-REPO ROUTE

If Google AI Studio Build fails to import all files, use https://replit.com/ and connect your GitHub repository under Repos. Official instructions: https://replit-help.replit.app/help/answers/how-do-i-get-my-existing-repository-running-in-replit

Paste:

"Work INSIDE the existing `RealX_Conversation_Engine_V3` repository, not a new app. First show the repo path, list files and run `node --test tests/*.test.mjs`. Do not create a frontend replacement. Start `node server.mjs` (PORT supplied by hosting), ensure `GET /api/health` works, test the UI, and fix only real failures. Preserve the schema 2 RealX event ledger, CSV import, conversation mapper, source evidence and AE booking gates. Set `GEMINI_API_KEY` in Secrets only if I supply it; never paste it into code or chat. Show a browser-tested link and the real test results. Public deployments MUST add authenticated access, rate limits and data protections before enabling `/api/conversation`. No automated sending." 

MVP first: deploy a working UI with manual sources, prompts and event logging. Gemini API and cross-device database are optional and must not block field validation.
