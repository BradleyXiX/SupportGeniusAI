# 08: Closing journey

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/08-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/07-receipt.md`

## Task

Build closing light section and footer from design sections 5–6. Same real /console/ CTA, brand and useful back-to-top. Optional rings are decorative static CSS, never over copy. Remove stale old landing sections and their now-unused marketing-only rules only after all replacement sections exist. Preserve console selectors. No testimonial carousel or logo wall without approved real evidence.

## Owned paths

client/index.html closing/footer and obsolete marketing fragments, marketing.css corresponding rules; scoped old marketing CSS cleanup only.

## Required evidence

Verify every header/section/footer link and anchor, one H1, landmarks, no missing destinations, keyboard focus and phone wrap. Run route/a11y smoke tests, no-JS journey, diff check.

## Commit

`feat(marketing): complete closing brand journey`
