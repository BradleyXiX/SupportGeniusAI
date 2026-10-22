/**
 * FinOps Telemetry Service
 * Tracks token usage and inference cost with bounded LRU/TTL in-memory cache
 */

const MAX_SESSIONS = 5000;
const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours

const sessions = new Map();

export const PRICING = {
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  "llama3": { prompt: 0.0015, completion: 0.002 },
  "simulated": { prompt: 0, completion: 0 }
};

function evictExpiredSessions() {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastAccessed > SESSION_TTL_MS) {
      sessions.delete(id);
    }
  }
}

function enforceCapacity() {
  if (sessions.size >= MAX_SESSIONS) {
    evictExpiredSessions();
    // If still over capacity, evict oldest entry (LRU)
    if (sessions.size >= MAX_SESSIONS) {
      const oldestKey = sessions.keys().next().value;
      if (oldestKey) sessions.delete(oldestKey);
    }
  }
}

export function setModel(sessionId, model) {
  if (!sessionId) return;
  enforceCapacity();

  const session = sessions.get(sessionId) || {
    cost: 0,
    model: "llama3",
    promptTokens: 0,
    completionTokens: 0,
    lastAccessed: Date.now()
  };

  session.model = model;
  session.lastAccessed = Date.now();
  sessions.set(sessionId, session);
}

export function trackUsage(sessionId, promptTokens = 0, completionTokens = 0) {
  if (!sessionId) return;
  enforceCapacity();

  const session = sessions.get(sessionId) || {
    cost: 0,
    model: "llama3",
    promptTokens: 0,
    completionTokens: 0,
    lastAccessed: Date.now()
  };

  const model = session.model || "llama3";
  const rates = PRICING[model] || PRICING["llama3"];

  const promptCost = (promptTokens / 1000) * rates.prompt;
  const completionCost = (completionTokens / 1000) * rates.completion;

  session.cost += promptCost + completionCost;
  session.promptTokens += promptTokens;
  session.completionTokens += completionTokens;
  session.lastAccessed = Date.now();

  // Re-insert to keep LRU order
  sessions.delete(sessionId);
  sessions.set(sessionId, session);
}

export function getSessionCost(sessionId) {
  if (!sessionId) return 0;
  const session = sessions.get(sessionId);
  if (!session) return 0;
  session.lastAccessed = Date.now();
  return session.cost;
}

export function getSessionMetrics(sessionId) {
  if (!sessionId) return null;
  const session = sessions.get(sessionId);
  if (!session) return null;
  return { ...session };
}

export function resetFinops() {
  sessions.clear();
}
