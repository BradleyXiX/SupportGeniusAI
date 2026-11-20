# 04: Optional true 3D sculpture

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/04-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/03-receipt.md`

## Task

Adapt the native WebGL reference module into client/marketing/signal-core.js, imported only after Enable motion. Add lifecycle tests first: reduced-motion prevents import; visibility/intersection pause; pause destroys resources; context loss restores poster; repeated enable/pause does not grow listeners/resources. Keep renderer-local state, capped DPR 1.5, one frame loop, static poster initially. Native scroll changes camera orientation only. Add a small controller in landing.js with cleanup. Important text remains semantic HTML. No fake process state, new framework, CDN or weakened CSP.

## Owned paths

client/marketing/signal-core.js, client/landing.js, hero control and canvas fragment, lifecycle tests.

## Required evidence

Run focused new tests plus applicable existing tests; browser verify enable/pause, runtime reduced-motion, failed WebGL, hidden/offscreen state and console navigation. Measure gzip module size and inspect idle draw behavior. Capture enabled and poster states.

## Commit

`feat(marketing): add optional signal core motion`
