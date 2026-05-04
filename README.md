# SupportGeniusAI

## Project Structure            
```
support-genius/
│
├── server/
│   ├── index.js              # Entry point (Express server)
│   ├── routes/
│   │   └── chat.js           # Chat endpoint
│   │
│   ├── services/
│   │   ├── llm.js            # AI interaction (Ollama/OpenAI/GoogleGemini)
│   │   ├── rag.js            # Retrieval logic (vector search)
│   │   ├── embeddings.js     # Convert text → vectors
│   │   └── agent.js          # Handles "actions" (function calling)
│   │
│   ├── db/
│   │   └── vectorStore.js    # ChromaDB or local vector store
│   │
│   ├── utils/
│   │   ├── chunkText.js      # Split documents into chunks
│   │   └── promptBuilder.js  # Build structured prompts
│   │
│   └── data/
│       └── docs/             # Your PDFs / text files
│
├── client/
│   ├── index.html
│   ├── app.js
│   └── styles.css
│
├── package.json
└── README.md