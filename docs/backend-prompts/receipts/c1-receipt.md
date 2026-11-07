# Task C1 Receipt — Release & Staging Preparation (Corrected)

- **Task**: C1 — Release and staging preparation (executable release plans)
- **Branch**: `feature/safe-support-foundation`
- **Base SHA**: `03886d2a64d5bff18ee5be6bd50e9ff75c328bc5` (stems from `design/signal-desk-v1` at `03886d2`)
- **Verified Product Commit**: `4b659bc3ca8ba40562e6d5bfbb67ad10492cb3e5` (116 unit tests, 62 browser tests)
- **Documentation Commits**: `895369e` (B7 receipt), `76d4934` (initial C1 plans)
- **Status**: Complete. Release PR draft, staging deployment plan, and rollback procedures updated with corrected executable guidance, strict secret boundaries, and verified code interfaces.

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
- **Corrected Git Revert Syntax**: Removed invalid `git revert -m 1 ... -m "message"`. Documented that `-m` in `git revert` is exclusively `--mainline <parent-number>`:
  - True merge: `git revert -m 1 <MERGE_COMMIT_SHA>`.
  - Squash merge: `git revert <SQUASH_COMMIT_SHA>` (regular commit).
  - Fast-forward merge: revert release commits in reverse order (`git revert <OLDEST>..<NEWEST>`).
  - Explicitly prohibited `git reset --hard` or rewriting `main`.
- **Platform Immutable Revision Preference**: Prioritized platform-managed immutable artifact rollback over git reverts; labeled UI button names as unverified until observed directly in the live dashboard.
- **Rollback Contract Verification**: Clarified that restoring an earlier prototype revision may restore older UI/routes (e.g., legacy `/` instead of `/console/`, no session cookies); recovery verification must test against the actual rollback revision's documented contracts.
- **Private Environment Backups**: Required environment backups to use an approved private secret manager (e.g., Doppler, 1Password); prohibited saving actual secret values to git, receipts, logs, or chat.

---

## 3. Checks Actually Run in This Pass

- Source code checks against `server/session/middleware.js`, `server/services/llm.js`, `server/services/embeddings.js`, `server/config/env.js`: all verified.
- Git state verification:
  - `git branch --show-current`: `feature/safe-support-foundation`
  - `git rev-parse HEAD`: verified current commit.
  - `git status --short`: verified clean working tree prior to doc edits.
- *Note*: Full test suites were not rerun in this pass because no product code was altered. Product tree remains at verified commit `4b659bc` (`npm test` 116 passed exit 0, `npm run test:browser` 62 passed exit 0).

---

## 4. Deferred Verification & Exact Next Approval Boundary

- **Deferred**: Real provider connectivity, model availability, document suitability, and live hosting settings remain UNVERIFIED.
- **Next Approval Boundary**:
  - **STOP HERE**. No git push, GitHub pull request creation, branch merge, or Render production deployment has been authorized.
  - Next step: Inspect live hosting settings read-only before requesting authorization for a concrete staging release.
