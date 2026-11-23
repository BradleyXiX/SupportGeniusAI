# SupportGenius AI — Deployment and Operations Guide

*Diátaxis type: Reference & How-To Guide.* This document is the canonical operational reference for configuring, running, and verifying SupportGenius AI in local, staging, and production environments.

## 1. Operating boundaries

SupportGenius AI is built for **tailored single-business deployments** with explicit defensive boundaries:

- **Server-owned anonymous sessions**: Browsers store zero session tokens or credentials (`localStorage` stores only the non-sensitive `sg_motion_v1` animation toggle). Sessions use `express-session` with signed `HttpOnly`, `SameSite=Strict` cookies backed by `memorystore` (`server/session/store.js`).
- **Unconditional action disablement**: Mutating customer actions (`checkOrderStatus`, `updateAddress`, `bookAppointment`, and `callWebhook` in `server/services/agent.js`) fail closed deterministically in every mode. Setting `CLIENT_WEBHOOK_URL` does not enable outbound webhooks.
- **Single-process store**: Session state lives in Node process memory (`max: 500` sessions, 30-minute inactivity TTL, 60-second prune interval, `stale: false`). Run **exactly one application process**; horizontal scaling requires replacing the store with shared infrastructure (such as Redis).

## 2. Environment variables (`server/config/env.js`)

All environment variables are validated at boot by Zod in `server/config/env.js`. Validation failure throws in development/test and exits with code `1` in production.

| Variable | Allowed values / format | Default | Production requirement | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | **Required**: `production` | Enables `Secure` `__Host-` cookie attributes and production startup exit on invalid config. |
| `APP_MODE` | `support` \| `demo` | `support` | **Required** | `support`: document retrieval + configured LLM provider.<br>`demo`: deterministic local fixture replies with zero provider calls. |
| `LLM_PROVIDER` | `auto` \| `openai` \| `gemini` \| `ollama` | `auto` | Optional | Chat provider selection. `auto` resolves `openai` → `gemini` → `ollama` based on non-empty API keys. |
| `RETRIEVAL_MODE` | `vector` \| `keyword` | `vector` | Optional | `vector`: embedding similarity via OpenAI/Ollama with `server/data/vector_cache.json` and keyword fallback.<br>`keyword`: deterministic lowercased word/prefix token matching with zero embedding calls and zero cache file reads/writes. |
| `PUBLIC_ORIGIN` | Valid URL | *(none)* | **Required** (`https://` in production) | Canonical origin enforced via exact `Origin` header matching on `POST /session` and `POST /chat`. |
| `SESSION_SECRET` | String (≥ 32 chars) | *(none)* | **Required** | Cryptographic secret signing anonymous session cookies. Never commit or log. |
| `PORT` | Positive integer | `3000` | Optional (platform may inject) | HTTP listening port. |
| `OPENAI_API_KEY` | String | `""` | Required if `support` selects OpenAI | OpenAI API key for chat and `text-embedding-3-small` embeddings. |
| `OPENAI_MODEL` | String (read in `server/services/llm.js`) | `gpt-4o-mini` | Optional | Optional OpenAI chat model override (not schema-validated in `env.js`). |
| `GEMINI_API_KEY` | String | `""` | Required if `support` selects Gemini | Google Gemini API key sent via `x-goog-api-key` header. |
| `GEMINI_MODEL` | Bare model ID (`^[a-zA-Z0-9_.-]+$`) | `""` (no default) | **Required** if `support` selects Gemini | Bare model identifier for `POST /v1beta/models/${model}:generateContent`. Confirm active model availability and quota in Google Cloud Console. |
| `OLLAMA_URL` | Valid URL | `http://localhost:11434` | Optional | Base URL for a local/private Ollama daemon. |
| `OLLAMA_CHAT_MODEL` | String | `qwen2.5-coder:7b` | Optional | Ollama chat model name. |
| `OLLAMA_EMBED_MODEL` | String | `nomic-embed-text:latest` | Optional | Ollama embedding model name in `vector` mode. |
| `CLIENT_WEBHOOK_URL` | Valid URL or `""` | `""` | Leave blank | Validated for backwards compatibility; outbound webhook execution is unconditionally disabled. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins | `http://localhost:3000,http://127.0.0.1:3000` | Optional | Additional CORS allowlist entries alongside `PUBLIC_ORIGIN`. |
| `RATE_LIMIT_WINDOW_MS` | Positive integer | `60000` | Optional | Rate-limiter window in milliseconds (applied independently to `/session` and `/chat`). |
| `RATE_LIMIT_MAX_REQUESTS` | Positive integer | `10` | Optional | Maximum requests per IP per window on `/session` and `/chat`. |

Generate `SESSION_SECRET` locally before deployment:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Operating limits and data flow

### External data transmission

Ephemeral in-memory sessions do **not** mean zero external data transmission or guaranteed privacy. Verify provider data-retention policies before processing customer questions:

- **`APP_MODE=support` (chat inference)**: On each `POST /chat`, the server sends up to 3 retrieved document excerpts (`server/data/docs/*.txt`, `*.md`), the customer's question (capped at 2,000 characters), and up to 6 turns (12 messages) of session history to the configured LLM provider (OpenAI, Gemini, or Ollama).
- **`RETRIEVAL_MODE=vector` (default)**: At server startup (`server/index.js` → `initializeStore()`), uncached chunks are embedded via OpenAI (`OPENAI_API_KEY`) or Ollama (`OLLAMA_URL`) and cached locally in `server/data/vector_cache.json`. At query time, `getRelevantChunks()` embeds the user question before falling back to keyword scoring if embeddings are unavailable.
- **`RETRIEVAL_MODE=keyword`**: Loads `.txt` and `.md` chunks into memory at startup and ranks them with deterministic lowercased word and >3-character prefix token matching (`calculateKeywordScore()` in `server/services/embeddings.js`). This avoids all embedding API calls and avoids reading or writing `server/data/vector_cache.json`, **but in `APP_MODE=support` it still sends prompts to the configured chat provider**.
- **`APP_MODE=demo`**: `getEmbedding()` returns `null` immediately and `callLLM()` returns deterministic `[Demo]` fixtures with zero outbound provider requests. Setting `RETRIEVAL_MODE=keyword` alongside `APP_MODE=demo` also skips reading `server/data/vector_cache.json` at startup.

### Session, concurrency, and timeout bounds

- **Session capacity & lifetime**: Up to 500 concurrent sessions in process memory (`memorystore`), expiring after 30 minutes of inactivity. Process restarts discard all active sessions; clients recover from `401 Unauthorized` (`SESSION_REQUIRED`) via the console reset control.
- **Single-process isolation note**: Running one process prevents multi-instance session desynchronization, but does **not** provide multi-tenant isolation or customer authentication.
- **Concurrency & deadlines**: Overlapping requests on one session return `409 Conflict` (`SESSION_BUSY`). Timeout hierarchy: 5s embedding fetch, 20s LLM fetch, 30s server `/chat` budget, 15s client `/session` deadline, 45s client `/chat` deadline.
- **Cost estimates**: `server/services/finops.js` computes session-scoped estimates from static lookup rates for known models and returns `cost: null, costAvailable: false` (`Unavailable` in UI) for unpriced models. Displayed figures are local estimates, never provider invoices or free-tier guarantees.

## 4. Production HTTPS and reverse proxy topology

Express configures `app.set("trust proxy", 1)` (`server/app.js`), assuming **exactly one trusted TLS-terminating reverse proxy** sits directly in front of the Node process:

1. **Restricted backend ingress**: Do not expose the Node port directly to the public internet; otherwise clients can spoof `X-Forwarded-For` or `X-Forwarded-Proto`.
2. **Header sanitization**: The fronting proxy must replace incoming `X-Forwarded-*` headers before forwarding requests.
3. **Multi-hop proxy chains**: Architectures with multiple proxies (for example, CDN → load balancer → app) do not automatically match `trust proxy: 1` without explicit proxy/CIDR configuration.
4. **Cookies & Origin**: In `NODE_ENV=production`, session cookies use `__Host-supportgenius_session` with `HttpOnly`, `Secure`, `SameSite=Strict`, `Path=/`, and no `Domain` attribute. `POST /session` and `POST /chat` reject missing or mismatched `Origin` headers with `403 Forbidden`.

## 5. Local evaluation and hosted deployment

### Local setup (Node 22.12+ within Node 22, or Node 24/26)

```bash
npm ci
cp .env.example .env   # PowerShell: Copy-Item .env.example .env
# Set SESSION_SECRET (32+ random chars), PUBLIC_ORIGIN=http://localhost:3000, APP_MODE=demo, RETRIEVAL_MODE=keyword
npm test
npm run test:browser
npm run dev
```

### Hosted Node service checklist (for example, Render)

1. Configure **one single instance** (disable autoscaling and multi-worker clustering).
2. Set build command `npm ci` (or `npm install`) and start command `npm start`.
3. Configure environment variables (`NODE_ENV=production`, `APP_MODE`, `PUBLIC_ORIGIN=https://...`, `SESSION_SECRET`, `PORT`, plus provider variables). When preparing variables in Render, use **Save Changes** without triggering an unintended automatic deploy, and preserve existing production secrets/origins.
   - **Gemini + keyword minimal footprint**: `LLM_PROVIDER=gemini`, `GEMINI_API_KEY`, `GEMINI_MODEL=<verified-bare-model-id>`, `RETRIEVAL_MODE=keyword`.
   - **OpenAI**: `LLM_PROVIDER=openai` (or `auto`), `OPENAI_API_KEY`.
4. Point platform liveness checks at `GET /health`. Note that `GET /health` checks process liveness and loaded chunk count only; HTTP `200` does **not** prove upstream provider connectivity, model quota, or answer quality.
5. Run the [Staging smoke verification plan](release/staging-plan.md) before promoting to production, and record the live revision per the [Rollback guide](release/rollback-plan.md).

## 6. Container recipes (unverified)

The repository includes `Dockerfile` and `docker-compose.yml` as unverified starter recipes, not tested production container installations:

- `Dockerfile` targets `node:20-alpine`, whereas the repository's development and test toolchain requires Node `22.12+` (within Node 22) or Node 24/26.
- `docker-compose.yml` sets `NODE_ENV=production` and `OLLAMA_URL=http://ollama:11434`, but omits required `PUBLIC_ORIGIN` (`https://...`) and `SESSION_SECRET` (≥ 32 chars) and does not pull Ollama chat or embedding models automatically.

Do not rely on either file for production deployment without updating and testing the runtime image, environment wiring, and reverse-proxy TLS termination.
