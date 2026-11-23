# SupportGenius AI Documentation Index

One canonical document per topic. Maintained guides reflect the current `main` codebase; historical packets are retained for engineering traceability and do not override current behavior or authorize new work.

## Product and evaluation

- [Product overview & local evaluation](../README.md) — capabilities, scope boundaries, quick start, and contact details
- [Contribution policy](../CONTRIBUTING.md) — issue reporting and authorized contributor workflow
- [Proprietary license](../LICENSE) and third-party notices ([client/vendor/LICENSES.md](../client/vendor/LICENSES.md), [client/assets/brand/NOTICE.md](../client/assets/brand/NOTICE.md))

## Operations and release runbooks

- [Deployment & operations guide](deployment.md) — canonical environment schema, provider/retrieval behavior, data flow, proxy topology, and operating limits
- [Staging smoke verification plan](release/staging-plan.md) — Phase 1 (demo) and Phase 2 (support) staging checklists
- [Production & staging rollback guide](release/rollback-plan.md) — pre-release revision recording, rollback steps, and recovery checks

## Architecture and visual design authority

- [Architecture Decision Records (ADRs)](adr/README.md) — immutable engineering decisions with dated correction/status notes
- [Design authority (v2 base)](../design.md) — layout, content policy, and accessibility rules
- [Crimson Signal v3 enhancement authority](design-v3/design-enhancements.md) — active override for palette, legibility, motion defaults, closing contact, and console styling

## Historical execution records

The documents below are preserved as dated engineering history. Findings, test counts, and branch names inside them reflect past milestones rather than current defects or live deployment status.

- [Completion assessment (2026-11-06)](product/2026-11-06-completion-assessment.md) — pre-hardening product gap audit
- [Safe Support Foundation PR summary](release/safe-foundation-pr.md) — historical PR description for `feature/safe-support-foundation`
- [Historical specs and plans](superpowers/) — Signal Desk, Safe Support Foundation, and Gemini recovery plans
- [Design v1 prompts & receipts](design-prompts/README.md) — initial Signal Desk redesign records
- [Backend prompts & receipts](backend-prompts/README.md) — Safe Support Foundation execution records
- [Provider recovery plan & receipts](provider-prompts/01-implementation-plan.md) — explicit Gemini & keyword retrieval records
- [Design v2 reference kit](design-v2/START-HERE.md) — Signal Architecture reference, verification log, and prompts/receipts
- [Design v3 handoff & verification](design-v3/START-HERE.md) — Crimson Signal prompts, receipts ([final verification receipt](design-v3/receipts/11-receipt.md)), and lab performance artifacts ([verification-summary.json](design-v3/performance/verification-summary.json))
