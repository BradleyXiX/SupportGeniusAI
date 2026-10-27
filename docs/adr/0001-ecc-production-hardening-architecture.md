# ADR 0001: Enterprise Hardening — RFC 7807, XML Boundary Delimiters, Bounded FinOps, and Container Probes

- **Status**: Accepted
- **Deciders**: Platform Architecture, Design Systems, Security Engineering
- **Date**: 2026-10-27
- **Technical Context**: Production readiness audit scored SupportGeniusAI MVP at 48/100 (Blocked) due to missing test suites, unvalidated request payloads, unhandled prompt injection surfaces, unbounded memory leaks in session FinOps tracking, and missing container liveness probes.

---

## 1. Context & Problem Statement

SupportGeniusAI operates as an enterprise customer support intelligence platform. The initial prototype exhibited several critical deficiencies incompatible with production deployment:
1. **API Contracts**: Incoming HTTP bodies (`req.body`) were unvalidated, and runtime exceptions produced unformatted 500 error strings rather than structured, machine-parsable errors.
2. **Defensive Security**: Express ran without security headers (exposing `X-Powered-By`), with wildcard CORS, and with vulnerable dependencies (`qs`, `proxy-addr`).
3. **Agent Architecture**: Prompt construction used raw template string interpolation without boundary delimiters, leaving the agent vulnerable to prompt injection. Session cost tracking utilized unbounded JavaScript `Map()` objects, introducing an O(N) memory leak. Multi-turn interactions were treated statelessly.
4. **Reliability & Probes**: No `/health` endpoint existed for container orchestration (Docker / Render), preventing reliable health monitoring and zero-downtime rollouts.

---

## 2. Decision Drivers

- **Security & Integrity**: Zero secret leakage, OWASP Top 10 mitigation, strict CSP, and prompt injection defense.
- **Contract Standardization**: RFC 7807 Problem Details (`application/problem+json`) with Zod-inferred fail-closed schemas.
- **Resource Discipline**: Deterministic memory consumption via bounded LRU/TTL caches.
- **Zero-AI-Slop Experience**: Fast, responsive UI with real-time health beacon feedback and structured error guidance.
- **Verification Gates**: 100% automated test verification via Vitest before shipping to production.

---

## 3. Architecture Overview

```mermaid
flowchart TD
    subgraph Client ["Client Layer"]
        UI["Chat Interface (Vanilla JS)"] -->|POST /chat| GW["Security Gateway"]
        UI -->|GET /health (Poll: 60s)| HP["Health Probe Endpoint"]
    end

    subgraph Security ["Security & Validation Gateway"]
        GW["Helmet CSP + CORS Allowlist"] --> RL["Rate Limiter (10 req/min)"]
        RL --> ZOD["Zod Request Validator (ChatPayloadSchema)"]
    end

    subgraph Core ["SupportGenius Service Layer"]
        ZOD --> AGENT["Agent Service (Sliding Window: 6 Turns)"]
        AGENT --> XML["Prompt Builder (XML Delimiters)"]
        AGENT --> RAG["Vector Retrieval (.txt & .md)"]
        AGENT --> TOOLS["Tool Execution (OrderStatus)"]
        AGENT --> LLM["LLM Gateway (OpenAI / Gemini / Ollama)"]
        LLM --> FINOPS["FinOps Telemetry (LRU / 2-Hr TTL)"]
    end

    subgraph Errors ["RFC 7807 Error Pipeline"]
        ZOD -.->|422 Validation Error| RFC["RFC 7807 Problem Details"]
        LLM -.->|502 Bad Gateway| RFC
        AGENT -.->|500 Internal Error| RFC
    end
```

---

## 4. Key Architectural Decisions & Trade-Offs

### A. Error Formatting: RFC 7807 vs Custom JSON Errors
- **Decision**: Adopt RFC 7807 Problem Details (`application/problem+json`).
- **Rationale**: Provides an established, standard error contract across microservices and external clients with standardized fields (`type`, `title`, `status`, `detail`, `instance`, `invalidParams`).
- **Trade-off**: Requires client-side error handlers to inspect `problem.detail` and `problem.invalidParams` rather than generic `err.message`.

### B. Prompt Isolation: XML Delimiters vs System Role Messages
- **Decision**: Wrap context and user input inside fenced XML tags (`<system_instructions>`, `<knowledge_context>`, `<customer_query>`) and sanitize closing tags from user queries.
- **Rationale**: LLMs trained on RLHF follow XML structural boundaries with high fidelity, preventing adversarial instructions in `customer_query` from overwriting system rules.

### C. FinOps Storage: In-Memory Bounded LRU/TTL vs External Redis
- **Decision**: Implement an in-memory LRU/TTL bounded cache (max 5,000 sessions, 2-hour TTL eviction) within `server/services/finops.js`.
- **Rationale**: Eliminates the unbounded memory leak without adding external operational dependencies for single-instance or serverless deployments. For multi-node horizontal scale, an external Redis adapter can drop in using the same interface.

### D. Container Liveness: `/health` Diagnostic Probe
- **Decision**: Expose `GET /health` returning JSON diagnostics (uptime, loaded vector chunks, memory usage) wired directly to `Dockerfile`, `docker-compose.yml`, and `render.yaml`.
- **Rationale**: Allows Kubernetes, Docker Compose, and cloud platforms like Render to verify service health before routing traffic, ensuring automatic self-healing.

---

## 5. Trade-off Evaluation Matrix

| Decision Area | Chosen Approach | Alternative Considered | Advantages of Chosen Approach | Disadvantages / Mitigations |
| :--- | :--- | :--- | :--- | :--- |
| **API Errors** | RFC 7807 Problem Details | Ad-hoc `{ error: "msg" }` | Machine-parsable, RFC standardized, granular field validation errors | Requires custom middleware and frontend adapter |
| **Input Validation** | Zod Schema Middleware | Manual `typeof` / regex | Type-safe, declarative, comprehensive edge-case handling | Slight CPU overhead on large request bodies (mitigated by 2000-char cap) |
| **Prompt Delimiters** | XML Fencing (`<customer_query>`) | Raw template strings | Robust against indirect prompt injection | Minimal prompt token overhead (+15 tokens) |
| **Session Tracking** | In-memory LRU with TTL | Unbounded `Map()` / Redis | Zero memory leak, zero external infrastructure | Sessions do not persist across node restarts (sufficient for MVP) |
| **Dependency CVEs** | Package overrides (`qs: ^6.16.1`) | Waiting for upstream Express 5 | Zero CVEs in production immediately | Monitored in `package.json` overrides until Express 5 release |

---

## 6. Consequences & Verification

- **Security State**: 0 npm vulnerabilities (`npm audit`), Helmet CSP active, origin-whitelisted CORS enabled.
- **Reliability State**: 22 automated tests passing via Vitest with 100% contract verification.
- **Observability State**: Continuous `/health` monitoring on client UI, Docker engine, and Render platform.
- **Rollback Strategy**: Git branch `feature/ecc-production-hardening` isolates all changes from `main` pending final pull request merge.
