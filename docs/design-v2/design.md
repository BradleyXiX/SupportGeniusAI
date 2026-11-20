# SupportGenius AI — Signal Architecture

**Design authority, version 2.0 · 20 November 2026 · Type: reference**

This document governs the new marketing surface and brand treatment. It replaces the earlier Signal Desk marketing art direction for this branch. It preserves the working product's routes and contracts. The reference in `docs/design-v2/reference/` is a visual target, not production application code. Figma SVG boards are editable layout references. Any conflict between the root copy and this kit's copy must be resolved by updating both in the same scoped commit.

## 1. Brief and audience

Build a distinctive, technically credible showcase for a document-based customer support assistant. Primary audience: business owners or technical evaluators considering a customized client deployment. Primary task: understand what the assistant does, inspect an example, then enter `/console/`. The working assistant stays focused and legible. Success: a visitor can explain “questions answered using configured business documents” and reach the console with one clear action.

The creative idea is **loose questions becoming organized knowledge**. The identity, sculpture, system story, and sample console express the same idea. Visual direction: warm graphite, old-gold functional accents, sparse mint, precise typography, architectural rules, a single kinetic point sculpture, and an off-white experience interlude. Avoid a generic black-neon AI dashboard or a copied tokenization site.

## 2. Product copy and claim policy

Approved hero: **Your knowledge. / A clearer / answer.**

Approved lead: “Turn your business documentation into a focused support conversation. Built around what your team knows.” Primary CTA: **Explore the assistant**, linking to `/console/` in production. Secondary CTA: **See the system**, linking to `#system`. Do not add a sales modal, signup, payment, waitlist, or fake contact destination without a real requirement.

The static marketing page must avoid a fixed Demo badge that could misrepresent a support-mode deployment. Every scripted marketing example is labelled locally as scripted, with no implication it is a live inference. The actual console must continue deriving mode and connection state from existing capabilities/session logic. Use “estimated” for cost; “Unavailable” remains an honest state. No guarantees that answers are verified or cannot hallucinate.

Never fabricate: action completion, citations, document upload, authenticated users, saved transcripts, live integrations, client logos, benchmarks, testimonial quotes, accuracy percentages, awards, or security certifications. Current customer actions are disabled. Do not hide this behind small print while advertising automation in the headline.

## 3. Identity

Name: **SupportGenius AI**; console product: **Signal Desk**; brand line: **Knowledge, made clear.** Use the same spelling everywhere. “SG” may appear only in the decorative sculpture or compact avatar with accessible surrounding identity.

The original **signal-prism** mark is a hexagonal enclosure with a central spine and three branching knowledge strokes. It suggests a structured exchange rather than a chatbot face, sparkle, brain clipart, robot, or generic gradient orb. Use the supplied `assets/supportgenius-mark.svg`. The standalone vector mark is the canonical small asset; the editable SVG wordmark requires the selected font.

- Horizontal lockup: mark, 12px gap, wordmark. At desktop header mark 36px, wordmark 21px, AI 11px mono. Mobile mark 29px and wordmark 17px.
- Clear space: at least one-quarter of the mark height on every side. Minimum standalone mark: 24 CSS px; favicon uses simplified full mark at browser size.
- Gold mark on graphite; monochrome warm white variant on dark. On light, use graphite paths or a dark containing surface. Do not put pale gold on white for functional UI.
- No stretching, bevel filter, glow, spinning logo, animated wordmark, or separate logo colors in adjacent sections. Footer, console, favicon, social preview, and README use the same identity.
- Proposed logo is not trademark clearance. User can refine it without blocking the architecture plan; revisions should replace the shared SVG, not redraw it per section.

## 4. Tokens and type

| Role | Token | Value / use |
| --- | --- | --- |
| Dark canvas | `--canvas` | `#1C1E20` |
| Raised surface | `--surface` | `#222527` |
| Hairline separator | `--line` | `#3B3E3E`; decoration only, not a control's only boundary |
| Main text | `--ink` | `#F3F0E8` |
| Supporting text | `--muted` | `#B0B7B4` on graphite |
| Primary accent | `--accent` | `#E4B95B`; CTA fill, current chapter, logo |
| Secondary accent/focus | `--mint` | `#9DCEC0`; focus and occasional sculpture points |
| Light canvas | `--paper` | `#ECEBE5` |
| Light text | `--paper-ink` | `#242827`; secondary light text `#5A625E` |
| Control boundary | local semantic token | `#737D76` on graphite; verify ≥3:1 when boundary is needed |

Gold CTA text is `#202420`. Color is never the only state cue: selected samples also expose `aria-pressed`, labels remain textual, errors include a message. Maintain at least WCAG 2.2 AA text contrast, 3:1 essential non-text contrast, and visible focus. Validate pairs rather than declaring all token combinations safe.

Use **Space Grotesk** for display and headings, **Plus Jakarta Sans** for body, **JetBrains Mono** for small process indices. Self-host licensed WOFF2 subsets. Preserve font-family fallback and `font-display: swap`; reserve dimensions to avoid layout shift. Do not preload every weight. The reference fonts total approximately 71KB uncompressed. For new locales, add needed subsets deliberately.

Desktop H1: clamp 60–102px, line height 1.02, weight 500, tracking −0.055em. Mobile H1: 48–74px according to width; H2 36–59px desktop and 36px mobile; body 14–16px, line height 1.65–1.8. Console response body at least 14px, ideally 15–16px in production; metadata no smaller than 11px when conveying important state. Small 8–10px indices in the reference are nonessential decoration, never required instructions or disclosures. Do not render primary copy in all caps.

Use a 4px spacing base; frequent values 8,12,16,20,24,32,40,56,64,80,110. Buttons mostly square or 2px radius. Console input may use 6px radius. Do not mix pill CTAs, rounded bento cards, and sharp architectural panels without a functional reason.

## 5. Layout and responsive rules

Desktop concept frame: 1440px viewport, maximum shell 1640px, 20px outer framing up to 1700px then 32px. Main wrapper = viewport minus 112px, max 1360px. At ≤1100px wrapper uses 64px total inset; at ≤760px use 8px outer shell and 20px inner insets. On 320px the content must reflow without document overflow. Avoid fixed-height text containers or `100vh` traps.

Header: 102px desktop; 84px mobile. Brand left, three descriptive section links, “Open assistant ↗” right. Mobile hides the nonessential section links while preserving brand and primary destination; no empty hamburger. Primary route and footer links remain real anchors.

Marketing section order:

1. Header and **hero**: 1.08:1 two-column split; left headline and CTA; right sculpture. Desktop hero minimum around 740px including padding, not a forced full viewport. On mobile copy precedes sculpture; single column; static art gets full available width. Copy never waits for animation or shaders.
2. **Capability strip**: 82px desktop, three text capabilities and SG/001 index, fine top/bottom rules. Wrap on mobile; no auto marquee or borrowed customer logos.
3. **The system** `#system`: heading and short business explanation above a 1:1.5 content division. Left small orbit mark, right ordered disclosures. On mobile omit decorative sidebar. Steps: knowledge → context → conversation. One chapter open at a time, independently understandable without scrolling animation. Use native `<details>/<summary>` or an accessible existing equivalent.
4. **Experience** `#experience`: full-width off-white section; charcoal sample console inside. Three scenario buttons left; question and answer right; stacked on phone. Every example explicitly scripted. No fake typing delay or pretend live event stream.
5. **Deployment** `#deployment`: asymmetrical 1.15:1 ruled panel. Larger document stack left; two stacked explanation panels right. These are content panels, not three identical SaaS cards. Text/Markdown knowledge, model configuration, operating boundaries.
6. **Closing CTA**: off-white field, large two-line statement left, optional static rings right; same primary destination. No invented contact form.
7. **Footer**: identity, concise purpose, back-to-top, copyright. No links to nonexistent privacy/legal pages. Add actual policy links if the owner supplies them.

## 6. Section specifications

### Hero / reference `index.html` .hero

Hero eyebrow: “Support intelligence, with context.” Decorative uppercase may be mono; headline remains sentence case. Lead max 370px. CTA min-height 48px. Supporting line: “A working foundation for tailored client deployments.” Do not replace that with “enterprise-grade” without evidence. Hero poster has intrinsic 800×800 dimensions; stage reserves its aspect ratio. Top label SG/SIGNAL CORE and lower QUESTION → CONTEXT → ANSWER are illustration labels, not live status. Motion button sits in the figure caption.

### System chapters / .chapters

01 **Start with your knowledge.** Approved policy/support documents form context; current ingestion is text/Markdown.

02 **Give the question context.** Relevant passages accompany the question to a configured model; retrieval cannot guarantee accuracy.

03 **Keep the conversation clear.** Question, response, and recovery controls stay together; customer actions and source citations are unavailable in the current release.

Toggle control includes the step number, heading, and a decorative plus that changes orientation. Preserve native keyboard activation. Closed text is correctly absent from focus order. Product-critical claims must also appear outside a closed disclosure when needed for visitor decisions.

### Experience / .demo-frame

Sample labels: Returns policy / Shipping times / Opening hours. Immediate replacement of question and answer, no fake networking. State indicators: selected class + `aria-pressed`. Results announced with one atomic polite region; don't announce a frame-by-frame animation. Policies are illustrative, not a promise for a real deployment. No citations, confidence scores, fabricated customer identifiers or refund issuance. Production CTA goes to `/console/`, not `console.html` (that destination exists only inside the standalone kit).

### Deployment / .deployment-grid

“The details make the difference.” Document stack labels POLICIES.md / SHIPPING.md / HOURS.txt are illustrative file names. They don't imply a browser upload interface. “Choose your model setup.” means the operator configures providers. “Clear operating boundaries.” mentions anonymous sessions, bounded requests, explicit errors and no live customer actions.

### Console brand application

Preserve `#chat-form`, `#input`, `#send-btn`, `#reset-btn`, transcript, capability/session bootstrap, error handling, retry/reset semantics, sanitizer, and cost availability logic. Introduce the mark and typography through the shell and CSS only. A calmer graphite surface, amber functional emphasis, adequate message contrast, 44px controls and readable transcript are sufficient. No cinematic scroll, continuous background canvas, magnetic composer, or moving reply text. The existing small orb may indicate pending/idle based on actual client state, never invented backend stages.

The standalone `reference/console.html` is a deliberately scripted **design reference**. Do not copy its canned handler into `client/app.js`. Real replies must continue to use existing APIs. Keep Demo / Support / checking / unavailable states driven by actual data.

## 7. Motion score and ownership

| Effect | Purpose / trigger | Owner, property | Timing / interruption | Reduced-motion / fallback |
| --- | --- | --- | --- | --- |
| Gold CTA hover/focus | Confirm interactive target | CSS background/color; focus outline stable | 180ms; reversible | Instant color change |
| Chapter plus | Clarify open state | CSS transform on plus only | Immediate in reference; optional 160ms | Static changed state |
| Sample switching | Compare useful questions | DOM text/pressed state; optional opacity only on result wrapper | Immediate; at most 120ms dissolve, last click wins | Immediate content |
| Point sculpture | Show a three-dimensional organized field; explicit Enable motion | Native WebGL module owns canvas and rotation | Slow .13rad/s; native scroll adds .00035rad/px; Pause halts and returns to poster | SVG initially; reduced-motion does not fetch module |
| Document stack | Evoke structured knowledge | Static CSS perspective only | No loop; optional 180ms hover at most ±2° later | Flat stack |
| Scroll chapter emphasis (later enhancement) | Orient reader in system section | IntersectionObserver owns class on chapter marker; CSS opacity/color | No pinned scroll; immediate updates | Same content, static markers |
| Reveal (optional final pass) | Guide attention to secondary diagram details | WAAPI owns transform/opacity of decorative wrapper only | 16px/350ms once; no H1 or CTA hiding; cancel on teardown | No reveal; visible from first paint |

Only the sculpture runs continuously, and only after consent. It stops when offscreen, hidden, paused, disposed, or context-lost. Device-pixel ratio capped at 1.5. No global cursor, looping marquee, scroll hijack, GSAP + CSS transform conflict, or animation on every word. Reference implementation intentionally omits reveal effects until static layout and interaction are proven. Do not add GSAP unless a specific coordinated sequence requires it; then document a bounded dependency/ownership change.

If the design later requires an imported GLB, start with a purpose and compare it against the existing point sculpture. Target ≤500KB compressed optional asset and ≤15k triangles as a provisional budget, not a guarantee. Do not block the core journey waiting for Blender. Record a separate asset decision and test mobile hardware before enabling it.

## 8. Behavior and accessibility contract

- Native scrolling and anchors; skip link first, unique H1, coherent landmarks, correct heading hierarchy, meaningful link labels. Every CTA works with keyboard.
- 44×44px preferred interactive target; at least WCAG minimum target rules if a compact exception is necessary. Do not rely on hover to reveal essential copy.
- No text embedded in canvas; sculpture is decorative with adjacent visible caption. Poster and all essential content render before JS. Never set all sections to opacity:0 globally.
- Reduced-motion checked before optional import and at runtime. Pause button uses accurate `aria-pressed`, visible label, keyboard activation, and stays usable at 320px.
- Scripted examples are local to marketing; no session bootstrap, `/chat`, or provider request on landing-page scroll/click. Actual console remains the sole live conversation surface.
- Error or missing WebGL preserves poster and content. Failed font loads fall back; missing enhancement does not block navigation. Native disclosures work without JS.
- Focus is visible and never obscured by sticky UI. Avoid sticky headers initially; no focus trap or unnecessary modal.
- Retain external modules and CSP; no inline handlers or arbitrary `innerHTML` for model/user content. Use `textContent` for the reference fixture.

## 9. Performance and evidence budgets

Production budgets: initial client JS **<150KB gzip** (existing repo requirement), optional core module target <10KB gzip, local Latin fonts target ≤90KB total, hero poster target ≤150KB raw, no video dependency, no third-party runtime request. Reserve art dimensions; no layout shift on example switching or font load. Field goals: LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 at p75; local checks must be labelled lab evidence.

Use a single planned browser verification pass per milestone journey: desktop 1440×1000, phone 390×844 and 320×800 reflow; keyboard, reduced motion, no-JS, WebGL failure, sample switching and console route. Record route, SHA, mode, viewport, error log, asset transfer and any throttling. Do not claim field INP from Lighthouse or FCP. Before final release capture a throttled performance trace and a real-device sample; if unavailable, keep it as an evidence gap.

## 10. Acceptance and design quality

The page is ready for review when: the first viewport has a recognizable identity and clear task; the static page is compelling; each section changes the narrative; the primary CTA reaches the real console; all claims match source; sample controls work; mobile has no overflow; no keyboard or reduced-motion regression; no console lifecycle regression; and checks/receipts are reproducible.

Quality is not proven by a banned-word grep, an arbitrary “award score,” or a screenshot alone. Compare against the reference composition, then inspect actual interaction, rendering, content, loading, and recovery. Every design deviation needs a reason in the receipt; do not silently improvise a new visual direction in each milestone.
