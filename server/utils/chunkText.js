/**
 * Splits text into overlapping chunks for vector embedding.
 * @param {string} text - The full document text.
 * @param {number} maxWords - Maximum words per chunk.
 * @param {number} overlap - Number of overlapping words between chunks.
 * @returns {string[]} Array of text chunks.
 */
export function chunkText(text, maxWords = 50, overlap = 10) {
  const words = text.split(/\s+/);
  const chunks = [];
  
  if (words.length === 0) return chunks;

  for (let i = 0; i < words.length; i += (maxWords - overlap)) {
    const chunk = words.slice(i, i + maxWords).join(" ");
    chunks.push(chunk);
  }

  return chunks;
}
