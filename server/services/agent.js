import { callLLM } from "./llm.js";
import { retrieveContext } from "./rag.js";
import { buildPrompt } from "../utils/promptBuilder.js";

// fake function
function checkOrderStatus(orderId) {
  return `Order ${orderId} is in transit and will arrive today.`;
}

export async function handleChat(message) {
  const context = await retrieveContext(message);

  const prompt = buildPrompt(message, context);

  let aiResponse = await callLLM(prompt);

  // SIMPLE action detection
  if (aiResponse.includes("ACTION: checkOrderStatus")) {
    const orderId = "12345"; // extract properly later
    const result = checkOrderStatus(orderId);

    const finalPrompt = `
User asked: ${message}
Tool result: ${result}

Give final answer to user.
`;

    aiResponse = await callLLM(finalPrompt);
  }

  return aiResponse;
}