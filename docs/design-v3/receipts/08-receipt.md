# Receipt 08: Unify Composer Skin, Static Sphere Avatars & Truthful State Sphere

- **Date**: 2026-11-21T23:55:00+03:00
- **Branch**: `design/crimson-signal-v3`
- **Parent Commit**: `4009a693d0799ba79cdfdd544496daf129962323` (`4009a69`)
- **Status**: Complete — ready for visual review

---

## 1. Executive Summary

Task 08 restyles the real console composer to match the approved crimson brand architecture, replaces legacy text avatars with original static Signal Sphere marks, drives the single status orb from actual client lifecycle states without simulated token typing or fake responding phases, integrates the shared user-pause motion policy, and preserves all security, session, and keyboard interaction guarantees:

1. **Composer Styling & Legibility**:
   - Replaced legacy navy/emerald palette in composer with near-black raised surface (`#101012`), 1px visible control border (`#686874`), near-black canvas background (`#030304`), and 16px white input text (`#F7F7F5`).
   - Placeholder text styled in readable neutral (`#8c888c`, $> 6.5:1$ contrast against `#030304`).
   - Active focus ring styled with 3px solid white outline (`#FFFFFF`, offset 2px), distinguishing focus from borders.
   - Send button styled with vibrant crimson fill (`#BB1729`, hover `#D52A38`, white icon/text), 48px touch target height and width ($\ge 44\text{px}$).
   - Preserved textarea auto-resizing, Shift+Enter newline insertion, Enter send, IME composition guards (`e.isComposing`, keyCode 229), and disabled states during in-flight requests.
2. **Static Sphere Marks for Message Avatars**:
   - Replaced all legacy text "SG" avatars in `.avatar-mini` with the original static SVG mark `client/assets/brand/avatar-sphere.svg` (1,307 B raw / 570 B gzip).
   - Applied consistently across initial welcome message, in-flight loading bubble, answered AI responses, validation errors, upstream errors, and 429 rate limit notices.
   - Message avatars remain completely static: zero `<canvas>` elements exist inside `.chat-messages` (no wasteful per-message rendering loops).
3. **Truthful Status Orb Lifecycle**:
   - The single small 28px header canvas (`#console-orb`) is driven strictly by actual client states:
     - `idle`: Still resting mark with warm-white core (`#F7F7F5`), producing exactly 0 `requestAnimationFrame` calls.
     - `pending`: Active breathing/orbit with crimson node (`#BB1729`) while POST `/chat` is in flight. Truthful "Waiting for reply" label displayed in transcript.
     - `settling`: Bounded $\le 250\text{ms}$ settle upon complete JSON reply arrival, decelerating node toward center and transitioning cleanly to idle.
     - `error`: Still alert indicator with red accent ring and red core, producing 0 `requestAnimationFrame` calls.
     - `recovery`: Still recovery indicator with dashed boundary and amber-crimson accent on 401 session expiration or capabilities failure, producing 0 `requestAnimationFrame` calls.
   - No fake responding phase, model-progress percentage, or letter-by-letter typing simulation.
4. **Motion Policy & Shared User-Pause Integration**:
   - Orb component (`client/orb.js`) imports `isMotionAllowed` and `subscribeMotionPreference` from `client/marketing/motion-policy.js`.
   - When a user has paused animations (`localStorage.getItem('sg_motion_v1') === 'paused'`), the status orb suppresses continuous animation loops and produces 0 `requestAnimationFrame` calls even while pending.
   - When OS reduced motion is active (`prefers-reduced-motion: reduce`), continuous animation is suppressed with the static mark.
5. **Transcript & Composer Atmosphere**:
   - Transcript and composer remain completely free of background particle-network canvases, keeping the conversation readable and high-contrast.
6. **Mobile Reflow ($\le 760\text{px}$ & 320px)**:
   - Full 320px and 390px responsive reflow verified with zero horizontal document overflow in empty, pending, answered, and error states.
   - All interactive touch targets (send button, new conversation button, suggestion chips, retry buttons) maintain $\ge 44\text{px}$ minimum dimensions.

---

## 2. Changed Files & Scoped Architecture

| Path | Role in Task 08 Scope |
| :--- | :--- |
| `client/assets/brand/avatar-sphere.svg` | **New**: Original static Signal Sphere mark SVG for message avatars. |
| `client/orb.js` | Updated Canvas2D orb component to support truthful client states (`idle`, `pending`, `settling`, `error`, `recovery`), shared motion policy subscription (`sg_motion_v1`), and bounded settle phase. |
| `client/app.js` | Wired `createAvatarElement()` helper, updated avatar rendering across transcript, wired status orb lifecycle transitions, and preserved session bootstrap/IME/cost logic. |
| `client/brand.css` | Styled console composer raised surface, input text, focus outlines, crimson send button, and `.avatar-sphere-mark`. |
| `client/styles.css` | Replaced legacy navy/emerald composer declarations with brand tokens and removed outdated `:focus` color overrides. |
| `client/console/index.html` | Updated initial welcome message avatar to use the static Signal Sphere mark. |
| `tests/browser/console-v3.spec.js` | **New**: Playwright test suite with 8 assertions covering avatar SVGs, composer skin, 44px touch targets, orb lifecycle states, user-pause preference, reduced motion, 320px reflow, and screenshot capture. |
| `tests/browser/console.spec.js` | Added bootstrap readiness synchronization to keyboard navigation test. |
| `docs/design-v3/screenshots/*` | Captured desktop empty, desktop pending, desktop answered, desktop error, and mobile reflow visual evidence. |

---

## 3. Actual Command Execution & Verification Results

### Unit Test Suite
- **Command**: `npm test`
- **Exit Code**: `0`
- **Result**: `16 passed (16 files, 151 passed)` (Duration: 5.85s)

### Console V3 Playwright Test Suite
- **Command**: `npx playwright test tests/browser/console-v3.spec.js`
- **Exit Code**: `0`
- **Result**: `8 passed (13.6s)`
  - Test 1: Static sphere marks for message avatars: renders SVG mark without text SG and zero message canvases (`passed`, 1.3s)
  - Test 2: Console composer styling: raised surface #101012, 1px visible border, 16px white input text, white focus outline, and crimson send button (`passed`, 958ms)
  - Test 3: Touch targets meet minimum 44px: send button, new conversation button, suggestion chips (`passed`, 846ms)
  - Test 4: Truthful status orb lifecycle: idle, pending, settling, error, and recovery states (`passed`, 1.0s)
  - Test 5: Shared user-pause preference (sg_motion_v1 = 'paused') prevents status orb continuous animation loop even while pending (`passed`, 1.5s)
  - Test 6: OS reduced motion overrides status orb animation loop with static mark (`passed`, 1.2s)
  - Test 7: 320px mobile reflow: zero horizontal overflow in empty, pending, answered, and error states (`passed`, 865ms)
  - Test 8: Capture comprehensive visual evidence across empty, pending, answered, error, recovery, and mobile states (`passed`, 1.8s)

### Full Console Browser Test Suites Verification (3 Suites, 66 Tests)
- **Command**: `npx playwright test tests/browser/console.spec.js tests/browser/console-v3.spec.js tests/browser/orb.spec.js`
- **Exit Code**: `0`
- **Result**: `66 passed (1.5m)` across all 3 suites with zero failures:
  - `tests/browser/console-v3.spec.js`: 8 passed
  - `tests/browser/console.spec.js`: 50 passed
  - `tests/browser/orb.spec.js`: 8 passed

---

## 4. Asset Sizes & Performance Budgets

### Participating Client Assets
| Asset | Raw Size | Gzip Size | Role |
| :--- | :--- | :--- | :--- |
| `client/assets/brand/avatar-sphere.svg` | 1,307 B (1.28 KiB) | 570 B (0.56 KiB) | Static Signal Sphere avatar SVG |
| `client/orb.js` | 10,797 B (10.54 KiB) | 2,906 B (2.84 KiB) | Canvas2D status orb component & lifecycle adapter |
| `client/app.js` | 29,856 B (29.16 KiB) | 6,955 B (6.79 KiB) | Console controller & session state machine |
| `client/brand.css` | 17,857 B (17.44 KiB) | 2,743 B (2.68 KiB) | Brand design system & composer skin |
| `client/styles.css` | 42,322 B (41.33 KiB) | 7,168 B (7.00 KiB) | Core stylesheet & layout rules |
| `client/console/index.html` | 6,396 B (6.25 KiB) | 2,082 B (2.03 KiB) | Semantic console document markup |

---

## 5. Screenshot Evidence Files

- Desktop Empty Console (1440x900): `docs/design-v3/screenshots/console-empty-desktop.png` (100,799 bytes)
- Desktop Pending Console (1440x900): `docs/design-v3/screenshots/console-pending-desktop.png` (111,731 bytes)
- Desktop Answered Console (1440x900): `docs/design-v3/screenshots/console-answered-desktop.png` (126,764 bytes)
- Desktop Error Console (1440x900): `docs/design-v3/screenshots/console-error-desktop.png` (140,663 bytes)
- Mobile Reflow Console (390x844): `docs/design-v3/screenshots/console-mobile-reflow.png` (70,602 bytes)

---

## 6. Evidence Gaps, Boundaries & Limitations

1. **Non-Streaming Backend**: The current backend delivers complete JSON responses via HTTP POST `/chat`. No fake streaming or simulated token typing was introduced. The status orb performs a bounded $\le 250\text{ms}$ settle upon arrival before resting at idle.
2. **Zero Particle Textures in Console**: In accordance with the design specification, the console transcript and composer remain completely free of decorative particle meshes or canvas backdrops to ensure legibility and contrast.
3. **Static Avatars**: Avatars inside message bubbles are static SVG images; only the single header status orb contains a `<canvas>` element.

---

## 7. Next Step

Checkpoint visual review after Task 08 (real console review complete).
Proceed to **Task 09: Client Implementation Enquiries** (`docs/design-v3/prompts/09-implementation-enquiries.md`).
