# 10: Integrated responsive and motion verification

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/10-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/09-receipt.md`

## Task

Perform one coherent cross-page browser pass. Fix only reproducible responsive/a11y/performance integration defects in the new UI. Test 1440×1000,390×844,320×800, keyboard, reduced-motion at first load/runtime, no-JS, context loss, slow/failing optional module, repeated mounting/disposal, console route/back and long sample text. Use axe plus manual checks. No new art direction, library or feature. Record static asset/gzip sizes, lab LCP/CLS and interaction trace where available; never call a lab result field INP.

## Owned paths

Changed frontend files and targeted regression tests; verification.md/json and evidence screenshots.

## Required evidence

npm test; npm run test:browser; JS syntax checks for changed modules; git diff --check; all links; 0 serious/critical axe findings in tested states; no console errors/CSP errors; measurable budgets per design section 9. Capture conditions and remaining real-device/field gaps.

## Commit

`fix(ui): verify responsive signal architecture journey`
