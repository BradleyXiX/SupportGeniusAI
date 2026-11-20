# 09 receipt: console brand application

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `5e4f2ce`
- Goal and result: Applied the shared signal brand identity, graphite foundation (`#1c1e20`), surface panels (`#202325`), ink text (`#f3f0e8`), muted captions (`#b0b7b4`), restrained amber (`#e4b95b`), and mint focus rings (`#9dcec0`) to the real `/console/` workspace shell. Used `reference/console.html` strictly for visual direction while retaining 100% of existing `app.js` and `chat-state.js` behavior, capability checks, session management, and DOM contracts. In `client/console/index.html`, adjusted stylesheet cascade so scoped brand additions override base styles, and added an accessible back link to `/`. Added scoped rules in `client/brand.css` for `body[data-page="console"]` covering rail layout, brand mark, guidance captions, mode disclosures, session cost badges, connection status indicators, message bubbles, retry triggers, and composer controls. Kept the workspace calm, readable, and free of cinematic background effects or artificial stages.
- Changed scoped paths:
  - `client/console/index.html`
  - `client/brand.css`
  - `docs/design-v2/screenshots/console-empty-1440.png`
  - `docs/design-v2/screenshots/console-answered-1440.png`
  - `docs/design-v2/screenshots/console-error-1440.png`
  - `docs/design-v2/screenshots/console-mobile-390.png`
  - `docs/design-v2/receipts/09-receipt.md`
- Preserved contracts and product limits:
  - Real `app.js` and `chat-state.js` preserved; no fake or scripted chat handlers.
  - Preserved DOM IDs (`#chat-messages`, `#input`, `#send-btn`, `#reset-btn`, `#session-cost`, `#connection-status`, `#demo-disclosure`).
  - Preserved single-flight request gating, IME/Enter handling, sanitization, anonymous sessions, and unavailable-cost rendering.
  - Zero live customer actions or webhooks; citations remain unavailable.
  - Native scrolling preserved; no Lenis, custom cursors, or background canvases.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Console browser suite | `playwright test tests/browser/console.spec.js` | Exit 0; 49/49 tests passed (CSP, single flight, IME, reset, error recovery, 429 retry, cost, a11y) |
| V2 marketing suites | `playwright test tests/browser/closing-footer.spec.js tests/browser/deployment.spec.js tests/browser/experience.spec.js tests/browser/system-chapters.spec.js tests/browser/signal-core.spec.js` | Exit 0; 44/44 tests passed |
| Console screenshots | Local demo mode capture (1440px desktop & 390px mobile) | Exit 0; empty, answered, error, and mobile states captured |

- Screenshot paths:
  - `docs/design-v2/screenshots/console-empty-1440.png`
  - `docs/design-v2/screenshots/console-answered-1440.png`
  - `docs/design-v2/screenshots/console-error-1440.png`
  - `docs/design-v2/screenshots/console-mobile-390.png`
- Visual comparison and deviations from design.md: None; matches visual intent of reference without compromising production logic.
- Known failures, unverified claims, blockers: Inherited failure in legacy `tests/browser/marketing.spec.js` (4 tests failing due to obsolete Phase 1 `#how-it-works` anchor and legacy copy; superseded by passing v2 marketing suites). All 49 console browser tests and all 44 v2 marketing tests pass.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: `docs/design-v2/prompts/10-integration.md`
