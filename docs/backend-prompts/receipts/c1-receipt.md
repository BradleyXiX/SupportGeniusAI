# Task C1 Receipt — Release & Staging Preparation (Corrected)

- **Task**: C1 — Release and staging preparation (executable release plans)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2a64d5bff18ee5be6bd50e9ff75c328bc5` (stems from `design/signal-desk-v1` at `03886d2`)
- **Verified Product Commit**: `4b659bc3ca8ba40562e6d5bfbb67ad10492cb3e5` (116 unit tests, 62 browser tests)
- **Prior Documentation Commits**: `895369e` (B7 receipt), `76d4934` (initial C1 plans), `81237f4` (C1 executable plans)
- **Current HEAD**: `81237f4`
- **Working Tree State During Handoff Cleanup**: Pre-existing reviewed `README.md` rewrite by Codex, plus targeted corrections to `docs/release/rollback-plan.md` and this receipt.
- **Status**: Complete. Release PR draft, staging deployment plan, and rollback procedures finalized.

---

## 1. Reviewed Remote & Deployment Policy Evidence

- **Configured Remote**: `origin -> https://github.com/BradleyXiX/SupportGeniusAI.git`
- **Locally Recorded Remote Reference (`origin/main`)**: `9b500e2f7e4b07329a4b7e5873ebd22c5bfa239c` (Locally stored git ref; not verified against fresh remote hosting network state).
- **Branch Ancestry & PR Base**:
  - `origin/main` (`9b500e2`) is an ancestor of `design/signal-desk-v1` (`03886d2`).
  - `design/signal-desk-v1` (`03886d2`) is the direct base of `feature/safe-support-foundation`.
  - Full Signal Desk redesign history is preserved. Target PR base: `main`.
- **Observed Hosting Manifest (`render.yaml`)**:
  - Service: `supportgenius-ai` (type: `web`, env: `node`, plan: `free`, probe: `/health`).
  - `render.yaml` contains zero `autoDeploy` configuration directives.
- **Deployment Policy UNKNOWN**:
  - The live deployment policy in the Render dashboard is **UNKNOWN**.
  - Omission in `render.yaml` does not establish whether automatic deployment, branch tracking, or pull-request preview environments are enabled in the live hosting settings.
  - Pushing to `feature/safe-support-foundation` or merging into `main` **MAY trigger deployment**.
  - **Required Action**: The operator must inspect the live Render dashboard read-only to verify tracked branches and auto-deploy settings prior to any push, PR, or merge operation.

---

## 2. Release Document Corrections Applied

### 2.1 Staging Smoke Plan (`docs/release/staging-plan.md`)
- **Cookie Name Matching**: Corrected cookie name to match `server/session/middleware.js`:
  - Production staging (`NODE_ENV=production`): strictly `__Host-supportgenius_session`.
  - Development: `supportgenius_session`.
  - Removed incorrect `sg_session` reference.
  - Explicitly required verifying absence of `Domain` attribute (must be undefined/omitted for `__Host-` specifications) along with `HttpOnly`, `Secure`, `SameSite=Strict`, and `Path=/`.
- **Single Trusted Proxy Topology**: Corrected topology guidance. Clarified that a multi-tier proxy (such as Cloudflare fronting an AWS ALB) is a **proxy chain** that does not satisfy `trust proxy: 1`. Preserved requirement for exactly one trusted proxy (e.g., Render router or single Nginx instance) with restricted backend ingress and header replacement.
- **Provider & Embedding Precedence**: Documented exact precedence from code:
  - `OPENAI_API_KEY`: Selects OpenAI for chat (`gpt-4o-mini`) and embeddings (`text-embedding-3-small`).
  - `GEMINI_API_KEY`: Selects Gemini for chat (`gemini-1.5-flash`), but **Gemini does not provide embeddings**. Embeddings still fall back to local Ollama (`nomic-embed-text:latest` via `OLLAMA_URL`) or keyword scoring.
  - Documented Ollama model override variables: `OLLAMA_CHAT_MODEL`, `OLLAMA_EMBED_MODEL`.
- **Cost & Grounding Assertions**: Clarified that FinOps cost is a four-decimal estimate (`$0.0000`); local models and small requests legitimately show zero cost. Clarified that demo replies are deterministic fixture strings, and factual accuracy checks are strictly required during the separately authorized support-mode smoke check.

### 2.2 Rollback Procedures (`docs/release/rollback-plan.md`)
- **Corrected Git Revert Syntax**: Removed invalid `git revert -m 1 ... -m "message"`. Clarified that `-m` in `git revert` is exclusively `--mainline <parent-number>` to select the mainline parent (parent 1). Clarified that `--no-edit` accepts git's generated default message without launching an interactive editor.
  - True merge: `git revert -m 1 <MERGE_COMMIT_SHA>`.
  - Squash merge: `git revert <SQUASH_COMMIT_SHA>` (regular commit, no `-m`).
  - Fast-forward integration: for a verified contiguous linear range without merges, specify `git revert <PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>`, which correctly includes every commit in the range and reverts in reverse order. For histories containing merges, do not use a generic range; identify each commit and its verified mainline parent explicitly.
  - Explicitly prohibited `git reset --hard` or rewriting `main`.
- **Platform Immutable Revision Preference**: Prioritized platform-managed immutable artifact rollback over git reverts; labeled UI button names as unverified until observed directly in the live dashboard.
- **Rollback Contract Verification**: Clarified that restoring an earlier prototype revision may restore older UI/routes (e.g., legacy `/` instead of `/console/`, no session cookies); recovery verification must test against the actual rollback revision's documented contracts.
- **Private Environment Backups**: Required environment backups to use an approved private secret manager (e.g., Doppler, 1Password); prohibited saving actual secret values to git, receipts, logs, or chat.

### 2.3 README.md Review & Link Verification
- Reviewed Codex's intentional rewrite of `README.md`:
  - Verified Node version requirement: Node 22.12+ (LTS line) required by Vitest; noted Dockerfile Node 20 alignment needed for container testing.
  - Verified internal documentation links: [docs/deployment.md](docs/deployment.md), [docs/release/staging-plan.md](docs/release/staging-plan.md), [docs/release/rollback-plan.md](docs/release/rollback-plan.md), [docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md](docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md), [docs/adr/README.md](docs/adr/README.md), [docs/release/safe-foundation-pr.md](docs/release/safe-foundation-pr.md), [CONTRIBUTING.md](CONTRIBUTING.md). All links exist and are valid.
  - Verified truthful license statement: noted no license file is included, avoiding premature claims of MIT distribution.
  - Distinguishes tested product baseline (116 unit tests, 62 browser tests) from a live badge.

---

## 3. Checks Actually Run in This Pass

- Document and link checks: verified all internal markdown links resolve to existing files.
- Command validation: verified git revert range semantics (`<A>..<B>` excludes A, hence `<PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>` includes all release commits).
- Git status check: `git status --short` confirmed working tree contains pre-existing reviewed `README.md` and scoped doc updates.
- Source code checks against `server/session/middleware.js`, `server/services/llm.js`, `server/services/embeddings.js`, `server/config/env.js`: all verified.
- *Note*: Full test suites were not rerun in this pass because no product code was altered. Product tree remains at verified commit `4b659bc` (`npm test` 116 passed exit 0, `npm run test:browser` 62 passed exit 0).

---

## 4. Deferred Verification & Exact Next Approval Boundary

- **Deferred**: Real provider connectivity, model availability, document suitability, and live hosting settings remain UNVERIFIED.
- **Next Approval Boundary**:
  - **STOP HERE**. No git push, GitHub pull request creation, branch merge, or Render production deployment has been authorized.
  - Next step: Inspect live hosting settings read-only before requesting authorization for a concrete staging release.
