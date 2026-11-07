# Production & Staging Rollback Plan

- **Target Service**: SupportGeniusAI
- **Current Branch**: `feature/safe-support-foundation`
- **Release Target**: Production / Staging Promotion
- **Security Policy**: Secret values must never be stored in git, receipts, logs, or chat. Environment backups must use an approved private secret-management mechanism (e.g., Doppler, 1Password, or secure platform environment manager) storing references and variable names only.

---

## 1. Baseline & Currently Deployed Revision

- **Currently Deployed Production Revision**: **UNKNOWN** (The active production commit deployed on Render cannot be verified locally without read-only access to the live Render dashboard or deployment API).
- **Locally Recorded Remote Reference (`origin/main`)**: `9b500e2f7e4b07329a4b7e5873ebd22c5bfa239c` (Distinguished as a local git reference; not verified against fresh remote hosting state).

### 1.1 Pre-Release Operator Action: Record Live Deployment & Environment Reference
Before initiating any deployment or merge, the operator **must manually verify and record** the currently running state:
1. Open the hosting dashboard (e.g., [dashboard.render.com](https://dashboard.render.com)).
2. Inspect the connected service's tracked branch, automatic/preview deployment settings, and currently active deploy marked `Live`.
3. Record the full immutable commit SHA (e.g., `DEPLOYED_PRE_RELEASE_SHA = <commit-hash>`).
4. Securely record all active Environment Variable **names** and securely store their values in an approved private secret manager (e.g., 1Password, Doppler, or secure vault). Never paste actual secret values into git commits, receipts, logs, or chat.

---

## 2. Failure Triggers Requiring Rollback

Initiate rollback immediately if any of the following occur post-deployment:
1. **Container Startup Failure**: Server fails environment validation (`NODE_ENV`, `PUBLIC_ORIGIN`, `SESSION_SECRET`) and crashes on boot (`process.exit(1)`).
2. **Health Probe Failure**: `/health` does not respond with HTTP `200` within 60 seconds of deployment.
3. **Severe Origin / Session Contention**: `/console/` queries receive continuous HTTP `403 Forbidden` (`INVALID_ORIGIN`) or continuous `409 Conflict` (`SESSION_BUSY`) errors.
4. **Upstream Latency Spike**: Provider requests consistently exceed the 20s LLM timeout or 30s server total deadline, triggering repeated 504 errors.
5. **Runtime Memory Leaks**: Process RSS exceeds container memory limits.

---

## 3. Rollback Procedure

Execution of rollback must be separately authorized. Never attempt to rewrite or reset `main` (`git reset --hard` is strictly prohibited).

### Step 1: Code Reversion / Redeployment
Prefer platform-managed rollback to the immutable deployment artifact/revision when supported:

- **Option A (Platform Immutable Rollback — Preferred)**:
  1. In the hosting dashboard, locate the previously verified live deployment (`DEPLOYED_PRE_RELEASE_SHA`).
  2. Select the platform's redeploy or rollback action for that specific immutable artifact. *(Note: Exact UI button labels and paths are unverified until observed directly in the live hosting interface; verify in dashboard before clicking).*
- **Option B (Git Reversion via PR)**:
  If the platform tracks `main` and requires a new commit to trigger deployment, create a revert commit on a separate branch based on the actual integration method used:
  - **True Merge**: Revert the merge commit specifying parent 1 (the mainline):
    ```bash
    git revert -m 1 <MERGE_COMMIT_SHA>
    ```
    *(Note: `-m 1` specifies the mainline parent number; it is not a message flag. `--no-edit` accepts git's generated revert message without opening an interactive editor).*
  - **Squash Merge**: A squash merge creates a single regular commit, not a merge commit. Revert it directly without `-m`:
    ```bash
    git revert <SQUASH_COMMIT_SHA>
    ```
  - **Fast-Forward Integration (Linear Sequence)**: A fast-forward integration creates no merge commit. If the deployed history is a verified contiguous linear range without merges, specify the range relative to the pre-release commit:
    ```bash
    git revert <PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>
    ```
    *(Note: `<A>..<B>` includes commits reachable from `B` excluding `A`. Specifying `<PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>` correctly captures every release commit and reverts them in reverse order. Review the exact commit list via `git log --oneline <PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>` before executing. If the released range contains merge commits, do not prescribe a generic range; identify each commit and its verified mainline parent explicitly).*
  Merge the approved revert PR to trigger redeployment of the prior code.

### Step 2: Environment Variable Reversion
> [!IMPORTANT]
> Reverting code alone does **NOT** automatically revert environment variables in the hosting dashboard.

Restoring an earlier prototype revision (e.g., prior to `03886d2` or `9b500e2`) may restore code with different environment expectations (such as older prototype code that did not validate `SESSION_SECRET` or `PUBLIC_ORIGIN`):
1. Retrieve the pre-release environment configuration from your approved private secret manager.
2. In the hosting dashboard, adjust environment variables to match the requirements of the restored revision.
3. Save changes and trigger a manual redeploy if environment changes require a container restart.

### Step 3: Accounting for Ephemeral Session Invalidation
- Any container redeployment terminates the in-memory Node process, permanently discarding all active session histories in `InMemorySessionStore`.
- Connected clients will have their sessions invalidated.

---

## 4. Post-Rollback Recovery Verification Checklist

Verify recovery against the **actual rollback revision's documented routes and contracts**, not assuming Safe Support Foundation routes:
- [ ] **Liveness Probe**: `curl -s https://<service-url>/health` returns HTTP 200 with `status: "healthy"`.
- [ ] **Application Shell Access**:
  - If rolling back to `design/signal-desk-v1` (`03886d2`): verify `/console/` and `/` load correctly.
  - If rolling back to pre-redesign prototype (`9b500e2`): verify legacy `/` interface loads (note: `/console/` and `__Host-` cookie sessions do not exist in that prototype).
- [ ] **Basic Query Flow**: Submit a query appropriate to the restored revision and verify response generation.
- [ ] **Log Inspection**: Inspect container logs to verify zero startup crashes or unhandled exceptions.
