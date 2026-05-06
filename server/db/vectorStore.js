import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chunkText } from "../utils/chunkText.js";
import { getEmbedding, cosineSimilarity, calculateKeywordScore } from "../services/embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "../data/docs");

let vectorStore = [];

export async function initializeStore() {
  console.log("Initializing knowledge base...");
  try {
    const files = fs.readdirSync(DOCS_DIR);
    for (const file of files) {
      if (file.endsWith(".txt")) {
        const text = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
        const chunks = chunkText(text, 40, 10); // Chunk to 40 words with 10 word overlap
        
        for (const chunk of chunks) {
          const embedding = await getEmbedding(chunk);
          vectorStore.push({
            text: chunk,
            embedding: embedding
          });
        }
      }
    }
    console.log(`Loaded ${vectorStore.length} chunks into memory.`);
  } catch (err) {
    console.error("Error loading documents:", err);
  }
}

export async function getRelevantChunks(query, topK = 3) {
  const queryEmbedding = await getEmbedding(query);
  
  // If Ollama failed, use keyword scoring fallback
  if (!queryEmbedding) {
     const scored = vectorStore.map(doc => ({
       text: doc.text,
       score: calculateKeywordScore(query, doc.text)
     }));
     scored.sort((a, b) => b.score - a.score);
     return scored.slice(0, topK).map(d => d.text);
  }

  // Normal semantic vector search using cosine similarity
  const scored = vectorStore.map(doc => {
    if (!doc.embedding) return { text: doc.text, score: 0 }; 
    return {
      text: doc.text,
      score: cosineSimilarity(queryEmbedding, doc.embedding)
    };
  });
  
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map(d => d.text);
}