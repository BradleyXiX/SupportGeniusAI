# Antigravity implementation plan

Type: how-to / delivery plan. Use `design/signal-architecture-v2`; base `35f0793`. Run one prompt per session, in order. Do not merge or deploy. The current Codex work commits planning/reference assets and documentation, not production frontend integration.

## File and responsibility map

| Area | Existing | Target / ownership |
| --- | --- | --- |
| Visual authority | Older Signal Desk specs | Root `design.md` + `docs/design-v2/design.md`, updated together |
| Shared identity | Text-only header | `client/assets/brand/`, root favicon links; one mark source |
| Fonts | Google CSS on both routes | `client/assets/fonts/`, licensed local subsets, shared `brand.css` |
| Landing markup | `client/index.html` | One owned section per prompt, preserve landmark/route semantics |
| Marketing style | Shared `client/styles.css` | `client/marketing.css`, scoped `[data-page="marketing"]` tokens; leave console base intact |
| Marketing interactions | `client/landing.js` | Small module orchestrator importing chapters/examples/core; no console request lifecycle |
| Sculpture | Small existing `orb.js` | New optional `client/marketing/signal-core.js`; existing console orb retained |
| Console brand | `client/console/index.html`, shared CSS | Brand shell only; scoped console additions, existing IDs/events retained |
| Live assistant | `client/app.js`, `chat-state.js`, backend | Out of redesign scope, except a separately justified bug task |
| Evidence | Existing browser tests | Extend focused contracts and regression probes; screenshots under `docs/design-v2/screenshots/` |
| Front page docs | Root README | Final actual screenshots + current capability matrix, no fake CI/award badge |

## Sequence and commits

| Prompt | Deliverable | Commit |
| --- | --- | --- |
| 00 | Verify base/branch, current tests, route baseline, instructions | `docs: record signal architecture baseline` |
| 01 | Shared mark, favicon, fonts, tokens | `feat(brand): introduce SupportGenius signal identity` |
| 02 | Scoped marketing shell and navigation | `feat(marketing): build architectural page shell` |
| 03 | Static split hero and SVG poster | `feat(marketing): compose knowledge hero` |
| 04 | Optional native WebGL enhancement with lifecycle | `feat(marketing): add optional signal core motion` |
| 05 | Three system chapters and strip | `feat(marketing): explain document support system` |
| 06 | Honest scripted interactive experience | `feat(marketing): add labelled example conversations` |
| 07 | Asymmetric deployment explanation | `feat(marketing): explain deployment boundaries` |
| 08 | Closing CTA and footer | `feat(marketing): complete closing brand journey` |
| 09 | Console visual identity with live behavior preserved | `feat(console): apply signal brand to workspace` |
| 10 | One cross-page responsive/a11y/performance integration pass | `fix(ui): verify responsive signal architecture journey` |
| 11 | Actual screenshots, README, final handoff | `docs: publish verified product and design guide` |

One section per commit is useful when it produces a working checkpoint. Foundations and shared lifecycle code need their own commits; do not force them into the hero's markup commit. A corrective commit is better than hiding unrelated fixes inside a section. Do not amend/rewrite accepted commits merely to make history look cleaner.

## Verification cadence

Before any edit, inspect `git status --short`, branch, base, current instructions and previous receipt. Preserve unrelated changes; no automatic stash, reset, force checkout, or blanket staging. Stage explicit scoped paths. Stop if a prerequisite is missing or a functional regression requires backend work; document evidence and isolate that task.

For static visual changes, use syntax checks, `git diff --check`, relevant existing tests, and one planned browser journey. Avoid snapshot tests that merely mirror markup. Add behavior tests before implementation for genuinely new interactions (sample selection, disclosure behavior if custom, WebGL gating/lifecycle). Do not invent `npm run build` or `tsc --noEmit`: this application has neither a build script nor TypeScript. A new toolchain is outside the plan.

Run the full `npm test` baseline in 00 and the final integration milestone, plus focused existing affected tests between them. Run `npm run test:browser` when console/shared behavior changes and at integration. Browser dependencies and the app server must use a working compatible Node runtime. Existing Playwright config creates isolated demo mode; never run test traffic against production or configured paid providers.

Screenshots: one coherent pass per completed milestone, using 1440×1000 and 390×844; final integration additionally checks 320×800, reduced-motion, no-JS and WebGL failure. Record screenshots as evidence, not automatic aesthetic approval. Re-run only the affected journey when a failure or change requires it. Record inherited failures distinctly.

## Receipt and review loop

Write `docs/design-v2/receipts/NN-receipt.md` before committing. Receipt records parent SHA, branch, changed files, short reason, actual commands/exits/counts, interaction outcomes, screenshot paths and gaps. Commit receipt with its scoped implementation; after commit report the SHA separately (a receipt cannot contain its own final SHA without a circular rewrite).

Antigravity stops after its named task and reports under 500 words. Codex can review the receipt and diff against the design. Approval to execute one pasted prompt is scoped to that prompt. Later prompts do not authorize deployment. After 11, prepare a PR draft and release checklist only if requested; first inspect actual remote deployment/preview policy.

## Completion criteria

- No fabricated capability or customer proof; all local fixture examples labelled.
- Logo and brand consistent across website, console, favicon and README.
- All routes, primary CTAs and disclosures functional; no placeholder buttons.
- Optional art never blocks essential content or console use; reduced-motion and failure paths verified.
- Existing unit/contracts and browser regressions pass; reports include actual exits and counts.
- Local budgets measured; field-performance and real-provider validation reported separately.
- Docs show actual integrated UI; concept screenshots remain explicitly labelled until replaced.
