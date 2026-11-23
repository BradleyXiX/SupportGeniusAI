# SupportGenius AI — Agent Operating Guide

This guide pairs with root [AGENTS.md](../AGENTS.md). Root `AGENTS.md` is authoritative for repository-specific architecture and scope boundaries.

## Skill library (`.agents/skills/`)

The skills below remain available as contextual engineering references. Examples inside individual skills (such as React, GSAP, Lenis, Three.js, Prisma/Drizzle, or RBAC/OAuth) **do not authorize changing SupportGenius AI's Express + vanilla JS architecture, adding prohibited motion/cursor libraries, or enabling deferred backend features**.

| Domain | Skill | Path | Use when |
| :--- | :--- | :--- | :--- |
| **Frontend** | `taste-design` | [skills/frontend/taste-design/SKILL.md](skills/frontend/taste-design/SKILL.md) | Visual hierarchy, typography, and layout polish (within `design.md` + v3 addendum) |
| **Frontend** | `ui-ux-design-system` | [skills/frontend/ui-ux-design-system/SKILL.md](skills/frontend/ui-ux-design-system/SKILL.md) | Spacing tokens, WCAG AA contrast, focus rings, keyboard and responsive reflow |
| **Frontend** | `gsap-motion` | [skills/frontend/gsap-motion/SKILL.md](skills/frontend/gsap-motion/SKILL.md) | Reference only — Lenis/React patterns are excluded in this repo |
| **Frontend** | `threejs-webgl` | [skills/frontend/threejs-webgl/SKILL.md](skills/frontend/threejs-webgl/SKILL.md) | Reference only — heavy 3D frameworks are excluded; native WebGL is bounded |
| **Frontend** | `cursor-effects` | [skills/frontend/cursor-effects/SKILL.md](skills/frontend/cursor-effects/SKILL.md) | Reference only — custom cursors are excluded in this repo |
| **Security** | `vulnerability-audit` | [skills/security/vulnerability-audit/SKILL.md](skills/security/vulnerability-audit/SKILL.md) | Secret hygiene, input sanitization, CSP, CORS, OWASP checks |
| **Security** | `auth-session` | [skills/security/auth-session/SKILL.md](skills/security/auth-session/SKILL.md) | Cookie/session hardening (anonymous sessions only in current release) |
| **Backend** | `api-contracts` | [skills/backend/api-contracts/SKILL.md](skills/backend/api-contracts/SKILL.md) | Zod runtime validation and RFC 7807 problem details |
| **Backend** | `database-resilience` | [skills/backend/database-resilience/SKILL.md](skills/backend/database-resilience/SKILL.md) | Reference for future persistent storage work |
| **Quality** | `tdd-testing` | [skills/quality/tdd-testing/SKILL.md](skills/quality/tdd-testing/SKILL.md) | Vitest unit/contract tests and Playwright + axe-core browser tests |
| **Quality** | `performance-vitals` | [skills/quality/performance-vitals/SKILL.md](skills/quality/performance-vitals/SKILL.md) | LCP/INP/CLS lab budgets and client payload discipline |
| **Docs** | `technical-documentation` | [skills/docs/technical-documentation/SKILL.md](skills/docs/technical-documentation/SKILL.md) | Diátaxis structure, MADR ADRs, active voice, zero fluff |
| **Docs** | `api-reference` | [skills/docs/api-reference/SKILL.md](skills/docs/api-reference/SKILL.md) | Endpoint contracts, status codes, and concrete request/response examples |

## Pre-change checklist

1. **Contracts & validation**: Validate external inputs and environment variables with Zod (`server/config/env.js`, `server/schemas/`), returning RFC 7807 `application/problem+json` errors on failure.
2. **Security**: Keep zero hardcoded secrets, preserve Helmet CSP and exact `PUBLIC_ORIGIN` checks, sanitize rendered model output with vendored `DOMPurify` (failing closed to text), and keep customer actions disabled.
3. **Lifecycle & performance**: Dispose listeners, timers, observers, and canvas contexts cleanly; avoid layout-thrashing hover animations; keep initial client JS under 150 KiB gzipped.
4. **Verification**: Run `npm test` (and `npm run test:browser` when changing client/UI behavior) and report actual commands, counts, and exit codes.
5. **Documentation & traceability**: Keep one canonical source per maintained fact ([docs/README.md](../docs/README.md)); record major architectural changes in `docs/adr/`.
