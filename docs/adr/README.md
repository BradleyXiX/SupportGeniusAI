# Architecture Decision Records (ADRs)

This directory maintains the immutable Architectural Decision Records for **SupportGeniusAI**, complying with the repository governance model defined in `.agents/AGENTS.md`.

## Index of Records

| ADR | Title | Status | Date | Decision Summary |
| :---: | :--- | :---: | :---: | :--- |
| [0001](file:///c:/Users/Admin/OneDrive/Desktop/Source%20Code/SupportGeniusAI/docs/adr/0001-ecc-production-hardening-architecture.md) | Enterprise Hardening: RFC 7807, XML Boundaries, and Bounded FinOps | **Accepted** | 2026-10-27 | Implemented strict Zod contracts, RFC 7807 problem details, Helmet CSP, XML prompt delimiters, LRU/TTL FinOps cache, and container health probes. |
| [0002](file:///c:/Users/Admin/OneDrive/Desktop/Source%20Code/SupportGeniusAI/docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md) | Safe Support Foundation: Anonymous Cookie Sessions, Action Guardrails, and Dual Operational Modes | **Accepted** | 2026-11-07 | Implemented unconditional action disablement, server-owned HttpOnly/SameSite=Strict cookie sessions, exact Origin validation, 15s session deadlines, dual demo/support mode isolation, and single-process in-memory store constraints. |
