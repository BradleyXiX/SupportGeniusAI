# SupportGenius AI — Client Evaluation & Implementation Brief

Prepared by **Bradley Chiwo** · Independent developer & implementer

*Informational overview of a tailored single-business implementation. Not a binding service contract or product warranty.*

## 1. Who this fits

SupportGenius AI fits small and mid-sized businesses with approved, reasonably stable policies and repeated informational questions.

Typical hypothetical use cases:
- **Returns and shipping policies** — answering common delivery-window, packaging, and eligibility questions from approved store documents.
- **Service FAQs** — explaining service scope, preparation steps, and booking rules before a customer contacts staff.
- **Opening hours and general enquiries** — providing consistent hours, location details, and support contact routes.

It is **not** designed today for transactional order lookups, live appointment booking, account-specific data access, or regulated legal, medical, or financial advice.

## 2. What is available today

The current codebase provides:
- **Document-based Q&A in Signal Desk**: a standalone web conversation page (`/console/`) grounded in configured `.txt` and `.md` business documents.
- **Configurable model setup**: supports OpenAI, Google Gemini, or local Ollama depending on the chosen deployment.
- **Deterministic demo mode**: local fixture replies for a safe walkthrough without calling live model providers.
- **Bounded anonymous sessions**: short in-memory conversation history (no customer login), origin checks, request timeouts, and estimated usage readouts.

Turning this foundation into a live client deployment requires scoping, configuration, and validation. Signal Desk is a standalone web chat route today—it is **not** a shipped embeddable website widget or an omnichannel helpdesk.

## 3. What an implementation may include (subject to agreement)

Implementation services are proposed components scoped in a written agreement, not automatic entitlements:
- Preparing and structuring approved client `.txt`/`.md` knowledge files.
- Configuring the selected model provider, retrieval mode, and environment settings.
- Applying branding adjustments within agreed scope.
- Setting up a supported single-instance deployment behind HTTPS.
- Running a structured sample-question evaluation before go-live.
- Delivering operator handoff documentation (and separately scoped maintenance, if agreed).

**Future features requiring separate development** (not included in the current release): live customer actions or webhooks, CRM/helpdesk/calendar integrations, browser document-upload dashboards, embeddable site widgets, source-citation delivery, durable transcript storage, customer accounts, or multi-tenant hosting.

## 4. What the client supplies

To scope and evaluate an implementation, the client provides:
- Approved plain-text or Markdown business documentation.
- A designated business owner/contact for review and sign-off.
- Target audience context and common customer question themes.
- Preferred hosting, model provider, and data-routing choices.
- A real human support destination (such as a support email or phone line) for questions the assistant cannot answer.
- Rules on sensitive information and acceptance expectations.

Sensitive or confidential source material must be shared through an agreed private transfer channel—never through a public Git issue, public repository, or unsolicited email attachment.

## 5. How we evaluate before rollout

Before launch, we agree on a small, representative evaluation set covering:
- Factual questions answered directly in approved documents.
- Questions absent from the knowledge base.
- Ambiguous or poorly phrased questions.
- Unsupported action requests (such as address changes or bookings).
- Provider timeout/error recovery and a mobile browser conversation.

The client reviews replies against approved documents and records corrections. Because language models can still err or answer inconsistently when evidence is missing, uncertain or out-of-scope questions need an agreed operational handling path rather than an assumption of perfect refusal. Any numerical acceptance targets are agreed per client. Local demo fixtures illustrate interface behavior only and do not establish live-provider answer quality.

## 6. Responsibilities and costs

Before deployment, the parties agree who owns hosting, domain/TLS, model-provider accounts, credentials, knowledge updates, incident contact, and handoff. Hosting and model-provider usage are separate ongoing costs to agree; session cost figures shown in the interface are local estimates, not provider invoices. Ongoing support, updates, and response times apply only if explicitly agreed in writing.

## 7. Commercial and data boundaries

- **Licensing**: SupportGenius AI's core software is proprietary ([LICENSE](../LICENSE)). Client usage/deployment rights and ownership of custom deliverables are defined in a separate written agreement. Client-supplied content remains subject to the client's rights and agreed handling.
- **Data processing**: In live support mode, document excerpts, customer questions, and short session history are sent to the configured model provider (and embedding provider in vector mode). Provider and hosting subprocessor terms must be reviewed before use; no GDPR, HIPAA, or SOC 2 certification or zero-third-party-processing claim is made.
- **Operational boundaries**: Human escalation is an agreed operational route, not a shipped helpdesk integration. Insight Scraper is Bradley's separate prospecting workflow and is not a SupportGenius AI feature or integration.

## 8. Next step

To discuss a tailored implementation or walkthrough, email **Bradley Chiwo** at [BradJohn70@gmail.com](mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry) with your business type, common question themes, and desired outcome.

Additional background: [LinkedIn](https://www.linkedin.com/in/bradley-john-chiwo/) · [Portfolio](https://bradleychiwo.netlify.app/)
