# 01 — Recolor the shared identity

Read applicable AGENTS.md, root design.md, docs/design-v3/design-enhancements.md and the previous receipt. Use web-ui-studio as the primary design workflow. Work only on the isolated crimson enhancement branch. Preserve unrelated edits. No push, merge to main, deploy, hosting changes, framework migration, Lenis, customer actions, new telemetry claims or backend feature work.

## Task

Introduce semantic crimson/black/white tokens from the addendum. Update original prism variants, favicon, wordmark, focus and error/state colors on both routes. Keep layout and content order. Audit old amber/mint literals including orb.js and SVGs; replace by meaning, not blanket substitution. Verify actual contrast pairs and maintain readable light sections.

## Owned scope

client/brand.css, scoped marketing/base palette, client/assets/brand; state-color rules only.

## Acceptance and commit

Follow the addendum's exact palette/legibility/motion/budget rules. Keep page order and working routes. Record purposeful deviations instead of silently adding a new design direction. Run existing relevant checks; add behavior tests for new lifecycle/interaction changes, not copies of CSS declarations. Use one planned browser pass for the affected journey and record desktop/phone, keyboard, reduced-motion, no-JS, failure states and any measured budgets. Task 11 runs the full integration suite; do not repeatedly rerun unrelated suites without a reason.

Write docs/design-v3/receipts/01-receipt.md with branch, parent SHA, changed paths, actual commands/exits/counts, screenshots, evidence gaps and next task. git diff --check before staging explicit paths. Commit only owned work and its receipt with a descriptive conventional message; no git add . or history rewrite. Report new commit SHA and final git status --short separately. Stop after this named task. If prerequisites differ, preserve state and report evidence before expanding scope.
