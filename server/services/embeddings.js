import fetch from "node-fetch";

// Fallback scoring for when Ollama is offline
export function calculateKeywordScore(query, text) {
  const queryWords = query.toLowerCase().split(/\s+/);
  const textWords = text.toLowerCase().split(/\s+/);
  let score = 0;
  queryWords.forEach(word => {
    if (textWords.includes(word)) score += 1;
  });
  return score;
}

export async function getEmbedding(text) {
  try {
    const res = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3", 
        prompt: text
      }),
      headers: { "Content-Type": "application/json" }
    });
    
    if (!res.ok) throw new Error("Ollama embedding failed");
    const data = await res.json();
    return data.embedding;
  } catch (err) {
    console.warn("⚠️ Ollama is not running. Falling back to keyword search for RAG.");
    return null; // Signals to use fallback mechanism
  }
}

export function cosineSimilarity(vecA, vecB) {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
