import { callLLM } from "./llm.js";
import { retrieveContext } from "./rag.js";
import { buildPrompt } from "../utils/promptBuilder.js";

function checkOrderStatus(params) {
  const { orderId } = params;
  return `Order ${orderId || 'unknown'} is currently in transit and is scheduled to arrive today.`;
}

function updateAddress(params) {
  const { address } = params;
  return `Address successfully updated to: ${address || 'unknown'}`;
}

export async function handleChat(message) {
  const context = await retrieveContext(message);
  const prompt = buildPrompt(message, context);
  
  let aiResponse = await callLLM(prompt);
  
  // Advanced Action Parsing using Regex
  const actionMatch = aiResponse.match(/ACTION:\s*([A-Za-z0-9_]+)/);
  if (actionMatch) {
    const actionName = actionMatch[1];
    
    // Attempt to parse JSON params if provided
    let params = {};
    const paramMatch = aiResponse.match(/PARAMS:\s*(\{.*?\})/s);
    if (paramMatch) {
      try {
        params = JSON.parse(paramMatch[1]);
      } catch (e) {
        console.warn("Failed to parse tool params JSON:", e);
      }
    }
    
    let result = "Action not recognized.";
    if (actionName === "checkOrderStatus") {
      result = checkOrderStatus(params);
    } else if (actionName === "updateAddress") {
      result = updateAddress(params);
    }
    
    // Re-prompt the LLM with the tool result so it can generate a final answer
    const finalPrompt = `
User asked: ${message}
Context: ${context}

Tool Result for ${actionName}: ${result}

Please provide the final helpful answer to the user based ONLY on the Tool Result and Context. Keep it conversational and concise. Do NOT generate any more ACTIONs.
`;
    aiResponse = await callLLM(finalPrompt);
  }
  
  return aiResponse;
}