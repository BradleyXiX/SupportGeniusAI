# Task 5 / A5 Receipt — Restrained Signal Orb Motion

- **Task**: Task 5 / A5 (One restrained motion signature)
- **Branch**: `design/signal-desk-v1`
- **Base SHA**: `86049d8a418a73791c372fb842d1a1e4e2810dd2`
- **Changed Files**:
  - `client/orb.js` (Pure vanilla Canvas2D signal orb: `mountOrb` implementing `{ setState, destroy, isPaused, isDestroyed }`, capped DPR at 2, single animation clock, pause on hidden/offscreen, and static reduced-motion mark)
  - `client/landing.js` (Mounts marketing hero orb on `[data-orb]`)
  - `client/app.js` (Status orb wiring: sets orb to `pending` during POST request and returns to `idle` upon completion/error/reset; cleans up on unload)
  - `client/console/index.html` (Mounted status orb next to heading/connection status)
  - `client/styles.css` (Orb canvas dimension and layout styles)
  - `client/vendor/LICENSES.md` (Added MIT license notice for Thinking Orbs reference adaptation)
  - `tests/browser/orb.spec.js` (Playwright suite verifying initialization, reduced motion static mark, pause on tab hidden, clean destroy, and console request state transitions)
  - `docs/design-prompts/receipts/a5-receipt.md`
  - Screenshots: updated snapshots with live orbs

## Tests Actually Run
1. `npm run test:browser -- tests/browser/orb.spec.js`: **5/5 passed** (15.1s)
   - `mountOrb` initializes canvas and exposes `{ setState, destroy }` contract without errors
   - Reduced motion (`prefers-reduced-motion: reduce`) draws static visible mark and suppresses continuous rAF loop (0 animation frames)
   - Pauses animation loop when tab is hidden (`document.hidden`) and resumes when visible
   - `destroy()` cleanly stops animation loop, disconnects `IntersectionObserver`, and detaches listeners
   - In `/console/`, orb switches to `pending` exclusively during active POST and returns to `idle` upon resolution or reset
2. `npm run test:browser` (Full browser suite): **35/35 passed** (1.4m)
3. `npm test` (Vitest): 9 test files, **39/39 passed** (3.7s)

## Deliberate Choices & Dependencies
- Pure vanilla Canvas2D implementation with zero new runtime or npm dependencies.
- Single animation clock (`requestAnimationFrame`) with DPR capped at 2 for battery and GPU efficiency.
- Reused Thinking Orbs MIT reference architecture; attribution recorded in `client/vendor/LICENSES.md`.
- Restricted state strictly to `idle` vs `pending` ("waiting for reply"); no fabricated "searching" or "booking" states.

## Unresolved Failures / Risks
- None.

## Next Task
- **Task 6 / A6**: Whole-branch verification and handoff (`docs/design-prompts/receipts/final.md`, README documentation check, and full audit).
