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

function checkOrderStatus(params = {}) {
  const { orderId } = params;
  return `Order ${orderId || "unknown"} is currently in transit and is scheduled to arrive today with signature required.`;
}

function updateAddress(params = {}) {
  const { address } = params;
  return `Address successfully verified and updated to: ${address || "unknown"}`;
}

function parseToolAction(aiResponse = "") {
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

export async function handleChat(message, sessionId) {
  const history = getSessionHistory(sessionId);
  const context = await retrieveContext(message);
  const prompt = buildPrompt(message, context, history);

  let aiResponse = await callLLM(prompt, sessionId);

  // Parse potential tool action
  const toolCall = parseToolAction(aiResponse);
  if (toolCall) {
    const { actionName, params } = toolCall;
    let result = "Action not recognized.";

    if (actionName.toLowerCase() === "checkorderstatus") {
      result = checkOrderStatus(params);
    } else if (actionName.toLowerCase() === "updateaddress") {
      result = updateAddress(params);
    }

    // Re-prompt the LLM with the tool result in a secure XML container
    const toolPrompt = buildToolResultPrompt(message, context, actionName, result);
    aiResponse = await callLLM(toolPrompt, sessionId);
  }

  // Update session history
  if (sessionId) {
    appendToSessionHistory(sessionId, "user", message);
    appendToSessionHistory(sessionId, "assistant", aiResponse);
  }

  return aiResponse;
}