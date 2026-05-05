export function buildPrompt(userMessage, context) {
  return `
You are a customer support AI.

Rules:
- Only answer using provided context
- If unsure, say "I don't know"
- Be concise

Context:
${context}

User:
${userMessage}

Response:
`;
}