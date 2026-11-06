import fetch from "node-fetch";
import { trackUsage, setModel } from "./finops.js";
import { gatewayError } from "../utils/problemDetails.js";

// Basic token estimation fallback (1 token ~ 4 characters)
export function estimateTokens(text = "") {
  return Math.ceil(text.length / 4) || 1;
}

export async function callLLM(prompt, sessionId) {
  const mode = process.env.APP_MODE || "support";
  let responseText = "";
  let modelUsed = process.env.OLLAMA_CHAT_MODEL || "qwen2.5-coder:7b";
  let promptTokens = estimateTokens(prompt);
  let completionTokens = 0;

  // In demo mode: use deterministic local fixtures only, zero chat-provider/embedding/webhook requests.
  if (mode === "demo") {
    modelUsed = "simulated";
    const simResponse = simulateLLM(prompt);
    responseText = simResponse.startsWith("[Demo] ") ? simResponse : `[Demo] ${simResponse}`;
    completionTokens = estimateTokens(responseText);

    if (sessionId) {
      setModel(sessionId, modelUsed);
      trackUsage(sessionId, promptTokens, completionTokens);
    }
    return responseText;
  }

  // Support mode: call configured provider or local Ollama. Provider failure produces a stable unavailable error.
  try {
    if (process.env.OPENAI_API_KEY) {
      modelUsed = "gpt-4o-mini";
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [{ role: "user", content: prompt }]
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`OpenAI API returned status ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      responseText = data.choices[0].message.content;
      promptTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt);
      completionTokens = data.usage?.completion_tokens ?? estimateTokens(responseText);

    } else if (process.env.GEMINI_API_KEY) {
      modelUsed = "gemini-1.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (!res.ok) {
        const errBody = await res.text();
        throw new Error(`Gemini API returned status ${res.status}: ${errBody}`);
      }
      const data = await res.json();
      responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      promptTokens = data.usageMetadata?.promptTokenCount ?? estimateTokens(prompt);
      completionTokens = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(responseText);

    } else {
      // Local Ollama
      modelUsed = process.env.OLLAMA_CHAT_MODEL || "qwen2.5-coder:7b";
      const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
      const res = await fetch(`${ollamaUrl}/api/generate`, {
        method: "POST",
        body: JSON.stringify({
          model: modelUsed,
          prompt: prompt,
          stream: false
        }),
        headers: { "Content-Type": "application/json" }
      });

      if (!res.ok) {
        throw new Error(`Ollama API error with status ${res.status}`);
      }
      const data = await res.json();
      responseText = data.response;
      completionTokens = estimateTokens(responseText);
    }
  } catch (err) {
    console.error(`❌ Upstream LLM Failure in Support Mode: ${err.message}`);
    throw gatewayError("/chat", `AI Gateway upstream provider failed: ${err.message}`);
  }

  // Track tokens if sessionId is provided
  if (sessionId) {
    setModel(sessionId, modelUsed);
    trackUsage(sessionId, promptTokens, completionTokens);
  }

  return responseText;
}

// Simulated LLM logic for demo & automated testing purposes
// Illustrates document Q&A; does NOT invent appointment IDs, SMS, address changes, or order tracking
export function simulateLLM(prompt = "") {
  const lowerPrompt = prompt.toLowerCase();

  if (
    lowerPrompt.includes("refund") ||
    lowerPrompt.includes("shipping") ||
    lowerPrompt.includes("warranty") ||
    lowerPrompt.includes("return")
  ) {
    return "Based on our company policy, refunds are processed within 3 business days and shipping takes 24 hours locally. Items must be returned in their original packaging within 14 days.";
  }

  if (lowerPrompt.includes("hours") || lowerPrompt.includes("location") || lowerPrompt.includes("contact")) {
    return "Our support team is available Monday through Friday from 9:00 AM to 6:00 PM EST.";
  }

  return "I don't know based on the available information.";
}