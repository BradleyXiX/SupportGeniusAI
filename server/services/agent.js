import fetch from "node-fetch";
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

export async function callWebhook(action, params = {}) {
  const webhookUrl = process.env.CLIENT_WEBHOOK_URL;
  if (!webhookUrl) return null;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "SupportGeniusAI-Agent/1.0"
      },
      body: JSON.stringify({ action, params })
    });

    if (!res.ok) {
      console.warn(`Client webhook returned HTTP status ${res.status}`);
      return null;
    }

    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await res.json();
      if (typeof data === "string") return data;
      if (data?.result && typeof data.result === "string") return data.result;
      if (data?.message && typeof data.message === "string") return data.message;
      if (data?.reply && typeof data.reply === "string") return data.reply;
      if (data?.detail && typeof data.detail === "string") return data.detail;
      return JSON.stringify(data);
    }

    const text = await res.text();
    return text.trim() || null;
  } catch (err) {
    console.warn(`Client webhook dispatch failed (${err.message}), falling back to demo data.`);
    return null;
  }
}

export async function checkOrderStatus(params = {}) {
  const webhookResult = await callWebhook("checkOrderStatus", params);
  if (webhookResult) return webhookResult;

  const { orderId } = params;
  return `Order ${orderId || "unknown"} is currently in transit and is scheduled to arrive today with signature required.`;
}

export async function updateAddress(params = {}) {
  const webhookResult = await callWebhook("updateAddress", params);
  if (webhookResult) return webhookResult;

  const { address } = params;
  return `Address successfully verified and updated to: ${address || "unknown"}`;
}

export async function bookAppointment(params = {}) {
  const webhookResult = await callWebhook("bookAppointment", params);
  if (webhookResult) return webhookResult;

  const name = params.name || params.customerName || params.patientName || "Client";
  const service = params.service || params.treatment || "Consultation";
  const date = params.date || "tomorrow";
  const time = params.time || "2:00 PM";
  const appointmentId = params.appointmentId || `APT-${Math.floor(1000 + Math.random() * 9000)}`;

  return `Appointment ${appointmentId} confirmed for ${name} for ${service} on ${date} at ${time}. Confirmation details sent via SMS.`;
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

    const actionLower = actionName.toLowerCase();
    if (actionLower === "checkorderstatus") {
      result = await checkOrderStatus(params);
    } else if (actionLower === "updateaddress") {
      result = await updateAddress(params);
    } else if (actionLower === "bookappointment") {
      result = await bookAppointment(params);
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