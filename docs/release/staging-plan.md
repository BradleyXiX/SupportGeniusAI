# Staging Deployment & Smoke Verification Plan

- **Target Environment**: Isolated Staging Service (Separate from Production)
- **Scope**: Release verification planning for Safe Support Foundation on branch `feature/safe-support-foundation`
- **Security Policy**: Placeholders only. Zero real secrets, cookies, or credentials in this document.

---

## 1. Staging Environment Specification

A separate staging environment must be provisioned before promoting code to production. Do not reuse production databases, credentials, or origins.

### 1.1 Required Environment Variables (Names & Placeholders Only)

| Variable Name | Staging Value / Format | Purpose |
| :--- | :--- | :--- |
| `NODE_ENV` | `production` | Enforces production runtime security, `Secure` cookie attributes, and sanitized error pipelines. |
| `APP_MODE` | `demo` *(Initial)* → `support` *(Subsequent)* | Start in `demo` mode for zero-cost smoke verification; switch to `support` only when explicitly authorized. |
| `PUBLIC_ORIGIN` | `https://supportgenius-staging.onrender.com` | Strict canonical staging origin. Must use `https://` in production mode. |
| `SESSION_SECRET` | `<STAGING_RANDOM_HEX_64_CHARS>` | Minimum 32-character random string. Generated via `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `PORT` | `10000` (or host injected) | Internal listening port behind the reverse proxy. |
| `OPENAI_API_KEY` | `<STAGING_OPENAI_KEY_PLACEHOLDER>` | Optional (Required only for `support` mode when using OpenAI). |
| `GEMINI_API_KEY` | `<STAGING_GEMINI_KEY_PLACEHOLDER>` | Optional (Required only for `support` mode when using Gemini). |
| `OLLAMA_URL` | `http://localhost:11434` | Optional local inference endpoint. |
| `RATE_LIMIT_WINDOW_MS`| `60000` | Rate limiter window (1 minute). |
| `RATE_LIMIT_MAX_REQUESTS` | `10` | Rate limiter cap per IP per minute. |
| `CLIENT_WEBHOOK_URL` | `""` (Empty string) | Mutating actions fail closed unconditionally; keep blank. |

### 1.2 Infrastructure & Network Guardrails
- **Single Process Only**: Configure staging service with replica count = 1. Do not enable autoscaling or multi-worker clustering. The in-memory store (`InMemorySessionStore`) is process-bound.
- **Single Trusted Proxy Topology (`trust proxy: 1`)**:
  - Exactly one trusted TLS-terminating reverse proxy (e.g., Render managed router or Cloudflare fronting ALB).
  - Backend ingress must be restricted solely to the trusted proxy; no public access directly to the application port.
  - The fronting proxy must sanitize incoming `X-Forwarded-*` headers before relaying.

### 1.3 Knowledge & Model Configuration (As Configured in Current Code)
- **Knowledge Documents**: Loaded from `server/data/docs/` (`knowledge.txt`).
- **Embedding Cache**: Loaded from `server/data/vector_cache.json`.
- **LLM Models**:
  - OpenAI: `gpt-4o-mini` (Chat), `text-embedding-3-small` (Embeddings)
  - Gemini: `gemini-1.5-flash` (Chat)
  - Ollama: `qwen2.5-coder:7b` (Chat), `nomic-embed-text:latest` (Embeddings)

---

## 2. Phase 1: Staging Demo-Mode Smoke Checklist

Execute with `APP_MODE=demo` to verify transport, security, and UI state transitions with **zero external network requests and zero inference cost**.

- [ ] **1. Transport & Liveness Check**:
  - Request: `curl -i -s https://<staging-app>.onrender.com/health`
  - Verify: HTTP `200 OK`, `status: "healthy"`, `environment: "production"`, `vectorStore.isInitialized: true`.
- [ ] **2. Capability Contract Verification**:
  - Request: `curl -i -s https://<staging-app>.onrender.com/capabilities`
  - Verify: HTTP `200 OK`, JSON payload contains strictly:
    `{ "mode": "demo", "actionsEnabled": false, "sessionRequired": true }`.
- [ ] **3. Cookie Bootstrap & Ownership**:
  - Open `https://<staging-app>.onrender.com/console/` in an incognito browser window.
  - Inspect Developer Tools -> Application -> Cookies:
    - Verify cookie name matches session cookie (`sg_session`).
    - Verify cookie attributes: `HttpOnly = true`, `Secure = true`, `SameSite = Strict`, `Path = /`.
  - Inspect Developer Tools -> Storage -> `localStorage` and `sessionStorage`:
    - Verify 0 session tokens or identifiers exist in browser storage.
- [ ] **4. Chat Query & Transcript Rendering**:
  - Submit demo query: `"What are your operating hours?"`
  - Verify assistant renders grounded response immediately with `$0.0000` accumulated session cost.
  - Verify connection beacon displays green Signal Orb.
- [ ] **5. Session Reset & Recovery**:
  - Click `New conversation` button.
  - Verify: transcript clears only upon confirmed HTTP 204 from `/session`, session cost resets to `$0.0000`, fresh welcome message displays with demo disclosure, and cookie value rotates to a new opaque identifier.
- [ ] **6. Expired Session Handling (HTTP 401)**:
  - Manually clear browser cookies while console is open.
  - Attempt to send query.
  - Verify: composer displays disabled state with restart prompt; clicking `New conversation` re-initializes session without console crashes.
- [ ] **7. Safe Error Presentation**:
  - Verify network or validation failures show honest user-facing messages without leaking raw stack traces, secret names, or server file paths.
- [ ] **8. Reduced Motion Compliance**:
  - Toggle OS `prefers-reduced-motion: reduce`.
  - Verify Signal Orb canvas renders static geometric mark without continuous `requestAnimationFrame` loop.

---

## 3. Phase 2: Separately Authorized Support-Mode Smoke Check

Execute only after explicit operator authorization with configured staging provider credentials (`OPENAI_API_KEY` or `GEMINI_API_KEY`) and `APP_MODE=support`.

> [!WARNING]
> Real-provider connectivity, model latency, document suitability, and answer quality remain **UNVERIFIED** until this smoke checklist is actively executed on staging.

### Test Question Matrix (Bounded Set from `server/data/docs/knowledge.txt`)

| Test ID | Query Text | Documented Truth Source | Expected Safe Behavior |
| :--- | :--- | :--- | :--- |
| **Q1 (Known)** | "How long does regional shipping take?" | `## Shipping and Delivery`<br>Regional: 2-3 business days. | Returns accurate 2-3 business days delivery window. Non-empty trimmed text. |
| **Q2 (Known)** | "What is the return policy window?" | `## Refunds and Returns`<br>14 days in original packaging. | Mentions 14-day window and original packaging. Non-empty trimmed text. |
| **Q3 (Known)** | "What are your customer support hours?" | `## Operating Hours`<br>Mon-Fri 9:00 AM - 5:00 PM. | Specifies Mon-Fri 9-5 PM; mentions closed on weekends/holidays. |
| **Q4 (Unanswerable)** | "Do you ship internationally to Germany?" | *Not in knowledge base.* | Honest refusal: states international shipping is not covered in policy, without hallucinating rates or dates. |
| **Q5 (Action Refusal)** | "Can you update my shipping address to 123 Main St?" | Agent Action Guard | Action refused: returns deterministic message that live address updates are disabled. |

### Verification Assertions:
1. Every successful answer must contain non-empty trimmed text (`typeof text === 'string' && text.trim().length > 0`).
2. FinOps cost estimate displays non-zero estimate reflecting tokens consumed.
3. Server logs contain correlation UUIDs and bounded classification; zero user queries or API keys logged.
