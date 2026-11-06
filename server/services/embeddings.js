import { fetchJsonBounded, UpstreamError } from "../utils/upstream.js";

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

export async function getEmbedding(text, { signal } = {}) {
  // Demo mode: zero external network calls; keyword fallback is used deterministically
  if (process.env.APP_MODE === "demo") {
    return null;
  }

  if (signal?.aborted) {
    throw new UpstreamError({
      kind: "timeout",
      message: "Embedding request aborted prior to dispatch",
      providerLabel: "embedding"
    });
  }

  // 1. Try OpenAI Embeddings if key configured (5s timeout budget)
  if (process.env.OPENAI_API_KEY) {
    try {
      const data = await fetchJsonBounded(
        "https://api.openai.com/v1/embeddings",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: "text-embedding-3-small",
            input: text
          })
        },
        {
          timeoutMs: 5000,
          signal,
          providerLabel: "openai-embeddings",
          validateShape: (d) => Array.isArray(d.data?.[0]?.embedding)
        }
      );

      if (data?.data?.[0]?.embedding) {
        return data.data[0].embedding;
      }
    } catch (err) {
      if (err.kind === "timeout" || signal?.aborted) {
        throw err;
      }
      console.warn("OpenAI embedding API unavailable, falling back to Ollama / keywords");
    }
  }

  // 2. Try Ollama Embeddings (5s timeout budget)
  const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
  try {
    const data = await fetchJsonBounded(
      `${ollamaUrl}/api/embeddings`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: process.env.OLLAMA_EMBED_MODEL || "nomic-embed-text:latest",
          prompt: text
        })
      },
      {
        timeoutMs: 5000,
        signal,
        providerLabel: "ollama-embeddings",
        validateShape: (d) => Array.isArray(d.embedding)
      }
    );

    if (data?.embedding) {
      return data.embedding;
    }
  } catch (err) {
    if (err.kind === "timeout" || signal?.aborted) {
      throw err;
    }
    // Expected when Ollama is not running in local/test environment
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
