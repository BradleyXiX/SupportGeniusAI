// In-memory store for session costs. In a real app, this would use Redis or a DB.
const sessionCosts = new Map();

// Assumed cost per 1k tokens (e.g., typical for a local or lightweight model)
const COST_PER_1K_PROMPT_TOKENS = 0.0015;
const COST_PER_1K_COMPLETION_TOKENS = 0.002;

export function trackUsage(sessionId, promptTokens, completionTokens) {
  if (!sessionId) return;
  
  const currentCost = sessionCosts.get(sessionId) || 0;
  
  const promptCost = (promptTokens / 1000) * COST_PER_1K_PROMPT_TOKENS;
  const completionCost = (completionTokens / 1000) * COST_PER_1K_COMPLETION_TOKENS;
  
  sessionCosts.set(sessionId, currentCost + promptCost + completionCost);
}

export function getSessionCost(sessionId) {
  if (!sessionId) return 0;
  return sessionCosts.get(sessionId) || 0;
}
