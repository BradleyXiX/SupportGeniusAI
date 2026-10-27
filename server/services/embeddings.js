import fetch from "node-fetch";

// Fallback scoring for when vector embeddings are unavailable
export function calculateKeywordScore(query = "", text = "") {
  const clean = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  const queryWords = clean(query).split(/\s+/).filter(Boolean);
  const textWords = clean(text).split(/\s+/).filter(Boolean);

  let score = 0;
  for (const qWord of queryWords) {
    const matched = textWords.some(
      (tWord) =>
        tWord === qWord ||
        (qWord.length > 3 && tWord.startsWith(qWord)) ||
        (tWord.length > 3 && qWord.startsWith(tWord))
    );
    if (matched) score += 1;
  }
  return score;
}

export async function getEmbedding(text) {
  // 1. Try OpenAI Embeddings if key configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const res = await fetch("https://api.openai.com/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "text-embedding-3-small",
          input: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.data && data.data[0] && data.data[0].embedding) {
          return data.data[0].embedding;
        }
      }
    } catch (e) {
      console.warn("OpenAI embedding API failed, falling back to Ollama / keywords:", e.message);
    }
  }

  // 2. Try Ollama Embeddings
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  try {
    const res = await fetch(`${ollamaUrl}/api/embeddings`, {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        prompt: text
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (res.ok) {
      const data = await res.json();
      if (data.embedding) return data.embedding;
    }
  } catch (err) {
    // Expected when Ollama is not running in local or CI environment
  }

  // 3. Signal caller to use keyword fallback
  return null;
}

export function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length === 0 || vecB.length === 0) {
    return 0;
  }
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(vecA.length, vecB.length);
  for (let i = 0; i < len; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}
