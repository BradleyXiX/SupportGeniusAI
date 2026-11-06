import express from "express";
import crypto from "crypto";
import { handleChat } from "../services/agent.js";
import { getSessionCost } from "../services/finops.js";
import { validateRequest } from "../middlewares/validateRequest.js";
import { ChatPayloadSchema } from "../schemas/chatSchema.js";
import {
  ProblemError,
  providerTimeoutError,
  providerUnavailableError
} from "../utils/problemDetails.js";
import { UpstreamError } from "../utils/upstream.js";

const router = express.Router();

router.post("/", validateRequest(ChatPayloadSchema), async (req, res, next) => {
  const { message, sessionId } = req.body;
  const correlationId = crypto.randomUUID();

  // Route-level 30-second total budget for retrieval + generation
  const routeController = new AbortController();
  const routeTimer = setTimeout(() => {
    routeController.abort();
  }, 30000);

  try {
    const response = await handleChat(message, sessionId, {
      signal: routeController.signal
    });
    const cost = getSessionCost(sessionId);
    res.json({
      reply: response,
      cost: cost.toFixed(4)
    });
  } catch (err) {
    if (err instanceof UpstreamError) {
      console.error(
        `[UPSTREAM_ERROR] id=${correlationId} kind=${err.kind} provider=${err.providerLabel} duration=${err.durationMs}ms status=${err.status ?? "N/A"}`
      );
      if (err.kind === "timeout") {
        const problem = providerTimeoutError(
          req.originalUrl || "/chat",
          "Upstream AI provider timed out.",
          correlationId
        );
        return res.status(problem.status).json(problem.toJSON());
      }
      const problem = providerUnavailableError(
        req.originalUrl || "/chat",
        "Upstream AI provider is temporarily unavailable.",
        correlationId
      );
      return res.status(problem.status).json(problem.toJSON());
    }

    if (err instanceof ProblemError) {
      return res.status(err.status).json(err.toJSON());
    }

    const safeErrorName = typeof err?.name === "string" && /^[A-Za-z0-9_]+$/.test(err.name) ? err.name : "Error";
    console.error(`[UNHANDLED_CHAT_ERROR] id=${correlationId} errorType=${safeErrorName}`);
    const fallbackProblem = new ProblemError({
      type: "https://supportgenius.ai/errors/chat-processing-failed",
      title: "Chat Processing Error",
      status: 500,
      detail: "An unexpected error occurred while processing the chat request.",
      instance: req.originalUrl,
      correlationId
    });
    res.status(fallbackProblem.status).json(fallbackProblem.toJSON());
  } finally {
    clearTimeout(routeTimer);
  }
});

export default router;