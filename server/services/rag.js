import { getRelevantChunks } from "../db/vectorStore.js";

export async function retrieveContext(query) {
  const chunks = await getRelevantChunks(query);
  return chunks.join("\n");
}