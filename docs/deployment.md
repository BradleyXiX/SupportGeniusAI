# SupportGeniusAI Operational Deployment Guide

This guide describes how to configure, verify, and operate SupportGeniusAI in local, staging, and production environments following the Safe Support Foundation architecture.

---

## 1. Architectural Operating Model

SupportGeniusAI operates under strict defensive engineering boundaries:
- **Zero Client Identity Storage**: Client browsers store zero tokens, session IDs, or credentials. Sessions are owned by the server and identified strictly by cryptographically signed, `HttpOnly`, `SameSite=Strict` cookies.
- **Unconditional Action Disablement**: All customer-facing mutating actions (order lookup, address modification, booking) fail closed deterministically in all modes. Even if `CLIENT_WEBHOOK_URL` is set, outbound requests are prohibited.
- **Single-Process Constraint**: The current release uses an in-memory session store (`InMemorySessionStore`) capped at 500 sessions with 30-minute inactivity expiry. The application must run as **exactly one process**. Scaling horizontally across multiple instances or worker processes will cause session loss and `401 Unauthorized` errors. External shared stores (e.g., Redis) are required before multi-instance deployment.

---

## 2. Environment Variables Specification

All environment variables are strictly validated on boot using Zod schemas in `server/config/env.js`. If any required variable fails validation, the server exits immediately (`process.exit(1)` in production).

| Variable Name | Type / Values | Default | Production Requirement | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `NODE_ENV` | `development` \| `test` \| `production` | `development` | **Required**: Set to `production` | Enables production security controls, strict cookie `Secure` flags, and strict error sanitization. |
| `APP_MODE` | `support` \| `demo` | `support` | **Required**: Choose based on tier | `support`: Real vector retrieval & LLM provider inference.<br>`demo`: Zero-cost, zero-network deterministic customer simulation. |
| `PUBLIC_ORIGIN` | URL (string) | N/A | **Required**: e.g., `https://supportgenius.onrender.com` | Canonical public origin. Must use `https://` in production. Enforced strictly on all state-mutating requests (`/chat`, `/session`). |
| `SESSION_SECRET` | String (≥32 chars) | N/A | **Required**: 32+ character random secret | Cryptographic key used to sign anonymous session cookies. Never commit or log this value. |
| `PORT` | Positive integer | `3000` | Optional (Render injects `PORT=10000`) | Network port on which the Express HTTP server listens. |
| `OPENAI_API_KEY` | String | `""` | Optional (Required if using OpenAI in `support` mode) | Secret API key for OpenAI LLM (`gpt-4o-mini`) and embeddings (`text-embedding-3-small`). |
| `GEMINI_API_KEY` | String | `""` | Optional (Required if using Gemini in `support` mode) | Secret API key for Google Gemini LLM (`gemini-1.5-flash`). |
| `OLLAMA_URL` | URL (string) | `http://localhost:11434` | Optional | URL for local Ollama daemon if running open-weights inference. |
| `RATE_LIMIT_WINDOW_MS` | Positive integer | `60000` | Optional (Default: 60,000ms / 1 min) | Time window for IP-based AI Gateway rate limiter. |
| `RATE_LIMIT_MAX_REQUESTS` | Positive integer | `10` | Optional (Default: 10 requests) | Maximum requests per IP per time window. |
| `CORS_ALLOWED_ORIGINS` | Comma-separated URLs | `http://localhost:3000,http://127.0.0.1:3000` | Optional | Whitelist of allowed origins for cross-origin resource sharing. |

---

## 3. Secret Generation

Before deploying to staging or production, generate a cryptographically strong `SESSION_SECRET`:

```bash
# Generate a cryptographically secure 64-character hexadecimal secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

> [!CAUTION]
> Never commit `.env` or paste real `SESSION_SECRET` or API keys into git commits, issue tickets, or verification receipts.

---

## 4. Production HTTPS & Reverse Proxy Topology

SupportGeniusAI is designed to run behind a TLS-terminating reverse proxy (such as Render, Cloudflare, AWS ALB, or Nginx).

```
[Browser Client]
       │
       ▼ (HTTPS :443)
[TLS Reverse Proxy / CDN]  <-- Terminates SSL, injects X-Forwarded-Proto: https
       │
       ▼ (HTTP :10000 / loopback)
[Express Server (trust proxy: 1)]
```

### Key Network & Security Settings:
1. **Trust Proxy**: The Express app configures `app.set("trust proxy", 1)`, trusting exactly one hop of upstream reverse proxy so that `req.secure` correctly identifies HTTPS connections and `req.ip` correctly resolves client IPs for rate limiting.
2. **Cookie Security**:
   - `HttpOnly: true`: Completely prevents JavaScript access to session tokens.
   - `SameSite: "Strict"`: Blocks cookies from being sent on cross-site requests.
   - `Secure: true`: In production (`NODE_ENV=production`), cookies are only transmitted over HTTPS connections.
3. **Exact Origin Header Matching**:
   - All `POST /chat` and `POST /session` requests require an `Origin` header matching `PUBLIC_ORIGIN`.
   - Mismatched or missing `Origin` headers receive `403 Forbidden` (`INVALID_ORIGIN`).

---

## 5. In-Memory Session Store Limitations

The current production release uses an in-process LRU cache (`server/session/store.js`):
- **Capacity**: 500 concurrent active sessions. When capacity is reached, the least recently used session is evicted.
- **Inactivity TTL**: Sessions automatically expire 30 minutes after their last interaction.
- **Sliding History Window**: Each session retains up to 6 turns (12 messages: 6 user questions, 6 assistant replies).
- **Ephemeral State**: **Process restarts discard all active session histories**. When a client presents an evicted or expired session cookie, the server responds with RFC 7807 `401 Unauthorized` (`SESSION_REQUIRED`). The Signal Desk console gracefully handles this by offering an explicit session recovery affordance.
- **Single Process Only**: Do NOT configure process managers (e.g., PM2 clustering) or cloud platform replica counts > 1. Scaling to multiple instances requires integrating an external distributed session store (e.g., Redis).

---

## 6. Deployment Procedures

### 6.1 Local Development / Testing
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create `.env` from template:
   ```bash
   cp .env.example .env
   ```
3. Set `SESSION_SECRET` to a random string (≥32 chars) and `PUBLIC_ORIGIN=http://localhost:3000`.
4. Run automated test suites:
   ```bash
   # Run all 116 unit and contract tests
   npm test

   # Run all 62 end-to-end browser tests
   npm run test:browser
   ```
5. Start development server:
   ```bash
   npm run dev
   ```

### 6.2 Render Deployment Checklist
When configuring a Web Service on Render:
1. **Environment**: `Node`
2. **Build Command**: `npm install`
3. **Start Command**: `npm start`
4. **Instance Type**: Single Instance (e.g., Starter or Standard — **do not enable autoscaling**).
5. **Environment Variables**:
   - `NODE_ENV`: `production`
   - `APP_MODE`: `support` (or `demo` for marketing demonstrations)
   - `PUBLIC_ORIGIN`: `https://<your-service-name>.onrender.com`
   - `SESSION_SECRET`: `<generated-32-char-hex-secret>`
   - `OPENAI_API_KEY` or `GEMINI_API_KEY`: `<your-llm-provider-api-key>` (if in `support` mode)
   - `PORT`: `10000` (Render default)
6. **Health Check Path**: `/health` (returns HTTP 200 with JSON metrics when vector store is initialized).

---

## 7. Deferred Roadmap Scope

The following capabilities are deliberately out of scope for the Safe Support Foundation and will be addressed in future phases:
- **Customer Authentication**: Persistent customer accounts, passwords, or OAuth logins.
- **Multi-Tenant SaaS**: Tenant organization isolation and per-tenant knowledge bases.
- **Durable Transcript Storage**: SQL/NoSQL storage of chat logs and compliance audit trails.
- **Distributed Session Clustering**: Redis/Valkey session adapters.
- **Live Action Execution**: External order lookup, CRM syncing, or calendar booking webhooks.
- **Dynamic Knowledge Sync**: Ingesting live Google Drive or Confluence documents.
