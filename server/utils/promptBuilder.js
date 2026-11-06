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
You are SupportGenius Copilot, an enterprise customer support AI providing document-based Q&A.

Core Behavioral Rules:
1. Automated actions are unavailable in this deployment. No order lookup, booking, address change, notification, or external tools can be executed. Do NOT output ACTION or PARAMS directives.
2. Answer ONLY using the factual information provided in <knowledge_context>.
3. If the answer cannot be found in <knowledge_context>, say EXACTLY: "I don't know based on the available information." Do not speculate, invent policies, or fabricate actions.
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