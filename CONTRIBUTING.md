# Contributing to SupportGenius AI

SupportGenius AI is proprietary software ([LICENSE](LICENSE)). This repository is maintained for the owner's product development and separately contracted client implementations; it is not an open-source community project, and submitting an issue or pull request does not guarantee acceptance or grant distribution rights.

## Reporting issues and enquiries

- **Bug reports or repository issues**: [https://github.com/BradleyXiX/SupportGeniusAI/issues](https://github.com/BradleyXiX/SupportGeniusAI/issues)
- **Commercial implementation or licensing enquiries**: [BradJohn70@gmail.com](mailto:BradJohn70@gmail.com?subject=SupportGenius%20AI%20implementation%20enquiry)

## Local development setup (authorized contributors)

**Requirements**: Node.js **22.12+ within Node 22**, or a compatible Node 24/26 release, with npm.

1. Install exact lockfile dependencies:
   ```bash
   npm ci
   ```
2. Copy `.env.example` to `.env`, generate a 32+ character `SESSION_SECRET`, and set `APP_MODE=demo`, `RETRIEVAL_MODE=keyword`, and `PUBLIC_ORIGIN=http://localhost:3000`. Never commit `.env` or real API keys.
3. Run the automated verification suites:
   ```bash
   npm test
   npm run test:browser
   ```

## Change expectations

- Keep pull requests narrowly scoped and branch from current `main`.
- Preserve the Express + vanilla ES module architecture, existing API contracts (`/health`, `/capabilities`, `/session`, `/chat`), CSP headers, and fail-closed action guardrails.
- Add or update Vitest (`server/tests/`) or Playwright (`tests/browser/`) regression tests when changing runtime behavior.
- Review [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md) before modifying architecture or documentation.
