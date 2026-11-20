# 01: Shared brand foundation

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/01-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/00-receipt.md`

## Task

Install the provided signal-prism mark, mono version, favicon and licensed font subsets into client/assets/brand and client/assets/fonts. Add a small shared brand.css with semantic tokens and @font-face. Apply the mark and favicon on both routes without replacing layout or behavior. Preserve existing type families. Keep current shared CSS fallback until section migration. If needed append a short architecture note for optional lightweight marketing art; do not erase the existing guardrails or install overlapping skills.

## Owned paths

client/assets/**, client/brand.css, favicon/font link and identity-only fragments in client/index.html and client/console/index.html.

## Required evidence

Verify all local assets return 200, no external font requests, both routes readable, brand accessible names, no SVG script, no missing font weights. Run existing affected smoke tests, JS syntax for changed modules, git diff --check; capture both headers.

## Commit

`feat(brand): introduce SupportGenius signal identity`
