# 00 receipt: baseline and branch

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `1c3c6d6` (descended from `35f0793`)
- Goal and result: Verified repository ancestry, package scripts, capability limits, and baseline test/route execution. No product changes made. Captured verified baseline `/` and `/console/` screenshots in local demo mode.
- Changed scoped paths: `docs/design-v2/receipts/00-receipt.md`, `docs/design-v2/screenshots/current-*`
- Preserved contracts and product limits:
  - Architecture: Express + vanilla ES modules, native scroll, no heavy canvases or Lenis.
  - Capabilities: Explicit `demo` and `support` modes. Zero live actions or webhooks; customer actions unconditionally disabled.
  - Citations: Source citations unavailable in current release.
  - Sessions: Anonymous signed-cookie in-memory store (capped at 500, 30m expiry, no persistent user auth).
  - Package scripts: `start`, `dev`, `test`, `test:watch`, `test:browser`.
  - All existing skills in `.agents/skills/` preserved. README concept screenshots confirmed labelled.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151 tests passed |
| Syntax / diff | `git diff --check` | Exit 0; zero whitespace errors (verifies whitespace only, not JS syntax) |
| Browser journey | `/` & `/console/`, demo mode, 1440×1000 & 390×844 | Exit 0; HTTP 200 on all routes, 0 console errors, 0 mobile overflow, chat answered |
| Accessibility / reduced motion | Not tested | Not evaluated in this baseline pass |
| Performance / runtime | Node.js runtime check | Node `v26.12.0`, vitest duration 6.66s |

- Screenshot/trace paths:
  - `docs/design-v2/screenshots/current-landing-desktop.png` (1440×1000)
  - `docs/design-v2/screenshots/current-landing-mobile.png` (390×844)
  - `docs/design-v2/screenshots/current-console-desktop.png` (1440×1000)
  - `docs/design-v2/screenshots/current-console-mobile.png` (390×844)
  - `docs/design-v2/screenshots/current-console-answered.png` (1440×1000)
- Visual comparison and intentional deviations from design.md: None; baseline recording only.
- Known failures, unverified claims, blockers: None. Isolation preserved (no fetch/push).
- Git status after scoped staging: Clean staging of receipt and baseline screenshots.
- Next permitted task: `docs/design-v2/prompts/01-brand-foundation.md`
