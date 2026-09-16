import fetch from "node-fetch";
import { trackUsage, setModel } from "./finops.js";

// Basic token estimation
function estimateTokens(text) {
  return Math.ceil(text.length / 4);
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
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: modelUsed,
          messages: [{ role: "user", content: prompt }]
        })
      });
      
      if (!res.ok) throw new Error("OpenAI API error");
      const data = await res.json();
      responseText = data.choices[0].message.content;
      promptTokens = data.usage.prompt_tokens;
      completionTokens = data.usage.completion_tokens;

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
      
      if (!res.ok) throw new Error("Gemini API error");
      const data = await res.json();
      responseText = data.candidates[0].content.parts[0].text;
      promptTokens = estimateTokens(prompt);
      completionTokens = estimateTokens(responseText);

    } else {
      // Fallback to Ollama
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
      
      if (!res.ok) throw new Error("Ollama API error");
      const data = await res.json();
      responseText = data.response;
      completionTokens = estimateTokens(responseText);
    }
  } catch (err) {
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

// Simulated LLM logic so the MVP still functions for demo purposes
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
     return "Based on our policies, refunds are processed within 3 business days and shipping takes 24 hours locally. Please add an API key or start Ollama to get fully dynamic answers!";
  }
  
  return "I don't know based on the available information. Please configure an API key for full AI functionality.";
}