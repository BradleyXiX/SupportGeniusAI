import fetch from "node-fetch";
import { trackUsage, setModel } from "./finops.js";
import { gatewayError } from "../utils/problemDetails.js";

// Basic token estimation fallback (1 token ~ 4 characters)
export function estimateTokens(text = "") {
  return Math.ceil(text.length / 4) || 1;
}

export async function callLLM(prompt, sessionId) {
  let responseText = "";
  let modelUsed = "llama3";
  let promptTokens = estimateTokens(prompt);
  let completionTokens = 0;

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
      modelUsed = "llama3";
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
    if (process.env.NODE_ENV === "production") {
      console.error(`❌ Upstream LLM Failure in Production: ${err.message}`);
      throw gatewayError("/chat", `AI Gateway upstream provider failed: ${err.message}`);
    }

    console.warn(`⚠️ API Unreachable (${err.message}). Using simulated response for demonstration.`);
    responseText = simulateLLM(prompt);
    completionTokens = estimateTokens(responseText);
    modelUsed = "simulated";
  }

  // Track tokens if sessionId is provided
  if (sessionId) {
    setModel(sessionId, modelUsed);
    trackUsage(sessionId, promptTokens, completionTokens);
  }

  return responseText;
}

// Simulated LLM logic for demo & automated testing purposes
export function simulateLLM(prompt = "") {
  const lowerPrompt = prompt.toLowerCase();

  if (lowerPrompt.includes("order status") || lowerPrompt.includes("where is my order") || lowerPrompt.includes("order 12345")) {
    if (!prompt.includes("<tool_result") && !prompt.includes("Tool Result")) {
      return 'ACTION: checkOrderStatus\nPARAMS: { "orderId": "12345" }';
    } else {
      const resultMatch = prompt.match(/<tool_result[^>]*>\s*([\s\S]*?)\s*<\/tool_result>/) || prompt.match(/Tool Result.*:\s*(.*)/);
      const result = resultMatch ? resultMatch[1] : "in transit and scheduled for delivery";
      return `I checked our system, and ${result}. Is there anything else you need?`;
    }
  }

  if (lowerPrompt.includes("address") || lowerPrompt.includes("update address")) {
    if (!prompt.includes("<tool_result") && !prompt.includes("Tool Result")) {
      return 'ACTION: updateAddress\nPARAMS: { "address": "123 Main St" }';
    } else {
      const resultMatch = prompt.match(/<tool_result[^>]*>\s*([\s\S]*?)\s*<\/tool_result>/) || prompt.match(/Tool Result.*:\s*(.*)/);
      const result = resultMatch ? resultMatch[1] : "Address updated";
      return `${result}. Let me know if you need any other help!`;
    }
  }

  if (lowerPrompt.includes("refund") || lowerPrompt.includes("shipping") || lowerPrompt.includes("warranty")) {
    return "Based on our company policy, refunds are processed within 3 business days and shipping takes 24 hours locally. Items must be returned in their original packaging within 14 days.";
  }

  return "I don't know based on the available information.";
}