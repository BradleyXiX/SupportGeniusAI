# Task 1 / A1 Receipt — CSP-Safe Support Console Shell

- **Task**: Task 1 / A1 (CSP-safe functional console shell)
- **Branch**: `design/signal-desk-v1`
- **Base SHA**: `8cf00aac960c292e2e5b6324245f31eab24f0f10`
- **Changed Files**:
  - `client/console/index.html` (new console entrypoint with root-absolute `/styles.css` and `/app.js`, stable IDs, and demo disclosure)
  - `client/app.js` (pure ES module, strict CSP compliance with `addEventListener`, safe `textContent` fallback when sanitizer is missing)
  - `client/styles.css` (scoped `body[data-page="console"]` desktop 256px rail + conversation layout and mobile styles)
  - `client/vendor/marked.min.js`, `client/vendor/purify.min.js`, `client/vendor/LICENSES.md` (pinned, locally vendored libraries)
  - `server/tests/frontendAssets.test.js` (Supertest route and CSP header verification)
  - `tests/browser/console.spec.js` (Playwright tests for `/console/`, CSP compliance, mocked POST send, suggestion chips, and reset)
  - `playwright.config.js` (browser test runner config using dedicated production server on port 3888)
  - `vitest.config.js` (excludes `tests/browser/**` to preserve `npm test` unit/integration contract)
  - `package.json`, `package-lock.json` (`test:browser` script, devDependencies `@playwright/test`, `axe-core`)
  - `.gitignore` (excludes `test-results/` and `playwright-report/`)
  - `docs/design-prompts/screenshots/console-desktop.png`, `docs/design-prompts/screenshots/console-mobile.png`

## Tests Actually Run
1. `npm run test:browser -- tests/browser/console.spec.js`: **5 passed** (17.0s)
   - direct GET /console/ with strict CSP (no unsafe-inline violations)
   - typing message and clicking Send dispatches one mocked POST and renders reply under real CSP
   - clicking suggestion chip populates input and sends query
   - clicking reset button clears chat and resets cost
   - desktop (1440x900) and mobile (390x844) visual snapshots captured
2. `npm test` (Vitest): 8 test files, **31/31 passed** (duration: 6.7s)
   - 29 original tests + 2 new Supertest frontend asset/CSP tests

## Deliberate Choices & Dependencies
- Added development-only `@playwright/test` and `axe-core`.
- Vendored `marked` v12.0.2 and `DOMPurify` v3.0.6 locally under `client/vendor/` with `LICENSES.md`.
- Failed safe to `textContent` if `DOMPurify` is unavailable.
- Kept root marketing replacement for Task 3.

## Unresolved Failures / Risks
- None for Task 1 scope.
- Note: Request session generation, 429 Retry-After, timeout handling, and stale response isolation are scheduled for Task 2.

## Next Task
- **Task 2 / A2**: Safe request and session state (`client/chat-state.js`, stale response handling, timeout, and manual retry without duplicated turns).
