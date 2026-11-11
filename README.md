# SupportGeniusAI

A document-based customer support assistant with an editorial introduction and a focused support console. Built for customized client deployments using Express and vanilla JavaScript.

SupportGeniusAI combines document retrieval with configurable language-model providers. The current **Safe Support Foundation** adds explicit demo and support modes, server-owned anonymous sessions, bounded provider requests, and predictable recovery states.

**Release status:** implemented and locally verified on `feature/safe-support-foundation`. Staging provider connectivity and answer quality remain to be verified. This branch is not a claim about the version currently deployed on the public site.

## What it does

- **Signal Desk interface:** an introduction at `/` and a responsive support console at `/console/`, with keyboard interactions and reduced-motion support.
- **Document Q&A:** retrieves context from local `.txt` and `.md` files before generating support replies. Retrieval helps ground answers; it does not guarantee factual accuracy.
- **Explicit operating modes:** `demo` returns deterministic fixture replies without provider calls; `support` uses configured providers and reports failures rather than silently simulating success.
- **Anonymous conversations:** signed, HttpOnly cookie sessions with bounded history and usage estimates. These sessions do not authenticate customers.
- **Bounded requests:** provider timeouts, response-size limits, safe errors and per-session single-flight handling.
- **Actions disabled:** order lookups, address changes and bookings are unavailable in every mode, even when a webhook URL is configured.

## Quick start

Use **Node.js 22.12+ within the Node 22 release line**, or a compatible Node 24 release, with npm. The installed Vitest version requires these newer runtimes; the existing Dockerfile still targets Node 20 and needs alignment before it is used as the development/test environment.

Use the existing local checkout on `feature/safe-support-foundation`. Check for uncommitted work before switching branches. Until the branch is published, a fresh clone of the default branch will not reproduce this version.

```bash
cd SupportGeniusAI
git status --short
git switch feature/safe-support-foundation
npm ci
```

Copy `.env.example` to `.env`:

```bash
# macOS / Linux
cp .env.example .env
```

```powershell
# Windows PowerShell
Copy-Item .env.example .env
```

Generate a session secret locally:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Set the following values in your local `.env`. Replace the secret placeholder with the generated value; never commit it.

```dotenv
NODE_ENV=development
PORT=3000
APP_MODE=demo
PUBLIC_ORIGIN=http://localhost:3000
SESSION_SECRET=<generated-secret-at-least-32-characters>
```

Leave provider keys and `CLIENT_WEBHOOK_URL` blank for the demo. Then start the application:

```bash
npm run dev
```

Open [localhost:3000](http://localhost:3000) for the introduction or [localhost:3000/console/](http://localhost:3000/console/) for the console. Use the configured hostname consistently: state-changing requests require an exact match with `PUBLIC_ORIGIN`.

Demo replies are fixtures. Use support mode to evaluate real document retrieval and answer quality.

## Support-mode configuration

Set `APP_MODE=support` and configure the intended provider. Selection supports explicit routing via `LLM_PROVIDER` (`auto`, `openai`, `gemini`, `ollama`) or default automatic precedence (`auto`):

| Configuration | Chat provider | Embedding / Retrieval mode |
| --- | --- | --- |
| `LLM_PROVIDER=gemini`, `RETRIEVAL_MODE=keyword` | Gemini (`GEMINI_MODEL`, default `gemini-3.1-flash-lite`) | Local keyword BM25 (no OpenAI key, no Ollama) |
| `OPENAI_API_KEY` set (`LLM_PROVIDER=auto` or `openai`) | OpenAI, `gpt-4o-mini` | OpenAI, `text-embedding-3-small` (or keyword if `RETRIEVAL_MODE=keyword`) |
| Only `GEMINI_API_KEY` set (`LLM_PROVIDER=auto` or `gemini`) | Gemini (`GEMINI_MODEL`, default `gemini-3.1-flash-lite`) | Ollama (if `RETRIEVAL_MODE=vector`) or keyword |
| Neither cloud key set (`LLM_PROVIDER=auto` or `ollama`) | Ollama (`OLLAMA_CHAT_MODEL`) | Ollama (`OLLAMA_EMBED_MODEL`) or keyword |

### Gemini-only Support Deployment
Setting `LLM_PROVIDER=gemini` and `RETRIEVAL_MODE=keyword` allows running support mode using only `GEMINI_API_KEY`. In this configuration:
- Chat inference calls Google Gemini via fixed-host, header-authenticated `POST /v1beta/models/${model}:generateContent`.
- Model ID is configurable via `GEMINI_MODEL` (defaults to `gemini-3.1-flash-lite`). Legacy endpoints `gemini-1.5-flash` and `gemini-2.0-flash` have been officially deprecated/shut down by Google.
- Knowledge retrieval parses markdown/text chunks at boot time and uses deterministic in-memory BM25-like scoring. Zero embedding API calls are made, zero embedding cache files are read or written, and no local Ollama service is required.
- Cost telemetry displays list-price paid-tier estimates ($0.25/1M input tokens, $1.50/1M output tokens, including thinking tokens). When pricing is unavailable for custom models, the telemetry safely renders `"Unavailable"`.

> [!WARNING]
> While Google documents a free-tier rate limit for text generateContent with `gemini-3.1-flash-lite`, free tier quotas, rate allowances, and account project access are never guaranteed. Production deployments should ensure billing is attached and verify quota health directly in Google Cloud Console.

For local inference with Ollama, configure `OLLAMA_URL` and install the models selected by `OLLAMA_CHAT_MODEL` and `OLLAMA_EMBED_MODEL`. Defaults are `qwen2.5-coder:7b` and `nomic-embed-text:latest`.

Place support documents in `server/data/docs/`. In `vector` mode, the loader reads `.txt` and `.md` files at startup and reuses cached embeddings from `server/data/vector_cache.json`. In `keyword` mode, the cache is completely bypassed. PDF and DOCX ingestion are not implemented.

Use non-sensitive sample documents while evaluating the system. Real client knowledge and credentials require an appropriate deployment and data-handling arrangement.

## Architecture

```text
client/                      Editorial introduction and Signal Desk console
server/app.js                Express application and middleware composition
server/index.js              Startup and process lifecycle
server/routes/               Chat, session, capabilities and health endpoints
server/session/              Cookie sessions, bounded store and lifecycle locks
server/services/             Retrieval, provider adapters and usage estimates
server/db/vectorStore.js     In-process document vectors and file-backed cache
server/data/docs/            Local knowledge documents (.txt and .md)
server/tests/                Unit and API contract tests
tests/browser/               Playwright browser tests
docs/                        Architecture, operations and release plans
```

The vector store uses local files and process memory. This release does not integrate ChromaDB or another external vector database.

## Verification

```bash
npm test
npx playwright install chromium
npm run test:browser
```

The browser configuration starts an isolated demo server on port `3888`. Test coverage includes session ownership, origin checks, concurrency, provider deadlines, error handling, console recovery and reduced motion.

The reviewed foundation recorded **116 unit/contract tests** and **62 browser tests** passing. These are recorded baseline results, not a live CI badge. Automated axe checks reported no serious or critical findings in tested states; they do not establish complete WCAG conformance.

## Deployment and operating limits

Read the [deployment guide](docs/deployment.md), [staging plan](docs/release/staging-plan.md) and [rollback plan](docs/release/rollback-plan.md) before releasing.

- Run exactly **one application process**. Sessions are held in memory, capped at **500**, and expire after **30 minutes of inactivity**. Restarts discard them.
- Conversation history is bounded to six exchanges. Token and cost values are estimates, not billing records.
- Production requires HTTPS, an explicit `PUBLIC_ORIGIN`, and a random `SESSION_SECRET` of at least 32 characters.
- Production cookies use `__Host-supportgenius_session` with Secure, HttpOnly and SameSite=Strict attributes.
- The current `trust proxy: 1` configuration requires one trusted proxy, restricted backend ingress and sanitized forwarded headers.
- `GET /health` reports process liveness and store statistics. HTTP 200 does not establish provider availability or answer quality.
- Inspect live hosting branch tracking, automatic deployments and preview settings before publishing a branch or opening a release PR. Local manifests do not establish the live deployment policy.

Customer authentication, durable transcripts, multi-tenant isolation, live integrations and source citations remain outside this release. Validate real-provider behavior and known-answer questions on staging before client rollout.

## Documentation

- [Deployment and configuration](docs/deployment.md)
- [Safe Support Foundation architecture](docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md)
- [Architecture decision index](docs/adr/README.md)
- [Release PR draft](docs/release/safe-foundation-pr.md)
- [Contribution guidelines](CONTRIBUTING.md)

## License

No repository license file is currently included. A license must be selected and added by the owner before the project is represented as MIT-licensed or distributed under those terms.



