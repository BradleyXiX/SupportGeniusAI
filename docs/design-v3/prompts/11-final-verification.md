# 11 — Verify integrated performance and behavior

Read applicable AGENTS.md, root design.md, docs/design-v3/design-enhancements.md and the previous receipt. Use web-ui-studio as the primary design workflow. Work only on the isolated crimson enhancement branch. Preserve unrelated edits. No push, merge to main, deploy, hosting changes, framework migration, Lenis, customer actions, new telemetry claims or backend feature work.

## Task

Run full unit/browser suites and one final cross-page verification pass at1440/390/320, keyboard, no-JS, reduced motion, errors, pending and answered console. Compare baseline cold-run medians and 6x CPU-throttled motion/scroll/hover trace; capture exact setup. Demonstrate offscreen/tab stopping and degradation under budget pressure. Correct only proven defects, preserve existing assertions when adapting opt-in tests to default-on. Report real-device/field limitations, final SHA and clean status; no publish.

## Owned scope

focused frontend corrections/tests; final verification report and screenshots.

## Acceptance and commit

Follow the addendum's exact palette/legibility/motion/budget rules. Keep page order and working routes. Record purposeful deviations instead of silently adding a new design direction. Run existing relevant checks; add behavior tests for new lifecycle/interaction changes, not copies of CSS declarations. Use one planned browser pass for the affected journey and record desktop/phone, keyboard, reduced-motion, no-JS, failure states and any measured budgets. Task 11 runs the full integration suite; do not repeatedly rerun unrelated suites without a reason.

Write docs/design-v3/receipts/11-receipt.md with branch, parent SHA, changed paths, actual commands/exits/counts, screenshots, evidence gaps and next task. git diff --check before staging explicit paths. Commit only owned work and its receipt with a descriptive conventional message; no git add . or history rewrite. Report new commit SHA and final git status --short separately. Stop after this named task. If prerequisites differ, preserve state and report evidence before expanding scope.
