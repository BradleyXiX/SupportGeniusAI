# 09: Console brand application

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/09-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/08-receipt.md`

## Task

Apply the shared mark, graphite palette, restrained amber and readable type to the real /console/ shell. Use reference/console.html only for visual intent; retain real app.js/chat-state.js behavior, DOM IDs, capability/mode, sanitizer, pending/reset/retry/cost logic and existing data contracts. No canned chat handler, cinematic background or invented processing stages. Keep actual disabled/loading/error states and genuine unavailable cost. Prefer scoped CSS and identity markup; a functional bug belongs to a separate task.

## Owned paths

client/console/index.html identity/shell only, client/brand.css and scoped console CSS additions; no server or request lifecycle edits.

## Required evidence

Run npm test and npm run test:browser with local demo config. Check send, single flight, Enter/IME, reset, network error/manual recovery, rate-limit state, unavailable cost, anonymous session bootstrap, keyboard and mobile. Capture empty/answered/error console states; disclose any unchanged inherited failure.

## Commit

`feat(console): apply signal brand to workspace`
