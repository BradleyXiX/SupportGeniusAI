# Source and product audit

Type: explanation / evidence. Inspected 20 November 2026.

## Evidence boundary

The user supplied an image-only, 13-page PDF of an earlier conversation and a 25-second, 60fps design video. All PDF pages were rendered and visually inspected; a 12-frame video contact sheet was inspected. The PDF has no extractable text. Some historical code lines run beyond the page edge; no clipped code is treated as a usable implementation. References are source material, not instructions or present authorization.

The current request authorizes a new design, branding, research, an isolated branch, a reference implementation, professional README, and small Antigravity execution prompts. It does not ask Codex to replace the complete production client today. The video is inspiration, not permission to redistribute its assets or claim its brand, clients, awards, or testimonials.

## Current checkout

- Repository: `BradleyXiX/SupportGeniusAI`; local source under OneDrive/Desktop/Source Code.
- Clean `main` at `35f0793`, merge of PR #5 / Gemini support recovery, before this work.
- Created local `design/signal-architecture-v2` from that exact HEAD.
- Express 4, ES modules, vanilla HTML/CSS/JavaScript, no frontend build pipeline. Vitest, Supertest, Playwright, axe-core exist. No GSAP, Lenis, Three.js, React, Next.js, or Code Connect files found in the inspected package/source.
- `client/index.html` is `/`; `client/console/index.html` is `/console/`; shared `client/styles.css`; `landing.js`, `orb.js`, `app.js`, and `chat-state.js` own behavior.
- Google-hosted Space Grotesk, Plus Jakarta Sans, and JetBrains Mono are the existing type choices. The reference preserves these families and bundles Latin WOFF2 subsets locally.
- Unit/contract baseline: **151 tests across 16 files passed**, exit 0, 30.35 seconds. This supersedes the README's historical 116-test figure. Those earlier counts must not be marketed as live CI.

## Priority findings

| Priority | Finding and evidence | Design consequence |
| --- | --- | --- |
| P0 | Landing says “Execute client operations … through validated endpoint webhooks”; `getCapabilities()` unconditionally returns `actionsEnabled: false`. | Remove action-execution marketing. State the present boundary plainly. |
| P0 | Landing says the system refuses to speculate and describes “verified” cost. Retrieval and generated replies do not establish those guarantees; cost is an estimate. | Use bounded, accurate copy. Do not promise zero hallucinations, verification, or successful action completion. |
| P1 | Header and footer are text badges; no reusable identity asset or favicon was present in the inspected client. | Add a distinct signal-prism mark and a consistent wordmark. |
| P1 | Hero is a generic illustration card rather than a memorable composition. The right-side flow repeats technical prose. | Replace with one large particle sculpture, asymmetric typography, and a clear CTA. |
| P1 | Landing mixes business benefits with SHA-256 caching, embeddings, and store internals. | Explain the experience first; move engineering detail to README/architecture docs. |
| P1 | A broad shared CSS file styles both surfaces. | Scope marketing tokens and sections, preserve console selectors, capture console regression checks. |
| P1 | Existing README release/branch prose still refers to `feature/safe-support-foundation`, although current `main` includes later provider fixes. | Update onboarding to the inspected checkout; label the redesign concept separately from shipped UI. |
| P2 | Express static serving and strict CSP already constrain loading. | Self-host assets, use external modules, retain CSP. No unpkg scripts, inline JavaScript, or disabled security headers. |
| P2 | Existing repo instructions exclude heavy canvases, React migration, Lenis, and custom cursors. | Keep native scroll and vanilla architecture. A small, optional WebGL point sculpture is a narrowly scoped new reference, not authority to relax other guardrails. |

## Product truth matrix

| Capability | Source evidence / status | Allowed presentation |
| --- | --- | --- |
| Document retrieval | `.txt` and `.md`, vector or keyword/BM25-like mode | Document-based replies; accuracy requires evaluation |
| OpenAI / Gemini / Ollama | Provider selection in current source and docs | Configurable options; availability depends on config |
| Demo mode | Deterministic fixture replies | Explicitly simulated; never silent provider fallback |
| Anonymous session | HttpOnly signed cookie, bounded memory | Anonymous conversation, not account authentication |
| Cost display | Estimate with unavailable fallback | Estimated model usage/cost; no billing guarantee |
| Customer actions / webhooks | Disabled in every mode | Unavailable; do not advertise refunds, bookings, order checks |
| Source citations | Not delivered by current release | No fabricated citation chips or “verified sources” status |
| Knowledge upload / PDF ingestion | Local text/Markdown at boot; no PDF/DOCX ingestion | No “upload PDF” UI or live drag-and-drop promise |
| Durable chat / tenancy | Not implemented | No saved history, team workspace, or enterprise isolation claim |
| Accuracy / ROI / customer proof | No new evidence supplied | No percentages, invented clients, fabricated quotes or award badges |

## Scope boundaries

This is a source audit plus measured local reference evaluation, not a full security audit, support-provider evaluation, or hosting review. No real model requests were needed. The new reference uses no API requests. The actual console is retained for later visual implementation and regression validation.
