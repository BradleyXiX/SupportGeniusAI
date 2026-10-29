import fs from "fs";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { chunkText } from "../utils/chunkText.js";
import { getEmbedding, cosineSimilarity, calculateKeywordScore } from "../services/embeddings.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = path.join(__dirname, "../data/docs");
export const CACHE_FILE = path.join(__dirname, "../data/vector_cache.json");

let vectorStore = [];

export function computeChunkHash(chunk = "") {
  return crypto.createHash("sha256").update(chunk).digest("hex");
}

export function loadVectorCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const data = fs.readFileSync(CACHE_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn("Failed to load vector cache from disk:", err.message);
  }
  return {};
}

export function saveVectorCache(cache = {}) {
  try {
    const dir = path.dirname(CACHE_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.warn("Failed to write vector cache to disk:", err.message);
  }
}

export async function initializeStore() {
  console.log("Initializing knowledge base...");
  try {
    if (!fs.existsSync(DOCS_DIR)) {
      console.warn(`Knowledge base directory not found at ${DOCS_DIR}`);
      return;
    }

    const cache = loadVectorCache();
    let cacheUpdated = false;

    const files = fs.readdirSync(DOCS_DIR);
    for (const file of files) {
      if (file.endsWith(".txt") || file.endsWith(".md")) {
        const text = fs.readFileSync(path.join(DOCS_DIR, file), "utf-8");
        const chunks = chunkText(text, 40, 10); // Chunk to 40 words with 10 word overlap
        
        for (const chunk of chunks) {
          const chunkHash = computeChunkHash(chunk);
          let embedding = cache[chunkHash];

          if (embedding === undefined) {
            embedding = await getEmbedding(chunk);
            if (embedding !== null && embedding !== undefined) {
              cache[chunkHash] = embedding;
              cacheUpdated = true;
            }
          }

          vectorStore.push({
            text: chunk,
            embedding: embedding ?? null
          });
        }
      }
    }

    if (cacheUpdated) {
      saveVectorCache(cache);
    }

    console.log(`Loaded ${vectorStore.length} chunks into memory.`);
  } catch (err) {
    console.error("Error loading documents:", err);
  }
}

export function getVectorStoreStats() {
  return {
    chunksCount: vectorStore.length,
    isInitialized: vectorStore.length > 0
  };
}

export function clearStore() {
  vectorStore = [];
}

export async function getRelevantChunks(query, topK = 3) {
  if (vectorStore.length === 0) return [];
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