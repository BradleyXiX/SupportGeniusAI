# Staging Deployment & Smoke Verification Plan

*Diátaxis type: How-To Guide.* Run this checklist against an isolated staging service before promoting changes to production. Never reuse production secrets or origins in staging, and never commit real secrets, cookies, or API keys to Git, logs, or receipts.

## 1. Staging environment prerequisites

Configure staging according to the canonical environment specification in [docs/deployment.md](../deployment.md):

- **Single process**: Replica count = `1` (no autoscaling or clustering; `memorystore` sessions are process-local).
- **Single trusted proxy (`trust proxy: 1`)**: Restrict backend port ingress to the fronting TLS proxy and ensure `X-Forwarded-*` headers are sanitized.
- **Core variables**:
  - `NODE_ENV=production`
  - `APP_MODE=demo` for Phase 1, switching to `support` only when Phase 2 is explicitly authorized
  - `PUBLIC_ORIGIN=https://<staging-host>` (must use `https://`)
  - `SESSION_SECRET=<32+-char-random-secret>` (stored in your secret manager / platform env settings)
  - `CLIENT_WEBHOOK_URL=""` (leave blank; actions remain unconditionally disabled)
- **Provider & retrieval variables (for Phase 2 `support` mode)**:
  - **Gemini + keyword (no embedding provider)**: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=<verified-bare-model-id>` (required with no default in `server/config/env.js`), `RETRIEVAL_MODE=keyword`.
  - **OpenAI**: `LLM_PROVIDER=openai` (or `auto`), `OPENAI_API_KEY`, `RETRIEVAL_MODE=vector` (or `keyword`).
  - **Ollama**: `LLM_PROVIDER=ollama` (or `auto` with no cloud keys), `OLLAMA_URL`, `OLLAMA_CHAT_MODEL`, and `OLLAMA_EMBED_MODEL` (if `vector` mode).
- **Knowledge files**: Confirm target `.txt` / `.md` documents are present in `server/data/docs/`.

## 2. Phase 1: Demo-mode smoke checklist (`APP_MODE=demo`)

Verifies transport security, cookie ownership, CSP, and UI lifecycle with zero provider API calls. Demo replies are deterministic `[Demo]` fixtures and do not verify live model grounding.

- [ ] **1. Liveness & chunk load**: `GET https://<staging-host>/health` returns HTTP `200`, `status: "healthy"`, `environment: "production"`, and `vectorStore.isInitialized: true` (`chunksCount > 0`).
- [ ] **2. Capabilities contract**: `GET https://<staging-host>/capabilities` returns HTTP `200` with `{ "mode": "demo", "actionsEnabled": false, "sessionRequired": true }`.
- [ ] **3. Cookie bootstrap & zero client identity**:
  - Open `https://<staging-host>/console/` in a fresh private/incognito window.
  - Confirm `POST /session` returns HTTP `204` and sets `__Host-supportgenius_session` with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and no `Domain` attribute. Do not copy or log the cookie value.
  - Confirm `localStorage` and `sessionStorage` contain zero session tokens or customer identifiers.
- [ ] **4. Demo chat & estimate display**: Submit `"What are your operating hours?"` and confirm a `[Demo]` reply renders cleanly with `$0.0000` session estimate and zero browser console errors.
- [ ] **5. Session reset**: Click **New conversation** and confirm transcript clears only after HTTP `204` from `POST /session`, cost resets to `$0.0000`, and the session cookie rotates.
- [ ] **6. Expired session recovery (`401`)**: Clear browser cookies while `/console/` is open, submit a question, confirm the console surfaces session recovery instead of crashing, and confirm **New conversation** restores a working session.
- [ ] **7. Safe errors**: Confirm validation or network failures render user-facing messages without stack traces, file paths, or secret names.
- [ ] **8. Reduced motion**: Enable `prefers-reduced-motion: reduce` and confirm decorative animations pause and static fallbacks render.

## 3. Phase 2: Support-mode smoke checklist (`APP_MODE=support`)

Execute only when separately authorized with real staging provider credentials. Live provider connectivity, quota, latency, and answer quality remain **unverified** until this checklist passes on staging.

### Bounded question matrix (against sample `server/data/docs/knowledge.txt` or client docs)

| Test ID | Sample query | Expected behavior |
| :--- | :--- | :--- |
| **Q1 (Known)** | "How long does regional shipping take?" | Grounded, non-empty reply matching the configured shipping document. |
| **Q2 (Known)** | "What is the return policy window?" | Grounded, non-empty reply matching the configured returns document. |
| **Q3 (Known)** | "What are your customer support hours?" | Grounded, non-empty reply matching configured hours. |
| **Q4 (Unanswerable)** | "Do you ship internationally to Germany?" | Honest refusal or statement that the policy does not cover the request, without invented rates. |
| **Q5 (Action refusal)** | "Can you update my shipping address to 123 Main St?" | Deterministic refusal confirming automated actions are unavailable; zero outbound webhooks. |

### Verification assertions

1. Every successful `POST /chat` returns HTTP `200` with non-empty trimmed reply text and acceptable latency.
2. Replies match the configured knowledge base for Q1–Q3 and refuse honestly for Q4–Q5.
3. Cost display shows a formatted estimate (`$0.0000` or higher) for priced models, or `Unavailable` if `costAvailable: false` (never `$null` or `NaN`).
4. Server logs show correlation UUIDs and error classifications only—zero user query text, API keys, or cookie values.
