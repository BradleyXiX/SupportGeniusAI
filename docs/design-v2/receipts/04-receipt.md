# 04 receipt: optional signal core motion

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `7842c37`
- Goal and result: Adapted native WebGL reference into `client/marketing/signal-core.js` (5,579B raw, 2,126B gzip, <10KB target). Module lazy-loads only upon explicit click on `#motion-toggle` ("Enable motion"). Default first paint preserves the 800×800 SVG poster without fetching WebGL. Features DPR <= 1.5, single RAF loop, camera rotation coupled to native scroll, IntersectionObserver offscreen pausing, and visibility pausing (0 idle frames). Pause, context loss (`webglcontextlost`), and `pagehide` cleanly destroy resources and restore the poster. `prefers-reduced-motion` prevents dynamic import, and runtime changes during in-flight import abort mounting. Motion state remains local to the marketing hero.
- Changed scoped paths:
  - `client/marketing/signal-core.js`
  - `client/landing.js`
  - `client/index.html`
  - `client/marketing.css`
  - `tests/browser/signal-core.spec.js`
  - `docs/design-v2/screenshots/signal-core-poster.png`
  - `docs/design-v2/screenshots/signal-core-enabled.png`
  - `docs/design-v2/receipts/04-receipt.md`
- Preserved contracts and product limits:
  - Console layout, styling, and behavior preserved; no regression observed in the tested states.
  - Native scrolling preserved; no Lenis, custom cursors, background canvases, or framework migrations.
  - Strict CSP maintained; no CDN dependencies or unsafe inline scripts.
  - Action gate and demo isolation intact; citations remain unavailable.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Lifecycle test suite | `playwright test tests/browser/signal-core.spec.js` | Exit 0; 12/12 tests passed |
| Default first paint | Initial GET `/` | Exit 0; SVG poster visible, WebGL not fetched |
| Explicit activation & pause | Click `#motion-toggle` ("Enable" / "Pause") | Exit 0; lazy-loads WebGL, pause destroys GL & restores poster |
| Repeated toggling | 4 consecutive enable/pause cycles | Exit 0; clean transitions without frame accumulation |
| Reduced motion gate | `emulateMedia({ reducedMotion: "reduce" })` | Exit 0; import prevented, toggle displays "Reduced motion enabled" |
| In-flight reduced motion | Media preference change during async import | Exit 0; mounting aborted, toggle updates |
| Offscreen & tab pause | Scroll out of view & `visibilitychange` | Exit 0; 0 RAF frame updates while offscreen/hidden |
| Context loss & failure | `webglcontextlost` & null `getContext` | Exit 0; default prevented, resources cleaned, fallback message |
| Navigation cleanup | Navigate to `/console/` | Exit 0; teardown runs, zero console errors |
| Module size | Gzip compression check | Raw: 5,579 bytes; Gzipped: 2,126 bytes |

- Screenshot paths:
  - `docs/design-v2/screenshots/signal-core-poster.png`
  - `docs/design-v2/screenshots/signal-core-enabled.png`
- Visual comparison and deviations from design.md: None; matches Section 7.
- Known failures, unverified claims, blockers: None.
- Git status after scoped staging: Clean staging of owned files.
- Next permitted task: `docs/design-v2/prompts/05-system-chapters.md`
