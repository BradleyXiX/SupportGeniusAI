# 02 receipt: Increase small text and control touch targets

- Branch / parent SHA: `design/crimson-signal-v3` @ `0c1828e6ce921cbbc3dde57f40e31c0f6ea1a32b` (`0c1828e`).
- Goal and result: Implemented addendum role-based typography scale and touch target minimums across marketing (`/`) and console (`/console/`) routes. Increased body text and answers to minimum 16px, functional labels/disclosures/status/cost to minimum 14px, interactive buttons and navigation links to 14–16px with minimum 44px touch targets, and nonessential indices to minimum 12px. All text below 12px has been eliminated. Wrapping is permitted on narrow viewports without shrinking typography or masking overflow. Preserved headline hierarchy, native scrolling, and explicit demo/support mode contracts.
- Changed owned paths:
  - `client/brand.css`
  - `client/marketing.css`
  - `client/styles.css`
  - `docs/design-v3/receipts/01-receipt.md`
  - `docs/design-v3/receipts/02-receipt.md`
- Preserved API/console contracts:
  - Vanilla ES modules + Express architecture; native browser scrolling preserved (no Lenis, custom cursors, or framework migration).
  - Explicit `demo` and `support` mode separation maintained; zero customer actions, live webhooks, or new telemetry claims.
  - Source citations remain unavailable in current release.
  - No changes made to 3D WebGL sculpture artwork, motion policy, or contact UI.

## Typography Scale Mapping by Role

| Semantic Role | Target Minimum | Implemented Scale | Elements / Classes Affected |
| :--- | :--- | :--- | :--- |
| **Body & Answers** | 16px | 16px (18px lead) | `.sample-answer p` (16px / 1.65), `.chapter-body p` (16px / 1.65), `.deployment-grid p` (16px / 1.65), `.section-head > p:last-child` (16px / 1.65), `.hero-copy .lead` (18px desktop / 17px mobile), console `.bubble` (16px / 1.65), console `#input` (16px / 1.5) |
| **Labels, Disclosures, Status, Cost** | 14px | 14px | `.eyebrow` (14px), `.hero-note` (14px), `.core-stage figcaption .fine` (14px), `.system-strip` (14px), `.chapters summary > span:first-child` (14px), `.demo-bar` (14px), `.example-disclosure` (14px), `.closing .fine` (14px), `.site-footer` & `.fine` & `.copyright` (14px), console `.brand-edition` (14px), console `.demo-disclosure` & `.disclosure-badge` (14px), `.rail-guidance-text` (14px), `.connection-status` (14px), `.cost-label` & `.cost-value` (14px), `.suggestions-label` (14px), `.error-badge` (14px) |
| **Navigation & Buttons (Touch Targets)** | 14–16px ($\ge$ 44px target) | 14–15px, min-height 44px–48px | `.site-nav a` (14px / 44px), `.header-cta` (14px / 44px), `.button.primary` (15px / 48px), `.text-link` (14–15px / 44px), `.quiet-button` (14px / 44px), `.scenario` (14px / 50–64px), `.chapters summary` (44px min-height), console `.btn-new-conversation` (14px / 44px), console `.rail-back-link` (14px / 44px), console `.suggestion-chip` (14px / 44px), console `#send-btn` (14px / 44px), console `.btn-retry-429` & `.btn-retry-init` (14px / 44px), console `.code-copy-btn` (14px / 44px) |
| **Nonessential Indices & Metadata** | 12px | 12px | `.mono` general (12px), `.strip-index` (12px), `.core-top` & `.core-label` (12px), `.micro-tag` (12px), `.scenario > span:first-child` (12px), `.sample-label` (12px), `.deployment-grid .mono` (12px), `.document-stack > div` (12px), console `.avatar-mini` (12px), console `.message-meta` & `.message-time` & `.message-tokens` (12px), console `.keyboard-hint` (12px) |

*Sub-12px elimination*: Verified with automated script across all `client/*.css` files: zero font-size rules under 12px exist (all former 7px, 8px, 9px, 10px, and 11px values updated to compliant minimums).

## Responsive Reflow and Zoom Verification

- **320px Small Mobile Reflow**: Reflow verified with zero horizontal overflow (`document.documentElement.scrollWidth === document.documentElement.clientWidth`). On narrow viewports ($\le$ 360px), `.site-header` wraps cleanly with full-width centered `.header-cta` maintaining 44px touch height without clipping or overflow.
- **390px Mobile Viewport**: Verified reflow across all sections on marketing and console routes, including interactive scenario buttons, suggestion chips, and message bubbles.
- **1440px Desktop Viewport**: Verified centered max-width layouts (1360px marketing, 1280px console) with balanced two-column side rail and full typography scale.
- **200% Browser Zoom**: Verified zero text clipping, zero horizontal scrollbar on console chat transcript, and readable wrapped disclosure/cost/status text.
- **Console States Verified**: Empty state, answered state with multi-turn bubbles and code snippets, and error states (HTTP 429 rate limit countdown, network/bootstrap failure with retry buttons) all verified with compliant text sizes and 44px touch targets.

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (5.92s) |
| Browser integration suite | `npm run test:browser` (`playwright test`) | Exit 0; 8 test suites passed, 113/113 tests passed (2.5m) |
| Whitespace / syntax check | `git diff --check` | Exit 0; clean, zero whitespace errors |
| Sub-12px CSS rule audit | Automated PowerShell regex scan over `client/*.css` | Exit 0; 0 instances < 12px found |

## Evidence Gaps and Next Task

- No visual artwork modifications or motion policies were altered in this task.
- Next task: `docs/design-v3/prompts/03-hero-sculpture.md` (refine hero WebGL point sculpture visual presence, static SVG fallback, and lifecycle controls).
