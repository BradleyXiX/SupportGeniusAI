# Task 2 / A2 Receipt — Request & Session Safety

- **Task**: Task 2 / A2 (Safe request and session state)
- **Branch**: `design/signal-desk-v1`
- **Base SHA**: `c38d63f587bf1276ba36f679d4de4f26ef72da01`
- **Changed Files**:
  - `client/chat-state.js` (Pure state machine: `createChatState`, `beginRequest`, `resetSession`, `acceptsReply`, `completeRequest`)
  - `client/app.js` (State machine integration: generation-indexed request tracking, AbortController with 45s timeout, 429 Retry-After with countdown and manual retry without duplicating user turns, honest uncertainty copy for 5xx/network errors with no auto-retry, and strict stale-reply rejection)
  - `client/styles.css` (429 retry button and error bubble styling)
  - `server/tests/chatState.test.js` (Unit test suite for exact state machine invariants)
  - `tests/browser/console.spec.js` (Expanded with 10 new browser tests covering idempotency, input bounds, Shift+Enter, IME composition, 422 editing, 429 backoff, sanitizer failure safe text, and delayed reset stale-rejection)
  - `docs/design-prompts/receipts/a2-receipt.md`
  - `docs/design-prompts/screenshots/console-desktop.png`, `docs/design-prompts/screenshots/console-mobile.png`

## Tests Actually Run
1. `npm test` (Vitest): 9 test files, **39/39 passed** (duration: 3.3s)
   - Includes 8 new pure state machine tests (`chatState.test.js`)
2. `npm run test:browser -- tests/browser/console.spec.js`: **15/15 passed** (duration: 42.8s)
   - Shell & CSP compliance (5 tests)
   - Blank input 0 POSTs (passed)
   - Input >2000 chars constrained (passed)
   - Double-clicking Send dispatches 1 POST (passed)
   - Shift+Enter newline vs Enter send (passed)
   - IME composition Enter does not send (passed)
   - Network/5xx displays approved uncertainty guidance with no auto-retry (passed)
   - 422 allows editing and manual resubmission (passed)
   - 429 displays Retry-After countdown and enables manual retry without duplicating user turn (passed)
   - Sanitizer absent renders literal safe text without script execution (passed)
   - Reset while POST delayed rejects late response and prevents cost update (passed)

## Deliberate Choices & Dependencies
- Implemented exact helper signatures from plan without framework dependencies.
- Followed approved uncertainty copy: "No reply received. An action may have completed. Verify with the business before repeating your request."
- Bounded input with `maxlength="2000"` and trimmed input check.
- Used crypto.randomUUID (with math random fallback) constrained to 64 chars.

## Unresolved Failures / Risks
- None for Task 2 scope.

## Next Task
- **Task 3 / A3**: Editorial introduction (`client/index.html` marketing document, `client/landing.js`, and navigation to `/console/`).
