import { callLLM } from "./llm.js";
import { retrieveContext } from "./rag.js";
import { buildPrompt, buildToolResultPrompt } from "../utils/promptBuilder.js";
import { createUsageMetrics } from "./finops.js";

export function clearAgentHistory(sessionId) {
  // Maintained for backwards compatibility in test suites; state is session-owned
}

export const UNAVAILABLE_ACTION_REPLY =
  "Automated actions are unavailable in this deployment. No order lookup, booking, address change or notification has been performed.";

export function unavailableActionReply() {
  return UNAVAILABLE_ACTION_REPLY;
}

export async function callWebhook(action, params = {}) {
  // Real tool execution is unconditionally disabled in this phase.
  // Fails closed and makes zero outbound HTTP requests regardless of environment or flags.
  return null;
}

export async function checkOrderStatus(params = {}) {
  return unavailableActionReply();
}

export async function updateAddress(params = {}) {
  return unavailableActionReply();
}

export async function bookAppointment(params = {}) {
  return unavailableActionReply();
}

export function parseToolAction(aiResponse = "") {
  const actionMatch = aiResponse.match(/ACTION:\s*([A-Za-z0-9_]+)/i);
  if (!actionMatch) return null;

  const actionName = actionMatch[1];
  let params = {};

  // Extract JSON payload from PARAMS block, stripping any markdown code fences if present
  const paramMatch = aiResponse.match(/PARAMS:\s*(\{[\s\S]*?\})/i);
  if (paramMatch) {
    try {
      const rawJson = paramMatch[1].replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
      params = JSON.parse(rawJson);
    } catch (e) {
      console.warn("Failed to parse tool params JSON, using empty object:", e.message);
    }
  }

  return { actionName, params };
}

export async function handleChat(message, options = {}) {
  let history = options?.history || [];
  let metrics = options?.metrics || createUsageMetrics();
  let mode = options?.mode || process.env.APP_MODE || "support";
  let signal = options?.signal;

  if (typeof options === "string") {
    // Backwards compatibility for legacy calls during transition
    signal = arguments[2]?.signal;
  }

  const context = await retrieveContext(message, { signal });
  const prompt = buildPrompt(message, context, history);

  const aiResponse = await callLLM(prompt, { metrics, mode, signal });

  // If the model produced any tool action (recognized, unknown, or malformed), refuse deterministically
  const isActionAttempt = /(?:ACTION:|PARAMS:)/i.test(aiResponse) || parseToolAction(aiResponse) !== null;
  let reply = isActionAttempt ? unavailableActionReply() : aiResponse;

  if (reply && reply.length > 8000) {
    reply = reply.slice(0, 8000) + "\n... [Truncated: output exceeded 8000 characters]";
  }

  // Work on local copies of history
  const updatedHistory = Array.isArray(history) ? [...history] : [];
  const boundedMessage = message && message.length > 2000 ? message.slice(0, 2000) : message;

  updatedHistory.push({ role: "user", content: boundedMessage });
  updatedHistory.push({ role: "assistant", content: reply });

  // Bound to 6 exchanges = 12 entries
  while (updatedHistory.length > 12) {
    updatedHistory.shift();
  }

  return {
    reply,
    history: updatedHistory,
    metrics
  };
}