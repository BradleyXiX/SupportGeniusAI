# 04 — Default-on motion, pause and hover

Read applicable AGENTS.md, root design.md, docs/design-v3/design-enhancements.md and the previous receipt. Use web-ui-studio as the primary design workflow. Work only on the isolated crimson enhancement branch. Preserve unrelated edits. No push, merge to main, deploy, hosting changes, framework migration, Lenis, customer actions, new telemetry claims or backend feature work.

## Task

Implement addendum lifecycle state machine and preference precedence. Auto-start eligible visible hero after first paint; persistent global pause; reduced-motion override; cancel pending imports and preserve true failed state. Add fine-pointer local tilt/displacement with cached dimensions and touch fallback. Preserve 46a3608 cancellation regressions. Test storage failure, auto-start, no-JS, pause reload, OS changes, pagehide/import/pageshow, failure, pointerleave and context loss.

## Owned scope

landing controller, shared motion policy module, signal core hover, relevant lifecycle tests.

## Acceptance and commit

Follow the addendum's exact palette/legibility/motion/budget rules. Keep page order and working routes. Record purposeful deviations instead of silently adding a new design direction. Run existing relevant checks; add behavior tests for new lifecycle/interaction changes, not copies of CSS declarations. Use one planned browser pass for the affected journey and record desktop/phone, keyboard, reduced-motion, no-JS, failure states and any measured budgets. Task 10 runs the full integration suite; do not repeatedly rerun unrelated suites without a reason.

Write docs/design-v3/receipts/04-receipt.md with branch, parent SHA, changed paths, actual commands/exits/counts, screenshots, evidence gaps and next task. git diff --check before staging explicit paths. Commit only owned work and its receipt with a descriptive conventional message; no git add . or history rewrite. Report new commit SHA and final git status --short separately. Stop after this named task. If prerequisites differ, preserve state and report evidence before expanding scope.
