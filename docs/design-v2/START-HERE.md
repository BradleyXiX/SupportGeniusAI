# SupportGenius AI: Signal Architecture

> [!NOTE]
> **Historical reference kit (v2):** Signal Architecture v2 was merged into `main` (PR #6) and visually extended by Crimson Signal v3 (PR #7). For current product and design guidance, see [README.md](../../README.md), [design.md](../../design.md), and [docs/design-v3/design-enhancements.md](../design-v3/design-enhancements.md). Obsolete proposal files (`README.proposed.md` and `self-evaluation.md`) were retired in favor of root `README.md` and [docs/README.md](../README.md).

Prepared 20 November 2026. This is the design and execution handoff for a second-generation brand and frontend. Product implementation belongs to Antigravity. Codex prepared a runnable, isolated reference and the engineering plan.

## Open first

1. Read [design.md](design.md), the single visual and content authority.
2. Preview `reference/` over HTTP. From the kit directory run `python -m http.server 4173 --bind 127.0.0.1`, then open `http://127.0.0.1:4173/reference/`. Direct file URLs can block ES-module imports.
3. Inspect [the audit](audit.md) and [research](research.md) for evidence and decisions.
4. In Antigravity execute [prompt 00](prompts/00-baseline.md). Thereafter run one numbered prompt at a time. Each prompt includes scope, dependencies, checks, a receipt, and a commit message.

The project checkout is `C:/Users/Admin/OneDrive/Desktop/Source Code/SupportGeniusAI`. Its local redesign branch is `design/signal-architecture-v2`, based on `35f0793`. No push, merge, deployment, or hosting setting change is included. A separate branch alone cannot prove that remote preview deployments are disabled; keeping this work local avoids that uncertainty.

## What is authoritative

| Artifact | Authority |
| --- | --- |
| Root `design.md` / this kit's identical `design.md` | Design, copy, layout, states, motion, budgets |
| `execution-plan.md` | Sequence, file ownership, dependencies, acceptance gates |
| `prompts/NN-*.md` | One bounded task per Antigravity session |
| `reference/` | Runnable visual and interaction reference; scripted examples only |
| `figma/*.svg` | Editable vector layout boards for importing into Figma |
| `README.proposed.md` | Professional repository front page prepared against the inspected source |
| `verification.md` and `verification.json` | Measured checks and explicit evidence gaps |

In the repository, the kit is installed at `docs/design-v2/`; `README.proposed.md` is also installed as root `README.md`. The production `client/` and backend remain the implementation starting point. The reference is served only when explicitly opened under `/docs/...` by a local static server; Express serves only `client/`.

## Figma status

[The Figma file](https://www.figma.com/design/1s4vyOz7vqueqkVPx0NHLc) was created successfully. Starter-plan MCP limits blocked construction. The attempted component import failed transactionally and no completed screen was committed. Do not use the empty file as proof of a finished design.

Import `figma/desktop-board.svg`, `figma/mobile-board.svg`, and `figma/brand-board.svg` into a Figma Design page. They contain vector shapes and editable text, not a flattened UI image. They are layout boards, not an auto-layout component library. Install Space Grotesk, Plus Jakarta Sans, and JetBrains Mono locally if Figma reports missing fonts. Create native components and token bindings when write access is available. `reference/` remains the working interaction reference.

## The efficient workflow

The repository is the shared memory. Tell Antigravity: **Read AGENTS.md and design.md. Execute only docs/design-v2/prompts/01-brand-foundation.md. Follow its receipt and scoped commit requirements. Stop after that task.**

Do not paste the 13-page conversation into every session. Prompts reference the exact relevant sections of the design, the previous receipt, and the current Git diff. Keep receipts under 500 words, attach screenshot paths and command exits, and record blockers precisely. This is more reliable than a larger master prompt or repeated design reinterpretation.
