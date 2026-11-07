/**
 * FinOps Telemetry Service
 * Tracks token usage and inference cost within cookie-owned session context.
 * No global in-memory maps.
 */

export const PRICING = {
  "gpt-4o-mini": { prompt: 0.00015, completion: 0.0006 },
  "gemini-1.5-flash": { prompt: 0.000075, completion: 0.0003 },
  "llama3": { prompt: 0.0015, completion: 0.002 },
  "qwen2.5-coder:7b": { prompt: 0.0015, completion: 0.002 },
  "simulated": { prompt: 0, completion: 0 },
  "demo-simulated": { prompt: 0, completion: 0 }
};

export function createUsageMetrics(initialModel = "qwen2.5-coder:7b") {
  return {
    model: initialModel,
    cost: 0,
    promptTokens: 0,
    completionTokens: 0
  };
}

export function setModel(metrics, model) {
  if (!metrics || typeof metrics !== "object") return;
  metrics.model = model;
}

export function trackUsage(metrics, promptTokens = 0, completionTokens = 0) {
  if (!metrics || typeof metrics !== "object") return;

  const model = metrics.model || "qwen2.5-coder:7b";
  const rates = PRICING[model] || PRICING["qwen2.5-coder:7b"] || { prompt: 0.0015, completion: 0.002 };

  const promptCost = (promptTokens / 1000) * rates.prompt;
  const completionCost = (completionTokens / 1000) * rates.completion;

  metrics.cost = (metrics.cost || 0) + promptCost + completionCost;
  metrics.promptTokens = (metrics.promptTokens || 0) + promptTokens;
  metrics.completionTokens = (metrics.completionTokens || 0) + completionTokens;
}

export function getSessionCost(metrics) {
  if (!metrics) return 0;
  return typeof metrics === "number" ? metrics : (metrics.cost || 0);
}

export function formatSessionCost(metrics) {
  const cost = getSessionCost(metrics);
  return `$${cost.toFixed(4)}`;
}

export function getSessionMetrics(metrics) {
  if (!metrics || typeof metrics !== "object") return null;
  return { ...metrics };
}

export function resetFinops() {
  // Maintained for test lifecycle resets
}
