# Architecture Decision Records (ADRs)

This directory maintains immutable Architectural Decision Records for **SupportGenius AI** (see [docs/README.md](../README.md)). Original decision text is preserved; dated status or correction notes at the top of a record document later supersessions.

## Index

| ADR | Title | Status | Date | Decision summary |
| :---: | :--- | :---: | :---: | :--- |
| [0001](0001-ecc-production-hardening-architecture.md) | Enterprise Hardening: RFC 7807, XML Boundaries, and Bounded FinOps | **Partially superseded by ADR-0002** | 2026-10-27 | Introduced Zod contracts, RFC 7807 problem details, Helmet CSP, XML prompt framing, bounded FinOps tracking, and `/health` probe. |
| [0002](0002-safe-support-foundation-and-anonymous-sessions.md) | Safe Support Foundation: Anonymous Cookie Sessions, Action Guardrails, and Dual Operational Modes | **Accepted** | 2026-11-07 | Established unconditional action disablement, server-owned signed `HttpOnly`/`SameSite=Strict` cookie sessions, exact `PUBLIC_ORIGIN` validation, bounded timeouts, explicit `demo`/`support` modes, and single-process limits. |
| [0003](0003-signal-architecture-design-reference.md) | Signal Architecture design reference and staged integration | **Integrated (v2 + v3 addendum)** | 2026-11-20 | Kept Express + vanilla ES modules, native scroll, and progressive optional native WebGL; later extended by [Crimson Signal v3](../design-v3/design-enhancements.md). |
