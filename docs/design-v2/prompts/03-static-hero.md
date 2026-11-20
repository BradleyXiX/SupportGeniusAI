# 03: Static hero composition

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/03-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/02-receipt.md`

## Task

Replace only the hero with design sections 2,5,6: left headline Your knowledge. / A clearer / answer., approved lead, two working CTAs, right SVG point sculpture with intrinsic dimensions and illustration caption. Add capability strip only if owned wholly here; otherwise leave it for 05 and note. Deliver the complete static composition before motion. Do not use a hardcoded Demo badge on marketing. Include explicit optional motion control but keep it hidden or disabled with explanatory text until task 04 implements it; no dead interactive button.

## Owned paths

client/index.html hero, scoped marketing.css hero rules, client/assets/brand/signal-core-poster.svg.

## Required evidence

Verify first paint with JS disabled, no overflow at 320, visible focus, text contrast, CTA destinations, sculpture dimensions and no broken asset. Existing route/keyboard tests; screenshot desktop/phone.

## Commit

`feat(marketing): compose knowledge hero`
