# Production & Staging Rollback Guide

*Diátaxis type: How-To Guide.* Standard rollback procedure for SupportGenius AI hosted deployments. Never infer live production state from local Git branches or commit history, and never store real secret values in Git, receipts, or logs.

## 1. Pre-release operator checklist

Before merging or deploying a release, inspect the live hosting dashboard (for example, Render) and record:

1. **Tracked branch & auto-deploy settings**: Confirm which branch triggers deployments and whether preview deploys are enabled.
2. **Active live revision**: Record the exact immutable commit SHA currently marked `Live` (`DEPLOYED_PRE_RELEASE_SHA=<sha>`).
3. **Environment variable backup**: Record all active environment variable **names** and verify their values are backed up in an approved secret manager (not in Git or chat).

## 2. Failure triggers requiring rollback

Initiate rollback if any of the following occur after deployment:

1. **Startup failure**: Process exits on boot due to Zod environment validation (`NODE_ENV`, `PUBLIC_ORIGIN`, `SESSION_SECRET`, or provider config).
2. **Liveness failure**: `GET /health` fails to return HTTP `200` within 60 seconds.
3. **Origin or session failures**: `/console/` requests receive persistent `403 Forbidden` (`INVALID_ORIGIN`) or `409 Conflict` (`SESSION_BUSY`).
4. **Upstream outage / timeouts**: Repeated `502` or `504` responses exceeding the 20s provider / 30s server budgets.
5. **Memory pressure**: Process RSS approaches container limits.

## 3. Rollback procedure

Rollback execution requires explicit operator authorization. Never rewrite or force-reset `main` (`git reset --hard` on shared history is prohibited).

### Step 1: Revert code or redeploy prior artifact

- **Option A — Platform immutable rollback (preferred)**:
  1. Locate the previously verified live deploy (`DEPLOYED_PRE_RELEASE_SHA`) in the hosting dashboard.
  2. Trigger the platform's rollback / redeploy action for that exact artifact (verify exact dashboard control labels before confirming).
- **Option B — Git revert via pull request**:
  If the platform deploys from `main` via new commits, open a revert PR matching how the release was integrated:
  - **Merge commit**: `git revert -m 1 <MERGE_COMMIT_SHA>` (`-m 1` selects the mainline parent).
  - **Squash commit**: `git revert <SQUASH_COMMIT_SHA>`.
  - **Linear fast-forward range** (verified no merge commits): review `git log --oneline <PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>`, then run `git revert <PRE_RELEASE_SHA>..<RELEASE_HEAD_SHA>`.

### Step 2: Reconcile environment variables

Reverting code does **not** automatically revert hosting environment variables.

1. Compare the restored revision's required variables against the live dashboard (for example, `LLM_PROVIDER`, `RETRIEVAL_MODE`, `GEMINI_MODEL`, `PUBLIC_ORIGIN`, `SESSION_SECRET`).
2. Restore any pre-release variable values from your secret manager, save changes, and trigger a manual redeploy if required.

### Step 3: Account for ephemeral sessions

Any container restart terminates the Node process and clears all in-memory `memorystore` sessions. Active visitors will receive `401 Unauthorized` (`SESSION_REQUIRED`) and can start a fresh session via **New conversation** in `/console/`.

## 4. Post-rollback verification

Verify against the **actual restored revision's** routes and contracts:

- [ ] `GET https://<service-url>/health` returns HTTP `200` with `status: "healthy"`.
- [ ] `GET https://<service-url>/capabilities` returns the expected `mode`, `actionsEnabled`, and `sessionRequired` fields.
- [ ] `/` and `/console/` load cleanly with expected security headers and zero startup errors in container logs.
- [ ] One representative query succeeds in the restored environment's configured mode.
