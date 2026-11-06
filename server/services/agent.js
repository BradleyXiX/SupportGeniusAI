import { callLLM } from "./llm.js";
import { retrieveContext } from "./rag.js";
import { buildPrompt, buildToolResultPrompt } from "../utils/promptBuilder.js";

// Multi-turn conversation history buffer (sliding window of max 6 turns per session)
const sessionHistory = new Map();
const MAX_TURNS = 6;

function getSessionHistory(sessionId) {
  if (!sessionId) return [];
  return sessionHistory.get(sessionId) || [];
}

function appendToSessionHistory(sessionId, role, content) {
  if (!sessionId) return;
  const history = sessionHistory.get(sessionId) || [];
  history.push({ role, content, timestamp: Date.now() });
  if (history.length > MAX_TURNS) {
    history.splice(0, history.length - MAX_TURNS);
  }
  sessionHistory.set(sessionId, history);
}

export function clearAgentHistory(sessionId) {
  if (sessionId) {
    sessionHistory.delete(sessionId);
  } else {
    sessionHistory.clear();
  }
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

export async function handleChat(message, sessionId, { signal } = {}) {
  const history = getSessionHistory(sessionId);
  const context = await retrieveContext(message, { signal });
  const prompt = buildPrompt(message, context, history);

  let aiResponse = await callLLM(prompt, sessionId, { signal });

  // If the model produced any tool action (recognized, unknown, or malformed), refuse deterministically
  const isActionAttempt = /(?:ACTION:|PARAMS:)/i.test(aiResponse) || parseToolAction(aiResponse) !== null;
  if (isActionAttempt) {
    const refusal = unavailableActionReply();
    if (sessionId) {
      appendToSessionHistory(sessionId, "user", message);
      appendToSessionHistory(sessionId, "assistant", refusal);
    }
    return refusal;
  }

  // Update session history
  if (sessionId) {
    appendToSessionHistory(sessionId, "user", message);
    appendToSessionHistory(sessionId, "assistant", aiResponse);
  }

  return aiResponse;
}