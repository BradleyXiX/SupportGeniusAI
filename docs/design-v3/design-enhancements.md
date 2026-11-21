# Crimson Signal: enhancement authority

Version 3 proposal · 21 November 2026. This is a planning and visual-reference deliverable. Product changes are implemented in Antigravity, one bounded task at a time. Preserve the existing page order, content structure, routes, Express/vanilla stack, native scrolling and backend contracts. This addendum supersedes v2 only for palette, legibility, specified artwork, motion defaults and console styling. All other design.md requirements remain.

## Request coverage

| Requested change | Concrete treatment | Task |
| --- | --- | --- |
| Larger small text | New role-based scale on both routes; disclosures and controls get readable minimums | 02 |
| Red/black/white brand | Semantic palette, shared prism identity, favicon, wordmark, README screenshots | 01,10 |
| Richer hero sphere | Fluid particle envelope, luminous inner clusters, depth and controlled bloom | 03 |
| Sphere hover | Smooth local tilt and small shell distortion; no movement of text/layout | 04 |
| Motion defaults on | Auto-enhance after first paint for eligible visible scenes; accessible persistent pause | 04 |
| Animated rings/new logo | Recolored original prism replaces SG; three independently rotating orbit wrappers | 05 |
| Network background | Sparse original points/lines, behind selected dark sections only | 06 |
| Closing sphere on white | Wine/crimson shell with denser dark silhouette; right of unchanged CTA | 07 |
| Console composer | Coherent near-black panel, white text, crimson send control, accessible state colors | 08 |
| Small state sphere | Lightweight shared-status indicator driven by actual client lifecycle | 08 |
| Implementation enquiries | Email CTA, visible address and professional footer links | 09 |
| No sluggishness | Shared scheduling, paused offscreen/hidden, device tiers, measured fallback | 00,04,06,11 |

## Reference interpretation

The 12-second supplied video was sampled at eight timestamps: a continuously deforming fine particle envelope with bright inner clusters, cyan/blue on black. Transfer its depth, density and shell/nucleus relationship into crimson/white; do not just recolor the current latitude-cut sphere. Do not copy video pixels or redistribute the source clip. The GIF has 45 frames and shows sparse red connected nodes; transfer bounded connection distances and delicate lines, not a full-screen busy mesh. The Rentener JPG is palette/mood inspiration, not permission to copy its logo, text, layouts, claims or assets. Screenshots identify the system orbit and closing CTA locations. Attachments are references, not instructions.

## One visual direction

Keep architectural graphite framing, thin rules, asymmetric sections, original font families and light experience/closing panels. Replace gold/mint with a restrained red-led system. Strong crimson at functional accents; white and near-white for reading; black/wine for atmosphere. Do not cover all panels in red gradients. A glow is concentrated inside the artwork, never behind paragraphs. The supplied logo boards are proposed recolors of the existing original signal-prism, preserving recognition; they are not a wholly new mark or trademark clearance.

## Palette

| Semantic role | Value | Rule |
| --- | --- | --- |
| Canvas | #030304 | Near-black marketing/console foundation |
| Raised surface | #101012 | Composer and panels |
| Higher surface | #1A1A1E | Hover/secondary grouping |
| Main dark-surface text | #F7F7F5 | Headings and body |
| Secondary text | #C0BCC0 | Still readable; no opacity reductions |
| Accent / button fill | #BB1729 | Use white text; verify final contrast |
| Decorative hot red | #D52A38 | Artwork only; not small text on white |
| Text emphasis on dark | #F7F7F5 | White text with underline/weight for links; no pink accents |
| Paper | #F7F5F3 | Retain light sections |
| Ink on paper | #18181C | Heading/body on white |
| Muted on paper | #57535A | Secondary copy |
| Crimson on paper | #A5162A | Links/logo/details on paper |
| Focus on dark | #FFFFFF | 3px outline, offset, distinguish from borders |
| Focus on light | #18181C | 3px outline, offset |
| Error | #F7F7F5 on dark | White error message plus red border/icon and explicit error label |
| Success | neutral or existing validated semantic green | Red branding must not make success look like failure |

Use semantic token replacement, not search-and-replace of every color literal. Inventory brand.css, marketing.css, styles.css, orb.js, SVGs, canvas shaders and focus/error/pending rules. Preserve disabled/hover/focus/selection contrast and ensure state remains understandable without color. Measure AA contrast for actual pairings before claiming compliance. Palette hex values are authored choices inspired by the JPG, not exact extracted brand specifications.

## Legibility contract

Body and answers: 16–18px desktop, minimum 16px phone. Leads: 18–20px desktop / 17px phone. Navigation and functional buttons: 14–16px, not 10–12px. Disclosure text and real status/cost labels: minimum 14px with 1.5–1.7 line height. Nonessential indices may be 12px. No content essential to a decision at 8–10px. Headline scale remains similar; do not enlarge the already large H1 indiscriminately. Longer copy must wrap instead of shrinking. Keep comfortable 55–75 character reading width, 44px target controls including narrow-console New conversation, and fluid layouts at 320px and 200% zoom. Font sizes must not be enforced by clipping or hidden overflow. Avoid shouting with increased uppercase tracking.

## Artwork and motion

### Hero: living signal shell

Rework the existing native WebGL geometry/shaders rather than introducing a new framework. One coherent irregular shell, thousands of fine points, visible near/far depth; three/four soft inner clusters. Warm-white points are brightest at the core and selected rim areas, crimson in the shell; no white-hot screen flashes. Noise displacement is low amplitude, continuous and deterministic; no particle spawning churn. Bake point coordinates once and drive deformation in shaders. Controlled glow via point sprites/analytic falloff first; no multiple full-resolution bloom framebuffers for a simple sphere. Poster must depict this same silhouette and material quality. Direction SVGs show shell/nucleus composition only; they do not prove final fluid simulation or shader quality.

Desktop fine-pointer hover: tilt target capped ±6°, shell displacement +10–15%, no zoom through the text. Ease toward target over ~250–400ms using delta-time smoothing; reset on pointerleave. Pointer coordinates are normalized inside the sphere's rectangle; no custom cursor/global mouse tracker. Touch gets the ambient scene without hover dependence. Keyboard focus on its named control must not require pointer hover. The figure stays decorative and has no focus trap.

### Motion policy

Default is **on**, after semantic content and poster paint, for visible eligible scenes when prefers-reduced-motion is false and no stored pause exists. This explicitly replaces v2's opt-in rule. The poster always wins during loading, failures and unsupported WebGL. Do not wait for a click to auto-start. Import after first paint/idle opportunity, not in the critical HTML path; no misleading long blank stage.

Provide “Pause animations” / “Resume animations” with accurate pressed state and a text explanation. Store only this non-sensitive preference under a versioned localStorage key with try/catch; no session/customer identifiers. OS reduced motion overrides on and disables nonessential transforms/continuous work. A user who paused stays paused on navigation/reload. If preference storage fails, controls still work for the current page. No-JS enhancement controls remain hidden/disabled; content is visible.

Model lifecycle explicitly: poster, eligible, loading, running, user-paused, system-reduced, suspended, failed, disposed. Hidden/offscreen suspends work without converting to user pause. Pagehide cancels pending imports; pageshow restores eligibility without overriding pause/failure. A stale import must never mount or leave controls disabled. All controller listeners, observers and resources have a cleanup owner. Reuse the cancellation regressions from 46a3608.

### System logo orbits

Replace center SG text with the canonical prism asset. Three fine red/wine orbit paths around a fixed white/crimson logo; static transform sets tilt on an outer wrapper, rotation animates a separate inner wrapper, preventing competing transform owners. Suggested periods 18/24/30 seconds, opposite directions; no flashing. Rings stop on global pause, reduced motion, hidden/offscreen. Keep the explanatory text static. Optional subtle highlight follows selected chapter, labelled illustration rather than real processing.

### Network texture

Use only in two selected dark regions: system sidebar backdrop and outer deployment background. No animation behind body text, transcript, input or light sample panel. Limit to 32 points / 48 visible links desktop, 16 / 20 phone, 20–24fps update cap, lines low-opacity with maximum connection radius. Avoid all-pairs unbounded searches; cap neighbor count. It is atmospheric, not live data. Pointer-events none; aria-hidden; clip within section. Static SVG texture on reduced motion/low tier. Do not ship the animated GIF as a runtime background.

### Closing sphere

Retain headline, CTA and current section position. Replace pale rings at right with a second related but distinct form: darker wine/crimson strands, warm-white inner void, two fine orbital ribbons, readable silhouette on paper. No pink fog across the text. Artwork occupies right ~40%; reserve its dimensions and keep a minimum 40px separation from the copy at desktop. At phone stack below CTA, height 240–280px, or show a poster. Primary CTA remains visible before the ornament. Share a renderer module with hero, but allocate only visible scenes; hero and closing cannot both idle-render offscreen. Use a static elaborate SVG if a second WebGL context cannot meet the measured budget.

### Console

Restyle the existing composer: raised near-black background, 1px visible control border, 16px white input text, readable placeholder, white focus outline and crimson send control. Preserve labels, textarea resizing, Enter/IME, disabled/pending states, error/reset/retry and cost unavailable logic. The transcript's scroll and mobile keyboard must remain usable. No particle-network background in console.

Replace decorative SG avatars with lightweight static sphere marks. At most **one** small animated 24–32px status sphere near the current request status, not one continuous canvas per message. Reuse existing 2D orb infrastructure where suitable. Idle = still, pending request = slow breathing/orbit with visible “Waiting for reply” or existing truthful text. Current API returns complete JSON, not a streamed reply: there is no truthful long-running “responding” phase. Arrival may trigger a bounded ≤250ms settle, then idle. Error = still with textual error; reset/cancel = idle after actual lifecycle completion. Do not reveal reply text letter-by-letter. Add a streaming state only in a separate backend feature with real events.

## Performance acceptance

Keep existing <150KiB gzip initial-JS budget. New shared decorative runtime target ≤25KiB gzip; all eager modules counted, optional imports separately. DPR max1.5 desktop /1 phone. Provisional point tiers 6k desktop /2k phone /static low capability; choose counts from measured traces, not navigator guesses alone. At most one large active sphere renderer in the viewport; global scheduler prioritizes primary visible art. Network stops while a large sphere is active if combined cost exceeds budget. No frame-by-frame DOM measurement: cache dimensions with ResizeObserver, no per-frame getBoundingClientRect. Stop when tab hidden. Allocate no typed arrays in the frame loop. Avoid per-pixel filters on text/layout.

In local lab compare same before/after conditions: three cold runs and median loading metrics, eager/optional gzip totals, 6× CPU throttle scroll/hover trace and a phone viewport. Target ≤33ms frame interval for decorative motion under chosen mobile tier, no repeated decoration-attributable tasks >50ms. These are provisional lab budgets, not field guarantees. If missed, reduce tier or use poster; never sacrifice input responsiveness to keep an effect. Record failure/degradation behavior, not only a Lighthouse score. Field LCP/INP/CLS and physical-device keyboard/GPU behavior remain separate evidence. No claim of “zero lag” from tests alone.

## Review gates

Visual approval checkpoint after 03 (palette, larger type, hero still), after 07 (motion/backdrops/closing), then after 08 (real console). One owner and one planned browser verification pass for each checkpoint; fixes only rerun affected journeys. New real behavior gets meaningful tests; cosmetic changes do not need tests that merely assert every CSS value. Final tests include auto-start, persistent pause, OS override, failed storage/import/context, offscreen/tab suspension, repeated mount, pagehide during import, 320px empty/answered console and no-JS controls. Update old opt-in tests to the new policy while retaining fallback/cancellation guarantees. Source scope is frontend only; no new customer claims/actions or deployment.


## Client implementation enquiries

The site now has two distinct user goals: try the assistant, or contact Bradley about implementing it. Preserve Explore the assistant → /console/ as the primary hero action. Add **Discuss implementation** as a secondary hero link to #implementation-contact. Retain See the system as a quieter text link if space permits; let the row wrap rather than reducing type. Keep header compact: existing Open assistant plus a Contact anchor only where it fits. On phones the hero and closing contact paths are sufficient.

Within the closing section, unify into a single cohesive closing composition with id="implementation-contact" on the unified contact container. Retain headline **Make the next question count.** (56–64px desktop, 36–44px phone; line-height ~1.08). Add supporting copy **Bring SupportGenius AI to your business. Let’s build around your knowledge and support workflow.** (18px, reading-width constrained). Primary action: **Discuss implementation** linking to `mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry`. Secondary text link: **Try Signal Desk ↗** linking to `/console/`. Below actions, display “Opens your email app. Or copy: BradJohn70@gmail.com” with the selectable address. Balanced two-column normal-flow layout (~55% text, ~45% artwork) with sphere centered vertically beside the complete text group without absolute positioning. On mobile, place text, actions, and address first, followed by the static sphere. Zero duplicate heading, internal divider, form, API endpoint, or server mail credentials.

Footer: add **Built by Bradley Chiwo** and clearly labelled professional links:

- Email: mailto:BradJohn70@gmail.com
- Portfolio: https://bradleychiwo.netlify.app/
- LinkedIn: https://www.linkedin.com/in/bradley-john-chiwo/
- GitHub: https://github.com/BradleyXiX

Use the exact user-supplied identities. These are contact destinations, not endorsements or integrations. Same-tab external links are fine; if opening a new tab, add rel="noopener noreferrer" and communicate it accessibly. Keep links readable, underlined or otherwise clearly interactive, with 44px touch targets and visible focus. No icon-only social row without accessible names. Verify anchor navigation, encoded mailto subject, no-JS links, footer wrapping at320px, and contrast on paper. All enquiries are explicitly user-initiated; this task does not authorize sending any message.

Palette revision: canvas #030304; raised #101012; higher #1A1A1E; main crimson #BB1729. Eliminate pink text entirely: headlines and links on dark use warm white, with weight/underline for emphasis. Reserve red for buttons, logo, rules, artwork and non-text state cues; on paper use dark wine #A5162A. Preserve a clearly labelled error state without pink body text. This revision replaces earlier palette values in all implementation tasks.
