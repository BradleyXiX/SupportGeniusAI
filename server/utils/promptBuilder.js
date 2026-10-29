/**
 * Prompt Builder with strict XML boundary fencing to prevent prompt injection
 */

function sanitizeXmlContent(text = "") {
  if (typeof text !== "string") return "";
  return text.replace(/<\/?(?:system_instructions|knowledge_context|customer_query|conversation_history|tool_result)>/gi, "");
}

export function buildPrompt(userMessage, context = "", conversationHistory = []) {
  const sanitizedUser = sanitizeXmlContent(userMessage).trim();
  const sanitizedContext = sanitizeXmlContent(context).trim();

  let historyBlock = "";
  if (Array.isArray(conversationHistory) && conversationHistory.length > 0) {
    const formatted = conversationHistory
      .map((entry) => `${entry.role === "user" ? "User" : "Assistant"}: ${sanitizeXmlContent(entry.content)}`)
      .join("\n");
    historyBlock = `\n<conversation_history>\n${formatted}\n</conversation_history>\n`;
  }

  return `<system_instructions>
You are SupportGenius Copilot, an enterprise customer support AI. You have access to tools and a knowledge base.

Core Behavioral Rules:
1. Tool Action Priority:
   - If the user asks to check order status, you MUST output:
     ACTION: checkOrderStatus
     PARAMS: { "orderId": "<extracted_order_id>" }
   - If the user asks to update their delivery address, you MUST output:
     ACTION: updateAddress
     PARAMS: { "address": "<extracted_address>" }
   - If the user asks to book or schedule an appointment, consultation, or treatment, you MUST output:
     ACTION: bookAppointment
     PARAMS: { "name": "<extracted_name>", "service": "<extracted_service>", "date": "<extracted_date>", "time": "<extracted_time>" }
   - Never output actions if not requested by the user.
2. If no tool action applies, answer ONLY using the information provided in <knowledge_context> or <tool_result>.
3. If the answer cannot be found in <knowledge_context> or <tool_result>, say EXACTLY: "I don't know based on the available information." Do not speculate or invent policies.
4. Be concise, polite, and professional.
</system_instructions>
${historyBlock}
<knowledge_context>
${sanitizedContext || "No relevant documents found."}
</knowledge_context>

<customer_query>
${sanitizedUser}
</customer_query>

Response:`;
}

export function buildToolResultPrompt(userMessage, context, actionName, toolResult) {
  const sanitizedUser = sanitizeXmlContent(userMessage).trim();
  const sanitizedContext = sanitizeXmlContent(context).trim();
  const sanitizedResult = sanitizeXmlContent(toolResult).trim();

  return `<system_instructions>
You are SupportGenius Copilot. A tool has been executed to answer the user's request.
Synthesize the final answer for the user based strictly on the <tool_result> and <knowledge_context>.
Keep it conversational, concise, and helpful. Do NOT output any ACTION tags.
</system_instructions>

<knowledge_context>
${sanitizedContext || "No relevant documents found."}
</knowledge_context>

<customer_query>
${sanitizedUser}
</customer_query>

<tool_result action="${sanitizeXmlContent(actionName)}">
${sanitizedResult}
</tool_result>

Final Response:`;
}