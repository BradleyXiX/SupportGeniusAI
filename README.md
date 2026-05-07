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

- **Frontend:** Vanilla JavaScript, HTML5, CSS3
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
│   ├── index.html            # Chat interface
│   ├── app.js                # Client-side logic
│   └── styles.css            # UI Styling
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

3. **Add your knowledge base:**
   Place your support documents, text files, or PDFs into the `server/data/docs/` directory. The RAG system will process these files to inform its answers.

### Running the Application

**Development Mode (with auto-reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

Once the server is running, open your browser and navigate to the client interface (usually `http://localhost:3000` or as configured in `server/index.js`) to start chatting with the SupportGeniusAI!

## 🛣️ Roadmap / Future Enhancements

- [ ] Support for multiple document types (PDF, Markdown, DOCX)
- [ ] Integration with cloud vector databases (Pinecone, Weaviate)
- [ ] Advanced agentic workflows (e.g., triggering email sequences, booking meetings)
- [ ] Authentication and user session management
- [ ] Analytics dashboard for tracking support queries

## 📜 License

This project is licensed under the MIT License.