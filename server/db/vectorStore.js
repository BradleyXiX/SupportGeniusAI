const documents = [
  "Orders are delivered within 24 hours in Nairobi.",
  "Refunds are processed within 3 business days.",
  "NovaCart ships using local couriers."
];

export async function getRelevantChunks(query) {
  // basic keyword match (replace later with embeddings)
  return documents.filter(doc =>
    doc.toLowerCase().includes(query.toLowerCase())
  );
}