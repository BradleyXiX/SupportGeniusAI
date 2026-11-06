# SupportGeniusAI Agent Routing & Execution Note

This repository is governed by `.agents/AGENTS.md` and its associated capability matrix.

For the **Signal Desk redesign** on branch `design/signal-desk-v1`:
- The approved design specification is located at [docs/superpowers/specs/2026-11-06-signal-desk-design.md](docs/superpowers/specs/2026-11-06-signal-desk-design.md).
- The implementation plan is located at [docs/superpowers/plans/2026-11-06-signal-desk.md](docs/superpowers/plans/2026-11-06-signal-desk.md).
- Product completion assessment is recorded at [docs/product/2026-11-06-completion-assessment.md](docs/product/2026-11-06-completion-assessment.md).
- Session execution prompts and receipts are located in `docs/design-prompts/`.

### Architectural Exceptions for Signal Desk (v1)
1. **Governing Specification**: The approved spec (`docs/superpowers/specs/2026-11-06-signal-desk-design.md`) strictly defines the visual system, palette, typography, and UX contracts for this redesign.
2. **Native Scroll & Vanilla Architecture**: Native browser scrolling and clean vanilla DOM event listeners are deliberate, approved architecture choices for this project. Lenis smooth-scroll, custom mouse cursors, heavy 3D canvases, and React framework migrations are intentionally excluded.
3. **Skill Library Preservation**: The existing skill library in `.agents/skills/` remains intact for non-redesign tasks and general repository workflows.
