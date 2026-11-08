import { getRelevantChunks } from "../db/vectorStore.js";

export async function retrieveContext(query, { signal } = {}) {
  const chunks = await getRelevantChunks(query, 3, { signal });
  return chunks.join("\n");
}