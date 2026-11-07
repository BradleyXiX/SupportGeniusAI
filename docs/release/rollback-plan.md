# Production & Staging Rollback Plan

- **Target Service**: SupportGeniusAI
- **Current Branch**: `feature/safe-support-foundation`
- **Release Target**: Production / Staging Promotion

---

## 1. Baseline & Currently Deployed Revision

- **Currently Deployed Production Revision**: **UNKNOWN** (The active production commit deployed on Render cannot be verified locally without access to the live Render dashboard or deployment API).
- **Locally Recorded Remote Reference (`origin/main`)**: `9b500e2f7e4b07329a4b7e5873ebd22c5bfa239c` (Note: This is a locally recorded git ref and does not guarantee this specific SHA is the active live deployment).

### 1.1 Pre-Release Operator Action: Record Live Deployment
Before initiating any deployment or merge, the operator **must manually verify and record** the currently running commit:
1. Open the hosting dashboard (e.g., [dashboard.render.com](https://dashboard.render.com)).
2. Navigate to the `supportgenius-ai` Web Service -> **Events** / **Deploys** tab.
3. Identify the currently active deploy marked with `Live`.
4. Record the full commit SHA (e.g., `DEPLOYED_PRE_RELEASE_SHA = <commit-hash>`).
5. Record all current Environment Variables from the Render **Environment** tab before modifying any variables.

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

### Step 1: Code Reversion / Redeployment in Dashboard
Depending on hosting capabilities:
- **Option A (Manual Redeploy from Render Dashboard)**:
  1. In the Render Web Service dashboard, go to the **Deploys** tab.
  2. Locate the prior stable deployment identified in Section 1 (`DEPLOYED_PRE_RELEASE_SHA`).
  3. Click the actions menu (`...`) on that specific deployment and select **Rollback to this deploy** (or **Redeploy this commit**).
- **Option B (Git Reversion via PR)**:
  1. If hosting uses automatic git deployment tracking `main`, create a revert commit on a clean branch:
     ```bash
     git revert -m 1 <MERGE_COMMIT_SHA> -m "revert: rollback Safe Support Foundation release"
     ```
  2. Merge the revert commit to trigger redeployment of the prior code.

### Step 2: Environment Variable Reversion
> [!IMPORTANT]
> Rolling back the code commit alone does **NOT** automatically revert environment variables in the hosting dashboard.

If environment variables were updated during release:
1. Review the recorded pre-release environment variables.
2. If `PUBLIC_ORIGIN`, `APP_MODE`, or `SESSION_SECRET` were modified or introduced, ensure they are compatible with the rolled-back code revision.
3. If rolling back to a pre-foundation prototype revision that did not recognize `SESSION_SECRET` or required legacy settings, restore the exact prior environment values in the dashboard.
4. Save changes and trigger a manual redeploy.

### Step 3: Accounting for Ephemeral Session Invalidation
- **Session Loss Impact**: Any rollback or container redeployment terminates the in-memory Node.js process and **permanently discards all active session states** in `InMemorySessionStore`.
- Any customer currently interacting with the console will receive an HTTP `401 Unauthorized` (`SESSION_REQUIRED`) on their subsequent request.
- The Signal Desk client console is designed to handle this gracefully by prompting the customer to click `New conversation` to re-initialize an anonymous session.

---

## 4. Post-Rollback Verification Checklist

Verify recovery immediately after the rollback deploy is marked `Live`:
- [ ] **Liveness Probe**: `curl -s https://<service-url>/health` returns HTTP 200 with `status: "healthy"`.
- [ ] **Console Access**: Open `https://<service-url>/console/` in a clean browser session; verify Signal Desk UI loads without JavaScript errors.
- [ ] **Query Execution**: Submit a test question; verify response renders and connection beacon indicates operational status.
- [ ] **Log Inspection**: Inspect container runtime logs; verify absence of unhandled exception crashes or environment validation errors.
