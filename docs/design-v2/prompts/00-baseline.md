# 00: Baseline and branch

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/00-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

No previous implementation receipt is required; read the Codex planning receipt.

## Task

No product changes. Verify this is BradleyXiX/SupportGeniusAI at or descended from 35f0793 on the dedicated branch. The kit should exist at docs/design-v2 and design.md at root. Read instructions and preserve all existing skills. Record current root/client/server file map, package scripts and operating-mode/action/citation limits. Confirm README concept images are labelled. If on clean main, create the dedicated branch from the inspected HEAD; never silently switch away from a dirty branch. Do not fetch/push to prove isolation.

## Owned paths

Root design.md, kit docs, receipt only.

## Required evidence

Run git status --short --branch; git log -5 --oneline; npm test; git diff --check. Capture baseline / and /console/ with local demo mode at 1440×1000 and 390×844, checking actual route loads. Record test counts and Node runtime.

## Commit

`docs: record signal architecture baseline`
