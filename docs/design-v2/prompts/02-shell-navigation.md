# 02: Marketing shell and navigation

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/02-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/01-receipt.md`

## Task

Create scoped marketing.css and migrate only page framing/header/main/footer placeholder structure from design sections 4–5. Keep existing sections usable until their individual tasks replace them. Use real links #system/#experience/#deployment when targets exist; otherwise preserve existing target until its section lands. Preserve skip link and one H1. Desktop warm outer frame/graphite shell and mobile insets, native scrolling. No reveal animations yet. Keep shared console layout untouched.

## Owned paths

client/marketing.css, client/index.html shell/header, client/landing.js anchor wiring only.

## Required evidence

Check 1440,390,320 widths, keyboard skip link and CTA to /console/, no duplicate IDs, no console layout regression, no hidden primary content without JS. Run affected browser route/a11y tests and diff check.

## Commit

`feat(marketing): build architectural page shell`
