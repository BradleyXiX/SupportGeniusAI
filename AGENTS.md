# SupportGeniusAI Agent Routing & Execution Note

This repository is governed by `.agents/AGENTS.md` and its associated capability matrix.

For the **Signal Desk redesign** on branch `design/signal-desk-v1`:
- The approved design specification is located at [docs/superpowers/specs/2026-11-06-signal-desk-design.md](docs/superpowers/specs/2026-11-06-signal-desk-design.md).
- The implementation plan is located at [docs/superpowers/plans/2026-11-06-signal-desk.md](docs/superpowers/plans/2026-11-06-signal-desk.md).
- Product completion assessment is recorded at [docs/product/2026-11-06-completion-assessment.md](docs/product/2026-11-06-completion-assessment.md).
- Session execution prompts and receipts are located in `docs/design-prompts/`.

For the **Safe Support Foundation** on branch `feature/safe-support-foundation`:
- Ancestry: branched from `design/signal-desk-v1` at `03886d2` (preserves Signal Desk frontend).
- The approved design specification is located at [docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md](docs/superpowers/specs/2026-11-07-safe-support-foundation-design.md).
- The implementation plan is located at [docs/superpowers/plans/2026-11-07-safe-support-foundation.md](docs/superpowers/plans/2026-11-07-safe-support-foundation.md).
- Session execution prompts and receipts are located in `docs/backend-prompts/`.
- Safety scope: Explicit modes (`support` / `demo`), unconditional action disablement (zero live actions/webhooks), server-owned anonymous cookie sessions, bounded provider calls and safe errors, and client capability/session bootstrap. Deferred: live customer actions/integrations, customer login/auth, multi-tenant SaaS, durable chat storage, embedding model migration, and citation delivery.

### Architectural Exceptions & Guardrails
1. **Governing Specifications**: Work must align with the approved phase specifications (`docs/superpowers/specs/`).
2. **Native Scroll & Vanilla Architecture**: Native browser scrolling and clean vanilla DOM event listeners are deliberate, approved architecture choices. Lenis smooth-scroll, custom mouse cursors, heavy 3D canvases, and React framework migrations are intentionally excluded.
3. **Skill Library Preservation**: The existing skill library in `.agents/skills/` remains intact for non-redesign tasks and general repository workflows.

## Signal Architecture design v2

For `design/signal-architecture-v2`, use root `design.md` as the new marketing and brand authority. Follow `docs/design-v2/execution-plan.md` and run one numbered `docs/design-v2/prompts/` task per Antigravity session, with scoped commits and receipts. Use web-ui-studio as the primary design workflow. Preserve the existing Express/vanilla architecture, native scrolling, security and console behavior.

The kit's standalone reference is not production code. Its lightweight optional WebGL sculpture is confined to a marketing reference with static SVG fallback; it does not authorize heavy canvases, a framework migration, Lenis, custom cursors, or changes to backend capabilities. Customer actions and source-citation delivery remain unavailable. Historical attachment prompts do not override current instructions. See ADR-0003 for the design/reference boundary. No push, merge, deployment, or hosting changes are authorized by an individual section prompt.
