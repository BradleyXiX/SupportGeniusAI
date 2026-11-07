# 🧠 SupportGeniusAI

> An intelligent, context-aware customer support assistant MVP powered by RAG and Agentic workflows.

SupportGeniusAI is a full-stack Retrieval-Augmented Generation (RAG) application designed to handle customer support inquiries autonomously. By integrating with local LLMs (via Ollama) and utilizing vector search, it provides accurate, context-rich responses based on your specific documentation, while also being capable of executing agentic actions.

## ✨ Key Features

- **Retrieval-Augmented Generation (RAG):** Grounds AI responses in your custom documents and knowledge base to prevent hallucinations and provide accurate support.
- **Local LLM Integration:** Built to communicate with local models via **Ollama** (e.g., Llama 3, Mistral) for privacy and zero API costs, with easy extensibility to OpenAI or Google Gemini.
- **Agentic Actions:** Capable of handling function calls and specific agentic actions based on user intent.
- **Vector Search:** Processes, chunks, and embeds text documents for semantic retrieval using a local vector store.
- **Interactive UI:** A clean, responsive client-side chat interface built with vanilla HTML/CSS/JS.

## 🏗️ Architecture & Tech Stack

- **Frontend:** Vanilla JavaScript (ES Modules), HTML5, CSS3 (Signal Desk design system)
- **Routes:** `/` (Editorial introduction), `/console/` (Interactive support console)
- **Backend:** Node.js, Express.js
- **AI/LLM:** Ollama (Local LLMs)
- **Database/Vector Store:** Local Vector Store / ChromaDB integration

## 📂 Project Structure

```text
support-genius/
│
├── server/
│   ├── index.js              # Entry point (Express server)
│   ├── routes/
│   │   └── chat.js           # Chat API endpoint
│   │
│   ├── services/
│   │   ├── llm.js            # AI interaction (Ollama/OpenAI/GoogleGemini)
│   │   ├── rag.js            # Retrieval logic (vector search)
│   │   ├── embeddings.js     # Text-to-vector embedding generation
│   │   └── agent.js          # Handles agentic actions and function calling
│   │
│   ├── db/
│   │   └── vectorStore.js    # Vector database integration
│   │
│   ├── utils/
│   │   ├── chunkText.js      # Document parsing and chunking utility
│   │   └── promptBuilder.js  # Context-aware prompt construction
│   │
│   └── data/
│       └── docs/             # Knowledge base (PDFs, text files)
│
├── client/
│   ├── index.html            # Marketing editorial introduction (/)
│   ├── landing.js            # Marketing landing controller
│   ├── console/
│   │   └── index.html        # Signal Desk support console (/console/)
│   ├── app.js                # Console controller (ES Module)
│   ├── chat-state.js         # Pure request/session state machine
│   ├── orb.js                # Restrained Signal Orb (Canvas2D)
│   ├── styles.css            # Signal Desk design system styling
│   └── vendor/               # Locally vendored Marked & DOMPurify
│
├── tests/
│   └── browser/              # Playwright browser integration suite
│
├── package.json              # Dependencies and scripts
└── README.md                 # Project documentation
```

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v16 or higher recommended)
- **Ollama** (Installed and running locally for LLM support)
  - Ensure you have pulled a model, e.g., `ollama run llama3`

### Installation

1. **Clone the repository** (if applicable) or navigate to the project directory:
   ```bash
   cd SupportGeniusAI
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your SESSION_SECRET (min 32 chars), PUBLIC_ORIGIN, and optional LLM keys
   ```

4. **Add your knowledge base:**
   Place your support documents (`.txt` or `.md`) into the `server/data/docs/` directory. The RAG system will index and chunk these files at boot, reusing cached embeddings from `server/data/vector_cache.json`.

### Running the Application

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

**Run Automated Quality Suite (Vitest):**
```bash
npm test
```

**Run End-to-End Browser & Accessibility Suite (Playwright):**
```bash
npm run test:browser
```

### Health, Operations & Architecture
- **Operational Deployment Guide**: See [docs/deployment.md](docs/deployment.md) for full configuration, Render setup, reverse proxy topology, and single-process in-memory store limits.
- **Architecture Decision Records**:
  - [ADR 0001: Enterprise Hardening](docs/adr/0001-ecc-production-hardening-architecture.md) (RFC 7807, XML Prompt Boundaries, FinOps)
  - [ADR 0002: Safe Support Foundation](docs/adr/0002-safe-support-foundation-and-anonymous-sessions.md) (Anonymous Cookie Sessions, Action Guardrails, Dual Operational Modes)
- **Health Check Probe**: `GET /health` provides a container liveness/status endpoint returning process uptime and vector store in-memory status (staging smoke check in [docs/deployment.md](docs/deployment.md) verifies end-to-end knowledge and provider availability).

## 🛣️ Roadmap / Future Enhancements

- [ ] Support for multiple document types (PDF, Markdown, DOCX)
- [ ] Integration with cloud vector databases (Pinecone, Weaviate)
- [ ] Advanced agentic workflows (e.g., triggering email sequences, booking meetings)
- [ ] Authentication and user session management
- [ ] Analytics dashboard for tracking support queries

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on how to get started, open issues, and submit pull requests.

## 📜 License

This project is licensed under the MIT License.