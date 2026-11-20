# 11 receipt: professional README and final evidence

- Branch: `design/signal-architecture-v2`
- Parent SHA / inspected baseline: `284a08b`
- Goal and result: Updated `README.md` to document the completed, integrated Signal Architecture v2 release. Replaced placeholder/concept media with verified route screenshots of the live application: `/console/` (`console-answered-1440.png`, commit `0f90bb1`) and `/` (`landing-desktop-1440.png`, commit `284a08b`), alongside an explicit screenshot provenance table recording route, commit, viewport, and demo mode. Explicitly labelled remaining prototype reference imagery (`reference-desktop.png`). Documented the vanilla ES modules + Express architecture with an accurate Mermaid request flow, deterministic zero-secret demo setup, verified automated test results (151 unit, 108 browser), lab performance observations (landing LCP 484ms, CLS 0.003; console LCP 160ms, CLS 0.0119), operating boundaries, single-process deployment constraints, and repository/bundled asset license statuses. Validated that all relative links resolve to existing files on disk.
- Changed scoped paths:
  - `README.md`
  - `docs/design-v2/screenshots/landing-desktop-1440.png`
  - `docs/design-v2/screenshots/landing-mobile-390.png`
  - `docs/design-v2/receipts/11-receipt.md`
- Preserved contracts and product limits:
  - Console and marketing application behavior, state engine, and session management 100% preserved.
  - Zero live customer actions or webhooks; citations remain unavailable.
  - Native scrolling preserved; no Lenis, custom cursors, or background canvases.
  - Zero deployment, remote pushes, merges, or hosting modifications.

| Check | Exact command / interaction | Exit / outcome |
| --- | --- | --- |
| Relative link integrity | Node `fs.existsSync` check across all README links | Exit 0; 19/19 relative links and image paths exist |
| Unit tests | `npm test` (`vitest run`) | Exit 0; 16 files passed, 151/151 tests passed |
| Full browser suite | `npm run test:browser` (`playwright test`) | Exit 0; 8 suites passed, 108/108 tests passed |
| Diff & whitespace | `git diff --check` | Exit 0; zero whitespace errors |
| Secret audit | Inspect README and staged diff | Exit 0; zero hardcoded secrets or keys |
| Screenshot provenance | Route, commit, viewport, and mode table | Exit 0; fully documented in README |
| Lab performance | Documented in README & verification records | Exit 0; lab LCP/CLS distinguished from field INP |

- Screenshot paths:
  - `docs/design-v2/screenshots/landing-desktop-1440.png`
  - `docs/design-v2/screenshots/landing-mobile-390.png`
  - `docs/design-v2/screenshots/console-answered-1440.png`
  - `docs/design-v2/screenshots/reference-desktop.png`
- Visual comparison and deviations from design.md: None; matches approved design specification and execution plan.
- Known failures, unverified claims, blockers: None; test suites are 100% green. Lab performance values are unthrottled local observations; field INP and mobile network variability are noted as unobserved.
- Git status after scoped staging: Clean staging of owned paths.
- Next permitted task: All 12 execution tasks (00–11) complete.
