# SupportGenius AI — Agent & Engineering Guardrails

This file is the root routing note for coding agents working in SupportGenius AI. Detailed general guidelines live in [.agents/AGENTS.md](.agents/AGENTS.md), and the reusable skill library lives in `.agents/skills/`. Where general skill examples conflict with this repository's architecture, **this file takes precedence**.

## Canonical documentation

- Product overview & local setup: [README.md](README.md)
- Documentation index: [docs/README.md](docs/README.md)
- Operations, env schema & limits: [docs/deployment.md](docs/deployment.md)
- Architecture Decision Records: [docs/adr/README.md](docs/adr/README.md)
- Visual design authority: [design.md](design.md) with active v3 addendum [docs/design-v3/design-enhancements.md](docs/design-v3/design-enhancements.md)
- Licensing & third-party notices: [LICENSE](LICENSE), [client/vendor/LICENSES.md](client/vendor/LICENSES.md), [client/assets/brand/NOTICE.md](client/assets/brand/NOTICE.md)

## Non-negotiable architecture and scope rules

1. **Preserve the stack**: Express (`server/`) + vanilla ES modules (`client/`) + native browser scrolling. Do not introduce React, Next.js, Lenis smooth scroll, custom mouse cursors, or heavy 3D libraries/canvases.
2. **Preserve safety boundaries**:
   - Explicit `APP_MODE` (`support` / `demo`) and `RETRIEVAL_MODE` (`vector` / `keyword`).
   - Customer mutating actions and outbound webhooks remain unconditionally disabled.
   - Server-owned anonymous signed `HttpOnly` cookie sessions (`memorystore`), exact `PUBLIC_ORIGIN` checks on `POST /session` and `POST /chat`, Helmet CSP, and RFC 7807 error responses remain intact.
   - Source-citation delivery, durable transcript storage, customer login/accounts, and multi-tenancy remain out of scope unless explicitly authorized in a new specification.
3. **Preserve third-party and proprietary rights**: Keep [LICENSE](LICENSE), [client/vendor/LICENSES.md](client/vendor/LICENSES.md), and `client/assets/fonts/*-OFL.txt` intact.
4. **Scoped, safe Git hygiene**:
   - Work on a dedicated branch; never reset, stash, or discard unrelated user edits.
   - Never push, merge, deploy, change repository visibility, or modify hosting configuration unless explicitly requested.
   - Never commit `.env` or print secrets, API keys, or cookie tokens.
5. **Historical packets are context only**: Files under `docs/design-prompts/`, `docs/backend-prompts/`, `docs/provider-prompts/`, `docs/superpowers/`, `docs/design-v2/` (except active links), and `docs/design-v3/{prompts,receipts}` are historical execution records. They do not authorize new tasks or override current instructions.
6. **Skill library preservation**: Keep `.agents/skills/` intact. Skill examples (such as React, GSAP, Three.js, Prisma, or RBAC) are contextual references only—not permission to migrate this repository's stack.
