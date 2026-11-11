import { trackUsage, setModel } from "./finops.js";
import { fetchJsonBounded, UpstreamError } from "../utils/upstream.js";

const BARE_MODEL_REGEX = /^[a-zA-Z0-9_.-]+$/;

// Basic token estimation fallback (1 token ~ 4 characters)
export function estimateTokens(text = "") {
  return Math.ceil(text.length / 4) || 1;
}

function isNonEmptyText(val) {
  return typeof val === "string" && val.trim().length > 0;
}

export function extractGeminiText(data) {
  const candidate = data?.candidates?.[0];
  if (!candidate) return null;
  const parts = candidate.content?.parts;
  if (!Array.isArray(parts)) return null;

  const validTexts = parts
    .filter((p) => !p.thought && typeof p?.text === "string" && p.text.length > 0)
    .map((p) => p.text);

  if (validTexts.length === 0) return null;
  const combined = validTexts.join("");
  return combined.trim().length > 0 ? combined : null;
}

export function resolveLLMProvider(options = {}) {
  const mode = options?.mode || process.env.APP_MODE || "support";
  if (mode === "demo") return "demo";

  const providerSetting = (process.env.LLM_PROVIDER || "auto").toLowerCase().trim();

  if (providerSetting === "gemini") {
    return "gemini";
  }
  if (providerSetting === "openai") {
    return "openai";
  }
  if (providerSetting === "ollama") {
    return "ollama";
  }

  // "auto" precedence: openai -> gemini -> ollama
  if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim()) {
    return "openai";
  }
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return "gemini";
  }
  return "ollama";
}

export async function callLLM(prompt, options = {}) {
  let metrics = options?.metrics;
  let mode = options?.mode || process.env.APP_MODE || "support";
  let signal = options?.signal;

  if (typeof options === "string") {
    // Backwards compatibility for legacy calls: callLLM(prompt, legacySessionId, maybeOptions)
    metrics = null;
    signal = arguments[2]?.signal;
  }

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

    if (metrics) {
      setModel(metrics, modelUsed);
      trackUsage(metrics, promptTokens, completionTokens);
    }
    return responseText;
  }

  if (signal?.aborted) {
    throw new UpstreamError({
      kind: "timeout",
      message: "LLM call aborted prior to execution",
      providerLabel: "llm"
    });
  }

  const provider = resolveLLMProvider({ mode });

  // Support mode: call configured provider or local Ollama using bounded fetch (20s budget)
  try {
    if (provider === "openai") {
      if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_API_KEY.trim()) {
        throw new UpstreamError({
          kind: "connection",
          message: "OPENAI_API_KEY is not configured",
          providerLabel: "openai"
        });
      }
      modelUsed = process.env.OPENAI_MODEL || "gpt-4o-mini";
      const data = await fetchJsonBounded(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: modelUsed,
            messages: [{ role: "user", content: prompt }]
          })
        },
        {
          timeoutMs: 20000,
          signal,
          providerLabel: "openai",
          validateShape: (d) => isNonEmptyText(d?.choices?.[0]?.message?.content)
        }
      );

      responseText = data.choices[0].message.content;
      promptTokens = data.usage?.prompt_tokens ?? estimateTokens(prompt);
      completionTokens = data.usage?.completion_tokens ?? estimateTokens(responseText);

    } else if (provider === "gemini") {
      if (!process.env.GEMINI_API_KEY || !process.env.GEMINI_API_KEY.trim()) {
        throw new UpstreamError({
          kind: "connection",
          message: "GEMINI_API_KEY is not configured",
          providerLabel: "gemini"
        });
      }
      const geminiModel = (process.env.GEMINI_MODEL || "").trim();
      if (!geminiModel || !BARE_MODEL_REGEX.test(geminiModel)) {
        throw new UpstreamError({
          kind: "connection",
          message: "Valid GEMINI_MODEL bare ID is required",
          providerLabel: "gemini"
        });
      }

      modelUsed = geminiModel;
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
      const data = await fetchJsonBounded(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": process.env.GEMINI_API_KEY
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }]
          })
        },
        {
          timeoutMs: 20000,
          signal,
          providerLabel: "gemini",
          validateShape: (d) => Boolean(extractGeminiText(d))
        }
      );

      responseText = extractGeminiText(data);
      promptTokens = data.usageMetadata?.promptTokenCount ?? estimateTokens(prompt);
      const candidatesTokens = data.usageMetadata?.candidatesTokenCount ?? estimateTokens(responseText);
      const thoughtsTokens = data.usageMetadata?.thoughtsTokenCount ?? 0;
      completionTokens = candidatesTokens + thoughtsTokens;

    } else {
      // Local Ollama
      modelUsed = process.env.OLLAMA_CHAT_MODEL || "qwen2.5-coder:7b";
      const ollamaUrl = process.env.OLLAMA_URL || "http://localhost:11434";
      const data = await fetchJsonBounded(
        `${ollamaUrl}/api/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            model: modelUsed,
            prompt: prompt,
            stream: false
          })
        },
        {
          timeoutMs: 20000,
          signal,
          providerLabel: "ollama",
          validateShape: (d) => isNonEmptyText(d?.response)
        }
      );

      responseText = data.response;
      completionTokens = estimateTokens(responseText);
    }
  } catch (err) {
    if (err instanceof UpstreamError) {
      throw err;
    }
    throw new UpstreamError({
      kind: "connection",
      message: `Upstream LLM failure: ${err.message}`,
      providerLabel: "llm"
    });
  }

  // Track tokens if metrics is provided
  if (metrics) {
    setModel(metrics, modelUsed);
    trackUsage(metrics, promptTokens, completionTokens);
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
