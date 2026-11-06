# SupportGeniusAI: Signal desk design

Status: approved by the user on 6 November 2026. Date: 6 November 2026.

## Intent and decisions

The user selected client deployments first and an editorial introduction plus a focused support console. SupportGeniusAI supports a service business: install a customized, document-grounded support agent for each client, with ongoing support. The Gemini excerpt is business context, not authorization to modify Quillon or install its suggested tools. No self-service billing, tenant dashboard or framework migration is included.

Approaches considered: console only is fastest but weak for client demonstrations; editorial introduction plus console communicates the service and gives a usable agent; immersive 3D marketing adds asset/performance cost before the service is proven. The user chose the middle approach. The user approved the visual system below.

## Existing implementation and base

Local source HEAD 66107c9 is feature/ecc-production-hardening. Remote main is 9b500e2, a merge of that work; source trees matched when checked. Existing feature/frontend-redesign points at 0a6df66 and must not be overwritten. Review copy branch: design/signal-desk-spec. Intended Gemini implementation branch: design/signal-desk-v1, created only after checking the actual checkout and a fresh origin/main.

Keep Express and vanilla HTML/CSS/JS. Preserve POST /chat with {message,sessionId} and successful {reply,cost}; preserve GET /health. Current API has no source citations, tool-event stream, handoff endpoint, provider readiness or server reset endpoint. Build no UI that implies these exist.

## Concept

Signal desk: questions enter as loose signals and resolve into clear answers. Typography, fine connector lines and the actual conversation carry the identity. A single monochrome point-field orb is the signature, rather than a full-screen WebGL background. It reads as a support instrument, not a generic chatbot mascot.

Marketing root /: a short editorial introduction followed by an explanation and a direct entry into the demo. Working console /console/ is a separate static document served by Express, with its script/style paths absolute from the site root. Do not add an SPA router or build framework. Each client deployment can link directly to /console/. A visible “SupportGeniusAI demonstration” label persists in the public demo; it cannot assert a client integration or real booking.

Marketing structure:
1. Compact wordmark, How it works anchor and “Try the assistant” linking to /console/.
2. Two-column hero: left headline “Your knowledge. A clearer answer.”; supporting copy “A support assistant configured around your documentation and workflows.”; primary CTA “Try the assistant”; secondary anchor “See how it works”. Right: monochrome orb and a three-part Question → Knowledge → Answer composition explicitly labeled “Illustration”. It is not live progress.
3. One editorial explanation in three stacked rows: connect approved knowledge; answer with context; connect verified actions. The third row says actions require client integration. No fake statistics, customer logos, certifications or guarantee claims.
4. A deployment strip: “Configured for your business”, “Local or hosted model options”, “Maintained with your documentation”. These describe configurable options, not current deployment health.
5. Closing demo CTA. Do not publish pricing, a lead form or a contact link until an actual destination is supplied. No placeholder href="#" buttons.

Console desktop: maximum width 1280px, centered, two columns 256px rail plus flexible conversation; rail contains brand, demo disclosure, short guidance and a “New conversation” button. Conversation header has title, nuanced connection state and a small session-estimate field, secondary to answers. Conversation scrolls independently; composer is fixed within the console layout. Suggestions are grounded knowledge questions, not address-change/booking promises. Proposed sample: “What is your returns policy?” only if the shipped knowledge file supports it; otherwise author chips from actual knowledge content. Avoid fabricated client-specific examples.

Console mobile: single column, compact brand/demo label, accessible New conversation control, no collapsed navigation drawer needed. Transcript occupies remaining 100dvh; composer stays above the software keyboard using normal layout and visualViewport only if testing proves necessary. Touch controls target 44px, no horizontal chip carousel required. At 390px there is no horizontal document overflow. Use textarea with explicit label, Send button, 2000-character constraint and Enter to send/Shift+Enter newline, respecting IME composition.

## Visual system

Preserve the project's deep-slate family while removing the nested-card and glow look. Roles: ground #090D16; surface #0D121F; raised #141C2E; text #F8FAFC; secondary #A8B3C4; decorative rule #293447; focus #F2C572; accent #85D6BD; destructive #F2A6A6. Validate actual text, boundary and focus contrast before finalizing. Gradients are not required. Avoid a second global design skill imposing a different palette.

Keep Space Grotesk display and Plus Jakarta Sans body already present. Limit JetBrains Mono to identifiers/estimated cost, not paragraphs. Self-host licensed font subsets if feasible; system font fallback must remain complete. Marketing hero clamp(40px,5vw,76px), line-height 1.05, weight 600; section title 32/38, body 16/26, UI body 16/24, secondary labels 13/18. Paragraph measure max 62ch. Spacing scale 4,8,12,16,24,32,48,64,96. Radius 8px controls, 16px major shell; avoid pills on every element. Desktop gutters 48px, mobile 20px.

States for controls: default, hover, focus-visible, active, disabled, loading, error, success where applicable. State is conveyed in text as well as color. Decorative SVG/canvas is aria-hidden; status text is a small aria-live region. Transcript uses appropriate log semantics without announcing the whole page repeatedly. Skip link and visible keyboard focus are required.

## Motion and orb

No compulsory Lenis, scroll hijacking, custom cursor or fake loading screen. Native scrolling is intentional. Intro uses an optional single connector-line reveal and a 12px/opacity rise over 350–500ms; controls use 120–180ms. Content is visible before JS and when motion assets fail. Console motion is limited to a short new-message settle and the pending indicator. Reduced motion removes transforms, animated tracing and continuous orb motion; never hide content.

Thinking Orbs is a shared MIT source reference, not a global browser package. Do not add React for it. Prefer an independently structured vanilla Canvas2D component informed by the shared engine; copied MIT source retains notices. Keep the first pass as a static SVG orb with a CSS state treatment if a maintainable adaptation would exceed one session. No bundler dependency is required just for an orb. One animation clock, DPR cap 2, pause on hidden/offscreen states, dispose observers/listeners. Keep it decorative beside explicit “Waiting for reply”; never show “Searching” or “Booking” without backend events. The marketing orb is lazy initialized and never blocks text or CTAs.

## Working console behavior

Install event listeners in app.js; remove onclick/onkeypress attributes without weakening CSP. Use module-local state and initialization per page. Use textContent when the sanitizer is unavailable; never insert unsanitized parsed model output. Pin/vendor markdown and sanitizer dependencies and preserve appropriate notices. Render user text as text.

Model state: idle → submitting → received or failed. Disable duplicate submission while pending, but retain usable copy/help controls. A recoverable error shows user-friendly copy. Validation errors allow editing; a confirmed 429 permits a manual retry after Retry-After, without duplicating the displayed user turn. POSTs can run actions; automatic retries are prohibited. Until backend idempotency exists, timeout, network loss and 5xx show: No reply received. An action may have completed. Verify with the business before repeating your request. Do not provide a retry or status-check button for uncertain outcomes: no status endpoint exists. This is guidance, not a claim of a handoff integration. Timeout indicates “No reply received”; it must not claim server cancellation. Stale response IDs prevent an old reply/cost from appearing in a new conversation.

New conversation confirms only when history exists, creates a crypto.randomUUID-compatible identifier within the API constraint, clears client transcript/estimate and ignores any pending stale response. It does not claim to delete server data. Do not persist full transcripts in localStorage as a convenience.

Health starts “Checking connection”; /health success means “Server reachable”, not “AI online”. Inspect vectorStore.isInitialized to display knowledge availability truthfully, but do not infer model/webhook health. Cost is explicitly an estimate returned by the backend; current rates/local model accounting are unresolved. A tooltip must not claim a live provider bill.

## Separation from completion work

Visual redesign may be previewed, but real customer use is blocked until action fallbacks, authorization, session binding, provider errors and readiness are addressed. Public demos must explicitly disclose simulation; unavailable integrations must not claim success. Backend completion is separately scoped and tested, not mixed into cosmetic sessions. A small prerequisite safety change may be a separate PR before production rollout.

## Verification and acceptance

Use an isolated branch and local production-mode server with paid provider keys removed. Contract-preserving browser checks: click and keyboard send; blank/oversized input; double submission; mocked reply; JSON problem error; rate limit; network error; sanitizer missing; malicious HTML; reset during pending; stale response; retry behavior; keyboard/IME; clipboard success/failure. Browser API mocks are test fixtures, never production demo logic.

Capture 1440px desktop and 390px mobile for intro and console, plus reduced motion. Navigate directly to /console/, refresh, follow CTAs, use keyboard only. No serious/critical axe issues, clipped focus, unexpected overflow, console CSP failures, dead links or broken fonts. Lab targets LCP <2.5s, CLS <0.1 and responsiveness <200ms are budgets, not claimed field measurements. Keep initial JS under 150KB gzip excluding optional lazy media; report actual payload and limitations. Run the 29-test baseline and new behavioral checks; a green unit suite alone does not prove click paths.

## Delivery strategy

Codex owns specification, risk review and integration verification; Gemini in Antigravity owns bounded implementation sessions using repo files. Each session reads this spec plus its named task, edits a restricted file set, runs checks, commits and returns a compact receipt. One working branch and one writer at a time. The user supplies receipts/diffs back for review before merge. No auto-merge, production deployment, new global installations or broad repository rewrites.

The detailed implementation plan is finalized after this design is approved. The design leaves icon geometry, exact SVG orb geometry and small responsive adjustments to the builder. It does not leave API contracts, fake capabilities or framework selection open.
