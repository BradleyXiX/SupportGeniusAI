// In-memory store for session costs. In a real app, this would use Redis or a DB.
const sessionCosts = new Map();
const sessionModels = new Map();

const PRICING = {
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  "llama3": { prompt: 0.0015, completion: 0.002 }, // arbitrary local compute cost
  "simulated": { prompt: 0, completion: 0 }
};

export function setModel(sessionId, model) {
  if (!sessionId) return;
  sessionModels.set(sessionId, model);
}

export function trackUsage(sessionId, promptTokens, completionTokens) {
  if (!sessionId) return;
  
  const currentCost = sessionCosts.get(sessionId) || 0;
  const model = sessionModels.get(sessionId) || "llama3";
  const rates = PRICING[model] || PRICING["llama3"];
  
  const promptCost = (promptTokens / 1000) * rates.prompt;
  const completionCost = (completionTokens / 1000) * rates.completion;
  
  sessionCosts.set(sessionId, currentCost + promptCost + completionCost);
}

export function getSessionCost(sessionId) {
  if (!sessionId) return 0;
  return sessionCosts.get(sessionId) || 0;
}
