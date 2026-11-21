# 01 receipt: Recolor the shared identity

- Branch / parent SHA: `design/crimson-signal-v3` @ `8a2dbbd` (following task 01 initial commit `8a2dbbd`, descended from baseline `2459138`).
- Goal and result: Recolor the shared identity across both routes (`/` and `/console/`), SVG brand assets, dynamic orb visualizer, and state colors according to the Crimson Signal v3 specifications. Replaced legacy amber/mint tokens with semantic crimson, dark surface, and warm-white tokens. Verified WCAG 2.1 AA/AAA contrast on all color pairings, completely eliminating low-contrast pink/red body text and reserving crimson strictly for buttons, logo, rules, artwork, and non-text state cues. Enforced ≥3:1 non-text contrast for essential interactive control boundaries (`--border-control: #686874`) while keeping structural dividers (`--line: #26262a`) separate.
- Changed owned paths:
  - `client/assets/brand/favicon.svg`
  - `client/assets/brand/supportgenius-mark-mono.svg`
  - `client/assets/brand/supportgenius-mark.svg`
  - `client/assets/brand/supportgenius-wordmark.svg`
  - `client/brand.css`
  - `client/marketing.css`
  - `client/orb.js`
  - `client/styles.css`
  - `tests/browser/closing-footer.spec.js`
  - `tests/browser/experience.spec.js`
  - `docs/design-v3/receipts/01-receipt.md`
- Preserved API/console contracts:
  - Express + vanilla ES modules, native scrolling; zero Lenis, custom cursors, or heavy WebGL canvases.
  - Capabilities: Explicit `demo` and `support` modes. Zero live actions or webhooks; customer actions unconditionally disabled.
  - Citations: Source citations remain unavailable in current release.
  - Sessions: Anonymous cookie session store; no persistent user auth.
  - Layouts, typography scale, motion policies, and contact UI remain intact and deferred to their dedicated prompts.
  - Zero push, merge to main, deploy, or hosting modifications.

## Semantic Token Implementation

| Role | Token / Value | Usage & Meaning |
| :--- | :--- | :--- |
| Canvas | `--canvas: #030304` | Deep obsidian backdrop for marketing and console |
| Raised Surface | `--surface: #101012` | Rails, cards, chat composer surface, demo frame |
| Higher Surface | `--surface-higher: #1a1a1e` | Active/hover cards, elevated containers |
| Primary Crimson | `--accent: #bb1729` | Primary action buttons, identity mark, active signals, rules |
| Crimson Hot | `--accent-hot: #d52a38` | Hover and active interactive button feedback |
| Warm White Text | `--ink: #f7f7f5` | Headlines, primary text, brand name, white links |
| Muted Gray Text | `--muted: #c0bcc0` | Secondary copy, metadata, timestamps, subtle labels |
| Decorative Dividers | `--line: #26262a` | Structural panel rules, layout dividers, header/composer separators (non-control rules) |
| Control Boundaries | `--border-control: #686874` | Essential interactive controls (input, suggestion chips, quiet buttons, header CTA) |
| Dark Focus Ring | `--focus-dark: #ffffff` | 3px high-contrast outline with 4px offset on dark surfaces |
| Paper Field | `--paper: #f7f5f3` | Off-white closing section and interactive experience backdrop |
| Paper Ink | `--paper-ink: #18181c` | High-contrast dark typography on paper surfaces |
| Paper Muted | `--paper-muted: #57535a` | Secondary text on paper surfaces |
| Paper Crimson | `--paper-crimson: #a5162a` | Semantic crimson accents on paper surfaces |
| Light Focus Ring | `--focus-light: #18181c` | 3px high-contrast outline with 4px offset on paper surfaces |

## Contrast Verification Matrix (WCAG 2.1 AA / AAA)

| Foreground | Background | Contrast Ratio | WCAG Compliance | Notes |
| :--- | :--- | :--- | :--- | :--- |
| `#F7F7F5` (Warm white) | `#030304` (Canvas) | **19.22:1** | AAA (Pass) | Primary body & headline text |
| `#F7F7F5` (Warm white) | `#101012` (Surface) | **18.03:1** | AAA (Pass) | Console composer & cards |
| `#F7F7F5` (Warm white) | `#1A1A1E` (Surface higher) | **16.71:1** | AAA (Pass) | Elevated card text |
| `#C0BCC0` (Muted) | `#030304` (Canvas) | **10.99:1** | AAA (Pass) | Secondary copy & subheads |
| `#C0BCC0` (Muted) | `#101012` (Surface) | **10.31:1** | AAA (Pass) | Console rail metadata |
| `#FFFFFF` (White) | `#BB1729` (Primary crimson) | **6.43:1** | AA (>4.5:1), AAA Large | Primary CTA button label |
| `#FFFFFF` (White outline) | `#030304` (Canvas) | **20.91:1** | AA Component (>3.0:1) | Dark surface focus indicator |
| `#686874` (Control boundary) | `#030304` (Canvas) | **3.75:1** | AA Component (>3.0:1) | Suggestion chips, quiet buttons, header CTA |
| `#686874` (Control boundary) | `#101012` (Surface) | **3.46:1** | AA Component (>3.0:1) | New conversation button, composer input boundary |
| `#686874` (Control boundary) | `#1A1A1E` (Surface higher) | **3.16:1** | AA Component (>3.0:1) | User message bubble boundary |
| `#18181C` (Paper ink) | `#F7F5F3` (Paper) | **16.28:1** | AAA (Pass) | Paper closing section headline & body |
| `#57535A` (Paper muted) | `#F7F5F3` (Paper) | **5.86:1** | AA (Pass) | Paper section secondary text |
| `#A5162A` (Paper crimson) | `#F7F5F3` (Paper) | **5.37:1** | AA (Pass) | Paper section accent text & indicators |
| `#18181C` (Dark outline) | `#F7F5F3` (Paper) | **16.28:1** | AA Component (>3.0:1) | Paper surface focus indicator |

> **Non-Text Control Contrast (WCAG 2.1 SC 1.4.11)**: Visual boundaries that identify essential interactive controls (such as the `#input` composer textarea, `.suggestion-chip` prompt buttons, `.btn-new-conversation` secondary action, `.header-cta`, and `.quiet-button`) use `--border-control: #686874`, achieving at least 3.16:1 up to 3.75:1 contrast against adjacent canvas (`#030304`), surface (`#101012`), and elevated (`#1A1A1E`) backgrounds. Decorative dividers and structural rules (`--line: #26262a`) remain separate and do not serve as essential control identifiers.

## Actual Checks (commands, exits/counts)

| Check | Exact command / invocation | Exit / outcome |
| :--- | :--- | :--- |
| Unit & contract suite | `npm test` (`vitest run`) | Exit 0; 16 test files passed, 151/151 tests passed (7.05s) |
| Browser integration suite | `npm run test:browser` (`playwright test`) | Exit 0; 8 test suites passed, 113/113 tests passed (2.9m) |
| Accessibility audit | `tests/browser/console.spec.js` (`axe-core`) | Exit 0; 0 serious, 0 critical violations on `/` and `/console/` |
| Whitespace / syntax | `git diff --check` | Exit 0; clean, zero whitespace or syntax errors |

## Evidence Gaps & Next Steps

- Evidence gaps: None. Color tokens, SVGs, orb canvas, and focus indicators verified in local lab browser environment across desktop and mobile viewports with full accessibility compliance.
- Next task: `docs/design-v3/prompts/02-readable-type.md`
