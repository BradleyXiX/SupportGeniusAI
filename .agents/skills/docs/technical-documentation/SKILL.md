---
name: technical-documentation
description: Staff-level technical writing standards enforcing the Diátaxis documentation framework, Architecture Decision Records (ADRs) with Mermaid.js diagrams, trade-off matrices, and active voice precision.
---

# Technical Documentation & Architectural Decision Standards

The `technical-documentation` skill governs the creation, organization, and maintenance of all documentation within SupportGeniusAI. Clear documentation is an engineering deliverable equal in importance to production code. We treat ambiguity, conversational fluff, and architectural opacity as critical technical debt.

---

## 1. The Diátaxis Documentation Framework

All technical documentation must align with one of the four distinct quadrants of the **Diátaxis framework**, based on the reader's intent and knowledge domain:

```
               PRACTICAL CRAFT
                      ▲
                      │
        Tutorials     │    How-To Guides
   (Learning-oriented)│ (Problem-oriented)
                      │
◀─────────────────────┼─────────────────────▶
  ACQUISITION         │         APPLICATION
                      │
       Explanation    │      Reference
 (Understanding-orient)│ (Information-orient)
                      │
                      ▼
              THEORETICAL ANALYSIS
```

1. **Tutorials (Learning-Oriented)**:
   - Guide newcomers through a hands-on learning experience from scratch.
   - Example: *"Building Your First Automated Support Routing Agent."*
   - Focus: Delivering immediate success with minimal friction.
2. **How-To Guides (Problem-Oriented)**:
   - Provide concrete, step-by-step recipes to solve specific operational tasks.
   - Example: *"How to Rotate Production API Keys Without Downtime."*
   - Focus: Goal completion for experienced engineers.
3. **Reference (Information-Oriented)**:
   - Deliver authoritative, dry, precise descriptions of schemas, APIs, interfaces, and configuration flags.
   - Example: *"Ticket Schema Reference and Zod Validation Specification."*
   - Focus: Instant technical accuracy, neutrality, and completeness.
4. **Explanation (Understanding-Oriented)**:
   - Clarify architectural decisions, system philosophy, design trade-offs, and historical context.
   - Example: *"Why SupportGeniusAI Separated Classifier Inference From Real-Time Webhooks."*
   - Focus: Deep cognitive understanding and architectural justification.

---

## 2. Architecture Decision Records (ADRs)

Every major architectural shift, technology selection, or protocol deprecation must be documented in an ADR located in `docs/adr/` following the Markdown Architecture Decision Record (MADR) format.

### Standard ADR Template with Mermaid.js Diagram

```markdown
# ADR-0004: Adoption of Redis Streams for Asynchronous Ticket Classification

## Status
Accepted (2026-10-15)

## Context & Problem Statement
Direct synchronous calls to external Large Language Models (LLMs) during incoming customer webhooks resulted in unacceptable response latencies (>4,000ms p95) and webhook timeouts from external providers. We require a distributed, non-blocking ingestion queue capable of handling sudden traffic spikes while guaranteeing at-least-once message delivery.

## Decision Drivers
* Webhook ingestion latency must remain under 100ms.
* Zero data loss during external AI provider outages.
* Horizontal scalability of background worker instances.
* Operational simplicity and minimal infrastructural overhead.

## Architecture Topology

\`\`\`mermaid
flowchart LR
    A["Incoming Webhook (Customer)"] -->|POST /webhooks/tickets| B["Ingestion API (Express)"]
    B -->|XADD ticket_stream| C[("Redis Stream")]
    B -.->|202 Accepted| A
    C -->|XREADGROUP workers| D["AI Classification Workers"]
    D -->|Inference Call| E["OpenAI / Anthropic API"]
    D -->|UPDATE status| F[("PostgreSQL DB")]
\`\`\`

## Considered Options
1. **Option 1**: Redis Streams
2. **Option 2**: RabbitMQ
3. **Option 3**: In-Memory EventEmitter (Node.js)

## Trade-off Analysis & Evaluation Matrix

| Criterion (Weight 1–5) | Redis Streams | RabbitMQ | In-Memory EventEmitter |
| :--- | :--- | :--- | :--- |
| **Ingestion Latency (5)** | 5 (Sub-millisecond) | 4 (Fast) | 5 (Instant) |
| **Fault Tolerance & Persistence (5)** | 5 (AOF / RDB persistence) | 5 (Durable queues) | 1 (Lost on crash) |
| **Operational Simplicity (4)** | 5 (Already in stack) | 2 (New broker infra) | 5 (Zero external dependencies)|
| **Horizontal Consumer Groups (4)**| 4 (Consumer groups built-in) | 5 (Advanced AMQP) | 1 (Single process only) |
| **Weighted Score** | **84 / 90** | **71 / 90** | **44 / 90** |

## Decision Outcome
Chosen Option: **Option 1: Redis Streams**. It fulfills our durability and latency constraints without introducing new operational complexity, utilizing existing cache infrastructure.

## Consequences
* **Positive**: Ingestion API p95 drops to 35ms. Webhook timeouts eliminated.
* **Negative**: Requires implementing a dead-letter queue (DLQ) pattern and stream consumer heartbeats to detect poisoned messages.
```

---

## 3. Writing Style & Tone Guidelines

Technical writing in SupportGeniusAI must adhere to strict professional standards:

### Mandated Guidelines
1. **Active Voice**:
   - ❌ *Passive*: "The session is invalidated by the authentication middleware when the token expires."
   - ✔ *Active*: "The authentication middleware invalidates the session when the token expires."
2. **Elimination of Conversational Fluff & Presumptuous Adverbs**:
   - Strictly purge words like **"obviously"**, **"simply"**, **"just"**, **"basically"**, **"clearly"**, or **"easy"**. These diminish clarity and alienate engineers encountering difficulties.
   - ❌ *Fluffy*: "Simply plug in your API key and it obviously just works."
   - ✔ *Precise*: "Set `OPENAI_API_KEY` in `.env`. The client initializes the connection during server boot."
3. **Imperative, Action-Oriented Steps**:
   - Begin task instructions with strong verbs: *Clone*, *Export*, *Verify*, *Configure*, *Run*.

---

## 4. Documentation Checklist

- [ ] New documents are classified under one Diátaxis quadrant (Tutorial, How-To, Reference, or Explanation).
- [ ] Architectural decisions include an ADR with context, drivers, options, a Mermaid diagram, and an evaluation matrix.
- [ ] Prose is written in active voice with zero conversational filler ("simply", "obviously", "just").
- [ ] Code samples in documentation are complete, validated, and syntactically correct.
- [ ] File paths and API routes match the active codebase.
