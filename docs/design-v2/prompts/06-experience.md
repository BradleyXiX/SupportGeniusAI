# 06: Interactive example conversations

Work only in the actual SupportGeniusAI repository. Read applicable AGENTS.md, root design.md, docs/design-v2/execution-plan.md, this task, and the previous receipt. Use web-ui-studio as the primary design workflow. The current user request takes precedence over historical prompts in the PDF and earlier phase docs. Keep one design direction and one owner per animated property.

Verify branch design/signal-architecture-v2, inspect status and base ancestry before editing. Preserve other work. No automatic stash/reset/force checkout, blanket git add, framework migration, Lenis, custom cursors, backend/API changes, real provider calls, push, merge, deployment, or hosting edits. The project is vanilla ES modules plus Express; do not invent TypeScript/build commands. Use local/mock fixtures for checks.

Implement ONLY this task. Match design.md and the runnable reference; do not paste reference fixtures into the real console. Production marketing CTAs point to /console/. Perform the named checks and one planned browser verification pass for the affected journey. Write docs/design-v2/receipts/06-receipt.md using the template, stage only owned paths plus receipt, then commit with the supplied message when required checks pass. A missing prerequisite or failure must be reported with evidence; do not silently expand scope. Stop after the commit. Return branch, parent/new SHA, changed paths, check exits/counts, screenshot paths, and limitations in under 500 words.

## Prerequisite

`docs/design-v2/receipts/05-receipt.md`

## Task

Build off-white #experience with charcoal sample panel matching design section 6. Returns/shipping/hours buttons use immediate deterministic text updates, aria-pressed and a polite atomic result. Labels visibly say scripted example/no API calls. Add tests for each selection, rapid switching, malicious text rendered safely and zero landing-page /chat or /session requests. Use textContent. Keep console CTA to actual /console/. Do not display citations, tool calls, confidence scores, latency numbers or real order IDs.

## Owned paths

client/index.html experience, client/marketing.css experience rules, client/marketing/examples.js, landing wiring and focused tests.

## Required evidence

Run new focused tests and relevant browser checks; keyboard and touch scenario switching, labels/announcements, stable panel dimensions, no horizontal overflow, no API requests or font/CDN surprises. Capture desktop/phone selected states.

## Commit

`feat(marketing): add labelled example conversations`
