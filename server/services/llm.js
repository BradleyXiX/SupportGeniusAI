import fetch from "node-fetch";
import { trackUsage } from "./finops.js";

// Basic token estimation
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
}

export async function callLLM(prompt, sessionId) {
  let responseText = "";
  try {
    const res = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      body: JSON.stringify({
        model: "llama3",
        prompt: prompt,
        stream: false
      }),
      headers: { "Content-Type": "application/json" }
    });
    
    if (!res.ok) throw new Error("Network response was not ok");
    const data = await res.json();
    responseText = data.response;
  } catch (err) {
    console.warn("⚠️ Ollama is unreachable. Using simulated response for demonstration.");
    responseText = simulateLLM(prompt);
  }
  
  // Track tokens if sessionId is provided
  if (sessionId) {
    const promptTokens = estimateTokens(prompt);
    const completionTokens = estimateTokens(responseText);
    trackUsage(sessionId, promptTokens, completionTokens);
  }
  
  return responseText;
}

// Simulated LLM logic so the MVP still functions for demo purposes without Ollama
function simulateLLM(prompt) {
  const lowerPrompt = prompt.toLowerCase();
  
  if (lowerPrompt.includes("order status") || lowerPrompt.includes("where is my order")) {
     if (!prompt.includes("Tool Result")) {
        return "ACTION: checkOrderStatus\nPARAMS: { \"orderId\": \"12345\" }";
     } else {
        const resultMatch = prompt.match(/Tool Result.*:\s*(.*)/);
        const result = resultMatch ? resultMatch[1] : "unknown status";
        return `I checked our system, and your ${result.toLowerCase()}. Is there anything else you need?`;
     }
  }
  
  if (lowerPrompt.includes("address")) {
     if (!prompt.includes("Tool Result")) {
         return "ACTION: updateAddress\nPARAMS: { \"address\": \"123 Main St\" }";
     } else {
         const resultMatch = prompt.match(/Tool Result.*:\s*(.*)/);
         const result = resultMatch ? resultMatch[1] : "failed to update";
         return `${result}. Let me know if you need any other help!`;
     }
  }
  
  if (lowerPrompt.includes("refund") || lowerPrompt.includes("shipping")) {
     // Simulate extracting context
     return "Based on our policies, refunds are processed within 3 business days and shipping takes 24 hours locally. Please start Ollama to get fully dynamic answers!";
  }
  
  return "I don't know based on the available information. Please start Ollama locally for full AI functionality.";
}